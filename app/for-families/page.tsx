'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';

const CATEGORY_TILES = [
  { emoji: '⚽', name: 'Sports & Fitness',  filter: 'Sports' },
  { emoji: '🎨', name: 'Arts & Crafts',     filter: 'Arts' },
  { emoji: '🏊', name: 'Swimming',          filter: 'Swimming' },
  { emoji: '🏕️', name: 'Camps & Outdoors', filter: 'Outdoor' },
  { emoji: '🧠', name: 'STEM & Academics',  filter: 'STEM' },
  { emoji: '🎵', name: 'Music & Dance',     filter: 'Music' },
];

const BENEFITS = [
  {
    emoji: '🔍',
    title: 'One search, every option',
    body: '81+ Seattle activities across 10 categories, all searchable by age, neighborhood, and price. No more cross-referencing six different websites.',
  },
  {
    emoji: '🎯',
    title: 'Built for your kid',
    body: 'Filter by age, category, and neighborhood. See only what actually fits your family — not every activity in the city.',
  },
  {
    emoji: '✅',
    title: 'Actually up to date',
    body: 'Provider info, age ranges, and pricing are verified regularly. What you see is what you get — no outdated listings.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: '🔍',
    title: 'Search by age and category',
    body: "Tell us what your kid is into and how old they are. We'll show you exactly what's available in Seattle — sorted and filtered for your family.",
  },
  {
    num: '02',
    icon: '📋',
    title: 'Compare your options',
    body: 'Browse providers side by side — prices, age ranges, neighborhoods, and descriptions all in one view. No more tab chaos.',
  },
  {
    num: '03',
    icon: '🤝',
    title: 'Connect with the right fit',
    body: "Click through to providers directly. You'll have everything you need to make a confident choice before you reach out.",
  },
];

const PLAN_FEATURES = [
  'Full access to all Seattle activity listings',
  'Filter by age, category, neighborhood, and price',
  'Verified provider details and direct links',
  'Early access to new features as we launch',
  'Priority support from the Little Sound team',
  'Price locked in at founding rate — forever',
];

