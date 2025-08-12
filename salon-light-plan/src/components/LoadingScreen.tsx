import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '読み込み中...',
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50">
      <div className="text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-32 bg-purple-200 rounded-full animate-pulse" />
          </div>
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-16 w-16 text-purple-600 animate-spin" />
          </div>
        </div>

        <div className="mt-8 space-y-2">
          <h2 className="text-xl font-bold text-gray-800">{message}</h2>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <p className="text-sm">サロン管理システム</p>
            <Sparkles className="h-5 w-5 text-purple-500" />
          </div>
        </div>

        <div className="mt-8 flex justify-center space-x-2">
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

export default LoadingScreen;
