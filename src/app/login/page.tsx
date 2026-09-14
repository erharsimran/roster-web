'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');

  const handleManualAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    localStorage.setItem('token', tokenInput.trim());
    router.replace('/dashboard');
  };

  const handleGoogleSSO = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.location.href = `${backendUrl}/auth/google`; // Triggers OAuth redirect
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-sm bg-card border border-card-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950">
            R
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">Roster Command</h1>
            <p className="text-[11px] text-muted-foreground">Enterprise Scheduling Platform</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSSO}
          className="w-full py-2 px-3 bg-muted hover:bg-neutral-750 text-foreground border border-card-border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Continue with Google Single Sign-On</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-muted" />
          <span className="text-[10px] uppercase font-mono text-muted-foreground">Developer Access</span>
          <div className="flex-1 h-px bg-muted" />
        </div>

        <form onSubmit={handleManualAuth} className="space-y-3">
          <input
            type="text"
            required
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste JWT token..."
            className="w-full px-3 py-2 bg-background border border-card-border rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500 text-foreground"
          />
          <button
            type="submit"
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}