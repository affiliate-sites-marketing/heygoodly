package com.heygoodly.portal.modules.ai.constant;

public final class AiConstants {
    private AiConstants() {}

    // Providers
    public static final String PROVIDER_OPENROUTER = "openrouter";
    public static final String PROVIDER_OPENAI = "openai";
    public static final String PROVIDER_ANTHROPIC = "anthropic";
    public static final String PROVIDER_CLAUDE = "claude";
    public static final String PROVIDER_GEMINI = "gemini";
    public static final String PROVIDER_QWEN = "qwen";
    public static final String PROVIDER_KIMI = "kimi";
    public static final String PROVIDER_MOONSHOT = "moonshot";
    public static final String PROVIDER_DEEPSEEK = "deepseek";
    public static final String PROVIDER_XAI = "xai";
    public static final String PROVIDER_GROK = "grok";
    public static final String PROVIDER_GROQ = "groq";
    public static final String PROVIDER_CEREBRAS = "cerebras";
    public static final String PROVIDER_MISTRAL = "mistral";
    public static final String PROVIDER_OLLAMA = "ollama";
    public static final String PROVIDER_CUSTOM = "custom";

    // Default Base URLs
    public static final String BASE_URL_OPENROUTER = "https://openrouter.ai/api";
    public static final String BASE_URL_OPENAI = "https://api.openai.com";
    public static final String BASE_URL_ANTHROPIC = "https://api.anthropic.com";
    public static final String BASE_URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai";
    public static final String BASE_URL_QWEN = "https://dashscope-intl.aliyuncs.com/compatible-mode";
    public static final String BASE_URL_KIMI = "https://api.moonshot.ai";
    public static final String BASE_URL_DEEPSEEK = "https://api.deepseek.com";
    public static final String BASE_URL_XAI = "https://api.x.ai";
    public static final String BASE_URL_GROQ = "https://api.groq.com/openai";
    public static final String BASE_URL_CEREBRAS = "https://api.cerebras.ai";
    public static final String BASE_URL_MISTRAL = "https://api.mistral.ai";
    public static final String BASE_URL_OLLAMA_LOCAL = "http://localhost:11434";
    public static final String BASE_URL_OLLAMA_DOCKER = "http://host.docker.internal:11434";
    public static final String MODELS_DEV_CATALOG_URL = "https://models.dev/api.json";

    // Roles, Modes & Sources
    public static final String ROLE_USER = "user";
    public static final String ROLE_ASSISTANT = "assistant";
    public static final String MODE_REVIEW = "review";
    public static final String MODE_NEWS = "news";
    public static final String PUBLISH_MODE_DRAFT = "draft";
    public static final String PUBLISH_MODE_PUBLISH = "publish";
    public static final String SOURCE_DB_CONFIG = "db-config";
    public static final String SOURCE_SPRING_AI_SERVER = "spring-ai-server";
    public static final String SOURCE_ADMIN_OVERRIDE = "admin-override";
    public static final String SOURCE_UNCONFIGURED = "unconfigured";
    public static final String NOT_CONFIGURED_SENTINEL = "not-configured";
    public static final String DEFAULT_OPENROUTER_MODEL = "openrouter/free";
    public static final String DEFAULT_LANGUAGE = "English";
    public static final String DEFAULT_TONE = "Editorial & Objective";
    public static final String DEFAULT_READ_TIME = "6 min read";
    public static final String DEFAULT_USER_FALLBACK = "admin";
    public static final String NEW_CHAT_TITLE = "New Chat";

