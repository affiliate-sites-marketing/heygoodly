'use client';

import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Link as LinkIcon,
  RemoveFormatting,
} from 'lucide-react';

interface EditorBubbleToolbarProps {
  position: { top: number; left: number } | null;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onInlineCode: () => void;
  onHighlight: () => void;
  onHeading: (tag: 'h2' | 'h3') => void;
  onLink: () => void;
  onClearFormat: () => void;
}

/**
 * Notion / Medium-style floating text selection formatting toolbar.
 * Uses onMouseDown preventDefault so clicking buttons never drops the active text selection.
 */
export default function EditorBubbleToolbar({
  position,
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onInlineCode,
  onHighlight,
  onHeading,
  onLink,
  onClearFormat,
}: EditorBubbleToolbarProps) {
  if (!position) return null;

  const btnClass =
    'p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/15 transition cursor-pointer inline-flex items-center justify-center';

  return (
    <div
      data-editor-floating-ui="true"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-slate-900 text-white border border-slate-700/80 shadow-2xl shadow-slate-950/40 animate-fadeIn"
    >
      <button type="button" onClick={onBold} title="Bold (Ctrl+B)" className={btnClass}>
        <Bold size={13} />
      </button>
      <button type="button" onClick={onItalic} title="Italic (Ctrl+I)" className={btnClass}>
        <Italic size={13} />
      </button>
      <button type="button" onClick={onUnderline} title="Underline (Ctrl+U)" className={btnClass}>
        <Underline size={13} />
      </button>
      <button type="button" onClick={onStrike} title="Strikethrough" className={btnClass}>
        <Strikethrough size={13} />
      </button>
      <button type="button" onClick={onInlineCode} title="Inline Code" className={btnClass}>
        <Code size={13} />
      </button>
      <button type="button" onClick={onHighlight} title="Highlight" className={btnClass}>
        <Highlighter size={13} className="text-amber-300" />
      </button>

      <span className="w-px h-4 bg-slate-700 mx-0.5" />

      <button
        type="button"
        onClick={() => onHeading('h2')}
        title="Turn into Heading 2"
        className={`${btnClass} px-1.5 text-[11px] font-extrabold`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => onHeading('h3')}
        title="Turn into Heading 3"
        className={`${btnClass} px-1.5 text-[11px] font-extrabold`}
      >
        H3
      </button>

      <span className="w-px h-4 bg-slate-700 mx-0.5" />

      <button type="button" onClick={onLink} title="Insert / Edit Link (Ctrl+K)" className={btnClass}>
        <LinkIcon size={13} className="text-sky-300" />
      </button>
      <button type="button" onClick={onClearFormat} title="Clear Formatting (Ctrl+\)" className={btnClass}>
        <RemoveFormatting size={13} className="text-rose-300" />
      </button>
    </div>
  );
}
