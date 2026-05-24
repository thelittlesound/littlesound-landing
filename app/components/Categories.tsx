export default function Categories() {
  const categories = [
    { emoji: '⚽', name: 'Sports & Fitness', count: 'Coming Soon' },
    { emoji: '🎨', name: 'Arts & Crafts', count: 'Coming Soon' },
    { emoji: '🎵', name: 'Music & Dance', count: 'Coming Soon' },
    { emoji: '🏕️', name: 'Camps & Outdoors', count: 'Coming Soon' },
    { emoji: '🧠', name: 'STEM & Academics', count: 'Coming Soon' },
    { emoji: '🎭', name: 'Theater & Drama', count: 'Coming Soon' },
    { emoji: '📚', name: 'Language & Literacy', count: 'Coming Soon' },
    { emoji: '🧘', name: 'Wellness & Mindfulness', count: 'Coming Soon' },
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
            <div
              key={index}
              className="card text-center hover:bg-cream-300 transition-colors duration-base cursor-pointer group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-base">
                {cat.emoji}
              </div>
              <h3 className="text-heading-sm mb-2">{cat.name}</h3>
              <p className="text-xs text-text-muted font-medium">{cat.count}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-body-lg text-text-mid mb-8">
            Explore hundreds of activities right in your neighborhood.
          </p>
          <button className="btn btn-primary">
            Browse All Activities
          </button>
        </div>
      </div>
    </section>
  );
}
