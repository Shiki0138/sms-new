import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

console.log('=== main.tsx: Starting application ===');
console.log('Environment check:', {
  NODE_ENV: import.meta.env.MODE,
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
});

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  console.error('Error message:', event.message);
  console.error('Error filename:', event.filename);
  console.error('Error line:', event.lineno);
  console.error('Error column:', event.colno);
  // Don't prevent default to see full error in console
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Don't prevent default to see full error in console
});

// Ensure root element exists
const rootElement = document.getElementById('root');
console.log('main.tsx: Root element:', rootElement);

if (!rootElement) {
  console.error('main.tsx: Root element not found!');
  document.body.innerHTML =
    '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; flex-direction: column;"><h2>🚨 システム初期化エラー</h2><p>アプリケーションの初期化に失敗しました。</p><button onclick="window.location.reload()">ページを再読み込み</button></div>';
} else {
  console.log('main.tsx: Creating React root...');
  try {
    const root = createRoot(rootElement);
    console.log('main.tsx: Rendering App component...');

    // Add immediate error display
    rootElement.innerHTML =
      '<div style="padding: 20px; text-align: center;">アプリケーション読み込み中...</div>';

    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('main.tsx: App rendered successfully');
  } catch (error) {
    console.error('main.tsx: Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h2 style="color: red;">⚠️ アプリケーションエラー</h2>
        <p>詳細: ${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()">再読み込み</button>
        <details style="margin-top: 20px; text-align: left;">
          <summary>技術的詳細</summary>
          <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px; white-space: pre-wrap;">
${error instanceof Error ? error.stack : String(error)}
          </pre>
        </details>
      </div>
    `;
  }
}
