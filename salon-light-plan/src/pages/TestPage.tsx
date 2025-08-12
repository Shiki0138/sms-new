import React from 'react';

export default function TestPage() {
  const env = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Test Page</h1>
      <h2>Environment Variables:</h2>
      <pre>{JSON.stringify(env, null, 2)}</pre>
      <h2>Checks:</h2>
      <ul>
        <li>VITE_SUPABASE_URL: {env.supabaseUrl ? '✅ Set' : '❌ Not Set'}</li>
        <li>VITE_SUPABASE_ANON_KEY: {env.supabaseAnonKey ? '✅ Set' : '❌ Not Set'}</li>
        <li>Mode: {env.mode}</li>
        <li>Is Development: {env.dev ? 'Yes' : 'No'}</li>
        <li>Is Production: {env.prod ? 'Yes' : 'No'}</li>
      </ul>
      <h2>Window Location:</h2>
      <pre>{JSON.stringify({
        href: window.location.href,
        hostname: window.location.hostname,
        pathname: window.location.pathname,
      }, null, 2)}</pre>
    </div>
  );
}