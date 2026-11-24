package com.heygoodly.portal.modules.user.service;

import com.heygoodly.portal.modules.audit.entity.AuditLogEntity;
import com.heygoodly.portal.modules.user.dto.request.ChangePasswordRequest;
import com.heygoodly.portal.modules.user.dto.request.UpdateProfileRequest;
import com.heygoodly.portal.modules.user.dto.request.UpdateUserPreferenceRequest;
import com.heygoodly.portal.modules.user.dto.response.ProfileResponse;
import com.heygoodly.portal.modules.user.dto.response.SessionResponse;
import com.heygoodly.portal.modules.user.dto.response.TwoFactorDetailsResponse;
import com.heygoodly.portal.modules.user.dto.response.UserPreferenceResponse;

import java.util.List;
import java.util.Map;

public interface ProfileService {

    ProfileResponse getProfile(Long userId);

    ProfileResponse updateProfile(Long userId, UpdateProfileRequest request);

    void changePassword(Long userId, ChangePasswordRequest request, Long currentSessionId, String currentIp, String currentDevice);

    boolean verifyPassword(Long userId, String password);

    TwoFactorDetailsResponse unlockTwoFactor(Long userId, String password);

    List<String> regenerateRecoveryCodes(Long userId);

    List<SessionResponse> getSessions(Long userId, Long currentSessionId, String currentIp, String currentDevice);

    void revokeSession(Long userId, Long sessionId, Long currentSessionId);

    void revokeOtherSessions(Long userId, Long currentSessionId, String currentIp, String currentDevice);

    List<AuditLogEntity> getUserAuditLogs(Long userId, String userEmail, String type, String search);

    Map<String, Boolean> getNotificationPreferences(Long userId);

    Map<String, Boolean> updateNotificationPreferences(Long userId, Map<String, Boolean> preferences);

    UserPreferenceResponse getUserPreferences(Long userId);

    UserPreferenceResponse updateUserPreferences(Long userId, UpdateUserPreferenceRequest request);
}

