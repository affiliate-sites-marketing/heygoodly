'use client';

import { Suspense } from 'react';
import PostsDirectoryView from '@/components/posts/PostsDirectoryView';

export default function PostsDirectoryPage() {
  return (
    <Suspense fallback={<div className="bg-[#f8fafc] min-h-screen py-12" />}>
      <PostsDirectoryView />
    </Suspense>
  );
}
