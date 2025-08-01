import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Prevent the default error handling
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent the default error handling
  event.preventDefault();
});

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML =
    '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">アプリケーションの初期化に失敗しました。ページを再読み込みしてください。</div>';
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
