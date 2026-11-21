'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { useAdminI18n } from '@/context/AdminI18nContext';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

interface AdminSearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  searchable?: boolean;
  onOpen?: () => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  placement?: 'bottom' | 'top';
  error?: boolean;
  'data-field'?: string;
}

function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function AdminSearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No matching options',
  searchable = true,
  onOpen,
  disabled = false,
  className = '',
  triggerClassName = '',
  placement = 'bottom',
  error = false,
  'data-field': dataField,
}: AdminSearchableSelectProps) {
  const { t } = useAdminI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return options;
    return options.filter((opt) => {
      const translatedLabel = t(opt.label);
      const haystack = normalizeSearch(
        `${opt.label} ${translatedLabel} ${opt.sublabel || ''}`
      );
      return haystack.includes(q);
    });
  }, [options, query, t]);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const estimatedHeight = searchable ? 290 : 240;
    const spaceBelow = viewportH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const openUpward =
      placement === 'top' || (spaceBelow < Math.min(estimatedHeight, 220) && spaceAbove > spaceBelow);

    const width = Math.max(rect.width, 170);
    const left = Math.min(Math.max(8, rect.left), Math.max(8, viewportW - width - 8));

    if (openUpward) {
      setMenuStyle({
        position: 'fixed',
        left,
        width,
        bottom: viewportH - rect.top + 6,
        zIndex: 9999,
      });
    } else {
      setMenuStyle({
        position: 'fixed',
        left,
        width,
        top: rect.bottom + 6,
        zIndex: 9999,
      });
    }
  }, [placement, searchable]);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
        setQuery('');
      }
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (open) {
      setHighlightedIdx(0);
      if (searchable) {
        const timer = setTimeout(() => searchInputRef.current?.focus(), 10);
        return () => clearTimeout(timer);
      }
    }
  }, [open, searchable]);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [query]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !open;
    setOpen(next);
    if (next) {
      onOpen?.();
    } else {
      setQuery('');
    }
  };

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        onOpen?.();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        filteredOptions.length === 0 ? 0 : (prev + 1) % filteredOptions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        filteredOptions.length === 0
          ? 0
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredOptions[highlightedIdx];
      if (target && !target.disabled) {
        handleSelect(target);
      }
    }
  };

  const dropdownMenu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={menuStyle}
            onKeyDown={handleKeyDown}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t(searchPlaceholder)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-5 px-3 text-center text-xs text-slate-400">
                  {t(emptyText)}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIdx;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      onClick={() => handleSelect(opt)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-brand-primary/10 text-brand-primary font-bold'
                          : isHighlighted
                            ? 'bg-slate-100 text-slate-900 font-medium'
                            : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate">{t(opt.label)}</span>
                        {opt.sublabel && (
                          <span className="block truncate text-[10px] text-slate-400 font-normal">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="text-brand-primary shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        data-field={dataField}
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 text-xs bg-slate-50 border rounded-xl px-3.5 py-2 font-medium text-slate-800 transition cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
            : open
              ? 'border-brand-primary ring-2 ring-brand-primary/20'
              : 'border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary'
        } ${triggerClassName}`}
      >
        <span className={`truncate ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedOption ? t(selectedOption.label) : t(placeholder)}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {dropdownMenu}
    </div>
  );
}
