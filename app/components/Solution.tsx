export default function Solution() {
  const features = [
    {
      number: '1',
      title: 'Discover',
      description: 'Browse activities by age, interest, location, and budget—all in one place.',
    },
    {
      number: '2',
      title: 'Compare',
      description: 'Read real reviews, check instructor bios, and compare pricing side-by-side.',
    },
    {
      number: '3',
      title: 'Book & Manage',
      description: 'One-click booking, integrated calendar, and all payments in one dashboard.',
    },
  ];

  return (
    <section className="py-24 bg-blue-grey-100">
      <div className="container">
        <div className="text-center mb-16">
          <span className="text-label text-teal-700 mb-4 block">The Solution</span>
          <h2 className="text-heading-lg mb-6">
            Everything you need in one platform.
          </h2>
          <p className="text-body-lg text-text-mid max-w-2xl mx-auto">
            Discover, compare, and book activities—without the overwhelm. All in one beautiful, intuitive platform built for busy parents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="bg-teal-700 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-stat">{feature.number}</span>
              </div>
              <h3 className="text-heading-sm mb-4">{feature.title}</h3>
              <p className="text-body text-text-mid leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Feature highlight */}
        <div className="mt-20 bg-white rounded-2xl p-12 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-heading-md mb-6">Built by parents, for parents.</h3>
              <p className="text-body-lg text-text-mid mb-6">
                We know what families need because we've lived it. Little Sound was built to solve the exact problems we experienced.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-gold text-xl mt-1">✓</span>
                  <span className="text-body">Personalized recommendations based on your family's interests</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold text-xl mt-1">✓</span>
                  <span className="text-body">Real safety checks and verified instructor credentials</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gold text-xl mt-1">✓</span>
                  <span className="text-body">Seattle-first launch—starting with our community</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-cream-300 to-cream-500 rounded-2xl aspect-square flex items-center justify-center">
              <div className="text-center text-teal-700 p-8">
                <div className="text-6xl mb-4">🎯</div>
                <p className="font-semibold">Feature Image</p>
                <p className="text-sm mt-2">App screenshot or feature demo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
