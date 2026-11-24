package com.heygoodly.portal.modules.ai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSessionUpdateRequest {
    private String title;
    private Boolean isPinned;
    private String persona;
    private String systemPrompt;
}
