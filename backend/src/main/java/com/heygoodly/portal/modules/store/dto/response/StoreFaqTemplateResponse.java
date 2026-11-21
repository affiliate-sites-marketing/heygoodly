package com.heygoodly.portal.modules.store.dto.response;

import java.time.Instant;

public record StoreFaqTemplateResponse(
        Long id,
        String category,
        String title,
        String questionTemplate,
        String answerTemplate,
        Boolean isDefault,
        Integer sortOrder,
        Instant createdAt,
        Instant updatedAt
) {}
