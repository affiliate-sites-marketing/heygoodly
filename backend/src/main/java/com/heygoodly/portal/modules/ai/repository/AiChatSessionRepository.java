package com.heygoodly.portal.modules.ai.repository;

import com.heygoodly.portal.modules.ai.entity.AiChatSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiChatSessionRepository extends JpaRepository<AiChatSessionEntity, Long> {

    List<AiChatSessionEntity> findTop50ByUserEmailAndIsDeletedFalseOrderByIsPinnedDescUpdatedAtDescIdDesc(String userEmail);

    Optional<AiChatSessionEntity> findByIdAndUserEmailAndIsDeletedFalse(Long id, String userEmail);
}
