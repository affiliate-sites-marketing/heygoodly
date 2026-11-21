package com.heygoodly.portal.modules.store.repository;

import com.heygoodly.portal.modules.store.entity.StoreFaqTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StoreFaqTemplateRepository extends JpaRepository<StoreFaqTemplateEntity, Long> {

    List<StoreFaqTemplateEntity> findByIsDeletedFalseOrderByIsDefaultDescSortOrderAscIdDesc();

    Optional<StoreFaqTemplateEntity> findByIdAndIsDeletedFalse(Long id);
}
