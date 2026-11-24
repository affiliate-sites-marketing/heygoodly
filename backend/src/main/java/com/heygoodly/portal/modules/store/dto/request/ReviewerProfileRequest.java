package com.heygoodly.portal.modules.store.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReviewerProfileRequest {

    @NotBlank(message = "Reviewer name is required")
    @Size(max = 120)
    private String name;

    @Size(max = 500)
    private String avatarUrl;

    private Boolean isVerified = true;
}
