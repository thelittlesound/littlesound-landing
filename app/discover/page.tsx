'use client';

import { useState, useMemo, useEffect } from 'react';
import activities from '../data/activities.json';

const CATEGORIES = ['All', 'Sports', 'Swimming', 'Arts', 'Outdoor', 'STEM', 'Music', 'Dance', 'Martial Arts', 'Early Childhood', 'Theater', 'Camps', 'Academic'];

const SUBCATEGORY_ORDER: Record<string, string[]> = {
  Swimming:       ['Year-Round', 'Group Lessons', 'Private Lessons', 'Outdoor & Beach', 'Seasonal'],
  Sports:         ['Multi-Sport', 'Gymnastics', 'Climbing', 'Ice Skating', 'Skateboarding'],
  Arts:           ['Classes & Workshops', 'Drawing & Painting', 'Pottery & Ceramics', 'Private Lessons', 'Workshops & Intensives'],
  STEM:           ['Coding & AI', 'Robotics', 'Science'],
  Music:          ['Private Lessons', 'Bands & Performance', 'Early Childhood'],
  Dance:          ['Multi-Style', 'Hip Hop & Jazz', 'Performing Arts'],
  Theater:        ['Acting & Improv', 'Youth Productions'],
  'Martial Arts': ['Karate', 'Karate & Kickboxing', 'Mixed Martial Arts'],
  'Early Childhood': ['Movement & Play', 'Nature Programs'],
  Outdoor:        ['Nature & Forest', 'Zoo Programs', 'Water Sports'],
  Camps:          ['Day Camps', 'Multi-Theme'],
  Academic:       ['Academic Camps'],
};

const AGE_GROUPS = [
  { label: 'All ages', min: 0, max: 18 },
  { label: '2-4', min: 2, max: 4 },
  { label: '5-7', min: 5, max: 7 },
  { label: '8-11', min: 8, max: 11 },
  { label: '12+', min: 12, max: 18 },
];

type Activity = typeof activities[0] & { subcategory?: string };

const CATEGORY_STYLES: Record<string, { from: string; to: string; emoji: string }> = {
  'Swimming':        { from: '#B8D8EE', to: '#7FB8D8', emoji: '🏊' },
  'Sports':          { from: '#B8D8B8', to: '#80B880', emoji: '⚽' },
  'Arts':            { from: '#E8D0E8', to: '#C8A0C8', emoji: '🎨' },
  'STEM':            { from: '#B8DCE8', to: '#7CBCCC', emoji: '🧠' },
  'Music':           { from: '#F0E4C0', to: '#D4BC80', emoji: '🎵' },
  'Dance':           { from: '#F0D0D0', to: '#D4A0A0', emoji: '💃' },
  'Theater':         { from: '#E8D0B8', to: '#C8A070', emoji: '🎭' },
  'Martial Arts':    { from: '#C8D0DC', to: '#98B0BC', emoji: '🥋' },
  'Early Childhood': { from: '#F0EEB8', to: '#D4CC70', emoji: '🌱' },
  'Outdoor':         { from: '#B8D8B0', to: '#78B870', emoji: '🌲' },
  'Camps':           { from: '#F0DDB8', to: '#D4B870', emoji: '🏕️' },
  'Academic':        { from: '#C0C8EC', to: '#8898CC', emoji: '📚' },
};

