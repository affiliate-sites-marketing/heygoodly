package com.heygoodly.portal.modules.store.service;

import com.heygoodly.portal.modules.store.dto.request.StoreFaqTemplateRequest;
import com.heygoodly.portal.modules.store.dto.request.StoreReviewTemplateRequest;
import com.heygoodly.portal.modules.store.dto.response.StoreFaqTemplateResponse;
import com.heygoodly.portal.modules.store.dto.response.StoreReviewTemplateResponse;

import java.util.List;

public interface StoreTemplateLibraryService {

    List<StoreReviewTemplateResponse> listReviewTemplates();

    StoreReviewTemplateResponse createReviewTemplate(StoreReviewTemplateRequest request);

    StoreReviewTemplateResponse updateReviewTemplate(Long id, StoreReviewTemplateRequest request);

    void deleteReviewTemplate(Long id);

    List<StoreFaqTemplateResponse> listFaqTemplates();

    StoreFaqTemplateResponse createFaqTemplate(StoreFaqTemplateRequest request);

    StoreFaqTemplateResponse updateFaqTemplate(Long id, StoreFaqTemplateRequest request);

    void deleteFaqTemplate(Long id);
}
