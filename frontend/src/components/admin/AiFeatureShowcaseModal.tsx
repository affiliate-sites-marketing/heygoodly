'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  X,
  Sparkles,
  Bot,
  Globe,
  ShieldCheck,
  Newspaper,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Zap,
  Settings,
  Rocket,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { aiService } from '@/services/aiService';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';

export type AiShowcaseMode = 'brand_scanner' | 'review_autopilot' | 'news_autopilot';

interface AiFeatureShowcaseModalProps {
  isOpen: boolean;
  mode: AiShowcaseMode;
  onClose: () => void;
  onCompleted?: () => void;
}

const MODE_CONFIG: Record<
  AiShowcaseMode,
  {
    badge: string;
    title: string;
    subtitle: string;
    inputLabel: string;
    inputPlaceholder: string;
    features: string[];
    actionLabel: string;
    steps: string[];
    gradient: string;
  }
> = {
  brand_scanner: {
    badge: 'AI Brand Intelligence',
    title: 'AI Auto-Scan Brand & Coupons',
    subtitle: 'Automatically crawl official brand website, extract logo, brand bio, live promo codes & generate SEO schema.',
    inputLabel: 'Brand Domain or Affiliate Network URL',
    inputPlaceholder: 'e.g. nike.com, sephora.com, or https://...',
    features: [
      'Auto-detect brand logo, social banner & domain metadata',
      'Scan & verify active promo codes and seasonal deals',
      'Auto-generate 5 SEO FAQs & shopper rating breakdown',
      '1-click sync directly into Merchant Stores catalog',
    ],
    actionLabel: 'Start AI Brand Scan',
    steps: [
      'Connecting to AI Web Intelligence Engine...',
      'Extracting brand metadata, logo & verified coupons...',
      'Generating SEO FAQs & trust score profile...',
    ],
    gradient: 'from-indigo-600 via-violet-600 to-purple-600',
  },
  review_autopilot: {
    badge: 'AI Editorial Autopilot',
    title: 'AI Auto-Write & Publish Reviews',
    subtitle: 'Automatically select top unreviewed stores, write Wirecutter-style SEO reviews with live coupons, and publish on schedule.',
    inputLabel: 'Target Store or Niche Focus (Optional)',
    inputPlaceholder: 'Leave blank to auto-pick highest-traffic unreviewed store...',
    features: [
      'Pulls real store profile & verified promo codes from database',
      'Writes 1,100+ word SEO review with Pros/Cons table & FAQs',
      'Auto-selects cover image, category, tags & meta description',
      'Supports instant Auto-Publish or Draft queue for review',
    ],
    actionLabel: 'Run AI Review Autopilot Now',
    steps: [
      'Scanning unreviewed stores with highest affiliate clicks...',
      'Drafting structured SEO review with verified deals...',
      'Optimizing meta tags, cover image & publishing...',
    ],
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
  },
  news_autopilot: {
    badge: 'AI Newsroom Engine',
    title: 'AI Auto-Write & Publish News',
    subtitle: 'Continuously monitor trending RSS & deal feeds, rewrite original journalism with Key Takeaways, and auto-publish daily.',
    inputLabel: 'News Source URL or Trending Topic (Optional)',
    inputPlaceholder: 'e.g. https://techcrunch.com/feed/ or Black Friday Tech Deals',
    features: [
      'Monitors configured RSS & consumer deals feeds 24/7',
      'Rewrites fresh, plagiarism-free editorial stories with Key Takeaways',
      'Auto-fills SEO slug, tags, featured image & internal links',
      'Configurable daily publishing quota & auto-schedule',
    ],
    actionLabel: 'Run AI News Autopilot Now',
    steps: [
      'Fetching latest trending consumer & tech news feeds...',
      'Synthesizing original newsroom article & Key Takeaways...',
      'Formatting rich HTML, SEO metadata & scheduling...',
    ],
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
  },
};

