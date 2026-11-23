/**
 * Universal Smart Clipboard Paste Converter for RichTextEditor.
 * Compatible with ChatGPT, Claude, DeepSeek, Gemini, Qwen, Perplexity, Grok, Copilot,
 * Notion, Google Docs, and Microsoft Word.
 *
 * Handles:
 * 1. Markdown copied via AI "Copy" button (headings, bold, italic, strikethrough, nested lists,
 *    task lists, Unicode bullets, blockquotes, links, auto-linked URLs, code blocks, inline code,
 *    tables, dividers, images).
 * 2. Rich HTML selected & copied from AI web UIs / Docs — stripping dark-mode backgrounds,
 *    noisy styles, "Copy code" / "Download" / "Use code with caution." UI chrome, <think> blocks,
 *    Google redirect wrappers, and AI utm_source tracking parameters.
 */

import { buildVideoEmbedHtml, parseVideoEmbed } from './videoEmbed';

const ALLOWED_LINK_PROTOCOLS = /^(https?:\/\/|\/|#|mailto:)/i;

const AI_UTM_SOURCES = new Set([
  'chatgpt.com',
  'chatgpt',
  'openai',
  'claude',
  'claude.ai',
  'anthropic',
  'deepseek',
  'deepseek.com',
  'gemini',
  'gemini.google.com',
  'qwen',
  'qwen.ai',
  'perplexity',
  'perplexity.ai',
  'grok',
  'copilot',
]);

const AI_UI_CHROME_TEXTS = new Set([
  'copy code',
  'copy',
  'copied',
  'copied!',
  'download',
  'use code with caution.',
  'use code with caution',
  'show code',
  'hide code',
  'wrap',
  'unwrap',
  'run',
  'edit',
]);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

function isLikelyImageUrl(url: string): boolean {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return false;
  if (/\.(?:jpe?g|png|webp|gif|avif|svg)(?:[?#]|$)/i.test(clean)) return true;
  if (
    /^https?:\/\/(?:images\.openai\.com|[^/]*oaiusercontent\.com|images\.unsplash\.com|i\.imgur\.com|lh[0-9]\.googleusercontent\.com|[^/]*alicdn\.com\/.*\.(?:jpg|png|webp))/i.test(
      clean
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Unwraps Google/Gemini redirect URLs (https://www.google.com/url?q=...)
 * and strips AI tracking parameters (?utm_source=chatgpt.com, perplexity, etc.).
 */
function cleanExternalUrl(url: string): string {
  let current = url.trim();
  try {
    const parsed = new URL(current);
    // Unwrap Google / Gemini redirect wrapper
    if (
      (parsed.hostname === 'www.google.com' || parsed.hostname === 'google.com') &&
      parsed.pathname === '/url'
    ) {
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) {
        current = target;
      }
    }
    const finalUrl = new URL(current);
    const utmSource = (finalUrl.searchParams.get('utm_source') || '').toLowerCase();
    if (AI_UTM_SOURCES.has(utmSource)) {
      finalUrl.searchParams.delete('utm_source');
    }
    return finalUrl.toString();
  } catch {
    return current.replace(
      /([?&])utm_source=(?:chatgpt\.com|perplexity|deepseek|gemini|qwen|claude|grok)(&?)/gi,
      (_m, p1: string, p2: string) => (p1 === '?' && p2 ? '?' : p2 ? p1 : '')
    );
  }
}

function buildCleanImageFigure(src: string, caption: string): string {
  const cleanSrc = escapeAttr(src.trim());
  const cleanAlt = escapeAttr(caption.trim() || 'Article image');
  const figcaption = caption.trim()
    ? `<figcaption style="text-align: center; font-size: 12px; color: #64748b; margin-top: 8px; font-style: italic;">${escapeHtml(caption.trim())}</figcaption>`
    : '';
  return `<figure style="margin: 20px auto; text-align: center; max-width: 100%;"><img src="${cleanSrc}" alt="${cleanAlt}" style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 0 auto;" />${figcaption}</figure>`;
}

/**
 * Checks whether a plain-text clipboard string contains meaningful Markdown or AI-formatted syntax.
 */
export function looksLikeMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const patterns = [
    /^#{1,6}\s+\S/m, // Headings
    /\*\*[^*\n]+\*\*/, // Bold **text**
    /(^|[\s(])__[^_\n]+__(?=[\s).,!?:;]|$)/, // Bold __text__
    /^\s*[-*+•◦▪]\s+\S/m, // Bullet list (ASCII & Unicode bullets from DeepSeek/Qwen)
    /^\s*\d+\.\s+\S/m, // Numbered list or numbered section heading
    /^>\s+\S/m, // Blockquote
    /^```/m, // Fenced code block
    /!?\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)/, // Markdown link or image
    /^\|.+\|\s*\n\s*\|[\s:-]+\|/m, // Markdown table
    /^\s*(?:---|\*\*\*|___)\s*$/m, // Horizontal rule
    /`[^`\n]+`/, // Inline code
    /~~[^~\n]+~~/, // Strikethrough
    /<think>[\s\S]*?<\/think>/i, // DeepSeek / Qwen reasoning block
  ];
  return patterns.some((re) => re.test(trimmed));
}

function renderInlineMarkdown(raw: string): string {
  // Protect inline code spans first so markers inside `...` aren't formatted
  const codeSpans: string[] = [];
  let text = raw.replace(/`([^`\n]+)`/g, (_m, code: string) => {
    const idx = codeSpans.length;
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000CODE${idx}\u0000`;
  });

  // Escape raw HTML in the remaining text
  text = escapeHtml(text);

  // Inline Markdown images: ![alt](url)
  text = text.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, alt: string, url: string) => {
      const cleanUrl = url.replace(/&amp;/g, '&').trim();
      if (!ALLOWED_LINK_PROTOCOLS.test(cleanUrl) || cleanUrl.startsWith('data:')) {
        return alt;
      }
      return buildCleanImageFigure(cleanUrl, alt.replace(/&amp;/g, '&'));
    }
  );

  // Protect rendered <a> links so bare-URL linkifier doesn't double-wrap them
  const linkTokens: string[] = [];
  text = text.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, label: string, url: string) => {
      const rawUrl = url.replace(/&amp;/g, '&').trim();
      if (!ALLOWED_LINK_PROTOCOLS.test(rawUrl)) {
        return label;
      }
      const cleanUrl = /^https?:\/\//i.test(rawUrl) ? cleanExternalUrl(rawUrl) : rawUrl;
      const isExternal = /^https?:\/\//i.test(cleanUrl);
      const attrs = isExternal
        ? `href="${escapeAttr(cleanUrl)}" target="_blank" rel="noopener noreferrer"`
        : `href="${escapeAttr(cleanUrl)}"`;
      const idx = linkTokens.length;
      linkTokens.push(`<a ${attrs}>${label}</a>`);
      return `\u0000LINK${idx}\u0000`;
    }
  );

  // Auto-linkify bare https:// URLs
  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<>"')]+)/g, (_m, prefix: string, rawUrl: string) => {
    const trailing = rawUrl.match(/[.,;:!?]+$/)?.[0] || '';
    const pureUrl = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
    const cleanUrl = cleanExternalUrl(pureUrl.replace(/&amp;/g, '&'));
    const idx = linkTokens.length;
    linkTokens.push(
      `<a href="${escapeAttr(cleanUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleanUrl)}</a>`
    );
    return `${prefix}\u0000LINK${idx}\u0000${trailing}`;
  });

  // Bold + Italic: ***text***
  text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text** or __text__
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s(>])__([^_\n]+)__(?=[\s).,!?:;<]|$)/g, '$1<strong>$2</strong>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  // Italic: *text* or _text_
  text = text.replace(/(^|[\s(>])\*([^*\n]+)\*(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[\s(>])_([^_\n]+)_(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>');

  // Restore links & inline code spans
  text = text.replace(/\u0000LINK(\d+)\u0000/g, (_m, idx: string) => linkTokens[Number(idx)] ?? '');
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_m, idx: string) => codeSpans[Number(idx)] ?? '');

  return text;
}

function parseTableRow(line: string): string[] {
  const cleaned = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return cleaned.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  const cells = parseTableRow(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function buildCleanTableHtml(headers: string[], rows: string[][]): string {
  const thCells = headers
    .map(
      (h) =>
        `<th style="border: 1px solid #e2e8f0; padding: 10px 12px; background: #f8fafc; font-weight: 700; text-align: left;">${renderInlineMarkdown(h)}</th>`
    )
    .join('');
  const bodyRows = rows
    .map((cols) => {
      const tds = headers
        .map(
          (_h, idx) =>
            `<td style="border: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: top;">${renderInlineMarkdown(cols[idx] ?? '')}</td>`
        )
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

function formatListItemContent(raw: string): string {
  const taskChecked = raw.match(/^\[[xX]\]\s+(.+)$/);
  if (taskChecked) {
    return `☑ ${renderInlineMarkdown(taskChecked[1])}`;
  }
  const taskUnchecked = raw.match(/^\[\s\]\s+(.+)$/);
  if (taskUnchecked) {
    return `☐ ${renderInlineMarkdown(taskUnchecked[1])}`;
  }
  return renderInlineMarkdown(raw);
}

/**
 * Converts Markdown from ChatGPT, Claude, DeepSeek, Gemini, Qwen, Perplexity, etc.
 * into clean semantic HTML for the RichTextEditor.
 */
export function markdownToCleanHtml(markdown: string): string {
  // Strip DeepSeek / Qwen <think>...</think> reasoning blocks if accidentally copied
  const stripped = markdown.replace(/<think>[\s\S]*?<\/think>\s*/gi, '');
  const lines = stripped.replace(/\r\n?/g, '\n').split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block ```lang
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++;
      }
      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Horizontal rule
    if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
      blocks.push('<hr />');
      i++;
      continue;
    }

    // ATX Heading (# .. ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 4);
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Markdown table
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && !/^\s*$/.test(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(buildCleanTableHtml(headers, rows));
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const quoteContent = quoteLines
        .filter((l) => l.length > 0)
        .map((l) => `<p>${renderInlineMarkdown(l)}</p>`)
        .join('');
      if (quoteContent) {
        blocks.push(`<blockquote>${quoteContent}</blockquote>`);
      }
      continue;
    }

    // Unordered list (-, *, +, •, ◦, ▪) with 1-level nesting support (Claude/ChatGPT/DeepSeek)
    if (/^\s*[-*+•◦▪]\s+\S/.test(line)) {
      const baseIndent = (line.match(/^(\s*)/)?.[1] || '').length;
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+•◦▪]\s+\S/.test(lines[i])) {
        const currIndent = (lines[i].match(/^(\s*)/)?.[1] || '').length;
        const content = lines[i].replace(/^\s*[-*+•◦▪]\s+/, '').trim();
        if (currIndent >= baseIndent + 2 && items.length > 0) {
          const subItems: string[] = [];
          while (
            i < lines.length &&
            /^\s*[-*+•◦▪]\s+\S/.test(lines[i]) &&
            (lines[i].match(/^(\s*)/)?.[1] || '').length >= baseIndent + 2
          ) {
            const subContent = lines[i].replace(/^\s*[-*+•◦▪]\s+/, '').trim();
            subItems.push(`<li>${formatListItemContent(subContent)}</li>`);
            i++;
          }
          items[items.length - 1] = items[items.length - 1].replace(
            /<\/li>$/,
            `<ul>${subItems.join('')}</ul></li>`
          );
          continue;
        }
        items.push(`<li>${formatListItemContent(content)}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Standalone Markdown image ![alt](url) OR AI image link [caption](https://images.openai.com/...)
    const standaloneImgMatch = trimmed.match(/^(!?)\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (standaloneImgMatch && (standaloneImgMatch[1] === '!' || isLikelyImageUrl(standaloneImgMatch[3]))) {
      blocks.push(buildCleanImageFigure(standaloneImgMatch[3], standaloneImgMatch[2]));
      i++;
      continue;
    }

    // Ordered list (1. 2. ...) OR single numbered section heading (e.g. "1. AI là gì...")
    if (/^\s*\d+\.\s+\S/.test(line)) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const nextIsOrderedItem = /^\s*\d+\.\s+\S/.test(nextLine);
      if (!nextIsOrderedItem && trimmed.length <= 140) {
        blocks.push(`<h3>${renderInlineMarkdown(trimmed)}</h3>`);
        i++;
        continue;
      }
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+\S/.test(lines[i])) {
        const content = lines[i].replace(/^\s*\d+\.\s+/, '').trim();
        items.push(`<li>${formatListItemContent(content)}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Paragraph: collect contiguous normal lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^(?:---+|\*\*\*+|___+)$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*+•◦▪]\s+\S/.test(lines[i]) &&
      !/^\s*\d+\.\s+\S/.test(lines[i]) &&
      !(
        /^(!?)\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)$/.test(lines[i].trim()) &&
        (lines[i].trim().startsWith('!') ||
          isLikelyImageUrl(lines[i].trim().match(/\((https?:\/\/[^)\s]+)/)?.[1] || ''))
      ) &&
      !(lines[i].trim().includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      paraLines.push(renderInlineMarkdown(lines[i].trim()));
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(`<p>${paraLines.join('<br />')}</p>`);
    }
  }

  return blocks.join('\n');
}

const REMOVE_TAGS = new Set([
  'script',
  'style',
  'meta',
  'link',
  'noscript',
  'template',
  'button',
  'svg',
  'input',
  'select',
  'textarea',
  'iframe',
  'object',
  'embed',
  'think',
]);

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'hr',
  'section',
  'article',
  'header',
  'footer',
  'aside',
  'figure',
]);

function isBoldInlineStyle(el: HTMLElement): boolean {
  const fw = el.style?.fontWeight?.toLowerCase() || '';
  return fw === 'bold' || fw === 'bolder' || Number(fw) >= 600;
}

function isItalicInlineStyle(el: HTMLElement): boolean {
  return (el.style?.fontStyle?.toLowerCase() || '') === 'italic';
}

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtml(node.textContent || '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (REMOVE_TAGS.has(tag)) {
    return '';
  }

  // Strip AI code-block headers / footers ("Copy code", "Download", "Use code with caution.", etc.)
  if (tag === 'div' || tag === 'header' || tag === 'footer' || tag === 'span') {
    const txt = (el.textContent || '').trim().toLowerCase();
    if (AI_UI_CHROME_TEXTS.has(txt)) {
      return '';
    }
  }

  if (tag === 'br') return '<br />';
  if (tag === 'hr') return '<hr />';

  if (tag === 'img') {
    const src = (el.getAttribute('src') || '').trim();
    if (!src || src.startsWith('data:') || !ALLOWED_LINK_PROTOCOLS.test(src)) {
      return '';
    }
    const alt = (el.getAttribute('alt') || '').trim();
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="max-width: 100%; height: auto; border-radius: 10px;" />`;
  }

  if (tag === 'pre') {
    const codeEl = el.querySelector('code');
    const rawCode = codeEl ? codeEl.textContent || '' : el.textContent || '';
    const cleaned = rawCode.replace(/^\n+|\n+$/g, '');
    return cleaned ? `<pre><code>${escapeHtml(cleaned)}</code></pre>` : '';
  }

  const childrenHtml = Array.from(el.childNodes).map(sanitizeNode).join('');

  if (tag === 'code') {
    return childrenHtml.trim() ? `<code>${childrenHtml}</code>` : '';
  }

  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
    return childrenHtml.trim() ? `<${tag}>${childrenHtml.trim()}</${tag}>` : '';
  }
  if (tag === 'h5' || tag === 'h6') {
    return childrenHtml.trim() ? `<h4>${childrenHtml.trim()}</h4>` : '';
  }

  if (tag === 'strong' || tag === 'b') {
    return childrenHtml.trim() ? `<strong>${childrenHtml}</strong>` : '';
  }
  if (tag === 'em' || tag === 'i') {
    return childrenHtml.trim() ? `<em>${childrenHtml}</em>` : '';
  }
  if (tag === 'u') {
    return childrenHtml.trim() ? `<u>${childrenHtml}</u>` : '';
  }
  if (tag === 's' || tag === 'del' || tag === 'strike') {
    return childrenHtml.trim() ? `<del>${childrenHtml}</del>` : '';
  }

  if (tag === 'a') {
    const rawHref = (el.getAttribute('href') || '').trim();
    if (!rawHref || !ALLOWED_LINK_PROTOCOLS.test(rawHref)) {
      return childrenHtml;
    }
    const href = /^https?:\/\//i.test(rawHref) ? cleanExternalUrl(rawHref) : rawHref;
    // AI web-search image links copied as <a href="https://images.openai.com/...">Caption</a>
    if (isLikelyImageUrl(href) && !el.querySelector('img')) {
      const caption = (el.textContent || '').trim();
      return buildCleanImageFigure(href, caption);
    }
    const isExternal = /^https?:\/\//i.test(href);
    const attrs = isExternal
      ? `href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"`
      : `href="${escapeAttr(href)}"`;
    return `<a ${attrs}>${childrenHtml}</a>`;
  }

  if (tag === 'ul' || tag === 'ol' || tag === 'blockquote') {
    return childrenHtml.trim() ? `<${tag}>${childrenHtml}</${tag}>` : '';
  }
  if (tag === 'li') {
    return childrenHtml.trim() ? `<li>${childrenHtml.trim()}</li>` : '';
  }

  if (tag === 'table') {
    return childrenHtml.trim()
      ? `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">${childrenHtml}</table>`
      : '';
  }
  if (tag === 'thead' || tag === 'tbody' || tag === 'tr') {
    return childrenHtml.trim() ? `<${tag}>${childrenHtml}</${tag}>` : '';
  }
  if (tag === 'th') {
    return `<th style="border: 1px solid #e2e8f0; padding: 10px 12px; background: #f8fafc; font-weight: 700; text-align: left;">${childrenHtml.trim()}</th>`;
  }
  if (tag === 'td') {
    return `<td style="border: 1px solid #e2e8f0; padding: 10px 12px; vertical-align: top;">${childrenHtml.trim()}</td>`;
  }

  if (tag === 'p') {
    return childrenHtml.trim() ? `<p>${childrenHtml.trim()}</p>` : '';
  }

  if (tag === 'span' || tag === 'font') {
    if (!childrenHtml) return '';
    let wrapped = childrenHtml;
    if (isBoldInlineStyle(el)) wrapped = `<strong>${wrapped}</strong>`;
    if (isItalicInlineStyle(el)) wrapped = `<em>${wrapped}</em>`;
    return wrapped;
  }

  // Generic container (div, section, article, etc.)
  if (BLOCK_TAGS.has(tag)) {
    const hasBlockChild = Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()));
    if (hasBlockChild) {
      return childrenHtml;
    }
    return childrenHtml.trim() ? `<p>${childrenHtml.trim()}</p>` : '';
  }

  return childrenHtml;
}

/**
 * Cleans external rich HTML (selected & copied from ChatGPT, Claude, DeepSeek, Gemini, Qwen,
 * Perplexity, Google Docs, Notion) into clean semantic HTML without dark-mode backgrounds or noisy styles.
 */
export function sanitizeExternalHtml(rawHtml: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
  const html = Array.from(doc.body.childNodes).map(sanitizeNode).join('');
  return html.replace(/(<p>\s*(<br\s*\/?>)?\s*<\/p>)+/gi, '').trim();
}

function hasRichSemanticTags(rawHtml: string): boolean {
  return /<(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|strong|b|em|i|blockquote|a\s+href|pre|code)\b/i.test(
    rawHtml
  );
}

/**
 * Main entry point for RichTextEditor `onPaste`:
 * Returns clean formatted HTML to insert, or `null` if clipboard is simple plain text
 * (so the browser can perform normal native plain-text paste).
 */
export function convertClipboardToCleanHtml(clipboardData: DataTransfer): string | null {
  const html = clipboardData.getData('text/html') || '';
  const plain = clipboardData.getData('text/plain') || '';

  // 0. Standalone video URL or <iframe> embed (YouTube, TikTok, Vimeo, Facebook, Instagram, Loom, MP4...)
  if (plain.trim()) {
    const videoEmbed = parseVideoEmbed(plain.trim());
    if (videoEmbed) {
      return buildVideoEmbedHtml(videoEmbed);
    }
  }

  // 1. Rich HTML (selected from ChatGPT, Claude, DeepSeek, Gemini, Qwen, Google Docs, Notion)
  if (html && hasRichSemanticTags(html)) {
    const cleaned = sanitizeExternalHtml(html);
    if (cleaned) {
      return cleaned;
    }
  }

  // 2. Markdown plain text (e.g. ChatGPT / Claude / DeepSeek / Gemini / Qwen "Copy" button)
  if (plain && looksLikeMarkdown(plain)) {
    const converted = markdownToCleanHtml(plain);
    if (converted) {
      return converted;
    }
  }

  // 3. Fallback: HTML without rich tags (e.g. styled paragraphs from Docs/Word)
  if (html && /<(p|div|br)\b/i.test(html) && plain.includes('\n')) {
    const cleaned = sanitizeExternalHtml(html);
    if (cleaned) {
      return cleaned;
    }
  }

  return null;
}
