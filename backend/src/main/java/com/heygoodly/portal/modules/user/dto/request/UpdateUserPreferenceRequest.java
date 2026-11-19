package com.heygoodly.portal.modules.user.dto.request;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserPreferenceRequest {

    @Pattern(regexp = "^(light|dark)$", message = "themeMode must be 'light' or 'dark'")
    private String themeMode;

    @Pattern(regexp = "^(en|vi)$", message = "locale must be 'en' or 'vi'")
    private String locale;
}
