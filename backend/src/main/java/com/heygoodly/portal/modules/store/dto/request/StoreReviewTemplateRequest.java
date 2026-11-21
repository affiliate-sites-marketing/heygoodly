package com.heygoodly.portal.modules.store.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StoreReviewTemplateRequest {

    @Size(max = 50)
    private String category = "custom";

    @NotBlank(message = "Template title is required")
    @Size(max = 180)
    private String title;

    @NotBlank(message = "Reviewer name is required")
    @Size(max = 120)
    private String reviewerName;

    @Min(1)
    @Max(5)
    private Integer rating = 5;

    @Size(max = 80)
    private String reviewDateLabel = "3 days ago";

    private Boolean isVerified = true;

    @NotBlank(message = "Review comment template is required")
    private String commentTemplate;

    private Integer sortOrder = 10;
}
