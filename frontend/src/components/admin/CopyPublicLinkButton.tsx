'use client';

import { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import { SITE_URL } from '@/constants/site';

interface CopyPublicLinkButtonProps {
  /** Public client path, e.g. `/store/poposoap` or `/post/anker-review` */
  path: string;
  disabled?: boolean;
  /** Icon-only 32x32 table action button matching AdminActionButton */
  compact?: boolean;
}

export default function CopyPublicLinkButton({
  path,
  disabled = false,
  compact = false,
}: CopyPublicLinkButtonProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();
  const [copied, setCopied] = useState(false);

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isDisabled = disabled || !path || normalizedPath === '/' || normalizedPath.endsWith('/');

  const handleCopy = async () => {
    if (isDisabled) return;
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : SITE_URL.replace(/\/+$/, '');
    const fullUrl = `${origin}${normalizedPath}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = fullUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    toast.success(`${t('Copied')}: ${fullUrl}`);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        disabled={isDisabled}
        title={copied ? t('Copied') : `${t('Copy Link')} (${normalizedPath})`}
        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border transition shrink-0 shadow-2xs ${
          copied
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 cursor-pointer'
            : isDisabled
            ? 'border-slate-100 bg-slate-50 text-slate-300 opacity-40 cursor-not-allowed'
            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
        }`}
      >
        {copied ? <Check size={13} className="text-emerald-600" /> : <Link2 size={13} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={isDisabled}
      title={isDisabled ? t('Enter a valid URL Slug first') : normalizedPath}
      className={`h-9 px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
        copied
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 cursor-pointer'
          : isDisabled
          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer'
      }`}
    >
      {copied ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Link2 size={14} className="shrink-0" />}
      <span>{copied ? t('Copied') : t('Copy Link')}</span>
    </button>
  );
}
