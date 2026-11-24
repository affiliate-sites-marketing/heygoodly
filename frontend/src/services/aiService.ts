import { apiClient } from '@/lib/api/axios-client';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { STORAGE_KEYS } from '@/constants/ui-constants';

export interface AiTestConnectionPayload {
  configId?: number;
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface AiProviderConfigItem {
  id: number;
  name: string;
  provider: string;
  hasApiKey: boolean;
  maskedApiKey?: string;
  baseUrl?: string;
  model: string;
  isDefault: boolean;
  isFallback: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiProviderConfigPayload {
  name: string;
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  isDefault?: boolean;
  isFallback?: boolean;
  isActive?: boolean;
}

export interface AiTestConnectionResult {
  success: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  replyPreview?: string;
  error?: string;
}

export interface AiGeneratePostPayload {
  mode: 'review' | 'news';
  storeSlug?: string;
  sourceUrl?: string;
  topic?: string;
  language?: string;
  tone?: string;
  configId?: number;
  model?: string;
  wordCount?: number;
}

export interface AiGeneratedPostResult {
  mode: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  readTime: string;
  imageUrl?: string;
  categoryId?: number;
  categoryName?: string;
  rating?: string;
  ctaText?: string;
  brandDescription?: string;
  storeSlug?: string;
  storeName?: string;
  providerUsed?: string;
  modelUsed?: string;
}

export interface AiAutoRunResult {
  generatedCount: number;
  publishMode: string;
  createdTitles: string[];
  createdSlugs: string[];
  message: string;
}

export interface AiEngineStatus {
  ready: boolean;
  serverConfigured: boolean;
  source: 'db-config' | 'spring-ai-server' | 'admin-override' | 'unconfigured';
  configId?: number;
  configName?: string;
  provider: string;
  model: string;
}

export interface AiModelOption {
  id: string;
  name: string;
  free?: boolean;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatPayload {
  sessionId?: number;
  message?: string;
  messages?: AiChatMessage[];
  configId?: number;
  model?: string;
  persona?: string;
  systemPrompt?: string;
  storeSlug?: string;
  sourceUrl?: string;
  attachmentName?: string;
  attachmentText?: string;
  imageDataUrl?: string;
  editFromMessageId?: number;
  regenerate?: boolean;
  enableTools?: boolean;
}

export interface AiChatResult {
  sessionId?: number;
  sessionTitle?: string;
  assistantMessageId?: number;
  reply: string;
  provider: string;
  model: string;
  persona?: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AiChatSessionSummary {
  id: number;
  title: string;
  configId?: number | null;
  model?: string | null;
  isPinned?: boolean;
  persona?: string;
  systemPrompt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiChatSessionUpdatePayload {
  title?: string;
  isPinned?: boolean;
  persona?: string;
  systemPrompt?: string;
}

export interface AiChatStoredMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  createdAt?: string;
}

class AiService {
  async getStatus(): Promise<AiEngineStatus> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.AI_STATUS);
      return res.data?.data;
    } catch {
      return { ready: false, serverConfigured: false, source: 'unconfigured', provider: 'openrouter', model: 'openrouter/free' };
    }
  }

  async listConfigs(): Promise<AiProviderConfigItem[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.AI_CONFIGS);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  async createConfig(payload: AiProviderConfigPayload): Promise<AiProviderConfigItem> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_CONFIGS, payload);
    return res.data?.data;
  }

  async updateConfig(id: number, payload: AiProviderConfigPayload): Promise<AiProviderConfigItem> {
    const res = await apiClient.put(API_ENDPOINTS.ADMIN.AI_CONFIG_BY_ID(id), payload);
    return res.data?.data;
  }

  async setDefaultConfig(id: number): Promise<AiProviderConfigItem> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_CONFIG_SET_DEFAULT(id));
    return res.data?.data;
  }

  async toggleFallbackConfig(id: number): Promise<AiProviderConfigItem> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_CONFIG_TOGGLE_FALLBACK(id));
    return res.data?.data;
  }

  async deleteConfig(id: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ADMIN.AI_CONFIG_BY_ID(id));
  }

  async listModels(options?: {
    configId?: number;
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    refresh?: boolean;
  }): Promise<AiModelOption[]> {
    try {
      const res = await apiClient.post(
        API_ENDPOINTS.ADMIN.AI_MODELS,
        {
          configId: options?.configId || undefined,
          provider: options?.provider || undefined,
          apiKey: options?.apiKey || undefined,
          baseUrl: options?.baseUrl || undefined,
        },
        {
          params: options?.refresh ? { refresh: true } : undefined,
          timeout: 15000,
        }
      );
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  async testConnection(payload: AiTestConnectionPayload): Promise<AiTestConnectionResult> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_TEST, payload, { timeout: 45000 });
    return res.data?.data;
  }

  async chat(payload: AiChatPayload): Promise<AiChatResult> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_CHAT, payload, { timeout: 120000 });
    return res.data?.data;
  }

  async streamChat(
    payload: AiChatPayload,
    handlers: {
      onChunk: (delta: string) => void;
      onDone: (result: AiChatResult) => void;
      onError: (message: string) => void;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) : null;
    const locale = typeof window !== 'undefined' ? localStorage.getItem('admin:locale') || 'en' : 'en';
    const baseUrl = (apiClient.defaults.baseURL || '').replace(/\/+$/, '');
    const url = `${baseUrl}${API_ENDPOINTS.ADMIN.AI_CHAT_STREAM}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: handlers.signal,
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '');
      throw new Error(errText || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let currentEvent = 'message';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line) {
          currentEvent = 'message';
          continue;
        }
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (currentEvent === 'chunk' && typeof parsed.content === 'string') {
              handlers.onChunk(parsed.content);
            } else if (currentEvent === 'done') {
              handlers.onDone(parsed as AiChatResult);
            } else if (currentEvent === 'error') {
              handlers.onError(parsed.error || 'Streaming error');
            }
          } catch {
            // ignore non-JSON keepalive lines
          }
        }
      }
    }
  }

  async listChatSessions(): Promise<AiChatSessionSummary[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.AI_CHAT_SESSIONS);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  async updateChatSession(sessionId: number, payload: AiChatSessionUpdatePayload): Promise<AiChatSessionSummary> {
    const res = await apiClient.patch(API_ENDPOINTS.ADMIN.AI_CHAT_SESSION_BY_ID(sessionId), payload);
    return res.data?.data;
  }

  async getChatSessionMessages(sessionId: number): Promise<AiChatStoredMessage[]> {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ADMIN.AI_CHAT_SESSION_MESSAGES(sessionId));
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch {
      return [];
    }
  }

  async deleteChatSession(sessionId: number): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ADMIN.AI_CHAT_SESSION_BY_ID(sessionId));
  }

  async generatePost(payload: AiGeneratePostPayload): Promise<AiGeneratedPostResult> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_GENERATE_POST, payload, { timeout: 110000 });
    return res.data?.data;
  }

  async runAutoPublishNow(count = 1): Promise<AiAutoRunResult> {
    const res = await apiClient.post(API_ENDPOINTS.ADMIN.AI_AUTO_PUBLISH_RUN, null, {
      params: { count },
      timeout: 120000,
    });
    return res.data?.data;
  }
}

export const aiService = new AiService();
export default aiService;
