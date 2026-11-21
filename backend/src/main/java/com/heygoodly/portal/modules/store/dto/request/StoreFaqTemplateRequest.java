package com.heygoodly.portal.modules.store.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class StoreFaqTemplateRequest {

    @Size(max = 50)
    private String category = "custom";

    @NotBlank(message = "FAQ template title is required")
    @Size(max = 180)
    private String title;

    @NotBlank(message = "FAQ question template is required")
    private String questionTemplate;

    @NotBlank(message = "FAQ answer template is required")
    private String answerTemplate;

    private Boolean isDefault = false;

    private Integer sortOrder = 10;
}
