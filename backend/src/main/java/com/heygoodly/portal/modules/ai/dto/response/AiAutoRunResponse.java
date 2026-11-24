package com.heygoodly.portal.modules.ai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAutoRunResponse {
    private int generatedCount;
    private String publishMode;
    private List<String> createdTitles;
    private List<String> createdSlugs;
    private String message;
}
