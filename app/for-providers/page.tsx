'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';

const BENEFITS = [
  {
    emoji: '🔍',
    title: 'Get discovered organically',
    body: 'Families searching by age, neighborhood, and category find you directly — no ad budget, no algorithm to beat. Just parents looking for exactly what you offer.',
  },
  {
    emoji: '📋',
    title: 'You may already be listed',
    body: "We've catalogued 80+ Seattle providers. Your listing might already be live. Claim it, keep the details accurate, and start appearing in search results.",
  },
  {
    emoji: '🤝',
    title: 'Free during the beta',
    body: 'List for free through the Seattle beta launch. Paid features — booking, CRM, analytics — come only after families are actively using the platform.',
  },
  {
    emoji: '📍',
    title: 'Built for Seattle first',
    body: "We're not trying to be everything everywhere. We're going deep in Seattle — building real density and real family trust before expanding.",
  },
];

const STEPS = [
  {
    num: '01',
    icon: '📬',
    title: 'Claim or submit your listing',
    body: 'Email us at hello@thelittlesound.com. If you\'re already catalogued, we\'ll get you verified in 24 hours. New to the platform? We\'ll set you up.',
  },
  {
    num: '02',
    icon: '✏️',
    title: 'Keep your details current',
    body: 'Update your age ranges, pricing, availability windows, and descriptions any time. Accurate listings get more clicks — and more families in the door.',
  },
  {
    num: '03',
    icon: '📈',
    title: 'Get found by the right families',
    body: "When a parent searches for swimming lessons for a 7-year-old near Fremont, you show up. No middlemen, no commission on discovery — just a direct connection.",
  },
];

const FAQS = [
  {
    q: 'Is my listing already on Little Sound?',
    a: "Probably. We've researched and catalogued 80+ Seattle activity providers. Search for your business on our Discover page — if you're there, reach out to claim and verify your listing.",
  },
  {
    q: 'What does it cost?',
    a: 'Listing is free during the Seattle beta. We plan to introduce paid features — enhanced listings, booking tools, and provider analytics — after launch. Early partners lock in preferred rates.',
  },
  {
    q: 'Do you take a commission on bookings?',
    a: 'Not during the beta. Families connect with you directly through your own website or contact info. Future booking features will include a commission, and we\'ll be transparent about pricing before that changes.',
  },
  {
    q: 'What kinds of providers are on Little Sound?',
    a: 'Sports leagues, swim schools, arts studios, camps, STEM programs, music and dance studios, theater programs, language immersion classes, and more. If Seattle families are searching for it, we want it listed.',
  },
];

