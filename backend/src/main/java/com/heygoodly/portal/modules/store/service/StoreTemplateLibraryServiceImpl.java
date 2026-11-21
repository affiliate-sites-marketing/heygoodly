package com.heygoodly.portal.modules.store.service;

import com.heygoodly.portal.common.constant.AppConstants;
import com.heygoodly.portal.common.exception.ResourceNotFoundException;
import com.heygoodly.portal.common.util.SecurityUtils;
import com.heygoodly.portal.modules.audit.service.AuditLogService;
import com.heygoodly.portal.modules.setting.service.SettingService;
import com.heygoodly.portal.modules.store.dto.request.StoreFaqTemplateRequest;
import com.heygoodly.portal.modules.store.dto.request.StoreReviewTemplateRequest;
import com.heygoodly.portal.modules.store.dto.response.StoreFaqTemplateResponse;
import com.heygoodly.portal.modules.store.dto.response.StoreReviewTemplateResponse;
import com.heygoodly.portal.modules.store.entity.StoreFaqTemplateEntity;
import com.heygoodly.portal.modules.store.entity.StoreReviewTemplateEntity;
import com.heygoodly.portal.modules.store.repository.StoreFaqTemplateRepository;
import com.heygoodly.portal.modules.store.repository.StoreReviewTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StoreTemplateLibraryServiceImpl implements StoreTemplateLibraryService {

    private static final Set<String> REVIEW_CATEGORIES = Set.of(
            "savings", "quality", "shipping", "balanced", "custom"
    );
    private static final Set<String> FAQ_CATEGORIES = Set.of(
            "promo", "shipping", "returns", "discounts", "custom"
    );

    private final StoreReviewTemplateRepository reviewTemplateRepository;
    private final StoreFaqTemplateRepository faqTemplateRepository;
    private final AuditLogService auditLogService;
    private final SettingService settingService;

    @Override
    @Transactional(readOnly = true)
    public List<StoreReviewTemplateResponse> listReviewTemplates() {
        return reviewTemplateRepository.findByIsDeletedFalseOrderBySortOrderAscIdDesc()
                .stream()
                .map(this::toReviewResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoreReviewTemplateResponse createReviewTemplate(StoreReviewTemplateRequest request) {
        String actor = SecurityUtils.getCurrentUserEmail().orElse(AppConstants.SYSTEM_USER);
        StoreReviewTemplateEntity entity = StoreReviewTemplateEntity.builder()
                .category(normalizeCategory(request.getCategory(), REVIEW_CATEGORIES, "custom"))
                .title(request.getTitle().trim())
                .reviewerName(request.getReviewerName().trim())
                .rating(clampRating(request.getRating()))
                .reviewDateLabel(StringUtils.hasText(request.getReviewDateLabel())
                        ? request.getReviewDateLabel().trim()
                        : "3 days ago")
                .isVerified(request.getIsVerified() == null || request.getIsVerified())
                .commentTemplate(request.getCommentTemplate().trim())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 10)
                .build();
        entity.setCreatedBy(actor);
        StoreReviewTemplateEntity saved = reviewTemplateRepository.save(entity);
        auditLogService.recordAction("CREATE", "store_review_templates", String.valueOf(saved.getId()), saved.getTitle(), null);
        return toReviewResponse(saved);
    }

    @Override
    @Transactional
    public StoreReviewTemplateResponse updateReviewTemplate(Long id, StoreReviewTemplateRequest request) {
        StoreReviewTemplateEntity entity = reviewTemplateRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReviewTemplate", "id", id));

        entity.setCategory(normalizeCategory(request.getCategory(), REVIEW_CATEGORIES, entity.getCategory()));
        entity.setTitle(request.getTitle().trim());
        entity.setReviewerName(request.getReviewerName().trim());
        entity.setRating(clampRating(request.getRating()));
        entity.setReviewDateLabel(StringUtils.hasText(request.getReviewDateLabel())
                ? request.getReviewDateLabel().trim()
                : "3 days ago");
        entity.setIsVerified(request.getIsVerified() == null || request.getIsVerified());
        entity.setCommentTemplate(request.getCommentTemplate().trim());
        if (request.getSortOrder() != null) {
            entity.setSortOrder(request.getSortOrder());
        }

        StoreReviewTemplateEntity saved = reviewTemplateRepository.save(entity);
        auditLogService.recordAction("UPDATE", "store_review_templates", String.valueOf(saved.getId()), saved.getTitle(), null);
        return toReviewResponse(saved);
    }

    @Override
    @Transactional
    public void deleteReviewTemplate(Long id) {
        StoreReviewTemplateEntity entity = reviewTemplateRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("ReviewTemplate", "id", id));
        entity.setIsDeleted(true);
        reviewTemplateRepository.save(entity);
        auditLogService.recordAction("DELETE", "store_review_templates", String.valueOf(id), entity.getTitle(), null);
    }

    @Override
    @Transactional
    public List<StoreFaqTemplateResponse> listFaqTemplates() {
        ensureDefaultFaqTemplatesSeeded();
        return faqTemplateRepository.findByIsDeletedFalseOrderByIsDefaultDescSortOrderAscIdDesc()
                .stream()
                .map(this::toFaqResponse)
                .toList();
    }

    @Override
    @Transactional
    public StoreFaqTemplateResponse createFaqTemplate(StoreFaqTemplateRequest request) {
        String actor = SecurityUtils.getCurrentUserEmail().orElse(AppConstants.SYSTEM_USER);
        StoreFaqTemplateEntity entity = StoreFaqTemplateEntity.builder()
                .category(normalizeCategory(request.getCategory(), FAQ_CATEGORIES, "custom"))
                .title(request.getTitle().trim())
                .questionTemplate(request.getQuestionTemplate().trim())
                .answerTemplate(request.getAnswerTemplate().trim())
                .isDefault(Boolean.TRUE.equals(request.getIsDefault()))
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 10)
                .build();
        entity.setCreatedBy(actor);
        StoreFaqTemplateEntity saved = faqTemplateRepository.save(entity);
        auditLogService.recordAction("CREATE", "store_faq_templates", String.valueOf(saved.getId()), saved.getTitle(), null);
        return toFaqResponse(saved);
    }

    @Override
    @Transactional
    public StoreFaqTemplateResponse updateFaqTemplate(Long id, StoreFaqTemplateRequest request) {
        StoreFaqTemplateEntity entity = faqTemplateRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("FaqTemplate", "id", id));

        entity.setCategory(normalizeCategory(request.getCategory(), FAQ_CATEGORIES, entity.getCategory()));
        entity.setTitle(request.getTitle().trim());
        entity.setQuestionTemplate(request.getQuestionTemplate().trim());
        entity.setAnswerTemplate(request.getAnswerTemplate().trim());
        if (request.getIsDefault() != null) {
            entity.setIsDefault(request.getIsDefault());
        }
        if (request.getSortOrder() != null) {
            entity.setSortOrder(request.getSortOrder());
        }

        StoreFaqTemplateEntity saved = faqTemplateRepository.save(entity);
        auditLogService.recordAction("UPDATE", "store_faq_templates", String.valueOf(saved.getId()), saved.getTitle(), null);
        return toFaqResponse(saved);
    }

    @Override
    @Transactional
    public void deleteFaqTemplate(Long id) {
        StoreFaqTemplateEntity entity = faqTemplateRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("FaqTemplate", "id", id));
        entity.setIsDeleted(true);
        faqTemplateRepository.save(entity);
        auditLogService.recordAction("DELETE", "store_faq_templates", String.valueOf(id), entity.getTitle(), null);
    }

    private void ensureDefaultFaqTemplatesSeeded() {
        if (faqTemplateRepository.count() > 0) {
            return;
        }
        String siteName = settingService.getSettingValue("site_name", AppConstants.APP_NAME);
        List<StoreFaqTemplateEntity> seeds = List.of(
                buildSeedFaq("promo", "How to Redeem Promo Code",
                        "How do I apply a {brand} promo code at checkout?",
                        "Click 'Get Code' on " + siteName + " to copy the code and visit the official {brand} checkout page. Paste the code into the Promo Code or Discount field and click Apply to see your instant savings.",
                        true, 10),
                buildSeedFaq("promo", "Troubleshooting Coupon Errors",
                        "Why isn't my {brand} coupon code working?",
                        "Codes can expire quickly or have minimum spend requirements and brand exclusions. Make sure your cart matches the offer terms, check for extra spaces when pasting, and try another active {brand} promo code listed above.",
                        true, 20),
                buildSeedFaq("promo", "Stacking Coupons & Sales",
                        "Can I stack multiple {brand} coupon codes on one order?",
                        "{brand} typically allows one promo code per checkout, though verified codes can often be combined with sitewide markdowns, seasonal bundles, or free shipping thresholds.",
                        true, 30),
                buildSeedFaq("shipping", "Free Shipping & Welcome Offer",
                        "Does {brand} offer free shipping or first-order discounts?",
                        "Yes—{brand} frequently provides free standard shipping on qualifying orders above their minimum threshold, plus welcome promo codes for first-time newsletter or SMS subscribers.",
                        true, 40),
                buildSeedFaq("discounts", "Deal Audit & Freshness",
                        "How often are {brand} deals and promo codes verified?",
                        "Our " + siteName + " editorial team regularly tests and audits {brand} promotions to remove expired vouchers and keep current storewide offers and exclusive discount codes accurate.",
                        true, 50),
                buildSeedFaq("returns", "Return & Refund Window",
                        "What is {brand}'s return and refund policy?",
                        "{brand} provides a standard return period for unused products in original packaging. Always review the official policy link in the {brand} footer for exact return label fees and refund processing times.",
                        false, 60),
                buildSeedFaq("discounts", "Student, Military & VIP Savings",
                        "Does {brand} offer a student, military, or first-responder discount?",
                        "Shoppers who qualify for student, military, educator, or healthcare status can check {brand} verification partners at checkout to unlock dedicated ongoing percentage discounts.",
                        false, 70),
                buildSeedFaq("promo", "Best Time to Shop Major Sales",
                        "When does {brand} launch its biggest seasonal sales?",
                        "The largest {brand} discounts typically appear during seasonal clearance events, holiday weekends, Black Friday, and Cyber Monday. Bookmark this page to catch early-access codes.",
                        false, 80),
                buildSeedFaq("discounts", "Email Signup Welcome Bonus",
                        "How can I claim a {brand} new-customer discount code?",
                        "Sign up for the official {brand} email list or SMS club on their homepage to receive a single-use welcome code, commonly valid for 10% to 20% off regular-priced items.",
                        false, 90),
                buildSeedFaq("shipping", "Order Tracking & Support",
                        "How do I track my {brand} shipment or contact support?",
                        "Once your order ships, {brand} sends a tracking link via email. If you need to update shipping details or ask about a missed promo code, contact their support team via the official Help Center.",
                        false, 100)
        );
        faqTemplateRepository.saveAll(seeds);
    }

    private StoreFaqTemplateEntity buildSeedFaq(
            String category,
            String title,
            String questionTemplate,
            String answerTemplate,
            boolean isDefault,
            int sortOrder
    ) {
        StoreFaqTemplateEntity entity = StoreFaqTemplateEntity.builder()
                .category(category)
                .title(title)
                .questionTemplate(questionTemplate)
                .answerTemplate(answerTemplate)
                .isDefault(isDefault)
                .sortOrder(sortOrder)
                .build();
        entity.setCreatedBy(AppConstants.SYSTEM_USER);
        return entity;
    }

    private String normalizeCategory(String category, Set<String> allowed, String fallback) {
        if (!StringUtils.hasText(category)) return fallback;
        String clean = category.trim().toLowerCase();
        return allowed.contains(clean) ? clean : fallback;
    }

    private int clampRating(Integer rating) {
        if (rating == null) return 5;
        return Math.min(5, Math.max(1, rating));
    }

    private StoreReviewTemplateResponse toReviewResponse(StoreReviewTemplateEntity e) {
        return new StoreReviewTemplateResponse(
                e.getId(),
                e.getCategory(),
                e.getTitle(),
                e.getReviewerName(),
                e.getRating(),
                e.getReviewDateLabel(),
                e.getIsVerified(),
                e.getCommentTemplate(),
                e.getSortOrder(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private StoreFaqTemplateResponse toFaqResponse(StoreFaqTemplateEntity e) {
        return new StoreFaqTemplateResponse(
                e.getId(),
                e.getCategory(),
                e.getTitle(),
                e.getQuestionTemplate(),
                e.getAnswerTemplate(),
                e.getIsDefault(),
                e.getSortOrder(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
