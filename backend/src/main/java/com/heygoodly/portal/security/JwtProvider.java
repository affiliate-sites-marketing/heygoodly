package com.heygoodly.portal.security;

import com.heygoodly.portal.common.constant.SecurityConstants;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Slf4j
@Component
public class JwtProvider {

    private final SecretKey secretKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiration-ms:86400000}") long accessTokenExpirationMs,
            @Value("${app.jwt.refresh-token-expiration-ms:604800000}") long refreshTokenExpirationMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    public String generateAccessToken(Long userId, String email, List<String> authorities, boolean isSuperAdmin) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessTokenExpirationMs);

        return Jwts.builder()
                .subject(email)
                .claim(SecurityConstants.CLAIM_USER_ID, userId)
                .claim(SecurityConstants.CLAIM_AUTHORITIES, authorities)
                .claim(SecurityConstants.CLAIM_PERMISSIONS, authorities)
                .claim(SecurityConstants.CLAIM_IS_SUPER_ADMIN, isSuperAdmin)
                .claim(SecurityConstants.CLAIM_EMAIL, email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshTokenExpirationMs);

        return Jwts.builder()
                .subject(email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public Long getUserIdFromToken(String token) {
        Object val = parseClaims(token).get(SecurityConstants.CLAIM_USER_ID);
        if (val instanceof Number num) {
            return num.longValue();
        }
        return null;
    }

    public Date getExpirationDateFromToken(String token) {
        return parseClaims(token).getExpiration();
    }

    public Date getIssuedAtFromToken(String token) {
        return parseClaims(token).getIssuedAt();
    }

    public enum JwtStatus {
        VALID,
        EXPIRED,
        INVALID_SIGNATURE,
        MALFORMED,
        UNSUPPORTED,
        EMPTY
    }

    public record JwtValidationResult(JwtStatus status, Claims claims) {}

    public JwtValidationResult validateAndParse(String token) {
        if (token == null || token.isBlank()) {
            return new JwtValidationResult(JwtStatus.EMPTY, null);
        }
        try {
            Claims claims = parseClaims(token);
            return new JwtValidationResult(JwtStatus.VALID, claims);
        } catch (ExpiredJwtException ex) {
            log.warn("Expired JWT token: {}", ex.getMessage());
            return new JwtValidationResult(JwtStatus.EXPIRED, null);
        } catch (SignatureException ex) {
            log.error("Invalid JWT signature: {}", ex.getMessage());
            return new JwtValidationResult(JwtStatus.INVALID_SIGNATURE, null);
        } catch (MalformedJwtException ex) {
            log.error("Invalid JWT token: {}", ex.getMessage());
            return new JwtValidationResult(JwtStatus.MALFORMED, null);
        } catch (UnsupportedJwtException ex) {
            log.error("Unsupported JWT token: {}", ex.getMessage());
            return new JwtValidationResult(JwtStatus.UNSUPPORTED, null);
        } catch (IllegalArgumentException ex) {
            log.error("JWT claims string is empty: {}", ex.getMessage());
            return new JwtValidationResult(JwtStatus.EMPTY, null);
        } catch (Exception ex) {
            log.error("Unexpected JWT validation error: {}", ex.getMessage());
            return new JwtValidationResult(JwtStatus.MALFORMED, null);
        }
    }

    public JwtStatus validateTokenDetailed(String token) {
        return validateAndParse(token).status();
    }

    public boolean validateToken(String token) {
        return validateTokenDetailed(token) == JwtStatus.VALID;
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
