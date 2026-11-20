import { IconChip } from './LineIcon';

export default function Providers() {
  const perks = [
    {
      icon: 'search',
      title: 'Get discovered',
      body: 'Families searching for exactly what you offer — by neighborhood, age, and activity type. No ad budget required.',
    },
    {
      icon: 'clipboard',
      title: 'We do the work',
      body: "We've already catalogued hundreds of Seattle providers. Your listing may already be live. Just claim it and keep the details accurate.",
    },
    {
      icon: 'tag',
      title: 'Free to start',
      body: 'Listing on Little Sound is free. Claim yours, keep it accurate, and let families find you.',
    },
  ];

  return (
    <section className="bg-blue-grey-300 py-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1280px] mx-auto">

        <div className="max-w-[640px] mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-800 mb-5">
            For Providers
          </p>
          <h2 className="font-display text-[clamp(34px,4vw,52px)] font-light leading-[1.15] tracking-tight text-text-dark mb-5">
            Families are already<br />looking for you.
          </h2>
          <p className="text-[17px] text-text-mid leading-relaxed">
            Seattle parents spend way too many hours hunting for kids' activities across a dozen different websites. Little Sound is where they start. Be there when they search.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
          {perks.map((p) => (
            <div key={p.title} className="bg-white/60 rounded-[20px] p-8">
              <IconChip name={p.icon} className="mb-4" />
              <h3 className="font-display text-[22px] font-medium text-text-dark mb-3">
                {p.title}
              </h3>
              <p className="text-[15px] text-text-mid leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <a
            href="/providers/signup"
            className="inline-block px-8 py-4 rounded-full bg-teal-800 text-white text-[15px] font-semibold hover:bg-teal-700 transition-colors"
          >
            List your activity →
          </a>
          <p className="text-[14px] text-text-mid">
            Already listed?{' '}
            <a href="/providers/claim" className="text-teal-800 font-medium hover:underline">
              Claim your listing
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}
