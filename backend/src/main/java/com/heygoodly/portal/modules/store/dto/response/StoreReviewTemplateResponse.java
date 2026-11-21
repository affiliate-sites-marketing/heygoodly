package com.heygoodly.portal.modules.store.dto.response;

import java.time.Instant;

public record StoreReviewTemplateResponse(
        Long id,
        String category,
        String title,
        String reviewerName,
        Integer rating,
        String reviewDateLabel,
        Boolean isVerified,
        String commentTemplate,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {}
