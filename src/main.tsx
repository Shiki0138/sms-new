import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

console.log('main.tsx: Starting application...');

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
console.log('main.tsx: Root element:', rootElement);

if (!rootElement) {
  console.error('main.tsx: Root element not found!');
  document.body.innerHTML =
    '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">アプリケーションの初期化に失敗しました。ページを再読み込みしてください。</div>';
} else {
  console.log('main.tsx: Creating React root...');
  try {
    const root = createRoot(rootElement);
    console.log('main.tsx: Rendering App component...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('main.tsx: App rendered successfully');
  } catch (error) {
    console.error('main.tsx: Error rendering app:', error);
  }
}
