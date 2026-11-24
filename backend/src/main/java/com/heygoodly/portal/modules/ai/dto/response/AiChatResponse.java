package com.heygoodly.portal.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    private Long sessionId;
    private String sessionTitle;
    private Long assistantMessageId;
    private String reply;
    private String provider;
    private String model;
    private String persona;
    private long latencyMs;
    private Integer promptTokens;
    private Integer completionTokens;
    private Integer totalTokens;
}
