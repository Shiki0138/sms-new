import React from 'react';

const DashboardPageMinimal: React.FC = () => {
  console.log('DashboardPageMinimal rendering...');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ color: '#1f2937', marginBottom: '20px' }}>
        最小限ダッシュボード
      </h1>

      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ color: '#374151', marginBottom: '10px' }}>システム状況</h2>
        <p style={{ color: '#6b7280' }}>
          React コンポーネントが正常に動作しています
        </p>
        <p style={{ color: '#6b7280' }}>
          現在時刻: {new Date().toLocaleString('ja-JP')}
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ color: '#374151', marginBottom: '10px' }}>テスト情報</h2>
        <ul style={{ color: '#6b7280', listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '5px' }}>✅ React レンダリング: 正常</li>
          <li style={{ marginBottom: '5px' }}>✅ CSS スタイル: 正常</li>
          <li style={{ marginBottom: '5px' }}>✅ JavaScript 実行: 正常</li>
          <li style={{ marginBottom: '5px' }}>
            ✅ コンソールログ: 確認してください
          </li>
        </ul>
      </div>

      <div
        style={{
          backgroundColor: '#fef3c7',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #f59e0b',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ color: '#92400e', marginBottom: '10px' }}>
          ⚠️ デバッグ情報
        </h2>
        <p style={{ color: '#92400e' }}>
          この画面が表示されている場合、React は正常に動作しています。
        </p>
        <p style={{ color: '#92400e' }}>
          白画面の原因は他のコンポーネントまたはコンテキストにあります。
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ color: '#374151', marginBottom: '10px' }}>アクション</h2>
        <button
          onClick={() => {
            console.log('ボタンクリック:', new Date().toISOString());
            alert('ボタンが正常に動作しています！');
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          テストボタン
        </button>

        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '10px',
          }}
        >
          ページリロード
        </button>

        <a
          href="/auth/login"
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '10px 20px',
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
          }}
        >
          ログイン画面へ
        </a>
      </div>
    </div>
  );
};

export default DashboardPageMinimal;
