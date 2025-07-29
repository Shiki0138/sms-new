import React from 'react';

const DashboardPageMinimal: React.FC = () => {
  console.log('DashboardPageMinimal rendering...');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 システム正常動作中
          </h1>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                ✅ 基本システム確認
              </h2>
              <ul className="text-green-700 space-y-1">
                <li>• React アプリケーション: 正常</li>
                <li>• TypeScript コンパイル: 正常</li>
                <li>• Vite ビルド: 正常</li>
                <li>• Vercel デプロイ: 正常</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                📊 システム情報
              </h2>
              <div className="text-blue-700 space-y-1">
                <p>• 現在時刻: {new Date().toLocaleString('ja-JP')}</p>
                <p>• URL: {window.location.href}</p>
                <p>• User Agent: {navigator.userAgent.slice(0, 50)}...</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                🔧 次のステップ
              </h2>
              <div className="text-yellow-700 space-y-2">
                <p>
                  この画面が表示されれば、基本的なReactアプリは動作しています。
                </p>
                <p>
                  段階的に機能を追加して、どこでエラーが発生するか特定します。
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                ページリロード
              </button>

              <button
                onClick={() => console.log('Console test button clicked')}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                コンソールテスト
              </button>

              <a
                href="/auth/login"
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                ログイン画面
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageMinimal;
