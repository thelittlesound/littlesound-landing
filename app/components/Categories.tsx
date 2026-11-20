'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LineIcon } from './LineIcon';
import { useCatalogStats } from './useCatalogStats';

// Home "Explore" section (approved 2026-11-19, canvas
// https://claude.ai/artifact/9226rxPE8rPpGGU14ZbT8g): Discover's 14
// categories, icons and tile style, with live counts from /api/stats.
// Same order as Discover's tile row. Each tile opens Discover on that
// category, carrying the chosen age.
const CATEGORIES = [
  'Sports', 'Camps', 'Swimming', 'Arts', 'Martial Arts', 'Music', 'Outdoor',
  'Theater', 'Dance', 'Early Childhood', 'Language', 'STEM', 'Cooking', 'Academic',
];

const AGE_FILTERS = [
  { label: '2–4', key: '2-4' },
  { label: '5–7', key: '5-7' },
  { label: '8–11', key: '8-11' },
  { label: '12+', key: '12+' },
];

export default function Categories() {
  const [selectedAge, setSelectedAge] = useState('');
  // Exact counts once /api/stats answers; nothing shown until then, so the
  // seed-only numbers never flash.
  const live = useCatalogStats().byCategory;
  const total = live ? Object.values(live).reduce((a, b) => a + b, 0) : 0;

  const href = (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (selectedAge) params.set('age', selectedAge);
    const qs = params.toString();
    return qs ? `/discover?${qs}` : '/discover';
  };

  return (
    <section className="py-20 md:py-24 px-5 md:px-10 lg:px-16 bg-white">
      <div className="max-w-[1136px] mx-auto flex flex-col items-center gap-7">
        <div className="text-center flex flex-col items-center gap-3.5">
          <p className="text-label text-teal-700">Explore</p>
          <h2 className="font-display text-[clamp(38px,4.5vw,52px)] font-light leading-[1.15] tracking-tight text-text-dark">
            Activities for <em className="italic text-teal-700">every interest.</em>
          </h2>
          <p className="text-[17px] leading-relaxed text-text-mid max-w-[560px]">
            From sports and arts to camps and academics. Pick a category, or tell us your child&apos;s age first.
          </p>
        </div>

        {/* Age chips */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          <span className="text-sm text-text-mid mr-1">My child is</span>
          {AGE_FILTERS.map((a) => {
            const on = selectedAge === a.key;
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={on}
                onClick={() => setSelectedAge(on ? '' : a.key)}
                className={`min-h-[36px] px-4 rounded-pill text-sm font-medium border-[1.5px] transition-colors ${
                  on ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-text-dark border-cream-700 hover:border-teal-700'
                }`}
              >
                {a.label}
              </button>
            );
          })}
          {selectedAge && (
            <button type="button" onClick={() => setSelectedAge('')} className="min-h-[36px] px-2 text-sm text-text-mid hover:text-text-dark">
              Clear
            </button>
          )}
        </div>

        {/* Category tiles: Discover's style */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
          {CATEGORIES.map((c) => {
            const n = live?.[c] ?? 0;
            return (
              <Link
                key={c}
                href={href(c)}
                className="min-h-[60px] px-3.5 py-2 rounded-[16px] border-[1.5px] border-cream-700 bg-white text-text-dark flex items-center gap-2.5 no-underline transition-colors hover:border-teal-700"
              >
                <LineIcon name={c} size={26} color="#A8865A" className="shrink-0" />
                <span className="flex flex-col gap-px min-w-0">
                  <span className="text-[14px] font-semibold leading-tight">{c}</span>
                  <span className="text-[12px] leading-tight text-text-mid min-h-[15px]">
                    {live ? `${n} ${n === 1 ? 'program' : 'programs'}` : ''}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <Link href={href()} className="btn btn-primary no-underline">
          {live ? `Browse all ${total} programs` : 'Browse all programs'} &rarr;
        </Link>
      </div>
    </section>
  );
}
