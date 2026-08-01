import activities from '../data/activities.json';
import Link from 'next/link';

export default function Categories() {
  const counts = activities.reduce((acc: Record<string, number>, a: { category: string }) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  const categories = [
    { emoji: '⚽', name: 'Sports & Fitness', count: (counts['Sports'] || 0) + (counts['Martial Arts'] || 0) },
    { emoji: '🎨', name: 'Arts & Crafts',    count: counts['Arts'] || 0 },
    { emoji: '🎵', name: 'Music & Dance',    count: (counts['Music'] || 0) + (counts['Dance'] || 0) },
    { emoji: '🏕️', name: 'Camps & Outdoors', count: (counts['Camps'] || 0) + (counts['Outdoor'] || 0) },
    { emoji: '🧠', name: 'STEM & Academics', count: (counts['STEM'] || 0) + (counts['Academic'] || 0) },
    { emoji: '🎭', name: 'Theater & Drama',  count: counts['Theater'] || 0 },
    { emoji: '🌱', name: 'Early Childhood',  count: counts['Early Childhood'] || 0 },
    { emoji: '🏊', name: 'Swimming',          count: counts['Swimming'] || 0 },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-label text-teal-700 mb-4 block">Explore</span>
          <h2 className="text-heading-lg mb-6">
            Activities for every interest.
          </h2>
          <p className="text-body-lg text-text-mid max-w-2xl mx-auto">
            From sports and arts to camps and academics, find exactly what your family is looking for.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat, index) => (
            <Link
              key={index}
              href="/discover"
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
          <Link href="/discover" className="btn btn-primary">
            Browse All Activities
          </Link>
        </div>
      </div>
    </section>
  );
}
