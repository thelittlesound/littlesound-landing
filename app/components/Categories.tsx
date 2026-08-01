'use client';

import activities from '../data/activities.json';
import Link from 'next/link';
import { useState } from 'react';

const AGE_FILTERS = ['2–4', '5–7', '8–11', '12+'];

export default function Categories() {
  const [selectedAge, setSelectedAge] = useState('');

  const counts = activities.reduce((acc: Record<string, number>, a: { category: string }) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  const categories = [
    { emoji: '⚽', name: 'Sports & Fitness', count: (counts['Sports'] || 0) + (counts['Martial Arts'] || 0), filter: 'Sports' },
    { emoji: '🎨', name: 'Arts & Crafts',    count: counts['Arts'] || 0,                                     filter: 'Arts' },
    { emoji: '🎵', name: 'Music & Dance',    count: (counts['Music'] || 0) + (counts['Dance'] || 0),         filter: 'Music' },
    { emoji: '🏕️', name: 'Camps & Outdoors', count: (counts['Camps'] || 0) + (counts['Outdoor'] || 0),      filter: 'Outdoor' },
    { emoji: '🧠', name: 'STEM & Academics', count: (counts['STEM'] || 0) + (counts['Academic'] || 0),       filter: 'STEM' },
    { emoji: '🎭', name: 'Theater & Drama',  count: counts['Theater'] || 0,                                  filter: 'Theater' },
    { emoji: '🌱', name: 'Early Childhood',  count: counts['Early Childhood'] || 0,                          filter: 'Early Childhood' },
    { emoji: '🏊', name: 'Swimming',         count: counts['Swimming'] || 0,                                 filter: 'Swimming' },
    { emoji: '🍳', name: 'Cooking',          count: counts['Cooking'] || 0,                                  filter: 'Cooking' },
    { emoji: '🌍', name: 'Language',         count: counts['Language'] || 0,                                 filter: 'Language' },
  ];

  const buildHref = (filter: string) => {
    const params = new URLSearchParams({ category: filter });
    if (selectedAge) params.set('age', selectedAge);
    return `/discover?${params.toString()}`;
  };

  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-10">
          <span className="text-label text-teal-700 mb-4 block">Explore</span>
          <h2 className="text-heading-lg mb-6">
            Activities for every interest.
          </h2>
          <p className="text-body-lg text-text-mid max-w-2xl mx-auto mb-8">
            From sports and arts to camps and academics, find exactly what your family is looking for.
          </p>

          {/* Age chips */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm text-text-muted font-medium">My child is</span>
            {AGE_FILTERS.map((age) => (
              <button
                key={age}
                onClick={() => setSelectedAge(selectedAge === age ? '' : age)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedAge === age
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-text-mid border-cream-700 hover:border-teal-700'
                }`}
              >
                {age}
              </button>
            ))}
            {selectedAge && (
              <button
                onClick={() => setSelectedAge('')}
                className="text-sm text-text-muted hover:text-text-dark transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {categories.map((cat, index) => (
            <Link
              key={index}
              href={buildHref(cat.filter)}
              className="card text-center hover:bg-cream-300 transition-colors duration-base cursor-pointer group no-underline"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-base">
                {cat.emoji}
              </div>
              <h3 className="text-heading-sm mb-2">{cat.name}</h3>
              <p className="text-xs text-text-muted font-medium">{cat.count} activities</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-body-lg text-text-mid mb-8">
            Explore hundreds of activities right in your neighborhood.
          </p>
          <Link
            href={selectedAge ? `/discover?age=${encodeURIComponent(selectedAge)}` : '/discover'}
            className="btn btn-primary"
          >
            Browse All Activities
          </Link>
        </div>
      </div>
    </section>
  );
}
