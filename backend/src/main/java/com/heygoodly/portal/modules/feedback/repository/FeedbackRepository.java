package com.heygoodly.portal.modules.feedback.repository;

import com.heygoodly.portal.modules.feedback.entity.FeedbackEntity;
import com.heygoodly.portal.modules.feedback.enums.FeedbackType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<FeedbackEntity, Long> {
    Page<FeedbackEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByIsReadFalse();
    long countByIsReadFalseAndType(FeedbackType type);
    long countByIsReadFalseAndTypeNot(FeedbackType type);

    @Query("SELECT COUNT(f), " +
           "COALESCE(SUM(CASE WHEN f.type = com.heygoodly.portal.modules.feedback.enums.FeedbackType.COUPON_REPORT THEN 1L ELSE 0L END), 0L), " +
           "COALESCE(SUM(CASE WHEN f.type <> com.heygoodly.portal.modules.feedback.enums.FeedbackType.COUPON_REPORT THEN 1L ELSE 0L END), 0L) " +
           "FROM FeedbackEntity f WHERE f.isRead = false")
    List<Object[]> summarizeUnreadFeedback();
}
