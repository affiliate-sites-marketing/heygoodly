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
public class AiGeneratedPostResponse {
    private String mode;
    private String title;
    private String slug;
    private String excerpt;
    private String contentHtml;
    private String metaTitle;
    private String metaDescription;
    private List<String> tags;
    private String readTime;
    private String imageUrl;
    private Long categoryId;
    private String categoryName;
    private String rating;
    private String ctaText;
    private String brandDescription;
    private String storeSlug;
    private String storeName;
    private String providerUsed;
    private String modelUsed;
}
