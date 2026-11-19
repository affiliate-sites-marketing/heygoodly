'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { hydrateSiteSettingsFromServer, useSiteSettings } from '@/lib/admin/useSiteSettings';
import { applyBrandThemeToDocument, resolveBrandPalette } from '@/lib/brandTheme';
import { AUTH_SESSION_CHANGED_EVENT, userPreferenceService } from '@/services/userPreferenceService';
import { SITE_SLUG } from '@/constants/site';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = `${SITE_SLUG}:theme`;

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

export function ThemeProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Record<string, string>;
}) {
  hydrateSiteSettingsFromServer(initialSettings);

  const [theme, setThemeState] = useState<ThemeMode>('light');
  const themeRef = useRef<ThemeMode>('light');
  const { settings } = useSiteSettings();

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    if (!settings.loaded) return;
    applyBrandThemeToDocument(
      resolveBrandPalette(
        settings.brandThemePreset,
        settings.brandPrimaryColor,
        settings.brandHoverColor
      )
    );
  }, [
    settings.loaded,
    settings.brandThemePreset,
    settings.brandPrimaryColor,
    settings.brandHoverColor,
  ]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') {
        themeRef.current = saved;
        setThemeState(saved);
        applyThemeToDocument(saved);
      } else {
        applyThemeToDocument('light');
      }
    } catch {
      applyThemeToDocument('light');
    }

    let active = true;
    const syncFromServer = async (force = false) => {
      const prefs = await userPreferenceService.fetchPreferences(force);
      if (!active || !prefs) return;
      themeRef.current = prefs.themeMode;
      setThemeState(prefs.themeMode);
      applyThemeToDocument(prefs.themeMode);
      try {
        window.localStorage.setItem(STORAGE_KEY, prefs.themeMode);
      } catch {
        // ignore storage errors
      }
    };

    void syncFromServer(false);

    const onAuthChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ authenticated?: boolean }>).detail;
      if (detail?.authenticated) {
        void syncFromServer(true);
      } else {
        userPreferenceService.clearCache();
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'dark' || e.newValue === 'light')) {
        themeRef.current = e.newValue;
        setThemeState(e.newValue);
        applyThemeToDocument(e.newValue);
      }
    };
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, onAuthChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    themeRef.current = next;
    setThemeState(next);
    applyThemeToDocument(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    void userPreferenceService.updatePreferences({ themeMode: next });
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = themeRef.current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
