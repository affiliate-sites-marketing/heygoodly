package com.heygoodly.portal.modules.post.task;

import com.heygoodly.portal.common.cache.RedisCacheService;
import com.heygoodly.portal.modules.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Periodically flushes buffered post view increments from Redis to PostgreSQL
 * to prevent write-lock contention on hot article reads.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PostViewSyncTask {

    private final RedisCacheService redisCacheService;
    private final PostRepository postRepository;

    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void flushPostViews() {
        Map<Long, Long> deltas = redisCacheService.drainPendingPostViews();
        if (deltas.isEmpty()) {
            return;
        }
        int synced = 0;
        for (Map.Entry<Long, Long> entry : deltas.entrySet()) {
            if (entry.getKey() != null && entry.getValue() != null && entry.getValue() > 0) {
                postRepository.addViewCount(entry.getKey(), entry.getValue());
                synced++;
            }
        }
        if (synced > 0) {
            log.debug("Flushed pending view counts for {} post(s) to PostgreSQL", synced);
        }
    }
}
