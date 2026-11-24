package com.heygoodly.portal.modules.ai.controller;

import com.heygoodly.portal.common.constant.PermissionConstants;
import com.heygoodly.portal.common.dto.ApiResponse;
import com.heygoodly.portal.common.i18n.service.I18nService;
import com.heygoodly.portal.modules.ai.constant.AiConstants;
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
import com.heygoodly.portal.modules.ai.service.AiWriterService;
import com.heygoodly.portal.modules.role.enums.RoleCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
public class AiAdminController {

    private final AiWriterService aiWriterService;
    private final I18nService i18nService;

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        return ResponseEntity.ok(ApiResponse.ok(aiWriterService.getStatus()));
    }

    @GetMapping("/configs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AiProviderConfigResponse>>> listConfigs() {
        return ResponseEntity.ok(ApiResponse.ok(aiWriterService.listConfigs()));
    }

    @PostMapping("/configs")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiProviderConfigResponse>> createConfig(
            @RequestBody AiProviderConfigRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                i18nService.getMessage(AiConstants.I18N_CONFIG_SAVED),
                aiWriterService.createConfig(request)));
    }

    @PutMapping("/configs/{id}")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiProviderConfigResponse>> updateConfig(
            @PathVariable Long id,
            @RequestBody AiProviderConfigRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                i18nService.getMessage(AiConstants.I18N_CONFIG_UPDATED),
                aiWriterService.updateConfig(id, request)));
    }

    @PostMapping("/configs/{id}/set-default")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiProviderConfigResponse>> setDefaultConfig(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                i18nService.getMessage(AiConstants.I18N_CONFIG_DEFAULT_UPDATED),
                aiWriterService.setDefaultConfig(id)));
    }

    @PostMapping("/configs/{id}/toggle-fallback")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiProviderConfigResponse>> toggleFallbackConfig(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                i18nService.getMessage(AiConstants.I18N_CONFIG_FALLBACK_UPDATED),
                aiWriterService.toggleFallbackConfig(id)));
    }

    @DeleteMapping("/configs/{id}")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<Void>> deleteConfig(@PathVariable Long id) {
        aiWriterService.deleteConfig(id);
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getMessage(AiConstants.I18N_CONFIG_DELETED), null));
    }

    @GetMapping("/models")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listModels(
            @RequestParam(value = "provider", required = false) String provider,
            @RequestParam(value = "refresh", defaultValue = "false") boolean refresh
    ) {
        AiTestConnectionRequest req = provider != null ? AiTestConnectionRequest.builder().provider(provider).build() : null;
        return ResponseEntity.ok(ApiResponse.ok(aiWriterService.listAvailableModels(req, refresh)));
    }

    @PostMapping("/models")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> discoverModels(
            @RequestBody(required = false) AiTestConnectionRequest request,
            @RequestParam(value = "refresh", defaultValue = "false") boolean refresh
    ) {
        return ResponseEntity.ok(ApiResponse.ok(aiWriterService.listAvailableModels(request, refresh)));
    }

    @PostMapping("/test")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiTestConnectionResponse>> testConnection(
            @RequestBody(required = false) AiTestConnectionRequest request
    ) {
        AiTestConnectionResponse result = aiWriterService.testConnection(request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @RequestBody AiChatRequest request
    ) {
        AiChatResponse result = aiWriterService.chat(request);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter streamChat(@RequestBody AiChatRequest request) {
        return aiWriterService.streamChat(request);
    }

    @GetMapping("/chat/sessions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listChatSessions() {
        return ResponseEntity.ok(ApiResponse.ok(aiWriterService.listChatSessions()));
    }

    @PatchMapping("/chat/sessions/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateChatSession(
            @PathVariable Long id,
            @RequestBody AiChatSessionUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                i18nService.getMessage(AiConstants.I18N_CHAT_SESSION_UPDATED),
                aiWriterService.updateChatSession(id, request)));
    }

    @GetMapping("/chat/sessions/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getChatSessionMessages(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(aiWriterService.getChatSessionMessages(id)));
    }

    @DeleteMapping("/chat/sessions/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteChatSession(@PathVariable Long id) {
        aiWriterService.deleteChatSession(id);
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getMessage(AiConstants.I18N_CHAT_SESSION_DELETED), null));
    }

    @PostMapping("/generate-post")
    @PreAuthorize("hasAuthority('" + PermissionConstants.POST_CREATE + "') or hasAuthority('" + PermissionConstants.POST_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiGeneratedPostResponse>> generatePost(
            @RequestBody AiGeneratePostRequest request
    ) {
        AiGeneratedPostResponse result = aiWriterService.generatePost(request);
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getMessage(AiConstants.I18N_POST_GENERATED), result));
    }

    @PostMapping("/auto-publish/run")
    @PreAuthorize("hasAuthority('" + PermissionConstants.SETTING_GENERAL + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<AiAutoRunResponse>> runAutoPublishNow(
            @RequestParam(value = "count", defaultValue = "1") int count
    ) {
        AiAutoRunResponse result = aiWriterService.runAutoPublishNow(count);
        return ResponseEntity.ok(ApiResponse.ok(result.getMessage(), result));
    }
}
