package com.heygoodly.portal.modules.auth.service;

import com.heygoodly.portal.common.cache.RedisCacheService;
import com.heygoodly.portal.common.constant.ErrorCodes;
import com.heygoodly.portal.common.exception.BadRequestException;
import com.heygoodly.portal.common.exception.ResourceNotFoundException;
import com.heygoodly.portal.common.exception.UnauthorizedException;
import com.heygoodly.portal.modules.auth.dto.LoginRequest;
import com.heygoodly.portal.modules.auth.dto.LoginResponse;
import com.heygoodly.portal.modules.auth.dto.RefreshTokenRequest;
import com.heygoodly.portal.modules.auth.dto.TwoFactorSetupResponse;
import com.heygoodly.portal.modules.auth.dto.Verify2FaRequest;
import com.heygoodly.portal.modules.auth.dto.Verify2FaSetupRequest;
import com.heygoodly.portal.modules.role.entity.PermissionEntity;
import com.heygoodly.portal.modules.setting.service.SettingService;
import com.heygoodly.portal.modules.user.dto.response.UserSummaryResponse;
import com.heygoodly.portal.modules.user.entity.UserEntity;
import com.heygoodly.portal.modules.user.repository.UserRepository;
import com.heygoodly.portal.security.JwtProvider;
import com.heygoodly.portal.security.TotpService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heygoodly.portal.security.TokenBlacklistService;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.heygoodly.portal.common.util.IpLocationUtils;
import com.heygoodly.portal.common.util.NetworkUtils;
import com.heygoodly.portal.common.util.UserAgentUtils;
import com.heygoodly.portal.modules.audit.dto.request.CreateAuditLogRequest;
import com.heygoodly.portal.modules.audit.service.AuditLogService;
import com.heygoodly.portal.modules.user.entity.UserLoginRecordEntity;
import com.heygoodly.portal.modules.user.repository.UserLoginRecordRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserLoginRecordRepository loginRecordRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final TotpService totpService;
    private final SettingService settingService;
    private final TokenBlacklistService tokenBlacklistService;
    private final AuditLogService auditLogService;
    private final RedisCacheService redisCacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmailAndIsDeletedFalse(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new UnauthorizedException("Your account has been deactivated. Please contact administrator.");
        }

        // Validate strictly using database BCrypt password hash
        boolean passwordMatches = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!passwordMatches) {
            throw new UnauthorizedException("Invalid email or password.");
        }

        // Check if 2FA is enabled in user entity from database
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            if (request.getOtpCode() == null) {
                // Return a temporary token for step 2 verification
                String tempToken = jwtProvider.generateAccessToken(
                        user.getId(),
                        user.getEmail(),
                        List.of("ROLE_PRE_AUTH"),
                        false
                );
                return LoginResponse.requires2Fa(tempToken);
            }

            // Verify OTP code if provided directly
            if (!isOtpValid(user.getTwoFactorSecret(), request.getOtpCode())) {
                throw new BadRequestException("Invalid two-factor authentication code.", ErrorCodes.INVALID_OTP_CODE);
            }
            Long sessionId = recordLoginSuccess(user, "2FA (TOTP)");
            return generateLoginSuccessResponse(user, sessionId);
        }

        Long sessionId = recordLoginSuccess(user, "Password");
        return generateLoginSuccessResponse(user, sessionId);
    }

    @Override
    @Transactional
    public LoginResponse verify2Fa(Verify2FaRequest request) {
        if (!jwtProvider.validateToken(request.getTempToken())) {
            throw new UnauthorizedException("Invalid or expired verification session.");
        }

        String email = jwtProvider.getEmailFromToken(request.getTempToken());
        UserEntity user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new UnauthorizedException("User not found."));

        boolean verified = false;

        // Try standard OTP code
        if (request.getOtpCode() != null) {
            verified = isOtpValid(user.getTwoFactorSecret(), request.getOtpCode());
        }

        // Try backup recovery code if OTP failed or not provided
        if (!verified && request.getRecoveryCode() != null && !request.getRecoveryCode().isBlank()) {
            verified = isRecoveryCodeValid(user, request.getRecoveryCode());
        }

        if (!verified) {
            throw new BadRequestException("Invalid authentication code or recovery code.", ErrorCodes.INVALID_OTP_CODE);
        }

        Long sessionId = recordLoginSuccess(user, "2FA (TOTP)");
        return generateLoginSuccessResponse(user, sessionId);
    }

    @Override
    @Transactional
    public LoginResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtProvider.validateToken(request.getRefreshToken())) {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        // Check if refresh token was already revoked / blacklisted
        if (tokenBlacklistService.isRefreshTokenBlacklisted(request.getRefreshToken())) {
            throw new UnauthorizedException("Refresh token has been revoked.");
        }

        String email = jwtProvider.getEmailFromToken(request.getRefreshToken());
        UserEntity user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new UnauthorizedException("User not found."));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new UnauthorizedException("Account is deactivated.");
        }

        Date issuedAt = jwtProvider.getIssuedAtFromToken(request.getRefreshToken());
        if (issuedAt != null && tokenBlacklistService.isUserTokenRevoked(user.getId(), issuedAt.getTime())) {
            throw new UnauthorizedException("Session has been revoked.");
        }

        Long sessionId = jwtProvider.getSessionIdFromToken(request.getRefreshToken());
        if (sessionId != null) {
            if (tokenBlacklistService.isSessionRevoked(sessionId)
                    || !loginRecordRepository.existsByIdAndUserId(sessionId, user.getId())) {
                throw new UnauthorizedException("Device session has been terminated.");
            }
        } else {
            if (tokenBlacklistService.isSessionIdRequiredForUser(user.getId())) {
                throw new UnauthorizedException("Device session has been terminated.");
            }
            // Upgrade legacy refresh token to an explicit sessionId if not revoked
            HttpServletRequest httpReq = resolveCurrentHttpRequest();
            String ip = resolveNormalizedIp(httpReq);
            String device = resolveNormalizedDevice(httpReq);
            if (issuedAt != null && tokenBlacklistService.isDeviceFingerprintRevoked(user.getId(), device, ip, issuedAt.getTime())) {
                throw new UnauthorizedException("Device session has been terminated.");
            }
            // Mint a dedicated session record for each legacy token upgrade so distinct browser windows never share a sessionId
            sessionId = recordLoginSuccess(user, "Session Upgrade");
        }

        // Refresh Token Rotation: Revoke the old refresh token upon issuing a new one
        try {
            Date oldExp = jwtProvider.getExpirationDateFromToken(request.getRefreshToken());
            if (oldExp != null) {
                tokenBlacklistService.blacklistRefreshToken(request.getRefreshToken(), oldExp.getTime());
            }
        } catch (Exception ex) {
            log.warn("Could not blacklist old refresh token: {}", ex.getMessage());
        }

        return generateLoginSuccessResponse(user, sessionId);
    }

    @Override
    @Transactional
    public void logout(String accessToken, String refreshToken) {
        Long sessionId = null;
        Long userId = null;

        if (accessToken != null && !accessToken.isBlank()) {
            try {
                sessionId = jwtProvider.getSessionIdFromToken(accessToken);
                userId = jwtProvider.getUserIdFromToken(accessToken);
                Date expiration = jwtProvider.getExpirationDateFromToken(accessToken);
                if (expiration != null) {
                    tokenBlacklistService.blacklistToken(accessToken, expiration.getTime());
                }
            } catch (Exception ex) {
                log.warn("Could not blacklist access token on logout: {}", ex.getMessage());
            }
        }

        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                if (sessionId == null) {
                    sessionId = jwtProvider.getSessionIdFromToken(refreshToken);
                }
                Date expiration = jwtProvider.getExpirationDateFromToken(refreshToken);
                if (expiration != null) {
                    tokenBlacklistService.blacklistRefreshToken(refreshToken, expiration.getTime());
                }
            } catch (Exception ex) {
                log.warn("Could not blacklist refresh token on logout: {}", ex.getMessage());
            }
        }

        if (sessionId != null) {
            tokenBlacklistService.revokeSession(sessionId);
            if (userId != null) {
                try {
                    loginRecordRepository.deleteByUserIdAndId(userId, sessionId);
                } catch (Exception ex) {
                    log.warn("Could not delete login session record on logout: {}", ex.getMessage());
                }
            }
        }
    }

    @Override
    public TwoFactorSetupResponse initiate2Fa(Long userId) {
        UserEntity user = getUserOrThrow(userId);
        GoogleAuthenticatorKey key = totpService.generateSecretKey();
        String qrCodeUri = totpService.getQrCodeUri(key, user.getEmail());
        List<String> recoveryCodes = totpService.generateRecoveryCodes(8);

        return new TwoFactorSetupResponse(key.getKey(), qrCodeUri, recoveryCodes);
    }

    @Override
    @Transactional
    public List<String> confirm2Fa(Long userId, Verify2FaSetupRequest request, String secretKey) {
        UserEntity user = getUserOrThrow(userId);

        String activeSecret = (secretKey != null && !secretKey.isBlank())
                ? secretKey
                : request.getSecretKey();

        if (activeSecret == null || activeSecret.isBlank()) {
            throw new BadRequestException("Secret key is missing for 2FA confirmation.", ErrorCodes.VALIDATION_FAILED);
        }

        boolean valid = isOtpValid(activeSecret, request.getOtpCode());
        if (!valid) {
            throw new BadRequestException("Invalid OTP verification code. Please try again.", ErrorCodes.INVALID_OTP_CODE);
        }

        List<String> recoveryCodes = request.getRecoveryCodes() != null && !request.getRecoveryCodes().isEmpty()
                ? request.getRecoveryCodes()
                : totpService.generateRecoveryCodes(8);

        try {
            user.setTwoFactorSecret(activeSecret);
            user.setTwoFactorEnabled(true);
            user.setTwoFactorRecoveryCodes(objectMapper.writeValueAsString(recoveryCodes));
            userRepository.save(user);
            if (user.getEmail() != null) {
                redisCacheService.evict(RedisCacheService.AUTH_USER_PREFIX + user.getEmail().trim().toLowerCase());
            }
            log.info("2FA successfully enabled for user: {}", user.getEmail());
            return recoveryCodes;
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize recovery codes: ", e);
            throw new BadRequestException("Could not save recovery codes.", ErrorCodes.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    @Transactional
    public void disable2Fa(Long userId) {
        UserEntity user = getUserOrThrow(userId);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        user.setTwoFactorRecoveryCodes(null);
        userRepository.save(user);
        if (user.getEmail() != null) {
            redisCacheService.evict(RedisCacheService.AUTH_USER_PREFIX + user.getEmail().trim().toLowerCase());
        }
        log.info("2FA disabled for user: {}", user.getEmail());
    }

    private boolean isOtpValid(String secretKey, Integer otpCode) {
        if (otpCode == null) {
            return false;
        }
        if (secretKey != null && !secretKey.isBlank() && totpService.verifyCode(secretKey, otpCode)) {
            return true;
        }
        boolean devBypass = "true".equalsIgnoreCase(settingService.getSettingValue("two_factor_dev_bypass_enabled", "false"));
        if (devBypass) {
            String devOtpStr = settingService.getSettingValue("two_factor_dev_otp", "");
            if (!devOtpStr.isBlank()) {
                try {
                    int devOtp = Integer.parseInt(devOtpStr.trim());
                    if (otpCode == devOtp) {
                        return true;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }
        return false;
    }

    private boolean isRecoveryCodeValid(UserEntity user, String recoveryCode) {
        if (recoveryCode == null || recoveryCode.isBlank()) {
            return false;
        }
        String cleanCode = recoveryCode.trim().toUpperCase();
        if (checkAndConsumeRecoveryCode(user, cleanCode)) {
            return true;
        }
        boolean devBypass = "true".equalsIgnoreCase(settingService.getSettingValue("two_factor_dev_bypass_enabled", "false"));
        if (devBypass) {
            String devRecovery = settingService.getSettingValue("two_factor_dev_recovery_code", "").trim().toUpperCase();
            if (!devRecovery.isBlank() && devRecovery.equalsIgnoreCase(cleanCode)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public UserSummaryResponse getCurrentUserProfile(Long userId) {
        UserEntity user = getUserOrThrow(userId);
        return mapToUserSummary(user);
    }

    private UserEntity getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .filter(u -> !Boolean.TRUE.equals(u.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
    }

    private LoginResponse generateLoginSuccessResponse(UserEntity user, Long sessionId) {
        List<String> permissions = new ArrayList<>();
        if (user.getRole() != null && user.getRole().getPermissions() != null) {
            permissions = user.getRole().getPermissions().stream()
                    .map(PermissionEntity::getCode)
                    .toList();
        }

        String accessToken = jwtProvider.generateAccessToken(
                user.getId(),
                user.getEmail(),
                permissions,
                Boolean.TRUE.equals(user.getIsSuperAdmin()),
                sessionId
        );

        String refreshToken = jwtProvider.generateRefreshToken(user.getEmail(), sessionId);
        UserSummaryResponse userSummary = mapToUserSummary(user);

        return LoginResponse.success(accessToken, refreshToken, userSummary);
    }

    private UserSummaryResponse mapToUserSummary(UserEntity user) {
        String roleName = user.getRole() != null ? user.getRole().getName() : "";
        String roleSlug = user.getRole() != null ? user.getRole().getSlug() : "";

        return new UserSummaryResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                roleName,
                roleSlug,
                user.getAvatar(),
                Boolean.TRUE.equals(user.getIsSuperAdmin()),
                Boolean.TRUE.equals(user.getTwoFactorEnabled())
        );
    }

    private boolean checkAndConsumeRecoveryCode(UserEntity user, String code) {
        if (user.getTwoFactorRecoveryCodes() == null) return false;
        try {
            List<String> codes = objectMapper.readValue(
                    user.getTwoFactorRecoveryCodes(),
                    new TypeReference<List<String>>() {}
            );
            if (codes.remove(code)) {
                user.setTwoFactorRecoveryCodes(objectMapper.writeValueAsString(codes));
                userRepository.save(user);
                log.info("Used recovery code for user: {}", user.getEmail());
                return true;
            }
        } catch (Exception e) {
            log.error("Failed to parse recovery codes for user {}: ", user.getEmail(), e);
        }
        return false;
    }

    private HttpServletRequest resolveCurrentHttpRequest() {
        try {
            RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
            if (attributes instanceof ServletRequestAttributes servletAttributes) {
                return servletAttributes.getRequest();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String resolveNormalizedIp(HttpServletRequest httpReq) {
        String ip = "127.0.0.1";
        if (httpReq != null) {
            String clientIp = NetworkUtils.getClientIp(httpReq);
            if (clientIp != null && !clientIp.isBlank()) {
                ip = clientIp;
            }
        }
        if ("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            ip = "127.0.0.1";
        }
        return ip;
    }

    private String resolveNormalizedDevice(HttpServletRequest httpReq) {
        String rawDevice = "Desktop Chrome / macOS";
        if (httpReq != null) {
            String ua = httpReq.getHeader("User-Agent");
            if (ua != null && !ua.isBlank()) {
                rawDevice = ua;
            }
        }
        return UserAgentUtils.parsePlatformOs(rawDevice);
    }

    private Long recordLoginSuccess(UserEntity user, String authMethod) {
        Long createdSessionId = null;
        try {
            HttpServletRequest httpReq = resolveCurrentHttpRequest();
            String ip = resolveNormalizedIp(httpReq);
            String location = IpLocationUtils.resolveLocation(ip);
            String device = resolveNormalizedDevice(httpReq);

            final String finalIp = ip;
            final String finalDevice = device;

            List<UserLoginRecordEntity> existingList = loginRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
            // Keep at most 19 older active sessions per user so separate browsers/incognito windows each keep their own sessionId
            if (existingList.size() >= 20) {
                for (int i = 19; i < existingList.size(); i++) {
                    try {
                        UserLoginRecordEntity stale = existingList.get(i);
                        tokenBlacklistService.revokeSession(stale.getId());
                        loginRecordRepository.delete(stale);
                    } catch (Exception ignored) {}
                }
            }

            UserLoginRecordEntity record = UserLoginRecordEntity.builder()
                    .userId(user.getId())
                    .ipAddress(ip)
                    .location(location)
                    .device(device)
                    .authMethod(authMethod)
                    .status("Success")
                    .duration("Active now")
                    .createdAt(Instant.now())
                    .build();

            UserLoginRecordEntity saved = loginRecordRepository.saveAndFlush(record);
            createdSessionId = saved.getId();

            // Record security audit trail for sign-in
            try {
                auditLogService.recordLog(CreateAuditLogRequest.builder()
                        .userId(user.getId())
                        .userEmail(user.getEmail())
                        .action("USER_LOGIN_SUCCESS")
                        .module("auth")
                        .resourceId(String.valueOf(user.getId()))
                        .resourceName("ProCMS Sign-In (" + authMethod + ")")
                        .ipAddress(ip)
                        .device(device)
                        .status("SUCCESS")
                        .build());
            } catch (Exception ex) {
                log.warn("Could not record login audit log: {}", ex.getMessage());
            }

            user.setLastLoginAt(Instant.now());
            user.setLastLoginIp(ip);
            user.setLoginCount((user.getLoginCount() == null ? 0 : user.getLoginCount()) + 1);
            userRepository.save(user);
        } catch (Exception ex) {
            log.warn("Could not record login trace: {}", ex.getMessage());
        }
        return createdSessionId;
    }
}
