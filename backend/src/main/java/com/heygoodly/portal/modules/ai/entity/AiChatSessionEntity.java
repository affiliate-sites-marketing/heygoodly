package com.heygoodly.portal.modules.ai.entity;

import com.heygoodly.portal.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "ai_chat_sessions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSessionEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_email", nullable = false, length = 150)
    private String userEmail;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "config_id")
    private Long configId;

    @Column(name = "model", length = 200)
    private String model;

    @Builder.Default
    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Builder.Default
    @Column(name = "persona", length = 60)
    private String persona = "general";

    @Column(name = "system_prompt", columnDefinition = "TEXT")
    private String systemPrompt;
}
