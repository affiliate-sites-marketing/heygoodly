package com.heygoodly.portal.modules.ai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiTestConnectionRequest {
    private Long configId;
    private String provider;
    private String apiKey;
    private String model;
    private String baseUrl;
}
