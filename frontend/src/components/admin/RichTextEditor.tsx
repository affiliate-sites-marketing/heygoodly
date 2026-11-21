'use client';

import { useState, useRef, useEffect } from 'react';
import { SITE_DOMAIN, SITE_NAME, SITE_SLUG } from '@/constants/site';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Images,
  Minus,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Eye,
  Code2,
  Tag,
  AlertCircle,
  HelpCircle,
  X,
  Upload,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  Type,
  Trash2,
  ExternalLink,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Copy,
  Layers,
  Sparkles,
  LayoutTemplate,
  ChevronDown,
  Maximize2,
  Minimize2,
  FolderOpen,
  PlusCircle,
  Search,
  ListTree,
  BookOpen,
  Lightbulb,
  AlertTriangle,
  Trophy,
  Scale,
  LayoutGrid,
  Table,
  FileText,
  Subscript,
  Superscript,
  Indent,
  Outdent,
  ZoomIn,
  ZoomOut,
  Sliders,
  ArrowLeft,
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  CaseSensitive,
  Columns2,
  Columns3,
  Info,
  PanelLeft,
  PanelRight,
  Pencil,
  RefreshCw,
  Move,
  CornerDownLeft,
  CornerUpLeft,
} from 'lucide-react';
import MediaLibraryModal from './MediaLibraryModal';
import MediaTagInput from './MediaTagInput';
import { useOptionalToast } from '@/context/ToastContext';
import { mediaService } from '@/services/mediaService';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  initialPaperView?: boolean;
}

const TEXT_COLORS = [
  { label: 'Default Black', value: '#171717' },
  { label: 'Dark Slate', value: '#334155' },
  { label: 'Muted Gray', value: '#64748B' },
  { label: 'Brand Crimson', value: '#C62828' },
  { label: 'Bright Red', value: '#DC2626' },
  { label: 'Deep Orange', value: '#EA580C' },
  { label: 'Amber Gold', value: '#D97706' },
  { label: 'Forest Green', value: '#15803D' },
  { label: 'Emerald Green', value: '#059669' },
  { label: 'Teal Cyan', value: '#0D9488' },
  { label: 'Ocean Blue', value: '#0284C7' },
  { label: 'Royal Blue', value: '#2563EB' },
  { label: 'Indigo', value: '#4F46E5' },
  { label: 'Violet Purple', value: '#7C3AED' },
  { label: 'Magenta Pink', value: '#DB2777' },
  { label: 'Warm Brown', value: '#78350F' },
];

const HIGHLIGHT_COLORS = [
  { label: 'No Highlight', value: 'transparent' },
  { label: 'Yellow Glow', value: '#FEF08A' },
  { label: 'Lime Pop', value: '#D9F99D' },
  { label: 'Green Glow', value: '#BBF7D0' },
  { label: 'Sky Blue', value: '#BAE6FD' },
  { label: 'Soft Indigo', value: '#C7D2FE' },
  { label: 'Lavender', value: '#E9D5FF' },
  { label: 'Pink Rose', value: '#FECDD3' },
  { label: 'Warm Orange', value: '#FED7AA' },
  { label: 'Light Gray', value: '#E2E8F0' },
];

const FONT_SIZES = [
  { label: 'Small (13px)', value: '13px' },
  { label: 'Normal (15px)', value: '15px' },
  { label: 'Medium (18px)', value: '18px' },
  { label: 'Large (22px)', value: '22px' },
  { label: 'Huge (26px)', value: '26px' },
];

export const FONT_FAMILIES = [
  { label: 'Inter (Modern Sans)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Times New Roman (Serif)', value: '"Times New Roman", Times, serif' },
  { label: 'Arial (Standard)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Calibri (Office)', value: 'Calibri, Candara, Segoe, sans-serif' },
  { label: 'Georgia (Editorial)', value: 'Georgia, serif' },
  { label: 'Roboto (Tech)', value: 'Roboto, sans-serif' },
  { label: 'Courier New (Code/Mono)', value: '"Courier New", Courier, monospace' },
];

export const FONT_SIZES_WORD = [
  '11px', '12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px', '60px', '72px'
];

interface ComponentTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  badge?: string;
  previewColor: string;
  html: string;
}

const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'overview-section',
    category: 'Article Structure',
    name: 'Overview & Key Highlights Section',
    description: 'Standard article card with Crimson accent bar, section heading, and in-depth analysis paragraphs.',
    previewColor: 'bg-white border-slate-200 text-slate-800',
    badge: 'Most Popular',
    html: `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4 article-component my-6 relative">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: var(--brand-primary);"></span>
      Overview & Key Highlights Card
    </span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="flex items-center gap-3">
    <span class="w-1.5 h-6 bg-brand-primary rounded-full"></span>
    <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">1. Product Overview & Key Highlights</h2>
  </div>
  <p class="text-slate-600 leading-relaxed">Detailed overview of the product, standout engineering features, and first-hand impressions from our lab testing sessions.</p>
  <p class="text-slate-600 leading-relaxed">Our editorial team evaluated build durability, real-world performance, and compatibility compared against leading competitors in its class.</p>
</section>`,
  },
  {
    id: 'benchmark-section',
    category: 'Article Structure',
    name: 'Hands-On Testing & Lab Benchmark Section',
    description: 'Article section featuring a highlighted Lab Benchmark Summary 9.4/10 score callout box.',
    previewColor: 'bg-white border-slate-200 text-slate-800',
    badge: 'Lab Benchmark',
    html: `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4 article-component my-6 relative">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: var(--brand-primary);"></span>
      Lab Benchmark Card
    </span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="flex items-center gap-3">
    <span class="w-1.5 h-6 bg-brand-primary rounded-full"></span>
    <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">2. Real-World Performance & Lab Benchmark Results</h2>
  </div>
  <p class="text-slate-600 leading-relaxed">Under standardized stress-testing conditions, the unit demonstrated consistent output stability and exceptional thermal reliability.</p>
  <div class="bg-slate-50 border-l-4 border-brand-primary p-4 rounded-r-xl space-y-1">
    <p class="font-bold text-slate-900 text-sm">Lab Benchmark Summary: 9.4 / 10</p>
    <p class="text-xs text-slate-600 leading-relaxed">Composite testing score across build precision, acoustic/thermal dissipation, and everyday ergonomic comfort.</p>
  </div>
</section>`,
  },
  {
    id: 'deal-promo-box',
    category: 'Deals & Promos',
    name: 'Exclusive Deal & Promo Voucher Box',
    description: 'Dashed crimson gradient deal box displaying discounted price, promo code badge, and Claim Deal CTA button.',
    previewColor: 'bg-rose-50/50 border-rose-300 text-rose-950',
    badge: 'High Conversion',
    html: `<div class="editorial-box my-6 rounded-2xl border-2 border-dashed border-brand-primary bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 sm:p-7 shadow-xs relative overflow-hidden article-component" data-box-type="deal">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; user-select: none;">
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-brand-primary text-white shadow-xs">
      EXCLUSIVE DEAL - SAVE 45%
    </span>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">Verified active today</span>
      <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
        🗑️ Delete Deal Box
      </button>
    </div>
  </div>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
    <div class="space-y-1.5 min-w-0 flex-1">
      <h3 class="deal-title text-lg sm:text-xl font-black text-slate-950">Exclusive Reader Discount Offer</h3>
      <p class="text-xs sm:text-sm text-slate-600">Apply our exclusive promo code at the official merchant checkout for an instant price reduction.</p>
      <div class="flex items-baseline gap-2 pt-1 flex-wrap">
        <span class="deal-price text-2xl sm:text-3xl font-black text-brand-primary">$49.99</span>
        <span class="deal-original-price text-sm text-slate-400 line-through">$89.99</span>
        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Save $40</span>
      </div>
    </div>
    <div class="flex flex-col items-start sm:items-end gap-2 shrink-0">
      <div class="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-xs">
        <span class="text-slate-500 font-medium">Promo Code:</span>
        <span class="deal-code font-mono font-black text-red-600 tracking-wider">HEYGOODLY20</span>
      </div>
      <a href="https://example.com/deal" target="_blank" rel="noopener noreferrer nofollow" class="deal-button inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow transition">
        Claim Deal at Official Store →
      </a>
    </div>
  </div>
</div>`,
  },
  {
    id: 'pros-cons-grid',
    category: 'Reviews & Comparisons',
    name: 'Pros & Cons Comparison Grid',
    description: '2-column contrast grid: Emerald column highlights strengths, Rose column lists trade-offs to consider.',
    previewColor: 'bg-emerald-50/50 border-emerald-200 text-emerald-950',
    badge: 'Comparison',
    html: `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs article-component relative" data-box-type="pros-cons">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; user-select: none;">
    <h3 class="text-base font-black text-slate-900 flex items-center gap-2" style="margin: 0;">
      <span class="text-brand-primary">⚖️</span> Pros & Cons Breakdown
    </h3>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Grid
    </button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
      <h4 class="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
        <span>✓</span> KEY STRENGTHS (PROS)
      </h4>
      <ul class="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
        <li>Rugged build quality with high dust and water resistance rating</li>
        <li>Broad compatibility across popular models and platforms</li>
        <li>24-month official warranty backed by lifetime technical support</li>
      </ul>
    </div>
    <div class="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-2">
      <h4 class="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
        <span>✕</span> THINGS TO CONSIDER (CONS)
      </h4>
      <ul class="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
        <li>Requires basic mounting tools for optimal installation</li>
        <li>Exclusive promo code redemptions are capped daily</li>
      </ul>
    </div>
  </div>
</div>`,
  },
  {
    id: 'verdict-dark-box',
    category: 'Article Structure',
    name: 'Editorial Verdict Dark Card',
    description: 'Premium dark slate card (Slate-900) with Editor’s Choice badge and gold composite score.',
    previewColor: 'bg-slate-900 border-slate-800 text-white',
    badge: 'Editor’s Choice',
    html: `<section class="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-4 article-component my-6 relative" style="background-color: #0f172a; color: #ffffff;">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 8px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: #f59e0b;"></span>
      Editorial Verdict Card
    </span>
    <button type="button" class="box-delete-btn" style="background: #1e293b; color: #f87171; border: 1px solid #334155; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
    <h3 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
      <span>🏆</span> EDITORIAL VERDICT
    </h3>
    <span class="text-xs font-bold bg-brand-primary text-white px-3 py-1 rounded-full">Editor's Choice</span>
  </div>
  <p class="text-slate-300 text-sm leading-relaxed">If you are looking for an ideal balance between reliable performance and smart value, this stands out as one of the top recommendations in its category right now.</p>
  <div class="flex items-center gap-4 pt-2">
    <div class="text-3xl sm:text-4xl font-black text-amber-400">9.6 / 10</div>
    <div class="text-xs text-slate-400">Rated by our hardware testing team and verified buyer community.</div>
  </div>
</section>`,
  },
  {
    id: 'full-media-figure',
    category: 'Images & Media',
    name: 'Full-Width Image Figure with Caption',
    description: 'Full-width image container with 2xl rounded corners, subtle border, and centered italic caption.',
    previewColor: 'bg-slate-100 border-slate-300 text-slate-700',
    badge: 'Media Figure',
    html: `<figure class="my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 article-component relative" data-box-type="image">
  <div contenteditable="false" style="position: absolute; top: 10px; right: 10px; z-index: 10; user-select: none;">
    <button type="button" class="box-delete-btn" style="background: rgba(0,0,0,0.75); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; cursor: pointer; backdrop-filter: blur(4px);">
      🗑️ Delete Image
    </button>
  </div>
  <img src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80" alt="Product hands-on testing photo" class="w-full h-auto object-cover max-h-[460px]" />
  <figcaption class="p-3 text-center text-xs text-slate-500 italic border-t border-slate-100 bg-white">
    Hands-on product sample evaluated under natural lighting conditions
  </figcaption>
</figure>`,
  },
  {
    id: 'split-media-text',
    category: 'Images & Media',
    name: '2-Column Split: Image Left + Feature Copy Right',
    description: 'Balanced 2-column layout pairing a close-up product photo on the left with feature commentary on the right.',
    previewColor: 'bg-white border-slate-200 text-slate-800',
    badge: 'Media + Text',
    html: `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs article-component my-6 relative">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: var(--brand-primary);"></span>
      2-Column Media Split
    </span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
    <div class="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
      <img src="https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80" alt="Product design close-up" class="w-full h-auto object-cover" />
    </div>
    <div class="space-y-3">
      <span class="text-xs font-bold uppercase tracking-wider text-brand-primary">Design & Craftsmanship</span>
      <h3 class="text-xl font-black text-slate-950">Precision Engineering Down to Every Detail</h3>
      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">Constructed with certified high-durability materials, refined finishes, and a solid, confidence-inspiring tactile feel.</p>
    </div>
  </div>
</section>`,
  },
  {
    id: 'photo-gallery-2',
    category: 'Images & Media',
    name: '2-Image Side-by-Side Comparison Grid',
    description: 'Two evenly sized photos arranged horizontally with individual captions—ideal for Before/After or front/back product views.',
    previewColor: 'bg-slate-50 border-slate-300 text-slate-800',
    badge: '2-Photo Grid',
    html: `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs article-component relative" data-box-type="image-gallery">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">2-Image Comparison Grid</span>
    <button type="button" class="box-delete-btn" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Grid</button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <figure style="margin: 0;">
      <img src="https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80" alt="Photo 1" class="w-full h-56 object-cover rounded-xl border border-slate-200" />
      <figcaption class="text-center text-xs text-slate-500 italic mt-2">Unboxing &amp; exterior build finish</figcaption>
    </figure>
    <figure style="margin: 0;">
      <img src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80" alt="Photo 2" class="w-full h-56 object-cover rounded-xl border border-slate-200" />
      <figcaption class="text-center text-xs text-slate-500 italic mt-2">Real-world detail &amp; port layout</figcaption>
    </figure>
  </div>
</div>`,
  },
  {
    id: 'photo-gallery-3',
    category: 'Images & Media',
    name: '3-Image Product Gallery Row',
    description: 'Clean 3-column showcase strip for showcasing multiple angles, color variants, or packaging contents.',
    previewColor: 'bg-slate-50 border-slate-300 text-slate-800',
    badge: '3-Photo Row',
    html: `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs article-component relative" data-box-type="image-gallery">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">3-Image Product Gallery</span>
    <button type="button" class="box-delete-btn" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Gallery</button>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
    <figure style="margin: 0;">
      <img src="https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700&auto=format&fit=crop&q=80" alt="Gallery 1" class="w-full h-44 object-cover rounded-xl border border-slate-200" />
      <figcaption class="text-center text-xs text-slate-500 italic mt-1.5">Front angle view</figcaption>
    </figure>
    <figure style="margin: 0;">
      <img src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=700&auto=format&fit=crop&q=80" alt="Gallery 2" class="w-full h-44 object-cover rounded-xl border border-slate-200" />
      <figcaption class="text-center text-xs text-slate-500 italic mt-1.5">Key interface &amp; controls</figcaption>
    </figure>
    <figure style="margin: 0;">
      <img src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80" alt="Gallery 3" class="w-full h-44 object-cover rounded-xl border border-slate-200" />
      <figcaption class="text-center text-xs text-slate-500 italic mt-1.5">Complete desk setup</figcaption>
    </figure>
  </div>
</div>`,
  },
  {
    id: 'specs-table-card',
    category: 'Reviews & Comparisons',
    name: 'Product Specs & Key Details Card',
    description: 'Clean structured specification summary card highlighting price tier, warranty, best-for audience, and verified coupon code.',
    previewColor: 'bg-blue-50/50 border-blue-200 text-slate-900',
    badge: 'Specs Card',
    html: `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3 article-component my-6 relative" data-box-type="specs">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 8px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #2b579a;">Key Specifications Card</span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Card</button>
  </div>
  <h3 class="text-lg font-black text-slate-950" style="margin: 0 0 8px 0;">At a Glance: Key Specifications</h3>
  <table class="w-full border-collapse border border-slate-200 rounded-xl overflow-hidden text-xs sm:text-sm">
    <tbody>
      <tr class="bg-slate-50/70"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700 w-1/3">Best For</td><td class="border border-slate-200 px-3.5 py-2 text-slate-800">Everyday consumers seeking reliability &amp; value</td></tr>
      <tr class="bg-white"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700">Warranty &amp; Returns</td><td class="border border-slate-200 px-3.5 py-2 text-slate-800">30-Day Money-Back Guarantee • 2-Year Warranty</td></tr>
      <tr class="bg-slate-50/70"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700">Verified Savings</td><td class="border border-slate-200 px-3.5 py-2 text-emerald-700 font-bold">Up to 25% OFF with verified promo code</td></tr>
      <tr class="bg-white"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700">Our Lab Score</td><td class="border border-slate-200 px-3.5 py-2 font-black text-amber-600">9.4 / 10</td></tr>
    </tbody>
  </table>
</section>`,
  },
  {
    id: 'cta-action-banner',
    category: 'Deals & Promos',
    name: 'Fast-Action Checkout CTA Banner',
    description: 'Sleek dark horizontal banner designed to drive high-intent clicks to the merchant checkout.',
    previewColor: 'bg-slate-900 border-slate-800 text-white',
    badge: 'CTA Banner',
    html: `<div class="editorial-box my-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-7 shadow-lg article-component relative" data-box-type="banner">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: flex-end; margin-bottom: 8px; user-select: none;">
    <button type="button" class="box-delete-btn" style="background: rgba(255,255,255,0.1); color: #f87171; border: 1px solid rgba(255,255,255,0.15); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Banner
    </button>
  </div>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="space-y-1 text-center sm:text-left">
      <h3 class="text-base sm:text-lg font-black text-white">Ready to Experience It Yourself?</h3>
      <p class="text-xs text-slate-300">Order today to unlock free nationwide shipping and a 24-month official manufacturer warranty.</p>
    </div>
    <a href="https://example.com/buy" target="_blank" rel="noopener noreferrer nofollow" class="cta-button shrink-0 inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition">
      Shop Now at Special Price →
    </a>
  </div>
</div>`,
  },
];

export interface TemplateParamField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'url';
  placeholder?: string;
  help?: string;
}

export function getDefaultParamsForTemplate(templateId: string): Record<string, string> {
  switch (templateId) {
    case 'overview-section':
      return {
        badge: 'Overview & Key Highlights Card',
        title: '1. Product Overview & Key Highlights',
        p1: 'Detailed overview of the product, standout engineering features, and first-hand impressions from our lab testing sessions.',
        p2: 'Our editorial team evaluated build durability, real-world performance, and compatibility compared against leading competitors in its class.',
      };
    case 'benchmark-section':
      return {
        badge: 'Lab Benchmark Card',
        title: '2. Real-World Performance & Lab Benchmark Results',
        bodyText: 'Under standardized stress-testing conditions, the unit demonstrated consistent output stability and exceptional thermal reliability.',
        scoreTitle: 'Lab Benchmark Summary: 9.4 / 10',
        scoreDesc: 'Composite testing score across build precision, acoustic/thermal dissipation, and everyday ergonomic comfort.',
      };
    case 'deal-promo-box':
      return {
        badge: 'EXCLUSIVE DEAL - SAVE 45%',
        verifiedNote: 'Verified active today',
        title: 'Exclusive Reader Discount Offer',
        desc: 'Apply our exclusive promo code at the official merchant checkout for an instant price reduction.',
        dealPrice: '$49.99',
        originalPrice: '$89.99',
        savings: 'Save $40',
        couponCode: 'HEYGOODLY20',
        buttonText: 'Claim Deal at Official Store →',
        buttonUrl: 'https://example.com/deal',
      };
    case 'pros-cons-grid':
      return {
        title: 'Pros & Cons Breakdown',
        pros: 'Rugged build quality with high dust and water resistance rating\nBroad compatibility across popular models and platforms\n24-month official warranty backed by lifetime technical support',
        cons: 'Requires basic mounting tools for optimal installation\nExclusive promo code redemptions are capped daily',
      };
    case 'verdict-dark-box':
      return {
        badge: "Editor's Choice",
        title: 'EDITORIAL VERDICT',
        conclusion: 'If you are looking for an ideal balance between reliable performance and smart value, this stands out as one of the top recommendations in its category right now.',
        score: '9.6 / 10',
        scoreDesc: 'Rated by our hardware testing team and verified buyer community.',
      };
    case 'full-media-figure':
      return {
        imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80',
        caption: 'Hands-on product sample evaluated under natural lighting conditions',
      };
    case 'split-media-text':
      return {
        tag: 'Design & Craftsmanship',
        title: 'Precision Engineering Down to Every Detail',
        desc: 'Constructed with certified high-durability materials, refined finishes, and a solid, confidence-inspiring tactile feel.',
        imageUrl: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
      };
    case 'photo-gallery-2':
      return {
        img1: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
        cap1: 'Unboxing & exterior build finish',
        img2: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80',
        cap2: 'Real-world detail & port layout',
      };
    case 'photo-gallery-3':
      return {
        img1: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700&auto=format&fit=crop&q=80',
        cap1: 'Front angle view',
        img2: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=700&auto=format&fit=crop&q=80',
        cap2: 'Key interface & controls',
        img3: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80',
        cap3: 'Complete desk setup',
      };
    case 'specs-table-card':
      return {
        title: 'At a Glance: Key Specifications',
        row1Label: 'Best For',
        row1Val: 'Everyday consumers seeking reliability & value',
        row2Label: 'Warranty & Returns',
        row2Val: '30-Day Money-Back Guarantee • 2-Year Warranty',
        row3Label: 'Verified Savings',
        row3Val: 'Up to 25% OFF with verified promo code',
        row4Label: 'Our Lab Score',
        row4Val: '9.4 / 10',
      };
    case 'cta-action-banner':
      return {
        title: 'Ready to Experience It Yourself?',
        desc: 'Order today to unlock free nationwide shipping and a 24-month official manufacturer warranty.',
        buttonText: 'Shop Now at Special Price →',
        buttonUrl: 'https://example.com/buy',
      };
    default:
      return {};
  }
}

export function getTemplateParamFields(templateId: string): TemplateParamField[] {
  switch (templateId) {
    case 'overview-section':
      return [
        { key: 'badge', label: 'Card Top Badge / Label', placeholder: 'Overview & Key Highlights Card' },
        { key: 'title', label: 'Section Heading (H2)', placeholder: '1. Product Overview & Key Highlights' },
        { key: 'p1', label: 'Analysis Paragraph 1', type: 'textarea', placeholder: 'Overview analysis content...' },
        { key: 'p2', label: 'Analysis Paragraph 2', type: 'textarea', placeholder: 'Durability and testing notes...' },
      ];
    case 'benchmark-section':
      return [
        { key: 'badge', label: 'Card Badge', placeholder: 'Lab Benchmark Card' },
        { key: 'title', label: 'Section Heading', placeholder: '2. Real-World Performance & Lab Benchmark Results' },
        { key: 'bodyText', label: 'Opening Commentary', type: 'textarea', placeholder: 'Testing conditions commentary...' },
        { key: 'scoreTitle', label: 'Score Summary Callout Title', placeholder: 'Lab Benchmark Summary: 9.4 / 10' },
        { key: 'scoreDesc', label: 'Score Breakdown Description', type: 'textarea', placeholder: 'Composite testing score...' },
      ];
    case 'deal-promo-box':
      return [
        { key: 'title', label: 'Deal Title / Product Name *', placeholder: 'Exclusive Reader Discount Offer' },
        { key: 'badge', label: 'Top Promo Badge', placeholder: 'EXCLUSIVE DEAL - SAVE 45%' },
        { key: 'verifiedNote', label: 'Verification Badge Note', placeholder: 'Verified active today' },
        { key: 'dealPrice', label: 'Deal Price *', placeholder: '$49.99' },
        { key: 'originalPrice', label: 'Original List Price (Strikethrough)', placeholder: '$89.99' },
        { key: 'savings', label: 'Savings Badge', placeholder: 'Save $40 or 45% Off' },
        { key: 'couponCode', label: 'Promo / Coupon Code', placeholder: 'HEYGOODLY20' },
        { key: 'desc', label: 'Offer Description', type: 'textarea', placeholder: 'Apply promo code at checkout...' },
        { key: 'buttonText', label: 'CTA Button Label', placeholder: 'Claim Deal at Official Store →' },
        { key: 'buttonUrl', label: 'Affiliate / Destination URL *', type: 'url', placeholder: 'https://example.com/affiliate-deal' },
      ];
    case 'pros-cons-grid':
      return [
        { key: 'title', label: 'Comparison Grid Title', placeholder: 'Pros & Cons Breakdown' },
        { key: 'pros', label: 'PROS List (one item per line)', type: 'textarea', placeholder: 'Rugged build quality\n24-month warranty\n...' },
        { key: 'cons', label: 'CONS List (one item per line)', type: 'textarea', placeholder: 'Requires basic tools\nLimited daily promo redemptions\n...' },
      ];
    case 'verdict-dark-box':
      return [
        { key: 'title', label: 'Verdict Heading', placeholder: 'EDITORIAL VERDICT' },
        { key: 'badge', label: 'Recommendation Badge', placeholder: "Editor's Choice" },
        { key: 'score', label: 'Rating Score', placeholder: '9.6 / 10' },
        { key: 'conclusion', label: 'Verdict Summary / Buying Advice', type: 'textarea', placeholder: 'If you are looking for...' },
        { key: 'scoreDesc', label: 'Rating Attribution Note', placeholder: 'Rated by our hardware testing team...' },
      ];
    case 'full-media-figure':
      return [
        { key: 'imageUrl', label: 'Image URL *', type: 'url', placeholder: 'https://images.unsplash.com/...' },
        { key: 'caption', label: 'Image Caption Below', placeholder: 'Hands-on product sample...' },
      ];
    case 'split-media-text':
      return [
        { key: 'tag', label: 'Eyebrow Tag', placeholder: 'Design & Craftsmanship' },
        { key: 'title', label: 'Section Heading', placeholder: 'Precision Engineering Down to Every Detail' },
        { key: 'desc', label: 'Feature Copy Paragraph', type: 'textarea', placeholder: 'Constructed with certified materials...' },
        { key: 'imageUrl', label: 'Image URL', type: 'url', placeholder: 'https://images.unsplash.com/...' },
      ];
    case 'photo-gallery-2':
      return [
        { key: 'img1', label: 'Left Image URL *', type: 'url', placeholder: 'https://...' },
        { key: 'cap1', label: 'Left Caption', placeholder: 'Unboxing & exterior build finish' },
        { key: 'img2', label: 'Right Image URL *', type: 'url', placeholder: 'https://...' },
        { key: 'cap2', label: 'Right Caption', placeholder: 'Real-world detail & port layout' },
      ];
    case 'photo-gallery-3':
      return [
        { key: 'img1', label: 'Photo 1 URL *', type: 'url', placeholder: 'https://...' },
        { key: 'cap1', label: 'Photo 1 Caption', placeholder: 'Front angle view' },
        { key: 'img2', label: 'Photo 2 URL *', type: 'url', placeholder: 'https://...' },
        { key: 'cap2', label: 'Photo 2 Caption', placeholder: 'Key interface & controls' },
        { key: 'img3', label: 'Photo 3 URL *', type: 'url', placeholder: 'https://...' },
        { key: 'cap3', label: 'Photo 3 Caption', placeholder: 'Complete desk setup' },
      ];
    case 'specs-table-card':
      return [
        { key: 'title', label: 'Specs Card Heading', placeholder: 'At a Glance: Key Specifications' },
        { key: 'row1Label', label: 'Row 1 Label', placeholder: 'Best For' },
        { key: 'row1Val', label: 'Row 1 Value', placeholder: 'Everyday consumers...' },
        { key: 'row2Label', label: 'Row 2 Label', placeholder: 'Warranty & Returns' },
        { key: 'row2Val', label: 'Row 2 Value', placeholder: '30-Day Money-Back Guarantee' },
        { key: 'row3Label', label: 'Row 3 Label', placeholder: 'Verified Savings' },
        { key: 'row3Val', label: 'Row 3 Value', placeholder: 'Up to 25% OFF' },
        { key: 'row4Label', label: 'Row 4 Label', placeholder: 'Our Lab Score' },
        { key: 'row4Val', label: 'Row 4 Value', placeholder: '9.4 / 10' },
      ];
    case 'cta-action-banner':
      return [
        { key: 'title', label: 'Banner Heading', placeholder: 'Ready to Experience It Yourself?' },
        { key: 'desc', label: 'Call-to-Action Description', type: 'textarea', placeholder: 'Order today to unlock free shipping...' },
        { key: 'buttonText', label: 'Button Label', placeholder: 'Shop Now at Special Price →' },
        { key: 'buttonUrl', label: 'Affiliate Destination URL *', type: 'url', placeholder: 'https://example.com/buy' },
      ];
    default:
      return [];
  }
}

