package com.heygoodly.portal.security;

public interface TokenBlacklistService {

    void blacklistToken(String token, long expirationTimeMs);

    void blacklistRefreshToken(String refreshToken, long expirationTimeMs);

    boolean isTokenBlacklisted(String token);

    boolean isRefreshTokenBlacklisted(String refreshToken);

    void invalidateAllUserTokens(Long userId);

    boolean isUserTokenRevoked(Long userId, long tokenIssuedAtMs);

    void revokeSession(Long sessionId);

    boolean isSessionRevoked(Long sessionId);

    void revokeDeviceFingerprint(Long userId, String device, String ipAddress);

    boolean isDeviceFingerprintRevoked(Long userId, String device, String ipAddress, long tokenIssuedAtMs);

    void requireSessionIdForUser(Long userId);

    boolean isSessionIdRequiredForUser(Long userId);
}

