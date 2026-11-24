'use client';

import { useState, useEffect, useRef } from 'react';
import { SITE_2FA_ISSUER, SITE_DOMAIN, SITE_NAME, SITE_SLUG } from '@/constants/site';
import {
  Settings,
  Globe,
  ShieldCheck,
  BarChart3,
  DollarSign,
  Mail,
  Lock,
  Save,
  RotateCcw,
  Undo2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Palette,
  Check,
  ExternalLink,
  Copy,
  FileCode2,
  Search,
  ChevronRight,
  ChevronDown,
  Bot,
  Zap,
  Play,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Pencil,
  Star,
} from 'lucide-react';
import {
  validateCustomHeadHtml,
  type CustomHeadValidationResult,
} from '@/components/seo/parseCustomHeadHtml';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSearchableSelect, { type SelectOption } from '@/components/admin/AdminSearchableSelect';
import ImageUpload from '@/components/admin/ImageUpload';
import { usePermission } from '@/lib/admin/usePermission';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import UnauthorizedAccess from '@/components/admin/UnauthorizedAccess';
import { settingService, type SystemSettingsMap } from '@/services/settingService';
import {
  aiService,
  type AiEngineStatus,
  type AiModelOption,
  type AiProviderConfigItem,
  type AiTestConnectionResult,
} from '@/services/aiService';
import { invalidateSiteSettingsCache } from '@/lib/admin/useSiteSettings';
import {
  BRAND_THEME_PRESETS,
  DEFAULT_BRAND_HOVER,
  DEFAULT_BRAND_PRESET,
  DEFAULT_BRAND_PRIMARY,
  applyBrandThemeToDocument,
  deriveHoverHex,
  isValidHexColor,
  normalizeHexColor,
  resolveBrandPalette,
} from '@/lib/brandTheme';
import { ROUTES } from '@/constants/routes';
import {
  AI_AUTO_PUBLISH_MODE_OPTIONS,
  AI_LANGUAGE_OPTIONS,
  AI_PROVIDER_PRESETS,
  AI_SAMPLE_RSS_FEEDS,
  AI_TONE_OPTIONS,
} from '@/constants/ai';
import Link from 'next/link';

type SettingsTab = 'general' | 'seo' | 'tracking' | 'ads' | 'newsletter' | 'ai' | 'security';

function getInitialTab(): SettingsTab {
  if (typeof window !== 'undefined') {
    const paramTab = new URLSearchParams(window.location.search).get('tab');
    if (
      paramTab === 'seo' ||
      paramTab === 'tracking' ||
      paramTab === 'ads' ||
      paramTab === 'general' ||
      paramTab === 'newsletter' ||
      paramTab === 'ai' ||
      paramTab === 'security'
    ) {
      return paramTab;
    }
  }
  return 'general';
}

