package com.heygoodly.portal.modules.menu.repository;

import com.heygoodly.portal.modules.menu.entity.MenuEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuRepository extends JpaRepository<MenuEntity, Long> {
    List<MenuEntity> findByPositionAndIsActiveTrueOrderBySortOrderAscCreatedAtDescIdDesc(String position);
    List<MenuEntity> findByPositionOrderBySortOrderAscCreatedAtDescIdDesc(String position);
    Page<MenuEntity> findByPositionOrderBySortOrderAscCreatedAtDescIdDesc(String position, Pageable pageable);
}
