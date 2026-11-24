'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  Users,
  UploadCloud,
  Layers,
  UserCheck,
} from 'lucide-react';
import { ReviewerProfile } from '@/types/deals';
import storeService from '@/services/storeService';
import { mediaService } from '@/services/mediaService';
import MediaLibraryModal from '@/components/admin/MediaLibraryModal';
import { useToast } from '@/context/ToastContext';
import { useAdminI18n } from '@/context/AdminI18nContext';
import { inputClass } from '@/components/admin/AdminFormPage';

interface ReviewerProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (profile: ReviewerProfile) => void;
  onChanged?: () => void;
}

export default function ReviewerProfilesModal({
  isOpen,
  onClose,
  onSelect,
  onChanged,
}: ReviewerProfilesModalProps) {
  const { toast } = useToast();
  const { t } = useAdminI18n();

  const [profiles, setProfiles] = useState<ReviewerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Create / Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isVerified, setIsVerified] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfiles = async (q = '') => {
    setLoading(true);
    try {
      const list = await storeService.searchReviewerProfiles(q);
      setProfiles(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    resetForm();
    loadProfiles('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadProfiles(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setAvatarUrl('');
    setIsVerified(true);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('Image must be smaller than 10MB'));
      return;
    }
    setUploadingAvatar(true);
    try {
      const uploaded = await mediaService.uploadMedia(file, 'avatars', ['avatar', 'reviewer']);
      if (uploaded?.url) {
        setAvatarUrl(uploaded.url);
        toast.success(t('Avatar uploaded!'));
      }
    } catch {
      toast.error(t('Failed to upload avatar'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      let saved: ReviewerProfile;
      if (editingId !== null) {
        saved = await storeService.updateReviewerProfile(editingId, {
          name: name.trim(),
          avatarUrl: avatarUrl.trim(),
          isVerified,
        });
        setProfiles((prev) => prev.map((p) => (p.id === editingId ? saved : p)));
        toast.success(t('Updated reviewer profile!'));
      } else {
        saved = await storeService.createReviewerProfile({
          name: name.trim(),
          avatarUrl: avatarUrl.trim(),
          isVerified,
        });
        setProfiles((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
        toast.success(t('Saved reviewer profile!'));
      }
      resetForm();
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('Failed to save reviewer profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (p: ReviewerProfile) => {
    setEditingId(p.id);
    setName(p.name);
    setAvatarUrl(p.avatarUrl || '');
    setIsVerified(p.isVerified !== false);
  };

  const handleDelete = async (id: number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    try {
      await storeService.deleteReviewerProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
      toast.success(t('Deleted reviewer profile!'));
      onChanged?.();
    } catch {
      toast.error(t('Failed to delete reviewer profile'));
    } finally {
      setDeletingId(null);
    }
  };

  const initials = (name || 'RV').slice(0, 2).toUpperCase();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {t('Manage Reviewers')} ({profiles.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {t('Add, edit avatar, or delete saved reviewer profiles for reuse across all stores.')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Compact Create / Edit Bar (div, not form, to never trigger parent StoreForm) */}
          <div className="px-5 py-3.5 bg-indigo-50/40 border-b border-indigo-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-900">
                {editingId !== null ? t('Edit Reviewer Profile') : t('Add New Reviewer Profile')}
              </span>
              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {t('Cancel Edit')}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 40x40 Circular Avatar */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMediaOpen(true)}
                  title={t('Choose avatar from Media Library')}
                  className="w-10 h-10 rounded-full overflow-hidden border border-slate-300 bg-white flex items-center justify-center hover:border-indigo-500 transition cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={14} className="animate-spin text-indigo-600" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 w-full h-full flex items-center justify-center">
                      {initials}
                    </span>
                  )}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 cursor-pointer"
                  >
                    <X size={9} />
                  </button>
                )}
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
                }}
                placeholder={t('Reviewer name (e.g. Hannah M.)...')}
                className={`${inputClass} text-xs h-9 flex-1 min-w-[150px]`}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadFile}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-2.5 rounded-lg text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-400 inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <UploadCloud size={12} />
                <span>{t('Upload')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaOpen(true)}
                className="h-9 px-2.5 rounded-lg text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Layers size={12} />
                <span>{t('Library')}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder={t('Avatar URL (optional)...')}
                className={`${inputClass} text-[11px] h-8 flex-1 min-w-[180px]`}
              />
              <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none px-1">
                <input
                  type="checkbox"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                />
                <span>{t('Verified Buyer')}</span>
              </label>
              <button
                type="button"
                disabled={saving || !name.trim()}
                onClick={handleSubmit}
                className="h-8 px-4 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                <span>{editingId !== null ? t('Update') : t('Add Reviewer')}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 py-2.5 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search saved reviewers...')}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Reviewers List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
            {loading ? (
              <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 size={15} className="animate-spin text-emerald-600" />
                <span>{t('Loading reviewers...')}</span>
              </div>
            ) : profiles.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                {t('No saved reviewers found. Add one above!')}
              </div>
            ) : (
              profiles.map((p) => (
                <div
                  key={p.id}
                  className={`px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition ${
                    editingId === p.id ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center shrink-0">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                      {p.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                          <CheckCircle2 size={10} />
                          <span>{t('Verified Buyer')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onSelect && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(p);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <UserCheck size={11} />
                        <span>{t('Select')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition"
                      title={t('Edit')}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer disabled:opacity-40 transition"
                      title={t('Delete')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <MediaLibraryModal
        isOpen={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          setAvatarUrl(url);
          setMediaOpen(false);
        }}
      />
    </>,
    document.body
  );
}
