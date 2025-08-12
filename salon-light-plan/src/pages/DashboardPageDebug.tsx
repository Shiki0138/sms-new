import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const DashboardPageDebug: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    console.log('DashboardPageDebug mounted');
    
    try {
      // Authコンテキストを安全に取得
      const authContext = useAuth();
      setDebugInfo({
        user: authContext?.user,
        tenant: authContext?.tenant,
        loading: authContext?.loading,
        error: authContext?.error,
      });
    } catch (err) {
      console.error('Error accessing auth context:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    // その他のデバッグ情報
    setDebugInfo(prev => ({
      ...prev,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
      isDev: import.meta.env.DEV,
    }));
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard Debug Page</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <pre className="bg-white p-4 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
          <button
            onClick={() => {
              sessionStorage.clear();
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ml-2"
          >
            Clear Storage & Reload
          </button>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPageDebug;