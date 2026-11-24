package com.heygoodly.portal.modules.ai.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.heygoodly.portal.common.cache.RedisCacheService;
import com.heygoodly.portal.common.constant.AppConstants;
import com.heygoodly.portal.common.constant.EntityFieldConstants;
import com.heygoodly.portal.common.exception.BadRequestException;
import com.heygoodly.portal.common.i18n.service.I18nService;
import com.heygoodly.portal.common.util.NullSafeUtils;
import com.heygoodly.portal.common.util.SlugUtils;
import com.heygoodly.portal.modules.ai.constant.AiConstants;
import com.heygoodly.portal.modules.ai.dto.request.AiChatRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiChatSessionUpdateRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiGeneratePostRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiProviderConfigRequest;
import com.heygoodly.portal.modules.ai.dto.request.AiTestConnectionRequest;
import com.heygoodly.portal.modules.ai.dto.response.AiAutoRunResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiChatResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiGeneratedPostResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiProviderConfigResponse;
import com.heygoodly.portal.modules.ai.dto.response.AiTestConnectionResponse;
import com.heygoodly.portal.modules.ai.entity.AiChatMessageEntity;
import com.heygoodly.portal.modules.ai.entity.AiChatSessionEntity;
import com.heygoodly.portal.modules.ai.entity.AiProviderConfigEntity;
import com.heygoodly.portal.modules.ai.repository.AiChatMessageRepository;
import com.heygoodly.portal.modules.ai.repository.AiChatSessionRepository;
import com.heygoodly.portal.modules.ai.repository.AiProviderConfigRepository;
import com.heygoodly.portal.modules.ai.service.AiWriterService;
import com.heygoodly.portal.modules.ai.service.CmsAiTools;
import com.heygoodly.portal.modules.audit.service.AuditLogService;
import com.heygoodly.portal.modules.category.entity.CategoryEntity;
import com.heygoodly.portal.modules.category.repository.CategoryRepository;
import com.heygoodly.portal.modules.media.entity.MediaItemEntity;
import com.heygoodly.portal.modules.media.repository.MediaItemRepository;
import com.heygoodly.portal.modules.offer.entity.OfferEntity;
import com.heygoodly.portal.modules.offer.repository.OfferRepository;
import com.heygoodly.portal.modules.post.entity.PostEntity;
import com.heygoodly.portal.modules.post.repository.PostRepository;
import com.heygoodly.portal.modules.setting.service.SettingService;
import com.heygoodly.portal.modules.store.entity.StoreEntity;
import com.heygoodly.portal.modules.store.repository.StoreRepository;
import com.heygoodly.portal.modules.tag.service.TagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiWriterServiceImpl implements AiWriterService {

    private final SettingService settingService;
    private final AiProviderConfigRepository aiConfigRepository;
    private final AiChatSessionRepository aiChatSessionRepository;
    private final AiChatMessageRepository aiChatMessageRepository;
    private final StoreRepository storeRepository;
    private final OfferRepository offerRepository;
    private final CategoryRepository categoryRepository;
    private final MediaItemRepository mediaItemRepository;
    private final PostRepository postRepository;
    private final TagService tagService;
    private final RedisCacheService redisCacheService;
    private final AuditLogService auditLogService;
    private final I18nService i18nService;
    private final ObjectMapper objectMapper;
    private final ChatModel defaultChatModel;
    private final CmsAiTools cmsAiTools;

    @Value("${spring.ai.openai.api-key:not-configured}")
    private String serverApiKey;

    @Value("${spring.ai.openai.base-url:https://openrouter.ai/api}")
    private String serverBaseUrl;

    @Value("${spring.ai.openai.chat.options.model:openrouter/free}")
    private String serverDefaultModel;

    @Value("${app.site-url:http://localhost:3000}")
    private String appSiteUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    private final AtomicReference<LocalDate> autoRunDate = new AtomicReference<>(LocalDate.now(ZoneOffset.UTC));
    private final AtomicInteger autoRunCountToday = new AtomicInteger(0);
    private final java.util.concurrent.ConcurrentHashMap<String, CachedModelList> modelCache = new java.util.concurrent.ConcurrentHashMap<>();

    private record CachedModelList(Instant fetchedAt, List<Map<String, Object>> models) {}
    private record ProviderConfig(String provider, String apiKey, String model, String endpointUrl) {}
    private record LlmCallResult(String text, String provider, String model) {}
    private record RssEntry(String title, String link, String description) {}

    private boolean isServerKeyConfigured() {
        return StringUtils.hasText(serverApiKey) && !"not-configured".equalsIgnoreCase(serverApiKey.trim());
    }

    @Override
    public Map<String, Object> getStatus() {
        Optional<AiProviderConfigEntity> activeDbConfig = findActiveDbConfig(null);
        Map<String, Object> status = new LinkedHashMap<>();
        if (activeDbConfig.isPresent()) {
            AiProviderConfigEntity cfg = activeDbConfig.get();
            status.put("ready", true);
            status.put("serverConfigured", isServerKeyConfigured());
            status.put("source", "db-config");
            status.put("configId", cfg.getId());
            status.put("configName", cfg.getName());
            status.put("provider", cfg.getProvider());
            status.put("model", cfg.getModel());
            return status;
        }

        Map<String, String> settings = safeSettings();
        boolean adminKeySet = StringUtils.hasText(settings.get("ai_api_key"));
        boolean serverReady = isServerKeyConfigured();
        String activeModel = adminKeySet
                ? firstNonBlank(settings.get("ai_model"), defaultModelFor(settings.get("ai_provider")))
                : firstNonBlank(settings.get("ai_model"), serverDefaultModel, "openrouter/free");
        String activeProvider = adminKeySet
                ? firstNonBlank(settings.get("ai_provider"), "openrouter")
                : detectProviderFromUrl(serverBaseUrl);

        status.put("ready", serverReady || adminKeySet);
        status.put("serverConfigured", serverReady);
        status.put("source", adminKeySet ? "admin-override" : (serverReady ? "spring-ai-server" : "unconfigured"));
        status.put("provider", activeProvider);
        status.put("model", activeModel);
        return status;
    }

    @Override
    public List<AiProviderConfigResponse> listConfigs() {
        return aiConfigRepository.findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc()
                .stream()
                .map(this::toConfigResponse)
                .toList();
    }

    @Override
    @Transactional
    public AiProviderConfigResponse createConfig(AiProviderConfigRequest request) {
        if (request == null || !StringUtils.hasText(request.getProvider()) || !StringUtils.hasText(request.getModel())) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_CONFIG_PROVIDER_MODEL_REQUIRED));
        }
        String provider = NullSafeUtils.safeLowerTrim(request.getProvider());
        String apiKey = NullSafeUtils.safeTrim(request.getApiKey());
        if (!AiConstants.PROVIDER_OLLAMA.equalsIgnoreCase(provider) && !StringUtils.hasText(apiKey)) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_CONFIG_API_KEY_REQUIRED));
        }
        String name = firstNonBlank(request.getName(), provider.toUpperCase(Locale.ROOT) + " — " + request.getModel().trim());

        List<AiProviderConfigEntity> existing = aiConfigRepository.findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc();
        boolean makeDefault = Boolean.TRUE.equals(request.getIsDefault()) || existing.isEmpty();
        boolean makeFallback = Boolean.TRUE.equals(request.getIsFallback()) && !makeDefault;

        if (makeDefault) {
            clearDefaultFlag(existing);
        }
        if (makeFallback) {
            clearFallbackFlag(existing);
        }

        AiProviderConfigEntity entity = AiProviderConfigEntity.builder()
                .name(truncate(name, 150))
                .provider(provider)
                .apiKey(StringUtils.hasText(apiKey) ? apiKey : null)
                .baseUrl(StringUtils.hasText(request.getBaseUrl()) ? request.getBaseUrl().trim() : null)
                .model(truncate(request.getModel().trim(), 200))
                .isDefault(makeDefault)
                .isFallback(makeFallback)
                .isActive(request.getIsActive() == null || Boolean.TRUE.equals(request.getIsActive()))
                .build();
        AiProviderConfigEntity saved = aiConfigRepository.save(entity);
        auditLogService.recordAction("CREATE", AiConstants.AUDIT_MODULE_AI_CONFIGS, String.valueOf(saved.getId()), saved.getName(), null);
        return toConfigResponse(saved);
    }

    @Override
    @Transactional
    public AiProviderConfigResponse updateConfig(Long id, AiProviderConfigRequest request) {
        AiProviderConfigEntity entity = aiConfigRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CONFIG_NOT_FOUND)));

        if (StringUtils.hasText(request.getName())) {
            entity.setName(truncate(request.getName().trim(), 150));
        }
        if (StringUtils.hasText(request.getProvider())) {
            entity.setProvider(NullSafeUtils.safeLowerTrim(request.getProvider()));
        }
        if (StringUtils.hasText(request.getApiKey())) {
            entity.setApiKey(request.getApiKey().trim());
        }
        if (request.getBaseUrl() != null) {
            entity.setBaseUrl(StringUtils.hasText(request.getBaseUrl()) ? request.getBaseUrl().trim() : null);
        }
        if (StringUtils.hasText(request.getModel())) {
            entity.setModel(truncate(request.getModel().trim(), 200));
        }
        if (request.getIsActive() != null) {
            entity.setIsActive(request.getIsActive());
        }
        if (Boolean.TRUE.equals(request.getIsDefault())) {
            clearDefaultFlag(aiConfigRepository.findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc());
            entity.setIsDefault(true);
            entity.setIsFallback(false);
        } else if (Boolean.TRUE.equals(request.getIsFallback())) {
            clearFallbackFlag(aiConfigRepository.findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc());
            entity.setIsFallback(true);
            entity.setIsDefault(false);
        }

        AiProviderConfigEntity saved = aiConfigRepository.save(entity);
        auditLogService.recordAction("UPDATE", AiConstants.AUDIT_MODULE_AI_CONFIGS, String.valueOf(saved.getId()), saved.getName(), null);
        return toConfigResponse(saved);
    }

    @Override
    @Transactional
    public AiProviderConfigResponse setDefaultConfig(Long id) {
        AiProviderConfigEntity target = aiConfigRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CONFIG_NOT_FOUND)));
        clearDefaultFlag(aiConfigRepository.findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc());
        target.setIsDefault(true);
        target.setIsFallback(false);
        target.setIsActive(true);
        AiProviderConfigEntity saved = aiConfigRepository.save(target);
        auditLogService.recordAction(AiConstants.AUDIT_ACTION_SET_DEFAULT, AiConstants.AUDIT_MODULE_AI_CONFIGS, String.valueOf(saved.getId()), saved.getName(), null);
        return toConfigResponse(saved);
    }

    @Override
    @Transactional
    public AiProviderConfigResponse toggleFallbackConfig(Long id) {
        AiProviderConfigEntity target = aiConfigRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CONFIG_NOT_FOUND)));
        boolean next = !Boolean.TRUE.equals(target.getIsFallback());
        if (next) {
            clearFallbackFlag(aiConfigRepository.findByIsDeletedFalseOrderByIsDefaultDescIsFallbackDescIdAsc());
            target.setIsFallback(true);
            target.setIsActive(true);
        } else {
            target.setIsFallback(false);
        }
        AiProviderConfigEntity saved = aiConfigRepository.save(target);
        return toConfigResponse(saved);
    }

    @Override
    @Transactional
    public void deleteConfig(Long id) {
        AiProviderConfigEntity target = aiConfigRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CONFIG_NOT_FOUND)));
        boolean wasDefault = Boolean.TRUE.equals(target.getIsDefault());
        target.setIsDeleted(true);
        target.setIsDefault(false);
        target.setIsFallback(false);
        aiConfigRepository.save(target);
        if (wasDefault) {
            aiConfigRepository.findFirstByIsActiveTrueAndIsDeletedFalseOrderByIdAsc().ifPresent(next -> {
                next.setIsDefault(true);
                aiConfigRepository.save(next);
            });
        }
        auditLogService.recordAction("DELETE", AiConstants.AUDIT_MODULE_AI_CONFIGS, String.valueOf(target.getId()), target.getName(), null);
    }

    private void clearDefaultFlag(List<AiProviderConfigEntity> all) {
        for (AiProviderConfigEntity c : all) {
            if (Boolean.TRUE.equals(c.getIsDefault())) {
                c.setIsDefault(false);
                aiConfigRepository.save(c);
            }
        }
    }

    private void clearFallbackFlag(List<AiProviderConfigEntity> all) {
        for (AiProviderConfigEntity c : all) {
            if (Boolean.TRUE.equals(c.getIsFallback())) {
                c.setIsFallback(false);
                aiConfigRepository.save(c);
            }
        }
    }

    private Optional<AiProviderConfigEntity> findActiveDbConfig(Long configId) {
        if (configId != null) {
            return aiConfigRepository.findByIdAndIsDeletedFalse(configId);
        }
        return aiConfigRepository.findFirstByIsDefaultTrueAndIsActiveTrueAndIsDeletedFalseOrderByIdAsc()
                .or(aiConfigRepository::findFirstByIsActiveTrueAndIsDeletedFalseOrderByIdAsc);
    }

    private AiProviderConfigResponse toConfigResponse(AiProviderConfigEntity e) {
        String rawKey = NullSafeUtils.safeTrim(e.getApiKey());
        boolean hasKey = StringUtils.hasText(rawKey);
        String masked = "";
        if (hasKey) {
            masked = rawKey.length() <= 10
                    ? "••••" + rawKey.substring(Math.max(0, rawKey.length() - 3))
                    : rawKey.substring(0, 6) + "••••" + rawKey.substring(rawKey.length() - 4);
        }
        return AiProviderConfigResponse.builder()
                .id(e.getId())
                .name(e.getName())
                .provider(e.getProvider())
                .hasApiKey(hasKey)
                .maskedApiKey(masked)
                .baseUrl(e.getBaseUrl())
                .model(e.getModel())
                .isDefault(Boolean.TRUE.equals(e.getIsDefault()))
                .isFallback(Boolean.TRUE.equals(e.getIsFallback()))
                .isActive(Boolean.TRUE.equals(e.getIsActive()))
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    @Override
    public List<Map<String, Object>> listAvailableModels(AiTestConnectionRequest request, boolean refresh) {
        Map<String, String> settings = safeSettings();
        String reqProvider = request != null ? NullSafeUtils.safeLowerTrim(request.getProvider()) : "";
        String reqKey = request != null ? NullSafeUtils.safeTrim(request.getApiKey()) : "";
        String reqBaseUrl = request != null ? NullSafeUtils.safeTrim(request.getBaseUrl()) : "";

        // Support resolving provider/key/baseUrl directly from a saved DB configId (used by AI Chat & Settings)
        if (request != null && request.getConfigId() != null) {
            Optional<AiProviderConfigEntity> savedOpt = aiConfigRepository.findByIdAndIsDeletedFalse(request.getConfigId());
            if (savedOpt.isPresent()) {
                AiProviderConfigEntity saved = savedOpt.get();
                if (!StringUtils.hasText(reqProvider)) reqProvider = NullSafeUtils.safeLowerTrim(saved.getProvider());
                if (!StringUtils.hasText(reqKey)) reqKey = NullSafeUtils.safeTrim(saved.getApiKey());
                if (!StringUtils.hasText(reqBaseUrl)) reqBaseUrl = NullSafeUtils.safeTrim(saved.getBaseUrl());
            }
        } else if (!StringUtils.hasText(reqProvider) && !StringUtils.hasText(reqKey) && !StringUtils.hasText(reqBaseUrl)) {
            Optional<AiProviderConfigEntity> activeDb = findActiveDbConfig(null);
            if (activeDb.isPresent()) {
                AiProviderConfigEntity saved = activeDb.get();
                reqProvider = NullSafeUtils.safeLowerTrim(saved.getProvider());
                reqKey = NullSafeUtils.safeTrim(saved.getApiKey());
                reqBaseUrl = NullSafeUtils.safeTrim(saved.getBaseUrl());
            }
        }

        boolean adminKeySet = StringUtils.hasText(settings.get("ai_api_key"));
        boolean hasOverride = StringUtils.hasText(reqProvider) || StringUtils.hasText(reqKey) || StringUtils.hasText(reqBaseUrl);

        String provider = StringUtils.hasText(reqProvider)
                ? reqProvider
                : (adminKeySet
                        ? firstNonBlank(NullSafeUtils.safeLowerTrim(settings.get("ai_provider")), "openrouter")
                        : detectProviderFromUrl(serverBaseUrl));
        String apiKey = StringUtils.hasText(reqKey)
                ? reqKey
                : (adminKeySet && !hasOverride
                        ? settings.get("ai_api_key").trim()
                        : (isServerKeyConfigured() && "openrouter".equalsIgnoreCase(provider)
                                ? serverApiKey.trim()
                                : NullSafeUtils.safeTrim(settings.get("ai_api_key"))));
        String baseUrl = StringUtils.hasText(reqBaseUrl)
                ? resolveSpringAiBaseUrl(provider, reqBaseUrl)
                : (hasOverride
                        ? resolveSpringAiBaseUrl(provider, "")
                        : (adminKeySet
                                ? resolveSpringAiBaseUrl(provider, NullSafeUtils.safeTrim(settings.get("ai_base_url")))
                                : serverBaseUrl));

        String cacheKey = provider + "|" + baseUrl + "|" + (StringUtils.hasText(apiKey) ? "auth" : "anon");
        if (!refresh) {
            CachedModelList cached = modelCache.get(cacheKey);
            if (cached != null && cached.fetchedAt().isAfter(Instant.now().minusSeconds(1800)) && !cached.models().isEmpty()) {
                return cached.models();
            }
        }

        List<Map<String, Object>> fetched = fetchLiveModelsFromProvider(provider, baseUrl, apiKey);
        if (fetched.isEmpty() && !"ollama".equalsIgnoreCase(provider) && !"custom".equalsIgnoreCase(provider)) {
            fetched = fetchPublicCatalogFallback(provider);
        }
        if (!fetched.isEmpty()) {
            modelCache.put(cacheKey, new CachedModelList(Instant.now(), fetched));
            return fetched;
        }
        CachedModelList stale = modelCache.get(cacheKey);
        return stale != null ? stale.models() : List.of();
    }

    /**
     * Public live catalog fallback when the user selects a direct provider (OpenAI, Claude, Gemini, Qwen, Kimi, etc.)
     * before pasting an API key, or when a provider's /v1/models requires auth.
     * 1) Tries https://models.dev/api.json (community-maintained daily-updated provider registry)
     * 2) Falls back to https://openrouter.ai/api/v1/models filtered by provider prefix
     */
    private List<Map<String, Object>> fetchPublicCatalogFallback(String provider) {
        String p = NullSafeUtils.safeLowerTrim(provider);
        // 1. Try models.dev public JSON registry
        String modelsDevKey = switch (p) {
            case "openai" -> "openai";
            case "anthropic", "claude" -> "anthropic";
            case "gemini" -> "google";
            case "qwen" -> "alibaba";
            case "kimi", "moonshot" -> "moonshotai";
            case "deepseek" -> "deepseek";
            case "xai", "grok" -> "xai";
            case "groq" -> "groq";
            case "cerebras" -> "cerebras";
            case "mistral" -> "mistral";
            default -> "";
        };

        if (StringUtils.hasText(modelsDevKey)) {
            try {
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create("https://models.dev/api.json"))
                        .timeout(Duration.ofSeconds(10))
                        .header("Accept", "application/json")
                        .GET()
                        .build();
                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (resp.statusCode() >= 200 && resp.statusCode() < 300 && StringUtils.hasText(resp.body())) {
                    JsonNode providerNode = objectMapper.readTree(resp.body()).path(modelsDevKey);
                    JsonNode modelsNode = providerNode.path("models");
                    if (modelsNode.isObject()) {
                        List<Map<String, Object>> list = new ArrayList<>();
                        modelsNode.fields().forEachRemaining(entry -> {
                            JsonNode m = entry.getValue();
                            String id = firstNonBlank(m.path("id").asText(""), entry.getKey());
                            String name = firstNonBlank(m.path("name").asText(""), id);
                            String releaseDate = m.path("release_date").asText("");
                            double inputCost = m.path("cost").path("input").asDouble(-1);
                            boolean isFree = inputCost == 0.0;
                            Map<String, Object> item = new LinkedHashMap<>();
                            item.put("id", id);
                            item.put("name", name);
                            item.put("free", isFree);
                            item.put("releaseDate", releaseDate);
                            list.add(item);
                        });
                        list.sort((a, b) -> {
                            String dA = String.valueOf(a.getOrDefault("releaseDate", ""));
                            String dB = String.valueOf(b.getOrDefault("releaseDate", ""));
                            int cmp = dB.compareTo(dA);
                            if (cmp != 0) return cmp;
                            return String.valueOf(a.get("id")).compareToIgnoreCase(String.valueOf(b.get("id")));
                        });
                        if (!list.isEmpty()) {
                            return list.size() > 150 ? list.subList(0, 150) : list;
                        }
                    }
                }
            } catch (Exception ex) {
                log.debug("models.dev public catalog fallback skipped for {}: {}", provider, ex.getMessage());
            }
        }

        // 2. Fallback: filter OpenRouter's public /api/v1/models by provider prefix
        String prefix = switch (p) {
            case "openai" -> "openai/";
            case "anthropic", "claude" -> "anthropic/";
            case "gemini" -> "google/";
            case "qwen" -> "qwen/";
            case "kimi", "moonshot" -> "moonshotai/";
            case "deepseek" -> "deepseek/";
            case "xai", "grok" -> "x-ai/";
            case "mistral" -> "mistralai/";
            default -> "";
        };
        if (StringUtils.hasText(prefix)) {
            List<Map<String, Object>> allOr = fetchLiveModelsFromProvider("openrouter", "https://openrouter.ai/api", "");
            List<Map<String, Object>> filtered = new ArrayList<>();
            for (Map<String, Object> item : allOr) {
                String rawId = String.valueOf(item.getOrDefault("id", ""));
                if (rawId.toLowerCase(Locale.ROOT).startsWith(prefix) && !rawId.endsWith(":free")) {
                    Map<String, Object> copy = new LinkedHashMap<>(item);
                    copy.put("id", rawId.substring(prefix.length()));
                    filtered.add(copy);
                }
            }
            if (!filtered.isEmpty()) {
                return filtered.size() > 120 ? filtered.subList(0, 120) : filtered;
            }
        }
        return List.of();
    }

    private List<Map<String, Object>> fetchLiveModelsFromProvider(String provider, String baseUrl, String apiKey) {
        List<Map<String, Object>> results = new ArrayList<>();
        try {
            String cleanBase = firstNonBlank(baseUrl, resolveSpringAiBaseUrl(provider, "")).replaceAll("/+$", "");
            String url;
            if ("ollama".equalsIgnoreCase(provider)) {
                url = cleanBase + "/api/tags";
            } else if ("anthropic".equalsIgnoreCase(provider) || "claude".equalsIgnoreCase(provider)) {
                url = cleanBase + "/v1/models";
            } else if (cleanBase.endsWith("/v1") || cleanBase.endsWith("/openai")) {
                url = cleanBase + "/models";
            } else {
                url = cleanBase + "/v1/models";
            }

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12))
                    .header("Accept", "application/json")
                    .GET();

            if ("anthropic".equalsIgnoreCase(provider) || "claude".equalsIgnoreCase(provider)) {
                if (StringUtils.hasText(apiKey)) {
                    reqBuilder.header("x-api-key", apiKey);
                    reqBuilder.header("anthropic-version", "2023-06-01");
                }
            } else if (!"ollama".equalsIgnoreCase(provider) && StringUtils.hasText(apiKey) && !"not-configured".equalsIgnoreCase(apiKey)) {
                reqBuilder.header("Authorization", "Bearer " + apiKey);
            }

            HttpResponse<String> resp = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300 || !StringUtils.hasText(resp.body())) {
                return results;
            }

            JsonNode root = objectMapper.readTree(resp.body());
            JsonNode arr = root.has("data") ? root.path("data") : root.path("models");
            if (!arr.isArray()) {
                return results;
            }

            if ("openrouter".equalsIgnoreCase(provider)) {
                Map<String, Object> autoFree = new LinkedHashMap<>();
                autoFree.put("id", "openrouter/free");
                autoFree.put("name", "Auto Free (Best Available Free Model)");
                autoFree.put("free", true);
                autoFree.put("created", Long.MAX_VALUE);
                results.add(autoFree);
            }

            for (JsonNode item : arr) {
                String id = firstNonBlank(item.path("id").asText(""), item.path("name").asText(""));
                if (!StringUtils.hasText(id)) continue;
                if ("ollama".equalsIgnoreCase(provider)) {
                    // Skip embedding-only models (e.g. nomic-embed-text) that cannot generate chat completions
                    String lowerId = id.toLowerCase(Locale.ROOT);
                    if (lowerId.contains("embed")) continue;
                }
                if (id.startsWith("models/")) {
                    id = id.substring("models/".length());
                }
                String displayName = firstNonBlank(item.path("name").asText(""), item.path("display_name").asText(""), id);
                boolean isFree = "ollama".equalsIgnoreCase(provider)
                        || id.endsWith(":free")
                        || "openrouter/free".equals(id)
                        || ("0".equals(item.path("pricing").path("prompt").asText("")) && "0".equals(item.path("pricing").path("completion").asText("")));
                long created = item.path("created").asLong(0L);
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", id);
                entry.put("name", displayName);
                entry.put("free", isFree);
                entry.put("created", created);
                results.add(entry);
            }

            // Sort: openrouter/free -> newest free models -> newest flagship models (by release timestamp DESC!)
            results.sort((a, b) -> {
                String idA = String.valueOf(a.get("id"));
                String idB = String.valueOf(b.get("id"));
                int scoreA = modelSortPriority(idA, Boolean.TRUE.equals(a.get("free")));
                int scoreB = modelSortPriority(idB, Boolean.TRUE.equals(b.get("free")));
                if (scoreA != scoreB) return Integer.compare(scoreA, scoreB);
                long createdA = a.get("created") instanceof Number n ? n.longValue() : 0L;
                long createdB = b.get("created") instanceof Number n ? n.longValue() : 0L;
                if (createdA != createdB) return Long.compare(createdB, createdA);
                return idA.compareToIgnoreCase(idB);
            });
            return results.size() > 300 ? results.subList(0, 300) : results;
        } catch (Exception ex) {
            log.debug("Live model discovery skipped for {}: {}", provider, ex.getMessage());
            return results;
        }
    }

    private int modelSortPriority(String id, boolean isFree) {
        String lower = id.toLowerCase(Locale.ROOT);
        if ("openrouter/free".equals(lower)) return 0;
        if (isFree) return 1;
        if (lower.startsWith("openai/") || lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3") || lower.startsWith("o4")) return 2;
        if (lower.startsWith("anthropic/") || lower.startsWith("claude")) return 3;
        if (lower.startsWith("google/") || lower.startsWith("gemini")) return 4;
        if (lower.startsWith("qwen")) return 5;
        if (lower.startsWith("moonshot") || lower.startsWith("kimi")) return 6;
        if (lower.startsWith("deepseek")) return 7;
        if (lower.startsWith("x-ai/") || lower.startsWith("grok")) return 8;
        if (lower.startsWith("meta-llama/") || lower.startsWith("llama")) return 9;
        return 10;
    }

    @Override
    public AiTestConnectionResponse testConnection(AiTestConnectionRequest request) {
        Map<String, String> settings = safeSettings();
        ProviderConfig config;
        boolean useServerDefault = false;

        if (request != null && request.getConfigId() != null) {
            AiProviderConfigEntity saved = aiConfigRepository.findByIdAndIsDeletedFalse(request.getConfigId())
                    .orElseThrow(() -> new BadRequestException("AI configuration not found: " + request.getConfigId()));
            config = new ProviderConfig(
                    saved.getProvider(),
                    NullSafeUtils.safeTrim(saved.getApiKey()),
                    firstNonBlank(request.getModel(), saved.getModel(), defaultModelFor(saved.getProvider())),
                    resolveSpringAiBaseUrl(saved.getProvider(), NullSafeUtils.safeTrim(saved.getBaseUrl()))
            );
        } else {
            String reqProvider = request != null ? NullSafeUtils.safeTrim(request.getProvider()) : "";
            String reqKey = request != null ? NullSafeUtils.safeTrim(request.getApiKey()) : "";
            Optional<AiProviderConfigEntity> activeDb = !StringUtils.hasText(reqProvider) && !StringUtils.hasText(reqKey)
                    ? findActiveDbConfig(null)
                    : Optional.empty();
            if (activeDb.isPresent()) {
                AiProviderConfigEntity saved = activeDb.get();
                config = new ProviderConfig(
                        saved.getProvider(),
                        NullSafeUtils.safeTrim(saved.getApiKey()),
                        firstNonBlank(request != null ? request.getModel() : null, saved.getModel(), defaultModelFor(saved.getProvider())),
                        resolveSpringAiBaseUrl(saved.getProvider(), NullSafeUtils.safeTrim(saved.getBaseUrl()))
                );
            } else {
                String customKey = firstNonBlank(reqKey, settings.get("ai_api_key"), "");
                useServerDefault = !StringUtils.hasText(customKey) && isServerKeyConfigured()
                        && !"ollama".equalsIgnoreCase(firstNonBlank(reqProvider, settings.get("ai_provider"), ""));
                String provider = useServerDefault
                        ? detectProviderFromUrl(serverBaseUrl)
                        : firstNonBlank(reqProvider, settings.get("ai_provider"), "openrouter");
                String model = useServerDefault
                        ? firstNonBlank(request != null ? request.getModel() : null, settings.get("ai_model"), serverDefaultModel, "openrouter/free")
                        : firstNonBlank(request != null ? request.getModel() : null, settings.get("ai_model"), defaultModelFor(provider));
                String baseUrl = useServerDefault
                        ? serverBaseUrl
                        : resolveSpringAiBaseUrl(provider, firstNonBlank(request != null ? request.getBaseUrl() : null, settings.get("ai_base_url"), ""));
                config = new ProviderConfig(provider, useServerDefault ? serverApiKey : customKey, model, baseUrl);
            }
        }
        long start = System.currentTimeMillis();
        try {
            LlmCallResult result = callViaSpringAi(
                    config,
                    useServerDefault,
                    "You are a concise health-check assistant. Reply with 'AI_READY' in plain text.",
                    "Confirm connection with AI_READY.",
                    160,
                    0.1
            );
            long elapsed = System.currentTimeMillis() - start;
            String preview = result.text() != null && result.text().length() > 140
                    ? result.text().substring(0, 140) + "..."
                    : result.text();
            return AiTestConnectionResponse.builder()
                    .success(true)
                    .provider(config.provider())
                    .model(result.model())
                    .latencyMs(elapsed)
                    .replyPreview(preview)
                    .build();
        } catch (Exception ex) {
            long elapsed = System.currentTimeMillis() - start;
            return AiTestConnectionResponse.builder()
                    .success(false)
                    .provider(config.provider())
                    .model(config.model())
                    .latencyMs(elapsed)
                    .error(ex.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public AiChatResponse chat(AiChatRequest request) {
        PreparedChatTurn turn = prepareChatTurn(request, resolveCurrentUserEmail());
        long start = System.currentTimeMillis();
        LlmCallResult result = executeMultiTurnWithFallback(turn);
        long latencyMs = System.currentTimeMillis() - start;
        return persistChatTurnAndBuildResponse(turn, result, latencyMs);
    }

    @Override
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamChat(AiChatRequest request) {
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter =
                new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(180_000L);
        String userEmail = resolveCurrentUserEmail();

        Thread.startVirtualThread(() -> {
            try {
                PreparedChatTurn turn = prepareChatTurn(request, userEmail);
                long start = System.currentTimeMillis();

                // Anthropic direct or fallback-safe path: call non-streaming & emit chunks smoothly
                if (AiConstants.PROVIDER_ANTHROPIC.equalsIgnoreCase(turn.primary().provider())
                        || AiConstants.PROVIDER_CLAUDE.equalsIgnoreCase(turn.primary().provider())) {
                    LlmCallResult res = executeMultiTurnWithFallback(turn);
                    String full = res.text();
                    int step = 24;
                    for (int i = 0; i < full.length(); i += step) {
                        String piece = full.substring(i, Math.min(full.length(), i + step));
                        emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                                .name(AiConstants.SSE_EVENT_CHUNK)
                                .data(Map.of("content", piece)));
                    }
                    AiChatResponse done = persistChatTurnAndBuildResponse(turn, res, System.currentTimeMillis() - start);
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name(AiConstants.SSE_EVENT_DONE)
                            .data(done));
                    emitter.complete();
                    return;
                }

                // True real-time token streaming via Spring AI OpenAiChatModel.stream(...)
                OpenAiChatOptions options = OpenAiChatOptions.builder()
                        .model(turn.primary().model())
                        .temperature(0.7)
                        .maxTokens(3000)
                        .build();

                OpenAiChatModel streamModel = buildStreamingOpenAiModel(turn.primary(), options);
                List<Message> springMessages = buildSpringMessages(turn.systemPrompt(), turn.contextMessages(), turn.imageDataUrl());
                StringBuilder accumulated = new StringBuilder();
                final String[] resolvedModelRef = { turn.primary().model() };
                final Integer[] promptTokRef = { null };
                final Integer[] completionTokRef = { null };
                boolean toolsEnabled = !Boolean.FALSE.equals(turn.request().getEnableTools());

                java.util.function.Consumer<ChatResponse> onChunk = resp -> {
                    try {
                        if (resp.getMetadata() != null) {
                            if (StringUtils.hasText(resp.getMetadata().getModel())) {
                                resolvedModelRef[0] = resp.getMetadata().getModel();
                            }
                            if (resp.getMetadata().getUsage() != null) {
                                Integer pt = resp.getMetadata().getUsage().getPromptTokens();
                                Integer ct = resp.getMetadata().getUsage().getCompletionTokens();
                                if (pt != null && pt > 0) promptTokRef[0] = pt;
                                if (ct != null && ct > 0) completionTokRef[0] = ct;
                            }
                        }
                        if (resp.getResult() != null && resp.getResult().getOutput() != null) {
                            String delta = resp.getResult().getOutput().getText();
                            if (delta != null && !delta.isEmpty()) {
                                accumulated.append(delta);
                                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                                        .name(AiConstants.SSE_EVENT_CHUNK)
                                        .data(Map.of("content", delta)));
                            }
                        }
                    } catch (Exception sendEx) {
                        throw new RuntimeException(sendEx);
                    }
                };

                if (toolsEnabled) {
                    try {
                        ChatClient.create(streamModel)
                                .prompt()
                                .messages(springMessages)
                                .options(options)
                                .tools(cmsAiTools)
                                .stream()
                                .chatResponse()
                                .doOnNext(onChunk)
                                .blockLast();
                    } catch (Exception toolEx) {
                        if (accumulated.length() == 0) {
                            log.warn("Model '{}' streaming with CMS tools failed ({}); retrying without tools.", turn.primary().model(), toolEx.getMessage());
                            streamModel.stream(new Prompt(springMessages, options))
                                    .doOnNext(onChunk)
                                    .blockLast();
                        } else {
                            throw toolEx;
                        }
                    }
                } else {
                    streamModel.stream(new Prompt(springMessages, options))
                            .doOnNext(onChunk)
                            .blockLast();
                }

                String finalReply = accumulated.toString().trim();
                if (!StringUtils.hasText(finalReply)) {
                    // Fallback to standard call if provider returned empty stream
                    LlmCallResult fallbackRes = executeMultiTurnWithFallback(turn);
                    finalReply = fallbackRes.text();
                    resolvedModelRef[0] = fallbackRes.model();
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name(AiConstants.SSE_EVENT_CHUNK)
                            .data(Map.of("content", finalReply)));
                }

                int estPrompt = promptTokRef[0] != null ? promptTokRef[0] : estimateTokens(turn.systemPrompt(), turn.contextMessages());
                int estCompletion = completionTokRef[0] != null ? completionTokRef[0] : Math.max(1, finalReply.length() / 4);
                LlmCallResult finalRes = new LlmCallResult(finalReply, turn.primary().provider(), resolvedModelRef[0]);
                AiChatResponse done = persistChatTurnAndBuildResponse(
                        turn, finalRes, System.currentTimeMillis() - start, estPrompt, estCompletion
                );
                emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                        .name(AiConstants.SSE_EVENT_DONE)
                        .data(done));
                emitter.complete();
            } catch (Exception ex) {
                try {
                    emitter.send(org.springframework.web.servlet.mvc.method.annotation.SseEmitter.event()
                            .name(AiConstants.SSE_EVENT_ERROR)
                            .data(Map.of("error", firstNonBlank(ex.getMessage(), i18nService.getMessage(AiConstants.I18N_CHAT_FAILED)))));
                } catch (Exception ignored) {}
                emitter.complete();
            }
        });
        return emitter;
    }

    private record PreparedChatTurn(
            String userEmail,
            AiChatRequest request,
            AiChatSessionEntity session,
            String persona,
            String systemPrompt,
            String latestUserPrompt,
            String displayUserContent,
            String imageDataUrl,
            List<AiChatRequest.ChatMessage> contextMessages,
            ProviderConfig primary,
            boolean useServerDefault,
            Long resolvedConfigId,
            Map<String, String> settings
    ) {}

    private PreparedChatTurn prepareChatTurn(AiChatRequest request, String userEmail) {
        if (request == null) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_CHAT_EMPTY_REQUEST));
        }
        Map<String, String> settings = safeSettings();
        String siteName = firstNonBlank(settings.get(AiConstants.SETTING_SITE_NAME), AppConstants.APP_NAME);

        // Extract latest user message
        String latestUserPrompt = NullSafeUtils.safeTrim(request.getMessage());
        if (!StringUtils.hasText(latestUserPrompt) && request.getMessages() != null) {
            for (int i = request.getMessages().size() - 1; i >= 0; i--) {
                AiChatRequest.ChatMessage m = request.getMessages().get(i);
                if (m != null && AiConstants.ROLE_USER.equalsIgnoreCase(m.getRole()) && StringUtils.hasText(m.getContent())) {
                    latestUserPrompt = m.getContent().trim();
                    break;
                }
            }
        }

        // Load existing session & authoritative DB context memory
        AiChatSessionEntity session = null;
        List<AiChatRequest.ChatMessage> contextMessages = new ArrayList<>();
        if (request.getSessionId() != null) {
            session = aiChatSessionRepository
                    .findByIdAndUserEmailAndIsDeletedFalse(request.getSessionId(), userEmail)
                    .orElse(null);
            if (session != null) {
                if (request.getEditFromMessageId() != null) {
                    List<AiChatMessageEntity> toRemove = aiChatMessageRepository.findBySessionIdOrderByIdAsc(session.getId())
                            .stream()
                            .filter(m -> m.getId() != null && m.getId() >= request.getEditFromMessageId())
                            .toList();
                    if (!toRemove.isEmpty()) {
                        aiChatMessageRepository.deleteAll(toRemove);
                    }
                }
                List<AiChatMessageEntity> dbHistory = aiChatMessageRepository.findBySessionIdOrderByIdAsc(session.getId());
                if (Boolean.TRUE.equals(request.getRegenerate()) && !dbHistory.isEmpty()) {
                    AiChatMessageEntity last = dbHistory.get(dbHistory.size() - 1);
                    if (AiConstants.ROLE_ASSISTANT.equalsIgnoreCase(last.getRole())) {
                        aiChatMessageRepository.delete(last);
                        dbHistory = dbHistory.subList(0, dbHistory.size() - 1);
                    }
                }
                for (AiChatMessageEntity row : dbHistory) {
                    if (StringUtils.hasText(row.getContent())) {
                        String role = AiConstants.ROLE_ASSISTANT.equalsIgnoreCase(row.getRole()) ? AiConstants.ROLE_ASSISTANT : AiConstants.ROLE_USER;
                        contextMessages.add(new AiChatRequest.ChatMessage(role, row.getContent()));
                    }
                }
            }
        }

        // Build enriched context (Store DB data, Reference URL, Text Attachment)
        String extraContext = buildExtraChatContext(request);
        String enrichedUserPrompt = StringUtils.hasText(extraContext)
                ? latestUserPrompt + "\n\n" + extraContext
                : latestUserPrompt;

        String displayUserContent = latestUserPrompt;
        if (StringUtils.hasText(request.getStoreSlug())) {
            displayUserContent += "\n[Store: @" + request.getStoreSlug().trim() + "]";
        }
        if (StringUtils.hasText(request.getSourceUrl())) {
            displayUserContent += "\n[URL: " + request.getSourceUrl().trim() + "]";
        }
        if (StringUtils.hasText(request.getAttachmentName())) {
            displayUserContent += "\n[File: " + request.getAttachmentName().trim() + "]";
        }

        if (session != null) {
            if (!Boolean.TRUE.equals(request.getRegenerate()) && StringUtils.hasText(enrichedUserPrompt)) {
                contextMessages.add(new AiChatRequest.ChatMessage(AiConstants.ROLE_USER, enrichedUserPrompt));
            }
        } else if (request.getMessages() != null && !request.getMessages().isEmpty()) {
            for (int i = 0; i < request.getMessages().size(); i++) {
                AiChatRequest.ChatMessage m = request.getMessages().get(i);
                if (m != null && StringUtils.hasText(m.getContent())) {
                    String role = AiConstants.ROLE_ASSISTANT.equalsIgnoreCase(m.getRole()) ? AiConstants.ROLE_ASSISTANT : AiConstants.ROLE_USER;
                    String content = (i == request.getMessages().size() - 1 && AiConstants.ROLE_USER.equals(role) && StringUtils.hasText(extraContext))
                            ? m.getContent().trim() + "\n\n" + extraContext
                            : m.getContent().trim();
                    contextMessages.add(new AiChatRequest.ChatMessage(role, content));
                }
            }
        } else if (StringUtils.hasText(enrichedUserPrompt)) {
            contextMessages.add(new AiChatRequest.ChatMessage(AiConstants.ROLE_USER, enrichedUserPrompt));
        }

        if (contextMessages.isEmpty()) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_CHAT_EMPTY_MESSAGE));
        }
        List<AiChatRequest.ChatMessage> cleanMessages = contextMessages.size() > AiConstants.MAX_CHAT_CONTEXT_TURNS
                ? contextMessages.subList(contextMessages.size() - AiConstants.MAX_CHAT_CONTEXT_TURNS, contextMessages.size())
                : contextMessages;

        String effectivePersona = firstNonBlank(request.getPersona(), session != null ? session.getPersona() : null, AiConstants.PERSONA_GENERAL);
        boolean toolsEnabled = !Boolean.FALSE.equals(request.getEnableTools());
        String effectiveSystemPrompt = resolvePersonaSystemPrompt(
                effectivePersona,
                firstNonBlank(request.getSystemPrompt(), session != null ? session.getSystemPrompt() : null),
                siteName,
                toolsEnabled
        );

        Long effectiveConfigId = request.getConfigId() != null
                ? request.getConfigId()
                : (session != null ? session.getConfigId() : null);
        String effectiveModelOverride = firstNonBlank(request.getModel(), session != null ? session.getModel() : null);

        Optional<AiProviderConfigEntity> activeDb = findActiveDbConfig(effectiveConfigId);
        ProviderConfig primary;
        boolean useServerDefault = false;
        if (activeDb.isPresent()) {
            AiProviderConfigEntity saved = activeDb.get();
            primary = new ProviderConfig(
                    saved.getProvider(),
                    NullSafeUtils.safeTrim(saved.getApiKey()),
                    firstNonBlank(effectiveModelOverride, saved.getModel(), defaultModelFor(saved.getProvider())),
                    resolveSpringAiBaseUrl(saved.getProvider(), NullSafeUtils.safeTrim(saved.getBaseUrl()))
            );
        } else {
            String adminKey = NullSafeUtils.safeTrim(settings.get(AiConstants.SETTING_AI_API_KEY));
            String adminProvider = NullSafeUtils.safeTrim(settings.get(AiConstants.SETTING_AI_PROVIDER));
            useServerDefault = !StringUtils.hasText(adminKey) && !AiConstants.PROVIDER_OLLAMA.equalsIgnoreCase(adminProvider) && isServerKeyConfigured();
            primary = useServerDefault
                    ? new ProviderConfig(
                            detectProviderFromUrl(serverBaseUrl),
                            serverApiKey,
                            firstNonBlank(effectiveModelOverride, settings.get(AiConstants.SETTING_AI_MODEL), serverDefaultModel, AiConstants.DEFAULT_OPENROUTER_MODEL),
                            serverBaseUrl
                    )
                    : new ProviderConfig(
                            firstNonBlank(adminProvider, AiConstants.PROVIDER_OPENROUTER),
                            adminKey,
                            firstNonBlank(effectiveModelOverride, settings.get(AiConstants.SETTING_AI_MODEL), defaultModelFor(adminProvider)),
                            resolveSpringAiBaseUrl(firstNonBlank(adminProvider, AiConstants.PROVIDER_OPENROUTER), NullSafeUtils.safeTrim(settings.get(AiConstants.SETTING_AI_BASE_URL)))
                    );
        }

        return new PreparedChatTurn(
                userEmail,
                request,
                session,
                effectivePersona,
                effectiveSystemPrompt,
                latestUserPrompt,
                displayUserContent,
                NullSafeUtils.safeTrim(request.getImageDataUrl()),
                cleanMessages,
                primary,
                useServerDefault,
                activeDb.map(AiProviderConfigEntity::getId).orElse(effectiveConfigId),
                settings
        );
    }

    private LlmCallResult executeMultiTurnWithFallback(PreparedChatTurn turn) {
        try {
            return callMultiTurnViaSpringAi(turn.primary(), turn.useServerDefault(), turn.systemPrompt(), turn.contextMessages(), 3000, 0.7);
        } catch (Exception primaryEx) {
            Optional<AiProviderConfigEntity> dbFallback = aiConfigRepository.findFirstByIsFallbackTrueAndIsActiveTrueAndIsDeletedFalseOrderByIdAsc();
            if (dbFallback.isPresent()) {
                AiProviderConfigEntity fb = dbFallback.get();
                ProviderConfig fallback = new ProviderConfig(
                        fb.getProvider(),
                        NullSafeUtils.safeTrim(fb.getApiKey()),
                        fb.getModel(),
                        resolveSpringAiBaseUrl(fb.getProvider(), NullSafeUtils.safeTrim(fb.getBaseUrl()))
                );
                return callMultiTurnViaSpringAi(fallback, false, turn.systemPrompt(), turn.contextMessages(), 3000, 0.7);
            }
            String fbProvider = NullSafeUtils.safeTrim(turn.settings().get(AiConstants.SETTING_AI_FALLBACK_PROVIDER));
            String fbKey = NullSafeUtils.safeTrim(turn.settings().get(AiConstants.SETTING_AI_FALLBACK_API_KEY));
            String fbModel = firstNonBlank(turn.settings().get(AiConstants.SETTING_AI_FALLBACK_MODEL), defaultModelFor(fbProvider));
            if (StringUtils.hasText(fbProvider) && (StringUtils.hasText(fbKey) || AiConstants.PROVIDER_OLLAMA.equalsIgnoreCase(fbProvider))) {
                ProviderConfig fallback = new ProviderConfig(fbProvider, fbKey, fbModel, resolveSpringAiBaseUrl(fbProvider, ""));
                return callMultiTurnViaSpringAi(fallback, false, turn.systemPrompt(), turn.contextMessages(), 3000, 0.7);
            }
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_CHAT_FAILED) + " (" + turn.primary().provider() + "): " + primaryEx.getMessage());
        }
    }

    private AiChatResponse persistChatTurnAndBuildResponse(PreparedChatTurn turn, LlmCallResult result, long latencyMs) {
        int estPrompt = estimateTokens(turn.systemPrompt(), turn.contextMessages());
        int estCompletion = Math.max(1, result.text().length() / 4);
        return persistChatTurnAndBuildResponse(turn, result, latencyMs, estPrompt, estCompletion);
    }

    private AiChatResponse persistChatTurnAndBuildResponse(
            PreparedChatTurn turn,
            LlmCallResult result,
            long latencyMs,
            int promptTokens,
            int completionTokens
    ) {
        int totalTokens = promptTokens + completionTokens;
        AiChatSessionEntity session = turn.session();
        if (session == null) {
            String rawTitle = firstNonBlank(turn.latestUserPrompt(), AiConstants.NEW_CHAT_TITLE);
            String autoTitle = rawTitle.length() > 80 ? rawTitle.substring(0, 80) + "..." : rawTitle;
            session = AiChatSessionEntity.builder()
                    .userEmail(turn.userEmail())
                    .title(autoTitle)
                    .configId(turn.resolvedConfigId())
                    .model(result.model())
                    .persona(turn.persona())
                    .systemPrompt(StringUtils.hasText(turn.request().getSystemPrompt()) ? turn.request().getSystemPrompt().trim() : null)
                    .isPinned(false)
                    .build();
            session.setCreatedBy(turn.userEmail());
            session = aiChatSessionRepository.save(session);
        } else {
            session.setConfigId(turn.resolvedConfigId());
            session.setModel(result.model());
            session.setPersona(turn.persona());
            if (StringUtils.hasText(turn.request().getSystemPrompt())) {
                session.setSystemPrompt(turn.request().getSystemPrompt().trim());
            }
            session.setUpdatedAt(Instant.now());
            session = aiChatSessionRepository.save(session);
        }

        if (!Boolean.TRUE.equals(turn.request().getRegenerate()) && StringUtils.hasText(turn.displayUserContent())) {
            aiChatMessageRepository.save(AiChatMessageEntity.builder()
                    .sessionId(session.getId())
                    .role(AiConstants.ROLE_USER)
                    .content(turn.displayUserContent())
                    .build());
        }

        AiChatMessageEntity savedReply = aiChatMessageRepository.save(AiChatMessageEntity.builder()
                .sessionId(session.getId())
                .role(AiConstants.ROLE_ASSISTANT)
                .content(result.text())
                .provider(result.provider())
                .model(result.model())
                .latencyMs(latencyMs)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(totalTokens)
                .build());

        return AiChatResponse.builder()
                .sessionId(session.getId())
                .sessionTitle(session.getTitle())
                .assistantMessageId(savedReply.getId())
                .reply(result.text())
                .provider(result.provider())
                .model(result.model())
                .persona(session.getPersona())
                .latencyMs(latencyMs)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .totalTokens(totalTokens)
                .build();
    }

    private OpenAiChatModel buildStreamingOpenAiModel(ProviderConfig config, OpenAiChatOptions options) {
        if (!AiConstants.PROVIDER_OLLAMA.equalsIgnoreCase(config.provider())
                && (!StringUtils.hasText(config.apiKey()) || AiConstants.NOT_CONFIGURED_SENTINEL.equalsIgnoreCase(config.apiKey().trim()))) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_API_KEY_NOT_CONFIGURED));
        }
        String resolvedKey = StringUtils.hasText(config.apiKey()) ? config.apiKey().trim() : AiConstants.PROVIDER_OLLAMA;
        org.springframework.http.HttpHeaders authHeaders = new org.springframework.http.HttpHeaders();
        authHeaders.setBearerAuth(resolvedKey);
        if (AiConstants.PROVIDER_OPENROUTER.equalsIgnoreCase(config.provider())) {
            authHeaders.set("HTTP-Referer", firstNonBlank(appSiteUrl, "http://localhost:3000"));
            authHeaders.set("X-Title", "AI Assistant Chat");
        }
        OpenAiApi customApi = OpenAiApi.builder()
                .baseUrl(config.endpointUrl())
                .apiKey(resolvedKey)
                .headers(authHeaders)
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(customApi)
                .defaultOptions(options)
                .build();
    }

    private List<Message> buildSpringMessages(String systemPrompt, List<AiChatRequest.ChatMessage> history, String imageDataUrl) {
        List<Message> springMessages = new ArrayList<>();
        springMessages.add(new SystemMessage(systemPrompt));
        for (int i = 0; i < history.size(); i++) {
            AiChatRequest.ChatMessage m = history.get(i);
            boolean isLastUser = (i == history.size() - 1) && AiConstants.ROLE_USER.equalsIgnoreCase(m.getRole());
            if (AiConstants.ROLE_ASSISTANT.equalsIgnoreCase(m.getRole())) {
                springMessages.add(new AssistantMessage(m.getContent()));
            } else if (isLastUser && StringUtils.hasText(imageDataUrl) && imageDataUrl.startsWith("data:image/")) {
                try {
                    int comma = imageDataUrl.indexOf(',');
                    String meta = imageDataUrl.substring(5, comma);
                    String mimeStr = meta.contains(";") ? meta.substring(0, meta.indexOf(';')) : meta;
                    byte[] bytes = java.util.Base64.getDecoder().decode(imageDataUrl.substring(comma + 1));
                    org.springframework.ai.content.Media media = new org.springframework.ai.content.Media(
                            org.springframework.util.MimeTypeUtils.parseMimeType(mimeStr),
                            new org.springframework.core.io.ByteArrayResource(bytes)
                    );
                    springMessages.add(UserMessage.builder().text(m.getContent()).media(media).build());
                } catch (Exception ignored) {
                    springMessages.add(new UserMessage(m.getContent()));
                }
            } else {
                springMessages.add(new UserMessage(m.getContent()));
            }
        }
        return springMessages;
    }

    private String buildExtraChatContext(AiChatRequest request) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(request.getStoreSlug())) {
            storeRepository.findBySlugAndIsDeletedFalse(request.getStoreSlug().trim()).ifPresent(store -> {
                List<OfferEntity> offers = offerRepository
                        .findByStoreIdAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAscCreatedAtDescIdDesc(store.getId());
                sb.append("ATTACHED STORE DATA FROM DATABASE (use accurate facts & real codes):\n");
                sb.append("- Store Name: ").append(store.getName()).append("\n");
                if (StringUtils.hasText(store.getDisplayDomain())) {
                    sb.append("- Website: ").append(store.getDisplayDomain()).append("\n");
                }
                if (store.getRatingScore() != null) {
                    sb.append("- Rating: ").append(store.getRatingScore()).append("/5.0\n");
                }
                if (StringUtils.hasText(store.getAboutStore())) {
                    sb.append("- About: ").append(truncate(stripHtml(store.getAboutStore()), 1500)).append("\n");
                }
                if (offers != null && !offers.isEmpty()) {
                    sb.append("- Active Verified Coupons/Deals:\n");
                    int count = 0;
                    for (OfferEntity o : offers) {
                        if (++count > 8) break;
                        sb.append("  * ").append(NullSafeUtils.safeTrim(o.getName()));
                        if (StringUtils.hasText(o.getCode())) sb.append(" [Code: ").append(o.getCode()).append("]");
                        sb.append("\n");
                    }
                }
                sb.append("\n");
            });
        }
        if (StringUtils.hasText(request.getSourceUrl())) {
            String crawled = fetchCleanWebText(request.getSourceUrl().trim());
            if (StringUtils.hasText(crawled)) {
                sb.append("REFERENCE WEB PAGE CONTENT (").append(request.getSourceUrl().trim()).append("):\n");
                sb.append(truncate(crawled, 5500)).append("\n\n");
            }
        }
        if (StringUtils.hasText(request.getAttachmentText())) {
            sb.append("ATTACHED FILE (").append(firstNonBlank(request.getAttachmentName(), "document.txt")).append("):\n");
            sb.append(truncate(request.getAttachmentText().trim(), 6000)).append("\n");
        }
        return sb.toString().trim();
    }

    private String resolvePersonaSystemPrompt(String persona, String customOverride, String siteName, boolean toolsEnabled) {
        String agentGuidance = toolsEnabled
                ? " You have live CMS Agent tools connected to the real PostgreSQL database (analytics summary, expiring offers, SEO audit, unreviewed stores, unread customer inquiries, creating DRAFT posts, adding store offers, and updating post SEO metadata). Whenever the user asks about live site stats, deals, SEO issues, inquiries, or requests creating a draft/offer/SEO update, invoke the appropriate tool and present the real results cleanly with Markdown tables and admin links."
                : "";
        if (StringUtils.hasText(customOverride)) {
            return customOverride.trim() + agentGuidance;
        }
        String baseRule = "Always remember prior turns in this session, respond in the user's language (Vietnamese or English), and use clean Markdown formatting." + agentGuidance;
        return switch (NullSafeUtils.safeLowerTrim(persona)) {
            case AiConstants.PERSONA_REVIEW_EDITOR ->
                    "You are a senior product review editor for " + siteName + " (Wirecutter / Consumer Reports style). "
                            + "Write objective, hands-on, structured product & brand reviews with executive verdict, pros/cons tables, buyer guidance, and FAQs. Never fabricate promo codes. " + baseRule;
            case AiConstants.PERSONA_SEO_STRATEGIST ->
                    "You are an elite Affiliate SEO & Conversion strategist for " + siteName + ". "
                            + "Optimize titles (<60 chars), meta descriptions (<155 chars), keyword clusters, internal linking, and high-CTR copy. " + baseRule;
            case AiConstants.PERSONA_NEWS_JOURNALIST ->
                    "You are a senior tech & consumer deals journalist for " + siteName + " (Reuters / The Verge style). "
                            + "Write punchy, factual newsroom stories with lead paragraphs, Key Takeaways bullets, and clear consumer impact. " + baseRule;
            case AiConstants.PERSONA_TRANSLATOR ->
                    "You are a bilingual EN <-> VI editorial translator for " + siteName + ". "
                            + "Translate naturally into fluent journalistic prose (never word-by-word) while preserving all facts, numbers, and Markdown structure. " + baseRule;
            case AiConstants.PERSONA_DEVELOPER ->
                    "You are a principal full-stack engineer (Java Spring Boot, Next.js, TypeScript, PostgreSQL). "
                            + "Provide concise, production-ready code, root-cause diagnostics, and best practices. " + baseRule;
            default ->
                    "You are a helpful, intelligent AI assistant for the " + siteName + " editorial & marketing team. " + baseRule;
        };
    }

    private int estimateTokens(String systemPrompt, List<AiChatRequest.ChatMessage> msgs) {
        int chars = systemPrompt != null ? systemPrompt.length() : 0;
        if (msgs != null) {
            for (AiChatRequest.ChatMessage m : msgs) {
                if (m != null && m.getContent() != null) chars += m.getContent().length();
            }
        }
        return Math.max(1, chars / 4);
    }

    @Override
    public List<Map<String, Object>> listChatSessions() {
        String userEmail = resolveCurrentUserEmail();
        List<AiChatSessionEntity> sessions = aiChatSessionRepository
                .findTop50ByUserEmailAndIsDeletedFalseOrderByIsPinnedDescUpdatedAtDescIdDesc(userEmail);
        List<Map<String, Object>> out = new ArrayList<>();
        for (AiChatSessionEntity s : sessions) {
            out.add(toSessionMap(s));
        }
        return out;
    }

    @Override
    @Transactional
    public Map<String, Object> updateChatSession(Long sessionId, AiChatSessionUpdateRequest request) {
        String userEmail = resolveCurrentUserEmail();
        AiChatSessionEntity session = aiChatSessionRepository
                .findByIdAndUserEmailAndIsDeletedFalse(sessionId, userEmail)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CHAT_SESSION_NOT_FOUND)));
        if (request != null) {
            if (StringUtils.hasText(request.getTitle())) {
                session.setTitle(truncate(request.getTitle().trim(), 250));
            }
            if (request.getIsPinned() != null) {
                session.setIsPinned(request.getIsPinned());
            }
            if (StringUtils.hasText(request.getPersona())) {
                session.setPersona(NullSafeUtils.safeLowerTrim(request.getPersona()));
            }
            if (request.getSystemPrompt() != null) {
                session.setSystemPrompt(StringUtils.hasText(request.getSystemPrompt()) ? request.getSystemPrompt().trim() : null);
            }
        }
        return toSessionMap(aiChatSessionRepository.save(session));
    }

    private Map<String, Object> toSessionMap(AiChatSessionEntity s) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", s.getId());
        item.put("title", s.getTitle());
        item.put("configId", s.getConfigId());
        item.put("model", s.getModel());
        item.put("isPinned", Boolean.TRUE.equals(s.getIsPinned()));
        item.put("persona", firstNonBlank(s.getPersona(), AiConstants.PERSONA_GENERAL));
        item.put("systemPrompt", s.getSystemPrompt());
        item.put("createdAt", s.getCreatedAt());
        item.put("updatedAt", s.getUpdatedAt());
        return item;
    }

    @Override
    public List<Map<String, Object>> getChatSessionMessages(Long sessionId) {
        String userEmail = resolveCurrentUserEmail();
        aiChatSessionRepository.findByIdAndUserEmailAndIsDeletedFalse(sessionId, userEmail)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CHAT_SESSION_NOT_FOUND)));
        List<AiChatMessageEntity> msgs = aiChatMessageRepository.findBySessionIdOrderByIdAsc(sessionId);
        List<Map<String, Object>> out = new ArrayList<>();
        for (AiChatMessageEntity m : msgs) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("role", m.getRole());
            item.put("content", m.getContent());
            item.put("provider", m.getProvider());
            item.put("model", m.getModel());
            item.put("latencyMs", m.getLatencyMs());
            item.put("promptTokens", m.getPromptTokens());
            item.put("completionTokens", m.getCompletionTokens());
            item.put("totalTokens", m.getTotalTokens());
            item.put("createdAt", m.getCreatedAt());
            out.add(item);
        }
        return out;
    }

    @Override
    @Transactional
    public void deleteChatSession(Long sessionId) {
        String userEmail = resolveCurrentUserEmail();
        AiChatSessionEntity session = aiChatSessionRepository
                .findByIdAndUserEmailAndIsDeletedFalse(sessionId, userEmail)
                .orElseThrow(() -> new BadRequestException(i18nService.getMessage(AiConstants.I18N_CHAT_SESSION_NOT_FOUND)));
        session.setIsDeleted(true);
        aiChatSessionRepository.save(session);
    }

    private String resolveCurrentUserEmail() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && StringUtils.hasText(auth.getName())) {
            return auth.getName().trim();
        }
        return "admin";
    }

    private LlmCallResult callMultiTurnViaSpringAi(
            ProviderConfig config,
            boolean useDefaultBean,
            String systemPrompt,
            List<AiChatRequest.ChatMessage> history,
            int maxTokens,
            double temperature
    ) {
        if (!AiConstants.PROVIDER_OLLAMA.equalsIgnoreCase(config.provider())
                && (!StringUtils.hasText(config.apiKey()) || AiConstants.NOT_CONFIGURED_SENTINEL.equalsIgnoreCase(config.apiKey().trim()))) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_API_KEY_NOT_CONFIGURED));
        }

        if ("anthropic".equalsIgnoreCase(config.provider()) || "claude".equalsIgnoreCase(config.provider())) {
            try {
                String base = StringUtils.hasText(config.endpointUrl())
                        ? config.endpointUrl().replaceAll("/+$", "")
                        : "https://api.anthropic.com";
                String url = base.endsWith("/v1/messages") ? base : base + "/v1/messages";
                List<Map<String, String>> anthropicMsgs = new ArrayList<>();
                for (AiChatRequest.ChatMessage m : history) {
                    anthropicMsgs.add(Map.of("role", m.getRole(), "content", m.getContent()));
                }
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("model", config.model());
                body.put("max_tokens", maxTokens);
                body.put("temperature", temperature);
                body.put("system", systemPrompt);
                body.put("messages", anthropicMsgs);

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(90))
                        .header("Content-Type", "application/json")
                        .header("x-api-key", config.apiKey().trim())
                        .header("anthropic-version", "2023-06-01")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                        .build();
                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
                if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                    throw new RuntimeException("Anthropic API HTTP " + resp.statusCode() + ": " + truncate(resp.body(), 240));
                }
                JsonNode root = objectMapper.readTree(resp.body());
                StringBuilder text = new StringBuilder();
                if (root.path("content").isArray()) {
                    for (JsonNode block : root.path("content")) {
                        if ("text".equals(block.path("type").asText())) {
                            text.append(block.path("text").asText(""));
                        }
                    }
                }
                return new LlmCallResult(text.toString().trim(), "anthropic", firstNonBlank(root.path("model").asText(""), config.model()));
            } catch (Exception e) {
                throw new RuntimeException(e.getMessage(), e);
            }
        }

        try {
            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .model(config.model())
                    .temperature(temperature)
                    .maxTokens(maxTokens)
                    .build();

            ChatModel activeModel;
            String resolvedKey = StringUtils.hasText(config.apiKey()) ? config.apiKey().trim() : "ollama";
            if (useDefaultBean && !"openrouter".equalsIgnoreCase(config.provider())) {
                activeModel = defaultChatModel;
            } else {
                org.springframework.http.HttpHeaders authHeaders = new org.springframework.http.HttpHeaders();
                authHeaders.setBearerAuth(resolvedKey);
                if ("openrouter".equalsIgnoreCase(config.provider())) {
                    authHeaders.set("HTTP-Referer", firstNonBlank(appSiteUrl, "http://localhost:3000"));
                    authHeaders.set("X-Title", "AI Assistant Chat");
                }
                OpenAiApi customApi = OpenAiApi.builder()
                        .baseUrl(config.endpointUrl())
                        .apiKey(resolvedKey)
                        .headers(authHeaders)
                        .build();
                activeModel = OpenAiChatModel.builder()
                        .openAiApi(customApi)
                        .defaultOptions(options)
                        .build();
            }

            List<Message> springMessages = new ArrayList<>();
            springMessages.add(new SystemMessage(systemPrompt));
            for (AiChatRequest.ChatMessage m : history) {
                if ("assistant".equalsIgnoreCase(m.getRole())) {
                    springMessages.add(new AssistantMessage(m.getContent()));
                } else {
                    springMessages.add(new UserMessage(m.getContent()));
                }
            }

            ChatResponse chatResponse;
            try {
                chatResponse = ChatClient.create(activeModel)
                        .prompt()
                        .messages(springMessages)
                        .options(options)
                        .tools(cmsAiTools)
                        .call()
                        .chatResponse();
            } catch (Exception toolEx) {
                log.warn("Model '{}' call with CMS tools failed ({}); retrying without tools.", config.model(), toolEx.getMessage());
                chatResponse = activeModel.call(new Prompt(springMessages, options));
            }
            String content = "";
            String resolvedModel = config.model();
            if (chatResponse != null) {
                if (chatResponse.getMetadata() != null && StringUtils.hasText(chatResponse.getMetadata().getModel())) {
                    resolvedModel = chatResponse.getMetadata().getModel();
                }
                if (chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null) {
                    content = NullSafeUtils.safeTrim(chatResponse.getResult().getOutput().getText());
                }
            }
            if (!StringUtils.hasText(content)) {
                throw new RuntimeException("Empty response from AI model '" + resolvedModel + "'.");
            }
            return new LlmCallResult(content, config.provider(), resolvedModel);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    @Override
    public AiGeneratedPostResponse generatePost(AiGeneratePostRequest request) {
        Map<String, String> settings = safeSettings();
        String mode = "news".equalsIgnoreCase(NullSafeUtils.safeTrim(request.getMode())) ? "news" : "review";
        String language = firstNonBlank(request.getLanguage(), settings.get("ai_default_language"), "English");
        String tone = firstNonBlank(request.getTone(), settings.get("ai_default_tone"), "Editorial & Objective");
        int wordCount = (request.getWordCount() != null && request.getWordCount() >= 400 && request.getWordCount() <= 3000)
                ? request.getWordCount()
                : 1100;
        String siteName = firstNonBlank(settings.get("site_name"), "HeyGoodly");

        StringBuilder contextBuilder = new StringBuilder();
        StoreEntity matchedStore = null;

        if ("review".equals(mode) && StringUtils.hasText(request.getStoreSlug())) {
            Optional<StoreEntity> optStore = storeRepository.findBySlugAndIsDeletedFalse(request.getStoreSlug().trim());
            if (optStore.isPresent()) {
                matchedStore = optStore.get();
                List<OfferEntity> offers = offerRepository
                        .findByStoreIdAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAscCreatedAtDescIdDesc(matchedStore.getId());
                contextBuilder.append("STORE DATA FROM DATABASE:\n");
                contextBuilder.append("- Store Name: ").append(matchedStore.getName()).append("\n");
                if (StringUtils.hasText(matchedStore.getDisplayDomain())) {
                    contextBuilder.append("- Website: ").append(matchedStore.getDisplayDomain()).append("\n");
                } else if (StringUtils.hasText(matchedStore.getAfWebsite())) {
                    contextBuilder.append("- Website: ").append(matchedStore.getAfWebsite()).append("\n");
                }
                if (matchedStore.getRatingScore() != null) {
                    contextBuilder.append("- Rating: ").append(matchedStore.getRatingScore()).append("/5.0\n");
                }
                if (StringUtils.hasText(matchedStore.getSocialDescription())) {
                    contextBuilder.append("- Summary: ").append(stripHtml(matchedStore.getSocialDescription())).append("\n");
                }
                if (StringUtils.hasText(matchedStore.getAboutStore())) {
                    contextBuilder.append("- About Store: ").append(truncate(stripHtml(matchedStore.getAboutStore()), 1800)).append("\n");
                }
                if (offers != null && !offers.isEmpty()) {
                    contextBuilder.append("- Active Verified Offers/Coupons (mention these real deals accurately):\n");
                    int count = 0;
                    for (OfferEntity o : offers) {
                        if (++count > 6) break;
                        contextBuilder.append("  * ").append(NullSafeUtils.safeTrim(o.getName()));
                        if (StringUtils.hasText(o.getCode())) {
                            contextBuilder.append(" [Code: ").append(o.getCode()).append("]");
                        }
                        if (StringUtils.hasText(o.getDescription())) {
                            contextBuilder.append(" — ").append(truncate(stripHtml(o.getDescription()), 160));
                        }
                        contextBuilder.append("\n");
                    }
                }
            }
        }

        if (StringUtils.hasText(request.getSourceUrl())) {
            String fetchedText = fetchCleanWebText(request.getSourceUrl().trim());
            if (StringUtils.hasText(fetchedText)) {
                contextBuilder.append("\nSOURCE ARTICLE REFERENCE (rewrite completely in fresh original prose; keep facts accurate, NEVER copy verbatim):\n");
                contextBuilder.append(fetchedText).append("\n");
            }
        }

        if (StringUtils.hasText(request.getTopic())) {
            contextBuilder.append("\nEDITORIAL TOPIC / ANGLE:\n").append(request.getTopic().trim()).append("\n");
        }

        if (contextBuilder.isEmpty()) {
            throw new BadRequestException(i18nService.getMessage(AiConstants.I18N_POST_CONTEXT_REQUIRED));
        }

        String systemPrompt = buildSystemPrompt(mode, language, tone, wordCount, siteName);
        String userPrompt = "Write a complete, publish-ready "
                + ("review".equals(mode) ? "in-depth product/brand review" : "editorial news article")
                + " based strictly on the context below. Return ONLY valid JSON.\n\n"
                + contextBuilder;

        LlmCallResult llmResult = callWithFallback(settings, request.getConfigId(), request.getModel(), systemPrompt, userPrompt, 4500, 0.55);
        return parseGeneratedArticle(llmResult, mode, matchedStore, request.getTopic());
    }

    @Scheduled(initialDelay = 120_000L, fixedDelayString = "${app.ai.auto-publish-interval-ms:14400000}")
    public void scheduledAutoPublishJob() {
        try {
            Map<String, String> settings = safeSettings();
            if (!"true".equalsIgnoreCase(settings.get("ai_enabled"))
                    || !"true".equalsIgnoreCase(settings.get("ai_auto_enabled"))) {
                return;
            }
            int dailyLimit = parseIntSafe(settings.get("ai_auto_daily_limit"), 3, 1, 10);
            resetDailyCounterIfNeeded();
            if (autoRunCountToday.get() >= dailyLimit) {
                log.debug("AI Auto-Publisher reached daily limit ({}/{}). Skipping cycle.", autoRunCountToday.get(), dailyLimit);
                return;
            }
            // Generate 1 article per scheduled cycle so posts are naturally spaced out across the day
            AiAutoRunResponse res = runAutoPublishNow(1);
            log.info("Scheduled AI Auto-Publisher cycle finished: generated={}, message={}", res.getGeneratedCount(), res.getMessage());
        } catch (Exception ex) {
            log.warn("Scheduled AI Auto-Publisher cycle encountered an error: {}", ex.getMessage());
        }
    }

    @Override
    @Transactional
    public AiAutoRunResponse runAutoPublishNow(int maxToCreate) {
        Map<String, String> settings = safeSettings();
        int safeMax = Math.max(1, Math.min(maxToCreate, 5));
        int dailyLimit = parseIntSafe(settings.get("ai_auto_daily_limit"), 3, 1, 10);
        String publishMode = "publish".equalsIgnoreCase(settings.get("ai_auto_mode")) ? "publish" : "draft";
        boolean includeReviews = !"false".equalsIgnoreCase(settings.get("ai_auto_include_reviews"));

        resetDailyCounterIfNeeded();
        List<String> createdTitles = new ArrayList<>();
        List<String> createdSlugs = new ArrayList<>();

        // 1. Try News from configured RSS feeds first
        List<String> feedUrls = parseFeedUrls(settings.get("ai_auto_rss_feeds"));
        for (String feedUrl : feedUrls) {
            if (createdTitles.size() >= safeMax || autoRunCountToday.get() >= dailyLimit) break;
            List<RssEntry> entries = fetchRssEntries(feedUrl);
            for (RssEntry entry : entries) {
                if (createdTitles.size() >= safeMax || autoRunCountToday.get() >= dailyLimit) break;
                String candidateSlug = SlugUtils.toSlug(entry.title());
                if (!StringUtils.hasText(candidateSlug) || postRepository.existsBySlugAndIsDeletedFalse(candidateSlug)) {
                    continue;
                }
                try {
                    AiGeneratedPostResponse generated = generatePost(AiGeneratePostRequest.builder()
                            .mode("news")
                            .sourceUrl(entry.link())
                            .topic(entry.title() + (StringUtils.hasText(entry.description()) ? "\nSummary: " + entry.description() : ""))
                            .wordCount(1000)
                            .build());
                    PostEntity saved = persistAutoGeneratedPost(generated, null, publishMode);
                    createdTitles.add(saved.getTitle());
                    createdSlugs.add(saved.getSlug());
                    autoRunCountToday.incrementAndGet();
                } catch (Exception ex) {
                    log.warn("AI Auto-Publisher failed for RSS item '{}': {}", entry.title(), ex.getMessage());
                }
            }
        }

        // 2. If still under quota and Store Reviews enabled, pick an active Store without a review post
        if (includeReviews && createdTitles.size() < safeMax && autoRunCountToday.get() < dailyLimit) {
            List<StoreEntity> activeStores = storeRepository
                    .findByIsActiveTrueAndIsDeletedFalse(PageRequest.of(0, 40))
                    .getContent();
            for (StoreEntity store : activeStores) {
                if (createdTitles.size() >= safeMax || autoRunCountToday.get() >= dailyLimit) break;
                String reviewSlugHint = SlugUtils.toSlug(store.getName() + " review");
                if (postRepository.existsBySlugAndIsDeletedFalse(reviewSlugHint)) {
                    continue;
                }
                try {
                    AiGeneratedPostResponse generated = generatePost(AiGeneratePostRequest.builder()
                            .mode("review")
                            .storeSlug(store.getSlug())
                            .topic("Comprehensive buyer's review & promo guide for " + store.getName())
                            .wordCount(1200)
                            .build());
                    PostEntity saved = persistAutoGeneratedPost(generated, store, publishMode);
                    createdTitles.add(saved.getTitle());
                    createdSlugs.add(saved.getSlug());
                    autoRunCountToday.incrementAndGet();
                } catch (Exception ex) {
                    log.warn("AI Auto-Publisher failed for Store '{}': {}", store.getName(), ex.getMessage());
                }
            }
        }

        String msg = createdTitles.isEmpty()
                ? "No new unique RSS items or unreviewed stores available right now (or daily limit reached)."
                : String.format("Successfully generated %d article(s) as %s.", createdTitles.size(), publishMode.toUpperCase(Locale.ROOT));

        return AiAutoRunResponse.builder()
                .generatedCount(createdTitles.size())
                .publishMode(publishMode)
                .createdTitles(createdTitles)
                .createdSlugs(createdSlugs)
                .message(msg)
                .build();
    }

    private PostEntity persistAutoGeneratedPost(AiGeneratedPostResponse generated, StoreEntity store, String publishMode) {
        String baseSlug = SlugUtils.toSlug(StringUtils.hasText(generated.getSlug()) ? generated.getSlug() : generated.getTitle());
        if (!StringUtils.hasText(baseSlug)) {
            baseSlug = "ai-article-" + System.currentTimeMillis();
        }
        String uniqueSlug = baseSlug;
        int suffix = 2;
        while (postRepository.existsBySlugAndIsDeletedFalse(uniqueSlug)) {
            uniqueSlug = baseSlug + "-" + (suffix++);
        }

        Long categoryId = store != null && store.getCategoryId() != null
                ? store.getCategoryId()
                : resolveFallbackCategoryId();

        boolean isPublish = "publish".equalsIgnoreCase(publishMode);
        String tagsJson = "[]";
        try {
            if (generated.getTags() != null && !generated.getTags().isEmpty()) {
                tagsJson = objectMapper.writeValueAsString(generated.getTags());
            }
        } catch (Exception ignored) {}

        PostEntity entity = PostEntity.builder()
                .title(truncate(generated.getTitle(), 250))
                .slug(uniqueSlug)
                .excerpt(generated.getExcerpt())
                .content(generated.getContentHtml())
                .categoryId(categoryId)
                .storeId(store != null ? store.getId() : null)
                .authorName("Editorial Desk")
                .authorRole("AI-Assisted Editor")
                .readTime(StringUtils.hasText(generated.getReadTime()) ? generated.getReadTime() : "5 min read")
                .status(isPublish ? "PUBLISHED" : "DRAFT")
                .isActive(isPublish)
                .isFeatured(false)
                .isHero(false)
                .sortOrder(AppConstants.DEFAULT_SORT_ORDER)
                .publishedAt(Instant.now())
                .tags(tagsJson)
                .metaTitle(truncate(generated.getMetaTitle(), 250))
                .metaDescription(generated.getMetaDescription())
                .build();
        entity.setCreatedBy("ai-auto-publisher");

        PostEntity saved = postRepository.save(entity);
        if (generated.getTags() != null && !generated.getTags().isEmpty()) {
            try {
                tagService.syncEntityTags(EntityFieldConstants.TYPE_POST, saved.getId(), generated.getTags());
            } catch (Exception ex) {
                log.warn("Failed to sync tags for AI post id={}: {}", saved.getId(), ex.getMessage());
            }
        }
        redisCacheService.evictByPrefix(RedisCacheService.POSTS_PUBLIC_PREFIX);
        redisCacheService.evict(RedisCacheService.DASHBOARD_STATS_KEY);
        auditLogService.recordAction("AI_AUTO_CREATE", "posts", String.valueOf(saved.getId()), saved.getTitle(), null);
        return saved;
    }

    private Long resolveFallbackCategoryId() {
        return categoryRepository.findBySlugAndIsDeletedFalse("other")
                .or(() -> categoryRepository.findFirstByNameIgnoreCaseAndIsDeletedFalse("Other"))
                .map(CategoryEntity::getId)
                .orElse(null);
    }

    private LlmCallResult callWithFallback(Map<String, String> settings, Long configId, String requestModelOverride, String systemPrompt, String userPrompt, int maxTokens, double temperature) {
        Optional<AiProviderConfigEntity> activeDb = findActiveDbConfig(configId);
        ProviderConfig primary;
        boolean useServerDefault = false;
        if (activeDb.isPresent()) {
            AiProviderConfigEntity saved = activeDb.get();
            primary = new ProviderConfig(
                    saved.getProvider(),
                    NullSafeUtils.safeTrim(saved.getApiKey()),
                    firstNonBlank(requestModelOverride, saved.getModel(), defaultModelFor(saved.getProvider())),
                    resolveSpringAiBaseUrl(saved.getProvider(), NullSafeUtils.safeTrim(saved.getBaseUrl()))
            );
        } else {
            String adminKey = NullSafeUtils.safeTrim(settings.get("ai_api_key"));
            String adminProvider = NullSafeUtils.safeTrim(settings.get("ai_provider"));
            useServerDefault = !StringUtils.hasText(adminKey) && !"ollama".equalsIgnoreCase(adminProvider) && isServerKeyConfigured();

            primary = useServerDefault
                    ? new ProviderConfig(
                            detectProviderFromUrl(serverBaseUrl),
                            serverApiKey,
                            firstNonBlank(requestModelOverride, settings.get("ai_model"), serverDefaultModel, "openrouter/free"),
                            serverBaseUrl
                    )
                    : new ProviderConfig(
                            firstNonBlank(adminProvider, "openrouter"),
                            adminKey,
                            firstNonBlank(requestModelOverride, settings.get("ai_model"), defaultModelFor(adminProvider)),
                            resolveSpringAiBaseUrl(firstNonBlank(adminProvider, "openrouter"), NullSafeUtils.safeTrim(settings.get("ai_base_url")))
                    );
        }

        try {
            return callViaSpringAi(primary, useServerDefault, systemPrompt, userPrompt, maxTokens, temperature);
        } catch (Exception primaryEx) {
            Optional<AiProviderConfigEntity> dbFallback = aiConfigRepository.findFirstByIsFallbackTrueAndIsActiveTrueAndIsDeletedFalseOrderByIdAsc();
            if (dbFallback.isPresent()) {
                AiProviderConfigEntity fb = dbFallback.get();
                log.warn("Primary AI config '{}' failed ({}). Falling back to DB config '{}'...", primary.provider(), primaryEx.getMessage(), fb.getName());
                ProviderConfig fallback = new ProviderConfig(
                        fb.getProvider(),
                        NullSafeUtils.safeTrim(fb.getApiKey()),
                        fb.getModel(),
                        resolveSpringAiBaseUrl(fb.getProvider(), NullSafeUtils.safeTrim(fb.getBaseUrl()))
                );
                return callViaSpringAi(fallback, false, systemPrompt, userPrompt, maxTokens, temperature);
            }
            String fbProvider = NullSafeUtils.safeTrim(settings.get("ai_fallback_provider"));
            String fbKey = NullSafeUtils.safeTrim(settings.get("ai_fallback_api_key"));
            String fbModel = firstNonBlank(settings.get("ai_fallback_model"), defaultModelFor(fbProvider));

            if (StringUtils.hasText(fbProvider) && (StringUtils.hasText(fbKey) || "ollama".equalsIgnoreCase(fbProvider))) {
                log.warn("Primary Spring AI provider '{}' failed ({}). Falling back to '{}'...", primary.provider(), primaryEx.getMessage(), fbProvider);
                ProviderConfig fallback = new ProviderConfig(fbProvider, fbKey, fbModel, resolveSpringAiBaseUrl(fbProvider, ""));
                return callViaSpringAi(fallback, false, systemPrompt, userPrompt, maxTokens, temperature);
            }
            throw new BadRequestException("Spring AI generation failed (" + primary.provider() + "): " + primaryEx.getMessage());
        }
    }

    private LlmCallResult callViaSpringAi(
            ProviderConfig config,
            boolean useDefaultBean,
            String systemPrompt,
            String userPrompt,
            int maxTokens,
            double temperature
    ) {
        if (!"ollama".equalsIgnoreCase(config.provider())
                && (!StringUtils.hasText(config.apiKey()) || "not-configured".equalsIgnoreCase(config.apiKey().trim()))) {
            throw new BadRequestException("Spring AI API Key is not configured yet. Set SPRING_AI_OPENAI_API_KEY on server or enter an override key in Admin -> Settings -> AI Writer.");
        }

        // Native Anthropic Claude direct API handler (when admin provides a direct Anthropic sk-ant-... key)
        if ("anthropic".equalsIgnoreCase(config.provider()) || "claude".equalsIgnoreCase(config.provider())) {
            return callAnthropicDirect(config, systemPrompt, userPrompt, maxTokens, temperature);
        }

        try {
            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .model(config.model())
                    .temperature(temperature)
                    .maxTokens(maxTokens)
                    .build();

            ChatModel activeModel;
            String resolvedKey = StringUtils.hasText(config.apiKey()) ? config.apiKey().trim() : "ollama";
            if (useDefaultBean && !"openrouter".equalsIgnoreCase(config.provider())) {
                activeModel = defaultChatModel;
            } else {
                org.springframework.http.HttpHeaders authHeaders = new org.springframework.http.HttpHeaders();
                authHeaders.setBearerAuth(resolvedKey);
                if ("openrouter".equalsIgnoreCase(config.provider())) {
                    authHeaders.set("HTTP-Referer", firstNonBlank(appSiteUrl, "http://localhost:3000"));
                    authHeaders.set("X-Title", "AI Editorial Writer");
                }
                OpenAiApi customApi = OpenAiApi.builder()
                        .baseUrl(config.endpointUrl())
                        .apiKey(resolvedKey)
                        .headers(authHeaders)
                        .build();
                activeModel = OpenAiChatModel.builder()
                        .openAiApi(customApi)
                        .defaultOptions(options)
                        .build();
            }

            ChatResponse chatResponse = ChatClient.create(activeModel)
                    .prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .options(options)
                    .call()
                    .chatResponse();

            String content = "";
            String resolvedModel = config.model();
            if (chatResponse != null) {
                if (chatResponse.getMetadata() != null && StringUtils.hasText(chatResponse.getMetadata().getModel())) {
                    resolvedModel = chatResponse.getMetadata().getModel();
                }
                if (chatResponse.getResult() != null && chatResponse.getResult().getOutput() != null) {
                    content = NullSafeUtils.safeTrim(chatResponse.getResult().getOutput().getText());
                    if (!StringUtils.hasText(content) && chatResponse.getResult().getOutput().getMetadata() != null) {
                        Object reasoning = chatResponse.getResult().getOutput().getMetadata().get("reasoningContent");
                        if (reasoning != null) {
                            content = String.valueOf(reasoning).trim();
                        }
                    }
                }
            }
            if (!StringUtils.hasText(content)) {
                throw new RuntimeException("Empty response from Spring AI model '" + resolvedModel + "'.");
            }
            return new LlmCallResult(content, config.provider(), resolvedModel);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private AiGeneratedPostResponse parseGeneratedArticle(LlmCallResult llmResult, String mode, StoreEntity store, String fallbackTopic) {
        String raw = llmResult.text().trim();
        String jsonCandidate = extractJsonObject(raw);

        String title = "";
        String slug = "";
        String excerpt = "";
        String contentHtml = "";
        String metaTitle = "";
        String metaDescription = "";
        String readTime = "6 min read";
        List<String> tags = new ArrayList<>();

        if (StringUtils.hasText(jsonCandidate)) {
            try {
                JsonNode node = objectMapper.readTree(jsonCandidate);
                title = NullSafeUtils.safeTrim(node.path("title").asText(""));
                slug = NullSafeUtils.safeTrim(node.path("slug").asText(""));
                excerpt = NullSafeUtils.safeTrim(node.path("excerpt").asText(""));
                contentHtml = NullSafeUtils.safeTrim(node.path("contentHtml").asText(node.path("content").asText("")));
                metaTitle = NullSafeUtils.safeTrim(node.path("metaTitle").asText(""));
                metaDescription = NullSafeUtils.safeTrim(node.path("metaDescription").asText(""));
                readTime = firstNonBlank(node.path("readTime").asText(""), "6 min read");
                if (node.path("tags").isArray()) {
                    for (JsonNode t : node.path("tags")) {
                        String cleanTag = NullSafeUtils.safeTrim(t.asText("")).replaceAll("^#+", "");
                        if (StringUtils.hasText(cleanTag)) {
                            tags.add(cleanTag);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("AI output JSON parse fallback triggered: {}", ex.getMessage());
            }
        }

        if (!StringUtils.hasText(contentHtml)) {
            contentHtml = raw.startsWith("<") ? raw : "<p>" + raw.replace("\n\n", "</p><p>") + "</p>";
        }
        if (!StringUtils.hasText(title)) {
            title = store != null
                    ? store.getName() + " Review & Verified Promo Guide"
                    : firstNonBlank(truncate(fallbackTopic, 110), "Editorial Insights & Analysis");
        }
        if (!StringUtils.hasText(slug)) {
            slug = SlugUtils.toSlug(title);
        }
        if (!StringUtils.hasText(excerpt)) {
            excerpt = truncate(stripHtml(contentHtml), 220);
        }
        if (!StringUtils.hasText(metaTitle)) {
            metaTitle = truncate(title, 65);
        }
        if (!StringUtils.hasText(metaDescription)) {
            metaDescription = truncate(excerpt, 155);
        }

        CategoryEntity resolvedCategory = resolveBestCategory(store, mode, title, tags);
        String resolvedImageUrl = resolveBestImageUrl(store, title, tags);
        String resolvedRating = (store != null && store.getRatingScore() != null)
                ? store.getRatingScore().stripTrailingZeros().toPlainString()
                : ("review".equalsIgnoreCase(mode) ? "4.7" : "");
        String resolvedCtaText = store != null
                ? "Get Verified " + store.getName() + " Deals"
                : "";
        String resolvedBrandDesc = (store != null && StringUtils.hasText(store.getAboutStore()))
                ? truncate(stripHtml(store.getAboutStore()), 180)
                : "";

        return AiGeneratedPostResponse.builder()
                .mode(mode)
                .title(title)
                .slug(SlugUtils.toSlug(slug))
                .excerpt(excerpt)
                .contentHtml(contentHtml)
                .metaTitle(metaTitle)
                .metaDescription(metaDescription)
                .tags(tags)
                .readTime(readTime)
                .imageUrl(resolvedImageUrl)
                .categoryId(resolvedCategory != null ? resolvedCategory.getId() : null)
                .categoryName(resolvedCategory != null ? resolvedCategory.getName() : null)
                .rating(resolvedRating)
                .ctaText(resolvedCtaText)
                .brandDescription(resolvedBrandDesc)
                .storeSlug(store != null ? store.getSlug() : null)
                .storeName(store != null ? store.getName() : null)
                .providerUsed(llmResult.provider())
                .modelUsed(llmResult.model())
                .build();
    }

    private CategoryEntity resolveBestCategory(StoreEntity store, String mode, String title, List<String> tags) {
        try {
            if (store != null && store.getCategoryId() != null) {
                Optional<CategoryEntity> storeCat = categoryRepository.findById(store.getCategoryId())
                        .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()));
                if (storeCat.isPresent()) return storeCat.get();
            }
            List<CategoryEntity> activeCats = categoryRepository
                    .findByIsActiveTrueAndIsDeletedFalseOrderBySortOrderAscCreatedAtDescIdDesc();
            if (activeCats == null || activeCats.isEmpty()) return null;

            String haystack = (NullSafeUtils.safeTrim(title) + " " + String.join(" ", tags != null ? tags : List.of()))
                    .toLowerCase(Locale.ROOT);
            for (CategoryEntity c : activeCats) {
                String cname = NullSafeUtils.safeLowerTrim(c.getName());
                if (StringUtils.hasText(cname) && cname.length() >= 3 && haystack.contains(cname)) {
                    return c;
                }
            }
            String modeHint = "review".equalsIgnoreCase(mode) ? "review" : "news";
            for (CategoryEntity c : activeCats) {
                String cname = NullSafeUtils.safeLowerTrim(c.getName());
                String cslug = NullSafeUtils.safeLowerTrim(c.getSlug());
                if (cname.contains(modeHint) || cslug.contains(modeHint)) {
                    return c;
                }
            }
            return activeCats.get(0);
        } catch (Exception ex) {
            log.debug("resolveBestCategory fallback: {}", ex.getMessage());
            return null;
        }
    }

    private String resolveBestImageUrl(StoreEntity store, String title, List<String> tags) {
        try {
            if (store != null && StringUtils.hasText(store.getSocialCardImage())) {
                return store.getSocialCardImage().trim();
            }
            // Search Media Library by store name, tags, then title keywords
            List<String> candidates = new ArrayList<>();
            if (store != null && StringUtils.hasText(store.getName())) {
                candidates.add(store.getName().trim());
            }
            if (tags != null) {
                for (String t : tags) {
                    if (StringUtils.hasText(t) && t.trim().length() >= 3) {
                        candidates.add(t.trim());
                    }
                }
            }
            if (StringUtils.hasText(title)) {
                for (String w : title.split("[\\s\\-:&,|]+")) {
                    String clean = w.replaceAll("[^a-zA-Z0-9]", "").trim();
                    if (clean.length() >= 4) {
                        candidates.add(clean);
                        if (candidates.size() >= 8) break;
                    }
                }
            }
            for (String kw : candidates) {
                List<MediaItemEntity> hits = mediaItemRepository
                        .findMediaByFilters(false, null, kw, null, null, PageRequest.of(0, 1))
                        .getContent();
                if (!hits.isEmpty() && StringUtils.hasText(hits.get(0).getUrl())) {
                    return hits.get(0).getUrl().trim();
                }
            }
            if (store != null && StringUtils.hasText(store.getLogo())) {
                return store.getLogo().trim();
            }
            List<MediaItemEntity> articleImgs = mediaItemRepository
                    .findMediaByFilters(false, "articles", null, null, null, PageRequest.of(0, 1))
                    .getContent();
            if (!articleImgs.isEmpty() && StringUtils.hasText(articleImgs.get(0).getUrl())) {
                return articleImgs.get(0).getUrl().trim();
            }
            List<MediaItemEntity> anyImg = mediaItemRepository
                    .findMediaByFilters(false, null, null, null, null, PageRequest.of(0, 1))
                    .getContent();
            if (!anyImg.isEmpty() && StringUtils.hasText(anyImg.get(0).getUrl())) {
                return anyImg.get(0).getUrl().trim();
            }
        } catch (Exception ex) {
            log.debug("resolveBestImageUrl fallback: {}", ex.getMessage());
        }
        return "";
    }

    private String buildSystemPrompt(String mode, String language, String tone, int wordCount, String siteName) {
        String structureGuide = "review".equals(mode)
                ? "Include: (1) Crisp executive verdict opening, (2) Key Features & Hands-On Breakdown with <h2>/<h3>, (3) Structured HTML <table> comparing plans/features or pros vs cons, (4) Who Should & Shouldn't Buy, (5) How to Save with Verified Offers (only mention offers provided in context), (6) 4 concise FAQs."
                : "Include: (1) Punchy journalistic lead paragraph summarizing What/Why It Matters, (2) Key Takeaways bulleted list (<ul>), (3) Deep-dive analysis sections with clear <h2>/<h3> headings, (4) Consumer / Market Impact section, (5) Brief FAQ or Outlook.";

        return "You are a senior human editor writing for " + siteName + ".\n"
                + "Language: " + language + ". Tone: " + tone + ". Target length: ~" + wordCount + " words.\n"
                + "STRICT RULES:\n"
                + "- Never use cliché AI filler phrases ('In today's fast-paced world', 'In conclusion', 'delve into', 'game-changer').\n"
                + "- Write crisp, concrete, fact-based paragraphs using clean semantic HTML (<h2>, <h3>, <p>, <ul>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>, <strong>). Never include <h1> or <html>/<body> wrappers.\n"
                + "- " + structureGuide + "\n"
                + "- Output ONLY a single raw JSON object (no markdown fences, no commentary) with exact keys:\n"
                + "  {\"title\": \"...\", \"slug\": \"url-friendly-slug\", \"excerpt\": \"2-sentence summary\", \"contentHtml\": \"<h2>...</h2>...\", \"metaTitle\": \"SEO title <=65 chars\", \"metaDescription\": \"SEO meta <=155 chars\", \"tags\": [\"tag1\", \"tag2\", \"tag3\", \"tag4\"], \"readTime\": \"6 min read\"}";
    }

    private String fetchCleanWebText(String url) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return "";
        }
        // Try Jina Reader first for clean markdown extraction
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://r.jina.ai/" + url))
                    .timeout(Duration.ofSeconds(12))
                    .header("User-Agent", "EditorialBot/1.0")
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() >= 200 && resp.statusCode() < 300 && StringUtils.hasText(resp.body())) {
                return truncate(resp.body().trim(), 7500);
            }
        } catch (Exception ex) {
            log.debug("Jina Reader fetch fallback for {}: {}", url, ex.getMessage());
        }

        // Fallback: direct HTTP fetch + HTML tag strip
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("User-Agent", "Mozilla/5.0 (compatible; EditorialBot/1.0)")
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() >= 200 && resp.statusCode() < 300 && StringUtils.hasText(resp.body())) {
                return truncate(stripHtml(resp.body()), 6500);
            }
        } catch (Exception ex) {
            log.warn("Direct URL fetch failed for {}: {}", url, ex.getMessage());
        }
        return "";
    }

    private List<RssEntry> fetchRssEntries(String feedUrl) {
        List<RssEntry> entries = new ArrayList<>();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(feedUrl))
                    .timeout(Duration.ofSeconds(12))
                    .header("User-Agent", "Mozilla/5.0 (compatible; EditorialRSS/1.0)")
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300 || !StringUtils.hasText(resp.body())) {
                return entries;
            }

            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(resp.body().getBytes(StandardCharsets.UTF_8)));

            NodeList items = doc.getElementsByTagName("item");
            for (int i = 0; i < Math.min(items.getLength(), 10); i++) {
                if (items.item(i) instanceof Element el) {
                    String title = getChildText(el, "title");
                    String link = getChildText(el, "link");
                    String desc = stripHtml(getChildText(el, "description"));
                    if (StringUtils.hasText(title)) {
                        entries.add(new RssEntry(title.trim(), link.trim(), truncate(desc, 400)));
                    }
                }
            }
            if (entries.isEmpty()) {
                NodeList atomEntries = doc.getElementsByTagName("entry");
                for (int i = 0; i < Math.min(atomEntries.getLength(), 10); i++) {
                    if (atomEntries.item(i) instanceof Element el) {
                        String title = getChildText(el, "title");
                        String link = "";
                        NodeList links = el.getElementsByTagName("link");
                        if (links.getLength() > 0 && links.item(0) instanceof Element linkEl) {
                            link = linkEl.getAttribute("href");
                            if (!StringUtils.hasText(link)) link = linkEl.getTextContent();
                        }
                        String desc = stripHtml(firstNonBlank(getChildText(el, "summary"), getChildText(el, "content"), ""));
                        if (StringUtils.hasText(title)) {
                            entries.add(new RssEntry(title.trim(), link.trim(), truncate(desc, 400)));
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to parse RSS feed {}: {}", feedUrl, ex.getMessage());
        }
        return entries;
    }

    private String getChildText(Element parent, String tag) {
        NodeList nodes = parent.getElementsByTagName(tag);
        if (nodes != null && nodes.getLength() > 0 && nodes.item(0) != null) {
            return NullSafeUtils.safeTrim(nodes.item(0).getTextContent());
        }
        return "";
    }

    private List<String> parseFeedUrls(String raw) {
        List<String> list = new ArrayList<>();
        if (!StringUtils.hasText(raw)) return list;
        for (String line : raw.split("[\\r\\n]+")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                list.add(trimmed);
            }
        }
        return list;
    }

    private LlmCallResult callAnthropicDirect(
            ProviderConfig config,
            String systemPrompt,
            String userPrompt,
            int maxTokens,
            double temperature
    ) {
        try {
            String base = StringUtils.hasText(config.endpointUrl())
                    ? config.endpointUrl().replaceAll("/+$", "")
                    : "https://api.anthropic.com";
            String url = base.endsWith("/v1/messages") ? base : base + "/v1/messages";

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", config.model());
            body.put("max_tokens", maxTokens);
            body.put("temperature", temperature);
            body.put("system", systemPrompt);
            body.put("messages", List.of(Map.of("role", "user", "content", userPrompt)));

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(90))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", config.apiKey().trim())
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new RuntimeException("Anthropic API HTTP " + resp.statusCode() + ": " + truncate(resp.body(), 240));
            }
            JsonNode root = objectMapper.readTree(resp.body());
            StringBuilder text = new StringBuilder();
            if (root.path("content").isArray()) {
                for (JsonNode block : root.path("content")) {
                    if ("text".equals(block.path("type").asText())) {
                        text.append(block.path("text").asText(""));
                    }
                }
            }
            String content = text.toString().trim();
            if (!StringUtils.hasText(content)) {
                throw new RuntimeException("Empty response from Claude model '" + config.model() + "'.");
            }
            return new LlmCallResult(content, "anthropic", firstNonBlank(root.path("model").asText(""), config.model()));
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private String resolveSpringAiBaseUrl(String provider, String customBaseUrl) {
        boolean inDocker = new java.io.File("/.dockerenv").exists();
        if (StringUtils.hasText(customBaseUrl)) {
            String clean = customBaseUrl.trim().replaceAll("/+$", "");
            clean = clean.replaceAll("/v1/chat/completions$", "").replaceAll("/chat/completions$", "");
            if ("ollama".equalsIgnoreCase(provider) && inDocker) {
                clean = clean.replace("http://localhost", "http://host.docker.internal")
                             .replace("http://127.0.0.1", "http://host.docker.internal");
            }
            return clean;
        }
        return switch (NullSafeUtils.safeLowerTrim(provider)) {
            case AiConstants.PROVIDER_OPENAI -> AiConstants.BASE_URL_OPENAI;
            case AiConstants.PROVIDER_ANTHROPIC, AiConstants.PROVIDER_CLAUDE -> AiConstants.BASE_URL_ANTHROPIC;
            case AiConstants.PROVIDER_GEMINI -> AiConstants.BASE_URL_GEMINI;
            case AiConstants.PROVIDER_QWEN -> AiConstants.BASE_URL_QWEN;
            case AiConstants.PROVIDER_KIMI, AiConstants.PROVIDER_MOONSHOT -> AiConstants.BASE_URL_KIMI;
            case AiConstants.PROVIDER_DEEPSEEK -> AiConstants.BASE_URL_DEEPSEEK;
            case AiConstants.PROVIDER_XAI, AiConstants.PROVIDER_GROK -> AiConstants.BASE_URL_XAI;
            case AiConstants.PROVIDER_GROQ -> AiConstants.BASE_URL_GROQ;
            case AiConstants.PROVIDER_CEREBRAS -> AiConstants.BASE_URL_CEREBRAS;
            case AiConstants.PROVIDER_MISTRAL -> AiConstants.BASE_URL_MISTRAL;
            case AiConstants.PROVIDER_OLLAMA -> inDocker ? AiConstants.BASE_URL_OLLAMA_DOCKER : AiConstants.BASE_URL_OLLAMA_LOCAL;
            default -> AiConstants.BASE_URL_OPENROUTER;
        };
    }

    private String detectProviderFromUrl(String baseUrl) {
        String lower = NullSafeUtils.safeLowerTrim(baseUrl);
        if (lower.contains("api.openai.com")) return "openai";
        if (lower.contains("anthropic")) return "anthropic";
        if (lower.contains("googleapis")) return "gemini";
        if (lower.contains("dashscope") || lower.contains("aliyuncs")) return "qwen";
        if (lower.contains("moonshot")) return "kimi";
        if (lower.contains("deepseek")) return "deepseek";
        if (lower.contains("api.x.ai")) return "xai";
        if (lower.contains("groq")) return "groq";
        if (lower.contains("cerebras")) return "cerebras";
        if (lower.contains("mistral")) return "mistral";
        if (lower.contains("11434") || lower.contains("ollama")) return "ollama";
        return "openrouter";
    }

    private String defaultModelFor(String provider) {
        return switch (NullSafeUtils.safeLowerTrim(provider)) {
            case "openai" -> "gpt-4o-mini";
            case "anthropic", "claude" -> "claude-sonnet-4-20250514";
            case "gemini" -> "gemini-2.5-flash";
            case "qwen" -> "qwen-plus";
            case "kimi", "moonshot" -> "kimi-k2-0711-preview";
            case "deepseek" -> "deepseek-chat";
            case "xai", "grok" -> "grok-3-mini";
            case "groq" -> "llama-3.3-70b-versatile";
            case "cerebras" -> "llama-3.3-70b";
            case "mistral" -> "mistral-small-latest";
            case "ollama" -> "gemma3:4b";
            default -> "openrouter/free";
        };
    }

    private String extractJsonObject(String raw) {
        if (!StringUtils.hasText(raw)) return "";
        String cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```[a-zA-Z]*\\s*", "").replaceFirst("\\s*```$", "").trim();
        }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return cleaned.substring(start, end + 1);
        }
        return "";
    }

    private Map<String, String> safeSettings() {
        try {
            Map<String, String> map = settingService.getAllSettings().settings();
            return map != null ? map : Map.of();
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private void resetDailyCounterIfNeeded() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (!today.equals(autoRunDate.get())) {
            autoRunDate.set(today);
            autoRunCountToday.set(0);
        }
    }

    private String stripHtml(String html) {
        if (!StringUtils.hasText(html)) return "";
        return html
                .replaceAll("(?is)<script[^>]*>.*?</script>", " ")
                .replaceAll("(?is)<style[^>]*>.*?</style>", " ")
                .replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String truncate(String text, int maxLen) {
        if (!StringUtils.hasText(text)) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen).trim();
    }

    private String firstNonBlank(String... values) {
        for (String v : values) {
            if (StringUtils.hasText(v)) return v.trim();
        }
        return "";
    }

    private int parseIntSafe(String raw, int fallback, int min, int max) {
        try {
            int v = Integer.parseInt(NullSafeUtils.safeTrim(raw));
            return Math.max(min, Math.min(max, v));
        } catch (Exception ignored) {
            return fallback;
        }
    }
}
