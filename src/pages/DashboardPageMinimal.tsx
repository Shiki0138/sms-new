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
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#1f2937',
          }}
        >
          🔍 最小限デバッグページ
        </h1>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>基本情報</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              ✅ React コンポーネントが正常にレンダリングされています
            </li>
            <li style={{ marginBottom: '8px' }}>
              📅 現在時刻: {new Date().toLocaleString('ja-JP')}
            </li>
            <li style={{ marginBottom: '8px' }}>
              🌐 URL: {window.location.href}
            </li>
            <li style={{ marginBottom: '8px' }}>
              🔧 User Agent: {navigator.userAgent.slice(0, 80)}...
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
            環境変数チェック
          </h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              Supabase URL:{' '}
              {import.meta.env.VITE_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}
            </li>
            <li style={{ marginBottom: '8px' }}>
              Supabase Anon Key:{' '}
              {import.meta.env.VITE_SUPABASE_ANON_KEY
                ? '✅ 設定済み'
                : '❌ 未設定'}
            </li>
            <li style={{ marginBottom: '8px' }}>
              NODE_ENV: {import.meta.env.MODE}
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
            ブラウザコンソール
          </h2>
          <p
            style={{
              backgroundColor: '#fef3c7',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            F12キーを押してブラウザのコンソールを開き、エラーメッセージを確認してください。
            このページが表示されている場合、基本的なReactレンダリングは動作しています。
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
            テストボタン
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                console.log('Test button clicked');
                alert('ボタンが正常に動作しています');
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              テストボタン
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ページリロード
            </button>

            <button
              onClick={() => (window.location.href = '/auth/login')}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              ログイン画面へ
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#f3f4f6',
            padding: '15px',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
            🚨 このページが表示されない場合
          </h3>
          <ol style={{ paddingLeft: '20px' }}>
            <li>JavaScript が無効になっている</li>
            <li>ビルドエラーが発生している</li>
            <li>ネットワーク接続の問題</li>
            <li>Vercelのデプロイエラー</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageMinimal;
