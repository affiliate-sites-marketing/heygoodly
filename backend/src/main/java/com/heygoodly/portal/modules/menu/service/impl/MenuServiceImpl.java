package com.heygoodly.portal.modules.menu.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.heygoodly.portal.common.cache.RedisCacheService;
import com.heygoodly.portal.common.constant.AppConstants;
import com.heygoodly.portal.common.constant.EntityFieldConstants;
import com.heygoodly.portal.common.dto.PageResponse;
import com.heygoodly.portal.common.exception.BadRequestException;
import com.heygoodly.portal.common.exception.ResourceNotFoundException;
import com.heygoodly.portal.common.util.NullSafeUtils;
import com.heygoodly.portal.modules.audit.service.AuditLogService;
import com.heygoodly.portal.modules.menu.dto.request.MenuRequest;
import com.heygoodly.portal.modules.menu.dto.response.MenuResponse;
import com.heygoodly.portal.modules.menu.entity.MenuEntity;
import com.heygoodly.portal.modules.menu.mapper.MenuMapper;
import com.heygoodly.portal.modules.menu.repository.MenuRepository;
import com.heygoodly.portal.modules.menu.service.MenuService;
import com.heygoodly.portal.modules.page.entity.PageEntity;
import com.heygoodly.portal.modules.page.repository.PageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final MenuRepository menuRepository;
    private final PageRepository pageRepository;
    private final MenuMapper menuMapper;
    private final AuditLogService auditLogService;
    private final RedisCacheService redisCacheService;

    @Override
    @Transactional(readOnly = true)
    public List<MenuResponse> getPublicMenus(String position) {
        String pos = StringUtils.hasText(position) ? position.toLowerCase().trim() : AppConstants.DEFAULT_MENU_POSITION;
        return redisCacheService.getOrLoad(
                RedisCacheService.MENUS_PUBLIC_PREFIX + pos,
                new TypeReference<List<MenuResponse>>() {},
                java.time.Duration.ofMinutes(5),
                () -> {
                    log.info("Fetching public menus for position: {}", pos);
                    List<MenuEntity> list = menuRepository.findByPositionAndIsActiveTrueOrderBySortOrderAscCreatedAtDescIdDesc(pos);
                    return menuMapper.buildTree(list);
                }
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getDisabledMenuRoutes() {
        return redisCacheService.getOrLoad(
                RedisCacheService.MENUS_PUBLIC_PREFIX + "disabled-routes",
                new TypeReference<List<String>>() {},
                java.time.Duration.ofMinutes(5),
                () -> {
                    java.util.Set<String> disabled = new java.util.LinkedHashSet<>();

                    // 1. Any internal route whose menu item is disabled (isActive = false)
                    List<MenuEntity> allMenus = menuRepository.findAll();
                    for (MenuEntity menu : allMenus) {
                        if (!Boolean.TRUE.equals(menu.getIsActive())) {
                            String path = normalizeInternalMenuPath(menu.getTargetType(), menu.getTargetValue());
                            if (path != null) {
                                disabled.add(path);
                            }
                        }
                    }

                    // 2. Any static page that is disabled (isActive = false, isDeleted = false)
                    List<PageEntity> allPages = pageRepository.findAll();
                    for (PageEntity page : allPages) {
                        if (!Boolean.TRUE.equals(page.getIsDeleted()) && !Boolean.TRUE.equals(page.getIsActive())) {
                            String slug = NullSafeUtils.safeLowerTrim(page.getSlug());
                            if (!slug.isEmpty()) {
                                String cleanSlug = slug.startsWith("/") ? slug.substring(1) : slug;
                                disabled.add("/" + cleanSlug);
                                disabled.add("/pages/" + cleanSlug);
                            }
                        }
                    }

                    return new ArrayList<>(disabled);
                }
        );
    }

    private String normalizeInternalMenuPath(String targetType, String targetValue) {
        if (!StringUtils.hasText(targetValue)) {
            return null;
        }
        String raw = targetValue.trim();
        if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
            return null;
        }
        int qIdx = raw.indexOf('?');
        if (qIdx >= 0) {
            raw = raw.substring(0, qIdx);
        }
        int hIdx = raw.indexOf('#');
        if (hIdx >= 0) {
            raw = raw.substring(0, hIdx);
        }
        raw = raw.trim().toLowerCase();
        if (raw.isEmpty()) {
            return null;
        }

        String path;
        if (raw.startsWith("/")) {
            path = raw;
        } else {
            String type = StringUtils.hasText(targetType) ? targetType.trim().toLowerCase() : "url";
            path = switch (type) {
                case "category" -> "/category/" + raw;
                case "store" -> "/store/" + raw;
                case "post" -> "/post/" + raw;
                case "page" -> "/" + raw;
                default -> "/" + raw;
            };
        }

        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        if ("/".equals(path) || path.startsWith("/admin")) {
            return null;
        }
        return path;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuResponse> getAllMenus(String position) {
        String pos = StringUtils.hasText(position) ? position.toLowerCase().trim() : AppConstants.DEFAULT_MENU_POSITION;
        log.info("Fetching all admin menus for position: {}", pos);
        List<MenuEntity> list = menuRepository.findByPositionOrderBySortOrderAscCreatedAtDescIdDesc(pos);
        return menuMapper.buildTree(list);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MenuResponse> getMenus(Pageable pageable, String position) {
        String pos = StringUtils.hasText(position) ? position.toLowerCase().trim() : AppConstants.DEFAULT_MENU_POSITION;
        log.info("Fetching paged menus for position: {}, page: {}", pos, pageable.getPageNumber());
        Page<MenuEntity> page = menuRepository.findByPositionOrderBySortOrderAscCreatedAtDescIdDesc(pos, pageable);
        List<MenuResponse> content = page.getContent().stream()
                .map(m -> menuMapper.toResponse(m, Collections.emptyList()))
                .toList();
        return PageResponse.of(content, page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public MenuResponse getMenuById(Long id) {
        log.info("Fetching menu by id: {}", id);
        MenuEntity entity = menuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(EntityFieldConstants.ENTITY_MENU, EntityFieldConstants.ID, id));
        return menuMapper.toResponse(entity, Collections.emptyList());
    }

    @Override
    @Transactional
    public MenuResponse createMenu(MenuRequest request) {
        log.info("Creating menu item: title={}, position={}", request.getTitle(), request.getPosition());
        MenuEntity parent = null;
        if (Objects.nonNull(request.getParentId())) {
            parent = menuRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException(EntityFieldConstants.ENTITY_MENU, EntityFieldConstants.ID, request.getParentId()));
        }

        MenuEntity menu = MenuEntity.builder()
                .parent(parent)
                .position(NullSafeUtils.safeLowerTrim(request.getPosition()))
                .title(NullSafeUtils.safeTrim(request.getTitle()))
                .targetType(NullSafeUtils.safeLowerTrim(request.getTargetType()))
                .targetValue(NullSafeUtils.safeTrim(request.getTargetValue()))
                .imageIcon(request.getImageIcon())
                .sortOrder(Objects.nonNull(request.getSortOrder()) ? request.getSortOrder() : AppConstants.DEFAULT_SORT_ORDER)
                .isActive(Objects.nonNull(request.getIsActive()) ? request.getIsActive() : true)
                .build();

        MenuEntity saved = menuRepository.save(menu);
        redisCacheService.evictByPrefix(RedisCacheService.MENUS_PUBLIC_PREFIX);
        redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
        auditLogService.recordAction("CREATE", "menus", String.valueOf(saved.getId()), saved.getTitle(), null);
        log.info("Successfully created menu item id={}", saved.getId());
        return menuMapper.toResponse(saved, Collections.emptyList());
    }

    @Override
    @Transactional
    public MenuResponse updateMenu(Long id, MenuRequest request) {
        log.info("Updating menu item id={}", id);
        MenuEntity entity = menuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(EntityFieldConstants.ENTITY_MENU, EntityFieldConstants.ID, id));

        String oldTitle = entity.getTitle();
        String oldPosition = entity.getPosition();
        String oldTargetValue = entity.getTargetValue();
        Boolean oldActive = entity.getIsActive();

        MenuEntity parent = null;
        if (Objects.nonNull(request.getParentId())) {
            if (request.getParentId().equals(id)) {
                throw new BadRequestException("Menu item cannot be its own parent.");
            }
            parent = menuRepository.findById(request.getParentId())
                    .orElseThrow(() -> new ResourceNotFoundException(EntityFieldConstants.ENTITY_MENU, EntityFieldConstants.ID, request.getParentId()));
        }

        entity.setParent(parent);
        entity.setPosition(NullSafeUtils.safeLowerTrim(request.getPosition()));
        entity.setTitle(NullSafeUtils.safeTrim(request.getTitle()));
        entity.setTargetType(NullSafeUtils.safeLowerTrim(request.getTargetType()));
        entity.setTargetValue(NullSafeUtils.safeTrim(request.getTargetValue()));
        entity.setImageIcon(request.getImageIcon());
        if (Objects.nonNull(request.getSortOrder())) {
            entity.setSortOrder(request.getSortOrder());
        }
        if (Objects.nonNull(request.getIsActive())) {
            entity.setIsActive(request.getIsActive());
        }

        MenuEntity updated = menuRepository.save(entity);
        redisCacheService.evictByPrefix(RedisCacheService.MENUS_PUBLIC_PREFIX);
        redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
        List<Map<String, Object>> diffs = new ArrayList<>();
        AuditLogService.appendDiff(diffs, "title", "Menu Title", oldTitle, updated.getTitle());
        AuditLogService.appendDiff(diffs, "position", "Position", oldPosition, updated.getPosition());
        AuditLogService.appendDiff(diffs, "targetValue", "Target URL/Slug", oldTargetValue, updated.getTargetValue());
        AuditLogService.appendDiff(diffs, "isActive", "Active Status", oldActive, updated.getIsActive());
        auditLogService.recordAction("UPDATE", "menus", String.valueOf(updated.getId()), updated.getTitle(), diffs);
        log.info("Successfully updated menu item id={}", updated.getId());
        return menuMapper.toResponse(updated, Collections.emptyList());
    }

    @Override
    @Transactional
    public void deleteMenu(Long id) {
        log.info("Deleting menu item id={}", id);
        MenuEntity entity = menuRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(EntityFieldConstants.ENTITY_MENU, EntityFieldConstants.ID, id));
        String deletedTitle = entity.getTitle();
        menuRepository.delete(entity);
        redisCacheService.evictByPrefix(RedisCacheService.MENUS_PUBLIC_PREFIX);
        redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
        auditLogService.recordAction("DELETE", "menus", String.valueOf(id), deletedTitle, null);
        log.info("Successfully deleted menu item id={}", id);
    }

    @Override
    @Transactional
    public void reorderMenus(List<Long> orderedIds) {
        com.heygoodly.portal.common.util.SortOrderUtils.reorderEntities(
                orderedIds, menuRepository, MenuEntity::getId, MenuEntity::setSortOrder);
        redisCacheService.evictByPrefix(RedisCacheService.MENUS_PUBLIC_PREFIX);
        redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
    }
}
