'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // In a real app, verify this matches uid

    if (!code) {
      setStatus('error');
      return;
    }

    const exchangeCode = async () => {
      try {
        const exchangeFn = httpsCallable(functions, 'exchangeGoogleCode');
        await exchangeFn({ code });
        setStatus('success');
        setTimeout(() => router.push('/'), 2000);
      } catch (error) {
        console.error('Failed to exchange code', error);
        setStatus('error');
      }
    };

    exchangeCode();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl text-center max-w-sm w-full">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium">Connecting to Google...</h2>
            <p className="text-zinc-500 mt-2">Please wait while we secure your connection.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium">Connected!</h2>
            <p className="text-zinc-500 mt-2">Redirecting you to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-medium">Connection Failed</h2>
            <p className="text-zinc-500 mt-2">Something went wrong. Please try again.</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-6 w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Return Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