export default function ForFamilies() {
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
    <main>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D5C6E]/95 backdrop-blur-sm border-b border-white/10 px-6 md:px-10 lg:px-16 h-16 flex items-center justify-between">
        <Link href="/" className="font-['Cormorant_Garamond'] text-xl font-semibold text-white tracking-tight">
          Little Sound
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/discover" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Browse Activities
          </Link>
          <a
            href="#waitlist"
            className="bg-[#C4A882] hover:bg-[#A8865A] text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors"
          >
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen bg-[#0D5C6E] pt-32 pb-20 px-6 md:px-10 lg:px-16 flex items-center">
        <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C4A882]">For Families</span>
            </div>

            <h1 className="font-['Cormorant_Garamond'] text-[clamp(40px,5vw,68px)] font-light leading-[1.1] tracking-tight text-white mb-6">
              Everything your kid<br />
              <em className="italic text-[#C4A882]">could want to do.</em>
            </h1>

            <p className="text-white/70 text-lg leading-relaxed max-w-[480px] mb-10">
              Little Sound is Seattle&apos;s family activity platform. Search camps, classes, and sports by age, neighborhood, and price — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center gap-2 bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
              >
                Join the Waitlist →
              </a>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 border border-white/20"
              >
                Browse Activities
              </Link>
            </div>

            <div className="flex flex-wrap gap-5">
              {['Free to join', 'Seattle beta — Q3 2026', '$29/yr founding family pricing'].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-white/55 text-[13px]">
                  <span className="text-[#C4A882] font-bold">✓</span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right — stat cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[
              { value: '81+', label: 'Activities listed', sub: 'across Seattle' },
              { value: '10', label: 'Categories', sub: 'from sports to STEM' },
              { value: '57+', label: 'Providers', sub: 'verified and active' },
              { value: '100+', label: 'Families', sub: 'already on the waitlist' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/8 border border-white/10 rounded-[20px] p-8"
              >
                <p className="font-['Cormorant_Garamond'] text-[52px] font-light text-white leading-none mb-2">
                  {stat.value}
                </p>
                <p className="text-white/80 text-[15px] font-semibold mb-1">{stat.label}</p>
                <p className="text-white/40 text-[13px]">{stat.sub}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">Why families love it</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A]">
              Everything in one place.<br />
              <em className="italic text-[#0D5C6E]">Finally.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-[#F5EFE0] rounded-[20px] p-8 border border-[#E8DFC8]"
              >
                <span className="text-4xl mb-5 block">{b.emoji}</span>
                <h3 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1C3A4A] mb-3">
                  {b.title}
                </h3>
                <p className="text-[15px] text-[#3A5A6A] leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-[#F5EFE0] py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">How it works</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] max-w-[480px]">
              From search to sign-up<br />
              <em className="italic text-[#0D5C6E]">in minutes.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-[20px] p-9 border border-[#E8DFC8]"
              >
                <p className="font-['Cormorant_Garamond'] text-[52px] font-semibold text-[#1C3A4A]/8 leading-none mb-4">
                  {step.num}
                </p>
                <span className="text-3xl mb-5 block">{step.icon}</span>
                <h3 className="font-['Cormorant_Garamond'] text-[20px] font-semibold text-[#1C3A4A] mb-3">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-[1.8] text-[#3A5A6A]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY TEASER ── */}
      <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">What you can find</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A]">
              Activities for every interest.
            </h2>
            <p className="text-[17px] text-[#3A5A6A] max-w-xl mx-auto mt-4">
              From swimming to coding to theater — if it exists in Seattle, you&apos;ll find it here.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {CATEGORY_TILES.map((cat) => (
              <Link
                key={cat.name}
                href={`/discover?category=${encodeURIComponent(cat.filter)}`}
                className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[20px] p-6 text-center hover:bg-[#EDE5D4] hover:border-[#0D5C6E]/20 transition-all duration-200 group no-underline"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {cat.emoji}
                </div>
                <p className="text-[13px] font-semibold text-[#1C3A4A]">{cat.name}</p>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 text-[#0D5C6E] hover:text-[#1A7A8A] font-semibold text-[15px] transition-colors group"
            >
              <span className="border-b border-[#0D5C6E]/40 group-hover:border-[#1A7A8A] pb-0.5">
                Browse all 10 categories →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="bg-[#C5D8E8] py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[860px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">Founding Family Pricing</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] mb-4">
              Lock in your rate before we launch.
            </h2>
            <p className="text-[17px] text-[#3A5A6A] max-w-xl mx-auto">
              Founding families get full access at $29/yr — and that price is locked in forever. When Little Sound opens to the public, the rate goes up.
            </p>
          </div>

          <div className="bg-white rounded-[28px] p-10 md:p-14 border border-[#C4A882]/30 shadow-sm max-w-[580px] mx-auto">
            {/* Price */}
            <div className="flex items-end gap-2 mb-2">
              <span className="font-['Cormorant_Garamond'] text-[72px] font-light text-[#0D5C6E] leading-none">$29</span>
              <div className="mb-3">
                <p className="text-[#3A5A6A] text-[15px] font-medium">/year</p>
                <p className="text-[#C4A882] text-[13px] font-semibold">Founding family rate</p>
              </div>
            </div>
            <p className="text-[13px] text-[#7A9AAA] mb-8 line-through">Regular price: $49+/yr</p>

            {/* Features */}
            <ul className="space-y-3 mb-10">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[14px] text-[#1C3A4A]">
                  <span className="text-[#0D5C6E] font-bold mt-0.5 flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href="#waitlist"
              className="block w-full text-center bg-[#0D5C6E] hover:bg-[#1A7A8A] text-white font-semibold rounded-full py-4 text-[15px] transition-colors"
            >
              Join Free — Lock in $29/yr →
            </a>
            <p className="text-center text-[12px] text-[#7A9AAA] mt-3">
              Free to join the waitlist. Pricing applies at launch.
            </p>
          </div>
        </div>
      </section>

      {/* ── WAITLIST ── */}
      <section id="waitlist" className="bg-[#0A4A5A] py-24 px-6 md:px-10 lg:px-16 text-center">
        <div className="max-w-[640px] mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C4A882] mb-6">
            Join the Waitlist
          </p>
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4vw,54px)] font-light leading-[1.15] tracking-tight text-white mb-5">
            Your Sunday nights<br />
            <em className="italic text-[#C4A882]">deserve better.</em>
          </h2>
          <p className="text-[17px] text-white/55 leading-relaxed font-['Cormorant_Garamond'] italic mb-10">
            Join 100+ Seattle families already on the list. Early access. Founding pricing. No spam.
          </p>

          {status === 'success' ? (
            <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-7 mb-8">
              <p className="text-white font-semibold text-lg mb-1">You&apos;re on the list! 🎉</p>
              <p className="text-white/60 text-sm">We&apos;ll be in touch before the Seattle beta opens this summer.</p>
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

          <p className="text-white/30 text-[12px]">
            We&apos;re Seattle parents. We hate spam as much as you do.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
