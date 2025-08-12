import React, { Suspense } from 'react';
import { useDashboardVariant } from '../contexts/DashboardVariantContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// すべてのダッシュボード実装を動的インポート（機能保持）
const DashboardPageSimple = React.lazy(() => import('./DashboardPageSimple'));
const DashboardPage = React.lazy(() => import('./DashboardPage'));
const DashboardPageDebug = React.lazy(() => import('./DashboardPageDebug'));
const DashboardPageSafe = React.lazy(() => import('./DashboardPageSafe'));
const DashboardPageEmergency = React.lazy(() => import('./DashboardPageEmergency'));
const DashboardPageMinimal = React.lazy(() => import('./DashboardPageMinimal'));
const DashboardPageFixed = React.lazy(() => import('./DashboardPageFixed'));
const DashboardPageWithDebug = React.lazy(() => import('./DashboardPageWithDebug'));

// バリアント設定パネル
const VariantSelector: React.FC = () => {
  const { variant, setVariant, availableVariants } = useDashboardVariant();
  const [showSelector, setShowSelector] = React.useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setShowSelector(!showSelector)}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
        title="ダッシュボード バリアント選択"
      >
        📊 {availableVariants.find(v => v.key === variant)?.name}
      </button>
      
      {showSelector && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border p-3 w-80 max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-3">ダッシュボード バリアント選択</h3>
          <div className="space-y-2">
            {availableVariants.map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setVariant(v.key);
                  setShowSelector(false);
                }}
                className={`w-full text-left p-2 rounded transition-colors ${
                  variant === v.key
                    ? 'bg-blue-100 border-blue-300 border'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {v.name}
                    {v.recommended && <span className="text-xs text-green-600 ml-1">推奨</span>}
                  </span>
                  {variant === v.key && <span className="text-blue-600">✓</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1">{v.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            設定は自動保存されます
          </div>
        </div>
      )}
    </div>
  );
};

// 統合ダッシュボード コンポーネント
const DashboardPageUnified: React.FC = () => {
  const { variant } = useDashboardVariant();

  // バリアントに応じてコンポーネントを選択（全機能保持）
  const renderDashboard = () => {
    const commonProps = { key: variant }; // リマウントを確実にするため

    switch (variant) {
      case 'simple':
        return <DashboardPageSimple {...commonProps} />;
      case 'full':
        return <DashboardPage {...commonProps} />;
      case 'debug':
        return <DashboardPageDebug {...commonProps} />;
      case 'safe':
        return <DashboardPageSafe {...commonProps} />;
      case 'emergency':
        return <DashboardPageEmergency {...commonProps} />;
      case 'minimal':
        return <DashboardPageMinimal {...commonProps} />;
      case 'fixed':
        return <DashboardPageFixed {...commonProps} />;
      case 'with-debug':
        return <DashboardPageWithDebug {...commonProps} />;
      default:
        // フォールバック：不明なバリアントの場合はシンプル版を使用
        console.warn(`Unknown dashboard variant: ${variant}, falling back to simple`);
        return <DashboardPageSimple {...commonProps} />;
    }
  };

  return (
    <div className="dashboard-unified">
      {/* バリアント選択UI（右上） */}
      <VariantSelector />
      
      {/* 選択されたダッシュボードをレンダリング */}
      <Suspense 
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">
              ダッシュボード（{variant}版）を読み込み中...
            </span>
          </div>
        }
      >
        {renderDashboard()}
      </Suspense>
      
      {/* デバッグ情報（開発環境のみ） */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          Dashboard: {variant}
        </div>
      )}
    </div>
  );
};

export default DashboardPageUnified;