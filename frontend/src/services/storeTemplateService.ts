import { apiClient } from '@/lib/api/axios-client';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import {
  DEFAULT_FAQ_TEMPLATES,
  FaqTemplateCategory,
  FaqTemplateItem,
  ReviewTemplateCategory,
  ReviewTemplateItem,
  applyBrandToken,
  buildDefaultStoreFaqs,
} from '@/constants/storeTemplates';
import { StoreCustomerReview } from '@/types/deals';

const REVIEW_CATEGORIES: ReviewTemplateCategory[] = [
  'savings',
  'quality',
  'shipping',
  'balanced',
  'custom',
];

const FAQ_CATEGORIES: FaqTemplateCategory[] = [
  'promo',
  'shipping',
  'returns',
  'discounts',
  'custom',
];

export interface ReviewTemplatePayload {
  category?: ReviewTemplateCategory;
  title: string;
  reviewerName: string;
  rating: number;
  reviewDateLabel: string;
  isVerified: boolean;
  commentTemplate: string;
  sortOrder?: number;
}

export interface FaqTemplatePayload {
  category?: FaqTemplateCategory;
  title: string;
  questionTemplate: string;
  answerTemplate: string;
  isDefault?: boolean;
  sortOrder?: number;
}

function normalizeReviewCategory(value?: string | null): ReviewTemplateCategory {
  return REVIEW_CATEGORIES.includes(value as ReviewTemplateCategory)
    ? (value as ReviewTemplateCategory)
    : 'custom';
}

function normalizeFaqCategory(value?: string | null): FaqTemplateCategory {
  return FAQ_CATEGORIES.includes(value as FaqTemplateCategory)
    ? (value as FaqTemplateCategory)
    : 'custom';
}

function mapReviewDto(row: any, index = 0): ReviewTemplateItem {
  const category = normalizeReviewCategory(row?.category);
  return {
    id: String(row?.id ?? `rev-${index}`),
    category,
    title: String(row?.title || 'Customer Review'),
    reviewerName: String(row?.reviewerName || 'Verified Buyer'),
    rating: Math.min(5, Math.max(1, Number(row?.rating) || 5)),
    reviewDateLabel: String(row?.reviewDateLabel || '3 days ago'),
    isVerified: row?.isVerified !== false,
    commentTemplate: String(row?.commentTemplate || ''),
    isCustom: typeof row?.isCustom === 'boolean' ? row.isCustom : category === 'custom',
    sortOrder: typeof row?.sortOrder === 'number' ? row.sortOrder : index + 1,
  };
}

function mapFaqDto(row: any, index = 0): FaqTemplateItem {
  const category = normalizeFaqCategory(row?.category);
  return {
    id: String(row?.id ?? `faq-${index}`),
    category,
    title: String(row?.title || 'FAQ Item'),
    questionTemplate: String(row?.questionTemplate || ''),
    answerTemplate: String(row?.answerTemplate || ''),
    isDefault: Boolean(row?.isDefault),
    isCustom: typeof row?.isCustom === 'boolean' ? row.isCustom : category === 'custom',
    sortOrder: typeof row?.sortOrder === 'number' ? row.sortOrder : index + 1,
  };
}

function buildReviewRequestBody(payload: ReviewTemplatePayload, defaultSortOrder: number) {
  return {
    category: normalizeReviewCategory(payload.category || 'custom'),
    title: payload.title.trim(),
    reviewerName: payload.reviewerName.trim(),
    rating: Math.min(5, Math.max(1, Number(payload.rating) || 5)),
    reviewDateLabel: payload.reviewDateLabel.trim() || 'Recently',
    isVerified: payload.isVerified !== false,
    commentTemplate: payload.commentTemplate.trim(),
    sortOrder: payload.sortOrder ?? defaultSortOrder,
  };
}

function buildFaqRequestBody(payload: FaqTemplatePayload, defaultSortOrder: number) {
  return {
    category: normalizeFaqCategory(payload.category || 'custom'),
    title: payload.title.trim(),
    questionTemplate: payload.questionTemplate.trim(),
    answerTemplate: payload.answerTemplate.trim(),
    isDefault: Boolean(payload.isDefault),
    sortOrder: payload.sortOrder ?? defaultSortOrder,
  };
}

