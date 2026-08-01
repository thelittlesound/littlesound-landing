export default function Providers() {
  const perks = [
    {
      emoji: '🔍',
      title: 'Get discovered',
      body: 'Families searching for exactly what you offer — by neighborhood, age, and activity type. No ad budget required.',
    },
    {
      emoji: '📋',
      title: 'We do the work',
      body: "We've already catalogued 70+ Seattle providers. Your listing may already be live. Just claim it and keep the details accurate.",
    },
    {
      emoji: '🤝',
      title: 'Free to start',
      body: 'List for free during the Seattle beta. We grow together — paid features come only after families are booking.',
    },
  ];

  return (
    <section className="bg-[#C5D8E8] py-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1280px] mx-auto">

        <div className="max-w-[640px] mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-5">
            For Providers
          </p>
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4vw,52px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] mb-5">
            Families are already<br />looking for you.
          </h2>
          <p className="text-[17px] text-[#3A5A6A] leading-relaxed">
            Seattle families spend 6+ hours a month researching kids' activities across a dozen different websites. Little Sound is where they start. Be there when they search.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {perks.map((p) => (
            <div key={p.title} className="bg-white/60 rounded-[20px] p-8">
              <span className="text-3xl mb-4 block">{p.emoji}</span>
              <h3 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1C3A4A] mb-3">
                {p.title}
              </h3>
              <p className="text-[15px] text-[#3A5A6A] leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <a
            href="/#waitlist"
            className="inline-block px-8 py-4 rounded-full bg-[#0D5C6E] text-white text-[15px] font-semibold hover:bg-[#1A7A8A] transition-colors"
          >
            List your activity →
          </a>
          <p className="text-[14px] text-[#3A5A6A]">
            Already listed?{' '}
            <a href="mailto:hello@thelittlesound.com" className="text-[#0D5C6E] font-medium hover:underline">
              Claim your listing
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}
