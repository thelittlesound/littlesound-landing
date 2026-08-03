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
    <div className="min-h-screen bg-[#F5EFE0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8DFC8] p-8 w-full max-w-sm">
        <h1 className="font-['Cormorant_Garamond'] text-3xl font-light text-[#0D5C6E] mb-1">
          Admin
        </h1>
        <p className="text-[#5A7A8A] text-sm font-['DM_Sans'] mb-6">Little Sound internal</p>

        {notAdmin && (
          <p className="text-red-500 text-xs font-['DM_Sans'] bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
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
            className="w-full border border-[#C5D8E8] rounded-xl px-4 py-3 text-sm font-['DM_Sans'] outline-none focus:border-[#0D5C6E]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full border border-[#C5D8E8] rounded-xl px-4 py-3 text-sm font-['DM_Sans'] outline-none focus:border-[#0D5C6E]"
          />

          {error && <p className="text-red-500 text-xs font-['DM_Sans']">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0D5C6E] text-white rounded-full py-3 text-sm font-['DM_Sans'] font-semibold hover:bg-[#1A7A8A] transition-colors disabled:opacity-60 mt-1"
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