function ActivityCard({ a }: { a: Activity }) {
  const style = CATEGORY_STYLES[a.category] ?? { from: '#C5D8E8', to: '#A8C8D8', emoji: '✨' };
  return (
    <article className="bg-white border border-[#E8DFC8] rounded-[20px] overflow-hidden hover:shadow-[0_12px_32px_rgba(10,74,90,0.14)] transition-shadow duration-300 flex flex-col">
      <div
        className="h-[160px] relative flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
      >
        <span className="absolute bottom-3 right-4 text-[64px] opacity-20 select-none pointer-events-none leading-none" aria-hidden="true">
          {style.emoji}
        </span>
        <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/80 text-[11px] font-semibold uppercase tracking-wide text-[#1A7A8A]">
          {a.category}
        </span>
        <span className="px-3 py-1 rounded-full bg-white/70 font-['Cormorant_Garamond'] text-[14px] italic text-[#0D5C6E] relative z-10">
          {a.neighborhood}
        </span>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-['Cormorant_Garamond'] text-[21px] font-semibold text-[#1C3A4A] leading-snug mb-1">
          {a.title}
        </h3>
        <p className="text-[13px] text-[#1A7A8A] font-medium mb-3">
          {a.provider}
        </p>
        <p className="text-[14px] leading-[1.7] text-[#3A5A6A] mb-5 flex-1">
          {a.description}
        </p>
        <div className="flex items-center gap-3 text-[12px] text-[#7A9AAA] mb-5 pt-4 border-t border-[#E8DFC8]">
          <span>Ages {a.ageMin}&ndash;{a.ageMax}</span>
          <span>&middot;</span>
          <span>{a.neighborhood}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-['Cormorant_Garamond'] text-[24px] font-medium text-[#1C3A4A]">
              ${a.price}
            </span>
            <span className="text-[13px] text-[#7A9AAA]"> /{a.priceUnit}</span>
          </div>
          <a
            href={a.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-[#1A7A8A] text-white text-[13px] font-medium hover:bg-[#2A9AAA] transition-colors"
          >
            View details
          </a>
        </div>
      </div>
    </article>
  );
}

export default function Discover() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[0]);
  const [sort, setSort] = useState('default');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('category');
    if (cat && CATEGORIES.includes(cat)) {
      setCategory(cat);
    }
  }, []);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory('All');
  }, [category]);

  const results = useMemo(() => {
    const filtered = activities.filter((a) => {
      const matchesQuery =
        query === '' ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.provider.toLowerCase().includes(query.toLowerCase()) ||
        a.neighborhood.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || a.category === category;
      const matchesAge = a.ageMax >= ageGroup.min && a.ageMin <= ageGroup.max;
      return matchesQuery && matchesCategory && matchesAge;
    });
    const arr = [...filtered];
    if (sort === 'price-asc')  arr.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') arr.sort((a, b) => b.price - a.price);
    if (sort === 'age-asc')    arr.sort((a, b) => a.ageMin - b.ageMin);
    if (sort === 'age-desc')   arr.sort((a, b) => b.ageMin - a.ageMin);
    return arr;
  }, [query, category, ageGroup, sort]);

  // Subcategory pills — ordered, derived from current results
  const availableSubcategories = useMemo(() => {
    if (category === 'All') return [];
    const order = SUBCATEGORY_ORDER[category] ?? [];
    const present = new Set(results.map(a => (a as Activity).subcategory ?? 'Other'));
    const ordered = order.filter(s => present.has(s));
    present.forEach(s => { if (!order.includes(s)) ordered.push(s); });
    return ordered;
  }, [results, category]);

  // Results after subcategory filter
  const filteredResults = useMemo(() => {
    if (subcategory === 'All') return results;
    return results.filter(a => (a as Activity).subcategory === subcategory);
  }, [results, subcategory]);

  const grouped = useMemo(() => {
    if (category === 'All' || query !== '' || subcategory !== 'All') return null;
    const groups: Record<string, typeof results> = {};
    results.forEach((a) => {
      const key = (a as typeof a & { subcategory?: string }).subcategory ?? 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    const order = SUBCATEGORY_ORDER[category] ?? [];
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = order.indexOf(a), bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [results, category, query]);

  const clearAll = () => {
    setQuery('');
    setCategory('All');
    setSubcategory('All');
    setAgeGroup(AGE_GROUPS[0]);
    setSort('default');
  };

  return (
    <main className="min-h-screen bg-white">

      {/* Header */}
      <section className="bg-[#0D5C6E] px-6 md:px-10 lg:px-16 pt-16 pb-12">
        <div className="max-w-[1280px] mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7A9AAA] mb-4">
            Seattle Metro
          </p>
          <h1 className="font-['Cormorant_Garamond'] text-[clamp(38px,5vw,64px)] font-light leading-[1.1] tracking-tight text-white mb-4">
            Everything for your kids,<br />
            <em className="italic text-[#C4A882]">in one place.</em>
          </h1>
          <p className="text-[17px] text-[#D6EEF2] leading-relaxed max-w-[520px] mb-10">
            Camps, classes, and activities across Seattle. Search once &mdash; find what fits.
          </p>
          <div className="relative max-w-[560px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try 'soccer', 'Ballard', or 'art camp'..."
              className="w-full bg-white text-[#1C3A4A] text-[16px] rounded-full pl-14 pr-6 py-4 outline-none border-2 border-transparent focus:border-[#2A9AAA] transition-colors placeholder:text-[#7A9AAA]"
            />
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7A9AAA]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-[#E8DFC8] bg-[#F5EFE0] px-6 md:px-10 lg:px-16 py-6 sticky top-0 z-10">
        <div className="max-w-[1280px] mx-auto space-y-4">

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A9AAA] mb-2">
              Category
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={
                    category === c
                      ? 'px-4 py-2 rounded-full text-[13px] font-medium bg-[#1A7A8A] text-white shadow-sm transition-all'
                      : 'px-4 py-2 rounded-full text-[13px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] transition-all'
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#7A9AAA] mb-2">
              Age
            </p>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setAgeGroup(g)}
                  className={
                    ageGroup.label === g.label
                      ? 'px-4 py-2 rounded-full text-[13px] font-medium bg-[#1A7A8A] text-white shadow-sm transition-all'
                      : 'px-4 py-2 rounded-full text-[13px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] transition-all'
                  }
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Results */}
      <section className="px-6 md:px-10 lg:px-16 py-12">
        <div className="max-w-[1280px] mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <p className="text-[14px] text-[#3A5A6A] shrink-0">
              <span className="font-semibold text-[#1C3A4A]">{filteredResults.length}</span>
              {filteredResults.length === 1 ? ' activity' : ' activities'} found
            </p>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="sm:ml-auto text-[12px] text-[#3A5A6A] border border-[#E8DFC8] rounded-full px-4 py-1.5 bg-white outline-none cursor-pointer hover:border-[#1A7A8A] transition-colors shrink-0"
            >
              <option value="default">Sort: Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="age-asc">Age: Youngest first</option>
              <option value="age-desc">Age: Oldest first</option>
            </select>
            {availableSubcategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSubcategory('All')}
                  className={subcategory === 'All'
                    ? 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#1A7A8A] text-white whitespace-nowrap shrink-0 transition-all'
                    : 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] whitespace-nowrap shrink-0 transition-all'}
                >
                  All
                </button>
                {availableSubcategories.map(s => (
                  <button
                    key={s}
                    onClick={() => setSubcategory(s)}
                    className={subcategory === s
                      ? 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-[#1A7A8A] text-white whitespace-nowrap shrink-0 transition-all'
                      : 'px-4 py-1.5 rounded-full text-[12px] font-medium bg-white text-[#3A5A6A] border border-[#E8DFC8] hover:border-[#1A7A8A] whitespace-nowrap shrink-0 transition-all'}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredResults.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-['Cormorant_Garamond'] text-[28px] text-[#1C3A4A] mb-3">
                Nothing matches that &mdash; yet.
              </p>
              <p className="text-[15px] text-[#3A5A6A] mb-6">
                We&apos;re adding new providers across Seattle every week.
              </p>
              <button
                onClick={clearAll}
                className="px-6 py-3 rounded-full bg-[#1A7A8A] text-white text-[14px] font-medium hover:bg-[#2A9AAA] transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : grouped ? (
            <div className="space-y-14">
              {grouped.map(([subcat, items]) => (
                <div key={subcat}>
                  <div className="flex items-baseline gap-3 mb-6 pb-3 border-b border-[#E8DFC8]">
                    <h2 className="font-['Cormorant_Garamond'] text-[24px] font-semibold text-[#1C3A4A]">
                      {subcat}
                    </h2>
                    <span className="text-[13px] text-[#7A9AAA]">{items.length} {items.length === 1 ? 'provider' : 'providers'}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((a) => <ActivityCard key={a.id} a={a} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((a) => <ActivityCard key={a.id} a={a} />)}
            </div>
          )}

        </div>
      </section>

      {/* Provider CTA */}
      <section className="bg-[#0D5C6E] px-6 md:px-10 lg:px-16 py-16">
        <div className="max-w-[720px] mx-auto text-center">
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(28px,3.5vw,40px)] font-light text-white mb-4">
            Run a camp or class in Seattle?
          </h2>
          <p className="text-[16px] text-[#D6EEF2] leading-relaxed mb-8">
            Families are searching for what you offer. Get your listing featured on Little Sound.
          </p>
          <a
            href="/#waitlist"
            className="inline-block px-8 py-4 rounded-full bg-[#C4A882] text-[#1C3A4A] text-[15px] font-semibold hover:bg-[#A8865A] hover:text-white transition-colors"
          >
            List your activity
          </a>
        </div>
      </section>

    </main>
  );
}
