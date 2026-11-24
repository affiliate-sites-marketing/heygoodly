package com.heygoodly.portal.modules.ai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGeneratePostRequest {
    /** "review" (store-linked) or "news" (no store) */
    private String mode;
    /** Optional store slug for review mode */
    private String storeSlug;
    /** Optional source article URL for news mode */
    private String sourceUrl;
    /** Optional topic, headline, or editorial instructions */
    private String topic;
    /** Optional language override, e.g. "English" or "Vietnamese" */
    private String language;
    /** Optional writing tone override */
    private String tone;
    /** Optional saved AI config ID from ai_provider_configs table */
    private Long configId;
    /** Optional model override (e.g. openai/gpt-4o-mini, anthropic/claude-3.7-sonnet, qwen/qwen3-235b-a22b:free, moonshotai/kimi-k2:free) */
    private String model;
    /** Target approximate word count, default 1100 */
    private Integer wordCount;
}
