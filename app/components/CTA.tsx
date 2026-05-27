'use client';

import { useState } from 'react';

export default function CTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="bg-[#0A4A5A] py-24 px-6 md:px-10 lg:px-16 text-center">
      <div className="max-w-[640px] mx-auto">

        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest text-[#C4A882] mb-6">
          Join the Waitlist
        </p>

        {/* Headline */}
        <h2 className="font-['Cormorant_Garamond'] text-[clamp(36px,4.5vw,56px)] font-light leading-[1.15] tracking-tight text-white mb-5">
          Your Sunday nights<br />deserve better.
        </h2>

        <p className="text-[17px] text-white/55 leading-relaxed italic font-['Cormorant_Garamond'] mb-10">
          Join 100+ Seattle families who are done spending evenings on five different websites. Early access. Founding pricing. No spam.
        </p>

        {/* Form */}
        {status === 'success' ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-7 mb-8">
            <p className="text-white font-semibold text-lg mb-1">You're on the list! 🎉</p>
            <p className="text-white/60 text-sm">We'll be in touch before the Seattle beta opens this summer.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-[460px] mx-auto mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
              className="flex-1 bg-white text-[#1C3A4A] placeholder-[#7A9AAA] rounded-full px-5 py-4 text-[15px] outline-none focus:ring-2 focus:ring-[#C4A882]/50"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-white text-[#0A4A5A] hover:bg-[#F5EFE0] font-semibold rounded-full px-6 py-4 text-[15px] whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
            >
              {status === 'loading' ? 'Joining…' : 'Get Early Access →'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-300 text-sm mb-4">Something went wrong — please try again.</p>
        )}

        <p className="text-white/30 text-[12px] mb-8">
          We're Seattle parents. We hate spam as much as you do.
        </p>

        {/* Perks */}
        <div className="flex justify-center flex-wrap gap-7">
          {[
            'Free to join',
            'Seattle beta — Q3 2026',
            'Lock in founding family pricing',
          ].map((perk) => (
            <span key={perk} className="flex items-center gap-1.5 text-white/55 text-[13px]">
              <span className="text-[#C4A882] font-bold">✓</span>
              {perk}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}
