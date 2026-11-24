package com.heygoodly.portal.security;

import com.heygoodly.portal.common.constant.SecurityConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenBlacklistServiceImpl implements TokenBlacklistService {

    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public void blacklistToken(String token, long expirationTimeMs) {
        if (token == null || token.isBlank()) return;
        long ttlMs = expirationTimeMs - System.currentTimeMillis();
        if (ttlMs > 0) {
            String key = SecurityConstants.REDIS_BLACKLIST_TOKEN_PREFIX + hashToken(token);
            stringRedisTemplate.opsForValue().set(key, "revoked", Duration.ofMillis(ttlMs));
            log.info("Access token blacklisted in Redis with TTL {} ms", ttlMs);
        }
    }

    @Override
    public void blacklistRefreshToken(String refreshToken, long expirationTimeMs) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        long ttlMs = expirationTimeMs - System.currentTimeMillis();
        if (ttlMs > 0) {
            String key = SecurityConstants.REDIS_BLACKLIST_REFRESH_PREFIX + hashToken(refreshToken);
            stringRedisTemplate.opsForValue().set(key, "revoked", Duration.ofMillis(ttlMs));
            log.info("Refresh token blacklisted in Redis with TTL {} ms", ttlMs);
        }
    }

    @Override
    public boolean isTokenBlacklisted(String token) {
        if (token == null || token.isBlank()) return false;
        try {
            String key = SecurityConstants.REDIS_BLACKLIST_TOKEN_PREFIX + hashToken(token);
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (Exception ex) {
            log.error("Redis connection error while checking token blacklist: {}", ex.getMessage());
            return false;
        }
    }

    @Override
    public boolean isRefreshTokenBlacklisted(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return false;
        try {
            String key = SecurityConstants.REDIS_BLACKLIST_REFRESH_PREFIX + hashToken(refreshToken);
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (Exception ex) {
            log.error("Redis connection error while checking refresh token blacklist: {}", ex.getMessage());
            return false;
        }
    }

    @Override
    public void invalidateAllUserTokens(Long userId) {
        if (userId == null) return;
        try {
            String key = SecurityConstants.REDIS_USER_INVALID_BEFORE_PREFIX + userId;
            // Retain for 7 days (maximum refresh token lifespan)
            stringRedisTemplate.opsForValue().set(key, String.valueOf(System.currentTimeMillis()), Duration.ofDays(7));
            log.info("Invalidated all active tokens before now for userId [{}]", userId);
        } catch (Exception ex) {
            log.error("Redis error invalidating user tokens: {}", ex.getMessage());
        }
    }

    @Override
    public boolean isUserTokenRevoked(Long userId, long tokenIssuedAtMs) {
        if (userId == null) return false;
        try {
            String key = SecurityConstants.REDIS_USER_INVALID_BEFORE_PREFIX + userId;
            String invalidBeforeStr = stringRedisTemplate.opsForValue().get(key);
            if (invalidBeforeStr != null) {
                long invalidBeforeMs = Long.parseLong(invalidBeforeStr);
                return tokenIssuedAtMs < invalidBeforeMs;
            }
        } catch (Exception ex) {
            log.error("Redis error checking user token revocation: {}", ex.getMessage());
        }
        return false;
    }

    @Override
    public void revokeSession(Long sessionId) {
        if (sessionId == null) return;
        try {
            String key = SecurityConstants.REDIS_REVOKED_SESSION_PREFIX + sessionId;
            stringRedisTemplate.opsForValue().set(key, "revoked", Duration.ofDays(7));
            log.info("Revoked device session [{}] in Redis", sessionId);
        } catch (Exception ex) {
            log.error("Redis error revoking session [{}]: {}", sessionId, ex.getMessage());
        }
    }

    @Override
    public boolean isSessionRevoked(Long sessionId) {
        if (sessionId == null) return false;
        try {
            String key = SecurityConstants.REDIS_REVOKED_SESSION_PREFIX + sessionId;
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (Exception ex) {
            log.error("Redis error checking session revocation [{}]: {}", sessionId, ex.getMessage());
            return false;
        }
    }

    @Override
    public void revokeDeviceFingerprint(Long userId, String device, String ipAddress) {
        if (userId == null) return;
        try {
            String fp = buildFingerprint(device, ipAddress);
            String key = SecurityConstants.REDIS_REVOKED_DEVICE_FP_PREFIX + userId + ":" + hashToken(fp);
            stringRedisTemplate.opsForValue().set(key, String.valueOf(System.currentTimeMillis()), Duration.ofDays(7));
        } catch (Exception ex) {
            log.error("Redis error revoking device fingerprint for userId [{}]: {}", userId, ex.getMessage());
        }
    }

    @Override
    public boolean isDeviceFingerprintRevoked(Long userId, String device, String ipAddress, long tokenIssuedAtMs) {
        if (userId == null) return false;
        try {
            String fp = buildFingerprint(device, ipAddress);
            String key = SecurityConstants.REDIS_REVOKED_DEVICE_FP_PREFIX + userId + ":" + hashToken(fp);
            String revokedAtStr = stringRedisTemplate.opsForValue().get(key);
            if (revokedAtStr != null) {
                long revokedAtMs = Long.parseLong(revokedAtStr);
                return tokenIssuedAtMs <= revokedAtMs;
            }
        } catch (Exception ex) {
            log.error("Redis error checking device fingerprint revocation: {}", ex.getMessage());
        }
        return false;
    }

    @Override
    public void requireSessionIdForUser(Long userId) {
        if (userId == null) return;
        try {
            String key = SecurityConstants.REDIS_USER_REQUIRE_SID_PREFIX + userId;
            stringRedisTemplate.opsForValue().set(key, "1", Duration.ofDays(7));
        } catch (Exception ex) {
            log.error("Redis error setting require_sid for userId [{}]: {}", userId, ex.getMessage());
        }
    }

    @Override
    public boolean isSessionIdRequiredForUser(Long userId) {
        if (userId == null) return false;
        try {
            String key = SecurityConstants.REDIS_USER_REQUIRE_SID_PREFIX + userId;
            return Boolean.TRUE.equals(stringRedisTemplate.hasKey(key));
        } catch (Exception ex) {
            log.error("Redis error checking require_sid for userId [{}]: {}", userId, ex.getMessage());
            return false;
        }
    }

    private String buildFingerprint(String device, String ipAddress) {
        String d = device != null ? device.trim().toLowerCase() : "";
        String ip = ipAddress != null ? ipAddress.trim().toLowerCase() : "";
        if ("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            ip = "127.0.0.1";
        }
        return d + "::" + ip;
    }

    private String hashToken(String token) {
        if (token == null) return "";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(token.hashCode());
        }
    }
}

