import React from 'react';
import { X } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';

const OnboardingOverlay: React.FC = () => {
  const { isOnboardingActive, completeOnboarding } = useOnboarding();

  if (!isOnboardingActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            サロン管理システムへようこそ
          </h2>
          <button
            onClick={completeOnboarding}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600">
            このアプリケーションで、予約管理、顧客管理、メッセージ送信など、
            サロン運営に必要な機能をすべて管理できます。
          </p>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800 mb-2">主な機能:</h3>
            <ul className="space-y-1 text-purple-700 text-sm">
              <li>• 予約の登録と管理</li>
              <li>• 顧客情報の管理</li>
              <li>• メッセージの送受信</li>
              <li>• 売上レポートの確認</li>
            </ul>
          </div>

          <button
            onClick={completeOnboarding}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            使い始める
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
