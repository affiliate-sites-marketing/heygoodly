'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone, Eye, Edit2, Globe, Lock } from 'lucide-react';
import { SITE_DOMAIN } from '@/constants/site';
import { useAdminI18n } from '@/context/AdminI18nContext';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

interface AdminEditPreviewTabsProps {
  activeTab: 'edit' | 'preview';
  onChange: (tab: 'edit' | 'preview') => void;
}

/**
 * Shared Edit / Live Preview pill switcher for AdminFormPage headerExtra.
 */
export function AdminEditPreviewTabs({ activeTab, onChange }: AdminEditPreviewTabsProps) {
  const { t } = useAdminI18n();
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => onChange('edit')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
          activeTab === 'edit'
            ? 'bg-white text-slate-900 shadow-2xs'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Edit2 size={13} />
        <span>{t('Edit')}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('preview')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
          activeTab === 'preview'
            ? 'bg-brand-primary text-white shadow-2xs'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Eye size={13} />
        <span>{t('Live Preview')}</span>
      </button>
    </div>
  );
}

interface AdminDevicePreviewFrameProps {
  title: string;
  urlPath: string;
  children: (device: PreviewDevice) => React.ReactNode;
}

/**
 * Unified Desktop / Mobile client preview shell with browser chrome & mobile frame.
 */
export default function AdminDevicePreviewFrame({
  title,
  urlPath,
  children,
}: AdminDevicePreviewFrameProps) {
  const { t } = useAdminI18n();
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const cleanPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  const fullUrl = `https://${SITE_DOMAIN}${cleanPath}`;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Device Switcher Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">{t(title)}</h3>
            <p className="text-[11px] font-mono text-slate-400 truncate flex items-center gap-1">
              <Globe size={11} className="shrink-0" />
              <span>{fullUrl}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              device === 'desktop'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Monitor size={13} />
            <span>{t('Desktop')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              device === 'tablet'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Tablet size={13} />
            <span>iPad (768px)</span>
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              device === 'mobile'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            <span>{t('Mobile')} (390px)</span>
          </button>
        </div>
      </div>

      {/* Viewport Frame */}
      {device === 'desktop' ? (
        <div className="w-full rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white">
          {/* Desktop Browser Chrome */}
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 max-w-xl mx-auto bg-white border border-slate-200 rounded-lg px-3 py-1 text-[11px] font-mono text-slate-500 flex items-center gap-1.5 truncate">
              <Lock size={11} className="text-emerald-600 shrink-0" />
              <span className="truncate">{fullUrl}</span>
            </div>
          </div>

          <div className="bg-[#f4f5f7] min-h-[480px] max-h-[78vh] overflow-y-auto">
            {children('desktop')}
          </div>
        </div>
      ) : device === 'tablet' ? (
        <div className="flex justify-center py-2 overflow-x-auto">
          <div className="w-[768px] max-w-full rounded-[28px] border-[8px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
            {/* iPad Status Bar */}
            <div className="bg-slate-950 text-white px-5 py-1.5 flex items-center justify-between text-[10px] font-semibold">
              <span>9:41 AM • iPad</span>
              <span>Wi-Fi • 100%</span>
            </div>
            {/* iPad Safari Address Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
              <div className="flex-1 max-w-md mx-auto bg-white border border-slate-200 rounded-lg px-3 py-1 text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5 truncate">
                <Lock size={10} className="text-emerald-600 shrink-0" />
                <span className="truncate">{fullUrl}</span>
              </div>
            </div>
            {/* iPad Viewport */}
            <div className="bg-[#f4f5f7] h-[680px] overflow-y-auto">
              {children('tablet')}
            </div>
            {/* iPad Home Indicator */}
            <div className="bg-slate-950 py-1.5 flex justify-center">
              <span className="w-32 h-1 rounded-full bg-slate-600" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <div className="w-[390px] max-w-full rounded-[38px] border-[8px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Mobile Status Bar + Dynamic Island */}
            <div className="bg-slate-950 text-white px-5 pt-2.5 pb-2 flex items-center justify-between text-[10px] font-semibold">
              <span>9:41</span>
              <span className="w-20 h-4 rounded-full bg-slate-800" />
              <span>5G • 100%</span>
            </div>
            {/* Mobile Browser Address Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5">
              <div className="bg-white border border-slate-200 rounded-full px-3 py-1 text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1 truncate">
                <Lock size={10} className="text-emerald-600 shrink-0" />
                <span className="truncate">{SITE_DOMAIN}{cleanPath}</span>
              </div>
            </div>
            {/* Mobile Viewport */}
            <div className="bg-[#f4f5f7] h-[660px] overflow-y-auto">
              {children('mobile')}
            </div>
            {/* Mobile Home Indicator */}
            <div className="bg-slate-950 py-2 flex justify-center">
              <span className="w-28 h-1 rounded-full bg-slate-600" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
