import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
  fetchBackendData,
  fetchPublicSettings,
  resolveSiteName,
  resolveSiteOrigin,
  stripHtmlToText,
} from '@/lib/seo/ogServer';

interface PostMetaDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  updatedAt?: string;
  category?: { name?: string } | string;
  categoryName?: string;
  authorName?: string;
  author?: { name?: string };
  tags?: Array<{ name?: string } | string>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug || '').trim();

  const [post, settings] = await Promise.all([
    fetchBackendData<PostMetaDto>(`/api/v1/public/posts/${encodeURIComponent(cleanSlug)}`),
    fetchPublicSettings(),
  ]);

  const origin = resolveSiteOrigin(settings);
  const siteName = resolveSiteName(settings);
  const postTitle = (post?.title || cleanSlug.replace(/-/g, ' ')).trim();
  const title = post?.metaTitle?.trim() || `${postTitle} | ${siteName}`;
  const description =
    post?.metaDescription?.trim() ||
    post?.excerpt?.trim() ||
    stripHtmlToText(post?.content, 160) ||
    `Independent hands-on review and buying guide from ${siteName}.`;

  const categoryName =
    (typeof post?.category === 'string' ? post.category : post?.category?.name) ||
    post?.categoryName ||
    'Editorial Reviews';
  const authorName = post?.author?.name || post?.authorName || `${siteName} Editorial`;
  const tagNames = Array.isArray(post?.tags)
    ? post!.tags
        .map((t) => (typeof t === 'string' ? t : t?.name || ''))
        .filter(Boolean)
    : [];

  const pageUrl = `${origin}/post/${encodeURIComponent(cleanSlug)}`;
  const ogImageUrl = `${origin}/og/post/${encodeURIComponent(cleanSlug)}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: 'article',
      url: pageUrl,
      siteName,
      title,
      description,
      locale: 'en_US',
      alternateLocale: ['en_CA', 'en_GB'],
      section: categoryName,
      authors: [authorName],
      ...(post?.publishedAt ? { publishedTime: post.publishedAt } : {}),
      ...(post?.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      ...(tagNames.length > 0 ? { tags: tagNames } : {}),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: postTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    other: {
      'pinterest-rich-pin': 'true',
    },
  };
}

export default function PostDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
