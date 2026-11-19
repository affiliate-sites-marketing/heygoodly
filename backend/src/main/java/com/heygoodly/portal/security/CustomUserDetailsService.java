package com.heygoodly.portal.security;

import com.heygoodly.portal.common.cache.RedisCacheService;
import com.heygoodly.portal.common.constant.EntityFieldConstants;
import com.heygoodly.portal.common.constant.SecurityConstants;
import com.heygoodly.portal.modules.role.entity.PermissionEntity;
import com.heygoodly.portal.modules.role.entity.RoleEntity;
import com.heygoodly.portal.modules.user.entity.UserEntity;
import com.heygoodly.portal.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private static final Duration AUTH_CACHE_TTL = Duration.ofMinutes(5);

    private final UserRepository userRepository;
    private final RedisCacheService redisCacheService;

    private record CachedUserAuth(
            Long id,
            String email,
            String fullName,
            String password,
            boolean isSuperAdmin,
            boolean twoFactorEnabled,
            boolean active,
            List<String> authorities
    ) {}

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalizedEmail = email != null ? email.trim().toLowerCase(Locale.ROOT) : "";
        String cacheKey = RedisCacheService.AUTH_USER_PREFIX + normalizedEmail;

        CachedUserAuth cached = redisCacheService.getOrLoad(
                cacheKey,
                CachedUserAuth.class,
                AUTH_CACHE_TTL,
                () -> loadFromDatabase(email)
        );

        Set<GrantedAuthority> grantedAuthorities = cached.authorities().stream()
                .map(SimpleGrantedAuthority::new)
                .collect(java.util.stream.Collectors.toSet());

        return UserPrincipal.builder()
                .id(cached.id())
                .email(cached.email())
                .fullName(cached.fullName())
                .password(cached.password())
                .isSuperAdmin(cached.isSuperAdmin())
                .twoFactorEnabled(cached.twoFactorEnabled())
                .active(cached.active())
                .authorities(grantedAuthorities)
                .build();
    }

    private CachedUserAuth loadFromDatabase(String email) {
        UserEntity user = userRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        String.format("User not found with %s: %s", EntityFieldConstants.EMAIL, email)));

        Set<String> authorityCodes = new HashSet<>();

        // Add Role Authority
        RoleEntity role = user.getRole();
        if (role != null) {
            authorityCodes.add(SecurityConstants.ROLE_PREFIX + role.getSlug().toUpperCase());
            if (role.getPermissions() != null) {
                for (PermissionEntity permission : role.getPermissions()) {
                    authorityCodes.add(permission.getCode());
                }
            }
        }

        // Add Super Admin role if flagged
        if (Boolean.TRUE.equals(user.getIsSuperAdmin())) {
            authorityCodes.add(SecurityConstants.SUPER_ADMIN_ROLE);
        }

        return new CachedUserAuth(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getPasswordHash(),
                Boolean.TRUE.equals(user.getIsSuperAdmin()),
                Boolean.TRUE.equals(user.getTwoFactorEnabled()),
                Boolean.TRUE.equals(user.getIsActive()),
                List.copyOf(authorityCodes)
        );
    }
}
