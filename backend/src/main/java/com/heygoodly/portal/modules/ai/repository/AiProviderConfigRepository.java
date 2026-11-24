package com.heygoodly.portal.modules.ai.repository;

import com.heygoodly.portal.modules.ai.entity.AiProviderConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiProviderConfigRepository extends JpaRepository<AiProviderConfigEntity, Long> {

    List<AiProviderConfigEntity> findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc();

    Optional<AiProviderConfigEntity> findByIdAndIsDeletedFalse(Long id);

    Optional<AiProviderConfigEntity> findFirstByIsDefaultTrueAndIsActiveTrueAndIsDeletedFalseOrderByIdAsc();

    Optional<AiProviderConfigEntity> findFirstByIsFallbackTrueAndIsActiveTrueAndIsDeletedFalseOrderByIdAsc();

    Optional<AiProviderConfigEntity> findFirstByIsActiveTrueAndIsDeletedFalseOrderByIdAsc();
}
