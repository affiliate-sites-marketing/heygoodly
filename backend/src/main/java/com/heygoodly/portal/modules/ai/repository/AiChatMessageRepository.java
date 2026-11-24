package com.heygoodly.portal.modules.ai.repository;

import com.heygoodly.portal.modules.ai.entity.AiChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiChatMessageRepository extends JpaRepository<AiChatMessageEntity, Long> {

    List<AiChatMessageEntity> findBySessionIdOrderByIdAsc(Long sessionId);

    void deleteBySessionIdAndIdGreaterThanEqual(Long sessionId, Long messageId);
}
