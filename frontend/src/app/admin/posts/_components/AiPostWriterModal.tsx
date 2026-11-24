'use client';

import { useState, useEffect } from 'react';
import { Bot, Sparkles, X, Loader2, ShieldCheck, Newspaper, Globe, Link as LinkIcon } from 'lucide-react';
import { aiService, type AiGeneratedPostResult, type AiModelOption, type AiProviderConfigItem } from '@/services/aiService';
import AdminSearchableSelect, { type SelectOption } from '@/components/admin/AdminSearchableSelect';
import { useToast } from '@/context/ToastContext';

interface StoreOptionLite {
  slug: string;
  name: string;
}

interface AiPostWriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreOptionLite[];
  initialStoreSlug?: string;
  onEnsureStoresLoaded: () => void;
  onGenerated: (result: AiGeneratedPostResult) => void;
}

export default function AiPostWriterModal({
  isOpen,
  onClose,
  stores,
  initialStoreSlug,
  onEnsureStoresLoaded,
  onGenerated,
}: AiPostWriterModalProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'review' | 'news'>(initialStoreSlug ? 'review' : 'news');
  const [storeSlug, setStoreSlug] = useState<string>(initialStoreSlug || '');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [language, setLanguage] = useState<string>('English');
  const [wordCount, setWordCount] = useState<number>(1100);
  const [savedConfigs, setSavedConfigs] = useState<AiProviderConfigItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [liveModels, setLiveModels] = useState<AiModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const loadModelsForConfig = (cfgIdStr: string) => {
    setLoadingModels(true);
    aiService
      .listModels({ configId: cfgIdStr ? Number(cfgIdStr) : undefined })
      .then((list) => setLiveModels(list))
      .catch(() => setLiveModels([]))
      .finally(() => setLoadingModels(false));
  };

  useEffect(() => {
    if (isOpen) {
      onEnsureStoresLoaded();
      aiService
        .listConfigs()
        .then((configs) => {
          setSavedConfigs(configs);
          const def = configs.find((c) => c.isDefault) || configs[0];
          if (def && !selectedConfigId) {
            setSelectedConfigId(String(def.id));
            setModel(def.model || '');
            loadModelsForConfig(String(def.id));
          } else if (liveModels.length === 0) {
            loadModelsForConfig(selectedConfigId);
          }
        })
        .catch(() => {
          if (liveModels.length === 0) loadModelsForConfig('');
        });
      if (initialStoreSlug) {
        setMode('review');
        setStoreSlug(initialStoreSlug);
      }
    }
  }, [isOpen, initialStoreSlug, onEnsureStoresLoaded]);

  const handleSelectConfig = (nextId: string) => {
    setSelectedConfigId(nextId);
    const matched = savedConfigs.find((c) => String(c.id) === nextId);
    setModel(matched?.model || '');
    loadModelsForConfig(nextId);
  };

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (mode === 'review' && !storeSlug && !topic.trim()) {
      toast.error('Please pick a Store or enter a review topic.');
      return;
    }
    if (mode === 'news' && !sourceUrl.trim() && !topic.trim()) {
      toast.error('Please paste a Source URL or enter a News topic.');
      return;
    }

    setGenerating(true);
    try {
      const result = await aiService.generatePost({
        mode,
        storeSlug: mode === 'review' ? storeSlug || undefined : undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        topic: topic.trim() || undefined,
        language,
        configId: selectedConfigId ? Number(selectedConfigId) : undefined,
        model: model || undefined,
        wordCount,
      });
      onGenerated(result);
      toast.success(
        `AI generated "${result.title}" (${result.modelUsed || 'AI'})!`
      );
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'AI generation failed. Check your API key in Settings -> AI Writer.';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-violet-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                AI Auto-Write Article
              </h3>
              <p className="text-[11px] text-slate-500">
                Auto-generates SEO Title, Slug, Excerpt, Rich HTML, Meta Tags &amp; Tags in 1 click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMode('review')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                mode === 'review'
                  ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <ShieldCheck size={18} className={mode === 'review' ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
              <div>
                <div className="text-xs font-black text-slate-900">Product Review (/reviews)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Reads Store profile + live Coupons from DB
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('news')}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                mode === 'news'
                  ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <Newspaper size={18} className={mode === 'news' ? 'text-indigo-600 shrink-0 mt-0.5' : 'text-slate-400 shrink-0 mt-0.5'} />
              <div>
                <div className="text-xs font-black text-slate-900">News Article (/news)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Rewrites from any news URL or topic (no Store)
                </div>
              </div>
            </button>
          </div>

          {/* Review Store Picker */}
          {mode === 'review' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Partner Store</label>
              <AdminSearchableSelect
                value={storeSlug}
                onChange={setStoreSlug}
                placeholder="Select a Store to pull real details & coupons..."
                searchPlaceholder="Search store..."
                triggerClassName="h-10 bg-white"
                options={[
                  { value: '', label: 'None (Write from topic / URL only)' },
                  ...stores.map<SelectOption>((s) => ({
                    value: s.slug,
                    label: s.name,
                    sublabel: `/store/${s.slug}`,
                  })),
                ]}
              />
            </div>
          )}

          {/* Optional Source URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <LinkIcon size={12} className="text-indigo-500" />
              <span>
                {mode === 'news'
                  ? 'Source News Article URL (AI fetches & rewrites completely fresh)'
                  : 'Optional Reference URL (Product page or official specs)'}
              </span>
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://techcrunch.com/2026/..."
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          {/* Topic / Focus Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {mode === 'review' ? 'Optional Focus Angle / Specific Product' : 'News Headline / Topic / Instructions'}
            </label>
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                mode === 'review'
                  ? 'e.g. Focus on 2026 pricing, pros & cons for beginners, and how to stack the verified promo code...'
                  : 'e.g. Apple announces M5 MacBook Air with 24-hour battery life — analyze price & buyer impact...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          {/* Saved AI Config & Live Model Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Bot size={12} className="text-indigo-500" />
                <span>AI Provider Config</span>
              </label>
              <AdminSearchableSelect
                value={selectedConfigId}
                onChange={handleSelectConfig}
                placeholder="Select saved AI config..."
                searchPlaceholder="Search saved AI config (DeepSeek, OpenRouter, Ollama)..."
                emptyText="Add AI configs in Settings -> AI Writer"
                triggerClassName="h-9 bg-white"
                options={savedConfigs.map<SelectOption>((cfg) => ({
                  value: String(cfg.id),
                  label: cfg.isDefault ? `★ ${cfg.name}` : cfg.name,
                  sublabel: `${cfg.provider} • ${cfg.model}`,
                }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles size={12} className="text-indigo-500" />
                <span>AI Model (Optional)</span>
              </label>
              <AdminSearchableSelect
                value={model}
                onChange={setModel}
                allowCustomValue
                placeholder={loadingModels ? 'Loading models...' : 'Auto (Use Config Default)'}
                searchPlaceholder="Search live models or type any model ID..."
                emptyText="Type any model ID directly to use it"
                triggerClassName="h-9 bg-white"
                options={[
                  { value: '', label: 'Auto (Use Config Default)' },
                  ...liveModels.map<SelectOption>((m) => ({
                    value: m.id,
                    label: m.free ? `⚡ ${m.name}` : m.name,
                    sublabel: m.free ? `${m.id} • FREE` : m.id,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Language & Length */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe size={12} className="text-slate-400" />
                <span>Language</span>
              </label>
              <AdminSearchableSelect
                value={language}
                onChange={setLanguage}
                searchable={false}
                triggerClassName="h-9 bg-white"
                options={[
                  { value: 'English', label: '🇺🇸 English (US)' },
                  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Target Length</label>
              <AdminSearchableSelect
                value={String(wordCount)}
                onChange={(val) => setWordCount(Number(val))}
                searchable={false}
                triggerClassName="h-9 bg-white"
                options={[
                  { value: '800', label: 'Concise (~800 words)' },
                  { value: '1100', label: 'Standard SEO (~1,100 words)' },
                  { value: '1600', label: 'In-Depth (~1,600 words)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="h-9 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-sm transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{generating ? 'Writing Article...' : 'Generate Article with AI'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
