'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { safeNext } from '@/lib/safe-next';

function ProviderLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only same-site paths — never bounce a freshly signed-in user off-site.
  const next = safeNext(searchParams.get('next'), '/providers/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes('confirm')
          ? 'Please confirm your email before signing in — check your inbox for the link.'
          : 'Incorrect email or password.'
      );
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cream-500 flex flex-col items-center px-4 py-16 pt-28">

      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-teal-800/[0.08] border border-teal-800/15 rounded-full px-4 py-1.5 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-800">Provider Portal</span>
        </div>
        <h1 className="font-display text-[clamp(32px,5vw,52px)] font-light leading-[1.1] tracking-tight text-text-dark mb-4">
          Welcome back<br />
          <em className="italic text-teal-800">to Little Sound.</em>
        </h1>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.09)] w-full max-w-[420px] p-8 md:p-10">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-teal-800">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-12 rounded-[12px] border-2 border-cream-700 px-4 text-[15px] font-body text-text-dark bg-white w-full transition-colors focus:outline-none focus:border-teal-800"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-teal-800">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-12 rounded-[12px] border-2 border-cream-700 px-4 text-[15px] font-body text-text-dark bg-white w-full transition-colors focus:outline-none focus:border-teal-800"
            />
            <Link
              href="/providers/forgot-password"
              className="self-end text-[12px] text-teal-700 hover:text-teal-800 underline underline-offset-2 -mt-0.5"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="text-[13px] text-error bg-error/[0.08] border border-error/20 rounded-[10px] px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`h-[52px] rounded-full bg-teal-800 text-white font-semibold text-[15px] tracking-[0.01em] transition-all duration-200 mt-1 ${
              submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-700 hover:-translate-y-0.5'
            }`}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[13px] text-text-muted mt-6">
          New to Little Sound?{' '}
          {/* Carry `next` so someone arriving from a claim link lands back on it after signing up. */}
          <Link
            href={next === '/providers/dashboard' ? '/providers/signup' : `/providers/signup?next=${encodeURIComponent(next)}`}
            className="text-teal-700 underline underline-offset-2"
          >
            List your activity
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ProviderLoginPage() {
  return (
    <Suspense fallback={null}>
      <ProviderLoginForm />
    </Suspense>
  );
}
