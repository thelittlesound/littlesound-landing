'use client';

import { useState } from 'react';

export default function Hero() {
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

  const activities = [
    {
      icon: '⚽',
      bg: '#D6EEF2',
      name: 'Fremont Youth Soccer',
      provider: 'Seattle FC Academy',
      detail: 'Ages 7–12 · $280/wk · 0.6 mi',
      rating: '4.9',
      reviews: '124',
      tag: 'Open',
      tagColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      icon: '🎨',
      bg: '#F5EFE0',
      name: 'Phinney Arts Studio',
      provider: 'Phinney Ridge Arts',
      detail: 'Ages 6–14 · $95/mo · 1.1 mi',
      rating: '4.8',
      reviews: '89',
      tag: '2 spots left',
      tagColor: 'bg-amber-100 text-amber-700',
    },
    {
      icon: '🔬',
      bg: '#EBF2F8',
      name: 'Burke Museum STEM',
      provider: 'Burke Museum',
      detail: 'Ages 8–12 · $310/wk · 2.3 mi',
      rating: '4.7',
      reviews: '56',
      tag: 'Open',
      tagColor: 'bg-emerald-100 text-emerald-700',
    },
    {
      icon: '🎭',
      bg: '#F0EBF8',
      name: 'Seattle Children\'s Theatre',
      provider: 'SCT Drama Camp',
      detail: 'Ages 6–16 · $250/wk · 3.1 mi',
      rating: '4.9',
      reviews: '201',
      tag: 'Filling fast',
      tagColor: 'bg-red-100 text-red-600',
    },
  ];

  return (
    <section className="min-h-screen bg-[#0D5C6E] pt-24 pb-16 px-6 md:px-10 lg:px-16 flex items-center">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left — copy */}
        <div>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#C4A882] animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/70">
              Seattle Beta · Q3 2026
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-['Cormorant_Garamond'] text-[clamp(44px,5.5vw,72px)] font-light leading-[1.1] tracking-tight text-white mb-6">
            Every activity in Seattle,<br />
            <em className="italic text-[#C4A882]">in one place.</em>
          </h1>

          {/* Subhead */}
          <p className="text-white/70 text-lg leading-relaxed max-w-[460px] mb-5">
            Little Sound is Seattle&apos;s family activity platform. Search camps, classes, sports, and more — without opening a dozen tabs.
          </p>

          {/* Emotional stat hook */}
          <div className="border-l-2 border-[#C4A882]/50 pl-4 mb-10 max-w-[420px]">
            <p className="text-white/80 text-[15px] leading-relaxed font-['Cormorant_Garamond'] italic">
              &ldquo;Parents spend 8+ hours every season searching for activities across dozens of sites. That time belongs to your family.&rdquo;
            </p>
            <p className="text-[#C4A882] text-[12px] mt-2 font-semibold">&mdash; Kelly Sherman, Co-founder &amp; Seattle mom of two</p>
          </div>

          {/* Form */}
          {status === 'success' ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-5 max-w-[460px]">
              <p className="text-white font-semibold mb-1">You&apos;re on the list! 🎉</p>
              <p className="text-white/60 text-sm">We&apos;ll be in touch before the Seattle beta opens.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-[460px] mb-5">
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
                className="bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-6 py-4 text-[15px] whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                {status === 'loading' ? 'Joining…' : 'Get Early Access'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="text-red-300 text-sm mb-4">Something went wrong &mdash; please try again.</p>
          )}

          {/* Browse Discover */}
          <div className="mb-8">
            <a
              href="/discover"
              className="group inline-flex items-center gap-2 text-white/80 hover:text-white text-[15px] font-medium transition-colors"
            >
              <span className="border-b border-[#C4A882]/40 group-hover:border-[#C4A882] pb-0.5 transition-colors">
                Browse Seattle activities now
              </span>
              <span className="text-[#C4A882] transition-transform group-hover:translate-x-1">&rarr;</span>
            </a>
          </div>

          {/* Trust pills */}
          <div className="flex flex-wrap gap-5">
            {['Free to join', 'Founding family pricing', 'No spam, ever'].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-white/55 text-[13px]">
                <span className="text-[#C4A882] font-bold">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right — search results mockup */}
        <div className="hidden lg:flex justify-center items-center">
          <div className="w-[420px] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-white/10 transition-transform duration-500 hover:-translate-y-1">

            {/* Search bar header */}
            <div className="bg-[#0A4A5A] px-5 pt-5 pb-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 mb-3">
                <span className="text-white/50 text-[12px]">🔍</span>
                <span className="text-white/70 text-[12px]">Activities near Fremont, Seattle</span>
              </div>
              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { label: 'Age: 9', active: true },
                  { label: 'All Categories', active: false },
                  { label: 'Under $300/wk', active: true },
                  { label: 'Within 3 mi', active: false },
                ].map((f) => (
                  <span
                    key={f.label}
                    className={
                      f.active
                        ? 'whitespace-nowrap text-[10px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 bg-[#C4A882] text-white'
                        : 'whitespace-nowrap text-[10px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 bg-white/10 text-white/60'
                    }
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Results meta */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8DFC8]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A9AAA]">
                24 results near Fremont
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#1A7A8A] font-semibold">
                Sort: Best Match ▾
              </div>
            </div>

            {/* Results list */}
            <div className="px-4 py-3 space-y-2.5">
              {activities.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 bg-[#F5EFE0] border border-[#E8DFC8] rounded-[14px] px-3 py-3 cursor-pointer hover:border-[#1A7A8A]/30 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: item.bg }}
                  >
                    {item.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1C3A4A] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#7A9AAA] truncate">{item.provider}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#C4A882] font-semibold">★ {item.rating}</span>
                      <span className="text-[10px] text-[#7A9AAA]">({item.reviews})</span>
                      <span className="text-[10px] text-[#7A9AAA]">· {item.detail.split('·')[2]}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${item.tagColor}`}>
                      {item.tag}
                    </span>
                    <span className="text-[11px] font-bold text-[#1C3A4A]">
                      {item.detail.split('·')[1].trim()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="px-4 pb-4">
              <a
                href="/discover"
                className="relative z-20 block bg-[#0D5C6E] hover:bg-[#1A7A8A] rounded-[12px] px-4 py-3 text-center transition-colors cursor-pointer"
              >
                <span className="text-white text-[12px] font-semibold">Browse all activities &rarr;</span>
              </a>
            </div>

          </div>
        </div>

      </div>

    </section>
  );
}