export default function ForProviders() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main>

      {/* ── HERO ── */}
      <section className="min-h-screen bg-[#0D5C6E] pt-32 pb-20 px-6 md:px-10 lg:px-16 flex items-center">
        <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#C4A882]">For Providers</span>
            </div>

            <h1 className="font-['Cormorant_Garamond'] text-[clamp(40px,5vw,68px)] font-light leading-[1.1] tracking-tight text-white mb-6">
              Families are searching.<br />
              <em className="italic text-[#C4A882]">Be where they look.</em>
            </h1>

            <p className="text-white/70 text-lg leading-relaxed max-w-[480px] mb-10">
              Little Sound is Seattle&apos;s family activity platform. 100+ families are already on the waitlist — and they&apos;re searching for exactly what you offer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <a
                href="mailto:hello@thelittlesound.com"
                className="inline-flex items-center justify-center gap-2 bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
              >
                Claim Your Listing →
              </a>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 border border-white/20"
              >
                See How We List Providers
              </Link>
            </div>

            <div className="flex flex-wrap gap-5">
              {['Free to list', 'No ad spend required', 'Seattle beta — Q3 2026'].map((item) => (
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
              { value: '100+', label: 'Families on waitlist', sub: 'actively searching' },
              { value: '80+', label: 'Providers listed', sub: 'yours may already be there' },
              { value: '10', label: 'Categories', sub: 'across all activity types' },
              { value: '$600+', label: 'Monthly spend', sub: 'average Seattle family' },
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
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">Why providers choose Little Sound</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A]">
              Less marketing work.<br />
              <em className="italic text-[#0D5C6E]">More families through the door.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-[#F5EFE0] rounded-[20px] p-8 border border-[#E8DFC8]"
              >
                <span className="text-4xl mb-5 block">{b.emoji}</span>
                <h3 className="font-['Cormorant_Garamond'] text-[20px] font-semibold text-[#1C3A4A] mb-3">
                  {b.title}
                </h3>
                <p className="text-[14px] text-[#3A5A6A] leading-relaxed">{b.body}</p>
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
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] max-w-[520px]">
              Claim your listing.<br />
              <em className="italic text-[#0D5C6E]">Start getting found.</em>
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

      {/* ── PRICING ── */}
      <section className="bg-[#C5D8E8] py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[860px] mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">Pricing</p>
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] mb-5">
            Free to start. Paid when it pays off.
          </h2>
          <p className="text-[17px] text-[#3A5A6A] max-w-xl mx-auto mb-14">
            We don&apos;t charge until families are actually booking. List for free during the Seattle beta — we grow together.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Beta plan */}
            <div className="bg-white rounded-[24px] p-10 border border-[#C4A882]/30 shadow-sm relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-[#0D5C6E] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                Available now
              </div>
              <p className="font-['Cormorant_Garamond'] text-[52px] font-light text-[#0D5C6E] leading-none mb-1">Free</p>
              <p className="text-[#C4A882] text-[13px] font-semibold mb-8">Seattle beta</p>
              <ul className="space-y-3 text-[14px] text-[#1C3A4A]">
                {[
                  'Full listing on Little Sound',
                  'Appear in family search results',
                  'Age, category & neighborhood filters',
                  'Direct link to your website',
                  'Provider verification badge',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="text-[#0D5C6E] font-bold mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth plan */}
            <div className="bg-[#0D5C6E] rounded-[24px] p-10 relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-[#C4A882] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                Coming soon
              </div>
              <p className="font-['Cormorant_Garamond'] text-[52px] font-light text-white leading-none mb-1">Pro</p>
              <p className="text-[#C4A882] text-[13px] font-semibold mb-8">Post-launch · pricing TBD</p>
              <ul className="space-y-3 text-[14px] text-white/80">
                {[
                  'Everything in Free',
                  'In-app booking & payments',
                  'Family CRM and enrollment tracking',
                  'Provider analytics dashboard',
                  'Priority placement in search results',
                  'Early partner preferred pricing',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="text-[#C4A882] font-bold mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[720px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">FAQ</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(30px,3.5vw,46px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A]">
              Common questions.
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[16px] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-7 py-5 flex items-center justify-between gap-4"
                >
                  <span className="font-['Cormorant_Garamond'] text-[18px] font-semibold text-[#1C3A4A]">
                    {faq.q}
                  </span>
                  <span className={`text-[#0D5C6E] text-xl font-light flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-7 pb-6">
                    <p className="text-[15px] text-[#3A5A6A] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0A4A5A] py-24 px-6 md:px-10 lg:px-16 text-center">
        <div className="max-w-[640px] mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C4A882] mb-6">
            Ready to get listed?
          </p>
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4vw,54px)] font-light leading-[1.15] tracking-tight text-white mb-5">
            Your next family<br />
            <em className="italic text-[#C4A882]">is already searching.</em>
          </h2>
          <p className="text-[17px] text-white/55 leading-relaxed font-['Cormorant_Garamond'] italic mb-10">
            Reach out and we&apos;ll get your listing verified and live — usually within 24 hours. Free during the Seattle beta.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@thelittlesound.com?subject=Provider Listing — Little Sound"
              className="inline-flex items-center justify-center gap-2 bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-8 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
            >
              Claim Your Listing →
            </a>
            <Link
              href="/discover"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-8 py-4 text-[15px] transition-all duration-200 border border-white/20"
            >
              See How We List Providers
            </Link>
          </div>

          <p className="text-white/30 text-[12px] mt-8">
            Questions? Email us at hello@thelittlesound.com — we reply within 24 hours.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
