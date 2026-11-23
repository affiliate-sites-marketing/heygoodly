'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Plus, Search, LayoutGrid } from 'lucide-react';
import Pagination from '@/components/admin/Pagination';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminFilterBar from '@/components/admin/AdminFilterBar';
import AdminTableShell from '@/components/admin/AdminTableShell';
import AdminSearchableSelect from '@/components/admin/AdminSearchableSelect';
import { adminSearchInputClass } from '@/components/admin/adminStyles';
import { ROUTES } from '@/constants/routes';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { apiClient } from '@/lib/api/axios-client';
import { useServerPagination } from '@/lib/admin/useServerPagination';
import { usePermission } from '@/lib/admin/usePermission';
import { useToast } from '@/context/ToastContext';
import UnauthorizedAccess from '@/components/admin/UnauthorizedAccess';
import { type CategoryData } from './_lib/data';
import CategoryArticlesModal from './_components/CategoryArticlesModal';
import CategoryOrderMatrixModal from './_components/CategoryOrderMatrixModal';
import CategoryTableRow from './_components/CategoryTableRow';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
type SortBy = 'newest' | 'order-asc' | 'name-asc' | 'articles-desc';

const TABLE_COLUMNS = [
  { label: 'Category Name', className: 'min-w-[200px]' },
  { label: 'Public URL', className: 'min-w-[170px]' },
  { label: 'Articles', className: 'min-w-[150px]' },
  { label: 'Status', className: 'min-w-[110px]' },
  { label: 'Actions', className: 'text-right w-32 min-w-[128px]' },
];

export default function AdminCategoriesPage() {
  const { hasPermission } = usePermission();
  const { toast, confirm: confirmModal } = useToast();

  const [selectedCategoryForArticles, setSelectedCategoryForArticles] = useState<CategoryData | null>(null);
  const [orderMatrixOpen, setOrderMatrixOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const {
    items: paginatedCategories,
    loading: isLoading,
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    setCurrentPage,
    setPageSize,
    setParam,
    setItems,
    refresh: refreshCategories,
  } = useServerPagination<CategoryData>({
    endpoint: API_ENDPOINTS.ADMIN.CATEGORIES,
    defaultPageSize: 10,
    initialParams: {
      search: '',
      sortBy: 'createdAt',
      direction: 'desc',
    },
    mapItem: (c: any): CategoryData => ({
      id: Number(c.id),
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      articlesCount: Number(c.postCount ?? c.articlesCount ?? 0),
      sortOrder: Number(c.sortOrder ?? 0),
      isActive: c.isActive !== false,
      imageUrl: c.image || c.imageUrl || '',
    }),
    fallbackItems: [],
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setParam('search', val.trim() || undefined);
  };

  const handleStatusChange = (val: StatusFilter) => {
    setStatusFilter(val);
    if (val === 'ACTIVE') {
      setParam('isActive', true);
    } else if (val === 'INACTIVE') {
      setParam('isActive', false);
    } else {
      setParam('isActive', undefined);
    }
  };

  const handleSortChange = (val: SortBy) => {
    setSortBy(val);
    if (val === 'newest') {
      setParam('sortBy', 'createdAt');
      setParam('direction', 'desc');
    } else if (val === 'name-asc') {
      setParam('sortBy', 'name');
      setParam('direction', 'asc');
    } else {
      setParam('sortBy', 'sortOrder');
      setParam('direction', 'asc');
    }
  };

  const isFiltered = search !== '' || statusFilter !== 'ALL' || sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSortBy('newest');
    setParam('search', undefined);
    setParam('isActive', undefined);
    setParam('sortBy', 'createdAt');
    setParam('direction', 'desc');
  };

  const handleDelete = async (id: number) => {
    const cat = paginatedCategories.find((c) => c.id === id);
    const confirmed = await confirmModal({
      title: 'Confirm Category Deletion',
      message: (
        <span>
          Are you sure you want to delete the category{' '}
          <strong className="text-rose-600 font-bold">{cat?.name}</strong>?
        </span>
      ),
      confirmText: 'Delete Category',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await apiClient.delete(`${API_ENDPOINTS.ADMIN.CATEGORIES}/${id}`);
        refreshCategories();
        toast.success(`Category "${cat?.name || ''}" deleted successfully!`);
      } catch {
        toast.error('Failed to delete category');
      }
    }
  };

  if (!hasPermission('category.view')) {
    return <UnauthorizedAccess requiredPermission="category.view" moduleName="Editorial Categories" />;
  }

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <AdminPageHeader
        icon={Layers}
        title="Editorial Categories Management"
        badge={`${totalItems} Categories Total`}
        description="Configure editorial taxonomy matching client navigation bars: Tech, Business, Entertainment, US Politics, Reviews, and Lifestyle."
      >
        <div className="flex items-center gap-2">
          {hasPermission('category.update') && (
            <button
              type="button"
              onClick={() => setOrderMatrixOpen(true)}
              className="h-9 px-3.5 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-brand-primary/40 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LayoutGrid size={15} className="text-brand-primary" />
              <span>Arrange Order</span>
            </button>
          )}
          <Link
            href={ROUTES.ADMIN.CATEGORY_CREATE}
            className="h-9 px-4 inline-flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={15} /> Add Category
          </Link>
        </div>
      </AdminPageHeader>

      {/* Advanced Filter Bar */}
      <AdminFilterBar
        totalItems={totalItems}
        itemName="categories"
        isFiltered={isFiltered}
        onReset={handleResetFilters}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search categories by name, slug..."
              className={adminSearchInputClass}
            />
          </div>

          {/* Status Filter */}
          <div>
            <AdminSearchableSelect
              value={statusFilter}
              onChange={(val) => handleStatusChange(val as StatusFilter)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'ACTIVE', label: 'Active in Nav' },
                { value: 'INACTIVE', label: 'Inactive / Hidden' },
              ]}
            />
          </div>

          {/* Sort By */}
          <div>
            <AdminSearchableSelect
              value={sortBy}
              onChange={(val) => handleSortChange(val as SortBy)}
              options={[
                { value: 'newest', label: 'Sort: Newly Created' },
                { value: 'order-asc', label: 'Sort: Navigation Order' },
                { value: 'name-asc', label: 'Sort: Name (A to Z)' },
                { value: 'articles-desc', label: 'Sort: Most Published Articles' },
              ]}
            />
          </div>
        </div>
      </AdminFilterBar>

      {/* Category Data Table */}
      <AdminTableShell
        columns={TABLE_COLUMNS}
        isEmpty={paginatedCategories.length === 0}
        emptyMessage="No categories match the active filters."
        footer={
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="categories"
          />
        }
      >
        {paginatedCategories.map((cat) => (
          <CategoryTableRow
            key={cat.id}
            category={cat}
            onOpenArticlesModal={setSelectedCategoryForArticles}
            onDelete={handleDelete}
          />
        ))}
      </AdminTableShell>

      {/* Category Articles Modal */}
      <CategoryArticlesModal
        isOpen={selectedCategoryForArticles !== null}
        onClose={() => setSelectedCategoryForArticles(null)}
        category={selectedCategoryForArticles}
      />

      {/* Category Matrix Drag & Drop Order Modal */}
      <CategoryOrderMatrixModal
        isOpen={orderMatrixOpen}
        onClose={() => setOrderMatrixOpen(false)}
        onSaved={refreshCategories}
      />
    </div>
  );
}
