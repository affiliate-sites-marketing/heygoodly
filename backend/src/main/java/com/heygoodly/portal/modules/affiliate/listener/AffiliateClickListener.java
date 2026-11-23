package com.heygoodly.portal.modules.affiliate.listener;

import com.heygoodly.portal.common.util.NullSafeUtils;
import com.heygoodly.portal.modules.affiliate.entity.AffiliateClickEntity;
import com.heygoodly.portal.modules.affiliate.event.AffiliateClickEvent;
import com.heygoodly.portal.modules.affiliate.repository.AffiliateClickRepository;
import com.heygoodly.portal.modules.store.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class AffiliateClickListener {

    private final StoreRepository storeRepository;
    private final AffiliateClickRepository affiliateClickRepository;

    private static final int MAX_UTM_LENGTH = 100;

    /**
     * Handles affiliate click events asynchronously in a worker thread.
     * Prevents outbound HTTP 307 redirects from blocking on database updates.
     * Persists explicit utm_* / subid query parameters and falls back to Referer URL parsing
     * so every click is accurately attributed to its source (Store Page, Review Article, Homepage, etc.).
     */
    @Async
    @EventListener
    @Transactional
    public void handleAffiliateClick(AffiliateClickEvent event) {
        try {
            Map<String, String[]> params = event.getQueryParams();
            String utmSource = firstParam(params, "utm_source", "src", "source");
            String utmMedium = firstParam(params, "utm_medium", "placement", "medium");
            String utmCampaign = firstParam(params, "utm_campaign", "page_slug", "campaign");
            String utmTerm = firstParam(params, "utm_term", "term");
            String utmContent = firstParam(params, "subid", "sub_id", "utm_content", "content");

            // Fallback attribution from Referer URL when explicit UTM params are not provided
            if (utmSource == null || utmCampaign == null) {
                String[] inferred = inferAttributionFromReferer(event.getReferer());
                if (utmSource == null) {
                    utmSource = inferred[0];
                }
                if (utmCampaign == null && inferred[1] != null) {
                    utmCampaign = inferred[1];
                }
            }

            if (utmSource == null || utmSource.isBlank()) {
                utmSource = "direct";
            } else {
                utmSource = normalizeSource(utmSource);
            }

            log.info("Processing affiliate click async: storeId={}, offerId={}, source={}, campaign={}, subid={}, ip={}",
                    event.getStoreId(), event.getOfferId(), utmSource, utmCampaign, utmContent, event.getClientIp());

            if (event.getStoreId() != null) {
                storeRepository.incrementVisitCount(event.getStoreId());
            }

            String clickCode = UUID.randomUUID().toString().replace("-", "");
            AffiliateClickEntity clickEntity = AffiliateClickEntity.builder()
                    .clickCode(clickCode)
                    .storeId(event.getStoreId())
                    .offerId(event.getOfferId())
                    .targetUrl(NullSafeUtils.safeTrim(event.getTargetUrl()))
                    .userIp(NullSafeUtils.safeTrim(event.getClientIp()))
                    .userAgent(NullSafeUtils.safeTrim(event.getUserAgent()))
                    .refererUrl(NullSafeUtils.safeTrim(event.getReferer()))
                    .utmSource(truncate(utmSource))
                    .utmMedium(truncate(utmMedium))
                    .utmCampaign(truncate(utmCampaign))
                    .utmTerm(truncate(utmTerm))
                    .utmContent(truncate(utmContent))
                    .createdAt(Instant.now())
                    .build();

            affiliateClickRepository.save(clickEntity);
        } catch (Exception e) {
            log.error("Failed to record affiliate click asynchronously: {}", e.getMessage(), e);
        }
    }

    private String firstParam(Map<String, String[]> params, String... keys) {
        if (params == null || params.isEmpty()) return null;
        for (String key : keys) {
            String[] values = params.get(key);
            if (values != null && values.length > 0 && values[0] != null && !values[0].isBlank()) {
                return values[0].trim();
            }
        }
        return null;
    }

    private String normalizeSource(String raw) {
        String s = raw.trim().toLowerCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        return switch (s) {
            case "post", "posts", "article", "articles", "review", "review_page", "review_article" -> "review_article";
            case "store", "stores", "store_page", "merchant" -> "store_page";
            case "home", "homepage", "index" -> "homepage";
            case "category", "categories", "category_page" -> "category_page";
            case "tag", "tags", "tag_page" -> "tag_page";
            case "search", "search_page" -> "search_page";
            case "popup", "modal", "coupon_popup", "coupon_modal" -> "coupon_popup";
            default -> s;
        };
    }

    private String[] inferAttributionFromReferer(String referer) {
        if (referer == null || referer.isBlank()) {
            return new String[]{"direct", null};
        }
        try {
            URI uri = URI.create(referer.trim());
            String path = uri.getPath();
            if (path == null || path.isBlank() || "/".equals(path)) {
                return new String[]{"homepage", "homepage"};
            }
            String clean = path.replaceAll("^/+|/+$", "");
            String[] segs = clean.split("/");
            if (segs.length == 0) {
                return new String[]{"homepage", "homepage"};
            }
            String first = segs[0].toLowerCase(Locale.ROOT);
            String second = segs.length > 1 ? segs[1] : null;
            return switch (first) {
                case "post", "posts", "article", "articles" -> new String[]{"review_article", second};
                case "store", "stores" -> new String[]{"store_page", second};
                case "category", "categories" -> new String[]{"category_page", second};
                case "tag", "tags" -> new String[]{"tag_page", second};
                case "search" -> new String[]{"search_page", null};
                default -> new String[]{"other", second != null ? second : first};
            };
        } catch (Exception ignored) {
            return new String[]{"direct", null};
        }
    }

    private String truncate(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > MAX_UTM_LENGTH ? trimmed.substring(0, MAX_UTM_LENGTH) : trimmed;
    }
}