    // Setting Keys
    public static final String SETTING_AI_ENABLED = "ai_enabled";
    public static final String SETTING_AI_PROVIDER = "ai_provider";
    public static final String SETTING_AI_API_KEY = "ai_api_key";
    public static final String SETTING_AI_BASE_URL = "ai_base_url";
    public static final String SETTING_AI_MODEL = "ai_model";
    public static final String SETTING_AI_FALLBACK_PROVIDER = "ai_fallback_provider";
    public static final String SETTING_AI_FALLBACK_API_KEY = "ai_fallback_api_key";
    public static final String SETTING_AI_FALLBACK_MODEL = "ai_fallback_model";
    public static final String SETTING_AI_DEFAULT_LANGUAGE = "ai_default_language";
    public static final String SETTING_AI_DEFAULT_TONE = "ai_default_tone";
    public static final String SETTING_AI_AUTO_ENABLED = "ai_auto_enabled";
    public static final String SETTING_AI_AUTO_MODE = "ai_auto_mode";
    public static final String SETTING_AI_AUTO_DAILY_LIMIT = "ai_auto_daily_limit";
    public static final String SETTING_AI_AUTO_INCLUDE_REVIEWS = "ai_auto_include_reviews";
    public static final String SETTING_AI_AUTO_RSS_FEEDS = "ai_auto_rss_feeds";
    public static final String SETTING_SITE_NAME = "site_name";

    // Audit Constants
    public static final String AUDIT_MODULE_AI_CONFIGS = "ai_configs";
    public static final String AUDIT_MODULE_POSTS = "posts";
    public static final String AUDIT_MODULE_OFFERS = "offers";
    public static final String AUDIT_ACTION_SET_DEFAULT = "SET_DEFAULT";
    public static final String AUDIT_ACTION_AI_AUTO_CREATE = "AI_AUTO_CREATE";
    public static final String AUDIT_ACTION_AI_AGENT_CREATE = "AI_AGENT_CREATE";
    public static final String AUDIT_ACTION_AI_AGENT_UPDATE = "AI_AGENT_UPDATE";

    // Limits
    public static final int MAX_CHAT_CONTEXT_TURNS = 30;
    public static final int MODEL_CACHE_TTL_SECONDS = 1800;

    // Backend I18n Keys (stored in public.i18n_messages)
    public static final String I18N_CONFIG_SAVED = "ai.config.saved";
    public static final String I18N_CONFIG_UPDATED = "ai.config.updated";
    public static final String I18N_CONFIG_DELETED = "ai.config.deleted";
    public static final String I18N_CONFIG_DEFAULT_UPDATED = "ai.config.default_updated";
    public static final String I18N_CONFIG_FALLBACK_UPDATED = "ai.config.fallback_updated";
    public static final String I18N_CONFIG_NOT_FOUND = "ai.config.not_found";
    public static final String I18N_CONFIG_PROVIDER_MODEL_REQUIRED = "ai.config.provider_model_required";
    public static final String I18N_CONFIG_API_KEY_REQUIRED = "ai.config.api_key_required";
    public static final String I18N_CHAT_EMPTY_REQUEST = "ai.chat.empty_request";
    public static final String I18N_CHAT_EMPTY_MESSAGE = "ai.chat.empty_message";
    public static final String I18N_CHAT_SESSION_NOT_FOUND = "ai.chat.session_not_found";
    public static final String I18N_CHAT_SESSION_DELETED = "ai.chat.session_deleted";
    public static final String I18N_CHAT_SESSION_UPDATED = "ai.chat.session_updated";
    public static final String I18N_CHAT_SESSION_PINNED = "ai.chat.session_pinned";
    public static final String I18N_CHAT_FAILED = "ai.chat.failed";

    // Chat Personas
    public static final String PERSONA_GENERAL = "general";
    public static final String PERSONA_REVIEW_EDITOR = "review_editor";
    public static final String PERSONA_SEO_STRATEGIST = "seo_strategist";
    public static final String PERSONA_NEWS_JOURNALIST = "news_journalist";
    public static final String PERSONA_TRANSLATOR = "translator";
    public static final String PERSONA_DEVELOPER = "developer";

    // SSE Events
    public static final String SSE_EVENT_CHUNK = "chunk";
    public static final String SSE_EVENT_DONE = "done";
    public static final String SSE_EVENT_ERROR = "error";
    public static final String I18N_POST_GENERATED = "ai.post.generated";
    public static final String I18N_POST_CONTEXT_REQUIRED = "ai.post.context_required";
    public static final String I18N_POST_GENERATION_FAILED = "ai.post.generation_failed";
    public static final String I18N_API_KEY_NOT_CONFIGURED = "ai.api_key.not_configured";
}