export default function AdminSettingsPage() {
  const { hasPermission } = usePermission();
  const { toast, confirm } = useToast();
  const { t } = useAdminI18n();

  const [activeTab, setActiveTab] = useState<SettingsTab>(getInitialTab);
  const [navSearch, setNavSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [showPrimaryAiKey, setShowPrimaryAiKey] = useState<boolean>(false);
  const [aiEngineStatus, setAiEngineStatus] = useState<AiEngineStatus | null>(null);
  const [aiConfigs, setAiConfigs] = useState<AiProviderConfigItem[]>([]);
  const [editingAiConfigId, setEditingAiConfigId] = useState<number | null>(null);
  const [aiConfigForm, setAiConfigForm] = useState<{
    name: string;
    provider: string;
    apiKey: string;
    baseUrl: string;
    model: string;
  }>({
    name: '',
    provider: 'openrouter',
    apiKey: '',
    baseUrl: '',
    model: '',
  });
  const [savingAiConfig, setSavingAiConfig] = useState<boolean>(false);
  const [testingConfigId, setTestingConfigId] = useState<number | null>(null);
  const [liveAiModels, setLiveAiModels] = useState<AiModelOption[]>([]);
  const [loadingAiModels, setLoadingAiModels] = useState<boolean>(false);
  const [testingAi, setTestingAi] = useState<boolean>(false);
  const [aiTestResult, setAiTestResult] = useState<AiTestConnectionResult | null>(null);
  const [runningAutoPublish, setRunningAutoPublish] = useState<boolean>(false);

  // Database-driven state (populated strictly from GET /api/v1/admin/settings)
  const [settings, setSettings] = useState<SystemSettingsMap>({});
  const [savedSnapshot, setSavedSnapshot] = useState<SystemSettingsMap>({});

  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. Fetch settings from PostgreSQL on mount
  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await settingService.getAdminSettings();
      if (!isMountedRef.current) return;
      const resolved = data && typeof data === 'object' ? data : {};
      setSettings(resolved);
      setSavedSnapshot(resolved);
      aiService.getStatus().then((st) => {
        if (isMountedRef.current) setAiEngineStatus(st);
      }).catch(() => {});
      aiService.listConfigs().then((list) => {
        if (isMountedRef.current) setAiConfigs(list);
      }).catch(() => {});
      aiService.listModels().then((models) => {
        if (isMountedRef.current && models.length > 0) setLiveAiModels(models);
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Failed to load system settings from PostgreSQL:', err);
      toast.error(t('Failed to load settings from database.'));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // RBAC permission gate
  if (!hasPermission('setting.general')) {
    return <UnauthorizedAccess />;
  }

  // Dirty check: has the user made modifications compared to saved snapshot?
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSnapshot);

  const customHeadValidation = validateCustomHeadHtml(settings.custom_head_code);

  const formatCustomHeadError = (res: CustomHeadValidationResult): string => {
    const tag = res.tagName ? `<${res.tagName}>` : '';
    switch (res.errorCode) {
      case 'UNCLOSED_COMMENT':
        return t('Unclosed HTML comment (missing "-->").');
      case 'UNCLOSED_TAG':
        return `${t('Unclosed tag')}: ${tag}. ${t('Missing closing tag')} </${res.tagName}>.`;
      case 'UNEXPECTED_CLOSING_TAG':
        return `${t('Unexpected closing tag')}: </${res.tagName}>.`;
      case 'UNSUPPORTED_TAG':
        return `${t('Unsupported tag')}: ${tag}. ${t('Only <meta>, <link>, <script>, and <style> tags are allowed.')}`;
      case 'MALFORMED_ATTRIBUTES':
        return `${t('Malformed attributes in tag')} ${tag} (${t('unclosed quote or missing ">"')}).`;
      case 'META_MISSING_ATTRS':
        return t('<meta> tag must include attributes (e.g. name and content).');
      case 'LINK_MISSING_HREF':
        return t('<link> tag must include an "href" attribute.');
      case 'SCRIPT_EMPTY':
        return t('<script> tag must have a "src" attribute or inline JavaScript code.');
      case 'STYLE_EMPTY':
        return t('<style> tag must contain CSS rules.');
      default:
        return t('Invalid HTML format: only valid <meta>, <link>, <script>, or <style> tags are allowed.');
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const toggleField = (key: string, currentValue: string) => {
    const nextVal = currentValue === 'true' ? 'false' : 'true';
    updateField(key, nextVal);
  };

  const activeBrandPalette = resolveBrandPalette(
    settings.brand_theme_preset,
    settings.brand_primary_color,
    settings.brand_hover_color
  );

  const selectBrandPreset = (presetId: string, primary: string, hover: string) => {
    setSettings((prev) => ({
      ...prev,
      brand_theme_preset: presetId,
      brand_primary_color: primary,
      brand_hover_color: hover,
    }));
    applyBrandThemeToDocument(resolveBrandPalette(presetId, primary, hover));
  };

  const updateCustomPrimaryColor = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (isValidHexColor(trimmed)) {
      const normalized = normalizeHexColor(trimmed, DEFAULT_BRAND_PRIMARY);
      const nextHover = deriveHoverHex(normalized);
      setSettings((prev) => ({
        ...prev,
        brand_theme_preset: 'custom',
        brand_primary_color: normalized,
        brand_hover_color: nextHover,
      }));
      applyBrandThemeToDocument(resolveBrandPalette('custom', normalized, nextHover));
    } else {
      setSettings((prev) => ({
        ...prev,
        brand_theme_preset: 'custom',
        brand_primary_color: rawValue,
      }));
    }
  };

  const updateCustomHoverColor = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (isValidHexColor(trimmed)) {
      const normalized = normalizeHexColor(trimmed, DEFAULT_BRAND_HOVER);
      setSettings((prev) => ({
        ...prev,
        brand_theme_preset: 'custom',
        brand_hover_color: normalized,
      }));
      applyBrandThemeToDocument(
        resolveBrandPalette('custom', activeBrandPalette.primary, normalized)
      );
    } else {
      setSettings((prev) => ({
        ...prev,
        brand_theme_preset: 'custom',
        brand_hover_color: rawValue,
      }));
    }
  };

  // 2. Persist updated configuration to PostgreSQL
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customHeadValidation.valid) {
      setActiveTab('seo');
      toast.error(formatCustomHeadError(customHeadValidation));
      return;
    }
    setSaving(true);
    try {
      const updated = await settingService.updateAdminSettings(settings);
      invalidateSiteSettingsCache();
      if (!isMountedRef.current) return;
      setSettings(updated);
      setSavedSnapshot(updated);
      aiService.getStatus().then((st) => {
        if (isMountedRef.current) setAiEngineStatus(st);
      }).catch(() => {});
      toast.success(t('System configuration updated successfully!'));
    } catch (err: any) {
      console.error('Save settings failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to persist settings';
      toast.error(t(msg));
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  // 3. Discard unsaved changes
  const handleDiscard = () => {
    setSettings(savedSnapshot);
    applyBrandThemeToDocument(
      resolveBrandPalette(
        savedSnapshot.brand_theme_preset,
        savedSnapshot.brand_primary_color,
        savedSnapshot.brand_hover_color
      )
    );
    toast.info(t('Reverted changes to saved database state'));
  };

  // 4. Reset to Factory Baseline
  const handleResetToDefaults = async () => {
    const ok = await confirm({
      title: t('Reset System Settings to Factory Defaults?'),
      message: t('This will restore all 50 global settings in PostgreSQL back to factory baseline defaults. Custom domain IDs, meta tags, and ads will be restored. Continue?'),
      confirmText: t('Reset to Factory Baseline'),
      cancelText: t('Cancel'),
      variant: 'danger',
    });
    if (!ok) return;

    setResetting(true);
    try {
      const resetData = await settingService.resetToDefaults();
      invalidateSiteSettingsCache();
      if (!isMountedRef.current) return;
      setSettings(resetData);
      setSavedSnapshot(resetData);
      applyBrandThemeToDocument(
        resolveBrandPalette(
          resetData.brand_theme_preset || DEFAULT_BRAND_PRESET,
          resetData.brand_primary_color || DEFAULT_BRAND_PRIMARY,
          resetData.brand_hover_color || DEFAULT_BRAND_HOVER
        )
      );
      toast.success(t('All system settings reset to factory defaults!'));
    } catch (err: any) {
      console.error('Reset defaults failed:', err);
      toast.error(t('Failed to reset system settings'));
    } finally {
      if (isMountedRef.current) {
        setResetting(false);
      }
    }
  };

  const handleSelectTab = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const hasTrackingConfigured = Boolean(
    settings.gtm_id?.trim() || settings.gtag_id?.trim() || settings.facebook_pixel?.trim() || settings.cloudflare_token?.trim()
  );
  const hasAdsActive =
    settings.header_ads_active === 'true' || settings.news_side_banners_active === 'true';
  const hasNewsletterActive = settings.newsletter_enabled === 'true';
  const hasAiActive =
    settings.ai_enabled !== 'false' &&
    Boolean(aiEngineStatus?.ready || settings.ai_api_key?.trim() || settings.ai_provider === 'ollama');

  const refreshAiState = async () => {
    const [st, list] = await Promise.all([aiService.getStatus(), aiService.listConfigs()]);
    if (isMountedRef.current) {
      setAiEngineStatus(st);
      setAiConfigs(list);
    }
  };

  const resetAiConfigForm = () => {
    setEditingAiConfigId(null);
    setAiConfigForm({ name: '', provider: 'openrouter', apiKey: '', baseUrl: '', model: '' });
    setAiTestResult(null);
  };

  const handleSaveAiConfig = async () => {
    const provider = aiConfigForm.provider.trim();
    const model = aiConfigForm.model.trim();
    const apiKey = aiConfigForm.apiKey.trim();
    if (!provider || !model) {
      toast.error(t('Please select a Provider and Model first.'));
      return;
    }
    if (!editingAiConfigId && provider !== 'ollama' && !apiKey) {
      toast.error(t('Please enter an API Key for this provider.'));
      return;
    }
    setSavingAiConfig(true);
    try {
      const payload = {
        name: aiConfigForm.name.trim() || `${provider.toUpperCase()} — ${model}`,
        provider,
        apiKey: apiKey || undefined,
        baseUrl: aiConfigForm.baseUrl.trim() || undefined,
        model,
      };
      if (editingAiConfigId) {
        await aiService.updateConfig(editingAiConfigId, payload);
        toast.success(t('AI configuration updated in database!'));
      } else {
        await aiService.createConfig(payload);
        toast.success(t('AI configuration saved to database!'));
      }
      resetAiConfigForm();
      await refreshAiState();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save AI configuration.');
    } finally {
      setSavingAiConfig(false);
    }
  };

  const handleEditAiConfig = (cfg: AiProviderConfigItem) => {
    setEditingAiConfigId(cfg.id);
    setAiConfigForm({
      name: cfg.name,
      provider: cfg.provider,
      apiKey: '',
      baseUrl: cfg.baseUrl || '',
      model: cfg.model,
    });
    setAiTestResult(null);
    handleRefreshAiModels({ provider: cfg.provider, baseUrl: cfg.baseUrl || '' });
  };

  const handleDeleteAiConfig = async (cfg: AiProviderConfigItem) => {
    const ok = await confirm({
      title: t('Delete AI Configuration?'),
      message: `Delete "${cfg.name}" (${cfg.provider} / ${cfg.model}) from database?`,
      confirmText: t('Delete'),
      cancelText: t('Cancel'),
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await aiService.deleteConfig(cfg.id);
      if (editingAiConfigId === cfg.id) resetAiConfigForm();
      await refreshAiState();
      toast.success(t('AI configuration deleted.'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete configuration.');
    }
  };

  const handleSetDefaultAiConfig = async (id: number) => {
    try {
      await aiService.setDefaultConfig(id);
      await refreshAiState();
      toast.success(t('Default AI configuration updated!'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update default configuration.');
    }
  };

  const handleToggleFallbackAiConfig = async (id: number) => {
    try {
      await aiService.toggleFallbackConfig(id);
      await refreshAiState();
      toast.success(t('Fallback AI configuration updated!'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update fallback configuration.');
    }
  };

  const handleTestSavedConfig = async (cfg: AiProviderConfigItem) => {
    setTestingConfigId(cfg.id);
    try {
      const res = await aiService.testConnection({ configId: cfg.id });
      if (res?.success) {
        toast.success(`✓ ${cfg.name} connected (${res.model}) in ${res.latencyMs}ms!`);
      } else {
        toast.error(`${cfg.name}: ${res?.error || 'Connection failed'}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Connection test failed.');
    } finally {
      setTestingConfigId(null);
    }
  };

  const handleRefreshAiModels = async (override?: { provider?: string; apiKey?: string; baseUrl?: string }) => {
    setLoadingAiModels(true);
    try {
      const models = await aiService.listModels({
        provider: override?.provider ?? aiConfigForm.provider,
        apiKey: override?.apiKey ?? aiConfigForm.apiKey,
        baseUrl: override?.baseUrl ?? aiConfigForm.baseUrl,
        refresh: true,
      });
      if (isMountedRef.current) {
        setLiveAiModels(models);
        if (models.length > 0) {
          toast.success(`Loaded ${models.length} latest models!`);
        } else {
          toast.info('No live model list returned (enter API key or type any model ID directly).');
        }
      }
    } catch {
      toast.error('Failed to fetch live model list.');
    } finally {
      if (isMountedRef.current) setLoadingAiModels(false);
    }
  };

  const handleTestAiConnection = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await aiService.testConnection({
        configId: editingAiConfigId && !aiConfigForm.apiKey.trim() ? editingAiConfigId : undefined,
        provider: aiConfigForm.provider,
        apiKey: aiConfigForm.apiKey.trim() || undefined,
        model: aiConfigForm.model.trim() || undefined,
        baseUrl: aiConfigForm.baseUrl.trim() || undefined,
      });
      setAiTestResult(res);
      if (res?.success) {
        toast.success(`Connected (${res.model}) in ${res.latencyMs}ms!`);
      } else {
        toast.error(res?.error || 'AI connection test failed.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'AI connection test failed.';
      setAiTestResult({
        success: false,
        provider: aiConfigForm.provider || 'ai',
        model: aiConfigForm.model || '',
        latencyMs: 0,
        error: msg,
      });
      toast.error(msg);
    } finally {
      setTestingAi(false);
    }
  };

  const handleRunAutoPublishNow = async () => {
    if (isDirty) {
      toast.error('Please click "Save Changes" first before running Auto-Publisher.');
      return;
    }
    setRunningAutoPublish(true);
    try {
      const res = await aiService.runAutoPublishNow(1);
      if (res?.generatedCount > 0) {
        toast.success(`Generated ${res.generatedCount} post(s): "${res.createdTitles?.[0] || ''}"`);
      } else {
        toast.info(res?.message || 'No new articles generated in this run.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Auto-Publisher failed.');
    } finally {
      setRunningAutoPublish(false);
    }
  };

  const navGroups: Array<{
    groupLabel: string;
    items: Array<{
      id: SettingsTab;
      label: string;
      subtitle: string;
      icon: typeof Globe;
      status?: 'active' | 'warning';
    }>;
  }> = [
    {
      groupLabel: 'General',
      items: [
        {
          id: 'general',
          label: 'Brand & Identity',
          subtitle: 'Logo, theme palette & socials',
          icon: Globe,
        },
        {
          id: 'seo',
          label: 'SEO & Verification',
          subtitle: 'Meta tags, Search Console & <head>',
          icon: ShieldCheck,
          status: !customHeadValidation.valid ? 'warning' : undefined,
        },
      ],
    },
    {
      groupLabel: 'Growth & Monetization',
      items: [
        {
          id: 'tracking',
          label: 'Telemetry & GTM',
          subtitle: 'GTM, GA4, Meta Pixel & Analytics',
          icon: BarChart3,
          status: hasTrackingConfigured ? 'active' : undefined,
        },
        {
          id: 'ads',
          label: 'Monetization & Ads',
          subtitle: 'Header 728x90 & News side banners',
          icon: DollarSign,
          status: hasAdsActive ? 'active' : undefined,
        },
        {
          id: 'newsletter',
          label: 'Newsletter',
          subtitle: 'Homepage email dispatch block',
          icon: Mail,
          status: hasNewsletterActive ? 'active' : undefined,
        },
        {
          id: 'ai',
          label: 'AI Writer & Auto-Publish',
          subtitle: 'OpenRouter, DeepSeek, Gemini & RSS cron',
          icon: Bot,
          status: hasAiActive ? 'active' : undefined,
        },
      ],
    },
    {
      groupLabel: 'System & Security',
      items: [
        {
          id: 'security',
          label: 'Security & Policies',
          subtitle: '2FA rules & affiliate disclosure',
          icon: Lock,
        },
      ],
    },
  ];

  const allTabs = navGroups.flatMap((g) => g.items);
  const normalizedNavQuery = navSearch.trim().toLowerCase();
  const filteredNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: normalizedNavQuery
        ? group.items.filter(
            (item) =>
              item.label.toLowerCase().includes(normalizedNavQuery) ||
              t(item.label).toLowerCase().includes(normalizedNavQuery) ||
              item.subtitle.toLowerCase().includes(normalizedNavQuery)
          )
        : group.items,
    }))
    .filter((group) => group.items.length > 0);

  // GTM and GA4 format helpers
  const isGtmValid = !settings.gtm_id || /^GTM-[A-Z0-9]{4,10}$/i.test(settings.gtm_id.trim());
  const isGa4Valid = !settings.gtag_id || /^G-[A-Z0-9]{4,14}$/i.test(settings.gtag_id.trim());

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto w-full pb-16">
      {/* Page Title & Save Action */}
      <AdminPageHeader
        icon={Settings}
        title="System & Platform Configuration"
        description="Global metadata, search engine ownership verification tags, and third-party telemetry."
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToDefaults}
            disabled={loading || saving || resetting}
            className="shadow-2xs"
          >
            {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            <span>{t('Reset to Defaults')}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSave()}
            disabled={loading || saving || resetting}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? t('Saving...') : t('Save Changes')}</span>
          </Button>
        </div>
      </AdminPageHeader>

      {/* Dirty state notification bar */}
      {isDirty && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <div className="text-xs">
              <span className="font-bold text-amber-950">{t('You have unsaved changes')}: </span>
              <span className="text-amber-800">{t('Remember to save your configuration changes to persist them to the database.')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscard}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Undo2 size={13} />
              <span>{t('Discard Changes')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs font-bold bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{t('Save Changes')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile / Tablet Compact Horizontal Pill Bar */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {allTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`h-9 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 border ${
                isActive
                  ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              <span>{t(tab.label)}</span>
              {tab.status === 'active' && (
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
              )}
              {tab.status === 'warning' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Split Workspace: Compact Vertical Left Navigation Rail + Wide Right Settings Content */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* Desktop Compact Vertical Navigation Sidebar */}
        <aside className="hidden lg:block w-[224px] shrink-0 sticky top-20">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs space-y-3">
            {/* Quick Settings Filter */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder={t('Filter settings...')}
                className="w-full h-8 pl-7.5 pr-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition"
              />
            </div>

            {/* Grouped Navigation Sections */}
            <nav className="space-y-3">
              {filteredNavGroups.map((group) => (
                <div key={group.groupLabel} className="space-y-0.5">
                  <div className="px-2.5 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {t(group.groupLabel)}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          type="button"
                          key={tab.id}
                          onClick={() => handleSelectTab(tab.id)}
                          title={tab.subtitle}
                          className={`w-full text-left px-2.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 group border ${
                            isActive
                              ? 'bg-brand-primary-soft border-brand-primary-border shadow-2xs'
                              : 'border-transparent hover:bg-slate-50'
                          }`}
                        >
                          <Icon
                            size={15}
                            className={`shrink-0 transition ${
                              isActive
                                ? 'text-brand-primary'
                                : 'text-slate-400 group-hover:text-slate-700'
                            }`}
                          />
                          <span
                            className={`text-xs font-bold truncate flex-1 ${
                              isActive ? 'text-brand-primary' : 'text-slate-700 group-hover:text-slate-950'
                            }`}
                          >
                            {t(tab.label)}
                          </span>
                          {tab.status === 'active' && (
                            <span
                              title="Configured & Active"
                              className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                            />
                          )}
                          {tab.status === 'warning' && (
                            <span
                              title="Needs attention"
                              className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0 w-full">
          {loading ? (
            <Card className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500 rounded-2xl">
              <Loader2 className="animate-spin text-brand-primary" size={28} />
              <span className="text-xs font-semibold text-slate-500">
                {t('Loading system configuration from PostgreSQL...')}
              </span>
            </Card>
          ) : (
            <form noValidate onSubmit={handleSave} className="space-y-6">
          {/* =========================================================================
              TAB 1: BRAND & IDENTITY
             ========================================================================= */}
          {activeTab === 'general' && (
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
              <div className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Globe className="text-brand-primary" size={20} />
                  {t('Site Identity & Branding')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {t('Primary public branding displayed in headers and email footers')}
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Platform Public Name')}</label>
                  <Input
                    value={settings.site_name ?? ''}
                    onChange={(e) => updateField('site_name', e.target.value)}
                    placeholder={SITE_NAME}
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Tagline (SEO Title Suffix)')}</label>
                  <Input
                    value={settings.site_slogan ?? ''}
                    onChange={(e) => updateField('site_slogan', e.target.value)}
                    placeholder="Coupon Codes & Honest Tech Reviews"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Contact Support Email')}</label>
                  <Input
                    type="email"
                    value={settings.contact_email ?? ''}
                    onChange={(e) => updateField('contact_email', e.target.value)}
                    placeholder={`contact@${SITE_DOMAIN}`}
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Editorial Support Hotline')}</label>
                  <Input
                    value={settings.contact_hotline ?? ''}
                    onChange={(e) => updateField('contact_hotline', e.target.value)}
                    placeholder="+1 (800) 555-0199"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Corporate Office Address')}</label>
                  <Input
                    value={settings.contact_address ?? ''}
                    onChange={(e) => updateField('contact_address', e.target.value)}
                    placeholder="100 Montgomery St, Suite 1800, San Francisco, CA 94104"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Footer Copyright Notice')}</label>
                  <Input
                    value={settings.footer_copyright ?? ''}
                    onChange={(e) => updateField('footer_copyright', e.target.value)}
                    placeholder={`© 2026 ${SITE_NAME} Media Inc. All rights reserved.`}
                    className="font-medium"
                  />
                </div>

                {/* Social Channels */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {t('Social Channels')}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t('Public social profile URLs linked from the site header and footer.')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Facebook URL')}</label>
                      <Input
                        value={settings.social_facebook ?? ''}
                        onChange={(e) => updateField('social_facebook', e.target.value)}
                        placeholder={`https://facebook.com/${SITE_SLUG}`}
                        className="font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Twitter / X URL')}</label>
                      <Input
                        value={settings.social_twitter ?? ''}
                        onChange={(e) => updateField('social_twitter', e.target.value)}
                        placeholder={`https://x.com/${SITE_SLUG}`}
                        className="font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('YouTube URL')}</label>
                      <Input
                        value={settings.social_youtube ?? ''}
                        onChange={(e) => updateField('social_youtube', e.target.value)}
                        placeholder={`https://youtube.com/@${SITE_SLUG}`}
                        className="font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('TikTok URL')}</label>
                      <Input
                        value={settings.social_tiktok ?? ''}
                        onChange={(e) => updateField('social_tiktok', e.target.value)}
                        placeholder={`https://tiktok.com/@${SITE_SLUG}`}
                        className="font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo & Favicon Upload */}
                <div className="sm:col-span-2 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  <ImageUpload
                    label={t('Brand Logo')}
                    value={settings.site_logo ?? ''}
                    onChange={(url) => updateField('site_logo', url)}
                    folder="stores"
                    description={t('Upload or select a brand logo from the Media Library (must include tags).')}
                  />

                  <ImageUpload
                    label={t('Browser Favicon')}
                    value={settings.site_favicon ?? ''}
                    onChange={(url) => updateField('site_favicon', url)}
                    aspectRatio="square"
                    folder="stores"
                    description={t('Upload or select a 32x32 favicon icon from Media Library.')}
                  />
                </div>

                {/* Global Brand Color Theme (Client & Admin) */}
                <div className="sm:col-span-2 pt-4 border-t border-slate-100 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Palette className="text-brand-primary" size={16} />
                        {t('Brand Color Theme (Client & Admin)')}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t('Choose a curated color palette or enter any custom hex color. Changes apply across both the public Client Portal and Admin ProCMS.')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        selectBrandPreset(
                          DEFAULT_BRAND_PRESET,
                          DEFAULT_BRAND_PRIMARY,
                          DEFAULT_BRAND_HOVER
                        )
                      }
                      className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer self-start sm:self-auto"
                    >
                      {t('Restore Default Crimson')}
                    </button>
                  </div>

                  {/* Preset Swatches */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BRAND_THEME_PRESETS.map((preset) => {
                      const isSelected =
                        activeBrandPalette.presetId === preset.id &&
                        activeBrandPalette.primary === preset.primary;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            selectBrandPreset(preset.id, preset.primary, preset.hover)
                          }
                          className={`group flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-brand-primary bg-brand-primary-soft ring-2 ring-brand-primary/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white shadow-xs border border-black/10"
                            style={{ backgroundColor: preset.primary }}
                          >
                            {isSelected && <Check size={15} strokeWidth={3} />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {t(preset.name)}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {preset.primary}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Hex & Live Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          {t('Primary Brand Color')}
                        </label>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            aria-label="Primary Brand Color Picker"
                            value={activeBrandPalette.primary}
                            onChange={(e) => updateCustomPrimaryColor(e.target.value)}
                            className="w-10 h-10 rounded-xl border border-slate-200 bg-white p-1 cursor-pointer shrink-0"
                          />
                          <Input
                            value={settings.brand_primary_color ?? activeBrandPalette.primary}
                            onChange={(e) => updateCustomPrimaryColor(e.target.value)}
                            placeholder="#C62828"
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          {t('Hover / Darker Accent Color')}
                        </label>
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            aria-label="Hover Brand Color Picker"
                            value={activeBrandPalette.hover}
                            onChange={(e) => updateCustomHoverColor(e.target.value)}
                            className="w-10 h-10 rounded-xl border border-slate-200 bg-white p-1 cursor-pointer shrink-0"
                          />
                          <Input
                            value={settings.brand_hover_color ?? activeBrandPalette.hover}
                            onChange={(e) => updateCustomHoverColor(e.target.value)}
                            placeholder="#B71C1C"
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {t('Live Theme Preview')}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-primary-soft text-brand-primary border border-brand-primary-border">
                          {activeBrandPalette.presetId === 'custom'
                            ? t('Custom')
                            : t(
                                BRAND_THEME_PRESETS.find(
                                  (p) => p.id === activeBrandPalette.presetId
                                )?.name || activeBrandPalette.presetId
                              )}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold shadow-xs transition">
                          {t('Primary CTA Button')}
                        </span>
                        <span className="px-3 py-2 rounded-xl bg-brand-primary-soft text-brand-primary border border-brand-primary-border text-xs font-bold">
                          {t('Soft Pill Badge')}
                        </span>
                        <span className="text-xs font-bold text-brand-primary underline">
                          {t('Editorial Link')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t('Click "Save Changes" above to publish this palette for all visitors and admin users.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* =========================================================================
              TAB 2: SEO & SEARCH ENGINE OWNERSHIP VERIFICATION
             ========================================================================= */}
          {activeTab === 'seo' && (
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
              <div className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-brand-primary" size={20} />
                  {t('Search Engine Ownership Meta Tags')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {t('These verification tags are automatically injected into the public HTML <head> to certify ownership for Google and Bing.')}
                </CardDescription>
              </div>

              {/* Indexing Toggle */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">{t('Search Engine Indexing')}</span>
                    {settings.no_index === 'true' ? (
                      <Badge variant="destructive">noindex, nofollow</Badge>
                    ) : (
                      <Badge variant="success">index, follow</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {settings.no_index === 'true'
                      ? t('Block Search Crawlers (noindex, nofollow)')
                      : t('Allow Search Engines (index, follow)')}
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.no_index === 'true'}
                    onChange={() => toggleField('no_index', settings.no_index ?? 'false')}
                    className="w-4 h-4 accent-brand-primary"
                  />
                  <span>{t('Block search engines (noindex)')}</span>
                </label>
              </div>

              {/* Dynamic Sitemap XML & Robots.txt Quick Endpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    label: t('Dynamic Sitemap XML'),
                    badge: t('Real-time Auto-Sync'),
                    path: '/sitemap.xml',
                    desc: t('Automatically updates whenever Stores, Articles, Categories, Tags, or Static Pages change.'),
                  },
                  {
                    label: t('Dynamic Robots.txt'),
                    badge: settings.no_index === 'true' ? 'noindex' : t('Crawler Ready'),
                    path: '/robots.txt',
                    desc: t('Automatically synced with your Search Engine Indexing toggle and Canonical URL.'),
                  },
                ].map((item) => {
                  const baseOrigin = (settings.canonical_url?.trim() || `https://${SITE_DOMAIN}`).replace(/\/+$/, '');
                  const fullUrl = `${baseOrigin}${item.path}`;
                  return (
                    <div
                      key={item.path}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <FileCode2 size={14} className="text-brand-primary shrink-0" />
                            <span>{item.label}</span>
                          </span>
                          <Badge variant={item.path === '/robots.txt' && settings.no_index === 'true' ? 'destructive' : 'success'} className="text-[10px]">
                            {item.badge}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-[11px] font-mono text-slate-700 truncate">{fullUrl}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(fullUrl);
                              toast.success(t('Copied URL to clipboard!'));
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-brand-primary hover:bg-slate-100 transition cursor-pointer"
                            title={t('Copy URL')}
                          >
                            <Copy size={13} />
                          </button>
                          <a
                            href={item.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-slate-500 hover:text-brand-primary hover:bg-slate-100 transition"
                            title={t('Open in new tab')}
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Canonical Website URL')}</label>
                  <Input
                    value={settings.canonical_url ?? ''}
                    onChange={(e) => updateField('canonical_url', e.target.value)}
                    placeholder={`https://${SITE_DOMAIN}`}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Default Meta Title')}</label>
                  <Input
                    value={settings.meta_title ?? ''}
                    onChange={(e) => updateField('meta_title', e.target.value)}
                    placeholder={`${SITE_NAME} - Latest Deals, Verified Coupons & Shopping Reviews 2026`}
                    className="font-medium"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Default Meta Description')}</label>
                  <textarea
                    rows={3}
                    value={settings.meta_description ?? ''}
                    onChange={(e) => updateField('meta_description', e.target.value)}
                    placeholder="Discover verified promo codes, discounts, exclusive deals, and honest shopping reviews to save more every day."
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-medium placeholder:text-zinc-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      {t('Google Search Console Meta Tag')}
                    </label>
                    <Badge variant="secondary" className="text-[10px]">Googlebot</Badge>
                  </div>
                  <Input
                    value={settings.google_meta ?? ''}
                    onChange={(e) => updateField('google_meta', e.target.value)}
                    placeholder='<meta name="google-site-verification" content="google_auth_token_8892" />'
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      {t('Bing Webmaster Verification Meta Tag')}
                    </label>
                    <Badge variant="secondary" className="text-[10px]">Bingbot</Badge>
                  </div>
                  <Input
                    value={settings.bing_meta ?? ''}
                    onChange={(e) => updateField('bing_meta', e.target.value)}
                    placeholder='<meta name="msvalidate.01" content="bing_auth_token_4412" />'
                    className="font-mono text-xs"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700">
                      {t('Custom <head> Code (Verification Meta & Scripts)')}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {!customHeadValidation.valid ? (
                        <Badge variant="destructive" className="text-[10px]">
                          {t('Invalid Format')}
                        </Badge>
                      ) : customHeadValidation.tagCount > 0 ? (
                        <Badge variant="success" className="text-[10px]">
                          {customHeadValidation.tagCount} {t('valid tag(s)')}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="text-[10px] font-mono">&lt;head&gt;</Badge>
                    </div>
                  </div>
                  <textarea
                    rows={5}
                    value={settings.custom_head_code ?? ''}
                    onChange={(e) => updateField('custom_head_code', e.target.value)}
                    placeholder={'<meta name="impact-site-verification" value="..." />\n<meta name="verify-admitad" content="..." />\n<script async src="https://..."></script>'}
                    className={`w-full rounded-xl border bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 font-mono placeholder:text-zinc-400 ${
                      !customHeadValidation.valid
                        ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-zinc-200 focus:ring-brand-primary/20 focus:border-brand-primary'
                    }`}
                  />
                  {!customHeadValidation.valid ? (
                    <div className="flex items-start gap-1.5 text-[11px] font-medium text-rose-600">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>{formatCustomHeadError(customHeadValidation)}</span>
                    </div>
                  ) : customHeadValidation.tagCount > 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('HTML syntax is valid and ready for <head> injection.')}</span>
                    </div>
                  ) : null}
                  <p className="text-[11px] text-slate-500">
                    {t('Paste any <meta>, <link>, <script>, or <style> tags required by affiliate networks or tracking providers. Rendered server-side inside <head>.')}
                  </p>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <ImageUpload
                    label={t('Social Sharing Open Graph Image')}
                    value={settings.og_image ?? ''}
                    onChange={(url) => updateField('og_image', url)}
                    folder="articles"
                    description={t('Default 1200x630 image displayed when homepage and site links are shared on Facebook, X, and LinkedIn.')}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* =========================================================================
              TAB 3: TELEMETRY & TRACKING SCRIPTS
             ========================================================================= */}
          {activeTab === 'tracking' && (
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
              <div className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 className="text-brand-primary" size={20} />
                  {t('Telemetry & Event Tracking')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {t('Container IDs for Google Tag Manager, GA4, and conversion pixels')}
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-end">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 min-h-[24px]">
                    <label className="text-xs font-bold text-slate-700 leading-snug">{t('Google Tag Manager (GTM) Container ID')}</label>
                    {settings.gtm_id && (
                      <Badge variant={isGtmValid ? 'success' : 'destructive'} className="text-[10px] rounded-full shrink-0">
                        {isGtmValid ? 'Valid GTM format' : 'Format: GTM-XXXXXXX'}
                      </Badge>
                    )}
                  </div>
                  <Input
                    value={settings.gtm_id ?? ''}
                    onChange={(e) => updateField('gtm_id', e.target.value.toUpperCase())}
                    placeholder="GTM-BG9942A"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 min-h-[24px]">
                    <label className="text-xs font-bold text-slate-700 leading-snug">{t('Google Analytics 4 (GA4) Measurement ID')}</label>
                    {settings.gtag_id && (
                      <Badge variant={isGa4Valid ? 'success' : 'destructive'} className="text-[10px] rounded-full shrink-0">
                        {isGa4Valid ? 'Valid GA4 format' : 'Format: G-XXXXXXXXXX'}
                      </Badge>
                    )}
                  </div>
                  <Input
                    value={settings.gtag_id ?? ''}
                    onChange={(e) => updateField('gtag_id', e.target.value.toUpperCase())}
                    placeholder="G-772910842"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Meta / Facebook Pixel ID')}</label>
                  <Input
                    value={settings.facebook_pixel ?? ''}
                    onChange={(e) => updateField('facebook_pixel', e.target.value.replace(/\D/g, ''))}
                    placeholder="88291029481920"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Cloudflare Web Analytics Token')}</label>
                  <Input
                    value={settings.cloudflare_token ?? ''}
                    onChange={(e) => updateField('cloudflare_token', e.target.value)}
                    placeholder="cf_token_9918238472910"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* =========================================================================
              TAB 4: MONETIZATION & ADS (728x90 BANNER & AFFILIATE PARAMS)
             ========================================================================= */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              {/* Card 1: 728x90 Header Ad Banner */}
              <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <DollarSign className="text-brand-primary" size={20} />
                      {t('Desktop Header Banner 728x90')}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      {t('Configure promotional sponsorship banner shown on the public desktop header')}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <input
                        type="checkbox"
                        checked={settings.header_ads_active !== 'false'}
                        onChange={() => toggleField('header_ads_active', settings.header_ads_active ?? 'true')}
                        className="w-4 h-4 accent-brand-primary"
                      />
                      <span>{t('Active Banner')}</span>
                    </label>
                  </div>
                </div>

                {/* Banner Preview Frame */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    {t('Desktop Header Live Preview (728x90)')}
                  </span>
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-center overflow-x-auto">
                    <div className="relative w-[728px] h-[90px] rounded-xl overflow-hidden shadow-sm flex items-center justify-between px-6 border border-slate-800 shrink-0 bg-[#171717]">
                      {settings.header_ads_banner_img ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={settings.header_ads_banner_img}
                            alt="Header Ad"
                            className="absolute inset-0 w-full h-full object-cover opacity-35"
                          />
                          <div className="absolute inset-0 bg-linear-to-r from-slate-950/90 via-slate-950/65 to-transparent" />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-linear-to-r from-brand-primary-active/90 via-slate-950/90 to-slate-900" />
                      )}

                      <div className="relative z-10 space-y-0.5 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#EAB308] bg-[#EAB308]/15 px-2 py-0.5 rounded-full border border-[#EAB308]/30">
                            {settings.header_ads_badge || 'Partner Spotlight'}
                          </span>
                          <span className="text-[10px] text-zinc-300 font-semibold">
                            {settings.header_ads_subtitle || 'Vetted Promotion'}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white truncate">
                          {settings.header_ads_title || 'Seasonal Clearance Deals & Tested Coupons'}
                        </h4>
                        <p className="text-[10px] text-zinc-300 line-clamp-1">
                          {settings.header_ads_description || 'Tested directly against merchant checkouts.'}
                        </p>
                      </div>

                      <div className="relative z-10 shrink-0 pl-4">
                        <span className="h-7 px-3.5 inline-flex items-center justify-center text-[11px] font-bold text-white bg-brand-primary rounded-lg shadow-sm">
                          {settings.header_ads_button_text || 'Discover'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('Banner Eyebrow Badge')}</label>
                    <Input
                      value={settings.header_ads_badge ?? ''}
                      onChange={(e) => updateField('header_ads_badge', e.target.value)}
                      placeholder="Partner Spotlight"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('Banner Subtitle Tag')}</label>
                    <Input
                      value={settings.header_ads_subtitle ?? ''}
                      onChange={(e) => updateField('header_ads_subtitle', e.target.value)}
                      placeholder="Vetted Promotion"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('Banner Headline Title')}</label>
                    <Input
                      value={settings.header_ads_title ?? ''}
                      onChange={(e) => updateField('header_ads_title', e.target.value)}
                      placeholder="Seasonal Consumer Tech & Smart Home Clearance Deals"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('Banner Supporting Description')}</label>
                    <Input
                      value={settings.header_ads_description ?? ''}
                      onChange={(e) => updateField('header_ads_description', e.target.value)}
                      placeholder="Hand-tested promo codes checked against live merchant checkouts."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('CTA Button Text')}</label>
                    <Input
                      value={settings.header_ads_button_text ?? ''}
                      onChange={(e) => updateField('header_ads_button_text', e.target.value)}
                      placeholder="Discover"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">{t('Destination Sponsor URL')}</label>
                    <Input
                      value={settings.header_ads_banner_url ?? ''}
                      onChange={(e) => updateField('header_ads_banner_url', e.target.value)}
                      placeholder={`https://www.anker.com/?cj_ref=${SITE_SLUG}`}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <ImageUpload
                      label={t('Banner Creative Image URL (728x90 px)')}
                      value={settings.header_ads_banner_img ?? ''}
                      onChange={(url) => updateField('header_ads_banner_img', url)}
                      aspectRatio="banner"
                      folder="stores"
                      description={t('Upload a 728x90 banner background image, choose from Media Library, or paste an image URL.')}
                    />
                  </div>
                </div>
              </Card>

              {/* Card 1B: News Article Side Banners (Left & Right Sticky Skyscrapers) */}
              <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="text-indigo-500" size={20} />
                      {t('News Article Side Banners (Left & Right)')}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('Automatically shown on the left & right sides of News articles (posts without a linked Store) on Desktop.')}
                    </p>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.news_side_banners_active === 'true'}
                      onChange={(e) => updateField('news_side_banners_active', e.target.checked ? 'true' : 'false')}
                      className="w-4 h-4 text-brand-primary rounded focus:ring-brand-primary/30"
                    />
                    <span className="text-xs font-bold text-slate-800">{t('Enable News Side Banners')}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Left Side Banner */}
                  <div className="flex flex-col justify-between space-y-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {t('Left Side Banner (Recommended 160×600 or 300×600 px)')}
                    </div>
                    <ImageUpload
                      label={t('Left Banner Image')}
                      value={settings.news_left_banner_img ?? ''}
                      onChange={(url) => updateField('news_left_banner_img', url)}
                      aspectRatio="square"
                      folder="stores"
                      description={t('Upload, paste (Cmd+V), or select a vertical banner image for the left side of News pages.')}
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Left Banner Destination URL')}</label>
                      <Input
                        value={settings.news_left_banner_url ?? ''}
                        onChange={(e) => updateField('news_left_banner_url', e.target.value)}
                        placeholder={`https://partner-offer.com/?ref=${SITE_SLUG}`}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Left Banner Alt / Title')}</label>
                      <Input
                        value={settings.news_left_banner_alt ?? ''}
                        onChange={(e) => updateField('news_left_banner_alt', e.target.value)}
                        placeholder="Exclusive Partner Deal"
                      />
                    </div>
                  </div>

                  {/* Right Side Banner */}
                  <div className="flex flex-col justify-between space-y-4 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                      {t('Right Side Banner (Recommended 160×600 or 300×600 px)')}
                    </div>
                    <ImageUpload
                      label={t('Right Banner Image')}
                      value={settings.news_right_banner_img ?? ''}
                      onChange={(url) => updateField('news_right_banner_img', url)}
                      aspectRatio="square"
                      folder="stores"
                      description={t('Upload, paste (Cmd+V), or select a vertical banner image for the right side of News pages.')}
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Right Banner Destination URL')}</label>
                      <Input
                        value={settings.news_right_banner_url ?? ''}
                        onChange={(e) => updateField('news_right_banner_url', e.target.value)}
                        placeholder={`https://partner-offer.com/?ref=${SITE_SLUG}`}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Right Banner Alt / Title')}</label>
                      <Input
                        value={settings.news_right_banner_alt ?? ''}
                        onChange={(e) => updateField('news_right_banner_alt', e.target.value)}
                        placeholder="Featured Promo"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 2: FTC Compliance & Affiliate Disclosure */}
              <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
                <div className="border-b border-slate-100 pb-4">
                  <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={20} />
                    {t('FTC Affiliate Disclosure')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {t('Configure the public FTC compliance disclosure displayed across reviews, buying guides, and coupon modals.')}
                  </CardDescription>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('FTC Affiliate Disclosure Statement')}</label>
                  <textarea
                    rows={2}
                    value={settings.affiliate_disclosure ?? ''}
                    onChange={(e) => updateField('affiliate_disclosure', e.target.value)}
                    placeholder={`${SITE_NAME} is reader-supported. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you.`}
                    className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-medium placeholder:text-zinc-400"
                  />
                  <span className="text-[11px] text-slate-500">
                    {t('Displayed prominently across public reviews, buying guides, and coupon modals.')}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* =========================================================================
              TAB 5: NEWSLETTER & DISPATCH
             ========================================================================= */}
          {activeTab === 'newsletter' && (
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Mail className="text-brand-primary" size={20} />
                    {t('Homepage Newsletter Block')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {t('Content of the "Dispatch" signup section at the bottom of the homepage. Signups are listed in')}{' '}
                    <Link href={ROUTES.ADMIN.SUBSCRIBERS} className="text-brand-primary font-bold hover:underline">
                      {t('Newsletter Subscribers')}
                    </Link>
                    .
                  </CardDescription>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={settings.newsletter_enabled !== 'false'}
                    onChange={() => toggleField('newsletter_enabled', settings.newsletter_enabled ?? 'true')}
                    className="w-4 h-4 accent-brand-primary"
                  />
                  <span>{t('Show on homepage')}</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Eyebrow Label')}</label>
                  <Input
                    value={settings.newsletter_eyebrow ?? ''}
                    onChange={(e) => updateField('newsletter_eyebrow', e.target.value)}
                    placeholder={`The ${SITE_NAME} Dispatch`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Headline')}</label>
                  <Input
                    value={settings.newsletter_title ?? ''}
                    onChange={(e) => updateField('newsletter_title', e.target.value)}
                    placeholder="Independent Reviews & Product Tests, Weekly"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{t('Description')}</label>
                <textarea
                  rows={3}
                  value={settings.newsletter_description ?? ''}
                  onChange={(e) => updateField('newsletter_description', e.target.value)}
                  placeholder="Zero sponsored ranking manipulation. Join 45,000+ smart readers who rely on our independent testing laboratory."
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-medium placeholder:text-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Email Input Placeholder')}</label>
                  <Input
                    value={settings.newsletter_placeholder ?? ''}
                    onChange={(e) => updateField('newsletter_placeholder', e.target.value)}
                    placeholder="Enter your email address..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Button Text')}</label>
                  <Input
                    value={settings.newsletter_button_text ?? ''}
                    onChange={(e) => updateField('newsletter_button_text', e.target.value)}
                    placeholder="Subscribe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{t('Success Message')}</label>
                <Input
                  value={settings.newsletter_success_message ?? ''}
                  onChange={(e) => updateField('newsletter_success_message', e.target.value)}
                  placeholder="Thank you for subscribing! Watch your inbox for the next Dispatch."
                />
              </div>

              {/* Live Preview */}
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {t('Live Preview')}
                </span>
                <div
                  className={`border border-slate-200 rounded-2xl p-6 bg-slate-50 text-center space-y-2 ${
                    settings.newsletter_enabled !== 'false' ? '' : 'opacity-40'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary block">
                    {settings.newsletter_eyebrow || `The ${SITE_NAME} Dispatch`}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {settings.newsletter_title || 'Independent Reviews'}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    {settings.newsletter_description}
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-2 max-w-sm mx-auto">
                    <div className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-left text-slate-500">
                      {settings.newsletter_placeholder || 'Enter your email...'}
                    </div>
                    <span className="bg-brand-primary text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs">
                      {settings.newsletter_button_text || 'Subscribe'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* =========================================================================
              TAB 6: AI CONFIGURATIONS (DATABASE-STORED) & SCHEDULED AUTO-PUBLISHER
             ========================================================================= */}
          {activeTab === 'ai' && (() => {
            const selectedProvider = aiConfigForm.provider || 'openrouter';
            const providerMeta = AI_PROVIDER_PRESETS[selectedProvider] || AI_PROVIDER_PRESETS.openrouter;
            const isKeylessProvider = selectedProvider === 'ollama';
            const canSelectModel =
              isKeylessProvider ||
              Boolean(aiConfigForm.apiKey.trim()) ||
              Boolean(editingAiConfigId);

            return (
              <div className="space-y-5">
                {/* Card 1: Saved AI Configurations (PostgreSQL ai_provider_configs) */}
                <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
                  <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Bot className="text-brand-primary" size={20} />
                        {t('AI Configurations (Database)')}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        {t('Save multiple API Keys & Models (Ollama, OpenRouter, OpenAI, Claude, Gemini, Qwen, Kimi...) to PostgreSQL and switch anytime.')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={ROUTES.ADMIN.AI_CHAT}
                        className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition"
                      >
                        <Sparkles size={13} className="text-brand-primary" />
                        <span>{t('Open AI Chat')}</span>
                      </Link>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
                        <input
                          type="checkbox"
                          checked={settings.ai_enabled !== 'false'}
                          onChange={() => toggleField('ai_enabled', settings.ai_enabled ?? 'true')}
                          className="w-4 h-4 accent-brand-primary rounded"
                        />
                        <span className="text-xs font-bold text-slate-800">{t('Enable AI Writer')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Saved Configurations Table / Cards */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                        {t('Saved Configurations')} ({aiConfigs.length})
                      </h4>
                      {editingAiConfigId && (
                        <button
                          type="button"
                          onClick={resetAiConfigForm}
                          className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                        >
                          + {t('Create New Instead')}
                        </button>
                      )}
                    </div>

                    {aiConfigs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          {t('No AI configurations saved in database yet.')}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {t('Complete Step 1 & Step 2 below and click "Save Configuration" to store your API Key & Model.')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {aiConfigs.map((cfg) => (
                          <div
                            key={cfg.id}
                            className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 transition ${
                              cfg.isDefault
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : editingAiConfigId === cfg.id
                                  ? 'bg-indigo-50/50 border-indigo-300'
                                  : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black text-slate-900 truncate">
                                  {cfg.name}
                                </span>
                                {cfg.isDefault && (
                                  <Badge variant="success" className="text-[10px]">
                                    ★ {t('Default')}
                                  </Badge>
                                )}
                                {cfg.isFallback && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {t('Fallback')}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-bold">
                                  {cfg.provider}
                                </span>
                                <span className="truncate max-w-[260px] text-slate-700">{cfg.model}</span>
                                <span className="text-slate-400">•</span>
                                <span>
                                  {cfg.hasApiKey ? cfg.maskedApiKey : t('No key (Local)')}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleTestSavedConfig(cfg)}
                                disabled={testingConfigId === cfg.id}
                                className="h-8 px-2.5 text-[11px] font-bold bg-white cursor-pointer"
                              >
                                {testingConfigId === cfg.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Zap size={12} className="text-amber-500" />
                                )}
                                <span>Test</span>
                              </Button>
                              {!cfg.isDefault && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefaultAiConfig(cfg.id)}
                                  className="h-8 px-2.5 text-[11px] font-bold bg-white cursor-pointer"
                                >
                                  <Star size={12} className="text-emerald-600" />
                                  <span>{t('Set Default')}</span>
                                </Button>
                              )}
                              {!cfg.isDefault && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleFallbackAiConfig(cfg.id)}
                                  className="h-8 px-2.5 text-[11px] font-bold bg-white cursor-pointer"
                                >
                                  <span>{cfg.isFallback ? t('Unset Fallback') : t('Set Fallback')}</span>
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditAiConfig(cfg)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 inline-flex items-center justify-center cursor-pointer"
                                title={t('Edit')}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAiConfig(cfg)}
                                className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 inline-flex items-center justify-center cursor-pointer"
                                title={t('Delete')}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add / Edit Configuration Form (Step 1 -> Step 2) */}
                  <div className="pt-5 border-t border-slate-100 space-y-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[11px] font-black inline-flex items-center justify-center">
                          1
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {editingAiConfigId ? t('Edit Saved Configuration') : t('Add New AI Configuration')}
                        </h4>
                      </div>
                      <a
                        href={providerMeta.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-brand-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>{t('Get API Key')}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">{t('Profile Name')}</label>
                        <Input
                          value={aiConfigForm.name}
                          onChange={(e) => setAiConfigForm((p) => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Ollama Local, OpenRouter Free, OpenAI Pro..."
                          className="text-xs h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">{t('AI Provider')}</label>
                        <AdminSearchableSelect
                          value={selectedProvider}
                          onChange={(next) => {
                            setAiConfigForm((p) => ({ ...p, provider: next, model: '' }));
                            setAiTestResult(null);
                            if (next === 'ollama' || aiConfigForm.apiKey.trim()) {
                              handleRefreshAiModels({
                                provider: next,
                                apiKey: aiConfigForm.apiKey,
                                baseUrl: aiConfigForm.baseUrl,
                              });
                            } else {
                              setLiveAiModels([]);
                            }
                          }}
                          searchPlaceholder="Search provider..."
                          triggerClassName="h-10 bg-white"
                          options={Object.entries(AI_PROVIDER_PRESETS).map(([key, meta]) => ({
                            value: key,
                            label: meta.label,
                            sublabel: meta.baseUrl || 'Custom OpenAI-compatible Base URL',
                          }))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">
                          {t('API Key')}
                          {!isKeylessProvider && !editingAiConfigId && (
                            <span className="text-rose-500 ml-1">*</span>
                          )}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPrimaryAiKey ? 'text' : 'password'}
                              autoComplete="new-password"
                              name="ai_config_api_key"
                              value={aiConfigForm.apiKey}
                              onChange={(e) => setAiConfigForm((p) => ({ ...p, apiKey: e.target.value }))}
                              onBlur={() => {
                                if (aiConfigForm.apiKey.trim()) {
                                  handleRefreshAiModels({
                                    provider: selectedProvider,
                                    apiKey: aiConfigForm.apiKey.trim(),
                                    baseUrl: aiConfigForm.baseUrl,
                                  });
                                }
                              }}
                              placeholder={
                                editingAiConfigId
                                  ? 'Leave blank to keep saved key...'
                                  : providerMeta.keyPlaceholder
                              }
                              className="font-mono text-xs pr-9 h-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPrimaryAiKey((p) => !p)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              {showPrimaryAiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRefreshAiModels({
                                provider: selectedProvider,
                                apiKey: aiConfigForm.apiKey,
                                baseUrl: aiConfigForm.baseUrl,
                              })
                            }
                            disabled={loadingAiModels || !canSelectModel}
                            className="h-10 px-2.5 font-bold shrink-0 cursor-pointer"
                            title="Load latest models from this provider"
                          >
                            <RotateCcw size={13} className={loadingAiModels ? 'animate-spin' : ''} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {(selectedProvider === 'ollama' || selectedProvider === 'custom' || Boolean(aiConfigForm.baseUrl.trim())) && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">{t('Custom Base URL')}</label>
                        <Input
                          value={aiConfigForm.baseUrl}
                          onChange={(e) => setAiConfigForm((p) => ({ ...p, baseUrl: e.target.value }))}
                          placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434 (auto-detected)' : 'https://your-provider.com/v1'}
                          className="font-mono text-xs h-10"
                        />
                      </div>
                    )}

                    {/* STEP 2: Pick Model & Save to DB */}
                    <div className={`space-y-3 transition-opacity ${canSelectModel ? 'opacity-100' : 'opacity-60'}`}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full text-[11px] font-black inline-flex items-center justify-center ${
                            canSelectModel ? 'bg-brand-primary text-white' : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          2
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          {t('Select Model & Save to Database')}
                        </h4>
                        {canSelectModel && liveAiModels.length > 0 && (
                          <span className="text-[11px] text-slate-500 font-semibold">
                            ({liveAiModels.length} live)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1">
                          <AdminSearchableSelect
                            value={aiConfigForm.model}
                            onChange={(val) => setAiConfigForm((p) => ({ ...p, model: val }))}
                            disabled={!canSelectModel}
                            allowCustomValue
                            placeholder={
                              canSelectModel
                                ? 'Select a live model or type any custom model ID...'
                                : 'Enter API Key in Step 1 first...'
                            }
                            searchPlaceholder="Search model or type custom ID..."
                            emptyText="Click refresh icon above or type any model ID directly"
                            triggerClassName="h-10 bg-white"
                            options={liveAiModels.map<SelectOption>((m) => ({
                              value: m.id,
                              label: m.free ? `⚡ ${m.name}` : m.name,
                              sublabel: m.free ? `${m.id} • FREE` : m.id,
                            }))}
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleTestAiConnection}
                            disabled={testingAi || !canSelectModel || !aiConfigForm.model.trim()}
                            className="h-10 px-3.5 font-bold bg-white cursor-pointer"
                          >
                            {testingAi ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} className="text-amber-500" />}
                            <span>{t('Test')}</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSaveAiConfig}
                            disabled={savingAiConfig || !canSelectModel || !aiConfigForm.model.trim()}
                            className="h-10 px-4 font-bold cursor-pointer"
                          >
                            {savingAiConfig ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            <span>{editingAiConfigId ? t('Update Config') : t('Save Config')}</span>
                          </Button>
                        </div>
                      </div>

                      {aiTestResult && (
                        <div className="text-xs">
                          {aiTestResult.success ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                              <CheckCircle2 size={14} />
                              <span>Connected: {aiTestResult.model} ({aiTestResult.latencyMs}ms)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                              <AlertCircle size={14} />
                              <span className="max-w-lg truncate">{aiTestResult.error}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editorial Style Defaults */}
                  <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Default Article Language')}</label>
                      <AdminSearchableSelect
                        value={settings.ai_default_language || 'English'}
                        onChange={(val) => updateField('ai_default_language', val)}
                        searchable={false}
                        triggerClassName="h-10 bg-white"
                        options={[...AI_LANGUAGE_OPTIONS]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Default Editorial Tone')}</label>
                      <AdminSearchableSelect
                        value={settings.ai_default_tone || 'Editorial & Objective'}
                        onChange={(val) => updateField('ai_default_tone', val)}
                        searchable={false}
                        triggerClassName="h-10 bg-white"
                        options={[...AI_TONE_OPTIONS]}
                      />
                    </div>
                  </div>
                </Card>

                {/* Card 2: Scheduled Auto-Publisher */}
                <Card className="p-6 sm:p-7 space-y-5 rounded-2xl">
                  <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Play className="text-emerald-600" size={18} />
                        {t('Scheduled AI Auto-Publisher')}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        {t('Automatically scans RSS feeds for News and unreviewed Stores on a schedule (every 4 hours), creating fresh SEO articles.')}
                      </CardDescription>
                    </div>
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
                      <input
                        type="checkbox"
                        checked={settings.ai_auto_enabled === 'true'}
                        onChange={() => toggleField('ai_auto_enabled', settings.ai_auto_enabled ?? 'false')}
                        className="w-4 h-4 accent-brand-primary rounded"
                      />
                      <span className="text-xs font-bold text-slate-800">{t('Enable Auto-Publisher Cron')}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Publishing Mode')}</label>
                      <AdminSearchableSelect
                        value={settings.ai_auto_mode || 'draft'}
                        onChange={(val) => updateField('ai_auto_mode', val)}
                        searchable={false}
                        triggerClassName="h-10 bg-white"
                        options={[...AI_AUTO_PUBLISH_MODE_OPTIONS]}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('Max Articles Per Day (SEO Safe: 2-5)')}</label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={settings.ai_auto_daily_limit ?? '3'}
                        onChange={(e) => updateField('ai_auto_daily_limit', e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={settings.ai_auto_include_reviews !== 'false'}
                          onChange={() =>
                            updateField(
                              'ai_auto_include_reviews',
                              settings.ai_auto_include_reviews === 'false' ? 'true' : 'false'
                            )
                          }
                          className="w-4 h-4 accent-brand-primary rounded"
                        />
                        <span className="text-xs font-bold text-slate-700">{t('Auto-write missing Store Reviews')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700">
                        {t('RSS News Feed URLs (One URL per line — auto-routed to /news)')}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'ai_auto_rss_feeds',
                            AI_SAMPLE_RSS_FEEDS.join('\n')
                          )
                        }
                        className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                      >
                        + Fill Sample Tech &amp; Consumer RSS Feeds
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={settings.ai_auto_rss_feeds ?? ''}
                      onChange={(e) => updateField('ai_auto_rss_feeds', e.target.value)}
                      placeholder={'https://news.google.com/rss/search?q=smart+home+tech&hl=en-US&gl=US&ceid=US:en\nhttps://techcrunch.com/feed/'}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {t('Run 1 article immediately to verify your Auto-Publisher pipeline end-to-end.')}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleRunAutoPublishNow}
                      disabled={runningAutoPublish || saving || (aiConfigs.length === 0 && !aiEngineStatus?.ready)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                    >
                      {runningAutoPublish ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      <span>{runningAutoPublish ? t('Generating 1 Article...') : t('Run Auto-Publisher Now (1 Post)')}</span>
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })()}

          {activeTab === 'security' && (
            <Card className="p-6 sm:p-7 space-y-6 rounded-2xl">
              <div className="border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Lock className="text-brand-primary" size={20} />
                  {t('Security & Access Policies')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {t('Global login lockout windows, TOTP authenticator tolerances, and developer bypass modes.')}
                </CardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Max Failed Login Attempts')}</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.auth_max_failed_attempts ?? '5'}
                    onChange={(e) => updateField('auth_max_failed_attempts', e.target.value)}
                    className="font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {t('Accounts are temporarily locked after reaching this number of sequential password failures.')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('Account Lockout Duration (Seconds)')}</label>
                  <Input
                    type="number"
                    min="5"
                    max="3600"
                    value={settings.auth_lockout_seconds ?? '30'}
                    onChange={(e) => updateField('auth_lockout_seconds', e.target.value)}
                    className="font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {t('Cooldown window duration during which authentication requests from locked accounts are rejected.')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('2FA Authenticator Issuer Name')}</label>
                  <Input
                    value={settings.two_factor_issuer ?? SITE_2FA_ISSUER}
                    onChange={(e) => updateField('two_factor_issuer', e.target.value)}
                    className="font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {t('Label registered into user authenticator apps (e.g. Google Authenticator, 1Password).')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{t('2FA TOTP Window Size Tolerance')}</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.two_factor_window_size ?? '3'}
                    onChange={(e) => updateField('two_factor_window_size', e.target.value)}
                    className="font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {t('Number of 30-second time steps permitted for clock drift compensation between server and phone.')}
                  </span>
                </div>

                {/* Developer 2FA Bypass Mode */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{t('Developer 2FA Bypass Mode')}</span>
                        {settings.two_factor_dev_bypass_enabled === 'true' ? (
                          <Badge variant="warning">Dev Bypass Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled (Strict)</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t('Allows automated test suites and local development environments to authenticate using the static dev test code.')}
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.two_factor_dev_bypass_enabled === 'true'}
                        onChange={() => toggleField('two_factor_dev_bypass_enabled', settings.two_factor_dev_bypass_enabled ?? 'false')}
                        className="w-4 h-4 accent-brand-primary"
                      />
                      <span>{t('Enable Dev 2FA Bypass')}</span>
                    </label>
                  </div>

                  {settings.two_factor_dev_bypass_enabled === 'true' && (
                    <div className="space-y-1.5 max-w-sm">
                      <label className="text-xs font-bold text-slate-700">{t('Developer Test OTP Passcode')}</label>
                      <Input
                        value={settings.two_factor_dev_otp ?? ''}
                        onChange={(e) => updateField('two_factor_dev_otp', e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit OTP"
                        className="font-mono text-xs font-bold tracking-widest"
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
