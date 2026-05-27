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
          <h1
            className="font-['Cormorant_Garamond'] text-[clamp(44px,5.5vw,72px)] font-light leading-[1.1] tracking-tight text-white mb-6"
          >
            Your kids deserve<br />
            more of <em className="italic text-[#C4A882]">your time.</em>
          </h1>

          {/* Subhead */}
          <p className="text-white/70 text-lg leading-relaxed max-w-[460px] mb-5">
            Little Sound finds, compares, and books kids' activities in Seattle — so your Sunday nights belong to your family again.
          </p>

          {/* Founder hook */}
          <p className="border-l-2 border-[#C4A882]/50 pl-4 text-white/60 italic text-[15px] leading-relaxed font-['Cormorant_Garamond'] max-w-[460px] mb-10">
            "I didn't build a company because I had a brilliant idea. I built it because I was sick of spending Sunday evenings on five different websites instead of with my kids." — Kelly, co-founder & Seattle mom of two
          </p>

          {/* Form */}
          {status === 'success' ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-5 max-w-[460px]">
              <p className="text-white font-semibold mb-1">You're on the list! 🎉</p>
              <p className="text-white/60 text-sm">We'll be in touch before the Seattle beta opens.</p>
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
            <p className="text-red-300 text-sm mb-4">Something went wrong — please try again.</p>
          )}

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

        {/* Right — app mockup */}
        <div className="hidden lg:flex justify-center items-center">
          <div className="w-[300px] bg-white rounded-[28px] shadow-2xl overflow-hidden border border-white/10 animate-[float_7s_ease-in-out_infinite]">
            {/* Card header */}
            <div className="bg-[#0A4A5A] px-5 py-5">
              <p className="text-white/50 text-[11px] mb-1">Good morning, Kelly 👋</p>
              <p className="text-white font-['Cormorant_Garamond'] text-[17px] font-semibold">Activities near Fremont</p>
              <div className="mt-3 bg-white/10 rounded-xl px-3 py-2 text-[11px] text-white/55 flex items-center gap-2">
                🌧️ Rainy weekend ahead — great time to book indoors
              </div>
            </div>
            {/* Card body */}
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A9AAA] mb-3">
                Recommended for Maya, age 9
              </p>
              {[
                { icon: '⚽', bg: '#D6EEF2', name: 'Fremont Youth Soccer', detail: 'Ages 7–12 · $280/wk · 0.6 mi', tag: 'Open', tagColor: 'bg-[#D6EEF2] text-[#0D5C6E]' },
                { icon: '🎨', bg: '#F5EFE0', name: 'Phinney Arts Studio', detail: 'Ages 6–14 · $95/mo · 1.1 mi', tag: '2 left', tagColor: 'bg-amber-100 text-amber-700' },
                { icon: '🔬', bg: '#EBF2F8', name: 'Burke Museum STEM', detail: 'Ages 8–12 · $310/wk · 2.3 mi', tag: 'Open', tagColor: 'bg-[#D6EEF2] text-[#0D5C6E]' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 bg-[#F5EFE0] border border-[#E8DFC8] rounded-[13px] px-3 py-2.5 mb-2">
                  <div className="w-9 h-9 rounded-[9px] flex items-center justify-center text-base flex-shrink-0" style={{ background: item.bg }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1C3A4A] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#7A9AAA]">{item.detail}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${item.tagColor}`}>
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-0.8deg); }
          50%       { transform: translateY(-14px) rotate(-0.8deg); }
        }
      `}</style>
    </section>
  );
}
