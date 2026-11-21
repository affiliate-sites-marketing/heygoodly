'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Search,
  ArrowUpDown,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useServerPagination } from '@/lib/admin/useServerPagination';
import { useToast } from '@/context/ToastContext';
import Pagination from '@/components/admin/Pagination';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFilterBar from '@/components/admin/AdminFilterBar';
import AdminTableShell from '@/components/admin/AdminTableShell';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import { adminSearchInputClass } from '@/components/admin/adminStyles';
import { type StaticPageData } from './_lib/data';
import StaticPageTableRow from './_components/StaticPageTableRow';
import PageOrderMatrixModal from './_components/PageOrderMatrixModal';
import { apiClient } from '@/lib/api/axios-client';
import { API_ENDPOINTS } from '@/constants/api-endpoints';

type StatusFilter = 'all' | 'published' | 'draft';
type SortBy = 'newest' | 'order-asc' | 'order-desc' | 'title-asc' | 'updated-desc';

const TABLE_COLUMNS = [
  { label: 'Page Title' },
  { label: 'Live URL' },
  { label: 'Last Modified' },
  { label: 'Status' },
  { label: 'Actions', className: 'text-right w-36 min-w-[144px]' },
];

export default function AdminPagesPage() {
  const { toast, confirm: confirmModal } = useToast();

  const [orderMatrixOpen, setOrderMatrixOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const {
    items: displayedPages,
    totalElements,
    totalPages,
    currentPage,
    pageSize,
    loading,
    setCurrentPage,
    setPageSize,
    refresh,
  } = useServerPagination<StaticPageData>({
    endpoint: API_ENDPOINTS.ADMIN.PAGES,
    defaultPageSize: 10,
    search,
    filters: {
      isActive: statusFilter === 'published' ? true : statusFilter === 'draft' ? false : undefined,
      sortBy:
        sortBy === 'newest'
          ? 'createdAt'
          : sortBy === 'title-asc'
            ? 'title'
            : sortBy === 'updated-desc'
              ? 'updatedAt'
              : 'sortOrder',
      direction:
        sortBy === 'newest' || sortBy === 'order-desc' || sortBy === 'updated-desc'
          ? 'desc'
          : 'asc',
    },
    transformItem: (p: any) => ({
      id: Number(p.id),
      title: p.title || '',
      slug: p.slug || '',
      content: '',
      metaTitle: p.title || '',
      metaDescription: '',
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : '2026-10-31',
      sortOrder: Number(p.sortOrder || 1),
      isActive: Boolean(p.isActive),
    }),
    fallbackItems: [],
  });

  const isFiltered = search.trim() !== '' || statusFilter !== 'all' || sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const handleDelete = async (id: number) => {
    const pageItem = displayedPages.find((p) => p.id === id);
    const confirmed = await confirmModal({
      title: 'Delete Static Page',
      message: (
        <span>
          Are you sure you want to delete{' '}
          <strong className="text-rose-600 font-bold">{pageItem?.title || 'this page'}</strong>?
        </span>
      ),
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await apiClient.delete(`${API_ENDPOINTS.ADMIN.PAGES}/${id}`);
        refresh();
        toast.success('Page deleted successfully');
      } catch {
        toast.error('Failed to delete page');
      }
    }
  };

  const publishedCount = displayedPages.filter((p) => p.isActive).length;
  const draftCount = displayedPages.filter((p) => !p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <AdminPageHeader
        icon={Layers}
        title="Static Pages & Legal Compliance"
        badge={`${totalElements} Pages Total`}
        description="Manage legal disclosures, affiliate compliance statements, terms of service, and editorial guidelines."
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOrderMatrixOpen(true)}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-brand-primary/40 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LayoutGrid size={15} className="text-brand-primary" />
            <span>Arrange Order</span>
          </button>
          <Link
            href={ROUTES.ADMIN.PAGE_CREATE}
            className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={15} /> Create Static Page
          </Link>
        </div>
      </AdminPageHeader>

      {/* Advanced Filter Box */}
      <AdminFilterBar
        totalItems={totalElements}
        itemName="pages"
        isFiltered={isFiltered}
        onReset={handleResetFilters}
      >
        <div className="space-y-3">
          {/* Quick status count pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-fit">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`h-8 px-3.5 inline-flex items-center justify-center text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Pages ({totalElements})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('published')}
              className={`h-8 px-3.5 inline-flex items-center justify-center text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'published'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`h-8 px-3.5 inline-flex items-center justify-center text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'draft'
                  ? 'bg-white text-slate-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({draftCount})
            </button>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages by title, slug, or content..."
                className={adminSearchInputClass}
              />
            </div>

            {/* Status Dropdown */}
            <AdminSearchableSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as StatusFilter)}
              options={[
                { value: 'all', label: 'Status: All' },
                { value: 'published', label: 'Status: Published Only' },
                { value: 'draft', label: 'Status: Drafts Only' },
              ]}
            />

            {/* Sort By */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
              <AdminSearchableSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as SortBy)}
                options={[
                  { value: 'newest', label: 'Sort: Newly Created' },
                  { value: 'order-asc', label: 'Navigation Order (1 → 99)' },
                  { value: 'order-desc', label: 'Navigation Order (99 → 1)' },
                  { value: 'title-asc', label: 'Page Title (A → Z)' },
                  { value: 'updated-desc', label: 'Last Modified' },
                ]}
              />
            </div>
          </div>
        </div>
      </AdminFilterBar>

      {/* Pages Table */}
      <AdminTableShell
        columns={TABLE_COLUMNS}
        isEmpty={displayedPages.length === 0}
        emptyMessage="No static pages found. Try adjusting your keyword search or status filter."
        footer={
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalElements}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        }
      >
        {displayedPages.map((p) => (
          <StaticPageTableRow key={p.id} page={p} onDelete={handleDelete} />
        ))}
      </AdminTableShell>

      {/* Static Page Matrix Drag & Drop Order Modal */}
      <PageOrderMatrixModal
        isOpen={orderMatrixOpen}
        onClose={() => setOrderMatrixOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}
