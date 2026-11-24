package com.heygoodly.portal.modules.user.controller;

import com.heygoodly.portal.common.constant.AppConstants;
import com.heygoodly.portal.common.constant.MessageConstants;
import com.heygoodly.portal.common.constant.SecurityConstants;
import com.heygoodly.portal.common.dto.ApiResponse;
import com.heygoodly.portal.common.exception.AppException;
import com.heygoodly.portal.common.exception.ErrorCode;
import com.heygoodly.portal.common.util.NetworkUtils;
import com.heygoodly.portal.common.util.SecurityUtils;
import com.heygoodly.portal.common.util.UserAgentUtils;
import com.heygoodly.portal.modules.audit.entity.AuditLogEntity;
import com.heygoodly.portal.modules.user.dto.request.ChangePasswordRequest;
import com.heygoodly.portal.modules.user.dto.request.UpdateProfileRequest;
import com.heygoodly.portal.modules.user.dto.request.UpdateUserPreferenceRequest;
import com.heygoodly.portal.modules.user.dto.request.VerifyPasswordRequest;
import com.heygoodly.portal.modules.user.dto.response.ProfileResponse;
import com.heygoodly.portal.modules.user.dto.response.SessionResponse;
import com.heygoodly.portal.modules.user.dto.response.TwoFactorDetailsResponse;
import com.heygoodly.portal.modules.user.dto.response.UserPreferenceResponse;
import com.heygoodly.portal.modules.user.service.ProfileService;
import com.heygoodly.portal.security.JwtProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/profile")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final JwtProvider jwtProvider;

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile() {
        Long userId = resolveUserId();
        ProfileResponse response = profileService.getProfile(userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Long userId = resolveUserId();
        ProfileResponse response = profileService.updateProfile(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, MessageConstants.UPDATED_SUCCESS));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        Long userId = resolveUserId();
        Long currentSessionId = extractSessionId(httpRequest);
        String clientIp = extractClientIp(httpRequest);
        String clientDevice = extractClientDevice(httpRequest);
        profileService.changePassword(userId, request, currentSessionId, clientIp, clientDevice);
        return ResponseEntity.ok(ApiResponse.success(null, MessageConstants.UPDATED_SUCCESS));
    }

    @PostMapping("/verify-password")
    public ResponseEntity<ApiResponse<Boolean>> verifyPassword(@Valid @RequestBody VerifyPasswordRequest request) {
        Long userId = resolveUserId();
        boolean valid = profileService.verifyPassword(userId, request.getPassword());
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.SUCCESS, valid));
    }

    @PostMapping("/2fa/unlock")
    public ResponseEntity<ApiResponse<TwoFactorDetailsResponse>> unlockTwoFactor(@Valid @RequestBody VerifyPasswordRequest request) {
        Long userId = resolveUserId();
        TwoFactorDetailsResponse response = profileService.unlockTwoFactor(userId, request.getPassword());
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.SUCCESS, response));
    }

    @PostMapping("/2fa/regenerate-recovery-codes")
    public ResponseEntity<ApiResponse<List<String>>> regenerateRecoveryCodes() {
        Long userId = resolveUserId();
        List<String> codes = profileService.regenerateRecoveryCodes(userId);
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.SUCCESS, codes));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> getSessions(HttpServletRequest request) {
        Long userId = resolveUserId();
        Long currentSessionId = extractSessionId(request);
        String clientIp = extractClientIp(request);
        String clientDevice = extractClientDevice(request);
        List<SessionResponse> response = profileService.getSessions(userId, currentSessionId, clientIp, clientDevice);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<Void>> revokeSession(
            @PathVariable("id") Long sessionId,
            HttpServletRequest request
    ) {
        Long userId = resolveUserId();
        Long currentSessionId = extractSessionId(request);
        profileService.revokeSession(userId, sessionId, currentSessionId);
        return ResponseEntity.ok(ApiResponse.success(null, MessageConstants.DELETED_SUCCESS));
    }

    @DeleteMapping("/sessions/other")
    public ResponseEntity<ApiResponse<Void>> revokeOtherSessions(HttpServletRequest request) {
        Long userId = resolveUserId();
        Long currentSessionId = extractSessionId(request);
        String clientIp = extractClientIp(request);
        String clientDevice = extractClientDevice(request);
        profileService.revokeOtherSessions(userId, currentSessionId, clientIp, clientDevice);
        return ResponseEntity.ok(ApiResponse.success(null, MessageConstants.DELETED_SUCCESS));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLogEntity>>> getAuditLogs(
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "search", required = false) String search
    ) {
        Long userId = resolveUserId();
        String email = SecurityUtils.getCurrentUserEmail()
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        List<AuditLogEntity> logs = profileService.getUserAuditLogs(userId, email, type, search);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> getNotifications() {
        Long userId = resolveUserId();
        Map<String, Boolean> prefs = profileService.getNotificationPreferences(userId);
        return ResponseEntity.ok(ApiResponse.ok(prefs));
    }

    @PutMapping("/notifications")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> updateNotifications(@RequestBody Map<String, Boolean> preferences) {
        Long userId = resolveUserId();
        Map<String, Boolean> prefs = profileService.updateNotificationPreferences(userId, preferences);
        return ResponseEntity.ok(ApiResponse.success(prefs, MessageConstants.UPDATED_SUCCESS));
    }

    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> getPreferences() {
        Long userId = resolveUserId();
        UserPreferenceResponse response = profileService.getUserPreferences(userId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> updatePreferences(
            @Valid @RequestBody UpdateUserPreferenceRequest request
    ) {
        Long userId = resolveUserId();
        UserPreferenceResponse response = profileService.updateUserPreferences(userId, request);
        return ResponseEntity.ok(ApiResponse.success(response, MessageConstants.UPDATED_SUCCESS));
    }

    private Long resolveUserId() {
        return SecurityUtils.getCurrentUserId()
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
    }

    private String extractClientIp(HttpServletRequest request) {
        String ip = NetworkUtils.getClientIp(request);
        if ("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            return "127.0.0.1";
        }
        return ip;
    }

    private String extractClientDevice(HttpServletRequest request) {
        String ua = request != null ? request.getHeader("User-Agent") : null;
        return UserAgentUtils.parsePlatformOs(ua);
    }

    private Long extractSessionId(HttpServletRequest request) {
        if (request == null) return null;
        String bearer = request.getHeader(SecurityConstants.TOKEN_HEADER);
        if (StringUtils.hasText(bearer) && bearer.startsWith(SecurityConstants.TOKEN_PREFIX)) {
            String token = bearer.substring(SecurityConstants.TOKEN_PREFIX.length()).trim();
            return jwtProvider.getSessionIdFromToken(token);
        }
        return null;
    }
}
