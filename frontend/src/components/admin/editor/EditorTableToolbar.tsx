'use client';

import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trash2, Table } from 'lucide-react';

interface EditorTableToolbarProps {
  position: { top: number; left: number } | null;
  onAddRowAbove: () => void;
  onAddRowBelow: () => void;
  onDeleteRow: () => void;
  onAddColLeft: () => void;
  onAddColRight: () => void;
  onDeleteCol: () => void;
  onToggleHeaderRow: () => void;
  onDeleteTable: () => void;
}

/**
 * Floating table manipulation toolbar shown when the caret is inside any <table>.
 * Works on both newly created tables and tables pasted from ChatGPT/Claude/DeepSeek/Docs.
 */
export default function EditorTableToolbar({
  position,
  onAddRowAbove,
  onAddRowBelow,
  onDeleteRow,
  onAddColLeft,
  onAddColRight,
  onDeleteCol,
  onToggleHeaderRow,
  onDeleteTable,
}: EditorTableToolbarProps) {
  if (!position) return null;

  const btn =
    'px-2 py-1 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap';

  return (
    <div
      data-editor-floating-ui="true"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15 animate-fadeIn max-w-[calc(100vw-24px)]"
    >
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-brand-primary uppercase tracking-wider px-1.5">
        <Table size={12} /> Table
      </span>
      <span className="w-px h-4 bg-slate-200" />
      <button type="button" onClick={onAddRowAbove} title="Insert Row Above" className={btn}>
        <ArrowUp size={11} /> +Row
      </button>
      <button type="button" onClick={onAddRowBelow} title="Insert Row Below" className={btn}>
        <ArrowDown size={11} /> +Row
      </button>
      <button type="button" onClick={onDeleteRow} title="Delete Current Row" className={`${btn} text-rose-600 hover:bg-rose-50`}>
        -Row
      </button>
      <span className="w-px h-4 bg-slate-200" />
      <button type="button" onClick={onAddColLeft} title="Insert Column Left" className={btn}>
        <ArrowLeft size={11} /> +Col
      </button>
      <button type="button" onClick={onAddColRight} title="Insert Column Right" className={btn}>
        <ArrowRight size={11} /> +Col
      </button>
      <button type="button" onClick={onDeleteCol} title="Delete Current Column" className={`${btn} text-rose-600 hover:bg-rose-50`}>
        -Col
      </button>
      <span className="w-px h-4 bg-slate-200" />
      <button type="button" onClick={onToggleHeaderRow} title="Toggle First Row Header Style" className={btn}>
        Header
      </button>
      <button
        type="button"
        onClick={onDeleteTable}
        title="Delete Entire Table"
        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
