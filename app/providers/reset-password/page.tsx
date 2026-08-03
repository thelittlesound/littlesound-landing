'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type LinkStatus = 'checking' | 'valid' | 'invalid';

export default function ProviderResetPasswordPage() {
  const router = useRouter();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setLinkStatus('valid');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setLinkStatus((s) => (s === 'checking' ? 'valid' : s));
    });

    const timeout = setTimeout(() => {
      setLinkStatus((s) => (s === 'checking' ? 'invalid' : s));
    }, 3000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError('Could not update your password. Please try the reset link again.');
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.push('/providers/dashboard');
      router.refresh();
    }, 1500);
  }

  if (linkStatus === 'checking') {
    return (
      <main className="min-h-screen bg-[#F5EFE0] flex items-center justify-center px-4 py-16 pt-28">
        <p className="text-[#7A9AAA] text-[14px]">Checking your link…</p>
      </main>
    );
  }

  if (linkStatus === 'invalid') {
    return (
      <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[420px] p-8 md:p-10 text-center">
          <h1 className="font-['Cormorant_Garamond'] text-[28px] font-light text-[#1C3A4A] mb-3">
            Link expired or invalid
          </h1>
          <p className="text-[#3A5A6A] text-[15px] leading-relaxed mb-6">
            This password reset link is no longer valid. Request a new one below.
          </p>
          <Link
            href="/providers/forgot-password"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] px-8 hover:bg-[#1A7A8A] transition-colors"
          >
            Request a new link
          </Link>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[420px] p-8 md:p-10 text-center">
          <h1 className="font-['Cormorant_Garamond'] text-[28px] font-light text-[#1C3A4A] mb-3">
            Password updated
          </h1>
          <p className="text-[#3A5A6A] text-[15px] leading-relaxed">
            Taking you to your dashboard…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#0D5C6E]/8 border border-[#0D5C6E]/15 rounded-full px-4 py-1.5 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E]">Provider Portal</span>
        </div>
        <h1 className="font-['Cormorant_Garamond'] text-[clamp(32px,5vw,44px)] font-light leading-[1.1] tracking-tight text-[#1C3A4A] mb-4">
          Set a new<br />
          <em className="italic text-[#0D5C6E]">password.</em>
        </h1>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[420px] p-8 md:p-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#0D5C6E]">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="h-12 rounded-[12px] border-2 border-[#E8DFC8] px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#0D5C6E]">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="h-12 rounded-[12px] border-2 border-[#E8DFC8] px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E]"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#C0544A] bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`h-[52px] rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] tracking-[0.01em] transition-all duration-200 mt-1 ${
              submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A7A8A] hover:-translate-y-0.5'
            }`}
          >
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </main>
  );
}
