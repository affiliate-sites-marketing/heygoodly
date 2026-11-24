'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  Loader2,
  AlertTriangle,
  User,
  Pin,
  PinOff,
  Pencil,
  Square,
  FilePlus2,
  Store as StoreIcon,
  Link2,
  Paperclip,
  Search,
  X,
  Slash,
  Wrench,
  BookOpen,
  BarChart3,
  FileSearch,
  Inbox,
  ArrowUpRight,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import {
  aiService,
  type AiChatSessionSummary,
  type AiEngineStatus,
  type AiModelOption,
  type AiProviderConfigItem,
} from '@/services/aiService';
import storeService from '@/services/storeService';
import AdminSearchableSelect, { type SelectOption } from '@/components/admin/AdminSearchableSelect';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import { ROUTES } from '@/constants/routes';
import { SITE_NAME } from '@/constants/site';
import {
  AI_CHAT_PERSONAS,
  AI_CHAT_STARTER_PROMPTS,
  AI_SLASH_PROMPTS,
  AI_STORAGE_KEYS,
  AI_USAGE_GUIDE_CAPABILITIES,
  AI_USAGE_GUIDE_STEPS,
  AI_USAGE_GUIDE_TIPS,
} from '@/constants/ai';

interface ChatMsg {
  id: string;
  dbId?: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  totalTokens?: number;
}

interface StoreLite {
  id: number;
  slug: string;
  name: string;
}

