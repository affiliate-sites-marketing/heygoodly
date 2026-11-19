import type { CSSProperties } from 'react';

export interface BrandThemePreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  hover: string;
}

export interface ResolvedBrandPalette {
  presetId: string;
  primary: string;
  hover: string;
  active: string;
  light: string;
  soft: string;
  softHover: string;
  border: string;
  rgb: string;
}

export const DEFAULT_BRAND_PRESET = 'crimson';
export const DEFAULT_BRAND_PRIMARY = '#C62828';
export const DEFAULT_BRAND_HOVER = '#B71C1C';

export const BRAND_THEME_PRESETS: BrandThemePreset[] = [
  {
    id: 'crimson',
    name: 'Editorial Crimson',
    description: 'Classic magazine red',
    primary: '#C62828',
    hover: '#B71C1C',
  },
  {
    id: 'royal-blue',
    name: 'Royal Cobalt',
    description: 'Trustworthy tech blue',
    primary: '#1D4ED8',
    hover: '#1E40AF',
  },
  {
    id: 'emerald',
    name: 'Forest Emerald',
    description: 'Verified savings green',
    primary: '#047857',
    hover: '#065F46',
  },
  {
    id: 'indigo',
    name: 'Modern Indigo',
    description: 'Crisp SaaS violet-blue',
    primary: '#4338CA',
    hover: '#3730A3',
  },
  {
    id: 'violet',
    name: 'Studio Violet',
    description: 'Rich editorial purple',
    primary: '#6D28D9',
    hover: '#5B21B6',
  },
  {
    id: 'teal',
    name: 'Ocean Teal',
    description: 'Balanced cyan-green',
    primary: '#0F766E',
    hover: '#115E59',
  },
  {
    id: 'amber-orange',
    name: 'Burnt Amber',
    description: 'Warm commerce orange',
    primary: '#C2410C',
    hover: '#9A3412',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Slate',
    description: 'Minimal monochrome ink',
    primary: '#1E293B',
    hover: '#0F172A',
  },
];

export function normalizeHexColor(value?: string | null, fallback = DEFAULT_BRAND_PRIMARY): string {
  if (!value) return fallback;
  const raw = value.trim();
  const shortMatch = /^#?([0-9a-fA-F]{3})$/.exec(raw);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const fullMatch = /^#?([0-9a-fA-F]{6})$/.exec(raw);
  if (fullMatch) {
    return `#${fullMatch[1].toUpperCase()}`;
  }
  return fallback;
}

export function isValidHexColor(value?: string | null): boolean {
  if (!value) return false;
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex);
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function mixHex(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  );
}

export function deriveHoverHex(primaryHex: string): string {
  return mixHex(primaryHex, '#000000', 0.16);
}

export function resolveBrandPalette(
  presetId?: string | null,
  primaryColor?: string | null,
  hoverColor?: string | null
): ResolvedBrandPalette {
  const cleanPreset = (presetId || '').trim().toLowerCase();
  const matchedPreset = BRAND_THEME_PRESETS.find((p) => p.id === cleanPreset);

  let primary = DEFAULT_BRAND_PRIMARY;
  let hover = DEFAULT_BRAND_HOVER;
  let resolvedPresetId = DEFAULT_BRAND_PRESET;

  if (cleanPreset === 'custom') {
    primary = normalizeHexColor(primaryColor, DEFAULT_BRAND_PRIMARY);
    hover = isValidHexColor(hoverColor)
      ? normalizeHexColor(hoverColor, deriveHoverHex(primary))
      : deriveHoverHex(primary);
    resolvedPresetId = 'custom';
  } else if (matchedPreset) {
    primary = isValidHexColor(primaryColor)
      ? normalizeHexColor(primaryColor, matchedPreset.primary)
      : matchedPreset.primary;
    hover = isValidHexColor(hoverColor)
      ? normalizeHexColor(hoverColor, matchedPreset.hover)
      : matchedPreset.hover;
    resolvedPresetId = matchedPreset.id;
  } else if (isValidHexColor(primaryColor)) {
    primary = normalizeHexColor(primaryColor, DEFAULT_BRAND_PRIMARY);
    hover = isValidHexColor(hoverColor)
      ? normalizeHexColor(hoverColor, deriveHoverHex(primary))
      : deriveHoverHex(primary);
    const matchingByHex = BRAND_THEME_PRESETS.find(
      (p) => p.primary.toUpperCase() === primary.toUpperCase()
    );
    resolvedPresetId = matchingByHex ? matchingByHex.id : 'custom';
  }

  const { r, g, b } = hexToRgb(primary);

  return {
    presetId: resolvedPresetId,
    primary,
    hover,
    active: mixHex(primary, '#000000', 0.28),
    light: mixHex(primary, '#FFFFFF', 0.45),
    soft: mixHex(primary, '#FFFFFF', 0.91),
    softHover: mixHex(primary, '#FFFFFF', 0.83),
    border: mixHex(primary, '#FFFFFF', 0.72),
    rgb: `${r}, ${g}, ${b}`,
  };
}

export function getBrandCssVariablesRecord(palette: ResolvedBrandPalette): Record<string, string> {
  return {
    '--brand-primary': palette.primary,
    '--brand-primary-hover': palette.hover,
    '--brand-primary-active': palette.active,
    '--brand-primary-light': palette.light,
    '--brand-primary-soft': palette.soft,
    '--brand-primary-soft-hover': palette.softHover,
    '--brand-primary-border': palette.border,
    '--brand-primary-rgb': palette.rgb,
    '--brand-red': palette.primary,
    '--brand-red-hover': palette.hover,
  };
}

export function getBrandCssVariablesStyle(palette: ResolvedBrandPalette): CSSProperties {
  return getBrandCssVariablesRecord(palette) as CSSProperties;
}

export function applyBrandThemeToDocument(palette: ResolvedBrandPalette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = getBrandCssVariablesRecord(palette);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
