package com.heygoodly.portal.modules.ai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiProviderConfigRequest {
    private String name;
    private String provider;
    /** Leave blank when updating to keep existing stored API key */
    private String apiKey;
    private String baseUrl;
    private String model;
    private Boolean isDefault;
    private Boolean isFallback;
    private Boolean isActive;
}