/** Convert Markdown reply into clean semantic HTML for 1-click Save as Draft Post */
function markdownToDraftHtml(markdown: string): { title: string; excerpt: string; contentHtml: string } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let title = '';
  const bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!title && /^#{1,3}\s+/.test(trimmed)) {
      title = trimmed.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').trim();
      continue;
    }
    bodyLines.push(lines[i]);
  }
  if (!title) {
    const firstNonEmpty = lines.find((l) => l.trim().length > 0)?.trim() || 'AI Draft Article';
    title = firstNonEmpty.replace(/\*\*/g, '').slice(0, 110);
  }

  const inlineFmt = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const htmlParts: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (inList) {
      htmlParts.push(`</${inList}>`);
      inList = null;
    }
  };

  for (let i = 0; i < bodyLines.length; i++) {
    const t = bodyLines[i].trim();
    const next = i + 1 < bodyLines.length ? bodyLines[i + 1].trim() : '';

    // Markdown table -> semantic HTML table
    if (t.startsWith('|') && t.endsWith('|') && /^\|[\s:|-]+\|$/.test(next)) {
      closeList();
      const parseCells = (row: string) => row.slice(1, -1).split('|').map((c) => inlineFmt(c.trim()));
      const headers = parseCells(t);
      const rows: string[][] = [];
      i += 2;
      while (i < bodyLines.length && bodyLines[i].trim().startsWith('|') && bodyLines[i].trim().endsWith('|')) {
        rows.push(parseCells(bodyLines[i].trim()));
        i++;
      }
      i--;
      const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
      htmlParts.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    if (!t) {
      closeList();
      continue;
    }
    if (/^###\s+/.test(t)) {
      closeList();
      htmlParts.push(`<h3>${inlineFmt(t.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+/.test(t) || /^#\s+/.test(t)) {
      closeList();
      htmlParts.push(`<h2>${inlineFmt(t.replace(/^#{1,2}\s+/, ''))}</h2>`);
    } else if (/^[-*•]\s+/.test(t)) {
      if (inList !== 'ul') {
        closeList();
        htmlParts.push('<ul>');
        inList = 'ul';
      }
      htmlParts.push(`<li>${inlineFmt(t.replace(/^[-*•]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(t)) {
      if (inList !== 'ol') {
        closeList();
        htmlParts.push('<ol>');
        inList = 'ol';
      }
      htmlParts.push(`<li>${inlineFmt(t.replace(/^\d+\.\s+/, ''))}</li>`);
    } else {
      closeList();
      htmlParts.push(`<p>${inlineFmt(t)}</p>`);
    }
  }
  closeList();

  const contentHtml = htmlParts.join('\n');
  const plainText = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const excerpt = plainText.length > 200 ? `${plainText.slice(0, 197)}...` : plainText;
  return { title, excerpt, contentHtml };
}

/** Lightweight safe Markdown block renderer */
function MarkdownMessage({ content }: { content: string }) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const segments = useMemo(() => {
    const parts: Array<{ type: 'text' | 'code'; lang?: string; body: string }> = [];
    const regex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', body: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', lang: match[1] || 'text', body: match[2].replace(/\n$/, '') });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'text', body: content.slice(lastIndex) });
    }
    return parts;
  }, [content]);

  const renderInline = (line: string) => {
    const tokens = line.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g);
    return tokens.map((tok, i) => {
      const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isInternal = href.startsWith('/');
        if (isInternal) {
          return (
            <Link
              key={i}
              href={href}
              className="inline-flex items-center gap-0.5 font-bold text-brand-primary underline decoration-brand-primary/40 hover:decoration-brand-primary transition"
            >
              <span>{label}</span>
              <ArrowUpRight size={11} />
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-bold text-indigo-600 underline hover:text-indigo-800 transition"
          >
            <span>{label}</span>
            <ArrowUpRight size={11} />
          </a>
        );
      }
      if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 text-indigo-700 font-mono text-[12px]"
          >
            {tok.slice(1, -1)}
          </code>
        );
      }
      if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {tok.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{tok}</span>;
    });
  };

  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-slate-800 break-words">
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return (
            <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 text-slate-100 my-2">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                <span>{seg.lang}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(seg.body);
                    setCopiedCodeIdx(idx);
                    setTimeout(() => setCopiedCodeIdx(null), 1500);
                  }}
                  className="inline-flex items-center gap-1 hover:text-white transition cursor-pointer"
                >
                  {copiedCodeIdx === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCodeIdx === idx ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs font-mono leading-relaxed">
                <code>{seg.body}</code>
              </pre>
            </div>
          );
        }

        const lines = seg.body.split('\n');
        const blocks: Array<{ type: 'table'; rows: string[][] } | { type: 'line'; text: string }> = [];
        let i = 0;
        while (i < lines.length) {
          const cur = lines[i].trim();
          const next = i + 1 < lines.length ? lines[i + 1].trim() : '';
          if (cur.startsWith('|') && cur.endsWith('|') && /^\|[\s:|-]+\|$/.test(next)) {
            const rows: string[][] = [];
            const parseRow = (r: string) =>
              r
                .slice(1, -1)
                .split('|')
                .map((c) => c.trim());
            rows.push(parseRow(cur));
            i += 2; // skip separator
            while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
              rows.push(parseRow(lines[i].trim()));
              i++;
            }
            blocks.push({ type: 'table', rows });
          } else {
            blocks.push({ type: 'line', text: lines[i] });
            i++;
          }
        }

        return (
          <div key={idx} className="space-y-1.5">
            {blocks.map((block, lineIdx) => {
              if (block.type === 'table') {
                const [header, ...bodyRows] = block.rows;
                return (
                  <div key={lineIdx} className="my-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200">
                          {header.map((cell, ci) => (
                            <th key={ci} className="px-3 py-2 font-black text-slate-700 whitespace-nowrap">
                              {renderInline(cell)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bodyRows.map((row, ri) => (
                          <tr key={ri} className="hover:bg-slate-50/70">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-slate-700 align-top">
                                {renderInline(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              const line = block.text;
              const trimmed = line.trim();
              if (!trimmed) return <div key={lineIdx} className="h-1" />;
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lineIdx} className="text-sm font-black text-slate-900 pt-2">
                    {renderInline(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} className="text-[15px] font-black text-slate-900 pt-2.5">
                    {renderInline(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={lineIdx} className="text-base font-black text-slate-900 pt-2.5">
                    {renderInline(trimmed.slice(2))}
                  </h2>
                );
              }
              if (/^[-*•]\s+/.test(trimmed)) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-brand-primary font-black mt-0.5">•</span>
                    <div className="flex-1">{renderInline(trimmed.replace(/^[-*•]\s+/, ''))}</div>
                  </div>
                );
              }
              if (/^\d+\.\s+/.test(trimmed)) {
                const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
                if (numMatch) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-2 pl-1">
                      <span className="text-slate-500 font-bold text-xs mt-0.5 min-w-[18px]">{numMatch[1]}</span>
                      <div className="flex-1">{renderInline(numMatch[2])}</div>
                    </div>
                  );
                }
              }
              return <p key={lineIdx}>{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminAiChatPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useAdminI18n();

  // Sessions & messages
  const [sessions, setSessions] = useState<AiChatSessionSummary[]>([]);
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Composer & streaming
  const [input, setInput] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraftText, setEditDraftText] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Model / Config / Persona
  const [status, setStatus] = useState<AiEngineStatus | null>(null);
  const [savedConfigs, setSavedConfigs] = useState<AiProviderConfigItem[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [liveModels, setLiveModels] = useState<AiModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedPersona, setSelectedPersona] = useState<string>('general');
  const [enableTools, setEnableTools] = useState<boolean>(true);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [createMode, setCreateMode] = useState<'review' | 'news'>('review');
  const [createStoreSlug, setCreateStoreSlug] = useState<string>('');
  const [createTopic, setCreateTopic] = useState<string>('');
  const [createSourceUrl, setCreateSourceUrl] = useState<string>('');
  const [createLanguage, setCreateLanguage] = useState<string>('Vietnamese');
  const [createWordCount, setCreateWordCount] = useState<number>(1100);
  const [creatingPost, setCreatingPost] = useState<boolean>(false);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);

  // Context attachments (@Store, URL, File / Image)
  const [stores, setStores] = useState<StoreLite[]>([]);
  const [showStorePicker, setShowStorePicker] = useState<boolean>(false);
  const [attachedStoreSlug, setAttachedStoreSlug] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [attachedUrl, setAttachedUrl] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [attachedFileText, setAttachedFileText] = useState<string>('');
  const [attachedImageDataUrl, setAttachedImageDataUrl] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchModelsForConfig = async (configIdStr: string) => {
    setLoadingModels(true);
    try {
      const list = await aiService.listModels({
        configId: configIdStr ? Number(configIdStr) : undefined,
      });
      setLiveModels(list);
    } catch {
      setLiveModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    aiService.getStatus().then((st) => setStatus(st)).catch(() => {});
    aiService.listConfigs().then((list) => {
      setSavedConfigs(list);
      const def = list.find((c) => c.isDefault) || list[0];
      if (def) {
        setSelectedConfigId(String(def.id));
        setSelectedModel(def.model || '');
        fetchModelsForConfig(String(def.id));
      } else {
        fetchModelsForConfig('');
      }
    }).catch(() => {});
    aiService.listChatSessions().then((list) => {
      setSessions(list);
      if (typeof window !== 'undefined' && list.length > 0) {
        const lastId = Number(window.sessionStorage.getItem(AI_STORAGE_KEYS.ACTIVE_SESSION_ID) || '0');
        const target = list.find((s) => s.id === lastId);
        if (target) handleOpenSession(target);
      }
    }).catch(() => {});
    storeService.getAdminStores({ page: 0, size: 100 }).then((res: any) => {
      const items = res?.content || res?.data?.content || [];
      setStores(items.map((s: any) => ({ id: Number(s.id), slug: s.slug, name: s.name })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const filteredSessions = useMemo(() => {
    const q = sessionSearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.model || '').toLowerCase().includes(q)
    );
  }, [sessions, sessionSearch]);

  const slashMatches = useMemo(() => {
    if (!input.startsWith('/')) return [];
    const token = input.split(/\s+/)[0].toLowerCase();
    if (input.includes(' ')) return [];
    return AI_SLASH_PROMPTS.filter(
      (p) => p.command.startsWith(token) || p.label.toLowerCase().includes(token.slice(1))
    );
  }, [input]);

  const sessionTotalTokens = useMemo(
    () => messages.reduce((sum, m) => sum + (m.totalTokens || 0), 0),
    [messages]
  );

  const handleSelectConfig = (nextConfigId: string) => {
    setSelectedConfigId(nextConfigId);
    const matched = savedConfigs.find((c) => String(c.id) === nextConfigId);
    setSelectedModel(matched?.model || '');
    fetchModelsForConfig(nextConfigId);
  };

  const handleSelectPersona = async (nextPersona: string) => {
    setSelectedPersona(nextPersona);
    if (activeSessionId) {
      try {
        await aiService.updateChatSession(activeSessionId, { persona: nextPersona });
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, persona: nextPersona } : s))
        );
      } catch {
        // non-blocking
      }
    }
  };

  const handleOpenSession = async (session: AiChatSessionSummary) => {
    setActiveSessionId(session.id);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(AI_STORAGE_KEYS.ACTIVE_SESSION_ID, String(session.id));
    }
    if (session.configId) {
      setSelectedConfigId(String(session.configId));
      fetchModelsForConfig(String(session.configId));
    }
    if (session.model) setSelectedModel(session.model);
    setSelectedPersona(session.persona || 'general');
    setLoadingMessages(true);
    try {
      const rows = await aiService.getChatSessionMessages(session.id);
      setMessages(
        rows.map((r) => ({
          id: `db-${r.id}`,
          dbId: r.id,
          role: r.role,
          content: r.content,
          provider: r.provider,
          model: r.model,
          latencyMs: r.latencyMs,
          totalTokens: r.totalTokens,
        }))
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    abortControllerRef.current?.abort();
    setActiveSessionId(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(AI_STORAGE_KEYS.ACTIVE_SESSION_ID);
    }
    setMessages([]);
    setInput('');
    setAttachedStoreSlug('');
    setAttachedUrl('');
    setAttachedFileName('');
    setAttachedFileText('');
    setAttachedImageDataUrl('');
    textareaRef.current?.focus();
  };

  const handleTogglePin = async (session: AiChatSessionSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.updateChatSession(session.id, { isPinned: !session.isPinned });
      const updated = await aiService.listChatSessions();
      setSessions(updated);
    } catch {
      toast.error('Failed to update pin status.');
    }
  };

  const handleStartRename = (session: AiChatSessionSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(session.id);
    setRenameText(session.title);
  };

  const handleSaveRename = async (sessionId: number) => {
    const clean = renameText.trim();
    setRenamingSessionId(null);
    if (!clean) return;
    try {
      await aiService.updateChatSession(sessionId, { title: clean });
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: clean } : s)));
    } catch {
      toast.error('Failed to rename chat.');
    }
  };

  const handleDeleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteChatSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) handleNewChat();
      toast.success(t('Chat deleted.'));
    } catch {
      toast.error(t('Failed to delete chat.'));
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('File must be smaller than 4MB.');
      return;
    }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImageDataUrl(String(reader.result || ''));
        setAttachedFileName(file.name);
        setAttachedFileText('');
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedFileText(String(reader.result || ''));
        setAttachedFileName(file.name);
        setAttachedImageDataUrl('');
      };
      reader.readAsText(file);
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setSending(false);
      toast.info(t('Generation stopped.'));
    }
  };

  const runStreamedTurn = async (
    nextMessages: ChatMsg[],
    options: {
      latestPrompt: string;
      regenerate?: boolean;
      editFromMessageId?: number;
      storeSlug?: string;
      sourceUrl?: string;
      attachmentName?: string;
      attachmentText?: string;
      imageDataUrl?: string;
    }
  ) => {
    setSending(true);
    const streamMsgId = `stream-${Date.now()}`;
    const placeholderAssistant: ChatMsg = {
      id: streamMsgId,
      role: 'assistant',
      content: '',
      model: selectedModel || undefined,
    };
    setMessages([...nextMessages, placeholderAssistant]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await aiService.streamChat(
        {
          sessionId: activeSessionId ?? undefined,
          message: options.latestPrompt,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          configId: selectedConfigId ? Number(selectedConfigId) : undefined,
          model: selectedModel.trim() || undefined,
          persona: selectedPersona,
          storeSlug: options.storeSlug || undefined,
          sourceUrl: options.sourceUrl || undefined,
          attachmentName: options.attachmentName || undefined,
          attachmentText: options.attachmentText || undefined,
          imageDataUrl: options.imageDataUrl || undefined,
          editFromMessageId: options.editFromMessageId,
          regenerate: options.regenerate,
          enableTools,
        },
        {
          signal: controller.signal,
          onChunk: (delta) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamMsgId ? { ...m, content: m.content + delta } : m
              )
            );
          },
          onDone: (res) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamMsgId
                  ? {
                      ...m,
                      id: res.assistantMessageId ? `db-${res.assistantMessageId}` : streamMsgId,
                      dbId: res.assistantMessageId,
                      content: res.reply || m.content,
                      model: res.model,
                      provider: res.provider,
                      latencyMs: res.latencyMs,
                      totalTokens: res.totalTokens,
                    }
                  : m
              )
            );
            if (res.sessionId) {
              setActiveSessionId(res.sessionId);
              if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(AI_STORAGE_KEYS.ACTIVE_SESSION_ID, String(res.sessionId));
              }
              aiService.listChatSessions().then((list) => setSessions(list)).catch(() => {});
            }
          },
          onError: (errMsg) => {
            toast.error(errMsg);
            setMessages((prev) => prev.filter((m) => m.id !== streamMsgId || m.content.trim().length > 0));
          },
        }
      );
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        const msg = err?.message || 'AI request failed.';
        toast.error(msg);
        setMessages((prev) => prev.filter((m) => m.id !== streamMsgId || m.content.trim().length > 0));
      }
    } finally {
      abortControllerRef.current = null;
      setSending(false);
    }
  };

  const handleSend = async (promptOverride?: string) => {
    const text = (promptOverride ?? input).trim();
    if (!text || sending) return;

    const storeSlug = attachedStoreSlug;
    const sourceUrl = attachedUrl.trim();
    const fileName = attachedFileName;
    const fileText = attachedFileText;
    const imgUrl = attachedImageDataUrl;

    let displayContent = text;
    if (storeSlug) displayContent += `\n[Store: @${storeSlug}]`;
    if (sourceUrl) displayContent += `\n[URL: ${sourceUrl}]`;
    if (fileName) displayContent += `\n[File: ${fileName}]`;

    const userMsg: ChatMsg = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: displayContent,
    };

    const nextMessages = [...messages, userMsg];
    if (!promptOverride) setInput('');
    setAttachedUrl('');
    setShowUrlInput(false);
    setAttachedFileName('');
    setAttachedFileText('');
    setAttachedImageDataUrl('');

    await runStreamedTurn(nextMessages, {
      latestPrompt: text,
      storeSlug,
      sourceUrl,
      attachmentName: fileName,
      attachmentText: fileText,
      imageDataUrl: imgUrl,
    });
  };

  const handleRegenerate = async () => {
    if (sending || messages.length === 0) return;
    const nextMsgs = [...messages];
    if (nextMsgs[nextMsgs.length - 1].role === 'assistant') nextMsgs.pop();
    const lastUser = [...nextMsgs].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    await runStreamedTurn(nextMsgs, { latestPrompt: lastUser.content, regenerate: true });
  };

  const handleSubmitEditResend = async (msgIndex: number, targetMsg: ChatMsg) => {
    const clean = editDraftText.trim();
    if (!clean || sending) return;
    setEditingMsgId(null);
    const prior = messages.slice(0, msgIndex);
    const updatedUser: ChatMsg = { id: `msg-${Date.now()}-u`, role: 'user', content: clean };
    await runStreamedTurn([...prior, updatedUser], {
      latestPrompt: clean,
      editFromMessageId: targetMsg.dbId,
    });
  };

  const handleGenerateAndReviewPost = async () => {
    if (creatingPost) return;
    if (createMode === 'review' && !createStoreSlug && !createTopic.trim()) {
      toast.error(t('Please select a Store or enter a topic first.'));
      return;
    }
    if (createMode === 'news' && !createTopic.trim() && !createSourceUrl.trim()) {
      toast.error(t('Please enter a topic or reference URL first.'));
      return;
    }
    setCreatingPost(true);
    try {
      const generated = await aiService.generatePost({
        mode: createMode,
        storeSlug: createMode === 'review' ? createStoreSlug || undefined : undefined,
        sourceUrl: createSourceUrl.trim() || undefined,
        topic: createTopic.trim() || undefined,
        language: createLanguage,
        configId: selectedConfigId ? Number(selectedConfigId) : undefined,
        model: selectedModel.trim() || undefined,
        wordCount: createWordCount,
      });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          AI_STORAGE_KEYS.DRAFT_IMPORT,
          JSON.stringify({
            title: generated.title,
            slug: generated.slug,
            excerpt: generated.excerpt,
            contentHtml: generated.contentHtml,
            imageUrl: generated.imageUrl || '',
            categoryId: generated.categoryId,
            categoryName: generated.categoryName || '',
            rating: generated.rating || '',
            ctaText: generated.ctaText || '',
            brandDescription: generated.brandDescription || '',
            storeSlug: generated.storeSlug || createStoreSlug || '',
            storeName: generated.storeName || stores.find((s) => s.slug === createStoreSlug)?.name || '',
            tags: generated.tags || [],
            readTime: generated.readTime || '5 min read',
          })
        );
      }
      setShowCreatePostModal(false);
      toast.success(t('Article generated! Opening Post Editor for your review...'));
      router.push(`${ROUTES.ADMIN.POST_CREATE}?fromAiChat=1`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || t('Failed to generate article.'));
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDraftPostInChat = () => {
    const storeObj = stores.find((s) => s.slug === createStoreSlug);
    if (createMode === 'review' && !createStoreSlug && !createTopic.trim()) {
      toast.error(t('Please select a Store or enter a topic first.'));
      return;
    }
    if (createMode === 'news' && !createTopic.trim() && !createSourceUrl.trim()) {
      toast.error(t('Please enter a topic or reference URL first.'));
      return;
    }
    if (createMode === 'review' && createStoreSlug) {
      setAttachedStoreSlug(createStoreSlug);
    }
    if (createSourceUrl.trim()) {
      setAttachedUrl(createSourceUrl.trim());
    }
    const langLabel = createLanguage === 'Vietnamese' ? 'tiếng Việt' : 'English';
    const prompt =
      createMode === 'review'
        ? `Viết 1 bài review chuẩn SEO khoảng ${createWordCount} từ bằng ${langLabel}${storeObj ? ` cho thương hiệu ${storeObj.name}` : ''}${createTopic.trim() ? ` với trọng tâm: ${createTopic.trim()}` : ''}. Bắt buộc có tiêu đề hấp dẫn, tóm tắt đánh giá, bảng Ưu & Nhược điểm, hướng dẫn chọn mua và 5 câu hỏi FAQ.`
        : `Viết 1 bài tin tức/blog chuẩn SEO khoảng ${createWordCount} từ bằng ${langLabel}${createTopic.trim() ? ` về chủ đề: ${createTopic.trim()}` : ''}. Có mở bài súc tích, mục Điểm nổi bật (Key Takeaways), phân tích chi tiết và kết luận cho người mua.`;
    setShowCreatePostModal(false);
    handleSend(prompt);
  };

  const handleSaveAsDraftPost = (msg: ChatMsg) => {
    const parsed = markdownToDraftHtml(msg.content);
    const matchedStore = stores.find((s) => s.slug === attachedStoreSlug);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        AI_STORAGE_KEYS.DRAFT_IMPORT,
        JSON.stringify({
          title: parsed.title,
          excerpt: parsed.excerpt,
          contentHtml: parsed.contentHtml,
          storeId: matchedStore ? String(matchedStore.id) : '',
          storeSlug: matchedStore?.slug || '',
          storeName: matchedStore?.name || '',
        })
      );
    }
    toast.success(t('Draft imported to Post Editor!'));
    router.push(`${ROUTES.ADMIN.POST_CREATE}?fromAiChat=1`);
  };

  const handleCopy = (msg: ChatMsg) => {
    navigator.clipboard?.writeText(msg.content);
    setCopiedMsgId(msg.id);
    toast.success(t('Copied response!'));
    setTimeout(() => setCopiedMsgId(null), 1500);
  };

  const activeCfg = savedConfigs.find((c) => String(c.id) === selectedConfigId) || null;
  const activeModelDisplay = selectedModel || activeCfg?.model || status?.model || 'Default';
  const activeProviderDisplay = activeCfg?.provider || status?.provider || 'spring-ai';

  return (
    <div className="h-[calc(100vh-5.5rem)] max-w-[1440px] mx-auto flex rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Left History Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/70 flex flex-col">
          <div className="p-3 border-b border-slate-200/80 space-y-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full h-9 px-3 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Plus size={15} />
              <span>{t('New Chat')}</span>
            </button>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                placeholder={t('Search chats...')}
                className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              {t('Recent Chats')} ({filteredSessions.length})
            </div>
            {filteredSessions.length === 0 ? (
              <div className="px-2.5 py-4 text-[11px] text-slate-400 text-center">
                {t('No saved chats yet.')}
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.id === activeSessionId;
                const isRenaming = renamingSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => !isRenaming && handleOpenSession(s)}
                    className={`group flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition ${
                      isActive
                        ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameText}
                          onChange={(e) => setRenameText(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => handleSaveRename(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(s.id);
                            if (e.key === 'Escape') setRenamingSessionId(null);
                          }}
                          className="w-full px-1.5 py-0.5 rounded border border-brand-primary bg-white text-xs text-slate-900 outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          {s.isPinned ? (
                            <Pin size={12} className="text-amber-500 shrink-0" />
                          ) : (
                            <MessageSquare
                              size={12}
                              className={isActive ? 'text-brand-primary shrink-0' : 'text-slate-400 shrink-0'}
                            />
                          )}
                          <span className="truncate">{s.title}</span>
                        </div>
                      )}
                      {s.model && !isRenaming && (
                        <span className="block pl-4.5 text-[10px] font-mono text-slate-400 truncate">
                          {s.model}
                        </span>
                      )}
                    </div>
                    {!isRenaming && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition">
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(s, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                          title={s.isPinned ? t('Unpin chat') : t('Pin chat')}
                        >
                          {s.isPinned ? <PinOff size={11} /> : <Pin size={11} />}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(s, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          title={t('Rename chat')}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title={t('Delete chat')}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 border-t border-slate-200/80 bg-white/60">
            <Link
              href={`${ROUTES.ADMIN.SETTINGS}?tab=ai`}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <span className="inline-flex items-center gap-1.5">
                <Settings size={13} className="text-slate-400" />
                <span>{t('AI Provider Settings')}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600">{activeProviderDisplay}</span>
            </Link>
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Bar: Config + Live Model + Persona */}
        <header className="min-h-14 px-4 py-2 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-white">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((p) => !p)}
              className="w-8 h-8 rounded-lg border border-slate-200 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shrink-0"
            >
              {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>

            <div className="w-44 sm:w-48">
              <AdminSearchableSelect
                value={selectedConfigId}
                onChange={handleSelectConfig}
                placeholder={status?.provider || t('Select AI config...')}
                searchPlaceholder={t('Search AI config...')}
                emptyText={t('Add a configuration in Settings → AI Writer')}
                triggerClassName="h-9 bg-slate-50 border-slate-200 text-xs"
                options={savedConfigs.map<SelectOption>((cfg) => ({
                  value: String(cfg.id),
                  label: cfg.isDefault ? `★ ${cfg.name}` : cfg.name,
                  sublabel: `${cfg.provider} • ${cfg.model}`,
                }))}
              />
            </div>

            <div className="w-48 sm:w-56">
              <AdminSearchableSelect
                value={selectedModel}
                onChange={setSelectedModel}
                allowCustomValue
                placeholder={loadingModels ? t('Loading models...') : t('Select or type model...')}
                searchPlaceholder={t('Search model or type custom ID...')}
                emptyText={t('Enter any custom model ID directly')}
                triggerClassName="h-9 bg-slate-50 border-slate-200 text-xs"
                options={liveModels.map<SelectOption>((m) => ({
                  value: m.id,
                  label: m.free ? `⚡ ${m.name}` : m.name,
                  sublabel: m.free ? `${m.id} • FREE` : m.id,
                }))}
              />
            </div>

            <div className="w-44 sm:w-48">
              <AdminSearchableSelect
                value={selectedPersona}
                onChange={handleSelectPersona}
                searchable={false}
                triggerClassName="h-9 bg-slate-50 border-slate-200 text-xs"
                options={AI_CHAT_PERSONAS.map<SelectOption>((p) => ({
                  value: p.value,
                  label: p.label,
                  sublabel: p.sublabel,
                }))}
              />
            </div>

            <button
              type="button"
              onClick={() => setEnableTools((prev) => !prev)}
              title={t('Allow AI to query live CMS stats, audit SEO, inspect inquiries, and create drafts/offers')}
              className={`h-9 px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                enableTools
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Wrench size={13} />
              <span>{t('CMS Agent')}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  enableTools ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status && !status.ready && (
              <Link
                href={`${ROUTES.ADMIN.SETTINGS}?tab=ai`}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl hover:bg-amber-100 transition"
              >
                <AlertTriangle size={13} />
                <span>{t('Setup AI Key')}</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowCreatePostModal(true)}
              className="h-8 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <FilePlus2 size={13} />
              <span>{t('Create Post')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="h-8 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-xs font-bold text-indigo-700 hover:bg-indigo-100 inline-flex items-center gap-1.5 transition cursor-pointer"
              title={t('How to Use AI Assistant')}
            >
              <BookOpen size={13} />
              <span className="hidden sm:inline">{t('Guide')}</span>
            </button>
            <button
              type="button"
              onClick={handleNewChat}
              className="h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">{t('New')}</span>
            </button>
          </div>
        </header>

        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {loadingMessages ? (
              <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span>{t('Loading conversation...')}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-6 sm:py-10 flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary/15 via-indigo-500/10 to-emerald-500/15 border border-brand-primary/20 flex items-center justify-center text-brand-primary shadow-sm">
                    <Bot size={30} />
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      enableTools ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {SITE_NAME} {t('AI Assistant')}
                  </h2>
                  <p className="text-xs sm:text-[13px] text-slate-500 max-w-lg mx-auto leading-relaxed">
                    {t('Chat directly with your configured AI model for content ideas, SEO reviews, translations, and research.')}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono font-semibold text-slate-700">
                      <Sparkles size={11} className="text-brand-primary" />
                      <span>{activeProviderDisplay} / {activeModelDisplay}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${
                        enableTools
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <Wrench size={11} />
                      <span>{enableTools ? t('CMS Agent Active') : t('CMS Agent Off')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCreatePostModal(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-bold shadow-xs transition cursor-pointer"
                    >
                      <FilePlus2 size={12} />
                      <span>{t('Quick Create Article with AI')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGuideModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      <BookOpen size={11} />
                      <span>{t('How to Use AI Assistant')}</span>
                    </button>
                  </div>
                </div>

                {/* 4 Color-Accented 1-Click Starter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-1 text-left">
                  {AI_CHAT_STARTER_PROMPTS.map((item, idx) => {
                    const iconMeta =
                      item.icon === 'analytics'
                        ? { Icon: BarChart3, box: 'bg-blue-50 text-blue-600 border-blue-200/70', badge: 'bg-blue-50 text-blue-700' }
                        : item.icon === 'seo'
                          ? { Icon: FileSearch, box: 'bg-emerald-50 text-emerald-600 border-emerald-200/70', badge: 'bg-emerald-50 text-emerald-700' }
                          : item.icon === 'stores'
                            ? { Icon: StoreIcon, box: 'bg-amber-50 text-amber-600 border-amber-200/70', badge: 'bg-amber-50 text-amber-700' }
                            : { Icon: Inbox, box: 'bg-violet-50 text-violet-600 border-violet-200/70', badge: 'bg-violet-50 text-violet-700' };
                    const CardIcon = iconMeta.Icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        disabled={sending}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-brand-primary/40 hover:shadow-sm transition-all text-left flex items-start gap-3 cursor-pointer group"
                      >
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconMeta.box}`}>
                          <CardIcon size={17} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${iconMeta.badge}`}>
                              {t(item.badge)}
                            </span>
                            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-brand-primary transition shrink-0" />
                          </div>
                          <div className="text-xs font-black text-slate-900 group-hover:text-brand-primary transition">
                            {t(item.title)}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{t(item.desc)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Slash Command Pills */}
                <div className="w-full pt-1 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {t('Quick Slash Commands')}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {AI_SLASH_PROMPTS.slice(0, 6).map((cmd) => (
                      <button
                        key={cmd.command}
                        type="button"
                        onClick={() => {
                          setInput(cmd.template);
                          textareaRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-brand-primary/40 text-[11px] transition cursor-pointer"
                      >
                        <span className="font-mono font-black text-brand-primary">{cmd.command}</span>
                        <span className="text-slate-600 font-semibold">{t(cmd.label)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isLastAssistant = !isUser && idx === messages.length - 1;
                const isEditing = editingMsgId === msg.id;

                return (
                  <div key={msg.id} className={`flex gap-3 group ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                        {sending && isLastAssistant ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Bot size={16} />
                        )}
                      </div>
                    )}

                    <div className={`max-w-[86%] space-y-1.5 ${isUser ? 'items-end flex flex-col' : 'flex-1 min-w-0'}`}>
                      {isUser ? (
                        isEditing ? (
                          <div className="w-full min-w-[280px] sm:min-w-[420px] rounded-2xl border border-brand-primary bg-white p-3 space-y-2 shadow-sm">
                            <textarea
                              rows={3}
                              value={editDraftText}
                              onChange={(e) => setEditDraftText(e.target.value)}
                              className="w-full text-xs text-slate-800 bg-slate-50 rounded-xl p-2.5 border border-slate-200 outline-none focus:border-brand-primary"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="px-3 py-1 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                              >
                                {t('Cancel')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSubmitEditResend(idx, msg)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-brand-primary text-white hover:bg-brand-primary-hover cursor-pointer"
                              >
                                {t('Edit & Resend')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-brand-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-xs text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                            {!sending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditDraftText(msg.content);
                                }}
                                className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-700 px-1 transition cursor-pointer"
                              >
                                <Pencil size={10} />
                                <span>{t('Edit & Resend')}</span>
                              </button>
                            )}
                          </>
                        )
                      ) : (
                        <>
                          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl rounded-tl-sm px-4 py-3">
                            {msg.content ? (
                              <MarkdownMessage content={msg.content} />
                            ) : (
                              <span className="text-xs text-slate-400 animate-pulse">
                                {t('Thinking with')} {activeModelDisplay}...
                              </span>
                            )}
                          </div>
                          {msg.content && (
                            <div className="flex flex-wrap items-center gap-2.5 px-1 text-[11px] text-slate-400">
                              <button
                                type="button"
                                onClick={() => handleCopy(msg)}
                                className="inline-flex items-center gap-1 hover:text-slate-700 transition cursor-pointer"
                              >
                                {copiedMsgId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAsDraftPost(msg)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold transition cursor-pointer"
                              >
                                <FilePlus2 size={12} />
                                <span>{t('Fill into Post Editor')}</span>
                              </button>
                              {isLastAssistant && !sending && (
                                <button
                                  type="button"
                                  onClick={handleRegenerate}
                                  className="inline-flex items-center gap-1 hover:text-slate-700 transition cursor-pointer"
                                >
                                  <RotateCcw size={12} />
                                  <span>{t('Regenerate')}</span>
                                </button>
                              )}
                              {msg.model && (
                                <span className="ml-auto font-mono text-[10px] text-slate-400 truncate max-w-[280px]">
                                  {msg.model}
                                  {msg.totalTokens ? ` • ${msg.totalTokens} tok` : ''}
                                  {msg.latencyMs ? ` • ${(msg.latencyMs / 1000).toFixed(1)}s` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Bottom Composer with Context Attachments, Slash Prompts & Stop Button */}
        <div className="px-4 pb-3.5 pt-2 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-3xl mx-auto relative">
            {/* Slash Prompt Command Popup */}
            {slashMatches.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-0.5 z-20 max-h-60 overflow-y-auto">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('Slash Prompts')}
                </div>
                {slashMatches.map((item) => (
                  <button
                    key={item.command}
                    type="button"
                    onClick={() => {
                      setInput(item.template);
                      textareaRef.current?.focus();
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-left transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-black text-brand-primary mr-2">
                        {item.command}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{t(item.label)}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{t(item.desc)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Inline Store Picker or URL Bar */}
            {showStorePicker && (
              <div className="mb-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2">
                <StoreIcon size={14} className="text-brand-primary shrink-0" />
                <div className="flex-1">
                  <AdminSearchableSelect
                    value={attachedStoreSlug}
                    onChange={(val) => {
                      setAttachedStoreSlug(val);
                      setShowStorePicker(false);
                    }}
                    placeholder="Select a Store to attach DB profile & live coupons..."
                    searchPlaceholder="Search store..."
                    triggerClassName="h-8 bg-white text-xs"
                    options={[
                      { value: '', label: 'None (Detach Store)' },
                      ...stores.map<SelectOption>((s) => ({
                        value: s.slug,
                        label: s.name,
                        sublabel: `/store/${s.slug}`,
                      })),
                    ]}
                  />
                </div>
                <button type="button" onClick={() => setShowStorePicker(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            )}

            {showUrlInput && (
              <div className="mb-2 p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2">
                <Link2 size={14} className="text-indigo-500 shrink-0 ml-1" />
                <input
                  type="url"
                  value={attachedUrl}
                  onChange={(e) => setAttachedUrl(e.target.value)}
                  placeholder={t('Paste reference URL (news or product page)...')}
                  className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-800 outline-none focus:border-brand-primary"
                />
                <button type="button" onClick={() => setShowUrlInput(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer pr-1">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Active Attachment Pills */}
            {(attachedStoreSlug || attachedUrl.trim() || attachedFileName) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {attachedStoreSlug && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                    <StoreIcon size={11} />
                    <span>@{attachedStoreSlug}</span>
                    <button type="button" onClick={() => setAttachedStoreSlug('')} className="hover:text-emerald-950 cursor-pointer">
                      <X size={11} />
                    </button>
                  </span>
                )}
                {attachedUrl.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] font-bold text-indigo-700 max-w-xs truncate">
                    <Link2 size={11} className="shrink-0" />
                    <span className="truncate">{attachedUrl.trim()}</span>
                    <button type="button" onClick={() => setAttachedUrl('')} className="hover:text-indigo-950 cursor-pointer shrink-0">
                      <X size={11} />
                    </button>
                  </span>
                )}
                {attachedFileName && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                    <Paperclip size={11} />
                    <span>{attachedFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFileName('');
                        setAttachedFileText('');
                        setAttachedImageDataUrl('');
                      }}
                      className="hover:text-amber-950 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Composer Box */}
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 focus-within:bg-white focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15 px-3.5 py-2 transition">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (slashMatches.length > 0) {
                      e.preventDefault();
                      setInput(slashMatches[0].template);
                      return;
                    }
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sending}
                placeholder={t('Message AI Assistant... (Enter to send, Shift+Enter for new line)')}
                className="w-full bg-transparent resize-none border-0 outline-none text-[13.5px] text-slate-900 placeholder:text-slate-400 max-h-44 py-1 leading-relaxed"
              />

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 mt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowStorePicker((p) => !p)}
                    className={`h-7 px-2 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                      attachedStoreSlug
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
                    }`}
                    title={t('Attach Store')}
                  >
                    <StoreIcon size={12} />
                    <span className="hidden sm:inline">{t('Attach Store')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput((p) => !p)}
                    className={`h-7 px-2 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                      attachedUrl
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
                    }`}
                    title={t('Attach URL')}
                  >
                    <Link2 size={12} />
                    <span className="hidden sm:inline">{t('Attach URL')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-7 px-2 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                      attachedFileName
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800'
                    }`}
                    title={t('Attach File / Image')}
                  >
                    <Paperclip size={12} />
                    <span className="hidden sm:inline">{t('Attach File / Image')}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.json,image/png,image/jpeg,image/webp"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setInput('/');
                      textareaRef.current?.focus();
                    }}
                    className="h-7 px-2 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 inline-flex items-center gap-1 transition cursor-pointer"
                    title={t('Slash Prompts')}
                  >
                    <Slash size={11} />
                    <span className="hidden md:inline">{t('Slash Prompts')}</span>
                  </button>
                </div>

                {sending ? (
                  <button
                    type="button"
                    onClick={handleStopStreaming}
                    className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Square size={11} fill="currentColor" />
                    <span>{t('Stop')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="w-8 h-8 rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 shadow-xs transition cursor-pointer"
                    title={t('Send message')}
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-1.5">
              Spring AI ({activeProviderDisplay} / {activeModelDisplay})
              {activeSessionId ? ` • Session #${activeSessionId} (${messages.length} msgs)` : ''}
              {sessionTotalTokens > 0 ? ` • ${t('Tokens used')}: ${sessionTotalTokens.toLocaleString()}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Create Post Studio Modal */}
      {showCreatePostModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => !creatingPost && setShowCreatePostModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                  <FilePlus2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{t('Quick Create Article with AI')}</h3>
                  <p className="text-[11px] text-slate-500">
                    {t('AI writes & pre-fills the Post Editor so you can review before creating')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={creatingPost}
                onClick={() => setShowCreatePostModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 inline-flex items-center justify-center transition cursor-pointer disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 space-y-4">
              {/* Step 1: Article Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t('Article Type')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateMode('review')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      createMode === 'review'
                        ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/15'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900">⭐ {t('Store / Product Review')}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t('Uses real DB store info & coupons')}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('news')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      createMode === 'news'
                        ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/15'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-black text-slate-900">📰 {t('News / Editorial Guide')}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t('From topic or reference URL')}</div>
                  </button>
                </div>
              </div>

              {/* Step 2: Store Picker (for Review) */}
              {createMode === 'review' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t('Select Partner Store')}
                  </label>
                  <AdminSearchableSelect
                    value={createStoreSlug}
                    onChange={setCreateStoreSlug}
                    placeholder={t('Choose a Store (auto-injects live coupons)...')}
                    searchPlaceholder={t('Search store...')}
                    triggerClassName="h-10 bg-slate-50 border-slate-200 text-xs"
                    options={[
                      { value: '', label: t('No specific store (use custom topic below)') },
                      ...stores.map<SelectOption>((s) => ({
                        value: s.slug,
                        label: s.name,
                        sublabel: `/stores/${s.slug}`,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Step 3: Topic / Focus */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {createMode === 'review' ? t('Focus / Angle (Optional)') : t('Topic or Headline')}
                </label>
                <input
                  type="text"
                  value={createTopic}
                  onChange={(e) => setCreateTopic(e.target.value)}
                  placeholder={
                    createMode === 'review'
                      ? t('e.g. Honest 2026 review, pricing, pros/cons & best promo codes')
                      : t('e.g. Top 5 Best Black Friday Tech Deals Worth Buying')
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-primary outline-none text-xs text-slate-900 transition"
                />
              </div>

              {/* Optional Reference URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {t('Reference URL (Optional)')}
                </label>
                <input
                  type="url"
                  value={createSourceUrl}
                  onChange={(e) => setCreateSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-primary outline-none text-xs font-mono text-slate-900 transition"
                />
              </div>

              {/* Language & Word Count */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t('Language')}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Vietnamese', 'English'] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setCreateLanguage(lang)}
                        className={`h-9 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          createLanguage === lang
                            ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {lang === 'Vietnamese' ? '🇻🇳 VI' : '🇺🇸 EN'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    {t('Article Length')}
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { val: 700, label: '700w' },
                      { val: 1100, label: '1100w' },
                      { val: 1800, label: '1800w' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setCreateWordCount(opt.val)}
                        className={`h-9 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                          createWordCount === opt.val
                            ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={creatingPost}
                onClick={handleDraftPostInChat}
                className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <MessageSquare size={13} />
                <span>{t('Draft in Chat First')}</span>
              </button>
              <button
                type="button"
                disabled={creatingPost}
                onClick={handleGenerateAndReviewPost}
                className="h-9 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
              >
                {creatingPost ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{creatingPost ? t('Generating & Filling Editor...') : t('Generate & Review in Editor')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Usage Guide Modal */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[86vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{t('How to Use AI Assistant')}</h3>
                  <p className="text-[11px] text-slate-500">
                    {SITE_NAME} • Spring AI CMS Agent
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 inline-flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Section 1: 3-Step Quick Start */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t('Quick Start')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {AI_USAGE_GUIDE_STEPS.map((s) => (
                    <div key={s.step} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                      <span className="w-6 h-6 rounded-lg bg-brand-primary text-white text-xs font-black inline-flex items-center justify-center">
                        {s.step}
                      </span>
                      <div className="text-xs font-black text-slate-900">{t(s.title)}</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{t(s.desc)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Built-in CMS Automation Tools */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {t('Built-in CMS Automation Tools')}
                </h4>
                <div className="space-y-2">
                  {AI_USAGE_GUIDE_CAPABILITIES.map((cap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-300 transition"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              cap.mode === 'READ'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            }`}
                          >
                            {t(cap.mode)}
                          </span>
                          <span className="text-xs font-black text-slate-900">{t(cap.title)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{t(cap.desc)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowGuideModal(false);
                          setInput(cap.example);
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-primary hover:text-white text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 transition cursor-pointer shrink-0 self-start sm:self-center"
                      >
                        <span>{t('Try now')}</span>
                        <ArrowUpRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Pro Tips */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                  <Lightbulb size={14} className="text-amber-600" />
                  <span>{t('Pro Tips')}</span>
                </div>
                <ul className="space-y-1.5 text-[11.5px] text-amber-950/80">
                  {AI_USAGE_GUIDE_TIPS.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 font-black">•</span>
                      <span>{t(tip)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safety Notice */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                <span>{t('All AI write actions create DRAFT posts or logged offers and never delete production data.')}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition cursor-pointer"
              >
                {t('Got it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
