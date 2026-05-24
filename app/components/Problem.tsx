export default function Problem() {
  const painPoints = [
    {
      icon: '🔍',
      title: 'Research Overload',
      description: 'Searching across 5+ websites, reading hundreds of reviews, and comparing prices takes hours.',
    },
    {
      icon: '⏰',
      title: 'Time Away from Family',
      description: 'Late nights researching means less time doing what matters—being with your kids.',
    },
    {
      icon: '📋',
      title: 'Fragmented Bookings',
      description: 'Managing schedules, payments, and communications across multiple platforms is exhausting.',
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-label text-teal-700 mb-4 block">The Problem</span>
          <h2 className="text-heading-lg mb-6">
            Finding the right activities shouldn't take all night.
          </h2>
          <p className="text-body-lg text-text-mid max-w-2xl mx-auto">
            Seattle families spend 6+ hours researching activities each month. That's time they could be spending with their kids.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => (
            <div key={index} className="card">
              <div className="text-5xl mb-6">{point.icon}</div>
              <h3 className="text-heading-sm mb-4">{point.title}</h3>
              <p className="text-body text-text-mid">{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
