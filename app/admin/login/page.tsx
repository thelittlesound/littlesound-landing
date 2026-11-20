'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const notAdmin = searchParams.get('error') === 'not_admin';

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
      setError('Incorrect email or password.');
      setSubmitting(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cream-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-cream-700 p-8 w-full max-w-sm">
        <h1 className="font-display text-3xl font-light text-teal-800 mb-1">
          Admin
        </h1>
        <p className="text-text-mid text-sm font-body mb-6">Little Sound internal</p>

        {notAdmin && (
          <p className="text-error-dark text-xs font-body bg-error-light border border-error/30 rounded-lg px-3 py-2 mb-4">
            That account isn&apos;t authorized for admin access.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full border border-blue-grey-300 rounded-xl px-4 py-3 text-sm font-body outline-none focus:border-teal-800"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full border border-blue-grey-300 rounded-xl px-4 py-3 text-sm font-body outline-none focus:border-teal-800"
          />

          {error && <p className="text-error-dark text-xs font-body">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-teal-800 text-white rounded-full py-3 text-sm font-body font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60 mt-1"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
