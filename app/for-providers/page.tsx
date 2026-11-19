'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '../components/Footer';
import { useCatalogStats } from '../components/useCatalogStats';
import { IconChip } from '../components/LineIcon';

const BENEFITS = [
  {
    icon: 'search',
    title: 'Get discovered organically',
    body: 'Families searching by age, neighborhood, and category find you directly — no ad budget, no algorithm to beat. Just parents looking for exactly what you offer.',
  },
  {
    icon: 'clipboard',
    title: 'You may already be listed',
    body: "We've catalogued hundreds of Seattle providers. Your listing might already be live. Claim it, keep the details accurate, and start appearing in search results.",
  },
  {
    icon: 'tag',
    title: 'Free to list',
    body: 'Listing on Little Sound is free. Claim your listing or add a new one, and families searching for what you offer will find you.',
  },
  {
    icon: 'pin',
    title: 'Built for Seattle first',
    body: "We're not trying to be everything everywhere. We're going deep in Seattle — building real density and real family trust before expanding.",
  },
];

const STEPS = [
  {
    num: '01',
    icon: 'mail',
    title: 'Claim or submit your listing',
    body: 'Email us at hello@thelittlesound.com. If you\'re already catalogued, we\'ll get you verified in 24 hours. New to the platform? We\'ll set you up.',
  },
  {
    num: '02',
    icon: 'pencil',
    title: 'Keep your details current',
    body: 'Update your age ranges, pricing, availability windows, and descriptions any time. Accurate listings get more clicks — and more families in the door.',
  },
  {
    num: '03',
    icon: 'chart',
    title: 'Get found by the right families',
    body: "When a parent searches for swimming lessons for a 7-year-old near Fremont, you show up. No middlemen, no commission on discovery — just a direct connection.",
  },
];

const FAQS = [
  {
    q: 'Is my listing already on Little Sound?',
    a: "Probably. We've researched and catalogued hundreds of Seattle activity providers. Search for your business on our Discover page — if you're there, claim it from your provider account and we'll verify it's yours.",
  },
  {
    q: 'What does it cost?',
    a: 'Listing on Little Sound is free.',
  },
  {
    q: 'Do you take a commission on bookings?',
    a: 'No. Families connect with you directly through your own website or contact info.',
  },
  {
    q: 'What kinds of providers are on Little Sound?',
    a: 'Sports leagues, swim schools, arts studios, camps, STEM programs, music and dance studios, theater programs, language immersion classes, and more. If Seattle families are searching for it, we want it listed.',
  },
];

export default function ForProviders() {
  const stats = useCatalogStats();
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
              Little Sound is Seattle&apos;s family activity platform. Parents use it to find camps, classes and sports by age, neighborhood and activity — including exactly what you offer.
            </p>

            <div className="flex flex-row flex-wrap gap-3 mb-10">
              <a
                href="/providers/claim"
                className="inline-flex items-center justify-center gap-2 bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-5 py-3 text-[14px] transition-all duration-200 hover:-translate-y-0.5"
              >
                Claim Your Listing →
              </a>
              <Link
                href="/providers/signup"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-5 py-3 text-[14px] transition-all duration-200 border border-white/20"
              >
                Add a new listing
              </Link>
            </div>

            <div className="flex flex-wrap gap-5">
              {['Free to list', 'No ad spend required', 'Hundreds of programs listed'].map((item) => (
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
              { value: stats.programs, label: 'Programs listed', sub: 'and counting' },
              { value: stats.providers, label: 'Providers listed', sub: 'yours may already be there' },
              { value: stats.categories, label: 'Categories', sub: 'across all activity types' },
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
                <IconChip name={b.icon} className="mb-5" />
                <h3 className="font-['Cormorant_Garamond'] text-[20px] font-medium text-[#1C3A4A] mb-3">
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
                <p className="font-['Cormorant_Garamond'] text-[52px] font-medium text-[#1C3A4A]/8 leading-none mb-4">
                  {step.num}
                </p>
                <IconChip name={step.icon} className="mb-5" />
                <h3 className="font-['Cormorant_Garamond'] text-[20px] font-medium text-[#1C3A4A] mb-3">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-[1.8] text-[#3A5A6A]">{step.body}</p>
              </div>
            ))}
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
                  <span className="font-['Cormorant_Garamond'] text-[18px] font-medium text-[#1C3A4A]">
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
            Reach out and we&apos;ll get your listing verified and live — usually within 24 hours. Free to list.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/providers/claim"
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
