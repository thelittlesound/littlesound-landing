'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ProviderForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/providers/reset-password`,
    });

    setSubmitting(false);

    if (resetError) {
      setError('Something went wrong. Please try again.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="min-h-screen bg-[#F5EFE0] flex flex-col items-center px-4 py-16 pt-28">
        <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[420px] p-8 md:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#0D5C6E]/8 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">✉️</span>
          </div>
          <h1 className="font-['Cormorant_Garamond'] text-[28px] font-light text-[#1C3A4A] mb-3">
            Check your email
          </h1>
          <p className="text-[#3A5A6A] text-[15px] leading-relaxed mb-6">
            If an account exists for <strong>{email}</strong>, we sent a link to reset your
            password. It's valid for a limited time.
          </p>
          <Link
            href="/providers/login"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] px-8 hover:bg-[#1A7A8A] transition-colors"
          >
            Back to sign in
          </Link>
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
          Reset your<br />
          <em className="italic text-[#0D5C6E]">password.</em>
        </h1>
        <p className="text-[#3A5A6A] text-[15px] leading-relaxed max-w-[360px] mx-auto">
          Enter the email on your account and we'll send you a link to set a new password.
        </p>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[420px] p-8 md:p-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#0D5C6E]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
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
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#7A9AAA] mt-6">
          <Link href="/providers/login" className="text-[#1A7A8A] underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
