package com.heygoodly.portal.modules.store.repository;

import com.heygoodly.portal.modules.store.entity.StoreEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreRepository extends JpaRepository<StoreEntity, Long>, JpaSpecificationExecutor<StoreEntity> {
    Optional<StoreEntity> findBySlugAndIsDeletedFalse(String slug);
    boolean existsBySlugAndIsDeletedFalse(String slug);
    boolean existsBySlugAndIdNotAndIsDeletedFalse(String slug, Long id);

    @Query("SELECT s.categoryId, COUNT(s) FROM StoreEntity s WHERE s.isActive = true AND s.isDeleted = false AND s.categoryId IS NOT NULL GROUP BY s.categoryId")
    List<Object[]> countActiveStoresGroupedByCategory();

    @Query("SELECT COUNT(s) FROM StoreEntity s WHERE s.isActive = true AND s.isDeleted = false AND s.categoryId = :categoryId")
    long countActiveByCategoryId(@Param("categoryId") Long categoryId);

    @Modifying
    @Query("UPDATE StoreEntity s SET s.afVisitCount = s.afVisitCount + 1 WHERE s.id = :id")
    void incrementVisitCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE StoreEntity s SET s.categoryId = :targetCategoryId WHERE s.categoryId = :sourceCategoryId AND s.isDeleted = false")
    int reassignCategory(@Param("sourceCategoryId") Long sourceCategoryId, @Param("targetCategoryId") Long targetCategoryId);

    long countByIsActiveTrueAndIsDeletedFalse();

    long countByIsActiveTrueAndIsFeaturedTrueAndIsDeletedFalse();

    @Query("SELECT COUNT(s), COALESCE(SUM(CASE WHEN s.isFeatured = true THEN 1L ELSE 0L END), 0L) " +
           "FROM StoreEntity s WHERE s.isActive = true AND s.isDeleted = false")
    List<Object[]> summarizeActiveStores();

    @Query("SELECT COALESCE(SUM(s.afVisitCount), 0) FROM StoreEntity s WHERE s.isDeleted = false")
    long sumTotalClicks();

    Page<StoreEntity> findByIsActiveTrueAndIsDeletedFalse(Pageable pageable);

    @Query("SELECT s FROM StoreEntity s WHERE s.isActive = true AND s.isDeleted = false AND " +
           "(LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(s.slug) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<StoreEntity> searchActiveStores(@Param("query") String query, Pageable pageable);
}
