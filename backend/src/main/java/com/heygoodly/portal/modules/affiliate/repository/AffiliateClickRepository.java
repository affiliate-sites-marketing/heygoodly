package com.heygoodly.portal.modules.affiliate.repository;

import com.heygoodly.portal.modules.affiliate.entity.AffiliateClickEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Repository
public interface AffiliateClickRepository extends JpaRepository<AffiliateClickEntity, Long> {

    @Query(value = "SELECT TO_CHAR(created_at AT TIME ZONE :timeZone, 'YYYY-MM-DD') as day_str, " +
                   "COUNT(id) as clicks_count " +
                   "FROM affiliate_clicks " +
                   "WHERE created_at >= :since " +
                   "GROUP BY day_str ORDER BY day_str ASC", nativeQuery = true)
    List<Object[]> findDailyClicksSince(@Param("since") Instant since, @Param("timeZone") String timeZone);

    @Query(value = "SELECT TO_CHAR(DATE_TRUNC('week', created_at AT TIME ZONE :timeZone), 'YYYY-MM-DD') as week_str, " +
                   "COUNT(id) as clicks_count " +
                   "FROM affiliate_clicks " +
                   "WHERE created_at >= :since " +
                   "GROUP BY week_str ORDER BY week_str ASC", nativeQuery = true)
    List<Object[]> findWeeklyClicksSince(@Param("since") Instant since, @Param("timeZone") String timeZone);

    @Query("SELECT c.offerId, COUNT(c.id) FROM AffiliateClickEntity c WHERE c.offerId IN :offerIds GROUP BY c.offerId")
    List<Object[]> countClicksByOfferIds(@Param("offerIds") Collection<Long> offerIds);

    @Query("SELECT c.storeId, COUNT(c.id) FROM AffiliateClickEntity c WHERE c.storeId IN :storeIds GROUP BY c.storeId")
    List<Object[]> countClicksByStoreIds(@Param("storeIds") Collection<Long> storeIds);

    @Query("SELECT COUNT(c.id) FROM AffiliateClickEntity c WHERE c.createdAt >= :startDate AND c.createdAt < :endDate")
    long countClicksBetween(@Param("startDate") Instant startDate, @Param("endDate") Instant endDate);

    @Query("SELECT COUNT(c.id) FROM AffiliateClickEntity c WHERE c.createdAt >= :since")
    long countClicksSince(@Param("since") Instant since);

    @Query(value = "SELECT COALESCE(NULLIF(TRIM(utm_source), ''), 'direct') AS source_key, " +
                   "COUNT(id) AS total_clicks, " +
                   "SUM(CASE WHEN created_at >= :since30d THEN 1 ELSE 0 END) AS clicks_30d " +
                   "FROM affiliate_clicks " +
                   "GROUP BY source_key " +
                   "ORDER BY total_clicks DESC", nativeQuery = true)
    List<Object[]> summarizeClicksBySource(@Param("since30d") Instant since30d);

    @Query(value = "SELECT TRIM(utm_campaign) AS article_slug, " +
                   "COUNT(id) AS total_clicks, " +
                   "SUM(CASE WHEN created_at >= :since30d THEN 1 ELSE 0 END) AS clicks_30d " +
                   "FROM affiliate_clicks " +
                   "WHERE utm_source = 'review_article' AND utm_campaign IS NOT NULL AND TRIM(utm_campaign) <> '' " +
                   "GROUP BY TRIM(utm_campaign) " +
                   "ORDER BY total_clicks DESC " +
                   "LIMIT 8", nativeQuery = true)
    List<Object[]> findTopConvertingArticleSlugs(@Param("since30d") Instant since30d);

    @Query(value = "SELECT TRIM(utm_content) AS subid_key, " +
                   "COALESCE(NULLIF(TRIM(utm_source), ''), 'direct') AS source_key, " +
                   "COUNT(id) AS total_clicks, " +
                   "SUM(CASE WHEN created_at >= :since30d THEN 1 ELSE 0 END) AS clicks_30d " +
                   "FROM affiliate_clicks " +
                   "WHERE utm_content IS NOT NULL AND TRIM(utm_content) <> '' " +
                   "GROUP BY TRIM(utm_content), source_key " +
                   "ORDER BY total_clicks DESC " +
                   "LIMIT 8", nativeQuery = true)
    List<Object[]> findTopSubIds(@Param("since30d") Instant since30d);
}

