/**
 * /library/search?q=xxx — 搜索结果页
 * 静态导出兼容：检索在客户端进行（useSearchParams + Suspense）
 */

import { Suspense } from 'react';
import SearchClient from './SearchClient';

export const metadata = {
  title: '搜索 · 古籍原典库',
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }} />
      }
    >
      <SearchClient />
    </Suspense>
  );
}
