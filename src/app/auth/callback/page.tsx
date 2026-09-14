'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      localStorage.setItem('token', token);
      router.replace('/dashboard');
    } else {
      console.error('OAuth callback failed or token missing:', error);
      router.replace(`/login?error=${encodeURIComponent(error || 'no_token')}`);
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-xs text-muted-foreground">
      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      FINALIZING AUTHENTICATION...
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-xs text-muted-foreground">
        LOADING SESSION...
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}