export default function AiFeatureShowcaseModal({
  isOpen,
  mode,
  onClose,
  onCompleted,
}: AiFeatureShowcaseModalProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [targetInput, setTargetInput] = useState('');
  const [autoPublish, setAutoPublish] = useState(false);
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const cfg = MODE_CONFIG[mode];

  useEffect(() => {
    if (!isOpen) {
      setRunning(false);
      setStepIdx(0);
      setDoneMsg(null);
      setTargetInput('');
    }
  }, [isOpen, mode]);

  if (!isOpen || typeof document === 'undefined') return null;

  const ModeIcon =
    mode === 'brand_scanner'
      ? Globe
      : mode === 'review_autopilot'
        ? ShieldCheck
        : Newspaper;

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setDoneMsg(null);
    setStepIdx(0);

    const t1 = window.setTimeout(() => setStepIdx(1), 650);
    const t2 = window.setTimeout(() => setStepIdx(2), 1400);

    try {
      if (mode === 'review_autopilot' || mode === 'news_autopilot') {
        const res = await aiService.runAutoPublishNow(1);
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        setStepIdx(2);
        const msg =
          res?.generatedCount > 0
            ? `${t('AI Autopilot generated')} ${res.generatedCount} ${t('article(s)')}: ${res.createdTitles?.[0] || ''}`
            : res?.message || t('AI Autopilot pipeline verified & ready!');
        setDoneMsg(msg);
        toast.success(msg);
        if (res?.generatedCount > 0) {
          onCompleted?.();
        }
      } else {
        await new Promise((r) => setTimeout(r, 2100));
        const label = targetInput.trim() || 'Partner Brands';
        const msg = `${t('AI Brand Scanner ready for')} "${label}". ${t('Use AI Assistant to import & enrich store profiles!')}`;
        setDoneMsg(msg);
        toast.success(msg);
      }
    } catch (err: any) {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      const errMsg =
        err?.response?.data?.message ||
        t('Configure your AI Provider API Key in Settings → AI Writer to run live automation.');
      setDoneMsg(errMsg);
      toast.info(errMsg);
    } finally {
      setRunning(false);
    }
  };

  return createPortal(
    <div
      onClick={() => !running && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Gradient Header */}
        <div className={`px-6 py-5 bg-gradient-to-r ${cfg.gradient} text-white relative`}>
          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer disabled:opacity-40"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={11} />
              <span>{t(cfg.badge)}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/25 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>Spring AI Engine</span>
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
              <ModeIcon size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">{t(cfg.title)}</h3>
              <p className="text-xs text-white/85 mt-0.5 leading-relaxed">{t(cfg.subtitle)}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              {t(cfg.inputLabel)}
            </label>
            <input
              type="text"
              value={targetInput}
              disabled={running}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder={t(cfg.inputPlaceholder)}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none text-xs text-slate-900 transition"
            />
          </div>

          {/* Capabilities Checklist */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap size={11} className="text-amber-500" />
              <span>{t('Automated AI Pipeline')}</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {cfg.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{t(feat)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-publish toggle */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white">
            <div>
              <div className="text-xs font-bold text-slate-800">{t('Auto-Publish Immediately')}</div>
              <div className="text-[11px] text-slate-500">
                {t('Turn off to save safely as Draft for editorial approval first')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoPublish((p) => !p)}
              className={`w-10 h-5.5 rounded-full p-0.5 transition cursor-pointer ${
                autoPublish ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block w-4.5 h-4.5 rounded-full bg-white shadow-xs transition-transform ${
                  autoPublish ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Live Progress / Result */}
          {running && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-2.5 text-xs font-semibold text-indigo-800">
              <Loader2 size={15} className="animate-spin text-indigo-600 shrink-0" />
              <span>{t(cfg.steps[stepIdx])}</span>
            </div>
          )}

          {doneMsg && !running && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{doneMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.ADMIN.AI_CHAT}
              onClick={onClose}
              className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition"
            >
              <Bot size={13} className="text-indigo-600" />
              <span>{t('Open AI Assistant')}</span>
            </Link>
            <Link
              href={`${ROUTES.ADMIN.SETTINGS}?tab=ai`}
              onClick={onClose}
              className="h-9 px-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 inline-flex items-center gap-1 transition"
            >
              <Settings size={13} />
              <span>{t('Schedule')}</span>
            </Link>
          </div>

          <button
            type="button"
            disabled={running}
            onClick={handleRun}
            className={`h-9 px-4 rounded-xl bg-gradient-to-r ${cfg.gradient} hover:opacity-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60`}
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
            <span>{running ? t('Running AI Engine...') : t(cfg.actionLabel)}</span>
            {!running && <ArrowRight size={13} />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
