'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  Check,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
  Layers,
  Tag,
  ClipboardPaste,
} from 'lucide-react';
import MediaLibraryModal from './MediaLibraryModal';
import MediaTagInput from './MediaTagInput';
import type { MediaItem } from '@/app/admin/media/_lib/data';
import { useOptionalToast } from '@/context/ToastContext';
import { mediaService } from '@/services/mediaService';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  description?: string;
  aspectRatio?: 'video' | 'square' | 'banner';
  defaultTags?: string[];
}

export default function ImageUpload({
  value = '',
  onChange,
  folder = 'articles',
  label = 'Featured Image / Cover',
  description = 'PNG, JPG, WEBP or GIF (Max 10MB). High resolution recommended.',
  aspectRatio = 'video',
  defaultTags = [],
}: ImageUploadProps) {
  const toastCtx = useOptionalToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const previewImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgLoadError(false);
    if (!value) {
      setImgLoading(false);
      return;
    }
    const img = previewImgRef.current;
    if (img && img.complete) {
      setImgLoading(false);
      if (img.naturalWidth === 0) {
        setImgLoadError(true);
      }
    } else {
      setImgLoading(true);
    }
  }, [value]);

  // Staged Upload with Mandatory Tags
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string>('');
  const [stagedTags, setStagedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isHoveredRef = useRef(false);

  const normalizePastedImageFile = (blob: Blob, fallbackName = 'pasted-image'): File => {
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
    };
    const ext = extMap[blob.type.toLowerCase()] || 'png';
    const rawName = (blob as File).name;
    const fileName =
      rawName && rawName !== 'image.png'
        ? rawName
        : `${fallbackName}-${Date.now()}.${ext}`;
    return new File([blob], fileName, { type: blob.type || 'image/png' });
  };

  const extractImageFromClipboardData = (clipboardData: DataTransfer | null): File | null => {
    if (!clipboardData) return null;
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) return normalizePastedImageFile(blob);
        }
      }
    }
    if (clipboardData.files && clipboardData.files.length > 0) {
      for (let i = 0; i < clipboardData.files.length; i++) {
        const f = clipboardData.files[i];
        if (f.type.startsWith('image/')) {
          return normalizePastedImageFile(f);
        }
      }
    }
    return null;
  };

  const handlePasteFromButton = async () => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
        toastCtx?.toast.info('Hover over this upload box and press Cmd+V / Ctrl+V to paste your copied image.');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          handleSelectFile(normalizePastedImageFile(blob));
          return;
        }
      }
      toastCtx?.toast.info('No image found in clipboard. Copy an image first, then paste.');
    } catch {
      toastCtx?.toast.info('Hover over this upload box and press Cmd+V / Ctrl+V to paste your copied image.');
    }
  };

  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      if (showTagModal || mediaModalOpen) return;
      const target = e.target as HTMLElement | null;
      const isInsideThisBox = Boolean(containerRef.current && target && containerRef.current.contains(target));
      if (!isHoveredRef.current && !isInsideThisBox) return;

      // Do not hijack text pasting inside the URL input unless clipboard actually carries an image file
      const imageFile = extractImageFromClipboardData(e.clipboardData);
      if (!imageFile) return;

      e.preventDefault();
      e.stopPropagation();
      handleSelectFile(imageFile);
    };

    window.addEventListener('paste', onWindowPaste);
    return () => window.removeEventListener('paste', onWindowPaste);
  });

  const aspectClass = {
    video: 'h-48 sm:h-56 max-h-[220px]',
    square: 'h-40 sm:h-44 max-h-[176px]',
    banner: 'h-28 sm:h-32 max-h-[128px]',
  }[aspectRatio];

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    setError(null);
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
    const cleanDefaultTags = defaultTags.map((t) => t.trim()).filter(Boolean);
    const fallbackFolderTag = folder.includes('store') ? 'store' : folder.includes('banner') ? 'banner' : 'article';
    setStagedTags(cleanDefaultTags.length > 0 ? Array.from(new Set(cleanDefaultTags)) : [fallbackFolderTag]);
    setShowTagModal(true);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!stagedFile) return;
    if (stagedTags.length === 0) {
      toastCtx?.toast.error('Please enter at least 1 tag to save the image to the library!');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      setUploadProgress(45);
      const data = await mediaService.uploadMedia(stagedFile, folder, stagedTags);
      setUploadProgress(85);

      if (data && data.url) {
        const newItem: MediaItem = {
          id: data.id,
          name: data.name,
          url: data.url,
          category: data.category,
          size: data.size,
          dimensions: data.dimensions,
          format: data.format,
          createdAt: data.createdAt ? data.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
          tags: data.tags || stagedTags,
        };

        onChange(data.url);
        setIsUploading(false);
        setUploadProgress(100);
        setShowTagModal(false);
        setStagedFile(null);
        toastCtx?.toast.success('Image uploaded and linked successfully!');
        return;
      }
      throw new Error('No URL returned from server');
    } catch (err: any) {
      console.warn('Fallback to browser FileReader due to upload error:', err);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const newItem: MediaItem = {
            id: `m-${Date.now()}`,
            name: stagedFile.name,
            url: result,
            category: folder as any,
            size: `${Math.round(stagedFile.size / 1024)} KB`,
            dimensions: 'Original',
            format: stagedFile.name.split('.').pop()?.toUpperCase() || 'WEBP',
            createdAt: new Date().toISOString().split('T')[0],
            tags: stagedTags,
          };
          onChange(result);
        }
        setIsUploading(false);
        setUploadProgress(100);
        setShowTagModal(false);
        setStagedFile(null);
      };
      reader.onerror = () => {
        setError('Failed to process image');
        setIsUploading(false);
      };
      reader.readAsDataURL(stagedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setError(null);
    }
  };

  const handleCopyUrl = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className="space-y-2"
    >
      <div className="flex flex-col items-start gap-2">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 min-h-[20px]">
          <ImageIcon size={14} className="text-brand-primary shrink-0" />
          <span>{label}</span>
        </label>

        {/* Switch mode */}
        <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 max-w-full">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
              mode === 'upload'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <UploadCloud size={13} className={mode === 'upload' ? 'text-brand-primary' : 'text-slate-400'} />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
              mode === 'url'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
            }`}
          >
            <LinkIcon size={13} className={mode === 'url' ? 'text-brand-primary' : 'text-slate-400'} />
            <span>Image Link</span>
          </button>
          <button
            type="button"
            onClick={() => setMediaModalOpen(true)}
            className="h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/80 border border-indigo-200/60 shadow-2xs"
            title="Open Digital Media Library"
          >
            <Layers size={13} className="text-indigo-600" />
            <span>Library</span>
          </button>
        </div>
      </div>

      {/* When Value Exists: Show Fitted Preview */}
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100/80 p-2">
          <div className={`relative w-full ${aspectClass} rounded-lg overflow-hidden flex items-center justify-center bg-slate-50`}>
            {imgLoading && !imgLoadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-5">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            )}
            {imgLoadError ? (
              <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400 gap-1.5 select-none">
                <div className="w-10 h-10 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-500">
                  <ImageIcon size={20} />
                </div>
                <span className="text-xs font-bold text-slate-700">Image Preview Unavailable</span>
                <span className="text-[10px] text-slate-400 font-mono max-w-[200px] truncate" title={value}>
                  {value}
                </span>
              </div>
            ) : (
              <img
                ref={previewImgRef}
                src={value}
                alt={label || 'Uploaded Preview'}
                className={`w-full h-full object-contain transition duration-300 group-hover:scale-102 ${
                  imgLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => setImgLoading(false)}
                onError={() => {
                  setImgLoading(false);
                  setImgLoadError(true);
                }}
              />
            )}
          </div>

          {/* Action overlay */}
          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-all flex flex-wrap items-center justify-center content-center gap-2 p-3 z-10 backdrop-blur-2xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Replace</span>
            </button>
            <button
              type="button"
              onClick={handlePasteFromButton}
              className="h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              title="Paste copied image from clipboard"
            >
              <ClipboardPaste size={13} />
              <span>Paste</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaModalOpen(true)}
              className="h-8 px-3 inline-flex items-center justify-center gap-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
            >
              <Layers size={13} />
              <span>Library</span>
            </button>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="w-8 h-8 inline-flex items-center justify-center bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-sm transition cursor-pointer"
              title="Copy URL"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 inline-flex items-center justify-center bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-sm transition cursor-pointer"
              title="Open original image"
            >
              <ExternalLink size={14} />
            </a>
            <button
              type="button"
              onClick={() => onChange('')}
              className="h-8 px-3 inline-flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
              title="Remove image"
            >
              <X size={13} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State: Uploader or URL Input */
        <div className="space-y-2">
          {mode === 'upload' ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 min-h-[192px] text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                dragActive
                  ? 'border-brand-primary bg-rose-50/50 scale-[0.99]'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {isUploading ? (
                <div className="space-y-2 py-4">
                  <Loader2 size={24} className="animate-spin text-brand-primary mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Uploading &amp; cataloging with tags...</p>
                  <div className="w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden mx-auto">
                    <div
                      className="bg-brand-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-600 shadow-2xs">
                    <UploadCloud size={22} className="text-brand-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to upload, drag &amp; drop, or paste (Ctrl+V / Cmd+V)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePasteFromButton();
                    }}
                    className="mt-1 h-7 px-3 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs transition cursor-pointer"
                  >
                    <ClipboardPaste size={12} />
                    <span>Paste</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/... or image direct link"
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="h-9 px-4 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center shadow-xs"
                >
                  Set URL
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You can paste an image URL from Unsplash, Imgur, or direct CDN link.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
              <X size={12} /> {error}
            </p>
          )}
        </div>
      )}

      {/* Mandatory Tagging Modal for ImageUpload */}
      {showTagModal && stagedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-brand-primary">
                  <Tag size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Tag Uploaded Image</h3>
                  <p className="text-[11px] text-slate-400">Tags are required to categorize and search for images in the library.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTagModal(false);
                  setStagedFile(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={stagedPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1 overflow-hidden flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{stagedFile.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {Math.round(stagedFile.size / 1024)} KB • {stagedFile.name.split('.').pop()?.toUpperCase()}
                </p>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                  Folder: {folder}
                </span>
              </div>
            </div>

            {/* Mandatory Tag Input */}
            <MediaTagInput
              tags={stagedTags}
              onChange={setStagedTags}
              required={true}
              label="Category Tags (Minimum 1 required)"
              placeholder="Type a tag and press Enter (e.g., cover, apple, anker...)"
              helperText="Image will be automatically saved to the Media Library with these tags."
            />

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowTagModal(false);
                  setStagedFile(null);
                }}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={stagedTags.length === 0 || isUploading}
                className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Complete Upload &amp; Save ({stagedTags.length} {stagedTags.length === 1 ? 'tag' : 'tags'})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Media Asset Library Modal */}
      <MediaLibraryModal
        isOpen={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
        onSelect={(selectedUrl) => {
          onChange(selectedUrl);
          setError(null);
        }}
        defaultFolder={folder as any}
      />
    </div>
  );
}
