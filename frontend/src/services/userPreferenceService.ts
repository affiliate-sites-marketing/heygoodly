import { apiClient } from '@/lib/api/axios-client';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { authService } from '@/services/authService';

export interface UserPreferences {
  themeMode: 'light' | 'dark';
  locale: 'en' | 'vi';
}

export const AUTH_SESSION_CHANGED_EVENT = 'heygoodly:auth-session-changed';

let cachedPreferences: UserPreferences | null = null;
let inFlightFetch: Promise<UserPreferences | null> | null = null;

function normalizePreferences(raw: any): UserPreferences {
  const themeMode = raw?.themeMode === 'dark' ? 'dark' : 'light';
  const locale = raw?.locale === 'vi' ? 'vi' : 'en';
  return { themeMode, locale };
}

class UserPreferenceService {
  clearCache(): void {
    cachedPreferences = null;
    inFlightFetch = null;
  }

  async fetchPreferences(force = false): Promise<UserPreferences | null> {
    if (typeof window === 'undefined') return null;
    if (!authService.hasSession()) {
      this.clearCache();
      return null;
    }

    if (cachedPreferences && !force) {
      return cachedPreferences;
    }
    if (inFlightFetch && !force) {
      return inFlightFetch;
    }

    inFlightFetch = (async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.PROFILE.PREFERENCES, {
          skipDedup: force,
        } as any);
        const data = res.data?.data || res.data;
        const normalized = normalizePreferences(data);
        cachedPreferences = normalized;
        return normalized;
      } catch {
        return cachedPreferences;
      } finally {
        inFlightFetch = null;
      }
    })();

    return inFlightFetch;
  }

  async updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences | null> {
    if (typeof window === 'undefined') return null;
    if (!authService.hasSession()) return null;

    cachedPreferences = {
      themeMode: patch.themeMode ?? cachedPreferences?.themeMode ?? 'light',
      locale: patch.locale ?? cachedPreferences?.locale ?? 'en',
    };

    try {
      const res = await apiClient.put(API_ENDPOINTS.PROFILE.PREFERENCES, patch);
      const data = res.data?.data || res.data;
      const normalized = normalizePreferences(data);
      cachedPreferences = normalized;
      return normalized;
    } catch {
      return cachedPreferences;
    }
  }
}

export const userPreferenceService = new UserPreferenceService();