export function buildTemplateHTML(templateId: string, params: Record<string, string>): string {
  switch (templateId) {
    case 'overview-section': {
      const badge = params.badge || 'Overview & Key Highlights Card';
      const title = params.title || '1. Product Overview & Key Highlights';
      const p1 = params.p1 || '';
      const p2 = params.p2 || '';
      return `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4 article-component my-6 relative">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: var(--brand-primary);"></span>
      ${badge}
    </span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="flex items-center gap-3">
    <span class="w-1.5 h-6 bg-brand-primary rounded-full"></span>
    <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">${title}</h2>
  </div>
  ${p1 ? `<p class="text-slate-600 leading-relaxed">${p1}</p>` : ''}
  ${p2 ? `<p class="text-slate-600 leading-relaxed">${p2}</p>` : ''}
</section>`;
    }

    case 'benchmark-section': {
      const badge = params.badge || 'Lab Benchmark Card';
      const title = params.title || '2. Real-World Performance & Lab Benchmark Results';
      const bodyText = params.bodyText || '';
      const scoreTitle = params.scoreTitle || 'Lab Benchmark Summary: 9.4 / 10';
      const scoreDesc = params.scoreDesc || '';
      return `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4 article-component my-6 relative">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: var(--brand-primary);"></span>
      ${badge}
    </span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="flex items-center gap-3">
    <span class="w-1.5 h-6 bg-brand-primary rounded-full"></span>
    <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">${title}</h2>
  </div>
  ${bodyText ? `<p class="text-slate-600 leading-relaxed">${bodyText}</p>` : ''}
  <div class="bg-slate-50 border-l-4 border-brand-primary p-4 rounded-r-xl space-y-1">
    <p class="font-bold text-slate-900 text-sm">${scoreTitle}</p>
    ${scoreDesc ? `<p class="text-xs text-slate-600 leading-relaxed">${scoreDesc}</p>` : ''}
  </div>
</section>`;
    }

    case 'deal-promo-box': {
      const badge = params.badge || 'EXCLUSIVE DEAL - SAVE 45%';
      const verifiedNote = params.verifiedNote || 'Verified active today';
      const title = params.title || 'Exclusive Reader Discount Offer';
      const desc = params.desc || '';
      const dealPrice = params.dealPrice || '$49.99';
      const originalPrice = params.originalPrice || '';
      const savings = params.savings || '';
      const couponCode = params.couponCode || '';
      const buttonText = params.buttonText || 'Claim Deal at Official Store →';
      const buttonUrl = params.buttonUrl || 'https://example.com/deal';
      return `<div class="editorial-box my-6 rounded-2xl border-2 border-dashed border-brand-primary bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 sm:p-7 shadow-xs relative overflow-hidden article-component" data-box-type="deal">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; user-select: none;">
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-brand-primary text-white shadow-xs">
      ${badge}
    </span>
    <div style="display: flex; align-items: center; gap: 8px;">
      ${verifiedNote ? `<span class="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-md">${verifiedNote}</span>` : ''}
      <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
        🗑️ Delete Deal Box
      </button>
    </div>
  </div>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
    <div class="space-y-1.5 min-w-0 flex-1">
      <h3 class="deal-title text-lg sm:text-xl font-black text-slate-950">${title}</h3>
      ${desc ? `<p class="text-xs sm:text-sm text-slate-600">${desc}</p>` : ''}
      <div class="flex items-baseline gap-2 pt-1 flex-wrap">
        <span class="deal-price text-2xl sm:text-3xl font-black text-brand-primary">${dealPrice}</span>
        ${originalPrice ? `<span class="deal-original-price text-sm text-slate-400 line-through">${originalPrice}</span>` : ''}
        ${savings ? `<span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">${savings}</span>` : ''}
      </div>
    </div>
    <div class="flex flex-col items-start sm:items-end gap-2 shrink-0">
      ${couponCode ? `<div class="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-xs">
        <span class="text-slate-500 font-medium">Promo Code:</span>
        <span class="deal-code font-mono font-black text-red-600 tracking-wider">${couponCode}</span>
      </div>` : ''}
      <a href="${buttonUrl}" target="_blank" rel="noopener noreferrer nofollow sponsored" class="deal-button inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow transition">
        ${buttonText}
      </a>
    </div>
  </div>
</div>`;
    }

    case 'pros-cons-grid': {
      const title = params.title || 'Pros & Cons Breakdown';
      const prosList = (params.pros || '')
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);
      const consList = (params.cons || '')
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);

      return `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs article-component relative" data-box-type="pros-cons">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; user-select: none;">
    <h3 class="text-base font-black text-slate-900 flex items-center gap-2" style="margin: 0;">
      <span class="text-brand-primary">⚖️</span> ${title}
    </h3>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Grid
    </button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
      <h4 class="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
        <span>✓</span> KEY STRENGTHS (PROS)
      </h4>
      <ul class="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
        ${prosList.map((item) => `<li>${item}</li>`).join('\n        ')}
      </ul>
    </div>
    <div class="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-2">
      <h4 class="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
        <span>✕</span> THINGS TO CONSIDER (CONS)
      </h4>
      <ul class="text-xs text-slate-700 space-y-1.5 list-disc pl-4 leading-relaxed">
        ${consList.map((item) => `<li>${item}</li>`).join('\n        ')}
      </ul>
    </div>
  </div>
</div>`;
    }

    case 'verdict-dark-box': {
      const badge = params.badge || "Editor's Choice";
      const title = params.title || 'EDITORIAL VERDICT';
      const score = params.score || '9.6 / 10';
      const scoreDesc = params.scoreDesc || 'Rated by our hardware testing team and verified buyer community.';
      const conclusion = params.conclusion || '';

      return `<section class="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md space-y-4 article-component my-6 relative" style="background-color: #0f172a; color: #ffffff;">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 8px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: #f59e0b;"></span>
      Editorial Verdict Card
    </span>
    <button type="button" class="box-delete-btn" style="background: #1e293b; color: #f87171; border: 1px solid #334155; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
    <h3 class="text-lg font-black tracking-tight text-white flex items-center gap-2">
      <span>🏆</span> ${title}
    </h3>
    <span class="text-xs font-bold bg-brand-primary text-white px-3 py-1 rounded-full">${badge}</span>
  </div>
  ${conclusion ? `<p class="text-slate-300 text-sm leading-relaxed">${conclusion}</p>` : ''}
  <div class="flex items-center gap-4 pt-2">
    <div class="text-3xl sm:text-4xl font-black text-amber-400">${score}</div>
    ${scoreDesc ? `<div class="text-xs text-slate-400">${scoreDesc}</div>` : ''}
  </div>
</section>`;
    }

    case 'full-media-figure': {
      const imageUrl = params.imageUrl || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80';
      const caption = params.caption || 'Hands-on product sample';

      return `<figure class="my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 article-component relative" data-box-type="image">
  <div contenteditable="false" style="position: absolute; top: 10px; right: 10px; z-index: 10; user-select: none;">
    <button type="button" class="box-delete-btn" style="background: rgba(0,0,0,0.75); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; cursor: pointer; backdrop-filter: blur(4px);">
      🗑️ Delete Image
    </button>
  </div>
  <img src="${imageUrl}" alt="${caption}" class="w-full h-auto object-cover max-h-[460px]" />
  ${caption ? `<figcaption class="p-3 text-center text-xs text-slate-500 italic border-t border-slate-100 bg-white">
    ${caption}
  </figcaption>` : ''}
</figure>`;
    }

    case 'split-media-text': {
      const tag = params.tag || 'Design & Craftsmanship';
      const title = params.title || 'Precision Engineering Down to Every Detail';
      const desc = params.desc || '';
      const imageUrl = params.imageUrl || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80';

      return `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs article-component my-6 relative">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
      <span style="width: 6px; height: 6px; border-radius: 9999px; background-color: var(--brand-primary);"></span>
      2-Column Media Split
    </span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Card
    </button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
    <div class="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
      <img src="${imageUrl}" alt="${title}" class="w-full h-auto object-cover" />
    </div>
    <div class="space-y-3">
      <span class="text-xs font-bold uppercase tracking-wider text-brand-primary">${tag}</span>
      <h3 class="text-xl font-black text-slate-950">${title}</h3>
      ${desc ? `<p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${desc}</p>` : ''}
    </div>
  </div>
</section>`;
    }

    case 'photo-gallery-2': {
      const img1 = params.img1 || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80';
      const cap1 = params.cap1 || '';
      const img2 = params.img2 || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=80';
      const cap2 = params.cap2 || '';
      return `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs article-component relative" data-box-type="image-gallery">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">2-Image Comparison Grid</span>
    <button type="button" class="box-delete-btn" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Grid</button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <figure style="margin: 0;"><img src="${img1}" alt="${cap1 || 'Photo 1'}" class="w-full h-56 object-cover rounded-xl border border-slate-200" />${cap1 ? `<figcaption class="text-center text-xs text-slate-500 italic mt-2">${cap1}</figcaption>` : ''}</figure>
    <figure style="margin: 0;"><img src="${img2}" alt="${cap2 || 'Photo 2'}" class="w-full h-56 object-cover rounded-xl border border-slate-200" />${cap2 ? `<figcaption class="text-center text-xs text-slate-500 italic mt-2">${cap2}</figcaption>` : ''}</figure>
  </div>
</div>`;
    }

    case 'photo-gallery-3': {
      const img1 = params.img1 || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=700&auto=format&fit=crop&q=80';
      const cap1 = params.cap1 || '';
      const img2 = params.img2 || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=700&auto=format&fit=crop&q=80';
      const cap2 = params.cap2 || '';
      const img3 = params.img3 || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&auto=format&fit=crop&q=80';
      const cap3 = params.cap3 || '';
      return `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs article-component relative" data-box-type="image-gallery">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">3-Image Product Gallery</span>
    <button type="button" class="box-delete-btn" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Gallery</button>
  </div>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
    <figure style="margin: 0;"><img src="${img1}" alt="${cap1 || 'Gallery 1'}" class="w-full h-44 object-cover rounded-xl border border-slate-200" />${cap1 ? `<figcaption class="text-center text-xs text-slate-500 italic mt-1.5">${cap1}</figcaption>` : ''}</figure>
    <figure style="margin: 0;"><img src="${img2}" alt="${cap2 || 'Gallery 2'}" class="w-full h-44 object-cover rounded-xl border border-slate-200" />${cap2 ? `<figcaption class="text-center text-xs text-slate-500 italic mt-1.5">${cap2}</figcaption>` : ''}</figure>
    <figure style="margin: 0;"><img src="${img3}" alt="${cap3 || 'Gallery 3'}" class="w-full h-44 object-cover rounded-xl border border-slate-200" />${cap3 ? `<figcaption class="text-center text-xs text-slate-500 italic mt-1.5">${cap3}</figcaption>` : ''}</figure>
  </div>
</div>`;
    }

    case 'specs-table-card': {
      const title = params.title || 'At a Glance: Key Specifications';
      return `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3 article-component my-6 relative" data-box-type="specs">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 8px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #2b579a;">Key Specifications Card</span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Card</button>
  </div>
  <h3 class="text-lg font-black text-slate-950" style="margin: 0 0 8px 0;">${title}</h3>
  <table class="w-full border-collapse border border-slate-200 rounded-xl overflow-hidden text-xs sm:text-sm">
    <tbody>
      <tr class="bg-slate-50/70"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700 w-1/3">${params.row1Label || 'Best For'}</td><td class="border border-slate-200 px-3.5 py-2 text-slate-800">${params.row1Val || ''}</td></tr>
      <tr class="bg-white"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700">${params.row2Label || 'Warranty & Returns'}</td><td class="border border-slate-200 px-3.5 py-2 text-slate-800">${params.row2Val || ''}</td></tr>
      <tr class="bg-slate-50/70"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700">${params.row3Label || 'Verified Savings'}</td><td class="border border-slate-200 px-3.5 py-2 text-emerald-700 font-bold">${params.row3Val || ''}</td></tr>
      <tr class="bg-white"><td class="border border-slate-200 px-3.5 py-2 font-bold text-slate-700">${params.row4Label || 'Our Lab Score'}</td><td class="border border-slate-200 px-3.5 py-2 font-black text-amber-600">${params.row4Val || ''}</td></tr>
    </tbody>
  </table>
</section>`;
    }

    case 'cta-action-banner': {
      const title = params.title || 'Ready to Experience It Yourself?';
      const desc = params.desc || '';
      const buttonText = params.buttonText || 'Shop Now at Special Price →';
      const buttonUrl = params.buttonUrl || 'https://example.com/buy';

      return `<div class="editorial-box my-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-7 shadow-lg article-component relative" data-box-type="banner">
  <div contenteditable="false" style="display: flex; align-items: center; justify-content: flex-end; margin-bottom: 8px; user-select: none;">
    <button type="button" class="box-delete-btn" style="background: rgba(255,255,255,0.1); color: #f87171; border: 1px solid rgba(255,255,255,0.15); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">
      🗑️ Delete Banner
    </button>
  </div>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="space-y-1 text-center sm:text-left">
      <h3 class="text-base sm:text-lg font-black text-white">${title}</h3>
      ${desc ? `<p class="text-xs text-slate-300">${desc}</p>` : ''}
    </div>
    <a href="${buttonUrl}" target="_blank" rel="noopener noreferrer nofollow sponsored" class="cta-button shrink-0 inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition">
      ${buttonText}
    </a>
  </div>
</div>`;
    }

    default:
      return '';
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write or paste your article review content here... Use the toolbar above for headings, images, quotes, and product test tables.',
  minHeight = '360px',
  initialPaperView = false,
}: RichTextEditorProps) {
  const toastCtx = useOptionalToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState(value);
  
  // Modals state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkTargetBlank, setLinkTargetBlank] = useState(true);
  const [linkSponsored, setLinkSponsored] = useState(true);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalTab, setImageModalTab] = useState<'single' | 'gallery2' | 'gallery3' | 'split'>('single');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlign, setImageAlign] = useState<'center' | 'full' | 'left' | 'right'>('center');
  const [imageWidth, setImageWidth] = useState<string>('70%');
  const [imageFrame, setImageFrame] = useState<'card' | 'rounded' | 'clean'>('card');
  const [galleryItems, setGalleryItems] = useState<Array<{ url: string; caption: string }>>([
    { url: '', caption: '' },
    { url: '', caption: '' },
    { url: '', caption: '' },
  ]);
  const [splitImageForm, setSplitImageForm] = useState({
    imageUrl: '',
    tag: 'Design & Highlight',
    title: 'Key Feature Spotlight',
    desc: 'Describe what the photo shows and why it matters to everyday buyers.',
    imageSide: 'left' as 'left' | 'right',
  });
  const [mediaPickTarget, setMediaPickTarget] = useState<
    'direct' | 'single' | 'gallery-0' | 'gallery-1' | 'gallery-2' | 'split' | 'replace-active'
  >('direct');
  const [editingFigureEl, setEditingFigureEl] = useState<HTMLElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageTags, setImageTags] = useState<string[]>(['article', 'illustration']);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Deal Box modal state
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [editingBoxEl, setEditingBoxEl] = useState<HTMLElement | null>(null);
  const [dealForm, setDealForm] = useState({
    title: 'Nilight 20-Inch Curved Dual-Row LED Light Bar',
    originalPrice: '$89.99',
    dealPrice: '$49.99',
    couponCode: 'HEYGOODLY20',
    badge: 'Verified Exclusive Deal',
    description: 'Use code HEYGOODLY20 at checkout for an extra 20% off.',
    buttonText: 'Claim Deal at Official Store →',
    buttonUrl: `https://www.nilight.com/?ref=${SITE_SLUG}`,
    buttonStyle: 'crimson' as 'crimson' | 'emerald' | 'dark',
  });

  // Standalone Button CTA modal state
  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [buttonForm, setButtonForm] = useState({
    text: 'Check Verified Price on Merchant Store →',
    url: 'https://',
    style: 'crimson' as 'crimson' | 'dark' | 'emerald' | 'outline',
    alignment: 'center' as 'left' | 'center',
  });

  // Style popover & toolbar active state
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [customTextColor, setCustomTextColor] = useState('#C62828');
  const [textCaseMenuOpen, setTextCaseMenuOpen] = useState(false);
  const [moreStylesMenuOpen, setMoreStylesMenuOpen] = useState(false);
  const [quickImageMenuOpen, setQuickImageMenuOpen] = useState(false);
  const [quickCalloutMenuOpen, setQuickCalloutMenuOpen] = useState(false);
  const [currentLineSpacing, setCurrentLineSpacing] = useState('1.6');
  const [activeBlockTag, setActiveBlockTag] = useState<'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote'>('p');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    unorderedList: false,
    orderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
  });
  const [stats, setStats] = useState({ words: 0, characters: 0, readTime: '1 min' });

  const closeAllDropdowns = () => {
    setFontFamilyMenuOpen(false);
    setFontSizeMenuOpen(false);
    setColorMenuOpen(false);
    setHighlightMenuOpen(false);
    setLineSpacingMenuOpen(false);
    setTextCaseMenuOpen(false);
    setMoreStylesMenuOpen(false);
    setQuickImageMenuOpen(false);
    setQuickCalloutMenuOpen(false);
    setStyleDropdownOpen(false);
  };

  // Active component & template states
  const [activeComp, setActiveComp] = useState<HTMLElement | null>(null);
  const [activeCompRect, setActiveCompRect] = useState<{
    top: number;
    left: number;
    right: number;
    width: number;
    height: number;
    imgTop: number;
    imgLeft: number;
    imgWidth: number;
    imgHeight: number;
  } | null>(null);
  const [activeImageWidthPct, setActiveImageWidthPct] = useState<number>(70);
  const [resizingBadge, setResizingBadge] = useState<string | null>(null);
  const [dragMoveState, setDragMoveState] = useState<{
    isImage: boolean;
    label: string;
    thumbSrc?: string;
    ghostX: number;
    ghostY: number;
    dropTop: number;
    dropLeft: number;
    dropWidth: number;
    dropHeight: number;
    zone: 'left' | 'center' | 'right';
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addCompModalOpen, setAddCompModalOpen] = useState(false);
  const [presetBoxesOpen, setPresetBoxesOpen] = useState(false);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [templateCategory, setTemplateCategory] = useState('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateForParams, setSelectedTemplateForParams] = useState<ComponentTemplate | null>(null);
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [templatePreviewDevice, setTemplatePreviewDevice] = useState<'desktop' | 'mobile' | 'full'>('desktop');
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const [fullPreviewDevice, setFullPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Word Ribbon & Canvas View states
  const [ribbonTab, setRibbonTab] = useState<'home' | 'insert' | 'affiliate' | 'view'>('home');
  const [isPaperView, setIsPaperView] = useState(initialPaperView);
  const [currentFont, setCurrentFont] = useState('Inter, system-ui, sans-serif');
  const [currentSize, setCurrentSize] = useState('15px');
  const [fontFamilyMenuOpen, setFontFamilyMenuOpen] = useState(false);
  const [fontSizeMenuOpen, setFontSizeMenuOpen] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);
  const lastHighlightRangeRef = useRef<Range | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [lineSpacingMenuOpen, setLineSpacingMenuOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  const syncSelectionFormattingState = (node: Node | null) => {
    if (!node || !editorRef.current || !editorRef.current.contains(node)) return;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    const block = el?.closest('h1, h2, h3, h4, blockquote, p') as HTMLElement | null;
    if (block && editorRef.current.contains(block)) {
      const tag = block.tagName.toLowerCase();
      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'blockquote' || tag === 'p') {
        setActiveBlockTag(tag);
      } else {
        setActiveBlockTag('p');
      }
    } else {
      setActiveBlockTag('p');
    }

    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
        justifyFull: document.queryCommandState('justifyFull'),
      });
    } catch {
      // queryCommandState can throw in detached ranges
    }
  };

  // Sync current selection inside editor and preserve non-collapsed text highlights
  const captureEditorSelection = (clearHighlightIfCollapsed = false) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.startContainer)) return;

    savedRangeRef.current = range.cloneRange();
    syncSelectionFormattingState(range.startContainer);

    if (!range.collapsed && range.toString().length > 0) {
      lastHighlightRangeRef.current = range.cloneRange();
      const anchorEl =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement
          : (range.startContainer as HTMLElement);
      if (anchorEl && editorRef.current.contains(anchorEl)) {
        const computed = window.getComputedStyle(anchorEl);
        if (computed.fontSize) {
          const px = `${Math.round(parseFloat(computed.fontSize))}px`;
          if (FONT_SIZES_WORD.includes(px)) {
            setCurrentSize(px);
          }
        }
      }
    } else if (clearHighlightIfCollapsed) {
      lastHighlightRangeRef.current = null;
    }
  };

  // Resolve the active non-collapsed highlight range inside the editor
  const getActiveHighlightRange = (): Range | null => {
    const sel = window.getSelection();
    if (
      sel &&
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      editorRef.current &&
      editorRef.current.contains(sel.anchorNode)
    ) {
      const r = sel.getRangeAt(0);
      if (r.toString().length > 0) {
        return r;
      }
    }
    if (
      lastHighlightRangeRef.current &&
      !lastHighlightRangeRef.current.collapsed &&
      editorRef.current &&
      editorRef.current.contains(lastHighlightRangeRef.current.startContainer)
    ) {
      return lastHighlightRangeRef.current;
    }
    if (
      savedRangeRef.current &&
      !savedRangeRef.current.collapsed &&
      editorRef.current &&
      editorRef.current.contains(savedRangeRef.current.startContainer)
    ) {
      return savedRangeRef.current;
    }
    return null;
  };

  // Strict helper to find enclosing component ONLY within editorRef.current
  const findEnclosingComponent = (node: Node | null): HTMLElement | null => {
    if (!node || !editorRef.current) return null;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    if (!el || !editorRef.current.contains(el) || el === editorRef.current) return null;

    let curr: HTMLElement | null = el;
    while (curr && curr !== editorRef.current) {
      if (
        curr.classList.contains('article-component') ||
        curr.classList.contains('editorial-box') ||
        curr.hasAttribute('data-box-type') ||
        curr.tagName.toLowerCase() === 'figure' ||
        curr.tagName.toLowerCase() === 'section'
      ) {
        return curr;
      }
      curr = curr.parentElement;
    }
    if (el.tagName.toLowerCase() === 'img') {
      return el;
    }
    return null;
  };

  // Safe component selector with visual highlight ring in the editing space
  const selectComponent = (comp: HTMLElement | null) => {
    if (!comp || !editorRef.current || !editorRef.current.contains(comp) || comp === editorRef.current) {
      if (activeComp) {
        activeComp.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
      }
      setActiveComp(null);
      return;
    }
    if (activeComp && activeComp !== comp) {
      activeComp.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
    }
    comp.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
    setActiveComp(comp);
  };

  // Calculate active component & image position for floating toolbar and drag handles
  const syncActiveCompRect = (comp: HTMLElement | null = activeComp) => {
    if (!comp || !editorRef.current || !editorRef.current.contains(comp)) {
      setActiveCompRect(null);
      return;
    }
    const editorWrapper = canvasScrollRef.current || editorRef.current.parentElement;
    if (!editorWrapper) return;
    const wrapperRect = editorWrapper.getBoundingClientRect();
    const compRect = comp.getBoundingClientRect();
    const imgTarget = comp.tagName.toLowerCase() === 'img' ? comp : (comp.querySelector('img') || comp);
    const imgRect = imgTarget.getBoundingClientRect();

    const scrollTop = editorWrapper.scrollTop || 0;
    const scrollLeft = editorWrapper.scrollLeft || 0;
    const top = compRect.top - wrapperRect.top + scrollTop;
    const left = compRect.left - wrapperRect.left + scrollLeft;
    const right = wrapperRect.right - compRect.right + 16;

    setActiveCompRect({
      top,
      left,
      right: Math.max(16, right),
      width: compRect.width,
      height: compRect.height,
      imgTop: imgRect.top - wrapperRect.top + scrollTop,
      imgLeft: imgRect.left - wrapperRect.left + scrollLeft,
      imgWidth: imgRect.width,
      imgHeight: imgRect.height,
    });

    const dataWidth = comp.getAttribute('data-width');
    if (dataWidth && dataWidth.endsWith('%')) {
      const parsed = parseInt(dataWidth, 10);
      if (!Number.isNaN(parsed)) {
        setActiveImageWidthPct(Math.max(15, Math.min(100, parsed)));
        return;
      }
    }
    const editorWidth = editorRef.current.getBoundingClientRect().width || 800;
    const computedPct = Math.round((compRect.width / editorWidth) * 100);
    setActiveImageWidthPct(Math.max(15, Math.min(100, computedPct)));
  };

  useEffect(() => {
    if (!activeComp) {
      setActiveCompRect(null);
      return;
    }
    const update = () => syncActiveCompRect(activeComp);
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(activeComp);
    }
    const imgEl = activeComp.tagName.toLowerCase() === 'img' ? activeComp : activeComp.querySelector('img');
    imgEl?.addEventListener('load', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      ro?.disconnect();
      imgEl?.removeEventListener('load', update);
    };
  }, [activeComp]);

  // Sync incoming value to editor content if not focused
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    setSourceCode(value || '');
    updateStats(value || '');
  }, [value, isSourceMode]);

  // Listen for selection changes and document clicks to dismiss open menus
  useEffect(() => {
    const handleSelectionChange = () => {
      captureEditorSelection(false);
    };
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.font-family-dropdown-container')) {
        setFontFamilyMenuOpen(false);
      }
      if (!target.closest('.font-size-dropdown-container')) {
        setFontSizeMenuOpen(false);
      }
      if (!target.closest('.color-menu-container')) {
        setColorMenuOpen(false);
      }
      if (!target.closest('.highlight-menu-container')) {
        setHighlightMenuOpen(false);
      }
      if (!target.closest('.line-spacing-container')) {
        setLineSpacingMenuOpen(false);
      }
      if (!target.closest('.text-case-container')) {
        setTextCaseMenuOpen(false);
      }
      if (!target.closest('.more-styles-container')) {
        setMoreStylesMenuOpen(false);
      }
      if (!target.closest('.quick-image-menu-container')) {
        setQuickImageMenuOpen(false);
      }
      if (!target.closest('.quick-callout-menu-container')) {
        setQuickCalloutMenuOpen(false);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const updateStats = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').length : 0;
    const characters = text.length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    setStats({
      words,
      characters,
      readTime: `${minutes} min read`,
    });
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceCode(html);
      updateStats(html);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const html = e.target.value;
    setSourceCode(html);
    onChange(html);
    updateStats(html);
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    if (isSourceMode) return;
    if (command === 'insertHorizontalRule') {
      insertCustomHTML('<hr />');
      return;
    }
    const sel = window.getSelection();
    const highlightRange = getActiveHighlightRange();
    const restoreRange = highlightRange || savedRangeRef.current;

    if (sel && restoreRange && editorRef.current?.contains(restoreRange.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(restoreRange);
    }

    // If user clicks Clear Formatting (removeFormat) on a highlighted word, also strip custom inline span styles
    if (command === 'removeFormat' && highlightRange && !highlightRange.collapsed) {
      const ancestor =
        highlightRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? highlightRange.commonAncestorContainer.parentElement
          : (highlightRange.commonAncestorContainer as HTMLElement);
      const inlineSpan = ancestor?.closest('span[data-inline-styled="true"]') as HTMLElement | null;
      if (inlineSpan && editorRef.current?.contains(inlineSpan)) {
        inlineSpan.removeAttribute('style');
        inlineSpan.removeAttribute('data-custom-color');
        inlineSpan.removeAttribute('data-custom-highlight');
      }
    }

    document.execCommand(command, false, val);

    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      const newRange = sel.getRangeAt(0).cloneRange();
      savedRangeRef.current = newRange;
      if (!newRange.collapsed) {
        lastHighlightRangeRef.current = newRange.cloneRange();
      }
    }
    if (editorRef.current) {
      editorRef.current.focus({ preventScroll: true });
      syncSelectionFormattingState(sel?.anchorNode || editorRef.current);
      handleInput();
    }
  };

  const hasCustomParagraphStyle = (el: HTMLElement | null): boolean => {
    if (!el || el.tagName.toLowerCase() !== 'p') return false;
    if ((el.getAttribute('class') || '').trim().length > 0) return true;
    return Boolean(
      el.style.fontSize ||
        el.style.color ||
        el.style.backgroundColor ||
        el.style.fontStyle ||
        el.style.fontWeight ||
        el.style.border ||
        el.style.borderLeft ||
        el.style.padding ||
        el.style.fontFamily
    );
  };

  const isStyledTextBlock = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (['blockquote', 'pre', 'h1', 'h2', 'h3', 'h4'].includes(tag)) return true;
    return hasCustomParagraphStyle(el);
  };

  const stripInlineStylesInElement = (root: HTMLElement) => {
    root
      .querySelectorAll('.editor-only-controls, .box-delete-btn, .box-edit-deal-btn')
      .forEach((ctrl) => ctrl.remove());

    const inlineTags = new Set([
      'span',
      'font',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'mark',
      'code',
      'sub',
      'sup',
    ]);

    Array.from(root.querySelectorAll('*'))
      .reverse()
      .forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'a') {
          node.removeAttribute('style');
          node.removeAttribute('class');
          return;
        }
        if (inlineTags.has(tag)) {
          const parent = node.parentNode;
          if (parent) {
            while (node.firstChild) {
              parent.insertBefore(node.firstChild, node);
            }
            node.remove();
          }
          return;
        }
        if (tag !== 'img' && tag !== 'br') {
          node.removeAttribute('style');
          node.removeAttribute('class');
          node.removeAttribute('data-inline-styled');
          node.removeAttribute('data-custom-color');
          node.removeAttribute('data-custom-highlight');
        }
      });
  };

  const stripStyleFromBlockToPlainParagraph = (block: HTMLElement): HTMLParagraphElement => {
    const tag = block.tagName.toLowerCase();
    if (['blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'p'].includes(tag)) {
      const p = document.createElement('p');
      while (block.firstChild) {
        p.appendChild(block.firstChild);
      }
      stripInlineStylesInElement(p);
      if ((p.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === '' && !p.querySelector('img')) {
        p.innerHTML = '<br/>';
      }
      block.replaceWith(p);
      return p;
    }

    const clone = block.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll('.editor-only-controls, .box-delete-btn, .box-edit-deal-btn')
      .forEach((ctrl) => ctrl.remove());

    const leafEls = Array.from(
      clone.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, pre, strong')
    ).filter((el) => {
      const parentBlock = el.parentElement?.closest('h1, h2, h3, h4, p, li, blockquote, pre');
      return !parentBlock;
    });

    const plainParagraphs: HTMLParagraphElement[] = [];
    leafEls.forEach((leaf) => {
      if ((leaf.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === '' && !leaf.querySelector('img')) {
        return;
      }
      const p = document.createElement('p');
      while (leaf.firstChild) {
        p.appendChild(leaf.firstChild);
      }
      stripInlineStylesInElement(p);
      if ((p.textContent || '').replace(/[\u200B\u00A0\s]/g, '') !== '' || p.querySelector('img')) {
        plainParagraphs.push(p);
      }
    });

    if (plainParagraphs.length === 0) {
      const rawLines = (clone.textContent || '')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      rawLines.forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line;
        plainParagraphs.push(p);
      });
    }

    if (plainParagraphs.length === 0) {
      const emptyP = document.createElement('p');
      emptyP.innerHTML = '<br/>';
      plainParagraphs.push(emptyP);
    }

    block.before(...plainParagraphs);
    block.remove();
    return plainParagraphs[0];
  };

  const applyFormatBlock = (tag: string) => {
    const normalized = tag.replace(/[<>]/g, '').toLowerCase();
    if (normalized === 'p') {
      const selCheck = window.getSelection();
      const anchorNode = selCheck?.anchorNode || savedRangeRef.current?.startContainer;
      if (anchorNode && editorRef.current?.contains(anchorNode)) {
        const topChild = getTopLevelEditorChild(anchorNode);
        const endTopChild = selCheck?.focusNode ? getTopLevelEditorChild(selCheck.focusNode) : topChild;
        if (topChild && topChild === endTopChild && isStyledTextBlock(topChild)) {
          const plainP = stripStyleFromBlockToPlainParagraph(topChild);
          focusParagraphCaret(plainP);
          handleInput();
          return;
        }
      }
    }

    exec('formatBlock', `<${normalized}>`);

    // Clean stale inline font-size/weight overrides inside the target heading/paragraph so semantic hierarchy renders accurately
    const sel = window.getSelection();
    const anchor = sel?.anchorNode || savedRangeRef.current?.startContainer;
    if (anchor && editorRef.current?.contains(anchor)) {
      const el = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as HTMLElement);
      const block = el?.closest('h1, h2, h3, h4, blockquote, p, div') as HTMLElement | null;
      if (block && editorRef.current.contains(block) && block !== editorRef.current) {
        block.querySelectorAll('span[data-inline-styled="true"]').forEach((sp) => {
          if (sp instanceof HTMLElement) {
            sp.style.fontSize = '';
            sp.style.fontWeight = '';
            sp.style.lineHeight = '';
          }
        });
        if (normalized === 'h1' || normalized === 'h2' || normalized === 'h3' || normalized === 'h4' || normalized === 'blockquote' || normalized === 'p') {
          setActiveBlockTag(normalized);
        }
        handleInput();
      }
    }
  };

  const handleClearFormatting = () => {
    if (isSourceMode || !editorRef.current) return;

    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    } else if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.startContainer)) {
      range = savedRangeRef.current;
    }

    // Case 1: Active non-image component selected -> strip block card styling unless user highlighted a partial inline sub-span
    if (activeComp && editorRef.current.contains(activeComp) && !isFigureComponent(activeComp)) {
      const subP = range?.startContainer
        ? ((range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : (range.startContainer as HTMLElement)
          )?.closest('p') as HTMLElement | null)
        : null;
      const hasPartialInlineHighlight = Boolean(
        range &&
          !range.collapsed &&
          subP &&
          activeComp.contains(subP) &&
          range.toString().trim().length < (subP.textContent || '').trim().length
      );
      if (!hasPartialInlineHighlight) {
        const plainP = stripStyleFromBlockToPlainParagraph(activeComp);
        focusParagraphCaret(plainP);
        handleInput();
        return;
      }
    }

    if (!range) return;
    const startTop = getTopLevelEditorChild(range.startContainer);
    const endTop = getTopLevelEditorChild(range.endContainer) || startTop;
    if (!startTop) return;

    // Subcase 2a: Partial inline highlight inside a single plain paragraph
    if (
      !range.collapsed &&
      startTop === endTop &&
      startTop.tagName.toLowerCase() === 'p' &&
      !hasCustomParagraphStyle(startTop) &&
      range.toString().trim().length < (startTop.textContent || '').trim().length
    ) {
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      document.execCommand('removeFormat', false);
      const currentRange =
        sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)
          ? sel.getRangeAt(0)
          : range;
      const frag = currentRange.extractContents();
      const temp = document.createElement('div');
      temp.appendChild(frag);
      stripInlineStylesInElement(temp);

      const cleanFrag = document.createDocumentFragment();
      let firstInserted: Node | null = null;
      let lastInserted: Node | null = null;
      while (temp.firstChild) {
        const node = temp.firstChild;
        if (!firstInserted) firstInserted = node;
        lastInserted = node;
        cleanFrag.appendChild(node);
      }
      currentRange.insertNode(cleanFrag);

      startTop
        .querySelectorAll('span, font, strong, b, em, i, u, s, strike, mark, code, sub, sup')
        .forEach((inlineEl) => {
          if (
            inlineEl instanceof HTMLElement &&
            (inlineEl.textContent || '') === '' &&
            !inlineEl.querySelector('img, br')
          ) {
            inlineEl.remove();
          }
        });

      if (sel && firstInserted && lastInserted) {
        const newRange = document.createRange();
        newRange.setStartBefore(firstInserted);
        newRange.setEndAfter(lastInserted);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
        lastHighlightRangeRef.current = newRange.cloneRange();
      }
      editorRef.current.focus({ preventScroll: true });
      syncSelectionFormattingState(startTop);
      setCurrentSize('15px');
      handleInput();
      return;
    }

    // Subcase 2b: Collapsed caret, full-block highlight, or multi-block selection -> reset whole block(s) to plain text
    const allChildren = Array.from(editorRef.current.children) as HTMLElement[];
    const startIdx = allChildren.indexOf(startTop);
    const endIdx = endTop ? allChildren.indexOf(endTop) : startIdx;
    const minIdx = Math.max(0, Math.min(startIdx, endIdx === -1 ? startIdx : endIdx));
    const maxIdx = Math.max(minIdx, Math.max(startIdx, endIdx === -1 ? startIdx : endIdx));
    const targetBlocks =
      startIdx === -1 ? [startTop] : allChildren.slice(minIdx, maxIdx + 1);

    let firstResultEl: HTMLElement | null = null;
    targetBlocks.forEach((child) => {
      if (isFigureComponent(child) || child.tagName.toLowerCase() === 'hr') {
        return;
      }
      const tag = child.tagName.toLowerCase();
      if (tag === 'ul' || tag === 'ol') {
        child.removeAttribute('style');
        child.removeAttribute('class');
        child.querySelectorAll('li').forEach((li) => {
          if (li instanceof HTMLElement) {
            li.removeAttribute('style');
            li.removeAttribute('class');
            stripInlineStylesInElement(li);
            if (!firstResultEl) firstResultEl = li;
          }
        });
        return;
      }
      const p = stripStyleFromBlockToPlainParagraph(child);
      if (!firstResultEl) firstResultEl = p;
    });

    if (firstResultEl) {
      focusParagraphCaret(firstResultEl);
    }
    handleInput();
  };

  const handleChangeTextCase = (mode: 'upper' | 'lower' | 'title' | 'sentence') => {
    setTextCaseMenuOpen(false);
    const range = getActiveHighlightRange();
    if (!range || range.collapsed || !range.toString().trim()) {
      toastCtx?.toast.warning('Highlight the text you want to convert case first.');
      return;
    }
    const raw = range.toString();
    let converted = raw;
    if (mode === 'upper') converted = raw.toUpperCase();
    else if (mode === 'lower') converted = raw.toLowerCase();
    else if (mode === 'title') {
      converted = raw.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    } else if (mode === 'sentence') {
      const lower = raw.toLowerCase();
      converted = lower.charAt(0).toUpperCase() + lower.slice(1);
    }

    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand('insertText', false, converted);
    editorRef.current?.focus({ preventScroll: true });
    handleInput();
  };

  const handleInsertInlineCode = () => {
    const range = getActiveHighlightRange();
    if (range && !range.collapsed && range.toString().trim()) {
      const text = range.toString().trim();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      document.execCommand(
        'insertHTML',
        false,
        `<code style="background-color: #f1f5f9; color: #c62828; padding: 2px 7px; border-radius: 6px; font-family: monospace; font-weight: 800; border: 1px solid #cbd5e1;">${text}</code>&nbsp;`
      );
      editorRef.current?.focus({ preventScroll: true });
      handleInput();
      return;
    }
    insertCustomHTML(
      `<code style="background-color: #f1f5f9; color: #c62828; padding: 2px 7px; border-radius: 6px; font-family: monospace; font-weight: 800; border: 1px solid #cbd5e1;">PROMO20</code>&nbsp;`
    );
  };

  const handleInsertChecklist = () => {
    const checklistHtml = `
      <ul class="editorial-checklist" style="list-style: none; padding-left: 0; margin: 16px 0; space-y: 8px;">
        <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;"><span style="color: #059669; font-weight: 900;">✓</span><span>Key strength or verified benefit #1 (click to edit)</span></li>
        <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;"><span style="color: #059669; font-weight: 900;">✓</span><span>Key strength or verified benefit #2 (click to edit)</span></li>
        <li style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px;"><span style="color: #059669; font-weight: 900;">✓</span><span>Money-back guarantee or discount eligibility note</span></li>
      </ul><p><br/></p>
    `;
    insertCustomHTML(checklistHtml);
  };

  const handleApplyExtraStyle = (
    preset: 'lead' | 'takeaway' | 'pullquote' | 'badge' | 'codeblock' | 'footnote' | 'review-outline'
  ) => {
    setMoreStylesMenuOpen(false);
    const range = getActiveHighlightRange();
    const selectedText = range && !range.collapsed ? range.toString().trim() : '';

    if (preset === 'lead') {
      if (selectedText) {
        applyInlineStylesToSelection({
          fontSize: '18px',
          fontWeight: '500',
          lineHeight: '1.7',
          color: '#334155',
        });
      } else {
        insertCustomHTML(
          `<p style="font-size: 18px; font-weight: 500; line-height: 1.7; color: #334155; margin: 12px 0;">Quick Lead Summary: Summarize the brand or product value proposition in 2 clear sentences here...</p>`
        );
      }
      return;
    }

    if (preset === 'takeaway') {
      insertCallout('info');
      return;
    }

    if (preset === 'pullquote') {
      const quoteBody = selectedText || 'After 30 days of hands-on testing, this stood out for reliability and everyday value.';
      insertCustomHTML(
        `<blockquote style="border-left: 4px solid #C62828; background-color: #fef2f2; color: #1e293b; font-style: italic; font-size: 16px; font-weight: 600; padding: 14px 18px; margin: 18px 0; border-radius: 0 12px 12px 0;">“${quoteBody}”</blockquote><p><br/></p>`
      );
      return;
    }

    if (preset === 'badge') {
      const badgeLabel = selectedText || "Editor's Pick";
      if (selectedText && range) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        document.execCommand(
          'insertHTML',
          false,
          `<span style="display: inline-block; background-color: #fef2f2; color: #c62828; border: 1px solid #fecaca; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 9999px; letter-spacing: 0.03em;">${badgeLabel}</span>&nbsp;`
        );
        editorRef.current?.focus({ preventScroll: true });
        handleInput();
      } else {
        insertCustomHTML(
          `<span style="display: inline-block; background-color: #fef2f2; color: #c62828; border: 1px solid #fecaca; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 9999px; letter-spacing: 0.03em;">${badgeLabel}</span>&nbsp;`
        );
      }
      return;
    }

    if (preset === 'codeblock') {
      const codeBody = selectedText || 'PROMO CODE: HEYGOODLY20 — Apply at checkout for instant savings.';
      insertCustomHTML(
        `<pre style="background-color: #0f172a; color: #e2e8f0; padding: 14px 16px; border-radius: 12px; font-family: monospace; font-size: 13px; margin: 16px 0; overflow-x: auto;"><code>${codeBody}</code></pre><p><br/></p>`
      );
      return;
    }

    if (preset === 'footnote') {
      if (selectedText) {
        applyInlineStylesToSelection({
          fontSize: '12px',
          fontStyle: 'italic',
          color: '#64748b',
        });
      } else {
        insertCustomHTML(
          `<p style="font-size: 12px; font-style: italic; color: #64748b; margin: 8px 0;">Note: Pricing, terms, and coupon eligibility verified at the time of publication.</p>`
        );
      }
      return;
    }

    if (preset === 'review-outline') {
      insertCustomHTML(`
        <h1>Product / Brand Name: Full Review &amp; Testing Guide</h1>
        <p style="font-size: 17px; color: #334155; line-height: 1.7;"><strong>Quick Verdict:</strong> Write a crisp 2-sentence overview introducing who this brand/product is built for and its standout advantage.</p>
        <h2>1. Overview &amp; Key Highlights</h2>
        <p>Describe core features, pricing plans, and what sets it apart from competing options on the market.</p>
        <h3>1.1 User Experience &amp; Onboarding</h3>
        <p>Walk readers through setup speed, dashboard or product quality, and everyday usability.</p>
        <h3>1.2 Real-World Performance</h3>
        <p>Share concrete test benchmarks, response times, or long-term durability impressions.</p>
        <h2>2. Key Pros &amp; Cons</h2>
        <ul>
          <li><strong>Pro:</strong> Transparent pricing and verified discount eligibility.</li>
          <li><strong>Pro:</strong> Reliable customer support and responsive service.</li>
          <li><strong>Con:</strong> Certain premium tiers require an annual commitment.</li>
        </ul>
        <h2>3. Pricing &amp; How to Apply Coupon Codes</h2>
        <p>Explain step-by-step where to enter the promo code at checkout to lock in maximum savings.</p>
        <h2>4. Final Editorial Verdict</h2>
        <p>Summarize whether it is worth buying right now and which customer profile benefits most.</p>
      `);
    }
  };

  const isBlockObjectElement = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    if (
      el.classList.contains('editorial-box') ||
      el.classList.contains('article-component') ||
      el.hasAttribute('data-box-type')
    ) {
      return true;
    }
    const tag = el.tagName.toLowerCase();
    return ['figure', 'section', 'table', 'blockquote', 'pre', 'hr', 'ul', 'ol', 'div'].includes(tag);
  };

  const getTopLevelEditorChild = (node: Node | null): HTMLElement | null => {
    if (!node || !editorRef.current) return null;
    const startEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement | null);
    if (!startEl || !editorRef.current.contains(startEl) || startEl === editorRef.current) return null;
    let curr: HTMLElement | null = startEl;
    while (curr && curr.parentElement !== editorRef.current) {
      curr = curr.parentElement;
    }
    return curr && curr.parentElement === editorRef.current ? curr : null;
  };

  const isEmptyParagraphElement = (el: Element | null): el is HTMLParagraphElement => {
    if (!el || el.tagName.toLowerCase() !== 'p') return false;
    if (el.querySelector('img, figure, table, hr, input, iframe')) return false;
    const cleanedText = (el.textContent || '').replace(/[\u200B\u00A0\s]/g, '');
    return cleanedText === '';
  };

  const focusParagraphCaret = (p: HTMLElement) => {
    selectComponent(null);
    const placeCaret = () => {
      if (!p.isConnected || !editorRef.current || !editorRef.current.contains(p)) return;
      editorRef.current.focus({ preventScroll: true });
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        savedRangeRef.current = range.cloneRange();
      }
      lastHighlightRangeRef.current = null;
      syncSelectionFormattingState(p);
      if (p.tagName.toLowerCase() === 'p' && !hasCustomParagraphStyle(p)) {
        setCurrentSize('15px');
      }
    };
    placeCaret();
    requestAnimationFrame(() => placeCaret());
    p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const insertLineAfterElement = (
    el: HTMLElement,
    options?: { clearFloat?: boolean; forceNew?: boolean }
  ): HTMLParagraphElement | null => {
    if (!editorRef.current || !editorRef.current.contains(el) || el === editorRef.current) {
      return null;
    }
    const anchor = getTopLevelEditorChild(el) || el;
    const isFloated =
      anchor.style.float === 'left' ||
      anchor.style.float === 'right' ||
      el.style.float === 'left' ||
      el.style.float === 'right';
    const shouldClearFloat = Boolean(options?.clearFloat && isFloated);

    const nextSibling = anchor.nextElementSibling;
    if (!options?.forceNew && isEmptyParagraphElement(nextSibling)) {
      if (shouldClearFloat) {
        nextSibling.style.clear = 'both';
      }
      focusParagraphCaret(nextSibling);
      handleInput();
      return nextSibling;
    }

    const p = document.createElement('p');
    p.innerHTML = '<br/>';
    if (shouldClearFloat) {
      p.style.clear = 'both';
    }
    anchor.after(p);
    focusParagraphCaret(p);
    handleInput();
    return p;
  };

  const insertLineBeforeElement = (
    el: HTMLElement,
    options?: { forceNew?: boolean }
  ): HTMLParagraphElement | null => {
    if (!editorRef.current || !editorRef.current.contains(el) || el === editorRef.current) {
      return null;
    }
    const anchor = getTopLevelEditorChild(el) || el;
    const prevSibling = anchor.previousElementSibling;
    if (!options?.forceNew && isEmptyParagraphElement(prevSibling)) {
      focusParagraphCaret(prevSibling);
      handleInput();
      return prevSibling;
    }

    const p = document.createElement('p');
    p.innerHTML = '<br/>';
    anchor.before(p);
    focusParagraphCaret(p);
    handleInput();
    return p;
  };

  const ensureLeadingEditableParagraphAndFocus = () => {
    if (!editorRef.current) return;
    const firstEl = editorRef.current.firstElementChild as HTMLElement | null;
    if (isEmptyParagraphElement(firstEl)) {
      focusParagraphCaret(firstEl);
      return;
    }
    const p = document.createElement('p');
    p.innerHTML = '<br/>';
    editorRef.current.prepend(p);
    focusParagraphCaret(p);
    handleInput();
  };

  const ensureTrailingEditableParagraphAndFocus = (options?: { clearFloat?: boolean }) => {
    if (!editorRef.current) return;
    const lastEl = editorRef.current.lastElementChild as HTMLElement | null;
    if (isEmptyParagraphElement(lastEl)) {
      if (options?.clearFloat) {
        lastEl.style.clear = 'both';
      }
      focusParagraphCaret(lastEl);
      return;
    }
    const p = document.createElement('p');
    p.innerHTML = '<br/>';
    if (
      options?.clearFloat ||
      (lastEl && (lastEl.style.float === 'left' || lastEl.style.float === 'right'))
    ) {
      p.style.clear = 'both';
    }
    editorRef.current.appendChild(p);
    focusParagraphCaret(p);
    handleInput();
  };

  const insertCustomHTML = (html: string) => {
    if (isSourceMode) {
      const nextSource = sourceCode + html;
      setSourceCode(nextSource);
      onChange(nextSource);
      return;
    }

    if (!editorRef.current) return;

    const sel = window.getSelection();
    let range: Range | null = null;
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    } else if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.startContainer)) {
      range = savedRangeRef.current;
    }

    const temp = document.createElement('div');
    temp.innerHTML = html.trim();
    const containsBlockObject = Array.from(temp.children).some((child) =>
      isBlockObjectElement(child as HTMLElement)
    );

    if (containsBlockObject) {
      while (temp.lastElementChild && isEmptyParagraphElement(temp.lastElementChild)) {
        temp.lastElementChild.remove();
      }

      const fragment = document.createDocumentFragment();
      let lastInsertedEl: HTMLElement | null = null;
      while (temp.firstChild) {
        const child = temp.firstChild;
        if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) {
          temp.removeChild(child);
          continue;
        }
        if (child instanceof HTMLElement) {
          lastInsertedEl = child;
        }
        fragment.appendChild(child);
      }

      // Case A: Active component currently selected -> insert at top level right after it
      if (activeComp && editorRef.current.contains(activeComp)) {
        const anchor = getTopLevelEditorChild(activeComp) || activeComp;
        anchor.after(fragment);
      } else if (range) {
        // Case B: Insert at top level relative to current cursor range (never nest block inside <p>)
        range.deleteContents();
        const topChild = getTopLevelEditorChild(range.startContainer);
        if (topChild) {
          if (isEmptyParagraphElement(topChild)) {
            topChild.replaceWith(fragment);
          } else if (topChild.tagName.toLowerCase() === 'p') {
            const beforeRange = document.createRange();
            beforeRange.setStart(topChild, 0);
            beforeRange.setEnd(range.startContainer, range.startOffset);

            const afterRange = document.createRange();
            afterRange.setStart(range.endContainer, range.endOffset);
            afterRange.setEnd(topChild, topChild.childNodes.length);

            const hasBeforeText = beforeRange.toString().trim().length > 0;
            const hasAfterText = afterRange.toString().trim().length > 0;

            if (!hasBeforeText && hasAfterText) {
              topChild.before(fragment);
            } else if (hasBeforeText && hasAfterText) {
              const afterFrag = afterRange.extractContents();
              const afterP = document.createElement('p');
              afterP.appendChild(afterFrag);
              topChild.after(fragment);
              if (lastInsertedEl) {
                lastInsertedEl.after(afterP);
              } else {
                topChild.after(afterP);
              }
            } else {
              topChild.after(fragment);
            }
          } else {
            topChild.after(fragment);
          }
        } else {
          const refNode = editorRef.current.childNodes[range.startOffset] || null;
          if (refNode) {
            editorRef.current.insertBefore(fragment, refNode);
          } else {
            editorRef.current.appendChild(fragment);
          }
        }
      } else {
        // Case C: Append to the end of the editor
        editorRef.current.appendChild(fragment);
      }

      if (lastInsertedEl && editorRef.current.contains(lastInsertedEl)) {
        const nextEl = lastInsertedEl.nextElementSibling as HTMLElement | null;
        const isFloated =
          lastInsertedEl.style.float === 'left' || lastInsertedEl.style.float === 'right';
        if (nextEl && isEmptyParagraphElement(nextEl)) {
          focusParagraphCaret(nextEl);
        } else if (isFloated && nextEl && !isBlockObjectElement(nextEl)) {
          focusParagraphCaret(nextEl);
        } else {
          const p = document.createElement('p');
          p.innerHTML = '<br/>';
          lastInsertedEl.after(p);
          focusParagraphCaret(p);
        }
      } else {
        ensureTrailingEditableParagraphAndFocus();
      }

      handleInput();
      return;
    }

    // Inline HTML or plain paragraph insertion
    // 1. If an active component is currently selected, insert after its top-level block
    if (activeComp && editorRef.current.contains(activeComp)) {
      const anchor = getTopLevelEditorChild(activeComp) || activeComp;
      const fragment = document.createDocumentFragment();
      let lastNode: Node | null = null;
      let firstInsertedP: HTMLElement | null = null;
      while (temp.firstChild) {
        const child = temp.firstChild;
        if (!firstInsertedP && child instanceof HTMLElement && child.tagName.toLowerCase() === 'p') {
          firstInsertedP = child;
        }
        lastNode = child;
        fragment.appendChild(child);
      }
      anchor.after(fragment);
      if (firstInsertedP) {
        focusParagraphCaret(firstInsertedP);
      } else if (lastNode && sel) {
        selectComponent(null);
        const newRange = document.createRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
        editorRef.current.focus({ preventScroll: true });
      }
      handleInput();
      return;
    }

    // 2. Try inserting inline at cursor / range
    if (range) {
      try {
        range.deleteContents();
        const fragment = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (temp.firstChild) {
          lastNode = temp.firstChild;
          fragment.appendChild(lastNode);
        }
        range.insertNode(fragment);

        if (lastNode && sel) {
          const newRange = document.createRange();
          newRange.setStartAfter(lastNode);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedRangeRef.current = newRange.cloneRange();
        }

        editorRef.current.focus({ preventScroll: true });
        handleInput();
        return;
      } catch (err) {
        console.warn('Direct DOM insertion failed, falling back', err);
      }
    }

    // 3. Fallback: Append directly to the end of the editor
    let lastAddedNode: Node | null = null;
    while (temp.firstChild) {
      lastAddedNode = temp.firstChild;
      editorRef.current.appendChild(lastAddedNode);
    }

    if (lastAddedNode instanceof HTMLElement && lastAddedNode.tagName.toLowerCase() === 'p') {
      focusParagraphCaret(lastAddedNode);
    } else {
      ensureTrailingEditableParagraphAndFocus();
    }
    handleInput();
  };

  // Helper to get friendly component name (strictly inside editor, never matches outer form)
  const getComponentLabel = (el: HTMLElement | null): string => {
    if (!el || !editorRef.current || !editorRef.current.contains(el) || el === editorRef.current) return '';
    const textTitle = el.querySelector('h2, h3, h4')?.textContent?.trim();
    if (textTitle && !textTitle.toLowerCase().includes('article body content')) {
      return textTitle.slice(0, 42);
    }
    const boxType = el.getAttribute('data-box-type');
    if (boxType) {
      if (boxType === 'deal') return 'Promo Deal Box';
      if (boxType === 'tip') return 'Testing Tip Box';
      if (boxType === 'warning') return 'Warning Callout Box';
      if (boxType === 'info') return 'Key Takeaway Box';
      if (boxType === 'verdict') return 'Editorial Verdict Box';
      if (boxType === 'pros-cons') return 'Pros & Cons Grid';
      if (boxType === 'button') return 'CTA Checkout Button';
      if (boxType === 'image') return 'Image Figure';
      if (boxType === 'image-gallery') return 'Photo Gallery Grid';
      if (boxType === 'image-split') return 'Image + Text Card';
      if (boxType === 'specs') return 'Key Specifications Card';
    }
    if (el.tagName.toLowerCase() === 'figure') return 'Image Figure';
    if (el.tagName.toLowerCase() === 'section') return 'Article Section Card';
    return 'Article Block / Component';
  };

  // Move active component up in DOM
  const moveComponentUp = () => {
    if (!activeComp || !editorRef.current || !editorRef.current.contains(activeComp)) return;
    const prev = activeComp.previousElementSibling;
    if (prev) {
      editorRef.current.insertBefore(activeComp, prev);
      handleInput();
      activeComp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      syncActiveCompRect(activeComp);
    }
  };

  // Move active component down in DOM
  const moveComponentDown = () => {
    if (!activeComp || !editorRef.current || !editorRef.current.contains(activeComp)) return;
    const next = activeComp.nextElementSibling;
    if (next) {
      editorRef.current.insertBefore(next, activeComp);
      if (editorRef.current.lastElementChild === activeComp) {
        const p = document.createElement('p');
        p.innerHTML = '<br/>';
        editorRef.current.appendChild(p);
      }
      handleInput();
      activeComp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      syncActiveCompRect(activeComp);
    }
  };

  // Interactive drag-and-drop repositioning to move images or blocks anywhere on the canvas
  const beginDragMove = (comp: HTMLElement, startX: number, startY: number) => {
    if (!editorRef.current || !canvasScrollRef.current || !editorRef.current.contains(comp)) return;

    const editorEl = editorRef.current;
    const scrollContainer = canvasScrollRef.current;
    const isImg = isFigureComponent(comp);
    const imgEl = comp.tagName.toLowerCase() === 'img' ? comp : comp.querySelector('img');
    const thumbSrc = imgEl?.getAttribute('src') || undefined;
    const label = getComponentLabel(comp) || (isImg ? 'Image' : 'Block');

    const prevOpacity = comp.style.opacity;
    const prevScrollBehavior = scrollContainer.style.scrollBehavior;
    comp.style.opacity = '0.35';
    scrollContainer.style.scrollBehavior = 'auto';

    let latestTarget: {
      targetEl: HTMLElement | null;
      position: 'before' | 'after' | 'append';
      zone: 'left' | 'center' | 'right';
    } = { targetEl: null, position: 'append', zone: 'center' };

    const computeDropTarget = (clientX: number, clientY: number) => {
      const wrapperRect = scrollContainer.getBoundingClientRect();
      if (clientY < wrapperRect.top + 55) {
        scrollContainer.scrollTop -= 16;
      } else if (clientY > wrapperRect.bottom - 55) {
        scrollContainer.scrollTop += 16;
      }

      const editorRect = editorEl.getBoundingClientRect();
      const scrollTop = scrollContainer.scrollTop || 0;
      const scrollLeft = scrollContainer.scrollLeft || 0;

      const xRatio = (clientX - editorRect.left) / Math.max(1, editorRect.width);
      const zone: 'left' | 'center' | 'right' = isImg
        ? xRatio < 0.28
          ? 'left'
          : xRatio > 0.72
          ? 'right'
          : 'center'
        : 'center';

      const siblings = Array.from(editorEl.children).filter(
        (ch): ch is HTMLElement =>
          ch instanceof HTMLElement && ch !== comp && !comp.contains(ch) && !ch.contains(comp)
      );

      let targetEl: HTMLElement | null = null;
      let position: 'before' | 'after' | 'append' = 'append';

      for (const sib of siblings) {
        const rect = sib.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (clientY <= midY) {
          targetEl = sib;
          position = 'before';
          break;
        }
      }

      if (!targetEl && siblings.length > 0) {
        targetEl = siblings[siblings.length - 1];
        position = 'after';
      }

      latestTarget = { targetEl, position, zone };

      let dropTop = editorRect.top - wrapperRect.top + scrollTop + 12;
      let dropLeft = editorRect.left - wrapperRect.left + scrollLeft;
      let dropWidth = Math.max(200, editorRect.width);
      let dropHeight = 4;

      if (targetEl) {
        const targetRect = targetEl.getBoundingClientRect();
        if (zone === 'center') {
          dropTop =
            (position === 'before' ? targetRect.top : targetRect.bottom) - wrapperRect.top + scrollTop;
        } else {
          dropHeight = Math.max(56, Math.min(130, targetRect.height || 72));
          dropTop = targetRect.top - wrapperRect.top + scrollTop;
          const zoneW = Math.round(editorRect.width * 0.36);
          dropWidth = zoneW;
          if (zone === 'right') {
            dropLeft = editorRect.right - zoneW - wrapperRect.left + scrollLeft;
          }
        }
      }

      setDragMoveState({
        isImage: isImg,
        label,
        thumbSrc,
        ghostX: clientX,
        ghostY: clientY,
        dropTop,
        dropLeft,
        dropWidth,
        dropHeight,
        zone,
      });
    };

    computeDropTarget(startX, startY);

    const onMouseMove = (ev: MouseEvent) => {
      computeDropTarget(ev.clientX, ev.clientY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      comp.style.opacity = prevOpacity;
      scrollContainer.style.scrollBehavior = prevScrollBehavior;
      setDragMoveState(null);

      const { targetEl, position, zone } = latestTarget;
      if (targetEl && editorEl.contains(targetEl) && !comp.contains(targetEl)) {
        if (isImg && (zone === 'left' || zone === 'right')) {
          editorEl.insertBefore(comp, targetEl);
        } else if (position === 'before') {
          editorEl.insertBefore(comp, targetEl);
        } else {
          targetEl.after(comp);
        }
      } else if (!editorEl.contains(comp)) {
        editorEl.appendChild(comp);
      }

      if (isImg) {
        const currentPctNum = parseInt(comp.getAttribute('data-width') || `${activeImageWidthPct}`, 10) || 70;
        if (zone === 'left' || zone === 'right') {
          const wrapPct = currentPctNum > 55 ? 45 : currentPctNum;
          applyImageElementLayout(comp, zone, `${wrapPct}%`);
          setActiveImageWidthPct(wrapPct);
        } else {
          const centerPct = Math.min(100, currentPctNum);
          applyImageElementLayout(comp, 'center', `${centerPct}%`);
          setActiveImageWidthPct(centerPct);
        }
      }

      if (editorEl.lastElementChild === comp) {
        const p = document.createElement('p');
        p.innerHTML = '<br/>';
        editorEl.appendChild(p);
      }

      selectComponent(comp);
      handleInput();
      syncActiveCompRect(comp);
      requestAnimationFrame(() => syncActiveCompRect(comp));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Start drag after small pointer threshold (prevents accidental drags when simply clicking to select)
  const queueDragMove = (comp: HTMLElement, e: React.MouseEvent, threshold = 5) => {
    e.preventDefault();
    e.stopPropagation();
    const originX = e.clientX;
    const originY = e.clientY;

    const cleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    const onMove = (ev: MouseEvent) => {
      if (Math.hypot(ev.clientX - originX, ev.clientY - originY) >= threshold) {
        cleanup();
        beginDragMove(comp, ev.clientX, ev.clientY);
      }
    };

    const onUp = () => {
      cleanup();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleEditorMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isSourceMode) return;
    const target = e.target as HTMLElement;
    if (target.closest('.editor-only-controls, .box-delete-btn, .box-edit-deal-btn, figcaption')) return;
    if (target.tagName.toLowerCase() === 'img') {
      const comp = findEnclosingComponent(target);
      if (comp && editorRef.current?.contains(comp)) {
        selectComponent(comp);
        queueDragMove(comp, e, 6);
      }
    }
  };

  // Duplicate active component
  const cloneComponent = () => {
    if (!activeComp || !editorRef.current || !editorRef.current.contains(activeComp)) return;
    const clone = activeComp.cloneNode(true) as HTMLElement;
    clone.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
    activeComp.after(clone);
    if (editorRef.current.lastElementChild === clone) {
      const p = document.createElement('p');
      p.innerHTML = '<br/>';
      editorRef.current.appendChild(p);
    }
    selectComponent(clone);
    handleInput();
    clone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Switch style on active component
  const applyComponentStyle = (style: 'white' | 'deal' | 'dark' | 'emerald' | 'amber' | 'minimal') => {
    if (!activeComp || !editorRef.current || !editorRef.current.contains(activeComp)) return;
    const baseClasses = 'rounded-2xl p-6 sm:p-8 space-y-4 article-component my-6 transition-all';
    if (style === 'white') {
      activeComp.className = `bg-white border border-slate-200/80 shadow-xs ${baseClasses}`;
      activeComp.style.backgroundColor = '';
      activeComp.style.color = '';
      activeComp.querySelectorAll('h2, h3, h4').forEach((h) => {
        h.classList.remove('text-white');
        h.classList.add('text-slate-950');
      });
      activeComp.querySelectorAll('p').forEach((p) => {
        p.classList.remove('text-slate-300');
        p.classList.add('text-slate-600');
      });
    } else if (style === 'deal') {
      activeComp.className = `bg-gradient-to-br from-red-50 via-white to-orange-50 border-2 border-dashed border-red-700 shadow-xs ${baseClasses}`;
      activeComp.style.backgroundColor = '';
      activeComp.style.color = '';
      activeComp.querySelectorAll('h2, h3, h4').forEach((h) => {
        h.classList.remove('text-white');
        h.classList.add('text-slate-950');
      });
      activeComp.querySelectorAll('p').forEach((p) => {
        p.classList.remove('text-slate-300');
        p.classList.add('text-slate-600');
      });
    } else if (style === 'dark') {
      activeComp.className = `bg-slate-900 text-white shadow-md ${baseClasses}`;
      activeComp.style.backgroundColor = '#0f172a';
      activeComp.style.color = '#ffffff';
      activeComp.querySelectorAll('h2, h3, h4').forEach((h) => {
        h.classList.remove('text-slate-950');
        h.classList.add('text-white');
      });
      activeComp.querySelectorAll('p').forEach((p) => {
        p.classList.remove('text-slate-600');
        p.classList.add('text-slate-300');
      });
    } else if (style === 'emerald') {
      activeComp.className = `bg-emerald-50/70 border border-emerald-200 text-emerald-950 shadow-xs ${baseClasses}`;
      activeComp.style.backgroundColor = '';
      activeComp.style.color = '';
      activeComp.querySelectorAll('h2, h3, h4').forEach((h) => {
        h.classList.remove('text-white');
        h.classList.add('text-emerald-950');
      });
    } else if (style === 'amber') {
      activeComp.className = `bg-amber-50/70 border border-amber-200 text-amber-950 shadow-xs ${baseClasses}`;
      activeComp.style.backgroundColor = '';
      activeComp.style.color = '';
      activeComp.querySelectorAll('h2, h3, h4').forEach((h) => {
        h.classList.remove('text-white');
        h.classList.add('text-amber-950');
      });
    } else if (style === 'minimal') {
      activeComp.className = `p-4 sm:p-6 border-b border-slate-200 space-y-3 article-component my-4`;
      activeComp.style.backgroundColor = '';
      activeComp.style.color = '';
    }
    setStyleDropdownOpen(false);
    handleInput();
  };

  // Insert template component into document
  const insertTemplate = (templateHTML: string) => {
    insertCustomHTML(templateHTML);
    setAddCompModalOpen(false);
  };

  // 1. Delete selected or enclosing box/component (strictly inside editor)
  const deleteActiveBox = () => {
    if (isSourceMode) return;
    let targetComp = activeComp;
    if (!targetComp || !editorRef.current?.contains(targetComp) || targetComp === editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        targetComp = findEnclosingComponent(selection.anchorNode);
      }
    }
    if (!targetComp || !editorRef.current || !editorRef.current.contains(targetComp) || targetComp === editorRef.current) {
      toastCtx?.toast.warning('Please click to select an article card or component inside the editor content to delete.');
      return;
    }
    targetComp.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
    targetComp.remove();
    setActiveComp(null);
    handleInput();
  };

  // Focus or create a trailing paragraph below all existing blocks (including floats)
  const focusBottomCanvasLine = () => {
    if (!editorRef.current) return;
    const hasFloatedChild = Array.from(editorRef.current.children).some(
      (ch) => (ch as HTMLElement).style.float === 'left' || (ch as HTMLElement).style.float === 'right'
    );
    ensureTrailingEditableParagraphAndFocus({ clearFloat: hasFloatedChild });
  };

  const handleCanvasBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const firstEl = editorRef.current?.firstElementChild as HTMLElement | null;
      if (firstEl && e.clientY <= firstEl.getBoundingClientRect().top + 8) {
        ensureLeadingEditableParagraphAndFocus();
        return;
      }
      focusBottomCanvasLine();
    }
  };

  // Delegated click handler on editor container for quick delete and edit buttons
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Handle Delete Box/Component button directly inside card
    const deleteBtn = target.closest('.box-delete-btn, .comp-delete-btn');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      const box = findEnclosingComponent(deleteBtn);
      if (box && editorRef.current && editorRef.current.contains(box) && box !== editorRef.current) {
        box.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
        box.remove();
        setActiveComp(null);
        handleInput();
      }
      return;
    }

    // Handle Edit Deal / Button Link
    const editBtn = target.closest('.box-edit-deal-btn');
    if (editBtn) {
      e.preventDefault();
      e.stopPropagation();
      const box = findEnclosingComponent(editBtn);
      if (box) {
        setEditingBoxEl(box);
        const titleEl = box.querySelector('.deal-title');
        const priceEl = box.querySelector('.deal-price');
        const origPriceEl = box.querySelector('.deal-original-price');
        const codeEl = box.querySelector('.deal-code');
        const linkEl = box.querySelector('.deal-button') as HTMLAnchorElement;
        
        setDealForm({
          title: titleEl?.textContent || 'Product Deal Title',
          dealPrice: priceEl?.textContent || '$49.99',
          originalPrice: origPriceEl?.textContent || '$89.99',
          couponCode: codeEl?.textContent || 'DISCOUNT20',
          badge: 'Verified Exclusive Deal',
          description: 'Verified promo code tested against live merchant checkout.',
          buttonText: linkEl?.textContent?.trim() || 'Claim Deal at Official Store →',
          buttonUrl: linkEl?.href || 'https://',
          buttonStyle: 'crimson',
        });
        setDealModalOpen(true);
      }
      return;
    }

    // Clicking empty top/gap/bottom space inside editor creates & focuses an editable line
    if (target === editorRef.current && editorRef.current) {
      const children = Array.from(editorRef.current.children) as HTMLElement[];
      if (children.length === 0) {
        focusBottomCanvasLine();
        return;
      }
      if (e.clientY <= children[0].getBoundingClientRect().top + 8) {
        ensureLeadingEditableParagraphAndFocus();
        return;
      }
      const maxChildBottom = children.reduce(
        (max, ch) => Math.max(max, ch.getBoundingClientRect().bottom),
        0
      );
      if (e.clientY >= maxChildBottom - 4) {
        focusBottomCanvasLine();
        return;
      }
      const nextBlockBelowClick = children.find((ch) => ch.getBoundingClientRect().top > e.clientY);
      if (nextBlockBelowClick && isBlockObjectElement(nextBlockBelowClick)) {
        const prevSibling = nextBlockBelowClick.previousElementSibling as HTMLElement | null;
        if (!prevSibling || isBlockObjectElement(prevSibling)) {
          insertLineBeforeElement(nextBlockBelowClick, { forceNew: false });
          return;
        }
      }
    }

    // Detect active component strictly inside editorRef.current
    const comp = findEnclosingComponent(target);
    selectComponent(comp);

    // Handle Direct Click on Links to Edit Link
    const linkEl = target.closest('a');
    if (linkEl && !linkEl.classList.contains('deal-button') && !linkEl.classList.contains('cta-button')) {
      if (e.altKey || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        setLinkUrl(linkEl.getAttribute('href') || '');
        setLinkText(linkEl.textContent || '');
        setLinkModalOpen(true);
      }
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isSourceMode || !editorRef.current) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openLinkModal();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
      e.preventDefault();
      handleClearFormatting();
      return;
    }

    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode || null;
    const anchorEl = anchorNode
      ? anchorNode.nodeType === Node.TEXT_NODE
        ? anchorNode.parentElement
        : (anchorNode as HTMLElement)
      : null;

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const block =
        (activeComp && editorRef.current.contains(activeComp) ? activeComp : null) ||
        (anchorEl?.closest(
          '.editorial-box, .article-component, [data-box-type], figure, section, table, blockquote, pre'
        ) as HTMLElement | null);
      if (block && editorRef.current.contains(block) && block !== editorRef.current) {
        e.preventDefault();
        if (e.shiftKey) {
          insertLineBeforeElement(block, { forceNew: true });
        } else {
          insertLineAfterElement(block, { forceNew: true, clearFloat: true });
        }
        return;
      }
    }

    if (e.key === 'ArrowUp' && !e.shiftKey) {
      if (
        activeComp &&
        editorRef.current.contains(activeComp) &&
        isFigureComponent(activeComp) &&
        !anchorEl?.closest('figcaption')
      ) {
        e.preventDefault();
        insertLineBeforeElement(activeComp, { forceNew: false });
        return;
      }

      const topChild = getTopLevelEditorChild(anchorNode);
      if (
        topChild &&
        isBlockObjectElement(topChild) &&
        (!topChild.previousElementSibling ||
          isBlockObjectElement(topChild.previousElementSibling as HTMLElement))
      ) {
        const tableEl = anchorEl?.closest('table');
        if (tableEl && topChild.contains(tableEl)) {
          const currentTr = anchorEl?.closest('tr');
          const firstTr = tableEl.querySelector('tr');
          if (currentTr && currentTr === firstTr) {
            e.preventDefault();
            insertLineBeforeElement(topChild, { forceNew: false });
            return;
          }
          return;
        }

        if (sel?.isCollapsed && sel.rangeCount > 0) {
          const firstContentEl = Array.from(
            topChild.querySelectorAll('h1, h2, h3, h4, p, strong, li, span, div')
          ).find(
            (el) => !el.closest('.editor-only-controls') && (el.textContent || '').trim().length > 0
          ) as HTMLElement | undefined;

          if (firstContentEl) {
            const caretRect = sel.getRangeAt(0).getBoundingClientRect();
            const atTopVisualLine =
              caretRect.top > 0 && caretRect.top <= firstContentEl.getBoundingClientRect().top + 10;
            const atVeryStartOfFirstEl =
              (anchorEl === firstContentEl || firstContentEl.contains(anchorEl)) &&
              sel.anchorOffset === 0;
            if (atTopVisualLine || atVeryStartOfFirstEl) {
              e.preventDefault();
              insertLineBeforeElement(topChild, { forceNew: false });
              return;
            }
          }
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const figCap = anchorEl?.closest('figcaption');
      if (figCap) {
        const fig = figCap.closest('figure') as HTMLElement | null;
        if (fig && editorRef.current.contains(fig)) {
          e.preventDefault();
          insertLineAfterElement(fig, { forceNew: true, clearFloat: true });
          return;
        }
      }

      if (activeComp && editorRef.current.contains(activeComp) && isFigureComponent(activeComp)) {
        e.preventDefault();
        insertLineAfterElement(activeComp, { forceNew: true, clearFloat: true });
        return;
      }

      const topBlock = getTopLevelEditorChild(anchorNode);
      const inInlineStyledBadge = Boolean(
        topBlock &&
          topBlock.tagName.toLowerCase() === 'p' &&
          anchorEl?.closest('code, span[data-inline-styled="true"], span[style]')
      );
      if (topBlock && sel && sel.rangeCount > 0 && (isStyledTextBlock(topBlock) || inInlineStyledBadge)) {
        const range = sel.getRangeAt(0);
        const beforeRange = document.createRange();
        beforeRange.setStart(topBlock, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);

        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEnd(topBlock, topBlock.childNodes.length);

        const hasBeforeText = beforeRange.toString().replace(/[\u200B\u00A0\s]/g, '').length > 0;
        const hasAfterText = afterRange.toString().replace(/[\u200B\u00A0\s]/g, '').length > 0;

        if (!hasAfterText) {
          e.preventDefault();
          const p = document.createElement('p');
          p.innerHTML = '<br/>';
          topBlock.after(p);
          focusParagraphCaret(p);
          handleInput();
          return;
        }

        if (isStyledTextBlock(topBlock)) {
          e.preventDefault();
          if (!hasBeforeText) {
            const p = document.createElement('p');
            p.innerHTML = '<br/>';
            topBlock.before(p);
            focusParagraphCaret(p);
            handleInput();
            return;
          }

          if (!range.collapsed) {
            range.deleteContents();
          }
          const cleanAfterRange = document.createRange();
          cleanAfterRange.setStart(range.endContainer, range.endOffset);
          cleanAfterRange.setEnd(topBlock, topBlock.childNodes.length);
          const afterFrag = cleanAfterRange.extractContents();
          const afterP = document.createElement('p');
          afterP.appendChild(afterFrag);
          stripInlineStylesInElement(afterP);
          if ((afterP.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === '' && !afterP.querySelector('img')) {
            afterP.innerHTML = '<br/>';
          }
          topBlock.after(afterP);
          focusParagraphCaret(afterP);
          handleInput();
          return;
        }
      }

      // Double-Enter on an empty trailing line inside a card/blockquote exits below the block
      const box = anchorEl?.closest('blockquote, pre, .editorial-box') as HTMLElement | null;
      if (box && editorRef.current.contains(box) && box !== editorRef.current) {
        const innerBlock = anchorEl?.closest('p, div') as HTMLElement | null;
        if (
          innerBlock &&
          innerBlock !== box &&
          box.contains(innerBlock) &&
          !anchorEl?.closest('td, th, li') &&
          (innerBlock.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === '' &&
          box.lastElementChild === innerBlock &&
          box.querySelectorAll('p, div:not(.editor-only-controls), h1, h2, h3, h4, strong, ul, ol').length > 1
        ) {
          e.preventDefault();
          innerBlock.remove();
          insertLineAfterElement(box, { forceNew: true, clearFloat: true });
          return;
        }
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      if (
        activeComp &&
        editorRef.current.contains(activeComp) &&
        isFigureComponent(activeComp) &&
        !anchorEl?.closest('figcaption')
      ) {
        e.preventDefault();
        insertLineAfterElement(activeComp, { forceNew: false, clearFloat: false });
        return;
      }
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (
        activeComp &&
        editorRef.current.contains(activeComp) &&
        isFigureComponent(activeComp) &&
        !anchorEl?.closest('figcaption')
      ) {
        e.preventDefault();
        const targetEl = activeComp;
        const nextSibling = targetEl.nextElementSibling as HTMLElement | null;
        const prevSibling = targetEl.previousElementSibling as HTMLElement | null;
        targetEl.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
        targetEl.remove();
        selectComponent(null);
        if (nextSibling && nextSibling.tagName.toLowerCase() === 'p') {
          focusParagraphCaret(nextSibling);
        } else if (prevSibling && prevSibling.tagName.toLowerCase() === 'p') {
          focusParagraphCaret(prevSibling);
        } else {
          ensureTrailingEditableParagraphAndFocus();
        }
        handleInput();
        return;
      }

      if (
        e.key === 'Backspace' &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        sel?.isCollapsed &&
        sel.rangeCount > 0
      ) {
        const topBlock = getTopLevelEditorChild(anchorNode);
        if (topBlock && isStyledTextBlock(topBlock)) {
          const range = sel.getRangeAt(0);
          const beforeRange = document.createRange();
          beforeRange.setStart(topBlock, 0);
          beforeRange.setEnd(range.startContainer, range.startOffset);
          if (beforeRange.toString().replace(/[\u200B\u00A0\s]/g, '').length === 0) {
            e.preventDefault();
            const plainP = stripStyleFromBlockToPlainParagraph(topBlock);
            focusParagraphCaret(plainP);
            handleInput();
            return;
          }
        }
      }
    }
  };

  // Upload helper used by Drop & Paste on the editor canvas
  const uploadAndInsertCanvasImage = async (file: File, successMessage?: string) => {
    setIsUploadingImage(true);
    try {
      const item = await mediaService.uploadMedia(file, 'articles', ['article-content']);
      if (item && item.url) {
        insertImageHTML(item.url, file.name ? file.name.replace(/\.[^/.]+$/, '') : '');
        setIsUploadingImage(false);
        if (successMessage) toastCtx?.toast.success(successMessage);
        return;
      }
      throw new Error('Upload failed');
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        insertImageHTML(ev.target?.result as string, file.name || '');
        setIsUploadingImage(false);
        if (successMessage) toastCtx?.toast.success(successMessage);
      };
      reader.onerror = () => setIsUploadingImage(false);
      reader.readAsDataURL(file);
    }
  };

  // Direct Drag & Drop image files onto editor canvas
  const handleEditorDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        e.stopPropagation();
        await uploadAndInsertCanvasImage(file, 'Image dropped into article body!');
      }
    }
  };

  // Intercept Clipboard Pasted Screenshots / Images into editor canvas
  const handleEditorPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadAndInsertCanvasImage(file, 'Image pasted into article body!');
          return;
        }
      }
    }
  };

  const buildImageContainerStyle = (align: string, width: string): string => {
    const resolvedWidth = (align === 'left' || align === 'right') && width === '100%' ? '45%' : width;
    if (align === 'left') {
      return `float: left; margin: 10px 24px 16px 0; width: ${resolvedWidth}; max-width: ${resolvedWidth};`;
    }
    if (align === 'right') {
      return `float: right; margin: 10px 0 16px 24px; width: ${resolvedWidth}; max-width: ${resolvedWidth};`;
    }
    if (align === 'full') {
      return 'margin: 26px 0; width: 100%; max-width: 100%; text-align: center;';
    }
    return `margin: 22px auto; text-align: center; width: ${resolvedWidth}; max-width: ${resolvedWidth};`;
  };

  const applyImageElementLayout = (el: HTMLElement, align: string, widthPctStr: string) => {
    const resolvedWidth =
      align === 'full' ? '100%' : (align === 'left' || align === 'right') && widthPctStr === '100%' ? '45%' : widthPctStr;
    el.setAttribute('data-align', align);
    el.setAttribute('data-width', resolvedWidth);

    if (el.tagName.toLowerCase() === 'img') {
      el.style.width = resolvedWidth;
      el.style.maxWidth = '100%';
      el.style.height = 'auto';
      el.style.display = 'block';
      if (align === 'left') {
        el.style.float = 'left';
        el.style.margin = '10px 24px 16px 0';
      } else if (align === 'right') {
        el.style.float = 'right';
        el.style.margin = '10px 0 16px 24px';
      } else if (align === 'full') {
        el.style.float = 'none';
        el.style.margin = '26px 0';
        el.style.width = '100%';
      } else {
        el.style.float = 'none';
        el.style.margin = '22px auto';
      }
      return;
    }

    el.setAttribute('style', buildImageContainerStyle(align, resolvedWidth));
  };

  const buildImageElementStyle = (frame: 'card' | 'rounded' | 'clean'): string => {
    if (frame === 'clean') {
      return 'width: 100%; border-radius: 2px; display: block;';
    }
    if (frame === 'rounded') {
      return 'width: 100%; border-radius: 14px; display: block;';
    }
    return 'width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 6px 20px rgba(15,23,42,0.08); display: block;';
  };

  // Helper to insert structured image with alignment, width, and frame options
  const insertImageHTML = (
    src: string,
    caption: string = '',
    align: string = 'center',
    width: string = '70%',
    frame: 'card' | 'rounded' | 'clean' = 'card'
  ) => {
    const resolvedWidth =
      align === 'full' ? '100%' : (align === 'left' || align === 'right') && width === '100%' ? '45%' : width;
    const containerStyle = buildImageContainerStyle(align, resolvedWidth);
    const imgStyle = buildImageElementStyle(frame);

    const captionMarkup = caption.trim()
      ? `<figcaption style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic;">${caption.trim()}</figcaption>`
      : '';

    const html = `
      <figure class="editorial-box group/box relative" data-box-type="image" data-align="${align}" data-width="${resolvedWidth}" data-frame="${frame}" style="${containerStyle}">
        <div contenteditable="false" class="editor-only-controls" style="position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 4px; user-select: none;">
          <button type="button" class="box-delete-btn" style="background: rgba(0,0,0,0.75); color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: none; cursor: pointer; backdrop-filter: blur(4px);">
            ✕ Delete Image
          </button>
        </div>
        <img src="${src}" alt="${caption.trim() || 'Article illustration'}" style="${imgStyle}" />
        ${captionMarkup}
      </figure>
    `;
    insertCustomHTML(html);
  };

  // Insert 2-Photo or 3-Photo Responsive Gallery Grid
  const insertImageGalleryHTML = (items: Array<{ url: string; caption: string }>, cols: 2 | 3) => {
    const valid = items.slice(0, cols).filter((item) => item.url.trim());
    if (valid.length === 0) return;
    const gridClass = cols === 2 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 sm:grid-cols-3 gap-3.5';
    const imgHeightClass = cols === 2 ? 'h-56' : 'h-44';
    const label = cols === 2 ? '2-Image Comparison Grid' : '3-Image Product Gallery';

    const figuresHtml = valid
      .map(
        (item, idx) => `<figure style="margin: 0;">
      <img src="${item.url.trim()}" alt="${item.caption.trim() || `Photo ${idx + 1}`}" class="w-full ${imgHeightClass} object-cover rounded-xl border border-slate-200" style="width: 100%; border-radius: 12px; object-fit: cover; display: block;" />
      ${item.caption.trim() ? `<figcaption style="text-align: center; font-size: 12px; color: #64748b; margin-top: 6px; font-style: italic;">${item.caption.trim()}</figcaption>` : ''}
    </figure>`
      )
      .join('\n    ');

    const html = `<div class="editorial-box my-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs article-component relative" data-box-type="image-gallery">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">${label}</span>
    <button type="button" class="box-delete-btn" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Grid</button>
  </div>
  <div class="${gridClass}">
    ${figuresHtml}
  </div>
</div><p><br/></p>`;
    insertCustomHTML(html);
  };

  // Insert 2-Column Image + Text Spotlight Card (Image Left or Right)
  const insertSplitImageTextHTML = (
    src: string,
    tag: string,
    title: string,
    desc: string,
    imageSide: 'left' | 'right'
  ) => {
    const imgOrder = imageSide === 'right' ? 'md:order-2' : 'md:order-1';
    const textOrder = imageSide === 'right' ? 'md:order-1' : 'md:order-2';
    const html = `<section class="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs article-component my-6 relative" data-box-type="image-split">
  <div contenteditable="false" class="editor-only-controls" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.06); padding-bottom: 8px; margin-bottom: 12px; user-select: none;">
    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">2-Column Image + Text (${imageSide === 'right' ? 'Image Right' : 'Image Left'})</span>
    <button type="button" class="box-delete-btn" style="background: #ffffff; color: #dc2626; border: 1px solid #fecaca; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">✕ Delete Card</button>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
    <div class="rounded-xl overflow-hidden border border-slate-200 shadow-2xs ${imgOrder}">
      <img src="${src}" alt="${title || 'Feature image'}" class="w-full h-auto object-cover" style="width: 100%; border-radius: 12px; display: block;" />
    </div>
    <div class="space-y-2.5 ${textOrder}">
      ${tag.trim() ? `<span class="text-xs font-bold uppercase tracking-wider text-brand-primary">${tag.trim()}</span>` : ''}
      ${title.trim() ? `<h3 class="text-xl font-black text-slate-950" style="margin: 4px 0;">${title.trim()}</h3>` : ''}
      ${desc.trim() ? `<p class="text-sm text-slate-600 leading-relaxed" style="margin: 0;">${desc.trim()}</p>` : ''}
    </div>
  </div>
</section><p><br/></p>`;
    insertCustomHTML(html);
  };

  // Open Image Studio Modal with optional preset layout/tab
  const openImageModal = (preset?: {
    tab?: 'single' | 'gallery2' | 'gallery3' | 'split';
    align?: 'center' | 'full' | 'left' | 'right';
    width?: string;
  }) => {
    closeAllDropdowns();
    setEditingFigureEl(null);
    const targetAlign = preset?.align || 'center';
    setImageModalTab(preset?.tab || 'single');
    setImageAlign(targetAlign);
    setImageWidth(
      preset?.width ||
        (targetAlign === 'full' ? '100%' : targetAlign === 'left' || targetAlign === 'right' ? '45%' : '70%')
    );
    setImageModalOpen(true);
  };

  const isFigureComponent = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (el.getAttribute('data-box-type') === 'image') return true;
    if (tag === 'figure' && !el.closest('[data-box-type="image-gallery"]')) return true;
    if (tag === 'img' && !el.closest('figure, .article-component, .editorial-box')) return true;
    return false;
  };

  useEffect(() => {
    if (
      !activeComp ||
      isSourceMode ||
      imageModalOpen ||
      dealModalOpen ||
      buttonModalOpen ||
      linkModalOpen ||
      tableModalOpen ||
      mediaLibraryOpen ||
      addCompModalOpen ||
      fullPreviewOpen
    ) {
      return;
    }

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || editorRef.current?.contains(target)) return;
      const tag = target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button') return;

      if (e.key === 'Enter' && (isFigureComponent(activeComp) || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey && (e.ctrlKey || e.metaKey)) {
          insertLineBeforeElement(activeComp, { forceNew: true });
        } else {
          insertLineAfterElement(activeComp, { forceNew: true, clearFloat: true });
        }
      } else if (e.key === 'ArrowUp' && isFigureComponent(activeComp)) {
        e.preventDefault();
        insertLineBeforeElement(activeComp, { forceNew: false });
      } else if (e.key === 'ArrowDown' && isFigureComponent(activeComp)) {
        e.preventDefault();
        insertLineAfterElement(activeComp, { forceNew: false, clearFloat: false });
      }
    };

    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [
    activeComp,
    isSourceMode,
    imageModalOpen,
    dealModalOpen,
    buttonModalOpen,
    linkModalOpen,
    tableModalOpen,
    mediaLibraryOpen,
    addCompModalOpen,
    fullPreviewOpen,
  ]);

  const resolveActiveImageAlign = (el: HTMLElement): 'left' | 'center' | 'right' | 'full' => {
    const attr = el.getAttribute('data-align');
    if (attr === 'left' || attr === 'right' || attr === 'full' || attr === 'center') return attr;
    if (el.style.float === 'left') return 'left';
    if (el.style.float === 'right') return 'right';
    return 'center';
  };

  const updateActiveImageLayout = (opts: {
    align?: 'left' | 'center' | 'right' | 'full';
    width?: string;
  }) => {
    if (!activeComp || !isFigureComponent(activeComp)) return;
    const currentAlign = opts.align || resolveActiveImageAlign(activeComp);
    const fallbackWidth =
      currentAlign === 'full' ? '100%' : currentAlign === 'left' || currentAlign === 'right' ? '45%' : `${activeImageWidthPct}%`;
    const nextWidth = opts.width || activeComp.getAttribute('data-width') || fallbackWidth;
    const resolvedAlign = opts.align
      ? opts.align
      : currentAlign === 'full' && parseInt(nextWidth, 10) < 98
      ? 'center'
      : currentAlign;

    applyImageElementLayout(activeComp, resolvedAlign, nextWidth);
    const pctNum = parseInt(nextWidth, 10);
    if (!Number.isNaN(pctNum)) {
      setActiveImageWidthPct(Math.max(15, Math.min(100, pctNum)));
    }
    handleInput();
    syncActiveCompRect(activeComp);
  };

  // Interactive 60fps corner/edge drag-to-resize (Word / Google Docs feel)
  const startImageResize = (
    e: React.MouseEvent,
    handle: 'nw' | 'ne' | 'sw' | 'se' | 'w' | 'e'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!activeComp || !isFigureComponent(activeComp) || !editorRef.current) return;

    const targetComp = activeComp;
    const startX = e.clientX;
    const startWidthPx = targetComp.getBoundingClientRect().width;
    const editorInnerWidth = Math.max(240, editorRef.current.getBoundingClientRect().width - 8);
    const initialAlign = resolveActiveImageAlign(targetComp);

    const onMouseMove = (ev: MouseEvent) => {
      const rawDx = ev.clientX - startX;
      const signedDx = handle === 'nw' || handle === 'sw' || handle === 'w' ? -rawDx : rawDx;
      const scaleFactor = initialAlign === 'center' || initialAlign === 'full' ? 2 : 1;
      const nextWidthPx = Math.max(
        110,
        Math.min(editorInnerWidth, startWidthPx + signedDx * scaleFactor)
      );
      const pct = Math.max(15, Math.min(100, Math.round((nextWidthPx / editorInnerWidth) * 100)));
      const nextAlign = initialAlign === 'full' && pct < 98 ? 'center' : initialAlign;

      applyImageElementLayout(targetComp, nextAlign, `${pct}%`);
      setActiveImageWidthPct(pct);
      setResizingBadge(`${Math.round(nextWidthPx)}px • ${pct}%`);
      syncActiveCompRect(targetComp);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setResizingBadge(null);
      handleInput();
      syncActiveCompRect(targetComp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const openEditActiveImageModal = () => {
    if (!activeComp || !isFigureComponent(activeComp)) return;
    const isStandaloneImg = activeComp.tagName.toLowerCase() === 'img';
    const img = isStandaloneImg ? activeComp : activeComp.querySelector('img');
    const figCap = isStandaloneImg ? null : activeComp.querySelector('figcaption');
    const alignAttr = resolveActiveImageAlign(activeComp);
    const widthAttr = activeComp.getAttribute('data-width') || `${activeImageWidthPct}%`;
    const frameAttr = activeComp.getAttribute('data-frame');

    setEditingFigureEl(activeComp);
    setImageModalTab('single');
    setImageUrl(img?.getAttribute('src') || '');
    setImageCaption(figCap?.textContent?.trim() || '');
    setImageAlign(alignAttr);
    setImageWidth(widthAttr);
    setImageFrame(
      frameAttr === 'rounded' || frameAttr === 'clean' ? frameAttr : 'card'
    );
    setImageModalOpen(true);
  };

  // Insert Callout Box (with 1-click Delete button)
  const insertCallout = (type: 'tip' | 'warning' | 'info' | 'verdict') => {
    let calloutHTML = '';
    if (type === 'tip') {
      calloutHTML = `
        <div class="editorial-box relative group/box" data-box-type="tip" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 18px; margin: 20px 0; border-radius: 8px; position: relative;">
          <div contenteditable="false" class="editor-only-controls" style="display: flex; justify-content: flex-end; margin-bottom: 4px; user-select: none;">
            <button type="button" class="box-delete-btn" style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #bbf7d0; cursor: pointer;">
              ✕ Delete Tip Box
            </button>
          </div>
          <strong style="color: #15803d; display: block; margin-bottom: 4px;">💡 Editor's Testing Tip</strong>
          <p style="margin: 0; color: #166534; font-size: 14px;">Insert your field testing recommendation or secret discount strategy here...</p>
        </div>
      `;
    } else if (type === 'warning') {
      calloutHTML = `
        <div class="editorial-box relative group/box" data-box-type="warning" style="background-color: #fef2f2; border-left: 4px solid #C62828; padding: 16px 18px; margin: 20px 0; border-radius: 8px; position: relative;">
          <div contenteditable="false" class="editor-only-controls" style="display: flex; justify-content: flex-end; margin-bottom: 4px; user-select: none;">
            <button type="button" class="box-delete-btn" style="background: #fee2e2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #fecaca; cursor: pointer;">
              ✕ Delete Warning Box
            </button>
          </div>
          <strong style="color: #991b1b; display: block; margin-bottom: 4px;">⚠️ Buyer Beware / Caveat</strong>
          <p style="margin: 0; color: #7f1d1d; font-size: 14px;">Note any critical compatibility issues, warranty caveats, or fake counterfeits to watch out for...</p>
        </div>
      `;
    } else if (type === 'info') {
      calloutHTML = `
        <div class="editorial-box relative group/box" data-box-type="info" style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 18px; margin: 20px 0; border-radius: 8px; position: relative;">
          <div contenteditable="false" class="editor-only-controls" style="display: flex; justify-content: flex-end; margin-bottom: 4px; user-select: none;">
            <button type="button" class="box-delete-btn" style="background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #bfdbfe; cursor: pointer;">
              ✕ Delete Info Box
            </button>
          </div>
          <strong style="color: #1e40af; display: block; margin-bottom: 4px;">ℹ️ Key Takeaway Summary</strong>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px;">Highlight the top 1–2 practical takeaways so busy readers get the answer immediately...</p>
        </div>
      `;
    } else {
      calloutHTML = `
        <div class="editorial-box relative group/box" data-box-type="verdict" style="background-color: #171717; color: #ffffff; padding: 22px 24px; margin: 24px 0; border-radius: 14px; border: 1px solid #333333; position: relative;">
          <div contenteditable="false" class="editor-only-controls" style="display: flex; justify-content: flex-end; margin-bottom: 6px; user-select: none;">
            <button type="button" class="box-delete-btn" style="background: #27272a; color: #f43f5e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #3f3f46; cursor: pointer;">
              ✕ Delete Verdict Box
            </button>
          </div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--brand-primary); font-weight: 700; margin-bottom: 6px;">${SITE_NAME} Lab Score: 9.4 / 10</div>
          <h4 style="margin: 0 0 8px 0; color: #ffffff; font-size: 18px; font-weight: 700;">The Editorial Verdict</h4>
          <p style="margin: 0; color: #a1a1aa; font-size: 14px; line-height: 1.6;">Our final testing conclusion after 30 days of real-world use. Highly recommended for enthusiasts seeking durable build quality.</p>
        </div>
      `;
    }
    insertCustomHTML(calloutHTML);
  };

  // Insert Pros & Cons Box
  const insertProsCons = () => {
    const prosConsHTML = `
      <div class="editorial-box my-6 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs relative" data-box-type="pros-cons">
        <div contenteditable="false" style="grid-column: 1 / -1; display: flex; justify-content: flex-end; user-select: none;">
          <button type="button" class="box-delete-btn" style="background: #f1f5f9; color: #dc2626; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer;">
            ✕ Delete Pros/Cons Grid
          </button>
        </div>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #bbf7d0;">
          <strong style="color: #166534; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            ✓ Key Strengths (Pros)
          </strong>
          <ul style="margin: 0; padding-left: 20px; color: #15803d; font-size: 13px; line-height: 1.6;">
            <li>Premium build finish with a solid, ergonomic hand feel.</li>
            <li>Outstanding brightness and performance in its price bracket.</li>
            <li>Backed by an official manufacturer warranty and fast returns.</li>
          </ul>
        </div>
        <div style="background: #fef2f2; border-radius: 12px; padding: 16px; border: 1px solid #fecaca;">
          <strong style="color: #991b1b; font-size: 14px; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            ✕ Things to Consider (Cons)
          </strong>
          <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 13px; line-height: 1.6;">
            <li>Slightly higher retail price than budget competitors.</li>
            <li>Optional expansion accessories are sold separately.</li>
          </ul>
        </div>
      </div>
    `;
    insertCustomHTML(prosConsHTML);
  };

  // Save Deal Box (Create new or update existing)
  const handleSaveDealBox = () => {
    if (!dealForm.title?.trim()) {
      toastCtx?.toast.error('Product Name / Deal Title is required');
      return;
    }
    if (!dealForm.buttonUrl?.trim()) {
      toastCtx?.toast.error('Button Destination Link is required');
      return;
    }
    let btnBg = 'var(--brand-primary)';
    if (dealForm.buttonStyle === 'emerald') btnBg = '#059669';
    if (dealForm.buttonStyle === 'dark') btnBg = '#171717';

    const finalBoxHTML = `
      <div class="editorial-box my-6 border-2 border-brand-primary bg-white rounded-2xl p-6 shadow-sm relative" data-box-type="deal" style="border: 2px solid var(--brand-primary); background-color: #ffffff; padding: 22px; border-radius: 16px; margin: 24px 0;">
        <div contenteditable="false" style="display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 12px; user-select: none;">
          <button type="button" class="box-edit-deal-btn" style="background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer;">
            ✏️ Edit Button Link & Price
          </button>
          <button type="button" class="box-delete-btn" style="background: #fef2f2; color: #dc2626; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; border: 1px solid #fecaca; cursor: pointer;">
            ✕ Delete Deal Box
          </button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="background-color: var(--brand-primary-soft); color: var(--brand-primary); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">${dealForm.badge}</span>
          <span style="font-size: 20px; font-weight: 800; color: #171717;">
            <span class="deal-price">${dealForm.dealPrice}</span>
            <span class="deal-original-price" style="font-size: 13px; text-decoration: line-through; color: #737373; margin-left: 6px;">${dealForm.originalPrice}</span>
          </span>
        </div>
        <h4 class="deal-title" style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #171717;">${dealForm.title}</h4>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #52525b;">${dealForm.description} Promo code: <strong class="deal-code" style="color: var(--brand-primary); background: var(--brand-primary-soft); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${dealForm.couponCode}</strong></p>
        <a href="${dealForm.buttonUrl}" target="_blank" rel="noopener noreferrer" class="deal-button" style="display: inline-block; background-color: ${btnBg}; color: #ffffff; font-weight: 700; font-size: 13px; padding: 11px 24px; border-radius: 8px; text-decoration: none;">
          ${dealForm.buttonText}
        </a>
      </div>
    `;

    if (editingBoxEl) {
      editingBoxEl.outerHTML = finalBoxHTML;
      setEditingBoxEl(null);
      handleInput();
    } else {
      insertCustomHTML(finalBoxHTML);
    }
    setDealModalOpen(false);
  };

  // Insert Standalone Button CTA
  const handleInsertButton = () => {
    if (!buttonForm.text?.trim()) {
      toastCtx?.toast.error('Button Label is required');
      return;
    }
    if (!buttonForm.url?.trim()) {
      toastCtx?.toast.error('Destination URL is required');
      return;
    }
    let btnStyle = 'background-color: var(--brand-primary); color: #ffffff; border: none;';
    if (buttonForm.style === 'emerald') btnStyle = 'background-color: #059669; color: #ffffff; border: none;';
    if (buttonForm.style === 'dark') btnStyle = 'background-color: #171717; color: #ffffff; border: none;';
    if (buttonForm.style === 'outline') btnStyle = 'background-color: transparent; color: var(--brand-primary); border: 2px solid var(--brand-primary);';

    const alignStyle = buttonForm.alignment === 'center' ? 'text-align: center; margin: 20px auto;' : 'text-align: left; margin: 20px 0;';

    const btnHTML = `
      <div class="editorial-box my-4" data-box-type="button" style="${alignStyle}">
        <div contenteditable="false" style="display: inline-block; margin-bottom: 4px; user-select: none;">
          <button type="button" class="box-delete-btn" style="background: #f1f5f9; color: #dc2626; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer; margin-right: 6px;">
            ✕ Delete Button
          </button>
        </div>
        <a href="${buttonForm.url}" target="_blank" rel="noopener noreferrer" class="cta-button" style="display: inline-block; ${btnStyle} font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          ${buttonForm.text}
        </a>
      </div>
    `;
    insertCustomHTML(btnHTML);
    setButtonModalOpen(false);
  };

  // Open Link Modal with pre-filled highlighted text
  const openLinkModal = () => {
    let text = '';
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
      text = sel.toString().trim();
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    } else if (
      savedRangeRef.current &&
      !savedRangeRef.current.collapsed &&
      editorRef.current?.contains(savedRangeRef.current.startContainer)
    ) {
      text = savedRangeRef.current.toString().trim();
    }

    setLinkText(text);
    setLinkUrl('');
    setLinkTargetBlank(true);
    setLinkSponsored(true);
    setLinkModalOpen(true);
  };

  // Insert Link
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const finalUrl =
      linkUrl.startsWith('http://') ||
      linkUrl.startsWith('https://') ||
      linkUrl.startsWith('mailto:') ||
      linkUrl.startsWith('tel:')
        ? linkUrl
        : `https://${linkUrl}`;

    const targetAttr = linkTargetBlank ? ' target="_blank"' : '';
    const relAttr = linkSponsored
      ? ' rel="nofollow sponsored noopener noreferrer"'
      : linkTargetBlank
      ? ' rel="noopener noreferrer"'
      : '';

    const display = linkText.trim() || finalUrl;
    const linkHTML = `<a href="${finalUrl}"${targetAttr}${relAttr} style="color: #2b579a; text-decoration: underline; font-weight: 600;">${display}</a>`;

    insertCustomHTML(linkHTML);
    setLinkUrl('');
    setLinkText('');
    setLinkModalOpen(false);
  };

  const applyUploadedSlotUrl = (
    target: 'single' | 'gallery-0' | 'gallery-1' | 'gallery-2' | 'split',
    url: string
  ) => {
    if (target === 'single') {
      setImageUrl(url);
    } else if (target === 'split') {
      setSplitImageForm((prev) => ({ ...prev, imageUrl: url }));
    } else if (target.startsWith('gallery-')) {
      const idx = Number(target.split('-')[1]);
      setGalleryItems((prev) => prev.map((it, i) => (i === idx ? { ...it, url } : it)));
    }
  };

  // Upload image file for any Image Modal slot (single / gallery / split)
  const handleSlotImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'single' | 'gallery-0' | 'gallery-1' | 'gallery-2' | 'split' = 'single'
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (target === 'single') setUploadedFileName(file.name);
    setUploadingSlot(target);
    setIsUploadingImage(true);
    setUploadProgress(25);
    try {
      setUploadProgress(50);
      const tagsToUse = imageTags.length > 0 ? imageTags : ['article', 'illustration'];
      const data = await mediaService.uploadMedia(file, 'articles', tagsToUse);
      setUploadProgress(85);
      if (data && data.url) {
        applyUploadedSlotUrl(target, data.url);
        setIsUploadingImage(false);
        setUploadingSlot(null);
        setUploadProgress(100);
        return;
      }
      throw new Error('Upload failed');
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        applyUploadedSlotUrl(target, (ev.target?.result as string) || '');
        setIsUploadingImage(false);
        setUploadingSlot(null);
        setUploadProgress(100);
      };
      reader.onerror = () => {
        setIsUploadingImage(false);
        setUploadingSlot(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit modal image insert (supports Single, 2-Image Grid, 3-Image Gallery, Image + Text Split, or Edit Existing Figure)
  const handleApplyImageModal = () => {
    if (imageModalTab === 'single') {
      if (!imageUrl.trim()) {
        toastCtx?.toast.warning('Please upload, choose, or paste an image URL first.');
        return;
      }
      if (editingFigureEl && editorRef.current?.contains(editingFigureEl)) {
        const resolvedWidth =
          imageAlign === 'full'
            ? '100%'
            : (imageAlign === 'left' || imageAlign === 'right') && imageWidth === '100%'
            ? '45%'
            : imageWidth;
        const isStandaloneImg = editingFigureEl.tagName.toLowerCase() === 'img';
        editingFigureEl.setAttribute('data-frame', imageFrame);
        applyImageElementLayout(editingFigureEl, imageAlign, resolvedWidth);

        const imgEl = isStandaloneImg ? editingFigureEl : editingFigureEl.querySelector('img');
        if (imgEl) {
          imgEl.setAttribute('src', imageUrl.trim());
          imgEl.setAttribute('alt', imageCaption.trim() || 'Article illustration');
          if (!isStandaloneImg) {
            imgEl.setAttribute('style', buildImageElementStyle(imageFrame));
          }
        }
        if (!isStandaloneImg) {
          let capEl = editingFigureEl.querySelector('figcaption');
          if (imageCaption.trim()) {
            if (!capEl) {
              capEl = document.createElement('figcaption');
              editingFigureEl.appendChild(capEl);
            }
            capEl.setAttribute(
              'style',
              'text-align: center; font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic;'
            );
            capEl.textContent = imageCaption.trim();
          } else if (capEl) {
            capEl.remove();
          }
        }
        setEditingFigureEl(null);
        handleInput();
        syncActiveCompRect(editingFigureEl);
      } else {
        insertImageHTML(imageUrl.trim(), imageCaption, imageAlign, imageWidth, imageFrame);
      }
      setImageUrl('');
      setImageCaption('');
      setImageTags(['article', 'illustration']);
      setUploadedFileName('');
      setImageModalOpen(false);
      return;
    }

    if (imageModalTab === 'gallery2' || imageModalTab === 'gallery3') {
      const cols = imageModalTab === 'gallery2' ? 2 : 3;
      const validCount = galleryItems.slice(0, cols).filter((it) => it.url.trim()).length;
      if (validCount === 0) {
        toastCtx?.toast.warning('Please add at least 1 image URL or upload a photo.');
        return;
      }
      insertImageGalleryHTML(galleryItems, cols);
      setGalleryItems([
        { url: '', caption: '' },
        { url: '', caption: '' },
        { url: '', caption: '' },
      ]);
      setImageModalOpen(false);
      return;
    }

    if (imageModalTab === 'split') {
      if (!splitImageForm.imageUrl.trim()) {
        toastCtx?.toast.warning('Please provide an image for the 2-column Image + Text card.');
        return;
      }
      insertSplitImageTextHTML(
        splitImageForm.imageUrl.trim(),
        splitImageForm.tag,
        splitImageForm.title,
        splitImageForm.desc,
        splitImageForm.imageSide
      );
      setImageModalOpen(false);
    }
  };

  // Helper to apply one or more inline styles strictly to the highlighted text selection
  const applyInlineStylesToSelection = (styles: Record<string, string>) => {
    const sel = window.getSelection();
    const range = getActiveHighlightRange();

    // Only apply to the highlighted selection — NEVER mutate the entire paragraph block or editor root
    if (!range || range.collapsed) {
      return;
    }

    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const selectedText = range.toString();
    if (!selectedText) return;

    const styleKeys = Object.keys(styles);

    // Check if the selection already targets a single inline-styled span with identical text
    const ancestorNode =
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as HTMLElement);
    const existingSpan = ancestorNode?.closest('span[data-inline-styled="true"]') as HTMLElement | null;

    if (
      existingSpan &&
      editorRef.current?.contains(existingSpan) &&
      existingSpan.textContent === selectedText
    ) {
      // Strip conflicting inline styles on child elements inside existingSpan
      existingSpan.querySelectorAll('*').forEach((child) => {
        if (child instanceof HTMLElement) {
          styleKeys.forEach((k) => {
            (child.style as unknown as Record<string, string>)[k] = '';
          });
          if (styles.color && child.tagName.toLowerCase() === 'font') {
            child.removeAttribute('color');
          }
        }
      });

      Object.entries(styles).forEach(([k, v]) => {
        (existingSpan.style as unknown as Record<string, string>)[k] = v;
      });
      if (styles.color) {
        existingSpan.setAttribute('data-custom-color', 'true');
      }
      if (styles.backgroundColor) {
        if (styles.backgroundColor === 'transparent') {
          existingSpan.removeAttribute('data-custom-highlight');
        } else {
          existingSpan.setAttribute('data-custom-highlight', 'true');
        }
      }

      if (sel) {
        const newRange = document.createRange();
        newRange.selectNodeContents(existingSpan);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
        lastHighlightRangeRef.current = newRange.cloneRange();
      }
      editorRef.current?.focus({ preventScroll: true });
      handleInput();
      return;
    }

    try {
      const fragment = range.extractContents();
      // Remove conflicting inline styles on nested elements inside extracted fragment
      fragment.querySelectorAll('*').forEach((child) => {
        if (child instanceof HTMLElement) {
          styleKeys.forEach((k) => {
            (child.style as unknown as Record<string, string>)[k] = '';
          });
          if (styles.color && child.tagName.toLowerCase() === 'font') {
            child.removeAttribute('color');
          }
        }
      });

      const span = document.createElement('span');
      span.setAttribute('data-inline-styled', 'true');
      Object.entries(styles).forEach(([k, v]) => {
        (span.style as unknown as Record<string, string>)[k] = v;
      });
      if (styles.fontSize && !styles.lineHeight) {
        span.style.lineHeight = '1.25';
      }
      if (styles.color) {
        span.setAttribute('data-custom-color', 'true');
      }
      if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
        span.setAttribute('data-custom-highlight', 'true');
      }

      span.appendChild(fragment);
      range.insertNode(span);

      // Re-select newly styled span so user sees it highlighted and can chain styles
      if (sel) {
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
        lastHighlightRangeRef.current = newRange.cloneRange();
      }
      editorRef.current?.focus({ preventScroll: true });
      handleInput();
    } catch (err) {
      console.warn('extractContents failed, fallback to insertHTML', err);
      const inlineCss = Object.entries(styles)
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`)
        .join('; ');
      const html = `<span data-inline-styled="true" style="${inlineCss}">${selectedText}</span>`;
      document.execCommand('insertHTML', false, html);
      editorRef.current?.focus({ preventScroll: true });
      handleInput();
    }
  };

  // Single-property convenience wrapper
  const applyInlineStyleToSelection = (
    styleProp: 'fontSize' | 'fontFamily' | 'color' | 'backgroundColor',
    styleValue: string
  ) => {
    applyInlineStylesToSelection({ [styleProp]: styleValue });
  };

  // Typography font size change
  const handleFontSizeChange = (size: string) => {
    setCurrentSize(size);
    applyInlineStyleToSelection('fontSize', size);
  };

  // Typography color change
  const handleColorChange = (color: string) => {
    applyInlineStyleToSelection('color', color);
    setColorMenuOpen(false);
  };

  // Typography highlight change
  const handleHighlightChange = (color: string) => {
    applyInlineStyleToSelection('backgroundColor', color);
    setHighlightMenuOpen(false);
  };

  // Toggle Serif font on selection
  const handleToggleSerif = () => {
    applyInlineStyleToSelection('fontFamily', 'var(--font-serif), Georgia, serif');
  };

  // Word Font Family Change
  const handleFontFamilyChange = (font: string) => {
    setCurrentFont(font);
    applyInlineStyleToSelection('fontFamily', font);
  };

  // Word Step Font Size (A+ / A-)
  const handleStepSize = (direction: 1 | -1) => {
    const currentIndex = FONT_SIZES_WORD.indexOf(currentSize);
    let nextIndex = (currentIndex === -1 ? 5 : currentIndex) + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= FONT_SIZES_WORD.length) nextIndex = FONT_SIZES_WORD.length - 1;
    const nextSize = FONT_SIZES_WORD[nextIndex];
    handleFontSizeChange(nextSize);
  };

  // Word Line Spacing
  const handleLineSpacing = (spacing: string) => {
    setLineSpacingMenuOpen(false);
    setCurrentLineSpacing(spacing);
    const highlightRange = getActiveHighlightRange();
    if (highlightRange && !highlightRange.collapsed && highlightRange.toString().trim().length > 0) {
      applyInlineStylesToSelection({ lineHeight: spacing });
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let parent = range.commonAncestorContainer as HTMLElement;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentElement as HTMLElement;
    }
    const block = (parent.closest('p, h1, h2, h3, h4, li, div') as HTMLElement) || editorRef.current;
    if (block && block !== editorRef.current) {
      block.style.lineHeight = spacing;
      handleInput();
    }
  };

  // Word Insert Table
  const handleInsertTable = (rows: number, cols: number) => {
    let tableHtml = `<div class="article-component my-6 overflow-x-auto"><table class="w-full border-collapse border border-slate-300 rounded-xl overflow-hidden shadow-xs text-sm my-2"><thead><tr class="bg-slate-100 text-slate-900">`;
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th class="border border-slate-300 px-4 py-2 text-left font-black text-xs uppercase tracking-wider">Column ${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 1; r <= rows; r++) {
      const rowBg = r % 2 === 0 ? 'bg-slate-50/60' : 'bg-white';
      tableHtml += `<tr class="${rowBg}">`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td class="border border-slate-300 px-4 py-2.5 text-slate-700">Cell ${r}.${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table></div><p><br></p>`;
    insertCustomHTML(tableHtml);
    setTableModalOpen(false);
  };

  return (
    <div
      onScroll={(e) => {
        if (e.currentTarget.scrollTop !== 0) {
          e.currentTarget.scrollTop = 0;
        }
      }}
      className={
        isFullscreen
          ? 'fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm p-2 sm:p-5 flex flex-col justify-center items-center animate-fadeIn'
          : 'border border-slate-200 rounded-2xl bg-white shadow-2xs flex flex-col w-full'
      }
    >
      <div
        onScroll={(e) => {
          if (e.currentTarget.scrollTop !== 0) {
            e.currentTarget.scrollTop = 0;
          }
        }}
        className={
          isFullscreen
            ? 'w-full h-full max-w-[1600px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden'
            : 'flex flex-col w-full rounded-2xl'
        }
      >
      
      {/* =========================================================================
          PINNED / STICKY WORD HEADER + RIBBON TOOLBAR + ACTIVE BLOCK BAR
         ========================================================================= */}
      <div className="shrink-0 sticky top-0 z-30 flex flex-col rounded-t-2xl">
      {/* =========================================================================
          MICROSOFT WORD TOP BAR (WORD STUDIO BLUE ACCENT)
         ========================================================================= */}
      <div className="bg-[#2b579a] text-white px-3.5 py-2 flex items-center justify-between select-none shadow-xs border-b border-[#204477] rounded-t-2xl">
        {/* Left: Word Logo, Document Title & Auto-Save */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-white text-[#2b579a] font-black text-xs flex items-center justify-center font-serif shadow-xs tracking-tighter">
            W
          </div>
          <span className="font-extrabold text-xs tracking-tight">Article Document • Microsoft Word Studio</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-white/80 bg-white/10 px-2 py-0.5 rounded font-medium ml-1">
            <Check size={11} className="text-emerald-300" /> Auto-Saved
          </span>

          <div className="h-4 w-px bg-white/20 mx-1" />

          {/* Quick Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => exec('undo')}
              className="p-1 hover:bg-white/15 rounded text-white/90 hover:text-white transition cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => exec('redo')}
              className="p-1 hover:bg-white/15 rounded text-white/90 hover:text-white transition cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* Right: View Mode Toggle (A4 vs Full Width), Fullscreen, Code View */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPaperView(!isPaperView)}
            className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isPaperView ? 'bg-white text-[#2b579a]' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isPaperView ? 'Currently in A4 Page Mode' : 'Switch to A4 Page Mode'}
          >
            <FileText size={13} />
            <span>{isPaperView ? '📄 A4 Page (Word)' : '⛶ Full Width 100%'}</span>
          </button>

          {/* Live Preview Button */}
          <button
            type="button"
            onClick={() => setFullPreviewOpen(true)}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Preview article in real website layout (Desktop, Tablet, Mobile)"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">Live Preview</span>
            <span className="sm:hidden">Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-white/15 rounded text-white transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={() => setIsSourceMode(!isSourceMode)}
            className={`px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              isSourceMode ? 'bg-amber-400 text-slate-950 font-black' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title="Toggle HTML Source Code Mode"
          >
            {isSourceMode ? <Eye size={13} /> : <Code2 size={13} />}
            <span className="hidden sm:inline">{isSourceMode ? 'Visual' : 'HTML'}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MICROSOFT WORD RIBBON TABS (HOME, INSERT, AFFILIATE, VIEW)
         ========================================================================= */}
      <div className="bg-[#f3f2f1] border-b border-slate-300 px-3 flex items-center gap-1 text-xs select-none pt-1">
        <button
          type="button"
          onClick={() => setRibbonTab('home')}
          className={`px-4 py-1.5 font-bold transition cursor-pointer border-t-2 rounded-t-md text-xs flex items-center gap-1.5 ${
            ribbonTab === 'home'
              ? 'bg-white border-[#2b579a] text-[#2b579a] shadow-xs'
              : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
          }`}
        >
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setRibbonTab('insert')}
          className={`px-4 py-1.5 font-bold transition cursor-pointer border-t-2 rounded-t-md text-xs flex items-center gap-1.5 ${
            ribbonTab === 'insert'
              ? 'bg-white border-[#2b579a] text-[#2b579a] shadow-xs'
              : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
          }`}
        >
          <PlusCircle size={12} className={ribbonTab === 'insert' ? 'text-[#2b579a]' : 'text-slate-500'} />
          <span>Insert</span>
        </button>

        <button
          type="button"
          onClick={() => setRibbonTab('affiliate')}
          className={`px-4 py-1.5 font-bold transition cursor-pointer border-t-2 rounded-t-md text-xs flex items-center gap-1.5 ${
            ribbonTab === 'affiliate'
              ? 'bg-white border-brand-primary text-brand-primary shadow-xs'
              : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
          }`}
        >
          <Tag size={12} className={ribbonTab === 'affiliate' ? 'text-brand-primary' : 'text-slate-500'} />
          <span>Affiliate Blocks</span>
        </button>

        <button
          type="button"
          onClick={() => setRibbonTab('view')}
          className={`px-4 py-1.5 font-bold transition cursor-pointer border-t-2 rounded-t-md text-xs flex items-center gap-1.5 ${
            ribbonTab === 'view'
              ? 'bg-white border-[#2b579a] text-[#2b579a] shadow-xs'
              : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
          }`}
        >
          <Layers size={12} className={ribbonTab === 'view' ? 'text-[#2b579a]' : 'text-slate-500'} />
          <span>Layout &amp; View</span>
        </button>
      </div>

      {/* =========================================================================
          RIBBON BODY CONTENT STRIP (WORD GROUPED TOOLBAR)
         ========================================================================= */}
      <div className="bg-white border-b border-slate-300 px-3 py-2 flex flex-wrap items-stretch gap-x-3 gap-y-2 text-xs text-slate-800 select-none overflow-visible relative z-30 shadow-2xs min-h-[88px]">
        
        {/* ================= TAB 1: HOME (TRANG CHỦ) ================= */}
        {ribbonTab === 'home' && (
          <>
            {/* Group 1: Font & Typography */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-200 shrink-0">
              {/* Row 1: Font Family, Font Size, A+, A-, Case, Clear */}
              <div className="flex items-center gap-1">
                {/* Font Selector Custom Popover */}
                <div className="font-family-dropdown-container relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !fontFamilyMenuOpen;
                      closeAllDropdowns();
                      setFontFamilyMenuOpen(next);
                    }}
                    className="h-7 text-xs bg-slate-50 hover:bg-white hover:border-[#2b579a] border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-semibold focus:outline-none flex items-center justify-between gap-1 cursor-pointer shadow-2xs w-36 truncate"
                    title="Select Font Family"
                  >
                    <span className="truncate">{FONT_FAMILIES.find((f) => f.value === currentFont)?.label || currentFont}</span>
                    <ChevronDown size={11} className="text-slate-400 shrink-0" />
                  </button>
                  {fontFamilyMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl py-1 shadow-2xl w-56 max-h-64 overflow-y-auto animate-fadeIn"
                    >
                      {FONT_FAMILIES.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleFontFamilyChange(font.value);
                            setFontFamilyMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-[#2b579a] transition flex items-center justify-between cursor-pointer ${
                            currentFont === font.value ? 'bg-blue-50 text-[#2b579a] font-bold' : 'text-slate-700'
                          }`}
                          style={{ fontFamily: font.value }}
                        >
                          <span className="truncate">{font.label}</span>
                          {currentFont === font.value && <Check size={12} className="text-[#2b579a] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Font Size Selector Custom Popover */}
                <div className="font-size-dropdown-container relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !fontSizeMenuOpen;
                      closeAllDropdowns();
                      setFontSizeMenuOpen(next);
                    }}
                    className="h-7 text-xs bg-slate-50 hover:bg-white hover:border-[#2b579a] border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none flex items-center justify-between gap-1 cursor-pointer shadow-2xs w-14"
                    title="Font Size"
                  >
                    <span>{currentSize.replace('px', '')}</span>
                    <ChevronDown size={11} className="text-slate-400 shrink-0" />
                  </button>
                  {fontSizeMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl py-1 shadow-2xl w-24 max-h-64 overflow-y-auto animate-fadeIn"
                    >
                      {FONT_SIZES_WORD.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleFontSizeChange(sz);
                            setFontSizeMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-[#2b579a] transition flex items-center justify-between cursor-pointer ${
                            currentSize === sz ? 'bg-blue-50 text-[#2b579a] font-bold' : 'text-slate-700 font-medium'
                          }`}
                        >
                          <span>{sz.replace('px', '')}</span>
                          {currentSize === sz && <Check size={12} className="text-[#2b579a]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* A+ Increase Font Size */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleStepSize(1)}
                  className="h-7 px-1.5 hover:bg-slate-100 rounded text-slate-800 font-black text-xs transition cursor-pointer flex items-center gap-0.5 border border-slate-200"
                  title="Increase Font Size (A+)"
                >
                  <span className="text-xs">A</span>
                  <span className="text-[8px] font-black text-emerald-600">▲</span>
                </button>

                {/* A- Decrease Font Size */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleStepSize(-1)}
                  className="h-7 px-1.5 hover:bg-slate-100 rounded text-slate-800 font-black text-xs transition cursor-pointer flex items-center gap-0.5 border border-slate-200"
                  title="Decrease Font Size (A-)"
                >
                  <span className="text-[11px]">A</span>
                  <span className="text-[8px] font-black text-rose-600">▼</span>
                </button>

                {/* Text Case (Aa) Dropdown */}
                <div className="text-case-container relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !textCaseMenuOpen;
                      closeAllDropdowns();
                      setTextCaseMenuOpen(next);
                    }}
                    className="h-7 px-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-0.5 border border-slate-200"
                    title="Change Text Case"
                  >
                    <CaseSensitive size={14} />
                    <ChevronDown size={10} className="text-slate-400" />
                  </button>
                  {textCaseMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xl w-44 space-y-0.5 animate-fadeIn"
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleChangeTextCase('upper')}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 hover:text-[#2b579a] rounded-lg font-semibold cursor-pointer"
                      >
                        UPPERCASE
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleChangeTextCase('lower')}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 hover:text-[#2b579a] rounded-lg font-semibold cursor-pointer"
                      >
                        lowercase
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleChangeTextCase('title')}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 hover:text-[#2b579a] rounded-lg font-semibold cursor-pointer"
                      >
                        Title Case
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleChangeTextCase('sentence')}
                        className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-blue-50 hover:text-[#2b579a] rounded-lg font-semibold cursor-pointer"
                      >
                        Sentence case
                      </button>
                    </div>
                  )}
                </div>

                {/* Clear Formatting */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearFormatting}
                  className="h-7 px-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition cursor-pointer"
                  title="Remove all styling & reset to plain text (Ctrl+\)"
                >
                  <RemoveFormatting size={14} />
                </button>
              </div>

              {/* Row 2: B, I, U, S, Sub, Super, Inline Code, Text Color (16+picker), Highlight (10) */}
              <div className="flex items-center gap-0.5 mt-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('bold')}
                  className={`p-1.5 rounded font-black transition cursor-pointer ${
                    activeFormats.bold ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('italic')}
                  className={`p-1.5 rounded italic transition cursor-pointer ${
                    activeFormats.italic ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('underline')}
                  className={`p-1.5 rounded underline transition cursor-pointer ${
                    activeFormats.underline ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('strikeThrough')}
                  className={`p-1.5 rounded line-through transition cursor-pointer ${
                    activeFormats.strikeThrough ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough size={14} />
                </button>

                <div className="h-4 w-px bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('subscript')}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                  title="Subscript (X₂)"
                >
                  <Subscript size={13} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('superscript')}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                  title="Superscript (X²)"
                >
                  <Superscript size={13} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleInsertInlineCode}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-brand-primary transition cursor-pointer"
                  title="Inline Code / Promo Pill"
                >
                  <Code size={13} />
                </button>

                <div className="h-4 w-px bg-slate-200 mx-0.5" />

                {/* Font Color (16 presets + custom picker) */}
                <div className="color-menu-container relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !colorMenuOpen;
                      closeAllDropdowns();
                      setColorMenuOpen(next);
                    }}
                    className="p-1 hover:bg-slate-100 rounded transition cursor-pointer flex flex-col items-center justify-center px-1.5"
                    title="Font Color"
                  >
                    <span className="font-serif font-black text-sm leading-none text-slate-900">A</span>
                    <span className="w-4 h-1 rounded-full mt-0.5" style={{ backgroundColor: customTextColor }}></span>
                  </button>

                  {colorMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xl w-52 space-y-2 animate-fadeIn"
                    >
                      <div className="grid grid-cols-4 gap-1.5">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCustomTextColor(c.value);
                              handleColorChange(c.value);
                            }}
                            className="w-9 h-7 rounded-lg flex items-center justify-center border border-slate-200 hover:scale-110 transition shadow-2xs cursor-pointer"
                            style={{ backgroundColor: c.value }}
                            title={c.label}
                          />
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="color"
                            value={customTextColor}
                            onChange={(e) => {
                              setCustomTextColor(e.target.value);
                              handleColorChange(e.target.value);
                            }}
                            className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                          />
                          <span>Custom</span>
                        </label>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleColorChange('#171717')}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-100"
                        >
                          Default
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlight Color (10 presets) */}
                <div className="highlight-menu-container relative ml-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !highlightMenuOpen;
                      closeAllDropdowns();
                      setHighlightMenuOpen(next);
                    }}
                    className="p-1 hover:bg-slate-100 rounded transition cursor-pointer flex flex-col items-center justify-center px-1.5"
                    title="Text Highlight Color"
                  >
                    <Highlighter size={14} className="text-amber-500" />
                    <span className="w-4 h-1 bg-amber-400 rounded-full mt-0.5"></span>
                  </button>

                  {highlightMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xl grid grid-cols-2 gap-1.5 w-52 animate-fadeIn"
                    >
                      {HIGHLIGHT_COLORS.map((h) => (
                        <button
                          key={h.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleHighlightChange(h.value)}
                          className="h-7 px-2 text-[10px] font-bold rounded-lg border border-slate-200 hover:scale-105 transition truncate cursor-pointer text-slate-800"
                          style={{ backgroundColor: h.value === 'transparent' ? '#ffffff' : h.value }}
                          title={h.label}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mt-1">
                Font
              </div>
            </div>

            {/* Group 2: Paragraph */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-200 shrink-0">
              {/* Row 1: Bullet list, Numbered list, Checklist, Outdent, Indent, Line spacing */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('insertUnorderedList')}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    activeFormats.unorderedList ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Bullet List"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('insertOrderedList')}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    activeFormats.orderedList ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Numbered List"
                >
                  <ListOrdered size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleInsertChecklist}
                  className="p-1.5 hover:bg-emerald-50 hover:text-emerald-700 rounded text-slate-700 transition cursor-pointer"
                  title="Checklist (Green Checkmarks)"
                >
                  <ListChecks size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('outdent')}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                  title="Decrease Indent (Outdent)"
                >
                  <Outdent size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('indent')}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                  title="Increase Indent"
                >
                  <Indent size={14} />
                </button>

                {/* Line Spacing Dropdown */}
                <div className="line-spacing-container relative ml-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !lineSpacingMenuOpen;
                      closeAllDropdowns();
                      setLineSpacingMenuOpen(next);
                    }}
                    className="h-7 px-1.5 hover:bg-slate-100 rounded text-slate-700 font-semibold text-[11px] flex items-center gap-0.5 border border-slate-200 cursor-pointer"
                    title="Line Spacing"
                  >
                    <span>{currentLineSpacing}x</span>
                    <ChevronDown size={10} />
                  </button>

                  {lineSpacingMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xl w-32 space-y-0.5 animate-fadeIn"
                    >
                      {['1.0', '1.15', '1.5', '1.6', '2.0'].map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleLineSpacing(sp)}
                          className={`w-full text-left px-2.5 py-1 text-xs hover:bg-slate-100 rounded font-semibold cursor-pointer ${
                            currentLineSpacing === sp ? 'bg-blue-50 text-[#2b579a]' : 'text-slate-700'
                          }`}
                        >
                          Line Height {sp}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Align Left, Center, Right, Justify, Divider */}
              <div className="flex items-center gap-0.5 mt-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('justifyLeft')}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    activeFormats.justifyLeft ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Align Left (Ctrl+L)"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('justifyCenter')}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    activeFormats.justifyCenter ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Align Center (Ctrl+E)"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('justifyRight')}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    activeFormats.justifyRight ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Align Right (Ctrl+R)"
                >
                  <AlignRight size={14} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('justifyFull')}
                  className={`p-1.5 rounded transition cursor-pointer ${
                    activeFormats.justifyFull ? 'bg-blue-100 text-[#2b579a] ring-1 ring-blue-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Justify (Ctrl+J)"
                >
                  <AlignJustify size={14} />
                </button>

                <div className="h-4 w-px bg-slate-200 mx-1" />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec('insertHorizontalRule')}
                  className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition cursor-pointer"
                  title="Horizontal Divider Line"
                >
                  <Minus size={14} />
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mt-1">
                Paragraph
              </div>
            </div>

            {/* Group 3: Quick Heading Hierarchy & Styles (Normal, H1, H2, H3, H4, Quote, More Styles) */}
            <div className="flex flex-col justify-between shrink-0 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatBlock('<p>')}
                  className={`px-2 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs group ${
                    activeBlockTag === 'p'
                      ? 'bg-blue-50 border-[#2b579a] ring-1 ring-[#2b579a]/30'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#2b579a]'
                  }`}
                  title="Normal Paragraph"
                >
                  <div className={`text-[11px] font-bold ${activeBlockTag === 'p' ? 'text-[#2b579a]' : 'text-slate-900 group-hover:text-[#2b579a]'}`}>
                    Normal
                  </div>
                  <div className="text-[9px] text-slate-400">Body Text</div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatBlock('<h1>')}
                  className={`px-2 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs group ${
                    activeBlockTag === 'h1'
                      ? 'bg-blue-50 border-[#2b579a] ring-1 ring-[#2b579a]/30'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#2b579a]'
                  }`}
                  title="H1 — Article Main Title"
                >
                  <div className={`text-[13px] font-black leading-tight ${activeBlockTag === 'h1' ? 'text-[#2b579a]' : 'text-slate-950 group-hover:text-[#2b579a]'}`}>
                    H1
                  </div>
                  <div className="text-[9px] text-slate-400">Main Title</div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatBlock('<h2>')}
                  className={`px-2 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs group ${
                    activeBlockTag === 'h2'
                      ? 'bg-blue-50 border-[#2b579a] ring-1 ring-[#2b579a]/30'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#2b579a]'
                  }`}
                  title="H2 — Major Section Heading"
                >
                  <div className={`text-[12px] font-black leading-tight ${activeBlockTag === 'h2' ? 'text-[#2b579a]' : 'text-slate-900 group-hover:text-[#2b579a]'}`}>
                    H2
                  </div>
                  <div className="text-[9px] text-slate-400">Section</div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatBlock('<h3>')}
                  className={`px-2 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs group ${
                    activeBlockTag === 'h3'
                      ? 'bg-blue-50 border-[#2b579a] ring-1 ring-[#2b579a]/30'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#2b579a]'
                  }`}
                  title="H3 — Sub-Section Heading"
                >
                  <div className={`text-[11px] font-extrabold leading-tight ${activeBlockTag === 'h3' ? 'text-[#2b579a]' : 'text-slate-800 group-hover:text-[#2b579a]'}`}>
                    H3
                  </div>
                  <div className="text-[9px] text-slate-400">Sub-Section</div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatBlock('<h4>')}
                  className={`px-2 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs group ${
                    activeBlockTag === 'h4'
                      ? 'bg-blue-50 border-[#2b579a] ring-1 ring-[#2b579a]/30'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#2b579a]'
                  }`}
                  title="H4 — Minor Title / Bullet Group"
                >
                  <div className={`text-[11px] font-bold leading-tight ${activeBlockTag === 'h4' ? 'text-[#2b579a]' : 'text-slate-700 group-hover:text-[#2b579a]'}`}>
                    H4
                  </div>
                  <div className="text-[9px] text-slate-400">Minor Title</div>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormatBlock('<blockquote>')}
                  className={`px-2 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs group ${
                    activeBlockTag === 'blockquote'
                      ? 'bg-blue-50 border-[#2b579a] ring-1 ring-[#2b579a]/30'
                      : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-[#2b579a]'
                  }`}
                  title="Blockquote"
                >
                  <div className={`text-[11px] font-bold italic leading-tight ${activeBlockTag === 'blockquote' ? 'text-[#2b579a]' : 'text-slate-900 group-hover:text-[#2b579a]'}`}>
                    Quote
                  </div>
                  <div className="text-[9px] text-slate-400">Callout</div>
                </button>

                {/* More Styles Dropdown */}
                <div className="more-styles-container relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = !moreStylesMenuOpen;
                      closeAllDropdowns();
                      setMoreStylesMenuOpen(next);
                    }}
                    className={`px-2.5 py-1.5 border rounded-lg text-center transition cursor-pointer shadow-2xs flex items-center gap-1 ${
                      moreStylesMenuOpen
                        ? 'bg-[#2b579a] text-white border-[#2b579a]'
                        : 'bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                    }`}
                    title="Ready-to-use Editorial Formatting Styles"
                  >
                    <Sparkles size={13} className={moreStylesMenuOpen ? 'text-white' : 'text-indigo-600'} />
                    <div className="text-left">
                      <div className="text-[11px] font-bold leading-tight">More Styles</div>
                      <div className={`text-[9px] leading-tight ${moreStylesMenuOpen ? 'text-blue-100' : 'text-indigo-500'}`}>
                        Ready Presets
                      </div>
                    </div>
                    <ChevronDown size={11} />
                  </button>

                  {moreStylesMenuOpen && (
                    <div
                      onMouseDown={(e) => e.preventDefault()}
                      className="absolute top-full right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl w-64 space-y-1 animate-fadeIn text-left"
                    >
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                        Editorial Formatting Presets
                      </div>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyExtraStyle('lead')}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      >
                        <div className="text-sm font-medium text-slate-800">Lead / Intro Paragraph</div>
                        <div className="text-[10px] text-slate-400">Prominent 18px opening hook</div>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyExtraStyle('takeaway')}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                      >
                        <div className="text-xs font-bold text-blue-700">ℹ️ Key Takeaway Box</div>
                        <div className="text-[10px] text-slate-400">Highlighted summary callout for readers</div>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyExtraStyle('pullquote')}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      >
                        <div className="text-xs font-bold italic text-rose-700 border-l-2 border-brand-primary pl-2">
                          Editorial Pull-Quote
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Standout quote with crimson bar</div>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyExtraStyle('badge')}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">Highlight Badge Pill</div>
                          <div className="text-[10px] text-slate-400">Turn selection into pill badge</div>
                        </div>
                        <span className="text-[9px] font-black text-brand-primary bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          Pick
                        </span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyExtraStyle('codeblock')}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      >
                        <div className="text-xs font-mono font-bold text-slate-900">&lt;/&gt; Code / Specs Snippet</div>
                        <div className="text-[10px] text-slate-400">Dark monospace coupon or spec block</div>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleApplyExtraStyle('footnote')}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                      >
                        <div className="text-xs italic text-slate-500">Footnote / Disclosure Note</div>
                        <div className="text-[10px] text-slate-400">Small 12px muted caption style</div>
                      </button>
                      <div className="pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleApplyExtraStyle('review-outline')}
                          className="w-full text-left px-2.5 py-2 bg-emerald-50/70 hover:bg-emerald-100 rounded-xl transition cursor-pointer border border-emerald-200"
                        >
                          <div className="text-xs font-extrabold text-emerald-800">📑 Full Review Outline (H1 → H3)</div>
                          <div className="text-[10px] text-emerald-700">Auto-insert ready-to-fill review structure</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearFormatting}
                  className="px-2.5 py-1.5 bg-rose-50/80 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1"
                  title="Remove all styling & reset to plain text (Ctrl+\)"
                >
                  <RemoveFormatting size={13} className="text-rose-600 shrink-0" />
                  <div className="text-left">
                    <div className="text-[11px] font-bold leading-tight">Clear Style</div>
                    <div className="text-[9px] text-rose-500 leading-tight">Reset Normal</div>
                  </div>
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mt-1">
                Heading &amp; Styles
              </div>
            </div>
          </>
        )}

        {/* ================= TAB 2: INSERT ================= */}
        {ribbonTab === 'insert' && (
          <div className="flex flex-wrap items-center gap-2.5 w-full">
            {/* Insert Image & Multi-Layout */}
            <div className="flex flex-wrap items-center gap-1.5 pr-3 border-r border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => openImageModal({ tab: 'single', align: 'center' })}
                className="h-9 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Insert Single Image with Layout Options"
              >
                <Upload size={14} />
                <span>Insert Image</span>
              </button>

              <button
                type="button"
                onClick={() => openImageModal({ tab: 'gallery2' })}
                className="h-9 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="2-Image Side-by-Side Comparison Grid"
              >
                <Columns2 size={14} className="text-[#2b579a]" />
                <span>2-Image Grid</span>
              </button>

              <button
                type="button"
                onClick={() => openImageModal({ tab: 'gallery3' })}
                className="h-9 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="3-Image Product Gallery Row"
              >
                <Images size={14} className="text-indigo-600" />
                <span>3-Image Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => openImageModal({ tab: 'split' })}
                className="h-9 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Image + Text 2-Column Block"
              >
                <PanelLeft size={14} className="text-emerald-600" />
                <span>Image + Text</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMediaPickTarget('direct');
                  setMediaLibraryOpen(true);
                }}
                className="h-9 px-3 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Shared Media Library"
              >
                <FolderOpen size={14} />
                <span>Media Library</span>
              </button>
            </div>

            {/* Table, Link, Button, Divider */}
            <div className="flex flex-wrap items-center gap-1.5 pr-3 border-r border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setTableModalOpen(true)}
                className="h-9 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Insert Data Table"
              >
                <Table size={15} />
                <span>Insert Table</span>
              </button>

              <button
                type="button"
                onClick={openLinkModal}
                className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Insert Hyperlink (Ctrl+K)"
              >
                <LinkIcon size={14} className="text-[#2b579a]" />
                <span>Insert Link</span>
              </button>

              <button
                type="button"
                onClick={() => setButtonModalOpen(true)}
                className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Insert CTA Button"
              >
                <MousePointerClick size={14} className="text-brand-primary" />
                <span>+ CTA Button</span>
              </button>

              <button
                type="button"
                onClick={() => exec('insertHorizontalRule')}
                className="h-9 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                title="Horizontal Divider Line"
              >
                <Minus size={14} />
                <span>Divider</span>
              </button>
            </div>

            {/* Callout Boxes & Full Review Outline */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => insertCallout('tip')}
                className="h-9 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
              >
                <Lightbulb size={14} className="text-emerald-600" />
                <span>Tip Box</span>
              </button>
              <button
                type="button"
                onClick={() => insertCallout('info')}
                className="h-9 px-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
              >
                <Info size={14} className="text-blue-600" />
                <span>Key Takeaway</span>
              </button>
              <button
                type="button"
                onClick={() => insertCallout('warning')}
                className="h-9 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
              >
                <AlertTriangle size={14} className="text-rose-600" />
                <span>Warning Box</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyExtraStyle('review-outline')}
                className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <BookOpen size={14} className="text-amber-300" />
                <span>Review Outline (H1–H3)</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 3: AFFILIATE BLOCKS ================= */}
        {ribbonTab === 'affiliate' && (
          <div className="flex items-center gap-3 w-full">
            {/* Deal Box */}
            <button
              type="button"
              onClick={() => {
                setEditingBoxEl(null);
                setDealModalOpen(true);
              }}
              className="h-10 px-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-black flex items-center gap-2 transition cursor-pointer shadow-sm shrink-0"
              title="Insert Promo Deal Box"
            >
              <Tag size={15} />
              <span>+ Insert Promo Deal Box</span>
            </button>

            {/* Pros & Cons */}
            <button
              type="button"
              onClick={insertProsCons}
              className="h-10 px-3.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs shrink-0"
              title="Pros & Cons Comparison Grid"
            >
              <Scale size={15} className="text-teal-600" />
              <span>Pros / Cons Grid</span>
            </button>

            {/* Verdict Box */}
            <button
              type="button"
              onClick={() => insertCallout('verdict')}
              className="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs shrink-0"
              title="Lab Editorial Verdict Box"
            >
              <Trophy size={15} className="text-amber-400" />
              <span>Editor's Choice Verdict</span>
            </button>

            {/* Add Component Library */}
            <button
              type="button"
              onClick={() => setAddCompModalOpen(true)}
              className="h-10 px-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs shrink-0"
              title="Pre-designed Article Section Templates"
            >
              <LayoutGrid size={15} />
              <span>Section Template Library</span>
            </button>
          </div>
        )}

        {/* ================= TAB 4: LAYOUT & VIEW ================= */}
        {ribbonTab === 'view' && (
          <div className="flex items-center gap-4 w-full">
            {/* A4 Page vs Full Width */}
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsPaperView(true)}
                className={`h-10 px-3.5 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  isPaperView
                    ? 'bg-[#2b579a] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText size={15} />
                <span>A4 Paper Canvas (Word)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaperView(false)}
                className={`h-10 px-3.5 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  !isPaperView
                    ? 'bg-[#2b579a] text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Maximize2 size={15} />
                <span>Full-Width Canvas (100%)</span>
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-2 pr-4 border-r border-slate-200 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">Zoom:</span>
              {[90, 100, 115, 125].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoomLevel(z)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    zoomLevel === z
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {z}%
                </button>
              ))}
            </div>

            {/* Fullscreen & Code View */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-10 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 100%'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSourceMode(!isSourceMode)}
                className={`h-10 px-3.5 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs ${
                  isSourceMode ? 'bg-amber-400 text-slate-950' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isSourceMode ? <Eye size={14} /> : <Code2 size={14} />}
                <span>{isSourceMode ? 'Visual Mode' : 'HTML Source'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFullPreviewOpen(true)}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
                title="Preview article in real client website layout"
              >
                <Eye size={15} />
                <span>Full-Page Live Preview</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* =========================================================================
          QUICK INSERT & IMAGE STRIP (SURFACED DIRECTLY ON DEFAULT HOME TAB)
         ========================================================================= */}
      {ribbonTab === 'home' && !isSourceMode && (
        <div className="bg-slate-50/95 border-b border-slate-300 px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs select-none relative z-25">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
            Quick Insert:
          </span>

          {/* Primary Insert Image */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => openImageModal({ tab: 'single', align: 'center' })}
            className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Upload or insert image with custom layout"
          >
            <ImageIcon size={13} />
            <span>Insert Image</span>
          </button>

          {/* Versatile Image Layouts Dropdown */}
          <div className="quick-image-menu-container relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = !quickImageMenuOpen;
                closeAllDropdowns();
                setQuickImageMenuOpen(next);
              }}
              className={`h-7 px-2.5 border rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                quickImageMenuOpen
                  ? 'bg-[#2b579a] text-white border-[#2b579a]'
                  : 'bg-white hover:bg-blue-50 border-slate-200 text-slate-700 hover:border-blue-300'
              }`}
              title="Choose image layout preset (Centered, Full Width, Float Left/Right, 2-Photo Grid, 3-Photo Row, Image+Text)"
            >
              <Images size={13} className={quickImageMenuOpen ? 'text-white' : 'text-[#2b579a]'} />
              <span>Image Layouts</span>
              <ChevronDown size={11} />
            </button>

            {quickImageMenuOpen && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl w-64 space-y-1 animate-fadeIn text-left"
              >
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Choose Image Layout Style
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openImageModal({ tab: 'single', align: 'center', width: '80%' })}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <ImageIcon size={13} className="text-[#2b579a] shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Single Image (Centered)</div>
                    <div className="text-[10px] text-slate-400">Balanced 80% centered card with caption</div>
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openImageModal({ tab: 'single', align: 'full', width: '100%' })}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <Maximize2 size={13} className="text-[#2b579a] shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Full-Width Hero Image</div>
                    <div className="text-[10px] text-slate-400">Edge-to-edge 100% review banner photo</div>
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openImageModal({ tab: 'single', align: 'left', width: '40%' })}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <PanelLeft size={13} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Image Left + Text Wrap</div>
                    <div className="text-[10px] text-slate-400">Floated left so text wraps alongside</div>
                  </div>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openImageModal({ tab: 'single', align: 'right', width: '40%' })}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                >
                  <PanelRight size={13} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Image Right + Text Wrap</div>
                    <div className="text-[10px] text-slate-400">Floated right alongside commentary</div>
                  </div>
                </button>
                <div className="pt-1 border-t border-slate-100 space-y-1">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openImageModal({ tab: 'gallery2' })}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <Columns2 size={13} className="text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">2-Image Side-by-Side Grid</div>
                      <div className="text-[10px] text-slate-400">Compare 2 photos horizontally</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openImageModal({ tab: 'gallery3' })}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <Columns3 size={13} className="text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">3-Image Gallery Row</div>
                      <div className="text-[10px] text-slate-400">3-column product showcase strip</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => openImageModal({ tab: 'split' })}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <LayoutTemplate size={13} className="text-brand-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Image + Feature Text Card</div>
                      <div className="text-[10px] text-slate-400">Photo + highlighted copy in 2 columns</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Media Library */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllDropdowns();
              setMediaPickTarget('direct');
              setMediaLibraryOpen(true);
            }}
            className="h-7 px-2.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-indigo-700 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Shared Media Library"
          >
            <FolderOpen size={13} />
            <span>Media Library</span>
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5" />

          {/* Frequent Review Tools */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openLinkModal}
            className="h-7 px-2.5 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 hover:text-[#2b579a] rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Insert Hyperlink (Ctrl+K)"
          >
            <LinkIcon size={12} className="text-[#2b579a]" />
            <span>Link</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllDropdowns();
              setTableModalOpen(true);
            }}
            className="h-7 px-2.5 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Insert Comparison / Specs Table"
          >
            <Table size={12} className="text-indigo-600" />
            <span>Table</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllDropdowns();
              insertProsCons();
            }}
            className="h-7 px-2.5 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Pros & Cons Comparison Grid"
          >
            <Scale size={12} className="text-emerald-600" />
            <span>Pros &amp; Cons</span>
          </button>

          {/* Callout Dropdown */}
          <div className="quick-callout-menu-container relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = !quickCalloutMenuOpen;
                closeAllDropdowns();
                setQuickCalloutMenuOpen(next);
              }}
              className={`h-7 px-2.5 border rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs ${
                quickCalloutMenuOpen
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50/80 hover:bg-amber-100 border-amber-200 text-amber-800'
              }`}
              title="Insert Tip, Warning, Key Takeaway, or Verdict Box"
            >
              <Lightbulb size={12} />
              <span>Callout</span>
              <ChevronDown size={10} />
            </button>

            {quickCalloutMenuOpen && (
              <div
                onMouseDown={(e) => e.preventDefault()}
                className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-2xl w-52 space-y-0.5 animate-fadeIn text-left"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuickCalloutMenuOpen(false);
                    insertCallout('tip');
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 cursor-pointer"
                >
                  <Lightbulb size={13} className="text-emerald-600" />
                  <span>Tip Box</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuickCalloutMenuOpen(false);
                    insertCallout('info');
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 rounded-xl text-xs font-bold text-blue-800 flex items-center gap-2 cursor-pointer"
                >
                  <Info size={13} className="text-blue-600" />
                  <span>Key Takeaway Box</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuickCalloutMenuOpen(false);
                    insertCallout('warning');
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2 cursor-pointer"
                >
                  <AlertTriangle size={13} className="text-rose-600" />
                  <span>Warning Box</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuickCalloutMenuOpen(false);
                    insertCallout('verdict');
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-900 flex items-center gap-2 cursor-pointer"
                >
                  <Trophy size={13} className="text-amber-500" />
                  <span>Editorial Verdict Box</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllDropdowns();
              setEditingBoxEl(null);
              setDealModalOpen(true);
            }}
            className="h-7 px-2.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-brand-primary rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Insert Promo Deal Box"
          >
            <Tag size={12} />
            <span>Deal Box</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllDropdowns();
              setButtonModalOpen(true);
            }}
            className="h-7 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Insert CTA Button"
          >
            <MousePointerClick size={12} className="text-brand-primary" />
            <span>CTA Button</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              closeAllDropdowns();
              setAddCompModalOpen(true);
            }}
            className="h-7 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
            title="Section Template Library"
          >
            <LayoutGrid size={12} className="text-amber-300" />
            <span>Templates</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          ACTIVE COMPONENT ACTION BAR (TOP PINNED SLATE STRIP - NEVER WRAPS)
         ========================================================================= */}
      {activeComp && !isSourceMode && (
        <div className="bg-slate-900 border-b border-slate-800 px-3.5 py-2 flex items-center justify-between gap-3 text-xs text-white shadow-md sticky top-0 z-20 overflow-x-auto whitespace-nowrap scrollbar-none animate-fadeIn">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="font-semibold text-slate-300 text-xs">
              Selected Block: <strong className="text-white font-black">{getComponentLabel(activeComp)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Move Up */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={moveComponentUp}
              className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
              title="Move block up"
            >
              <ArrowUp size={13} /> Up
            </button>

            {/* Move Down */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={moveComponentDown}
              className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
              title="Move block down"
            >
              <ArrowDown size={13} /> Down
            </button>

            {/* Insert New Line Above */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => activeComp && insertLineBeforeElement(activeComp, { forceNew: true })}
              className="h-7 px-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0 shadow-2xs"
              title="Insert a new line above this block"
            >
              <CornerUpLeft size={12} /> <span>Line Above</span>
            </button>

            {/* Insert New Line Below */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => activeComp && insertLineAfterElement(activeComp, { forceNew: true, clearFloat: true })}
              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0 shadow-2xs"
              title="Insert a new line below this block"
            >
              <CornerDownLeft size={12} /> <span>New Line</span>
            </button>

            {!isFigureComponent(activeComp) && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearFormatting}
                className="h-7 px-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0 shadow-2xs"
                title="Strip card styling and convert to plain text"
              >
                <RemoveFormatting size={12} /> <span>Clear Style</span>
              </button>
            )}

            {/* Clone */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cloneComponent}
              className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
              title="Duplicate this block"
            >
              <Copy size={13} /> Duplicate
            </button>

            {/* Style Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
                className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-xs shrink-0"
                title="Change block border & background style"
              >
                <Palette size={13} className="text-indigo-400" />
                <span>Block Style</span>
                <ChevronDown size={12} />
              </button>

              {styleDropdownOpen && (
                <div className="absolute top-full right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl w-64 space-y-1 animate-fadeIn text-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Select Block Style:
                  </div>
                  <button
                    type="button"
                    onClick={() => applyComponentStyle('white')}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white shadow-2xs shrink-0"></span>
                    <span>Standard White Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComponentStyle('deal')}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 rounded-xl text-xs font-semibold text-rose-900 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-rose-500 bg-rose-50 shadow-2xs shrink-0"></span>
                    <span>Featured Deal Box (Red/Orange)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComponentStyle('dark')}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-900 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded bg-slate-900 shadow-2xs shrink-0"></span>
                    <span>Premium Dark Card (Verdict)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComponentStyle('emerald')}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-emerald-400 bg-emerald-50 shadow-2xs shrink-0"></span>
                    <span>Pro Emerald Card (Pros/Tip)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComponentStyle('amber')}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-amber-400 bg-amber-50 shadow-2xs shrink-0"></span>
                    <span>Amber Caution Card (Note)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyComponentStyle('minimal')}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-1 pt-1.5"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-dashed border-slate-300 bg-transparent shrink-0"></span>
                    <span>Minimal Borderless Section</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Image Quick Layout, Width, Replace & Edit Controls */}
            {isFigureComponent(activeComp) && (
              <>
                <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded-lg border border-slate-700 shrink-0">
                  {(['left', 'center', 'right', 'full'] as const).map((al) => {
                    const isActive = (activeComp.getAttribute('data-align') || 'center') === al;
                    return (
                      <button
                        key={al}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateActiveImageLayout({ align: al })}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold capitalize cursor-pointer transition ${
                          isActive ? 'bg-[#2b579a] text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={`Align image ${al}`}
                      >
                        {al}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded-lg border border-slate-700 shrink-0">
                  {(['25%', '50%', '75%', '100%'] as const).map((w) => {
                    const isActive = Math.abs(activeImageWidthPct - parseInt(w, 10)) <= 2;
                    return (
                      <button
                        key={w}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => updateActiveImageLayout({ width: w })}
                        className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                          isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={`Image width ${w}`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMediaPickTarget('replace-active');
                    setMediaLibraryOpen(true);
                  }}
                  className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
                  title="Swap image from Media Library"
                >
                  <RefreshCw size={12} /> Replace Image
                </button>

                <button
                  type="button"
                  onClick={openEditActiveImageModal}
                  className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
                  title="Edit image URL, caption, alignment, frame"
                >
                  <Pencil size={12} /> Edit Image
                </button>
              </>
            )}

            {/* Insert Image */}
            <button
              type="button"
              onClick={() => openImageModal({ tab: 'single', align: 'center' })}
              className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
              title="Insert image into this block"
            >
              <ImageIcon size={13} className="text-indigo-400" /> Insert Image
            </button>

            {/* Media Library */}
            <button
              type="button"
              onClick={() => {
                setMediaPickTarget('direct');
                setMediaLibraryOpen(true);
              }}
              className="h-7 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-xs shrink-0"
              title="Choose image from Media Library"
            >
              <FolderOpen size={13} className="text-indigo-400" /> Media Library
            </button>

            {/* Delete Block Button */}
            <button
              type="button"
              onClick={deleteActiveBox}
              className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs text-xs shrink-0 ml-1"
              title="Delete selected block/component"
            >
              <Trash2 size={13} />
              <span>Delete Block</span>
            </button>
          </div>
        </div>
      )}
      </div>

      {/* =========================================================================
          EDITOR CANVAS: DRAG & DROP IMAGES, INTERACTIVE EDITORIAL BOXES
         ========================================================================= */}
      <div
        ref={canvasScrollRef}
        className={`relative flex-1 min-h-0 overflow-y-auto scroll-smooth bg-white ${
          isFullscreen ? '' : 'max-h-[70vh]'
        }`}
      >
        {/* LIVE DRAG-AND-DROP POSITION INDICATOR INSIDE EDITOR */}
        {dragMoveState && !isSourceMode && (
          <div
            className="pointer-events-none absolute z-30 transition-all duration-75"
            style={{
              top: `${dragMoveState.dropTop}px`,
              left: `${dragMoveState.dropLeft}px`,
              width: `${dragMoveState.dropWidth}px`,
              height: `${dragMoveState.dropHeight}px`,
            }}
          >
            {dragMoveState.zone === 'center' ? (
              <div className="relative w-full h-1 bg-[#2b579a] rounded-full shadow-lg">
                <span className="absolute -left-1.5 -top-1 w-3 h-3 rounded-full bg-[#2b579a] ring-2 ring-white" />
                <span className="absolute -right-1.5 -top-1 w-3 h-3 rounded-full bg-[#2b579a] ring-2 ring-white" />
                <span className="absolute left-1/2 -top-3.5 -translate-x-1/2 bg-[#2b579a] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow whitespace-nowrap">
                  Drop here • Center
                </span>
              </div>
            ) : (
              <div className="w-full h-full rounded-xl border-2 border-dashed border-[#2b579a] bg-blue-500/15 flex items-center justify-center p-2">
                <span className="bg-[#2b579a] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow whitespace-nowrap">
                  {dragMoveState.zone === 'left'
                    ? 'Drop Left • Text Wraps Right'
                    : 'Drop Right • Text Wraps Left'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* WORD-STYLE INTERACTIVE DRAG-TO-RESIZE & DRAG-TO-MOVE OVERLAY ON SELECTED IMAGE */}
        {activeComp && !isSourceMode && activeCompRect && !dragMoveState && isFigureComponent(activeComp) && (
          <>
            <div
              className="pointer-events-none absolute z-20 border-2 border-[#2b579a] rounded-xl"
              style={{
                top: `${activeCompRect.imgTop}px`,
                left: `${activeCompRect.imgLeft}px`,
                width: `${activeCompRect.imgWidth}px`,
                height: `${activeCompRect.imgHeight}px`,
              }}
            >
              {/* Inner Drag Surface (grab anywhere inside image to move to another position) */}
              <div
                onMouseDown={(e) => queueDragMove(activeComp, e, 5)}
                className="pointer-events-auto absolute inset-3 z-0 cursor-grab active:cursor-grabbing"
                title="Drag to move anywhere"
              />

              {/* Visible Top-Left Drag Pill Badge */}
              <button
                type="button"
                onMouseDown={(e) => beginDragMove(activeComp, e.clientX, e.clientY)}
                className="pointer-events-auto absolute top-2 left-2 z-10 bg-[#2b579a] hover:bg-[#1f4277] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-md cursor-grab active:cursor-grabbing flex items-center gap-1"
                title="Drag to move anywhere"
              >
                <Move size={11} />
                <span>Drag to move</span>
              </button>

              {/* 4 Corner Drag Handles */}
              <div
                onMouseDown={(e) => startImageResize(e, 'nw')}
                className="pointer-events-auto z-10 absolute -top-2 -left-2 w-4 h-4 rounded-sm bg-white border-2 border-[#2b579a] shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                title="Drag corners to resize"
              />
              <div
                onMouseDown={(e) => startImageResize(e, 'ne')}
                className="pointer-events-auto z-10 absolute -top-2 -right-2 w-4 h-4 rounded-sm bg-white border-2 border-[#2b579a] shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                title="Drag corners to resize"
              />
              <div
                onMouseDown={(e) => startImageResize(e, 'sw')}
                className="pointer-events-auto z-10 absolute -bottom-2 -left-2 w-4 h-4 rounded-sm bg-white border-2 border-[#2b579a] shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
                title="Drag corners to resize"
              />
              <div
                onMouseDown={(e) => startImageResize(e, 'se')}
                className="pointer-events-auto z-10 absolute -bottom-2 -right-2 w-4 h-4 rounded-sm bg-white border-2 border-[#2b579a] shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
                title="Drag corners to resize"
              />

              {/* Left & Right Side Pill Drag Handles */}
              <div
                onMouseDown={(e) => startImageResize(e, 'w')}
                className="pointer-events-auto z-10 absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-9 rounded-full bg-white border-2 border-[#2b579a] shadow-md cursor-ew-resize hover:scale-110 transition-transform"
                title="Drag corners to resize"
              />
              <div
                onMouseDown={(e) => startImageResize(e, 'e')}
                className="pointer-events-auto z-10 absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-9 rounded-full bg-white border-2 border-[#2b579a] shadow-md cursor-ew-resize hover:scale-110 transition-transform"
                title="Drag corners to resize"
              />

              {/* Live Pixel & Percentage Readout Badge While Resizing */}
              {resizingBadge ? (
                <div className="z-10 absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#2b579a] text-white font-mono text-xs font-extrabold px-3 py-1 rounded-full shadow-xl border border-white/30 whitespace-nowrap">
                  {resizingBadge}
                </div>
              ) : (
                <div className="z-10 hidden sm:block absolute bottom-2 right-2 bg-slate-950/75 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs whitespace-nowrap">
                  Drag corners to resize
                </div>
              )}
            </div>

            {/* FLOATING IMAGE SIZE SLIDER + MOVE + PRESETS DOCKED ABOVE IMAGE */}
            <div
              className="pointer-events-none absolute left-0 right-0 z-30 flex justify-center px-3"
              style={{ top: `${Math.max(8, activeCompRect.imgTop - 44)}px` }}
            >
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-950/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs animate-fadeIn select-none max-w-full"
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    beginDragMove(activeComp, e.clientX, e.clientY);
                  }}
                  className="px-2 py-0.5 bg-[#2b579a] hover:bg-[#1f4277] text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-grab active:cursor-grabbing"
                  title="Drag to move anywhere"
                >
                  <Move size={11} />
                  <span>Drag</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={moveComponentUp}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer"
                  title="Move block up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={moveComponentDown}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer"
                  title="Move block down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertLineBeforeElement(activeComp, { forceNew: true })}
                  className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Insert a new line above this block"
                >
                  <CornerUpLeft size={11} />
                  <span>Line Above</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertLineAfterElement(activeComp, { forceNew: true, clearFloat: true })}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Insert a new line below this block"
                >
                  <CornerDownLeft size={11} />
                  <span>New Line</span>
                </button>

                <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

                <span className="text-[11px] font-bold text-slate-300">Size:</span>
                <input
                  type="range"
                  min={15}
                  max={100}
                  step={1}
                  value={activeImageWidthPct}
                  onChange={(e) => updateActiveImageLayout({ width: `${e.target.value}%` })}
                  className="w-20 sm:w-24 accent-emerald-400 cursor-pointer"
                  aria-label="Image width percentage"
                />
                <span className="font-mono font-extrabold text-[11px] text-emerald-300 w-9 text-right">
                  {activeImageWidthPct}%
                </span>

                <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

                {(['25%', '50%', '75%', '100%'] as const).map((w) => {
                  const isActive = Math.abs(activeImageWidthPct - parseInt(w, 10)) <= 2;
                  return (
                    <button
                      key={w}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => updateActiveImageLayout({ width: w })}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                        isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  );
                })}

                <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

                {(['left', 'center', 'right', 'full'] as const).map((al) => {
                  const isActive = resolveActiveImageAlign(activeComp) === al;
                  return (
                    <button
                      key={al}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => updateActiveImageLayout({ align: al })}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold capitalize cursor-pointer transition ${
                        isActive ? 'bg-[#2b579a] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {al === 'left' ? 'Left' : al === 'right' ? 'Right' : al === 'full' ? 'Full' : 'Center'}
                    </button>
                  );
                })}

                <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

                <button
                  type="button"
                  onClick={openEditActiveImageModal}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Edit image URL, caption, alignment, frame"
                >
                  <Pencil size={11} />
                  <span>Edit Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaPickTarget('replace-active');
                    setMediaLibraryOpen(true);
                  }}
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Swap image from Media Library"
                >
                  <RefreshCw size={11} />
                  <span>Replace Image</span>
                </button>
                <button
                  type="button"
                  onClick={deleteActiveBox}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  title="Delete this block from article"
                >
                  <Trash2 size={11} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* FLOATING ACTION TOOLBAR DOCKED DIRECTLY TO NON-IMAGE ACTIVE CARD */}
        {activeComp && !isSourceMode && activeCompRect && !dragMoveState && !isFigureComponent(activeComp) && (
          <div
            className="absolute z-20 pointer-events-auto transition-all duration-150 flex items-center gap-1 bg-slate-950/95 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs animate-fadeIn select-none"
            style={{
              top: `${Math.max(8, activeCompRect.top - 16)}px`,
              right: `${activeCompRect.right}px`,
            }}
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                beginDragMove(activeComp, e.clientX, e.clientY);
              }}
              className="px-2 py-0.5 bg-[#2b579a] hover:bg-[#1f4277] text-white rounded-lg font-bold flex items-center gap-1 cursor-grab active:cursor-grabbing text-[11px] mr-1"
              title="Drag to move anywhere"
            >
              <Move size={11} />
              <span>Drag</span>
            </button>
            <span className="font-extrabold text-slate-200 text-[11px] truncate max-w-[150px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {getComponentLabel(activeComp)}
            </span>
            <div className="h-3.5 w-px bg-slate-700 mx-1" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={moveComponentUp}
              className="px-1.5 py-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition flex items-center gap-0.5 text-[11px] font-semibold cursor-pointer"
              title="Move block up"
            >
              <ArrowUp size={12} /> Up
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={moveComponentDown}
              className="px-1.5 py-0.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition flex items-center gap-0.5 text-[11px] font-semibold cursor-pointer"
              title="Move block down"
            >
              <ArrowDown size={12} /> Down
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertLineBeforeElement(activeComp, { forceNew: true })}
              className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold transition flex items-center gap-1 text-[11px] cursor-pointer"
              title="Insert a new line above this block"
            >
              <CornerUpLeft size={11} />
              <span>Line Above</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertLineAfterElement(activeComp, { forceNew: true, clearFloat: true })}
              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center gap-1 text-[11px] cursor-pointer"
              title="Insert a new line below this block"
            >
              <CornerDownLeft size={11} />
              <span>New Line</span>
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cloneComponent}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer"
              title="Duplicate block"
            >
              <Copy size={12} />
            </button>
            <button
              type="button"
              onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition cursor-pointer"
              title="Change block style"
            >
              <Palette size={12} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClearFormatting}
              className="p-1 hover:bg-slate-800 rounded text-amber-300 hover:text-white transition cursor-pointer"
              title="Strip card styling and convert to plain text"
            >
              <RemoveFormatting size={12} />
            </button>
            <div className="h-3.5 w-px bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={deleteActiveBox}
              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg transition flex items-center gap-1 text-[11px] shadow-xs cursor-pointer"
              title="Delete this block from article"
            >
              <Trash2 size={12} />
              <span>Delete</span>
            </button>
          </div>
        )}
        {isSourceMode ? (
          <textarea
            value={sourceCode}
            onChange={handleSourceChange}
            className="w-full p-5 font-mono text-xs text-emerald-400 bg-slate-900 focus:outline-none resize-y min-h-[500px]"
            style={{ minHeight }}
            placeholder="Edit raw HTML markup..."
          />
        ) : (
          <div
            onClick={handleCanvasBackgroundClick}
            className={`w-full transition-all duration-200 ${
            isPaperView
              ? 'bg-[#eef2f7] p-4 sm:p-10 flex justify-center items-start min-h-[750px]'
              : 'bg-white p-4 sm:p-8 min-h-[500px] cursor-text'
          }`}>
            <div
              onClick={handleCanvasBackgroundClick}
              className={
                isPaperView
                  ? 'w-full max-w-[850px] bg-white min-h-[1050px] shadow-2xl shadow-slate-400/25 border border-slate-300/80 rounded-xs px-8 py-10 sm:px-16 sm:py-16 my-2 transition-all relative cursor-text'
                  : 'w-full max-w-none'
              }
              style={{
                transform: isPaperView && zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                transformOrigin: 'top center',
              }}
            >
              <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                onMouseDown={handleEditorMouseDown}
                onClick={handleEditorClick}
                onDragStart={(e) => {
                  if ((e.target as HTMLElement)?.tagName?.toLowerCase() === 'img') {
                    e.preventDefault();
                  }
                }}
                onKeyDown={handleEditorKeyDown}
                onSelect={() => {
                  captureEditorSelection(false);
                }}
                onKeyUp={() => {
                  captureEditorSelection(true);
                  const sel = window.getSelection();
                  if (sel?.anchorNode) {
                    const comp = findEnclosingComponent(sel.anchorNode);
                    selectComponent(comp);
                  }
                }}
                onMouseUp={(e) => {
                  captureEditorSelection(true);
                  const clickedComp = findEnclosingComponent(e.target as Node);
                  if (clickedComp) {
                    selectComponent(clickedComp);
                    return;
                  }
                  const sel = window.getSelection();
                  if (sel?.anchorNode) {
                    const comp = findEnclosingComponent(sel.anchorNode);
                    selectComponent(comp);
                  } else {
                    selectComponent(null);
                  }
                }}
                onDrop={handleEditorDrop}
                onPaste={handleEditorPaste}
                className="word-studio-canvas w-full pt-4 pb-24 focus:outline-none font-sans leading-relaxed text-slate-900 prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-p:my-3 prose-p:leading-relaxed prose-a:text-[#2b579a] prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-[#2b579a] prose-blockquote:italic prose-blockquote:pl-4 prose-blockquote:my-4 prose-img:rounded-xl prose-ul:list-disc prose-ol:list-decimal"
                style={{ minHeight: isPaperView ? '900px' : minHeight, fontSize: '15px' }}
                data-placeholder={placeholder}
              />
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MICROSOFT WORD STATUS BAR (BOTTOM BLUE DOCK)
         ========================================================================= */}
      <div className="shrink-0 bg-[#2b579a] text-white px-4 py-1.5 text-xs flex items-center justify-between select-none shadow-inner border-t border-[#204477] rounded-b-2xl">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold">
            <FileText size={12} className="text-white/80" />
            <span>Page 1 of 1</span>
          </span>
          <span>Words: <strong className="text-white">{stats.words}</strong></span>
          <span>Characters: <strong className="text-white">{stats.characters}</strong></span>
          <span className="hidden sm:inline">Reading time: <strong className="text-amber-300">{stats.readTime}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          {/* Paper View Switcher */}
          <button
            type="button"
            onClick={() => setIsPaperView(!isPaperView)}
            className="text-[11px] font-bold text-white/90 hover:text-white flex items-center gap-1 cursor-pointer hover:underline"
          >
            <span>{isPaperView ? '📄 A4 Word Page' : '⛶ Full Width 100%'}</span>
          </button>

          {/* Zoom Slider */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-white/90 bg-white/10 px-2 py-0.5 rounded">
            <button
              type="button"
              onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
              className="hover:text-amber-300 font-black cursor-pointer px-1"
              title="Zoom out (-10%)"
            >
              -
            </button>
            <span className="w-9 text-center font-bold text-white">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
              className="hover:text-amber-300 font-black cursor-pointer px-1"
              title="Zoom in (+10%)"
            >
              +
            </button>
          </div>
          
          <span className="text-[10px] text-white/60 font-mono hidden md:inline">
            Word Studio v3.0
          </span>
        </div>
      </div>
    </div>

      {/* =========================================================================
          MODAL: CONFIGURE DEAL BOX & BUTTON LINK
         ========================================================================= */}
      {dealModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag size={16} className="text-brand-primary" />
                <span>{editingBoxEl ? 'Edit Deal Box & Button Link' : 'Insert New Deal Box'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setDealModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name / Deal Title *</label>
                <input
                  type="text"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  placeholder="e.g. Nilight 20-Inch Curved LED Light Bar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Deal Price *</label>
                  <input
                    type="text"
                    value={dealForm.dealPrice}
                    onChange={(e) => setDealForm({ ...dealForm, dealPrice: e.target.value })}
                    placeholder="$49.99"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Original List Price</label>
                  <input
                    type="text"
                    value={dealForm.originalPrice}
                    onChange={(e) => setDealForm({ ...dealForm, originalPrice: e.target.value })}
                    placeholder="$89.99"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Promo / Coupon Code</label>
                  <input
                    type="text"
                    value={dealForm.couponCode}
                    onChange={(e) => setDealForm({ ...dealForm, couponCode: e.target.value })}
                    placeholder="HEYGOODLY20"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Badge Label</label>
                  <input
                    type="text"
                    value={dealForm.badge}
                    onChange={(e) => setDealForm({ ...dealForm, badge: e.target.value })}
                    placeholder="Verified Exclusive Deal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* BUTTON LINK SETTINGS */}
              <div className="pt-2 border-t border-slate-100 space-y-3 bg-rose-50/40 p-3 rounded-xl border">
                <div>
                  <label className="font-bold text-slate-900 block mb-1 flex items-center justify-between">
                    <span>Button Display Text *</span>
                    <span className="text-[10px] text-slate-400">Button CTA Text</span>
                  </label>
                  <input
                    type="text"
                    value={dealForm.buttonText}
                    onChange={(e) => setDealForm({ ...dealForm, buttonText: e.target.value })}
                    placeholder="Claim Deal at Official Store →"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-900 block mb-1 flex items-center justify-between">
                    <span>Button Destination Link (Affiliate / Checkout URL) *</span>
                    <span className="text-[10px] text-slate-400">Target Destination</span>
                  </label>
                  <input
                    type="url"
                    value={dealForm.buttonUrl}
                    onChange={(e) => setDealForm({ ...dealForm, buttonUrl: e.target.value })}
                    placeholder={`https://www.nilight.com/?ref=${SITE_SLUG}`}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-mono text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDealModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDealBox}
                className="px-5 py-2 text-xs font-bold bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow transition"
              >
                {editingBoxEl ? 'Update Box & Button Link' : 'Insert Deal Box'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INSERT STANDALONE CTA BUTTON
         ========================================================================= */}
      {buttonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MousePointerClick size={16} className="text-brand-primary" />
                <span>Insert New CTA Button</span>
              </h3>
              <button
                type="button"
                onClick={() => setButtonModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Button Label *</label>
                <input
                  type="text"
                  value={buttonForm.text}
                  onChange={(e) => setButtonForm({ ...buttonForm, text: e.target.value })}
                  placeholder="e.g. Check Verified Price on Merchant Store →"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Destination URL *</label>
                <input
                  type="url"
                  value={buttonForm.url}
                  onChange={(e) => setButtonForm({ ...buttonForm, url: e.target.value })}
                  placeholder="https://example.com/deal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Button Style</label>
                  <select
                    value={buttonForm.style}
                    onChange={(e) => setButtonForm({ ...buttonForm, style: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                  >
                    <option value="crimson">Crimson Red (HeyGoodly)</option>
                    <option value="emerald">Emerald Green</option>
                    <option value="dark">Dark Slate</option>
                    <option value="outline">Transparent Outline</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Alignment</label>
                  <select
                    value={buttonForm.alignment}
                    onChange={(e) => setButtonForm({ ...buttonForm, alignment: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setButtonModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertButton}
                disabled={!buttonForm.text.trim()}
                className="px-5 py-2 text-xs font-bold bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg shadow transition"
              >
                Insert Button
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: IMAGE STUDIO (SINGLE / 2-PHOTO GRID / 3-PHOTO GALLERY / IMAGE+TEXT)
         ========================================================================= */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon size={16} className="text-brand-primary" />
                  <span>{editingFigureEl ? 'Edit Image & Layout' : 'Insert Images & Visual Layouts'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tip: You can also paste screenshots (Ctrl+V / Cmd+V) or drag-and-drop images directly onto the page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingFigureEl(null);
                  setImageModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Layout Mode Tabs */}
            {!editingFigureEl && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 text-xs">
                {[
                  { id: 'single' as const, label: 'Single Image', icon: <ImageIcon size={13} /> },
                  { id: 'gallery2' as const, label: '2-Image Grid', icon: <Columns2 size={13} /> },
                  { id: 'gallery3' as const, label: '3-Image Gallery', icon: <Images size={13} /> },
                  { id: 'split' as const, label: 'Image + Text', icon: <PanelLeft size={13} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setImageModalTab(tab.id)}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      imageModalTab === tab.id
                        ? 'bg-white text-[#2b579a] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1 min-h-0">
              {imageModalTab === 'single' && (
                <>
                  {/* Upload + Live Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
                    <div className={imageUrl ? 'sm:col-span-7' : 'sm:col-span-12'}>
                      <label className="font-bold text-slate-800 block mb-1">
                        1. Upload image from computer (PNG, JPG, WEBP, GIF)
                      </label>
                      <label className="border-2 border-dashed border-slate-200 hover:border-brand-primary rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-brand-primary-soft/30 transition h-32">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSlotImageUpload(e, 'single')}
                          className="hidden"
                        />
                        {isUploadingImage && uploadingSlot === 'single' ? (
                          <div className="space-y-2 text-center">
                            <div className="text-xs font-bold text-brand-primary">Uploading image to server...</div>
                            <div className="w-40 bg-slate-200 h-1.5 rounded-full overflow-hidden mx-auto">
                              <div className="bg-brand-primary h-full" style={{ width: `${uploadProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-1">
                            <Upload size={20} className="mx-auto text-brand-primary" />
                            <span className="font-bold text-slate-800 block">Select an image file from your computer</span>
                            <p className="text-[10px] text-slate-400">
                              {uploadedFileName ? `Selected: ${uploadedFileName}` : 'or paste direct URL / choose from Media Library'}
                            </p>
                          </div>
                        )}
                      </label>
                    </div>

                    {imageUrl && (
                      <div className="sm:col-span-5 flex flex-col">
                        <span className="font-bold text-slate-800 block mb-1">Preview</span>
                        <div className="flex-1 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center h-32">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Direct URL + Media Library */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800 block">
                        2. Or paste a direct image URL
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMediaPickTarget('single');
                          setMediaLibraryOpen(true);
                        }}
                        className="h-6 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md font-bold text-[11px] flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <FolderOpen size={12} />
                        <span>Choose from Media Library</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/... or /uploads/..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary font-mono"
                    />
                  </div>

                  {/* Visual Layout Cards */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1.5">Alignment &amp; Text Wrap Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'center' as const, label: 'Center', desc: 'Centered figure' },
                        { id: 'full' as const, label: 'Full Width', desc: '100% full banner' },
                        { id: 'left' as const, label: 'Float Left', desc: 'Text wraps right' },
                        { id: 'right' as const, label: 'Float Right', desc: 'Text wraps left' },
                      ].map((al) => (
                        <button
                          key={al.id}
                          type="button"
                          onClick={() => {
                            setImageAlign(al.id);
                            if (al.id === 'full') setImageWidth('100%');
                            else if ((al.id === 'left' || al.id === 'right') && imageWidth === '100%') setImageWidth('50%');
                            else if (al.id === 'center' && imageWidth === '100%') setImageWidth('75%');
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            imageAlign === al.id
                              ? 'border-[#2b579a] bg-blue-50 ring-1 ring-[#2b579a]/30 text-[#2b579a]'
                              : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="font-bold text-xs">{al.label}</div>
                          <div className="text-[10px] text-slate-400">{al.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Width & Frame Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1.5">Image Size / Width</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['25%', '50%', '75%', '100%'] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setImageWidth(w)}
                            className={`py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition ${
                              imageWidth === w
                                ? 'bg-[#2b579a] text-white border-[#2b579a]'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1.5">Frame Style</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'card' as const, label: 'Card Shadow' },
                          { id: 'rounded' as const, label: 'Rounded' },
                          { id: 'clean' as const, label: 'Clean' },
                        ].map((fr) => (
                          <button
                            key={fr.id}
                            type="button"
                            onClick={() => setImageFrame(fr.id)}
                            className={`py-1.5 px-2 rounded-lg border font-bold text-xs cursor-pointer transition ${
                              imageFrame === fr.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            {fr.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Image Caption (Optional)</label>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder="e.g. Real-world brightness test results..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-primary"
                    />
                  </div>

                  {/* Tag Input */}
                  <div className="pt-2 border-t border-slate-100">
                    <MediaTagInput
                      tags={imageTags}
                      onChange={setImageTags}
                      required={false}
                      label="Category Tags (Optional for upload indexing)"
                      placeholder="Type a tag and press Enter (e.g., review, specs...)"
                      helperText="Used to organize uploaded images inside your Media Library."
                    />
                  </div>
                </>
              )}

              {(imageModalTab === 'gallery2' || imageModalTab === 'gallery3') && (
                <div className="space-y-3">
                  <p className="text-slate-600 text-xs">
                    {imageModalTab === 'gallery2'
                      ? 'Add 2 photos side-by-side (great for Before/After comparisons or packaging vs. product close-up).'
                      : 'Add 3 photos in a clean horizontal product gallery row.'}
                  </p>
                  {galleryItems.slice(0, imageModalTab === 'gallery2' ? 2 : 3).map((item, idx) => {
                    const slotKey = (`gallery-${idx}` as 'gallery-0' | 'gallery-1' | 'gallery-2');
                    return (
                      <div key={idx} className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-800">Photo #{idx + 1}</span>
                          <div className="flex items-center gap-1.5">
                            <label className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer">
                              <Upload size={11} />
                              <span>{isUploadingImage && uploadingSlot === slotKey ? 'Uploading...' : 'Upload'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSlotImageUpload(e, slotKey)}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setMediaPickTarget(slotKey);
                                setMediaLibraryOpen(true);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <FolderOpen size={11} />
                              <span>Media Library</span>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          {item.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.url} alt={`Slot ${idx + 1}`} className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0 bg-white" />
                          )}
                          <div className="flex-1 space-y-1.5">
                            <input
                              type="url"
                              value={item.url}
                              onChange={(e) =>
                                setGalleryItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, url: e.target.value } : it))
                                )
                              }
                              placeholder="Paste image URL or choose from Media Library..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:border-[#2b579a]"
                            />
                            <input
                              type="text"
                              value={item.caption}
                              onChange={(e) =>
                                setGalleryItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, caption: e.target.value } : it))
                                )
                              }
                              placeholder={`Optional caption under Photo #${idx + 1}...`}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#2b579a]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {imageModalTab === 'split' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">Feature Image *</span>
                      <div className="flex items-center gap-1.5">
                        <label className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer">
                          <Upload size={11} />
                          <span>{isUploadingImage && uploadingSlot === 'split' ? 'Uploading...' : 'Upload'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSlotImageUpload(e, 'split')}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaPickTarget('split');
                            setMediaLibraryOpen(true);
                          }}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <FolderOpen size={11} />
                          <span>Media Library</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {splitImageForm.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={splitImageForm.imageUrl} alt="Split preview" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white" />
                      )}
                      <input
                        type="url"
                        value={splitImageForm.imageUrl}
                        onChange={(e) => setSplitImageForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://... or choose from Media Library"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#2b579a]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Image Side</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'left' as const, label: 'Image Left' },
                          { id: 'right' as const, label: 'Image Right' },
                        ].map((sd) => (
                          <button
                            key={sd.id}
                            type="button"
                            onClick={() => setSplitImageForm((prev) => ({ ...prev, imageSide: sd.id }))}
                            className={`py-1.5 px-2 rounded-lg border font-bold text-xs cursor-pointer ${
                              splitImageForm.imageSide === sd.id
                                ? 'bg-[#2b579a] text-white border-[#2b579a]'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {sd.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Eyebrow Label</label>
                      <input
                        type="text"
                        value={splitImageForm.tag}
                        onChange={(e) => setSplitImageForm((prev) => ({ ...prev, tag: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#2b579a]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Section Title</label>
                    <input
                      type="text"
                      value={splitImageForm.title}
                      onChange={(e) => setSplitImageForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2b579a]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Feature Commentary</label>
                    <textarea
                      rows={3}
                      value={splitImageForm.desc}
                      onChange={(e) => setSplitImageForm((prev) => ({ ...prev, desc: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2b579a] resize-y"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingFigureEl(null);
                  setImageModalOpen(false);
                }}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyImageModal}
                disabled={
                  (imageModalTab === 'single' && !imageUrl.trim()) ||
                  (imageModalTab === 'split' && !splitImageForm.imageUrl.trim()) ||
                  ((imageModalTab === 'gallery2' || imageModalTab === 'gallery3') &&
                    galleryItems
                      .slice(0, imageModalTab === 'gallery2' ? 2 : 3)
                      .filter((it) => it.url.trim()).length === 0)
                }
                className="px-5 py-2 text-xs font-bold bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-300 text-white rounded-lg shadow transition cursor-pointer disabled:cursor-not-allowed"
              >
                {editingFigureEl
                  ? 'Update Image'
                  : imageModalTab === 'gallery2'
                  ? 'Insert 2-Image Grid'
                  : imageModalTab === 'gallery3'
                  ? 'Insert 3-Image Gallery'
                  : imageModalTab === 'split'
                  ? 'Insert Image + Text Card'
                  : 'Insert Image'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INSERT / EDIT HYPERLINK & AFFILIATE LINK
         ========================================================================= */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2b579a]">
                  <LinkIcon size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Insert Hyperlink</h3>
                  <p className="text-[11px] text-slate-500">Quick shortcut: Select text and press <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-200 font-bold">Ctrl+K</kbd></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Destination URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com/affiliate-deal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2b579a] font-mono text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Display Text (Anchor Text)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Check exclusive discount price at official store"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#2b579a] text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave blank to display the raw URL.</p>
              </div>

              {/* Advanced SEO & Affiliate Options */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={linkTargetBlank}
                    onChange={(e) => setLinkTargetBlank(e.target.checked)}
                    className="rounded text-[#2b579a] focus:ring-[#2b579a]"
                  />
                  <span className="font-medium">Open in new tab (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">target="_blank"</code>)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={linkSponsored}
                    onChange={(e) => setLinkSponsored(e.target.checked)}
                    className="rounded text-[#2b579a] focus:ring-[#2b579a]"
                  />
                  <span className="font-medium">Affiliate / Sponsored attribute (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">rel="nofollow sponsored"</code>)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-[#2b579a] hover:bg-[#1f4277] disabled:bg-slate-300 text-white rounded-lg transition cursor-pointer shadow-xs"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD NEW COMPONENT / SECTION
         ========================================================================= */}
      {addCompModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-fadeIn max-h-[92vh] flex flex-col transition-all duration-200 ${
            selectedTemplateForParams ? 'max-w-6xl w-[96vw]' : 'max-w-3xl w-full'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              {selectedTemplateForParams ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateForParams(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Back to template list"
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <div className="h-5 w-px bg-slate-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Settings size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>Configure Parameters: {selectedTemplateForParams.name}</span>
                        {selectedTemplateForParams.badge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {selectedTemplateForParams.badge}
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500">Customize pricing, promo codes, headings, or copy before inserting into the article.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <LayoutTemplate size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Editorial &amp; Affiliate Component Library</h3>
                    <p className="text-xs text-slate-500">Insert pre-designed SEO-ready content blocks with 1 click or customize their parameters.</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateForParams(null);
                  setAddCompModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content view depending on selectedTemplateForParams */}
            {selectedTemplateForParams ? (
              /* ================= PARAMETER FORM & TRUE DIMENSION PREVIEW VIEW ================= */
              <div className="flex flex-col lg:flex-row gap-5 overflow-hidden flex-1 min-h-0">
                {/* Left Column: Parameter Fields */}
                <div className="w-full lg:w-[400px] shrink-0 space-y-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 overflow-y-auto max-h-[540px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>⚙️</span> Block Parameters
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Instant live preview</span>
                  </div>

                  <div className="space-y-3">
                    {getTemplateParamFields(selectedTemplateForParams.id).map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={templateParams[field.key] ?? ''}
                            onChange={(e) =>
                              setTemplateParams({
                                ...templateParams,
                                [field.key]: e.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 font-sans resize-y leading-relaxed shadow-2xs"
                          />
                        ) : field.type === 'url' ? (
                          <input
                            type="url"
                            value={templateParams[field.key] ?? ''}
                            onChange={(e) =>
                              setTemplateParams({
                                ...templateParams,
                                [field.key]: e.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 font-mono shadow-2xs"
                          />
                        ) : (
                          <input
                            type="text"
                            value={templateParams[field.key] ?? ''}
                            onChange={(e) =>
                              setTemplateParams({
                                ...templateParams,
                                [field.key]: e.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600 font-sans shadow-2xs"
                          />
                        )}
                        {field.help && <p className="text-[10px] text-slate-400">{field.help}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: True Dimension Live Preview */}
                <div className="flex-1 min-w-0 flex flex-col space-y-2 bg-slate-100/70 p-4 rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>👁️</span> True-Dimension Live Preview
                      </span>
                      <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Realtime
                      </span>
                    </div>

                    {/* Device Switcher */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs">
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewDevice('desktop')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          templatePreviewDevice === 'desktop'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Preview at Desktop article width (780px)"
                      >
                        <Monitor size={13} />
                        <span>Desktop (780px)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewDevice('mobile')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          templatePreviewDevice === 'mobile'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Preview at Mobile viewport width (375px)"
                      >
                        <Smartphone size={13} />
                        <span>Mobile (375px)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplatePreviewDevice('full')}
                        className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                          templatePreviewDevice === 'full'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Full width 100%"
                      >
                        <span>100%</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Canvas */}
                  <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-200/50 p-4 rounded-xl border border-slate-200 max-h-[500px] flex justify-center items-start">
                    <div
                      className={`transition-all duration-200 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 ${
                        templatePreviewDevice === 'desktop'
                          ? 'w-full max-w-[780px]'
                          : templatePreviewDevice === 'mobile'
                          ? 'w-[375px] max-w-full'
                          : 'w-full'
                      }`}
                    >
                      <div
                        dangerouslySetInnerHTML={{
                          __html: buildTemplateHTML(selectedTemplateForParams.id, templateParams),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ================= TEMPLATE CATALOG VIEW ================= */
              <>
                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {['all', 'Article Structure', 'Deals & Promos', 'Reviews & Comparisons', 'Images & Media'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTemplateCategory(cat)}
                        className={`h-7 px-3 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                          templateCategory === cat
                            ? 'bg-brand-primary text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat === 'all' ? 'All Templates' : cat}
                      </button>
                    ))}
                  </div>

                  <div className="relative shrink-0 sm:w-60">
                    <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search component templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Component Cards Grid */}
                <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {COMPONENT_TEMPLATES.filter((tpl) => {
                      const matchCat = templateCategory === 'all' || tpl.category === templateCategory;
                      const matchSearch =
                        !templateSearch.trim() ||
                        tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                        tpl.description.toLowerCase().includes(templateSearch.toLowerCase());
                      return matchCat && matchSearch;
                    }).map((tpl) => (
                      <div
                        key={tpl.id}
                        className="border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 transition bg-white hover:shadow-md flex flex-col justify-between gap-3 group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {tpl.category}
                            </span>
                            {tpl.badge && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {tpl.badge}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                            {tpl.name}
                          </h4>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {tpl.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTemplateForParams(tpl);
                              setTemplateParams(getDefaultParamsForTemplate(tpl.id));
                            }}
                            className="h-8 px-3.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs whitespace-nowrap"
                            title="Customize parameters for this component before inserting"
                          >
                            <Settings size={13} />
                            <span>Customize</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => insertTemplate(tpl.html)}
                            className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                            title="Quickly insert with default sample content"
                          >
                            <PlusCircle size={13} />
                            <span>Quick Insert</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 shrink-0">
              {selectedTemplateForParams ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplateParams(getDefaultParamsForTemplate(selectedTemplateForParams.id))
                    }
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer flex items-center gap-1"
                  >
                    <span>↺ Reset to Defaults</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateForParams(null)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const finalHTML = buildTemplateHTML(
                          selectedTemplateForParams.id,
                          templateParams
                        );
                        insertTemplate(finalHTML);
                        setSelectedTemplateForParams(null);
                      }}
                      className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                    >
                      <PlusCircle size={14} />
                      <span>Apply &amp; Insert into Article</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button
                    type="button"
                    onClick={() => setAddCompModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: INSERT DATA TABLE (MICROSOFT WORD TABLE BUILDER)
         ========================================================================= */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Table size={16} className="text-[#2b579a]" />
                <span>Insert Table Grid</span>
              </h3>
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rows</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-sm focus:outline-none focus:border-[#2b579a]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Columns</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 text-sm focus:outline-none focus:border-[#2b579a]"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">Quick table presets:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTableRows(3);
                      setTableCols(2);
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      tableRows === 3 && tableCols === 2 ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    3 × 2 cells
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTableRows(4);
                      setTableCols(3);
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      tableRows === 4 && tableCols === 3 ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    4 × 3 cells
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTableRows(5);
                      setTableCols(4);
                    }}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      tableRows === 5 && tableCols === 4 ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    5 × 4 cells
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleInsertTable(tableRows, tableCols)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#2b579a] hover:bg-[#204477] rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Table size={13} />
                <span>Insert Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SHARED CENTRALIZED MEDIA LIBRARY
         ========================================================================= */}
      <MediaLibraryModal
        isOpen={mediaLibraryOpen}
        onClose={() => {
          setMediaLibraryOpen(false);
          if (mediaPickTarget === 'replace-active') setMediaPickTarget('direct');
        }}
        onSelect={(selectedUrl) => {
          if (mediaPickTarget === 'replace-active' && activeComp && isFigureComponent(activeComp)) {
            const imgEl = activeComp.querySelector('img');
            if (imgEl) {
              imgEl.setAttribute('src', selectedUrl);
              handleInput();
              toastCtx?.toast.success('Replaced image cleanly!');
            }
            setMediaPickTarget('direct');
            setMediaLibraryOpen(false);
          } else if (imageModalOpen || mediaPickTarget !== 'direct') {
            const slotTarget = mediaPickTarget === 'direct' ? 'single' : mediaPickTarget;
            if (slotTarget === 'single' || slotTarget === 'split' || slotTarget.startsWith('gallery-')) {
              applyUploadedSlotUrl(
                slotTarget as 'single' | 'gallery-0' | 'gallery-1' | 'gallery-2' | 'split',
                selectedUrl
              );
            }
            setMediaPickTarget('single');
            setMediaLibraryOpen(false);
          } else {
            insertImageHTML(selectedUrl, 'Product illustration');
            setMediaLibraryOpen(false);
          }
        }}
        defaultFolder="articles"
      />

      {/* =========================================================================
          MODAL: FULL LIVE WEBSITE PREVIEW
         ========================================================================= */}
      {fullPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col p-2 sm:p-4 animate-fadeIn">
          {/* Top Bar with Device Switchers & Close */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-white shrink-0 mb-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Eye size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Live Website Preview</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Client View
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Rendered accurately as readers see it on the live website</p>
              </div>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setFullPreviewDevice('desktop')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  fullPreviewDevice === 'desktop'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop viewport (1100px)"
              >
                <Monitor size={14} />
                <span className="hidden sm:inline">Desktop (1100px)</span>
              </button>
              <button
                type="button"
                onClick={() => setFullPreviewDevice('tablet')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  fullPreviewDevice === 'tablet'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tablet viewport (768px)"
              >
                <Tablet size={14} />
                <span className="hidden sm:inline">Tablet (768px)</span>
              </button>
              <button
                type="button"
                onClick={() => setFullPreviewDevice('mobile')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  fullPreviewDevice === 'mobile'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile viewport (375px)"
              >
                <Smartphone size={14} />
                <span className="hidden sm:inline">Mobile (375px)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFullPreviewOpen(false)}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              title="Close preview window"
            >
              <X size={20} />
            </button>
          </div>

          {/* Device Mockup Canvas */}
          <div className="flex-1 overflow-y-auto overflow-x-auto flex justify-center items-start p-2 sm:p-6 bg-slate-950/40 rounded-2xl border border-slate-800/60">
            <div
              className={`transition-all duration-300 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200/90 my-auto ${
                fullPreviewDevice === 'desktop'
                  ? 'w-full max-w-[1100px]'
                  : fullPreviewDevice === 'tablet'
                  ? 'w-[768px] max-w-full'
                  : 'w-[375px] max-w-full border-4 border-slate-800'
              }`}
            >
              {/* Browser Mockup Chrome Header */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-400 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                  <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1 text-[11px] text-slate-500 font-mono flex items-center gap-1.5 truncate">
                  <span className="text-emerald-600 font-bold">🔒</span>
                  <span>https://{SITE_DOMAIN}/preview-draft</span>
                </div>
              </div>

              {/* Rendered HTML Content */}
              <div className="p-6 sm:p-10 md:p-12 min-h-[500px]">
                <div
                  className="word-studio-canvas word-studio-preview prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-p:my-3 prose-p:leading-relaxed prose-a:text-[#2b579a] prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-[#2b579a] prose-blockquote:italic prose-blockquote:pl-4 prose-blockquote:my-4 prose-img:rounded-xl prose-ul:list-disc prose-ol:list-decimal"
                  dangerouslySetInnerHTML={{ __html: value || editorRef.current?.innerHTML || '<p class="text-slate-400 italic">No content drafted yet...</p>' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLOATING DRAG-TO-MOVE GHOST PREVIEW FOLLOWING CURSOR
         ========================================================================= */}
      {dragMoveState && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-950/90 text-white rounded-xl p-2 shadow-2xl border border-[#2b579a] flex items-center gap-2.5 backdrop-blur-md"
          style={{
            left: `${dragMoveState.ghostX + 14}px`,
            top: `${dragMoveState.ghostY + 14}px`,
          }}
        >
          {dragMoveState.thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dragMoveState.thumbSrc}
              alt="Dragging"
              className="w-10 h-10 rounded-lg object-cover border border-white/20 shrink-0 bg-white"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#2b579a] flex items-center justify-center shrink-0">
              <Move size={14} className="text-white" />
            </div>
          )}
          <div className="pr-1">
            <div className="text-[11px] font-bold text-white leading-tight truncate max-w-[160px]">
              {dragMoveState.label}
            </div>
            <div className="text-[10px] font-semibold text-blue-300 leading-tight mt-0.5">
              {dragMoveState.zone === 'left'
                ? 'Drop Left • Text Wraps Right'
                : dragMoveState.zone === 'right'
                ? 'Drop Right • Text Wraps Left'
                : 'Drop here • Center'}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
