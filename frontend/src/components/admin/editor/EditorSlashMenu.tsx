'use client';

import { useEffect, useRef } from 'react';
import {
  Type,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Image as ImageIcon,
  Video,
  Table,
  Lightbulb,
  AlertTriangle,
  Trophy,
  Scale,
  Tag,
  MousePointerClick,
  HelpCircle,
  ListTree,
  FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  category: 'Basic' | 'Media & Layout' | 'Affiliate & SEO';
  icon: LucideIcon;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  // Basic
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Large section heading (H2)',
    keywords: ['h2', 'heading', 'title', 'section', 'tieu de'],
    category: 'Basic',
    icon: Type,
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Sub-section heading (H3)',
    keywords: ['h3', 'subheading', 'tieu de nho'],
    category: 'Basic',
    icon: Type,
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    description: 'Unordered bulleted list',
    keywords: ['ul', 'bullet', 'list', 'danh sach'],
    category: 'Basic',
    icon: List,
  },
  {
    id: 'numbered',
    label: 'Numbered List',
    description: 'Ordered 1, 2, 3 list',
    keywords: ['ol', 'number', 'ordered', '123', 'danh sach so'],
    category: 'Basic',
    icon: ListOrdered,
  },
  {
    id: 'quote',
    label: 'Blockquote',
    description: 'Editorial pull quote or highlight',
    keywords: ['quote', 'blockquote', 'trich dan'],
    category: 'Basic',
    icon: Quote,
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Formatted code snippet block',
    keywords: ['code', 'pre', 'snippet'],
    category: 'Basic',
    icon: Code,
  },
  {
    id: 'divider',
    label: 'Divider Line',
    description: 'Horizontal section separator',
    keywords: ['hr', 'divider', 'line', 'duong ke'],
    category: 'Basic',
    icon: Minus,
  },

  // Media & Layout
  {
    id: 'image',
    label: 'Image / Gallery',
    description: 'Insert image, 2/3-photo grid, or split block',
    keywords: ['img', 'image', 'photo', 'gallery', 'anh', 'hinh'],
    category: 'Media & Layout',
    icon: ImageIcon,
  },
  {
    id: 'video',
    label: 'Embed Video',
    description: 'YouTube, TikTok, Vimeo, Facebook, MP4, iframe',
    keywords: ['video', 'youtube', 'tiktok', 'vimeo', 'embed', 'phim'],
    category: 'Media & Layout',
    icon: Video,
  },
  {
    id: 'table',
    label: 'Comparison Table',
    description: 'Insert editable specs / comparison table',
    keywords: ['table', 'grid', 'specs', 'bang', 'so sanh'],
    category: 'Media & Layout',
    icon: Table,
  },
  {
    id: 'markdown',
    label: 'Import Markdown (.md)',
    description: 'Paste & convert Markdown / AI output with README view',
    keywords: ['md', 'markdown', 'readme', 'chatgpt', 'claude', 'gemini'],
    category: 'Media & Layout',
    icon: FileText,
  },

  // Affiliate & SEO
  {
    id: 'deal',
    label: 'Promo Deal Box',
    description: 'High-converting affiliate deal & price box',
    keywords: ['deal', 'promo', 'coupon', 'offer', 'affiliate', 'khuyen mai'],
    category: 'Affiliate & SEO',
    icon: Tag,
  },
  {
    id: 'cta',
    label: 'CTA Button',
    description: 'Call-to-action button with sponsored link',
    keywords: ['cta', 'button', 'nut', 'link'],
    category: 'Affiliate & SEO',
    icon: MousePointerClick,
  },
  {
    id: 'proscons',
    label: 'Pros & Cons Box',
    description: 'Two-column green/red pros & cons summary',
    keywords: ['pros', 'cons', 'uu diem', 'nhuoc diem', 'review'],
    category: 'Affiliate & SEO',
    icon: Scale,
  },
  {
    id: 'tip',
    label: 'Pro Tip Callout',
    description: 'Highlighted editorial tip box',
    keywords: ['tip', 'callout', 'meo', 'note'],
    category: 'Affiliate & SEO',
    icon: Lightbulb,
  },
  {
    id: 'warning',
    label: 'Warning Callout',
    description: 'Important caution / buyer alert box',
    keywords: ['warning', 'alert', 'caution', 'luu y', 'canh bao'],
    category: 'Affiliate & SEO',
    icon: AlertTriangle,
  },
  {
    id: 'verdict',
    label: 'Final Verdict Box',
    description: 'Editorial final score & conclusion box',
    keywords: ['verdict', 'summary', 'ket luan', 'danh gia'],
    category: 'Affiliate & SEO',
    icon: Trophy,
  },
  {
    id: 'toc',
    label: 'Auto Table of Contents',
    description: 'Generate clickable TOC from all H2 / H3 headings',
    keywords: ['toc', 'contents', 'muc luc', 'outline'],
    category: 'Affiliate & SEO',
    icon: ListTree,
  },
  {
    id: 'faq',
    label: 'FAQ Accordion',
    description: 'Expandable Q&A block for SEO rich snippets',
    keywords: ['faq', 'qa', 'question', 'cau hoi'],
    category: 'Affiliate & SEO',
    icon: HelpCircle,
  },
];

export function filterSlashCommands(query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.includes(q))
  );
}

interface EditorSlashMenuProps {
  open: boolean;
  position: { top: number; left: number } | null;
  query: string;
  selectedIndex: number;
  items: SlashCommandItem[];
  onSelect: (item: SlashCommandItem) => void;
  onHoverIndex: (idx: number) => void;
}

export default function EditorSlashMenu({
  open,
  position,
  query,
  selectedIndex,
  items,
  onSelect,
  onHoverIndex,
}: EditorSlashMenuProps) {
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open || !position) return null;

  return (
    <div
      data-editor-floating-ui="true"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-50 w-[300px] max-w-[calc(100vw-24px)] max-h-[340px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 py-1.5 text-xs animate-fadeIn"
    >
      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Slash Commands</span>
        <span className="font-mono text-slate-500">/{query || '...'}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-3 py-5 text-center text-slate-400 text-xs">
          No matching block for &ldquo;/{query}&rdquo;
        </div>
      ) : (
        <div className="py-1">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                ref={isSelected ? activeItemRef : undefined}
                type="button"
                onMouseEnter={() => onHoverIndex(idx)}
                onClick={() => onSelect(item)}
                className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition cursor-pointer ${
                  isSelected ? 'bg-brand-primary-soft/70 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-brand-primary text-white border-brand-primary'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-xs truncate">{item.label}</span>
                  <span className="block text-[10px] text-slate-500 truncate">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="px-3 py-1 border-t border-slate-100 bg-slate-50/70 text-[10px] text-slate-400 flex items-center justify-between">
        <span>↑↓ Navigate · Enter Insert</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
}
