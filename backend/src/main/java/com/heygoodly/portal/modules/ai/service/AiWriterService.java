package com.heygoodly.portal.modules.ai.service;

import com.heygoodly.portal.modules.ai.dto.request.AiChatRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiChatSessionUpdateRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiGeneratePostRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiProviderConfigRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiTestConnectionRequest;
import com.heygoodly.portal.modules.ai.dto.response.AiAutoRunResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiChatResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiGeneratedPostResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiProviderConfigResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiTestConnectionResponse;

import java.util.List;
import java.util.Map;

public interface AiWriterService {

    Map<String, Object> getStatus();

    List<AiProviderConfigResponse> listConfigs();

    AiProviderConfigResponse createConfig(AiProviderConfigRequest request);

    AiProviderConfigResponse updateConfig(Long id, AiProviderConfigRequest request);

    AiProviderConfigResponse setDefaultConfig(Long id);

    AiProviderConfigResponse toggleFallbackConfig(Long id);

    void deleteConfig(Long id);

    List<Map<String, Object>> listAvailableModels(AiTestConnectionRequest request, boolean refresh);

    AiTestConnectionResponse testConnection(AiTestConnectionRequest request);

    AiChatResponse chat(AiChatRequest request);

    org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamChat(AiChatRequest request);

    List<Map<String, Object>> listChatSessions();

    Map<String, Object> updateChatSession(Long sessionId, AiChatSessionUpdateRequest request);

    List<Map<String, Object>> getChatSessionMessages(Long sessionId);

    void deleteChatSession(Long sessionId);

    AiGeneratedPostResponse generatePost(AiGeneratePostRequest request);

    AiAutoRunResponse runAutoPublishNow(int maxToCreate);
}
