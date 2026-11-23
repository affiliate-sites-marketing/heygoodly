'use client';

import { useState } from 'react';
import { Search, Replace, X } from 'lucide-react';

interface EditorFindReplaceBarProps {
  open: boolean;
  onClose: () => void;
  onCountMatches: (query: string, caseSensitive: boolean) => number;
  onReplaceNext: (find: string, replaceWith: string, caseSensitive: boolean) => boolean;
  onReplaceAll: (find: string, replaceWith: string, caseSensitive: boolean) => number;
}

export default function EditorFindReplaceBar({
  open,
  onClose,
  onCountMatches,
  onReplaceNext,
  onReplaceAll,
}: EditorFindReplaceBarProps) {
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  if (!open) return null;

  const matchCount = findQuery.trim() ? onCountMatches(findQuery, caseSensitive) : 0;

  return (
    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
      <div className="relative flex-1 min-w-[160px] max-w-[240px]">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          autoFocus
          value={findQuery}
          onChange={(e) => setFindQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Find text..."
          className="w-full pl-8 pr-14 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        />
        {findQuery && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {matchCount}
          </span>
        )}
      </div>

      <div className="relative flex-1 min-w-[160px] max-w-[240px]">
        <Replace size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && findQuery) {
              e.preventDefault();
              onReplaceNext(findQuery, replaceQuery, caseSensitive);
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder="Replace with..."
          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        />
      </div>

      <button
        type="button"
        onClick={() => setCaseSensitive((v) => !v)}
        title="Match Case"
        className={`px-2 py-1.5 rounded-lg border text-[11px] font-mono font-bold transition cursor-pointer ${
          caseSensitive
            ? 'bg-brand-primary text-white border-brand-primary'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
        }`}
      >
        Aa
      </button>

      <button
        type="button"
        disabled={!findQuery || matchCount === 0}
        onClick={() => onReplaceNext(findQuery, replaceQuery, caseSensitive)}
        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 cursor-pointer"
      >
        Replace
      </button>
      <button
        type="button"
        disabled={!findQuery || matchCount === 0}
        onClick={() => onReplaceAll(findQuery, replaceQuery, caseSensitive)}
        className="px-2.5 py-1.5 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white font-bold disabled:opacity-40 cursor-pointer"
      >
        Replace All
      </button>

      <button
        type="button"
        onClick={onClose}
        title="Close Find & Replace (Esc)"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 ml-auto cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
