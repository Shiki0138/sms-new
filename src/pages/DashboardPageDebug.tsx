import React from 'react';

const DashboardPage: React.FC = () => {
  console.log('DashboardPage rendering...');

  try {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          ダッシュボード（デバッグ中）
        </h1>
        <p className="text-gray-600">エラーの原因を調査中です...</p>
      </div>
    );
  } catch (error) {
    console.error('DashboardPage error:', error);
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">
          エラーが発生しました
        </h1>
        <p className="text-gray-600">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
};

export default DashboardPage;
