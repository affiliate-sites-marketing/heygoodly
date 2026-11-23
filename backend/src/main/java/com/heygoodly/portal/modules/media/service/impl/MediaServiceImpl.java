package com.heygoodly.portal.modules.media.service.impl;

import com.heygoodly.portal.common.constant.AppConstants;
import com.heygoodly.portal.common.constant.EntityFieldConstants;
import com.heygoodly.portal.common.dto.PageResponse;
import com.heygoodly.portal.common.exception.ResourceNotFoundException;
import com.heygoodly.portal.common.util.NullSafeUtils;
import com.heygoodly.portal.modules.audit.dto.request.CreateAuditLogRequest;
import com.heygoodly.portal.modules.audit.service.AuditLogService;
import com.heygoodly.portal.modules.file.service.StorageService;
import com.heygoodly.portal.modules.media.dto.request.MediaQueryCriteria;
import com.heygoodly.portal.modules.media.dto.response.MediaItemResponse;
import com.heygoodly.portal.modules.media.dto.response.MediaUsageResponse;
import com.heygoodly.portal.modules.media.entity.MediaItemEntity;
import com.heygoodly.portal.modules.media.mapper.MediaMapper;
import com.heygoodly.portal.modules.media.repository.MediaItemRepository;
import com.heygoodly.portal.modules.media.service.MediaService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {

    private final MediaItemRepository mediaItemRepository;
    private final StorageService storageService;
    private final AuditLogService auditLogService;
    private final com.heygoodly.portal.modules.tag.service.TagService tagService;
    private final com.heygoodly.portal.common.cache.RedisCacheService redisCacheService;
    private final MediaMapper mediaMapper;
    private final EntityManager entityManager;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MediaItemResponse> getMediaItems(MediaQueryCriteria criteria) {
        log.info("Processing getMediaItems with criteria: page={}, size={}, search={}",
                criteria.getPage(), criteria.getSize(), criteria.getSearch());

        String cleanCategory = NullSafeUtils.safeLowerTrim(criteria.getCategory());
        String cleanSearch = NullSafeUtils.safeTrim(criteria.getSearch());
        String cleanTag = NullSafeUtils.safeLowerTrim(criteria.getTag()).replaceAll("^#+", "");
        String cleanFormat = NullSafeUtils.safeLowerTrim(criteria.getFormat());
        String cleanSort = NullSafeUtils.safeLowerTrim(criteria.getSortBy());

        Sort sort = Sort.by(Sort.Direction.DESC, EntityFieldConstants.CREATED_AT_SNAKE);
        if (EntityFieldConstants.OLDEST.equalsIgnoreCase(cleanSort)) {
            sort = Sort.by(Sort.Direction.ASC, EntityFieldConstants.CREATED_AT_SNAKE);
        } else if (EntityFieldConstants.SIZE_DESC.equalsIgnoreCase(cleanSort)) {
            sort = Sort.by(Sort.Direction.DESC, EntityFieldConstants.SIZE_BYTES);
        } else if (EntityFieldConstants.NAME_ASC.equalsIgnoreCase(cleanSort)) {
            sort = Sort.by(Sort.Direction.ASC, EntityFieldConstants.NAME);
        }

        int pageNum = Math.max(AppConstants.DEFAULT_PAGE_NUMBER, criteria.getPage());
        int pageSize = criteria.getSize() > 0 ? Math.min(criteria.getSize(), AppConstants.MAX_PAGE_SIZE) : AppConstants.DEFAULT_MEDIA_PAGE_SIZE;
        Pageable pageable = PageRequest.of(pageNum, pageSize, sort);

        boolean showDeleted = Boolean.TRUE.equals(criteria.getDeleted());
        Page<MediaItemEntity> entityPage = mediaItemRepository.findMediaByFilters(
                showDeleted,
                cleanCategory.isEmpty() || "all".equalsIgnoreCase(cleanCategory) ? null : cleanCategory,
                cleanSearch.isEmpty() ? null : cleanSearch,
                cleanTag.isEmpty() || "all".equalsIgnoreCase(cleanTag) ? null : cleanTag,
                cleanFormat.isEmpty() || "all".equalsIgnoreCase(cleanFormat) ? null : cleanFormat,
                pageable
        );

        List<MediaItemResponse> responseList = mediaMapper.toSummaryResponseList(entityPage.getContent());

        log.debug("Found {} media items on page {} of {}",
                entityPage.getNumberOfElements(), entityPage.getNumber(), entityPage.getTotalPages());

        return PageResponse.of(
                responseList,
                entityPage.getNumber(),
                entityPage.getSize(),
                entityPage.getTotalElements()
        );
    }

    @Override
    @Transactional
    public MediaItemResponse uploadMedia(MultipartFile file, String category, List<String> tags, String dimensions, Long currentUserId) {
        log.info("Processing media upload for file: {}, category: {}, uploadedBy: {}",
                file.getOriginalFilename(), category, currentUserId);

        String cleanCategory = NullSafeUtils.safeLowerTrim(category);
        if (!StringUtils.hasText(cleanCategory)) {
            cleanCategory = AppConstants.DEFAULT_MEDIA_CATEGORY;
        }

        // 1. Upload file via StorageService (handles compression & storage)
        String fileUrl = storageService.uploadImage(file, cleanCategory);

        String originalName = file.getOriginalFilename();
        if (!StringUtils.hasText(originalName)) {
            StringBuilder nameBuilder = new StringBuilder();
            nameBuilder.append("upload-").append(System.currentTimeMillis()).append(".webp");
            originalName = nameBuilder.toString();
        }

        String objectKey;
        if (StringUtils.hasText(fileUrl) && fileUrl.contains("/heygoodly-media/")) {
            objectKey = fileUrl.substring(fileUrl.indexOf("/heygoodly-media/") + "/heygoodly-media/".length());
        } else {
            StringBuilder keyBuilder = new StringBuilder();
            keyBuilder.append(cleanCategory).append(AppConstants.SLASH)
                    .append(System.currentTimeMillis()).append(AppConstants.HYPHEN)
                    .append(originalName);
            objectKey = keyBuilder.toString();
        }

        if (mediaItemRepository.findByObjectKey(objectKey).isPresent()) {
            objectKey = objectKey + "-" + java.util.UUID.randomUUID().toString().substring(0, 8);
        }

        long sizeBytes = file.getSize();
        String mimeType = file.getContentType();
        String safeDimensions = NullSafeUtils.safeTrim(dimensions);
        if (!StringUtils.hasText(safeDimensions)) {
            safeDimensions = AppConstants.DEFAULT_DIMENSIONS;
        }

        List<String> safeTags = NullSafeUtils.safeList(tags).stream()
                .map(NullSafeUtils::safeLowerTrim)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());

        MediaItemEntity entity = MediaItemEntity.builder()
                .name(originalName)
                .objectKey(objectKey)
                .bucket("heygoodly-media")
                .url(fileUrl)
                .category(cleanCategory)
                .sizeBytes(sizeBytes)
                .mimeType(mimeType)
                .dimensions(safeDimensions)
                .tags(safeTags)
                .uploadedBy(Objects.nonNull(currentUserId) ? currentUserId : 1L)
                .build();

        MediaItemEntity saved = mediaItemRepository.save(entity);

        // Synchronize media tags with centralized taxonomy
        try {
            tagService.syncEntityTags(EntityFieldConstants.TYPE_MEDIA, saved.getId(), safeTags);
        } catch (Exception ex) {
            log.warn("Failed to sync tags for media id: {}: {}", saved.getId(), ex.getMessage());
        }

        try {
            auditLogService.recordLog(CreateAuditLogRequest.builder()
                    .userId(Objects.nonNull(currentUserId) ? currentUserId : 1L)
                    .action("UPLOAD_MEDIA")
                    .module("media")
                    .resourceId(String.valueOf(saved.getId()))
                    .resourceName(saved.getName())
                    .status("SUCCESS")
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to record media upload audit log: {}", ex.getMessage());
        }

        MediaItemResponse response = mediaMapper.toDetailResponse(saved);
        log.info("Successfully uploaded media: id={}, key={}, url={}", saved.getId(), saved.getObjectKey(), saved.getUrl());
        return response;
    }

    @Override
    @Transactional
    public MediaItemResponse updateTags(Long id, List<String> tags) {
        log.info("Updating media tags for id={}", id);
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        List<String> safeTags = NullSafeUtils.safeList(tags).stream()
                .map(NullSafeUtils::safeLowerTrim)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());

        item.setTags(safeTags);
        MediaItemEntity updated = mediaItemRepository.save(item);

        try {
            tagService.syncEntityTags(EntityFieldConstants.TYPE_MEDIA, updated.getId(), safeTags);
        } catch (Exception ex) {
            log.warn("Failed to sync updated tags for media id: {}: {}", updated.getId(), ex.getMessage());
        }

        log.info("Successfully updated tags for media id: {}", id);
        return mediaMapper.toDetailResponse(updated);
    }

    @Transactional
    public MediaItemResponse addTag(Long id, String tag) {
        log.info("Adding tag '{}' to media id={}", tag, id);
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        String cleanTag = NullSafeUtils.safeLowerTrim(tag).replaceAll("^#+", "");
        if (StringUtils.hasText(cleanTag)) {
            List<String> existingTags = new ArrayList<>(NullSafeUtils.safeList(item.getTags()));
            if (!existingTags.contains(cleanTag)) {
                existingTags.add(cleanTag);
                item.setTags(existingTags);
                item = mediaItemRepository.save(item);

                try {
                    tagService.syncEntityTags(EntityFieldConstants.TYPE_MEDIA, item.getId(), existingTags);
                } catch (Exception ex) {
                    log.warn("Failed to sync tag after add for media id: {}: {}", item.getId(), ex.getMessage());
                }
            }
        }

        return mediaMapper.toDetailResponse(item);
    }

    @Transactional
    public MediaItemResponse removeTag(Long id, String tag) {
        log.info("Removing tag '{}' from media id={}", tag, id);
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        String cleanTag = NullSafeUtils.safeLowerTrim(tag).replaceAll("^#+", "");
        if (StringUtils.hasText(cleanTag) && !CollectionUtils.isEmpty(item.getTags())) {
            List<String> existingTags = new ArrayList<>(item.getTags());
            existingTags.remove(cleanTag);
            item.setTags(existingTags);
            item = mediaItemRepository.save(item);

            try {
                tagService.syncEntityTags(EntityFieldConstants.TYPE_MEDIA, item.getId(), existingTags);
            } catch (Exception ex) {
                log.warn("Failed to sync tags after remove for media id: {}: {}", item.getId(), ex.getMessage());
            }
        }

        return mediaMapper.toDetailResponse(item);
    }

    @Override
    @Transactional(readOnly = true)
    public MediaUsageResponse getMediaUsage(Long id) {
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        String needle = StringUtils.hasText(item.getObjectKey()) ? item.getObjectKey().trim() : NullSafeUtils.safeTrim(item.getUrl());
        List<MediaUsageResponse.UsageItem> usages = new ArrayList<>();

        if (StringUtils.hasText(needle)) {
            String likePattern = "%" + needle + "%";

            appendUsageQuery(usages, "Post",
                    "SELECT id, title, CASE WHEN image LIKE :pat THEN 'Featured Image' ELSE 'Article Content' END " +
                            "FROM posts WHERE is_deleted = false AND (image LIKE :pat OR content LIKE :pat) LIMIT 15",
                    likePattern);

            appendUsageQuery(usages, "Store",
                    "SELECT id, name, CASE WHEN logo LIKE :pat THEN 'Logo' WHEN social_card_image LIKE :pat THEN 'Social Card' ELSE 'About Store' END " +
                            "FROM stores WHERE is_deleted = false AND (logo LIKE :pat OR social_card_image LIKE :pat OR about_store LIKE :pat) LIMIT 15",
                    likePattern);

            appendUsageQuery(usages, "Offer",
                    "SELECT id, name, 'Offer Image' FROM offers WHERE is_deleted = false AND image LIKE :pat LIMIT 15",
                    likePattern);

            appendUsageQuery(usages, "Category",
                    "SELECT id, name, CASE WHEN image LIKE :pat THEN 'Category Image' ELSE 'Description' END " +
                            "FROM categories WHERE is_deleted = false AND (image LIKE :pat OR description LIKE :pat) LIMIT 15",
                    likePattern);

            appendUsageQuery(usages, "Page",
                    "SELECT id, title, CASE WHEN image LIKE :pat THEN 'Cover Image' ELSE 'Page Content' END " +
                            "FROM pages WHERE is_deleted = false AND (image LIKE :pat OR content LIKE :pat) LIMIT 15",
                    likePattern);

            appendUsageQuery(usages, "Settings",
                    "SELECT id, setting_key, 'Site Settings' FROM system_settings WHERE setting_value LIKE :pat LIMIT 15",
                    likePattern);
        }

        return MediaUsageResponse.builder()
                .mediaId(item.getId())
                .mediaName(item.getName())
                .url(item.getUrl())
                .totalUsages(usages.size())
                .usages(usages)
                .build();
    }

    @SuppressWarnings("unchecked")
    private void appendUsageQuery(List<MediaUsageResponse.UsageItem> target, String module, String sql, String likePattern) {
        try {
            List<Object[]> rows = entityManager.createNativeQuery(sql)
                    .setParameter("pat", likePattern)
                    .getResultList();
            if (rows != null) {
                for (Object[] row : rows) {
                    if (row != null && row.length >= 3) {
                        target.add(MediaUsageResponse.UsageItem.builder()
                                .module(module)
                                .resourceId(row[0] != null ? String.valueOf(row[0]) : "")
                                .title(row[1] != null ? String.valueOf(row[1]) : "")
                                .field(row[2] != null ? String.valueOf(row[2]) : "")
                                .build());
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to scan media usage in module {}: {}", module, ex.getMessage());
        }
    }

    @Override
    @Transactional
    public MediaItemResponse replaceMedia(Long id, MultipartFile file, String dimensions, Long currentUserId) {
        log.info("Replacing/re-uploading media item id={} at exact objectKey", id);
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        String targetKey = item.getObjectKey();
        String oldUrl = NullSafeUtils.safeTrim(item.getUrl());
        String restoredUrl = storageService.uploadImageAtKey(file, targetKey);

        // Build cache-busted URL on the EXACT same path so browsers, Next.js Image cache,
        // and all referencing Posts/Stores/Offers/Pages/Settings immediately display the new image.
        String baseUrl = StringUtils.hasText(oldUrl) ? oldUrl : restoredUrl;
        if (baseUrl.contains("?v=")) {
            baseUrl = baseUrl.substring(0, baseUrl.indexOf("?v="));
        }
        String versionedUrl = baseUrl + "?v=" + System.currentTimeMillis();

        if (StringUtils.hasText(file.getOriginalFilename())) {
            item.setName(file.getOriginalFilename());
        }
        item.setUrl(versionedUrl);
        item.setSizeBytes(file.getSize());
        item.setMimeType(file.getContentType());
        if (StringUtils.hasText(dimensions)) {
            item.setDimensions(NullSafeUtils.safeTrim(dimensions));
        }
        item.setIsDeleted(false);
        item.setDeletedAt(null);
        if (Objects.nonNull(currentUserId)) {
            item.setUploadedBy(currentUserId);
        }

        MediaItemEntity saved = mediaItemRepository.save(item);

        // Update all references from baseUrl (with any existing ?v=... query chain) -> versionedUrl
        if (StringUtils.hasText(baseUrl)) {
            propagateReplacedUrl(baseUrl, versionedUrl);
        }

        try {
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.POSTS_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.STORES_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.OFFERS_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.CATEGORIES_PREFIX);
        } catch (Exception ex) {
            log.warn("Failed to evict caches after media replace id={}: {}", id, ex.getMessage());
        }

        try {
            if (!CollectionUtils.isEmpty(saved.getTags())) {
                tagService.syncEntityTags(EntityFieldConstants.TYPE_MEDIA, saved.getId(), saved.getTags());
            }
        } catch (Exception ex) {
            log.warn("Failed to re-sync tags for restored media id={}: {}", id, ex.getMessage());
        }

        try {
            auditLogService.recordLog(CreateAuditLogRequest.builder()
                    .userId(Objects.nonNull(currentUserId) ? currentUserId : 1L)
                    .action("REPLACE_MEDIA")
                    .module("media")
                    .resourceId(String.valueOf(saved.getId()))
                    .resourceName(saved.getName())
                    .status("SUCCESS")
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to record media replace audit log: {}", ex.getMessage());
        }

        return mediaMapper.toDetailResponse(saved);
    }

    private void propagateReplacedUrl(String baseUrl, String newUrl) {
        if (!StringUtils.hasText(baseUrl) || !StringUtils.hasText(newUrl)) {
            return;
        }
        String cleanBase = baseUrl.contains("?v=") ? baseUrl.substring(0, baseUrl.indexOf("?v=")) : baseUrl;
        String likePat = "%" + cleanBase + "%";
        // Escape regex metacharacters for PostgreSQL POSIX regex, then match any stacked (?v=...) suffixes
        String escapedBase = cleanBase.replaceAll("([\\\\.^$|?*+()\\[\\]{}])", "\\\\$1");
        String regexPat = escapedBase + "(\\?v=[a-zA-Z0-9_-]+)*";

        String[] updates = new String[] {
                "UPDATE posts SET image = REGEXP_REPLACE(image, :regexPat, :newUrl, 'g') WHERE image LIKE :pat",
                "UPDATE posts SET content = REGEXP_REPLACE(content, :regexPat, :newUrl, 'g') WHERE content LIKE :pat",
                "UPDATE stores SET logo = REGEXP_REPLACE(logo, :regexPat, :newUrl, 'g') WHERE logo LIKE :pat",
                "UPDATE stores SET social_card_image = REGEXP_REPLACE(social_card_image, :regexPat, :newUrl, 'g') WHERE social_card_image LIKE :pat",
                "UPDATE stores SET about_store = REGEXP_REPLACE(about_store, :regexPat, :newUrl, 'g') WHERE about_store LIKE :pat",
                "UPDATE offers SET image = REGEXP_REPLACE(image, :regexPat, :newUrl, 'g') WHERE image LIKE :pat",
                "UPDATE categories SET image = REGEXP_REPLACE(image, :regexPat, :newUrl, 'g') WHERE image LIKE :pat",
                "UPDATE categories SET description = REGEXP_REPLACE(description, :regexPat, :newUrl, 'g') WHERE description LIKE :pat",
                "UPDATE pages SET image = REGEXP_REPLACE(image, :regexPat, :newUrl, 'g') WHERE image LIKE :pat",
                "UPDATE pages SET content = REGEXP_REPLACE(content, :regexPat, :newUrl, 'g') WHERE content LIKE :pat",
                "UPDATE system_settings SET setting_value = REGEXP_REPLACE(setting_value, :regexPat, :newUrl, 'g') WHERE setting_value LIKE :pat"
        };
        for (String sql : updates) {
            try {
                entityManager.createNativeQuery(sql)
                        .setParameter("regexPat", regexPat)
                        .setParameter("newUrl", newUrl)
                        .setParameter("pat", likePat)
                        .executeUpdate();
            } catch (Exception ex) {
                log.warn("Failed to propagate replaced media URL ({}): {}", sql, ex.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void deleteMedia(Long id) {
        log.info("Soft-deleting media item id={} (removing file from storage, preserving URL slot for re-upload)", id);
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        String oldUrl = NullSafeUtils.safeTrim(item.getUrl());
        String baseUrl = oldUrl.contains("?v=") ? oldUrl.substring(0, oldUrl.indexOf("?v=")) : oldUrl;

        // Delete physical file from storage using clean key so ?v=... never blocks MinIO deletion
        try {
            if (StringUtils.hasText(baseUrl)) {
                storageService.deleteFile(baseUrl);
            } else {
                storageService.deleteFile(oldUrl);
            }
        } catch (Exception ex) {
            log.warn("Failed to delete physical file {}: {}", item.getUrl(), ex.getMessage());
        }

        // Bump ?v=deleted-<ts> so Next.js <Image> optimizer & browser caches immediately drop the deleted image
        String deletedMarkerUrl = StringUtils.hasText(baseUrl)
                ? baseUrl + "?v=deleted-" + System.currentTimeMillis()
                : oldUrl;

        item.setUrl(deletedMarkerUrl);
        item.setIsDeleted(true);
        item.setDeletedAt(java.time.Instant.now());
        mediaItemRepository.save(item);

        if (StringUtils.hasText(baseUrl)) {
            propagateReplacedUrl(baseUrl, deletedMarkerUrl);
        }

        try {
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.POSTS_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.STORES_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.OFFERS_PUBLIC_PREFIX);
            redisCacheService.evictByPrefix(com.heygoodly.portal.common.cache.RedisCacheService.CATEGORIES_PREFIX);
        } catch (Exception ex) {
            log.warn("Failed to evict caches after media delete id={}: {}", id, ex.getMessage());
        }

        try {
            auditLogService.recordLog(CreateAuditLogRequest.builder()
                    .userId(Objects.nonNull(item.getUploadedBy()) ? item.getUploadedBy() : 1L)
                    .action("DELETE_MEDIA")
                    .module("media")
                    .resourceId(String.valueOf(id))
                    .resourceName(item.getName())
                    .status("SUCCESS")
                    .build());
        } catch (Exception ex) {
            log.warn("Failed to record media delete audit log: {}", ex.getMessage());
        }
    }

    @Override
    @Transactional
    public void purgeMedia(Long id) {
        log.info("Permanently purging media item id={}", id);
        MediaItemEntity item = mediaItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(String.format("Media item not found with %s: %d", EntityFieldConstants.ID, id)));

        try {
            tagService.syncEntityTags(EntityFieldConstants.TYPE_MEDIA, item.getId(), List.of());
        } catch (Exception ex) {
            log.warn("Failed to clear tags for purged media id={}: {}", id, ex.getMessage());
        }

        try {
            storageService.deleteFile(item.getUrl());
        } catch (Exception ex) {
            log.warn("Failed to delete physical file {}: {}", item.getUrl(), ex.getMessage());
        }

        mediaItemRepository.delete(item);
        mediaItemRepository.flush();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAllUniqueTags() {
        return new ArrayList<>(getTagCounts().keySet());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Long> getTagCounts() {
        Map<String, Long> result = new TreeMap<>();
        List<Object[]> rows = mediaItemRepository.findTagCountsRaw();
        if (rows != null) {
            for (Object[] row : rows) {
                if (row != null && row.length >= 2 && row[0] != null && row[1] instanceof Number num) {
                    String tag = row[0].toString().trim().toLowerCase();
                    if (!tag.isEmpty()) {
                        result.merge(tag, num.longValue(), Long::sum);
                    }
                }
            }
        }
        return result;
    }
}
