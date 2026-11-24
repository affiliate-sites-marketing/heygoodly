import { SITE_NAME } from '@/constants/site';

export type FaqTemplateCategory = 'promo' | 'shipping' | 'returns' | 'discounts' | 'custom';
export type ReviewTemplateCategory = 'savings' | 'quality' | 'shipping' | 'balanced' | 'custom';

export interface FaqTemplateItem {
  id: string;
  category: FaqTemplateCategory;
  title: string;
  questionTemplate: string;
  answerTemplate: string;
  isDefault?: boolean;
  isCustom?: boolean;
  sortOrder?: number;
}

export interface ReviewTemplateItem {
  id: string;
  category: ReviewTemplateCategory;
  title: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  reviewDateLabel: string;
  isVerified: boolean;
  commentTemplate: string;
  isCustom?: boolean;
  sortOrder?: number;
}

/** Replaces `{brand}` placeholders with the active store name. */
export function applyBrandToken(text: string, brandName?: string): string {
  const cleanBrand = (brandName || '').trim() || 'this store';
  return (text || '').replace(/\{brand\}/gi, cleanBrand);
}

/** Generalizes an authored FAQ/review into a reusable `{brand}` template. */
export function extractBrandToken(text: string, brandName?: string): string {
  const cleanBrand = (brandName || '').trim();
  if (!cleanBrand || cleanBrand.length < 2) return (text || '').trim();
  const escaped = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text || '').trim().replace(new RegExp(escaped, 'gi'), '{brand}');
}

export const DEFAULT_FAQ_TEMPLATES: FaqTemplateItem[] = [
  {
    id: 'faq-default-apply',
    category: 'promo',
    title: 'How to Redeem Promo Code',
    questionTemplate: 'How do I apply a {brand} promo code at checkout?',
    answerTemplate: `Click 'Get Code' on ${SITE_NAME} to copy the code and visit the official {brand} checkout page. Paste the code into the Promo Code or Discount field and click Apply to see your instant savings.`,
    isDefault: true,
  },
  {
    id: 'faq-default-troubleshoot',
    category: 'promo',
    title: 'Troubleshooting Coupon Errors',
    questionTemplate: "Why isn't my {brand} coupon code working?",
    answerTemplate:
      'Codes can expire quickly or have minimum spend requirements and brand exclusions. Make sure your cart matches the offer terms, check for extra spaces when pasting, and try another active {brand} promo code listed above.',
    isDefault: true,
  },
  {
    id: 'faq-default-stack',
    category: 'promo',
    title: 'Stacking Coupons & Sales',
    questionTemplate: 'Can I stack multiple {brand} coupon codes on one order?',
    answerTemplate:
      '{brand} typically allows one promo code per checkout, though verified codes can often be combined with sitewide markdowns, seasonal bundles, or free shipping thresholds.',
    isDefault: true,
  },
  {
    id: 'faq-default-shipping',
    category: 'shipping',
    title: 'Free Shipping & Welcome Offer',
    questionTemplate: 'Does {brand} offer free shipping or first-order discounts?',
    answerTemplate:
      'Yes—{brand} frequently provides free standard shipping on qualifying orders above their minimum threshold, plus welcome promo codes for first-time newsletter or SMS subscribers.',
    isDefault: true,
  },
  {
    id: 'faq-default-verified',
    category: 'discounts',
    title: 'Deal Audit & Freshness',
    questionTemplate: 'How often are {brand} deals and promo codes verified?',
    answerTemplate: `Our ${SITE_NAME} editorial team regularly tests and audits {brand} promotions to remove expired vouchers and keep current storewide offers and exclusive discount codes accurate.`,
    isDefault: true,
  },
];

export const FAQ_TEMPLATE_LIBRARY: FaqTemplateItem[] = [
  ...DEFAULT_FAQ_TEMPLATES,
  {
    id: 'faq-extra-returns',
    category: 'returns',
    title: 'Return & Refund Window',
    questionTemplate: "What is {brand}'s return and refund policy?",
    answerTemplate:
      '{brand} provides a standard return period for unused products in original packaging. Always review the official policy link in the {brand} footer for exact return label fees and refund processing times.',
  },
  {
    id: 'faq-extra-student',
    category: 'discounts',
    title: 'Student, Military & VIP Savings',
    questionTemplate: 'Does {brand} offer a student, military, or first-responder discount?',
    answerTemplate:
      'Shoppers who qualify for student, military, educator, or healthcare status can check {brand} verification partners at checkout to unlock dedicated ongoing percentage discounts.',
  },
  {
    id: 'faq-extra-seasonal',
    category: 'promo',
    title: 'Best Time to Shop Major Sales',
    questionTemplate: 'When does {brand} launch its biggest seasonal sales?',
    answerTemplate:
      'The largest {brand} discounts typically appear during seasonal clearance events, holiday weekends, Black Friday, and Cyber Monday. Bookmark this page to catch early-access codes.',
  },
  {
    id: 'faq-extra-newsletter',
    category: 'discounts',
    title: 'Email Signup Welcome Bonus',
    questionTemplate: 'How can I claim a {brand} new-customer discount code?',
    answerTemplate:
      'Sign up for the official {brand} email list or SMS club on their homepage to receive a single-use welcome code, commonly valid for 10% to 20% off regular-priced items.',
  },
  {
    id: 'faq-extra-support',
    category: 'shipping',
    title: 'Order Tracking & Support',
    questionTemplate: 'How do I track my {brand} shipment or contact support?',
    answerTemplate:
      'Once your order ships, {brand} sends a tracking link via email. If you need to update shipping details or ask about a missed promo code, contact their support team via the official Help Center.',
  },
];

export function buildDefaultStoreFaqs(brandName?: string): Array<{ question: string; answer: string }> {
  return DEFAULT_FAQ_TEMPLATES.map((tpl) => ({
    question: applyBrandToken(tpl.questionTemplate, brandName),
    answer: applyBrandToken(tpl.answerTemplate, brandName),
  }));
}
