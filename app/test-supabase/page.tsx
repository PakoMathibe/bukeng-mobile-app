// app/test-supabase/page.tsx
'use client';

import { supabase } from '@/services/supabase/client';
import { useState } from 'react';

export default function TestSupabasePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test 1: Check if supabase client is initialized
      console.log('Supabase client:', supabase);
      
      // Test 2: Try to fetch merchants (public data)
      const { data: merchants, error: merchantsError } = await supabase
        .from('merchants')
        .select('*')
        .limit(5);
      
      if (merchantsError) throw merchantsError;
      
      // Test 3: Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      
      setResult({
        supabaseInitialized: !!supabase,
        merchants: merchants,
        merchantsCount: merchants?.length || 0,
        isAuthenticated: !!session,
        message: 'Connection successful!'
      });
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-teal-600 text-white px-4 py-2 rounded-lg mb-4"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 font-semibold">Error:</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 font-semibold">Success!</p>
          <pre className="text-xs mt-2 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Make sure your .env.local has:</p>
        <code className="block bg-gray-100 p-2 rounded mt-1">
          NEXT_PUBLIC_SUPABASE_URL=your_url<br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
        </code>
      </div>
    </div>
  );
}