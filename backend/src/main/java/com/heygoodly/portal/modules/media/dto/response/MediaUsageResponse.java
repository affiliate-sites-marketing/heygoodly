package com.heygoodly.portal.modules.media.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaUsageResponse {

    private Long mediaId;
    private String mediaName;
    private String url;
    private int totalUsages;
    private List<UsageItem> usages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageItem {
        private String module;
        private String resourceId;
        private String title;
        private String field;
    }
}
