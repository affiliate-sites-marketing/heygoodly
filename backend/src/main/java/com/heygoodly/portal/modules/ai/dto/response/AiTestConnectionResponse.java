package com.heygoodly.portal.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTestConnectionResponse {
    private boolean success;
    private String provider;
    private String model;
    private long latencyMs;
    private String replyPreview;
    private String error;
}