class StoreTemplateService {
  async listReviewTemplates(): Promise<ReviewTemplateItem[]> {
    const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORE_REVIEW_TEMPLATES);
    const list = res.data?.data ?? res.data;
    return Array.isArray(list) ? list.map((row, idx) => mapReviewDto(row, idx)) : [];
  }

  async createReviewTemplate(payload: ReviewTemplatePayload): Promise<ReviewTemplateItem> {
    const res = await apiClient.post(
      API_ENDPOINTS.ADMIN.STORE_REVIEW_TEMPLATES,
      buildReviewRequestBody(payload, 0)
    );
    const data = res.data?.data ?? res.data;
    return mapReviewDto(data);
  }

  async updateReviewTemplate(
    id: string,
    payload: ReviewTemplatePayload
  ): Promise<ReviewTemplateItem> {
    const res = await apiClient.put(
      API_ENDPOINTS.ADMIN.STORE_REVIEW_TEMPLATE_DETAIL(id),
      buildReviewRequestBody(payload, 10)
    );
    const data = res.data?.data ?? res.data;
    return mapReviewDto(data);
  }

  async deleteReviewTemplate(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ADMIN.STORE_REVIEW_TEMPLATE_DETAIL(id));
  }

  async listFaqTemplates(): Promise<FaqTemplateItem[]> {
    const res = await apiClient.get(API_ENDPOINTS.ADMIN.STORE_FAQ_TEMPLATES);
    const list = res.data?.data ?? res.data;
    return Array.isArray(list) ? list.map((row, idx) => mapFaqDto(row, idx)) : [];
  }

  async createFaqTemplate(payload: FaqTemplatePayload): Promise<FaqTemplateItem> {
    const res = await apiClient.post(
      API_ENDPOINTS.ADMIN.STORE_FAQ_TEMPLATES,
      buildFaqRequestBody(payload, 0)
    );
    const data = res.data?.data ?? res.data;
    return mapFaqDto(data);
  }

  async updateFaqTemplate(id: string, payload: FaqTemplatePayload): Promise<FaqTemplateItem> {
    const res = await apiClient.put(
      API_ENDPOINTS.ADMIN.STORE_FAQ_TEMPLATE_DETAIL(id),
      buildFaqRequestBody(payload, 10)
    );
    const data = res.data?.data ?? res.data;
    return mapFaqDto(data);
  }

  async deleteFaqTemplate(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.ADMIN.STORE_FAQ_TEMPLATE_DETAIL(id));
  }

  getDefaultFaqsForBrand(
    brandName?: string,
    templates?: FaqTemplateItem[]
  ): Array<{ question: string; answer: string }> {
    if (templates && templates.length > 0) {
      const defaults = templates.filter((item) => item.isDefault);
      if (defaults.length > 0) {
        return defaults.map((item) => ({
          question: applyBrandToken(item.questionTemplate, brandName),
          answer: applyBrandToken(item.answerTemplate, brandName),
        }));
      }
    }
    if (DEFAULT_FAQ_TEMPLATES.length > 0) {
      return buildDefaultStoreFaqs(brandName);
    }
    return [];
  }

  getStarterReviewsForBrand(
    brandName?: string,
    templates?: ReviewTemplateItem[]
  ): StoreCustomerReview[] {
    if (!templates || templates.length === 0) {
      return [];
    }

    const picked: ReviewTemplateItem[] = [];
    const targetCategories: ReviewTemplateCategory[] = ['savings', 'quality', 'balanced'];
    for (const cat of targetCategories) {
      const match = templates.find(
        (item) => item.category === cat && !picked.some((p) => p.id === item.id)
      );
      if (match) picked.push(match);
    }
    for (const item of templates) {
      if (picked.length >= 3) break;
      if (!picked.some((p) => p.id === item.id)) {
        picked.push(item);
      }
    }

    return picked.map((item) => ({
      reviewerName: item.reviewerName,
      reviewerAvatar: '',
      isVerified: item.isVerified,
      rating: item.rating,
      reviewDateLabel: item.reviewDateLabel,
      comment: applyBrandToken(item.commentTemplate, brandName),
      isActive: true,
    }));
  }
}

export const storeTemplateService = new StoreTemplateService();
export default storeTemplateService;
