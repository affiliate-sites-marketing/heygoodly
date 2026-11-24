package com.heygoodly.portal.modules.store.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "store_review_templates")
public class StoreReviewTemplateEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Builder.Default
    @Column(nullable = false, length = 50)
    private String category = "savings";

    @Column(nullable = false, length = 180)
    private String title;

    @Column(name = "reviewer_name", nullable = false, length = 120)
    private String reviewerName;

    @Column(name = "reviewer_avatar", length = 500)
    private String reviewerAvatar;

    @Builder.Default
    @JdbcTypeCode(SqlTypes.SMALLINT)
    @Column(nullable = false, columnDefinition = "smallint")
    private Integer rating = 5;

    @Column(name = "review_date_label", length = 80)
    private String reviewDateLabel;

    @Builder.Default
    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = true;

    @Column(name = "comment_template", nullable = false, columnDefinition = "text")
    private String commentTemplate;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 100;
}
