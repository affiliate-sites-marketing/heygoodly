package com.heygoodly.portal.common.cache;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Lightweight, fail-open Redis cache utility built on {@link StringRedisTemplate} and Jackson {@link ObjectMapper}.
 * Supports Java records, generic collections via {@link TypeReference}, non-blocking prefix eviction via SCAN,
 * and Redis unavailability fallback to the underlying data loader.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisCacheService {

    public static final String AUTH_USER_PREFIX = "cache:auth:user:";
    public static final String SETTINGS_PUBLIC_KEY = "cache:settings:public";
    public static final String SETTINGS_ALL_KEY = "cache:settings:all";
    public static final String MENUS_PUBLIC_PREFIX = "cache:menus:public:";
    public static final String CATEGORIES_PREFIX = "cache:categories:";
    public static final String CATEGORIES_PUBLIC_PREFIX = "cache:categories:public:";
    public static final String CATEGORIES_HOME_KEY = "cache:categories:home";
    public static final String PAGES_PUBLIC_PREFIX = "cache:pages:public:";
    public static final String PAGES_PUBLIC_LIST_KEY = "cache:pages:public:list";
    public static final String PAGES_PUBLIC_SLUG_PREFIX = "cache:pages:public:slug:";
    public static final String POSTS_PUBLIC_PREFIX = "cache:posts:public:";
    public static final String POSTS_FEATURED_KEY = "cache:posts:public:featured";
    public static final String POSTS_PICKS_KEY = "cache:posts:public:picks";
    public static final String POSTS_TRENDING_TAGS_KEY = "cache:posts:public:trending-tags";
    public static final String OFFERS_PUBLIC_PREFIX = "cache:offers:public:";
    public static final String STORES_PUBLIC_PREFIX = "cache:stores:public:";
    public static final String DASHBOARD_STATS_KEY = "cache:dashboard:stats";
    public static final String POST_VIEWS_DIRTY_SET = "cache:post:views:dirty";
    public static final String POST_VIEWS_COUNT_PREFIX = "cache:post:views:count:";

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    public <T> T getOrLoad(String key, Class<T> type, Duration ttl, Supplier<T> loader) {
        try {
            String raw = stringRedisTemplate.opsForValue().get(key);
            if (raw != null) {
                return objectMapper.readValue(raw, type);
            }
        } catch (Exception ex) {
            log.warn("Redis cache read failed for key [{}]: {}", key, ex.getMessage());
        }

        T loaded = loader.get();
        writeQuietly(key, loaded, ttl);
        return loaded;
    }

    public <T> T getOrLoad(String key, TypeReference<T> typeRef, Duration ttl, Supplier<T> loader) {
        try {
            String raw = stringRedisTemplate.opsForValue().get(key);
            if (raw != null) {
                return objectMapper.readValue(raw, typeRef);
            }
        } catch (Exception ex) {
            log.warn("Redis cache read failed for key [{}]: {}", key, ex.getMessage());
        }

        T loaded = loader.get();
        writeQuietly(key, loaded, ttl);
        return loaded;
    }

    public void evict(String... keys) {
        if (keys == null || keys.length == 0) {
            return;
        }
        try {
            stringRedisTemplate.delete(List.of(keys));
        } catch (Exception ex) {
            log.warn("Redis cache evict failed: {}", ex.getMessage());
        }
    }

    public void evictByPrefix(String prefix) {
        if (prefix == null || prefix.isEmpty()) {
            return;
        }
        try {
            List<String> keysToDelete = new ArrayList<>();
            ScanOptions options = ScanOptions.scanOptions()
                    .match(prefix + "*")
                    .count(200)
                    .build();

            stringRedisTemplate.execute((RedisCallback<Void>) connection -> {
                try (Cursor<byte[]> cursor = connection.keyCommands().scan(options)) {
                    while (cursor.hasNext()) {
                        keysToDelete.add(new String(cursor.next(), StandardCharsets.UTF_8));
                    }
                }
                return null;
            });

            if (!keysToDelete.isEmpty()) {
                stringRedisTemplate.delete(keysToDelete);
            }
        } catch (Exception ex) {
            log.warn("Redis cache prefix evict failed for [{}]: {}", prefix, ex.getMessage());
        }
    }

    public boolean incrementPostView(Long postId) {
        if (postId == null) {
            return false;
        }
        try {
            String key = POST_VIEWS_COUNT_PREFIX + postId;
            stringRedisTemplate.opsForValue().increment(key);
            stringRedisTemplate.opsForSet().add(POST_VIEWS_DIRTY_SET, String.valueOf(postId));
            return true;
        } catch (Exception ex) {
            log.warn("Redis post view increment failed for postId [{}]: {}", postId, ex.getMessage());
            return false;
        }
    }

    public Map<Long, Long> drainPendingPostViews() {
        Map<Long, Long> deltas = new HashMap<>();
        try {
            while (true) {
                List<String> batch = stringRedisTemplate.opsForSet().pop(POST_VIEWS_DIRTY_SET, 200);
                if (batch == null || batch.isEmpty()) {
                    break;
                }
                for (String idStr : batch) {
                    try {
                        Long postId = Long.parseLong(idStr);
                        String rawCount = stringRedisTemplate.opsForValue().getAndDelete(POST_VIEWS_COUNT_PREFIX + postId);
                        if (rawCount != null) {
                            long count = Long.parseLong(rawCount);
                            if (count > 0) {
                                deltas.merge(postId, count, Long::sum);
                            }
                        }
                    } catch (NumberFormatException ignored) {
                    }
                }
                if (batch.size() < 200) {
                    break;
                }
            }
        } catch (Exception ex) {
            log.warn("Redis drain pending post views failed: {}", ex.getMessage());
        }
        return deltas;
    }

    private void writeQuietly(String key, Object value, Duration ttl) {
        if (value == null) {
            return;
        }
        try {
            String serialized = objectMapper.writeValueAsString(value);
            stringRedisTemplate.opsForValue().set(key, serialized, ttl);
        } catch (Exception ex) {
            log.warn("Redis cache write failed for key [{}]: {}", key, ex.getMessage());
        }
    }
}
