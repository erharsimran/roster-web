'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { invitationService } from '@/services/invitation.service';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Phone,
  ArrowRight,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';

function ClaimMemberInvitationView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Invitation metadata
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedBy, setInvitedBy] = useState('');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMessage('No invitation token found in link.');
      setLoading(false);
      return;
    }

    invitationService
      .validateToken(token)
      .then((res) => {
        if (res.type !== 'TENANT_MEMBER') {
          setErrorMessage('This token is reserved for workspace owners. Please use the organization onboarding link.');
          return;
        }
        setInviteEmail(res.email);
        setInvitedBy(res.invitedBy || 'Your Workspace Manager');
      })
      .catch((err) => {
        setErrorMessage(
          err.response?.data?.message || 'This invitation link is invalid or has expired.'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await invitationService.claimMemberInvite({
        token: token!,
        fullName: fullName.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      // Save token to localStorage and direct to dashboard
      localStorage.setItem('token', response.accessToken);
      router.replace('/dashboard');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to claim invitation. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-xs text-muted-foreground font-mono">
          Verifying invitation link...
        </p>
      </div>
    );
  }

  if (errorMessage && !inviteEmail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-red-500/20 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-white">Invalid Link</h2>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg text-xs"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-card-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-950">
            R
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">Join Workspace</h1>
            <p className="text-[11px] text-muted-foreground">
              Invited by <strong className="text-white">{invitedBy}</strong>
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleClaim} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={inviteEmail}
              className="w-full px-3 py-2 bg-muted border border-card-border rounded-lg text-xs font-mono text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
              Full Legal Name *
            </label>
            <div className="relative flex items-center">
              <UserCheck className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Mercer"
                className="w-full pl-9 pr-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                Password *
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
                Confirm *
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-muted-foreground uppercase mb-1">
              Phone Number (Optional)
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 019-2831"
                className="w-full pl-9 pr-3 py-2 bg-background border border-card-border rounded-lg text-xs text-foreground focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm mt-2"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowRight className="w-3.5 h-3.5" />
            )}
            <span>{submitting ? 'Creating Profile...' : 'Activate Account & Enter'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs font-mono text-muted-foreground">
          Loading verification view...
        </div>
      }
    >
      <ClaimMemberInvitationView />
    </Suspense>
  );
}