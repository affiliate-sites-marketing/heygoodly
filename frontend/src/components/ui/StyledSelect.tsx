'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface StyledSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: StyledSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  align?: 'left' | 'right';
  size?: 'xs' | 'sm' | 'md';
  minMenuWidth?: number;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
  resetAfterSelect?: boolean;
  emptyText?: string;
}

export default function StyledSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchable = false,
  searchPlaceholder = 'Search...',
  align = 'left',
  size = 'sm',
  minMenuWidth = 240,
  className = '',
  buttonClassName = '',
  ariaLabel,
  resetAfterSelect = false,
  emptyText = 'No matching options',
}: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = `${opt.label} ${opt.searchText || ''} ${opt.value}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const estimatedMenuHeight = Math.min(340, options.length * 36 + (searchable ? 56 : 16));
    const spaceBelow = viewportH - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    const menuWidth = Math.max(rect.width, minMenuWidth);
    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > viewportW - 12) {
      left = Math.max(12, viewportW - menuWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    const top = openUpward
      ? Math.max(12, rect.top - 6)
      : Math.min(viewportH - 12, rect.bottom + 6);

    setCoords({
      top,
      left,
      width: menuWidth,
      openUpward,
    });
  }, [align, minMenuWidth, options.length, searchable]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    if (searchable) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, searchable, updatePosition]);

  const sizeClasses =
    size === 'xs'
      ? 'h-7 px-2.5 text-[11px] rounded-lg gap-1.5'
      : size === 'md'
      ? 'h-9 px-3 text-xs rounded-xl gap-2'
      : 'h-8 px-2.5 text-xs rounded-lg gap-1.5';

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setQuery('');
          setOpen((prev) => !prev);
        }}
        className={`w-full inline-flex items-center justify-between font-medium border transition-all cursor-pointer select-none shadow-2xs bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary ${
          open ? 'border-brand-primary ring-2 ring-brand-primary/20' : ''
        } ${sizeClasses} ${buttonClassName}`}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-zinc-400 transition-transform duration-150 ${
            open ? 'rotate-180 text-brand-primary' : ''
          }`}
        />
      </button>

      {open &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.openUpward ? 'translateY(-100%)' : undefined,
              zIndex: 9999,
            }}
            className="rounded-xl border border-zinc-200 dark:border-[#263044] bg-white dark:bg-[#141a26] shadow-xl overflow-hidden animate-fadeIn"
          >
            {searchable && (
              <div className="p-2 border-b border-zinc-100 dark:border-[#1f283a]">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-[#273046] bg-zinc-50 dark:bg-[#0d111a] text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-zinc-400">
                  {emptyText}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = !resetAfterSelect && opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-brand-primary-soft text-brand-primary font-semibold'
                          : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1d2536]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check size={13} strokeWidth={2.5} className="shrink-0 text-brand-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
