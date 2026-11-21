package com.heygoodly.portal.modules.store.controller;

import com.heygoodly.portal.common.constant.MessageConstants;
import com.heygoodly.portal.common.constant.PermissionConstants;
import com.heygoodly.portal.common.dto.ApiResponse;
import com.heygoodly.portal.modules.role.enums.RoleCode;
import com.heygoodly.portal.modules.store.dto.request.StoreFaqTemplateRequest;
import com.heygoodly.portal.modules.store.dto.request.StoreReviewTemplateRequest;
import com.heygoodly.portal.modules.store.dto.response.StoreFaqTemplateResponse;
import com.heygoodly.portal.modules.store.dto.response.StoreReviewTemplateResponse;
import com.heygoodly.portal.modules.store.service.StoreTemplateLibraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/store-templates")
@RequiredArgsConstructor
public class StoreTemplateAdminController {

    private final StoreTemplateLibraryService templateLibraryService;

    @GetMapping("/review-templates")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<StoreReviewTemplateResponse>>> listReviewTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(templateLibraryService.listReviewTemplates()));
    }

    @PostMapping("/review-templates")
    @PreAuthorize("hasAuthority('" + PermissionConstants.STORE_CREATE + "') or hasAuthority('" + PermissionConstants.STORE_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<StoreReviewTemplateResponse>> createReviewTemplate(
            @Valid @RequestBody StoreReviewTemplateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.created(MessageConstants.CREATED, templateLibraryService.createReviewTemplate(request)));
    }

    @PutMapping("/review-templates/{id}")
    @PreAuthorize("hasAuthority('" + PermissionConstants.STORE_CREATE + "') or hasAuthority('" + PermissionConstants.STORE_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<StoreReviewTemplateResponse>> updateReviewTemplate(
            @PathVariable("id") Long id,
            @Valid @RequestBody StoreReviewTemplateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.UPDATED, templateLibraryService.updateReviewTemplate(id, request)));
    }

    @DeleteMapping("/review-templates/{id}")
    @PreAuthorize("hasAuthority('" + PermissionConstants.STORE_DELETE + "') or hasAuthority('" + PermissionConstants.STORE_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<Void>> deleteReviewTemplate(@PathVariable("id") Long id) {
        templateLibraryService.deleteReviewTemplate(id);
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.DELETED, null));
    }

    @GetMapping("/faq-templates")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<StoreFaqTemplateResponse>>> listFaqTemplates() {
        return ResponseEntity.ok(ApiResponse.ok(templateLibraryService.listFaqTemplates()));
    }

    @PostMapping("/faq-templates")
    @PreAuthorize("hasAuthority('" + PermissionConstants.STORE_CREATE + "') or hasAuthority('" + PermissionConstants.STORE_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<StoreFaqTemplateResponse>> createFaqTemplate(
            @Valid @RequestBody StoreFaqTemplateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.created(MessageConstants.CREATED, templateLibraryService.createFaqTemplate(request)));
    }

    @PutMapping("/faq-templates/{id}")
    @PreAuthorize("hasAuthority('" + PermissionConstants.STORE_CREATE + "') or hasAuthority('" + PermissionConstants.STORE_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<StoreFaqTemplateResponse>> updateFaqTemplate(
            @PathVariable("id") Long id,
            @Valid @RequestBody StoreFaqTemplateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.UPDATED, templateLibraryService.updateFaqTemplate(id, request)));
    }

    @DeleteMapping("/faq-templates/{id}")
    @PreAuthorize("hasAuthority('" + PermissionConstants.STORE_DELETE + "') or hasAuthority('" + PermissionConstants.STORE_UPDATE + "') or hasAuthority('" + RoleCode.ROLE_SUPER_ADMIN + "')")
    public ResponseEntity<ApiResponse<Void>> deleteFaqTemplate(@PathVariable("id") Long id) {
        templateLibraryService.deleteFaqTemplate(id);
        return ResponseEntity.ok(ApiResponse.ok(MessageConstants.DELETED, null));
    }
}
