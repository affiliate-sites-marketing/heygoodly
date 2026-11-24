package com.heygoodly.portal.modules.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.heygoodly.portal.common.cache.RedisCacheService;
import com.heygoodly.portal.common.constant.AppConstants;
import com.heygoodly.portal.common.constant.EntityFieldConstants;
import com.heygoodly.portal.common.util.NullSafeUtils;
import com.heygoodly.portal.common.util.SlugUtils;
import com.heygoodly.portal.modules.ai.constant.AiConstants;
import com.heygoodly.portal.modules.ai.dto.request.AiGeneratePostRequest;
import com.heygoodly.portal.modules.ai.dto.response.AiGeneratedPostResponse;
import com.heygoodly.portal.modules.audit.service.AuditLogService;
import com.heygoodly.portal.modules.category.entity.CategoryEntity;
import com.heygoodly.portal.modules.category.repository.CategoryRepository;
import com.heygoodly.portal.modules.feedback.entity.FeedbackEntity;
import com.heygoodly.portal.modules.feedback.repository.FeedbackRepository;
import com.heygoodly.portal.modules.offer.entity.OfferEntity;
import com.heygoodly.portal.modules.offer.repository.OfferRepository;
import com.heygoodly.portal.modules.post.entity.PostEntity;
import com.heygoodly.portal.modules.post.repository.PostRepository;
import com.heygoodly.portal.modules.store.entity.StoreEntity;
import com.heygoodly.portal.modules.store.repository.StoreRepository;
import com.heygoodly.portal.modules.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Spring AI 1.0.0 @Tool definitions exposing live CMS database queries and safe write actions
 * (creating DRAFT posts, adding offers to existing stores, updating SEO metadata) to the Admin AI Assistant.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CmsAiTools {

    private final StoreRepository storeRepository;
    private final OfferRepository offerRepository;
    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final FeedbackRepository feedbackRepository;
    private final TagService tagService;
    private final RedisCacheService redisCacheService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<AiWriterService> aiWriterServiceProvider;

    @Value("${app.site-url:http://localhost:3000}")
    private String appSiteUrl;

    @Tool(description = "Get live CMS analytics summary: total active stores, total affiliate clicks, top 5 stores by clicks, active offers count, expiring offers within 48 hours, posts breakdown (published, scheduled, draft, total views), and unread customer inquiries.")
    public String getCmsAnalyticsSummary() {
        try {
            Map<String, Object> summary = new LinkedHashMap<>();

            long activeStores = storeRepository.countByIsActiveTrueAndIsDeletedFalse();
            long featuredStores = storeRepository.countByIsActiveTrueAndIsFeaturedTrueAndIsDeletedFalse();
            long totalClicks = storeRepository.sumTotalClicks();
            long activeOffers = offerRepository.countByIsActiveTrueAndIsDeletedFalse();
            long unreadFeedbacks = feedbackRepository.countByIsReadFalse();

            long totalPosts = 0;
            long publishedPosts = 0;
            long scheduledPosts = 0;
            long draftPosts = 0;
            long totalPostViews = 0;
            List<Object[]> postStats = postRepository.summarizePosts();
            if (postStats != null && !postStats.isEmpty() && postStats.get(0) != null) {
                Object[] row = postStats.get(0);
                totalPosts = toLong(row[0]);
                publishedPosts = toLong(row[1]);
                scheduledPosts = toLong(row[2]);
                draftPosts = toLong(row[3]);
                totalPostViews = toLong(row[4]);
            }

            Instant now = Instant.now();
            Instant in48h = now.plus(48, ChronoUnit.HOURS);
            long expiring48h = offerRepository.findByIsActiveTrueAndIsDeletedFalse(PageRequest.of(0, 300))
                    .getContent()
                    .stream()
                    .filter(o -> Boolean.TRUE.equals(o.getHasExpiration())
                            && o.getExpireAt() != null
                            && o.getExpireAt().isAfter(now)
                            && o.getExpireAt().isBefore(in48h))
                    .count();

            List<Map<String, Object>> topStores = storeRepository
                    .findByIsActiveTrueAndIsDeletedFalse(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "afVisitCount")))
                    .getContent()
                    .stream()
                    .map(s -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("name", s.getName());
                        m.put("slug", s.getSlug());
                        m.put("clicks", s.getAfVisitCount() != null ? s.getAfVisitCount() : 0L);
                        m.put("rating", s.getRatingScore());
                        return m;
                    })
                    .toList();

            summary.put("activeStores", activeStores);
            summary.put("featuredStores", featuredStores);
            summary.put("totalAffiliateClicks", totalClicks);
            summary.put("activeOffers", activeOffers);
            summary.put("offersExpiringWithin48Hours", expiring48h);
            summary.put("posts", Map.of(
                    "total", totalPosts,
                    "published", publishedPosts,
                    "scheduled", scheduledPosts,
                    "draft", draftPosts,
                    "totalViews", totalPostViews
            ));
            summary.put("unreadCustomerInquiries", unreadFeedbacks);
            summary.put("topStoresByClicks", topStores);
            return toJson(summary);
        } catch (Exception ex) {
            log.warn("Tool getCmsAnalyticsSummary failed: {}", ex.getMessage());
            return toJson(Map.of("error", ex.getMessage()));
        }
    }

    @Tool(description = "Find active offers/coupons that are expiring soon within a given number of hours (default 48) or have already expired while still marked active.")
    public String findExpiringOffers(
            @ToolParam(description = "Lookahead window in hours (default 48, max 720)", required = false) Integer withinHours
    ) {
        try {
            int hours = (withinHours == null || withinHours <= 0) ? 48 : Math.min(withinHours, 720);
            Instant now = Instant.now();
            Instant cutoff = now.plus(hours, ChronoUnit.HOURS);

            List<OfferEntity> activeOffers = offerRepository
                    .findByIsActiveTrueAndIsDeletedFalse(PageRequest.of(0, 300, Sort.by(Sort.Direction.ASC, "expireAt")))
                    .getContent();

            List<OfferEntity> matched = new ArrayList<>();
            Set<Long> storeIds = new HashSet<>();
            for (OfferEntity o : activeOffers) {
                if (Boolean.TRUE.equals(o.getHasExpiration()) && o.getExpireAt() != null && o.getExpireAt().isBefore(cutoff)) {
                    matched.add(o);
                    if (o.getStoreId() != null) storeIds.add(o.getStoreId());
                }
            }

            Map<Long, StoreEntity> storeMap = new HashMap<>();
            if (!storeIds.isEmpty()) {
                for (StoreEntity s : storeRepository.findAllById(storeIds)) {
                    storeMap.put(s.getId(), s);
                }
            }

            List<Map<String, Object>> items = new ArrayList<>();
            for (OfferEntity o : matched) {
                StoreEntity s = storeMap.get(o.getStoreId());
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("offerId", o.getId());
                row.put("offerName", o.getName());
                row.put("discountValue", o.getDiscountValue());
                row.put("code", o.getCode());
                row.put("storeName", s != null ? s.getName() : "Store #" + o.getStoreId());
                row.put("storeSlug", s != null ? s.getSlug() : null);
                row.put("expireAt", o.getExpireAt().toString());
                row.put("alreadyExpired", o.getExpireAt().isBefore(now));
                items.add(row);
            }

            return toJson(Map.of(
                    "windowHours", hours,
                    "count", items.size(),
                    "offers", items
            ));
        } catch (Exception ex) {
            log.warn("Tool findExpiringOffers failed: {}", ex.getMessage());
            return toJson(Map.of("error", ex.getMessage()));
        }
    }

    @Tool(description = "Audit recent posts for SEO issues: missing metaDescription, missing or overlong (>65 chars) metaTitle, missing excerpt, or missing featured image.")
    public String auditPostsSeo(
            @ToolParam(description = "Maximum number of posts with SEO issues to return (default 15, max 50)", required = false) Integer limit
    ) {
        try {
            int max = (limit == null || limit <= 0) ? 15 : Math.min(limit, 50);
            List<PostEntity> recentPosts = postRepository
                    .findAll(PageRequest.of(0, 120, Sort.by(Sort.Direction.DESC, "id")))
                    .getContent();

            List<Map<String, Object>> issues = new ArrayList<>();
            for (PostEntity p : recentPosts) {
                if (Boolean.TRUE.equals(p.getIsDeleted())) continue;
                List<String> missing = new ArrayList<>();
                if (!StringUtils.hasText(p.getMetaTitle())) {
                    missing.add("missing_meta_title");
                } else if (p.getMetaTitle().trim().length() > 65) {
                    missing.add("meta_title_too_long(" + p.getMetaTitle().trim().length() + ")");
                }
                if (!StringUtils.hasText(p.getMetaDescription())) {
                    missing.add("missing_meta_description");
                } else if (p.getMetaDescription().trim().length() > 165) {
                    missing.add("meta_description_too_long(" + p.getMetaDescription().trim().length() + ")");
                }
                if (!StringUtils.hasText(p.getExcerpt())) {
                    missing.add("missing_excerpt");
                }
                if (!StringUtils.hasText(p.getImage())) {
                    missing.add("missing_featured_image");
                }

                if (!missing.isEmpty()) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("postId", p.getId());
                    item.put("title", p.getTitle());
                    item.put("slug", p.getSlug());
                    item.put("status", p.getStatus());
                    item.put("issues", missing);
                    item.put("editUrl", "/admin/posts/" + p.getId());
                    issues.add(item);
                    if (issues.size() >= max) break;
                }
            }

            return toJson(Map.of(
                    "scannedPosts", recentPosts.size(),
                    "postsWithIssues", issues.size(),
                    "items", issues
            ));
        } catch (Exception ex) {
            log.warn("Tool auditPostsSeo failed: {}", ex.getMessage());
            return toJson(Map.of("error", ex.getMessage()));
        }
    }

    @Tool(description = "List active partner stores (ordered by highest affiliate clicks) that do NOT have a review post linked to them yet.")
    public String listStoresWithoutReview(
            @ToolParam(description = "Maximum number of stores to return (default 15, max 50)", required = false) Integer limit
    ) {
        try {
            int max = (limit == null || limit <= 0) ? 15 : Math.min(limit, 50);
            Set<Long> reviewedStoreIds = new HashSet<>();
            List<PostEntity> allPosts = postRepository.findAll(PageRequest.of(0, 500)).getContent();
            for (PostEntity p : allPosts) {
                if (!Boolean.TRUE.equals(p.getIsDeleted()) && p.getStoreId() != null) {
                    reviewedStoreIds.add(p.getStoreId());
                }
            }

            List<StoreEntity> activeStores = storeRepository
                    .findByIsActiveTrueAndIsDeletedFalse(PageRequest.of(0, 150, Sort.by(Sort.Direction.DESC, "afVisitCount")))
                    .getContent();

            List<Map<String, Object>> missing = new ArrayList<>();
            for (StoreEntity s : activeStores) {
                if (reviewedStoreIds.contains(s.getId())) continue;
                String reviewSlugHint = SlugUtils.toSlug(s.getName() + " review");
                if (StringUtils.hasText(reviewSlugHint) && postRepository.existsBySlugAndIsDeletedFalse(reviewSlugHint)) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("storeId", s.getId());
                row.put("name", s.getName());
                row.put("slug", s.getSlug());
                row.put("displayDomain", s.getDisplayDomain());
                row.put("clicks", s.getAfVisitCount() != null ? s.getAfVisitCount() : 0L);
                row.put("rating", s.getRatingScore());
                missing.add(row);
                if (missing.size() >= max) break;
            }

            return toJson(Map.of(
                    "count", missing.size(),
                    "storesWithoutReview", missing
            ));
        } catch (Exception ex) {
            log.warn("Tool listStoresWithoutReview failed: {}", ex.getMessage());
            return toJson(Map.of("error", ex.getMessage()));
        }
    }

    @Tool(description = "Fetch unread customer feedback, contact messages, and partnership inquiries so the assistant can summarize them and draft replies.")
    public String getUnreadCustomerInquiries(
            @ToolParam(description = "Maximum number of unread inquiries to return (default 10, max 30)", required = false) Integer limit
    ) {
        try {
            int max = (limit == null || limit <= 0) ? 10 : Math.min(limit, 30);
            List<FeedbackEntity> recent = feedbackRepository
                    .findAllByOrderByCreatedAtDesc(PageRequest.of(0, 50))
                    .getContent();

            List<Map<String, Object>> unread = new ArrayList<>();
            for (FeedbackEntity f : recent) {
                if (Boolean.TRUE.equals(f.getIsRead())) continue;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", f.getId());
                row.put("name", f.getName());
                row.put("email", f.getEmail());
                row.put("phone", f.getPhone());
                row.put("type", f.getType() != null ? f.getType().name() : "GENERAL");
                row.put("message", truncate(NullSafeUtils.safeTrim(f.getMessage()), 800));
                row.put("createdAt", f.getCreatedAt() != null ? f.getCreatedAt().toString() : null);
                unread.add(row);
                if (unread.size() >= max) break;
            }

            return toJson(Map.of(
                    "totalUnread", feedbackRepository.countByIsReadFalse(),
                    "returned", unread.size(),
                    "inquiries", unread
            ));
        } catch (Exception ex) {
            log.warn("Tool getUnreadCustomerInquiries failed: {}", ex.getMessage());
            return toJson(Map.of("error", ex.getMessage()));
        }
    }

    @Tool(description = "Automatically research, write a complete full-length SEO product/store review article (with real store coupons, pros/cons, FAQs, meta title, meta description, excerpt, tags) and save it directly as a DRAFT post in PostgreSQL. If storeSlugOrName is omitted, automatically picks the highest-traffic active store that does not have a review post yet.")
    @Transactional
    public String autoCreateReviewPostForStore(
            @ToolParam(description = "Optional store slug or store name (leave blank to auto-pick the top unreviewed store)", required = false) String storeSlugOrName,
            @ToolParam(description = "Optional article language: 'English' or 'Vietnamese' (default English)", required = false) String language,
            @ToolParam(description = "Optional extra angle or editorial focus", required = false) String topicHint
    ) {
        try {
            StoreEntity store = null;
            if (StringUtils.hasText(storeSlugOrName)) {
                String q = storeSlugOrName.trim();
                store = storeRepository.findBySlugAndIsDeletedFalse(q).orElse(null);
                if (store == null) {
                    List<StoreEntity> found = storeRepository.searchActiveStores(q, PageRequest.of(0, 1)).getContent();
                    if (!found.isEmpty()) store = found.get(0);
                }
                if (store == null) {
                    return toJson(Map.of("success", false, "error", "Store not found for: " + q));
                }
            } else {
                Set<Long> reviewedStoreIds = new HashSet<>();
                for (PostEntity p : postRepository.findAll(PageRequest.of(0, 500)).getContent()) {
                    if (!Boolean.TRUE.equals(p.getIsDeleted()) && p.getStoreId() != null) {
                        reviewedStoreIds.add(p.getStoreId());
                    }
                }
                List<StoreEntity> activeStores = storeRepository
                        .findByIsActiveTrueAndIsDeletedFalse(PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "afVisitCount")))
                        .getContent();
                for (StoreEntity s : activeStores) {
                    if (!reviewedStoreIds.contains(s.getId())) {
                        store = s;
                        break;
                    }
                }
                if (store == null && !activeStores.isEmpty()) {
                    store = activeStores.get(0);
                }
                if (store == null) {
                    return toJson(Map.of("success", false, "error", "No active stores available in CMS."));
                }
            }

            AiWriterService writer = aiWriterServiceProvider.getObject();
            String resolvedTopic = StringUtils.hasText(topicHint)
                    ? topicHint.trim()
                    : "Comprehensive buyer's review, pros/cons & verified promo guide for " + store.getName();

            AiGeneratedPostResponse generated = writer.generatePost(AiGeneratePostRequest.builder()
                    .mode(AiConstants.MODE_REVIEW)
                    .storeSlug(store.getSlug())
                    .topic(resolvedTopic)
                    .language(StringUtils.hasText(language) ? language.trim() : AiConstants.DEFAULT_LANGUAGE)
                    .wordCount(1100)
                    .build());

            String baseSlug = SlugUtils.toSlug(StringUtils.hasText(generated.getSlug()) ? generated.getSlug() : generated.getTitle());
            if (!StringUtils.hasText(baseSlug)) {
                baseSlug = "review-" + store.getSlug() + "-" + System.currentTimeMillis();
            }
            String uniqueSlug = baseSlug;
            int suffix = 2;
            while (postRepository.existsBySlugAndIsDeletedFalse(uniqueSlug)) {
                uniqueSlug = baseSlug + "-" + (suffix++);
            }

            Long categoryId = store.getCategoryId() != null ? store.getCategoryId() : resolveFallbackCategoryId();
            List<String> tagList = generated.getTags() != null ? generated.getTags() : List.of();
            String tagsJson = "[]";
            try {
                if (!tagList.isEmpty()) tagsJson = objectMapper.writeValueAsString(tagList);
            } catch (Exception ignored) {}

            PostEntity entity = PostEntity.builder()
                    .title(truncate(generated.getTitle(), 250))
                    .slug(uniqueSlug)
                    .image(StringUtils.hasText(generated.getImageUrl()) ? generated.getImageUrl().trim() : null)
                    .excerpt(generated.getExcerpt())
                    .content(generated.getContentHtml())
                    .categoryId(categoryId)
                    .storeId(store.getId())
                    .authorName("Editorial Desk")
                    .authorRole("AI CMS Agent")
                    .readTime(StringUtils.hasText(generated.getReadTime()) ? generated.getReadTime() : AiConstants.DEFAULT_READ_TIME)
                    .status("DRAFT")
                    .isActive(false)
                    .isFeatured(false)
                    .isHero(false)
                    .sortOrder(AppConstants.DEFAULT_SORT_ORDER)
                    .publishedAt(Instant.now())
                    .tags(tagsJson)
                    .metaTitle(truncate(generated.getMetaTitle(), 250))
                    .metaDescription(generated.getMetaDescription())
                    .build();
            entity.setCreatedBy("ai-cms-agent");

            PostEntity saved = postRepository.save(entity);
            if (!tagList.isEmpty()) {
                try {
                    tagService.syncEntityTags(EntityFieldConstants.TYPE_POST, saved.getId(), tagList);
                } catch (Exception ex) {
                    log.warn("Failed to sync tags for auto-created review post id={}: {}", saved.getId(), ex.getMessage());
                }
            }
            redisCacheService.evictByPrefix(RedisCacheService.POSTS_PUBLIC_PREFIX);
            redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
            auditLogService.recordAction(AiConstants.AUDIT_ACTION_AI_AGENT_CREATE, AiConstants.AUDIT_MODULE_POSTS, String.valueOf(saved.getId()), saved.getTitle(), null);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("postId", saved.getId());
            result.put("title", saved.getTitle());
            result.put("slug", saved.getSlug());
            result.put("storeName", store.getName());
            result.put("storeSlug", store.getSlug());
            result.put("status", "DRAFT");
            result.put("metaTitle", saved.getMetaTitle());
            result.put("metaDescription", saved.getMetaDescription());
            result.put("tags", tagList);
            result.put("editUrl", "/admin/posts/" + saved.getId());
            return toJson(result);
        } catch (Exception ex) {
            log.warn("Tool autoCreateReviewPostForStore failed: {}", ex.getMessage());
            return toJson(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    @Tool(description = "Create a new DRAFT blog/review post directly in the CMS database (always saved safely as DRAFT / inactive for human review). Returns the created post ID and admin edit URL.")
    @Transactional
    public String createDraftPost(
            @ToolParam(description = "Article title (max 200 chars)") String title,
            @ToolParam(description = "Article body in clean semantic HTML (<h2>, <h3>, <p>, <ul>, <li>, <strong>)") String contentHtml,
            @ToolParam(description = "Short 1-2 sentence excerpt/summary", required = false) String excerpt,
            @ToolParam(description = "Optional partner store slug to link this post to", required = false) String storeSlug,
            @ToolParam(description = "Optional SEO meta title (<=60 chars)", required = false) String metaTitle,
            @ToolParam(description = "Optional SEO meta description (<=155 chars)", required = false) String metaDescription,
            @ToolParam(description = "Optional comma-separated tags, e.g. 'review, coupons, deals'", required = false) String tagsCsv
    ) {
        try {
            if (!StringUtils.hasText(title) || !StringUtils.hasText(contentHtml)) {
                return toJson(Map.of("success", false, "error", "title and contentHtml are required"));
            }
            StoreEntity store = null;
            if (StringUtils.hasText(storeSlug)) {
                store = storeRepository.findBySlugAndIsDeletedFalse(storeSlug.trim()).orElse(null);
            }

            String baseSlug = SlugUtils.toSlug(title.trim());
            if (!StringUtils.hasText(baseSlug)) {
                baseSlug = "ai-draft-" + System.currentTimeMillis();
            }
            String uniqueSlug = baseSlug;
            int suffix = 2;
            while (postRepository.existsBySlugAndIsDeletedFalse(uniqueSlug)) {
                uniqueSlug = baseSlug + "-" + (suffix++);
            }

            Long categoryId = (store != null && store.getCategoryId() != null)
                    ? store.getCategoryId()
                    : resolveFallbackCategoryId();

            List<String> tagList = new ArrayList<>();
            if (StringUtils.hasText(tagsCsv)) {
                for (String t : tagsCsv.split(",")) {
                    String clean = t.trim().replaceAll("^#+", "");
                    if (StringUtils.hasText(clean)) tagList.add(clean);
                }
            }
            String tagsJson = "[]";
            try {
                if (!tagList.isEmpty()) tagsJson = objectMapper.writeValueAsString(tagList);
            } catch (Exception ignored) {}

            String resolvedExcerpt = StringUtils.hasText(excerpt)
                    ? excerpt.trim()
                    : truncate(contentHtml.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim(), 200);
            String resolvedMetaTitle = StringUtils.hasText(metaTitle) ? truncate(metaTitle.trim(), 250) : truncate(title.trim(), 65);
            String resolvedMetaDesc = StringUtils.hasText(metaDescription) ? metaDescription.trim() : truncate(resolvedExcerpt, 155);

            PostEntity entity = PostEntity.builder()
                    .title(truncate(title.trim(), 250))
                    .slug(uniqueSlug)
                    .excerpt(resolvedExcerpt)
                    .content(contentHtml.trim())
                    .categoryId(categoryId)
                    .storeId(store != null ? store.getId() : null)
                    .authorName("Editorial Desk")
                    .authorRole("AI CMS Agent")
                    .readTime(AiConstants.DEFAULT_READ_TIME)
                    .status("DRAFT")
                    .isActive(false)
                    .isFeatured(false)
                    .isHero(false)
                    .sortOrder(AppConstants.DEFAULT_SORT_ORDER)
                    .publishedAt(Instant.now())
                    .tags(tagsJson)
                    .metaTitle(resolvedMetaTitle)
                    .metaDescription(resolvedMetaDesc)
                    .build();
            entity.setCreatedBy("ai-cms-agent");

            PostEntity saved = postRepository.save(entity);
            if (!tagList.isEmpty()) {
                try {
                    tagService.syncEntityTags(EntityFieldConstants.TYPE_POST, saved.getId(), tagList);
                } catch (Exception ex) {
                    log.warn("Failed to sync tags for AI agent draft post id={}: {}", saved.getId(), ex.getMessage());
                }
            }
            redisCacheService.evictByPrefix(RedisCacheService.POSTS_PUBLIC_PREFIX);
            redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
            auditLogService.recordAction(AiConstants.AUDIT_ACTION_AI_AGENT_CREATE, AiConstants.AUDIT_MODULE_POSTS, String.valueOf(saved.getId()), saved.getTitle(), null);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("postId", saved.getId());
            result.put("title", saved.getTitle());
            result.put("slug", saved.getSlug());
            result.put("status", "DRAFT");
            result.put("storeSlug", store != null ? store.getSlug() : null);
            result.put("editUrl", "/admin/posts/" + saved.getId());
            return toJson(result);
        } catch (Exception ex) {
            log.warn("Tool createDraftPost failed: {}", ex.getMessage());
            return toJson(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    @Tool(description = "Create a new Offer / Coupon in the CMS linked to an existing partner Store.")
    @Transactional
    public String createOfferForStore(
            @ToolParam(description = "Existing store slug or store name") String storeSlugOrName,
            @ToolParam(description = "Offer headline/title, e.g. 'Save 25% Off Sitewide'") String offerName,
            @ToolParam(description = "Short badge text, e.g. '25% OFF', '$20 OFF', or 'FREE SHIPPING'") String discountValue,
            @ToolParam(description = "Optional coupon code (leave empty if deal needs no code)", required = false) String code,
            @ToolParam(description = "Optional offer terms or description", required = false) String description
    ) {
        try {
            if (!StringUtils.hasText(storeSlugOrName) || !StringUtils.hasText(offerName) || !StringUtils.hasText(discountValue)) {
                return toJson(Map.of("success", false, "error", "storeSlugOrName, offerName, and discountValue are required"));
            }
            String q = storeSlugOrName.trim();
            Optional<StoreEntity> storeOpt = storeRepository.findBySlugAndIsDeletedFalse(q);
            if (storeOpt.isEmpty()) {
                List<StoreEntity> found = storeRepository.searchActiveStores(q, PageRequest.of(0, 1)).getContent();
                if (!found.isEmpty()) storeOpt = Optional.of(found.get(0));
            }
            if (storeOpt.isEmpty()) {
                return toJson(Map.of("success", false, "error", "Store not found for: " + q));
            }
            StoreEntity store = storeOpt.get();
            String baseSiteUrl = (StringUtils.hasText(appSiteUrl) ? appSiteUrl.trim() : "http://localhost:3000").replaceAll("/+$", "");
            String urlRef = StringUtils.hasText(store.getAfWebsite())
                    ? store.getAfWebsite().trim()
                    : (StringUtils.hasText(store.getDisplayDomain())
                            ? "https://" + store.getDisplayDomain().trim().replaceAll("^https?://", "")
                            : baseSiteUrl + "/stores/" + store.getSlug());

            offerRepository.shiftSortOrdersDown(store.getId());
            OfferEntity offer = OfferEntity.builder()
                    .storeId(store.getId())
                    .name(truncate(offerName.trim(), 250))
                    .discountValue(truncate(discountValue.trim(), 100))
                    .code(StringUtils.hasText(code) ? truncate(code.trim(), 100) : null)
                    .description(StringUtils.hasText(description) ? description.trim() : null)
                    .urlRef(urlRef)
                    .isActive(true)
                    .isVerified(true)
                    .hasExpiration(false)
                    .sortOrder(1)
                    .build();
            offer.setCreatedBy("ai-cms-agent");

            OfferEntity saved = offerRepository.save(offer);
            redisCacheService.evictByPrefix(RedisCacheService.OFFERS_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(RedisCacheService.STORES_PUBLIC_PREFIX);
            redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
            auditLogService.recordAction(AiConstants.AUDIT_ACTION_AI_AGENT_CREATE, AiConstants.AUDIT_MODULE_OFFERS, String.valueOf(saved.getId()), saved.getName(), null);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("offerId", saved.getId());
            result.put("storeName", store.getName());
            result.put("storeSlug", store.getSlug());
            result.put("offerName", saved.getName());
            result.put("discountValue", saved.getDiscountValue());
            result.put("code", saved.getCode());
            return toJson(result);
        } catch (Exception ex) {
            log.warn("Tool createOfferForStore failed: {}", ex.getMessage());
            return toJson(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    @Tool(description = "Update SEO metadata (metaTitle, metaDescription, excerpt) on an existing post by postId.")
    @Transactional
    public String updatePostSeoMetadata(
            @ToolParam(description = "Numeric ID of the post to update") Long postId,
            @ToolParam(description = "New SEO metaTitle (ideally <= 60 chars)", required = false) String metaTitle,
            @ToolParam(description = "New SEO metaDescription (ideally <= 155 chars)", required = false) String metaDescription,
            @ToolParam(description = "New excerpt summary", required = false) String excerpt
    ) {
        try {
            if (postId == null) {
                return toJson(Map.of("success", false, "error", "postId is required"));
            }
            Optional<PostEntity> opt = postRepository.findById(postId);
            if (opt.isEmpty() || Boolean.TRUE.equals(opt.get().getIsDeleted())) {
                return toJson(Map.of("success", false, "error", "Post not found: " + postId));
            }
            PostEntity post = opt.get();
            if (StringUtils.hasText(metaTitle)) {
                post.setMetaTitle(truncate(metaTitle.trim(), 250));
            }
            if (StringUtils.hasText(metaDescription)) {
                post.setMetaDescription(metaDescription.trim());
            }
            if (StringUtils.hasText(excerpt)) {
                post.setExcerpt(excerpt.trim());
            }
            PostEntity saved = postRepository.save(post);
            redisCacheService.evictByPrefix(RedisCacheService.POSTS_PUBLIC_PREFIX);
            auditLogService.recordAction(AiConstants.AUDIT_ACTION_AI_AGENT_UPDATE, AiConstants.AUDIT_MODULE_POSTS, String.valueOf(saved.getId()), saved.getTitle(), null);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("postId", saved.getId());
            result.put("title", saved.getTitle());
            result.put("metaTitle", saved.getMetaTitle());
            result.put("metaDescription", saved.getMetaDescription());
            result.put("excerpt", saved.getExcerpt());
            result.put("editUrl", "/admin/posts/" + saved.getId());
            return toJson(result);
        } catch (Exception ex) {
            log.warn("Tool updatePostSeoMetadata failed: {}", ex.getMessage());
            return toJson(Map.of("success", false, "error", ex.getMessage()));
        }
    }

    private Long resolveFallbackCategoryId() {
        return categoryRepository.findBySlugAndIsDeletedFalse("other")
                .or(() -> categoryRepository.findFirstByNameIgnoreCaseAndIsDeletedFalse("Other"))
                .map(CategoryEntity::getId)
                .orElse(null);
    }

    private long toLong(Object val) {
        return val instanceof Number n ? n.longValue() : 0L;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception ex) {
            return "{\"error\": \"serialization_failed\"}";
        }
    }
}
