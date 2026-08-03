'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/site-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Incorrect password');
        setSubmitting(false);
        return;
      }

      window.location.href = next;
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0D5C6E] flex items-center justify-center px-4">
      <div className="bg-white rounded-[24px] shadow-[0_4px_32px_rgba(10,74,90,0.2)] w-full max-w-[400px] p-8 md:p-10">
        <h1 className="font-['Cormorant_Garamond'] text-[32px] font-light text-[#1C3A4A] mb-2">
          Little Sound
        </h1>
        <p className="text-[#3A5A6A] text-[14px] leading-relaxed mb-6">
          This site is currently private while we build. Enter the access password to continue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access password"
            autoFocus
            className="h-12 rounded-[12px] border-2 border-[#E8DFC8] px-4 text-[15px] font-['DM_Sans'] text-[#1C3A4A] bg-white w-full transition-colors focus:outline-none focus:border-[#0D5C6E]"
          />

          {error && (
            <p className="text-[13px] text-[#C0544A] bg-[#C0544A]/8 border border-[#C0544A]/20 rounded-[10px] px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`h-[48px] rounded-full bg-[#0D5C6E] text-white font-semibold text-[15px] transition-all duration-200 ${
              submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A7A8A]'
            }`}
          >
            {submitting ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={null}>
      <UnlockForm />
    </Suspense>
  );
}
