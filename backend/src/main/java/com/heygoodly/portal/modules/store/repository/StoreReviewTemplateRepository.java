package com.heygoodly.portal.modules.store.repository;

import com.heygoodly.portal.modules.store.entity.StoreReviewTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreReviewTemplateRepository extends JpaRepository<StoreReviewTemplateEntity, Long> {

    List<StoreReviewTemplateEntity> findByIsDeletedFalseOrderBySortOrderAscIdDesc();

    Optional<StoreReviewTemplateEntity> findByIdAndIsDeletedFalse(Long id);
}
