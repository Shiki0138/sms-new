import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoadingProps {
  page?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ page }) => {
  const pageNames: Record<string, string> = {
    dashboard: 'ダッシュボード',
    customers: '顧客管理',
    reservations: '予約管理',
    messages: 'メッセージ',
    settings: '設定',
  };

  const pageName = page ? pageNames[page] || page : 'ページ';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 bg-purple-200 rounded-full animate-pulse" />
          </div>
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {pageName}を読み込んでいます...
        </h2>

        <div className="flex justify-center space-x-1 mt-4">
          <div
            className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="h-2 w-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};
