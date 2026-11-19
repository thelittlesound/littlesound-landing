import Link from 'next/link';
import { LineIcon } from './LineIcon';

// Hero CTAs mirror /for-families: account creation is the primary action,
// browsing is secondary. (The waitlist fallback was removed 2026-11-18.)
export default function Hero() {
  const activities = [
    // Real listings from the catalog (2026-11-19), shown as a search for a
    // 9-year-old in West Seattle under $300. No ratings, reviews or
    // availability: Little Sound doesn't have those.
    {
      icon: 'Sports',
      name: 'Youth Pickleball Program',
      provider: 'Westside Pickleball',
      ages: 'Ages 8–15',
      where: 'West Seattle',
      cost: '$160/season',
      tag: 'Sports',
    },
    {
      icon: 'Arts',
      name: 'Outdoor Art Camps & Workshops',
      provider: 'West Seattle Art Nest',
      ages: 'Ages 2–12',
      where: 'West Seattle',
      cost: '$195/session',
      tag: 'Arts',
    },
    {
      icon: 'Swimming',
      name: 'Beach-Side Swim Lessons at Colman Pool',
      provider: 'Seattle Parks & Recreation',
      ages: 'Ages 0–16',
      where: 'West Seattle',
      cost: '$105/session',
      tag: 'Swimming',
    },
    {
      icon: 'Dance',
      name: 'Dance, Acting & Music at the Junction',
      provider: 'West Seattle Performing Arts',
      ages: 'Ages 3–18',
      where: 'West Seattle',
      cost: '$170/month',
      tag: 'Dance',
    },
  ];

  return (
    <section className="min-h-screen bg-[#0D5C6E] pt-32 pb-16 px-6 md:px-10 lg:px-16 flex items-center">
      <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left — copy */}
        <div>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#C4A882] animate-pulse" />
            <span className="text-xs font-semibold tracking-widest uppercase text-white/70">
              For Seattle families
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-['Cormorant_Garamond'] text-[clamp(44px,5.5vw,72px)] font-light leading-[1.1] tracking-tight text-white mb-6">
            Seattle kids&apos; activities,<br />
            <em className="italic text-[#C4A882]">in one place.</em>
          </h1>

          {/* Subhead */}
          <p className="text-white/70 text-lg leading-relaxed max-w-[460px] mb-5">
            Little Sound is Seattle&apos;s family activity platform. Search camps, classes, sports, and more — without opening a dozen tabs.
          </p>

          {/* Emotional stat hook */}
          <div className="border-l-2 border-[#C4A882]/50 pl-4 mb-10 max-w-[420px]">
            <p className="text-white/80 text-[15px] leading-relaxed font-['Cormorant_Garamond'] italic">
              &ldquo;Parents spend way too many hours hunting for kids&apos; activities across dozens of sites. That time belongs to your family.&rdquo;
            </p>
            <p className="text-[#C4A882] text-[12px] mt-2 font-semibold">&mdash; Kelly Sherman, Co-founder &amp; Seattle mom of two</p>
          </div>

          {/* Primary CTAs — same pattern as /for-families */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-4">
            <Link
              href="/families/signup"
              className="inline-flex items-center justify-center gap-2 bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
            >
              Create Your Account &rarr;
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-7 py-4 text-[15px] transition-all duration-200 border border-white/20"
            >
              Browse Activities
            </Link>
          </div>

          <div className="mb-8" />

          {/* Trust pills */}
          <div className="flex flex-wrap gap-5">
            {['Free to join', 'Hundreds of programs', 'No spam, ever'].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-white/55 text-[13px]">
                <span className="text-[#C4A882] font-bold">✓</span>
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Right — search results mockup */}
        <div className="hidden lg:flex justify-center items-center">
          <div className="w-[420px] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-white/10 transition-transform duration-500 hover:-translate-y-1">

            {/* Search bar header */}
            <div className="bg-[#0A4A5A] px-5 pt-5 pb-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 mb-3">
                <LineIcon name="search" size={14} color="rgba(255,255,255,0.5)" />
                <span className="text-white/70 text-[12px]">age 9 in West Seattle under $300</span>
              </div>
              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { label: 'Age 9', active: true },
                  { label: 'West Seattle', active: true },
                  { label: 'Under $300', active: true },
                  { label: 'All categories', active: false },
                ].map((f) => (
                  <span
                    key={f.label}
                    className={
                      f.active
                        ? 'whitespace-nowrap text-[10px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 bg-[#C4A882] text-white'
                        : 'whitespace-nowrap text-[10px] font-semibold px-3 py-1.5 rounded-full flex-shrink-0 bg-white/10 text-white/60'
                    }
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Results meta */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[#E8DFC8]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A9AAA]">
                Closest first
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[#1A7A8A] font-semibold">
                Best match
              </div>
            </div>

            {/* Results list */}
            <div className="px-4 py-3 space-y-2.5">
              {activities.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-3 bg-[#F5EFE0] border border-[#E8DFC8] rounded-[14px] px-3 py-3 cursor-pointer hover:border-[#1A7A8A]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white border border-[#E8DFC8]">
                    <LineIcon name={item.icon} size={20} color="#A8865A" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1C3A4A] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#7A9AAA] truncate">{item.provider}</p>
                    <p className="text-[10px] text-[#3A5A6A] mt-1">{item.ages} · {item.where}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap bg-teal-100 text-teal-800">
                      {item.tag}
                    </span>
                    <span className="text-[11px] font-semibold text-[#1C3A4A]">
                      {item.cost}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="px-4 pb-4">
              <a
                href="/discover"
                className="relative z-20 block bg-[#0D5C6E] hover:bg-[#1A7A8A] rounded-[12px] px-4 py-3 text-center transition-colors cursor-pointer"
              >
                <span className="text-white text-[12px] font-semibold">Browse all activities &rarr;</span>
              </a>
            </div>

          </div>
        </div>

      </div>

    </section>
  );
}
