'use client';

import Link from 'next/link';
import Footer from '../components/Footer';
import CTA from '../components/CTA';
import { useCatalogStats } from '../components/useCatalogStats';
import { IconChip, LineIcon } from '../components/LineIcon';
import { CATEGORY_NAMES } from '@/lib/categories';

const BENEFITS = [
  {
    icon: 'search',
    title: 'One search, hundreds of options',
    body: 'Hundreds of Seattle programs, from sports to STEM, all searchable by age, neighborhood and activity. No more cross-referencing six different websites.',
  },
  {
    icon: 'fit',
    title: 'Built for your kid',
    body: 'Filter by age, category, and neighborhood. See only what actually fits your family — not every activity in the city.',
  },
  {
    icon: 'fresh',
    title: 'Actually up to date',
    body: 'Details come straight from each provider\'s own site, and we check for new dates every day.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: 'search',
    title: 'Search by age and category',
    body: "Tell us what your kid is into and how old they are. We'll show you what fits, sorted and filtered for your family.",
  },
  {
    num: '02',
    icon: 'compare',
    title: 'Compare your options',
    body: 'Every listing shows when, ages, where and cost the same way, all in one place. No more tab chaos.',
  },
  {
    num: '03',
    icon: 'connect',
    title: 'Connect with the right fit',
    body: "Every card links straight to the provider's own site for the full details and sign-up.",
  },
];

export default function ForFamilies() {
  const stats = useCatalogStats();
  return (
    <main>

      {/* ── HERO ── */}
      <section className="min-h-screen bg-teal-800 pt-32 pb-20 px-6 md:px-10 lg:px-16 flex items-center">
        <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-gold">For Families</span>
            </div>

            <h1 className="font-display text-[clamp(40px,5vw,68px)] font-light leading-[1.1] tracking-tight text-white mb-6">
              Everything your kid<br />
              <em className="italic text-gold">could want to do.</em>
            </h1>

            <p className="text-white/70 text-lg leading-relaxed max-w-[480px] mb-10">
              Little Sound is Seattle&apos;s family activity platform. Search camps, classes, and sports by age, neighborhood, and activity — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-4">
              <Link
                href="/families/signup"
                className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
              >
                Create Your Account →
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 border border-white/20"
              >
                Browse Activities
              </Link>
            </div>

            <div className="mb-10" />

            <div className="flex flex-wrap gap-5">
              {['Free to join', 'Hundreds of programs', 'No spam, ever'].map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-white/55 text-[13px]">
                  <span className="text-gold font-bold">✓</span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Right — stat cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[
              { value: stats.programs, label: 'Programs listed', sub: 'and counting' },
              { value: stats.categories, label: 'Categories', sub: 'from sports to STEM' },
              { value: stats.providers, label: 'Providers', sub: 'and counting' },
              { value: 'Daily', label: 'Date checks', sub: 'from each provider’s site' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.08] border border-white/10 rounded-[20px] p-8"
              >
                <p className="font-display text-[52px] font-light text-white leading-none mb-2">
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
            <p className="text-xs font-bold uppercase tracking-widest text-teal-800 mb-4">Why families love it</p>
            <h2 className="font-display text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-text-dark">
              Everything in one place.<br />
              <em className="italic text-teal-800">Finally.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-cream-500 rounded-[20px] p-8 border border-cream-700"
              >
                <IconChip name={b.icon} className="mb-5" />
                <h3 className="font-display text-[22px] font-medium text-text-dark mb-3">
                  {b.title}
                </h3>
                <p className="text-[15px] text-text-mid leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bg-cream-500 py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-800 mb-4">How it works</p>
            <h2 className="font-display text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-text-dark max-w-[480px]">
              From search to sign-up<br />
              <em className="italic text-teal-800">in minutes.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-[20px] p-9 border border-cream-700"
              >
                <p className="font-display text-[52px] font-medium text-text-dark/[0.08] leading-none mb-4">
                  {step.num}
                </p>
                <IconChip name={step.icon} className="mb-5" />
                <h3 className="font-display text-[20px] font-medium text-text-dark mb-3">
                  {step.title}
                </h3>
                <p className="text-[14px] leading-[1.8] text-text-mid">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORY TEASER ── */}
      <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-800 mb-4">What you can find</p>
            <h2 className="font-display text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-text-dark">
              Activities for every interest.
            </h2>
            <p className="text-[17px] text-text-mid max-w-xl mx-auto mt-4">
              From swimming to coding to theater, with more added every week.
            </p>
          </div>

          {/* Discover's 14 tiles with live counts (2026-11-20): each opens exactly what it says. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5 mb-10">
            {CATEGORY_NAMES.map((c) => {
              const n = stats.byCategory?.[c] ?? 0;
              return (
                <Link
                  key={c}
                  href={`/discover?category=${encodeURIComponent(c)}`}
                  className="min-h-[60px] px-3.5 py-2 rounded-[16px] border-[1.5px] border-cream-700 bg-white text-text-dark flex items-center gap-2.5 no-underline transition-colors hover:border-teal-700"
                >
                  <LineIcon name={c} size={26} color="#A8865A" className="shrink-0" />
                  <span className="flex flex-col gap-px min-w-0">
                    <span className="text-[14px] font-semibold leading-tight">{c}</span>
                    <span className="text-[12px] leading-tight text-text-mid min-h-[15px]">
                      {stats.byCategory ? `${n} ${n === 1 ? 'program' : 'programs'}` : ''}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="text-center">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 text-teal-800 hover:text-teal-700 font-semibold text-[15px] transition-colors group"
            >
              <span className="border-b border-teal-800/40 group-hover:border-teal-700 pb-0.5">
                Browse every category →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <CTA />

      <Footer />
    </main>
  );
}
