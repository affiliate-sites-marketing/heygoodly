package com.heygoodly.portal.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiProviderConfigResponse {
    private Long id;
    private String name;
    private String provider;
    private boolean hasApiKey;
    private String maskedApiKey;
    private String baseUrl;
    private String model;
    private boolean isDefault;
    private boolean isFallback;
    private boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
