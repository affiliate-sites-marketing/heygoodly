package com.heygoodly.portal.modules.ai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    /** Optional existing DB chat session ID; null creates a new session */
    private Long sessionId;
    /** Optional single new user message (when using server-side DB session memory) */
    private String message;
    /** Optional saved AI config ID from ai_provider_configs table */
    private Long configId;
    /** Optional model override; uses selected config / default when blank */
    private String model;
    /** Optional system instruction override */
    private String systemPrompt;
    /** Optional persona preset: general, review_editor, seo_strategist, news_journalist, translator, developer */
    private String persona;
    /** Optional partner store slug to inject real DB store + live coupon context */
    private String storeSlug;
    /** Optional reference web URL to crawl & inject clean context */
    private String sourceUrl;
    /** Optional uploaded text/csv/md/json file name & content */
    private String attachmentName;
    private String attachmentText;
    /** Optional base64 data URL (data:image/png;base64,...) for vision-capable models */
    private String imageDataUrl;
    /** Optional DB message ID to truncate from (for Edit & Resend) */
    private Long editFromMessageId;
    /** True when regenerating the last assistant reply (avoids duplicating last user message) */
    private Boolean regenerate;
    /** Enable Spring AI @Tool CMS Agent function calling (default true) */
    private Boolean enableTools;
    private List<ChatMessage> messages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        /** "user" or "assistant" */
        private String role;
        private String content;
    }
}
