import Image from 'next/image';
import Link from 'next/link';
import Footer from '../components/Footer';

const VALUES = [
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Families first, always',
    body: 'Every decision we make starts with one question: does this make life easier for Seattle families? Not easier for us. Not better for our metrics. Better for parents.',
  },
  {
    emoji: '🎯',
    title: 'Go deep before going wide',
    body: "We're not trying to be everywhere at once. We're building something genuinely useful for Seattle families before we think about the next city. Depth beats breadth.",
  },
  {
    emoji: '🤝',
    title: 'Honest about what we are',
    body: "We're in beta. We're a small team. We don't have everything figured out. We'd rather be upfront about that than overpromise and underdeliver.",
  },
  {
    emoji: '🌱',
    title: 'Build with the community',
    body: 'The best ideas come from Seattle parents and providers — not from us. We talk to families and activity providers constantly, and what we build reflects what we hear.',
  },
];

const ROADMAP = [
  {
    phase: 'Phase 1',
    label: 'Seattle Beta',
    timeframe: 'Q3 2026',
    status: 'now',
    items: [
      'Launch with 80+ Seattle activity providers',
      'Family search and discovery platform',
      '10 activity categories',
      'Founding family waitlist open',
    ],
  },
  {
    phase: 'Phase 2',
    label: 'Seattle Expansion',
    timeframe: '6–18 months',
    status: 'next',
    items: [
      'In-app booking and payments',
      'Provider CRM and enrollment tools',
      'Family profiles and saved favorites',
      'Reviews and ratings',
    ],
  },
  {
    phase: 'Phase 3',
    label: 'Multi-City',
    timeframe: '18–36 months',
    status: 'future',
    items: [
      'Expand to Portland, Denver, Austin',
      'National provider network',
      'Calendar sync and scheduling tools',
      'Family membership program',
    ],
  },
];

export default function About() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="bg-[#0D5C6E] pt-32 pb-20 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto max-w-[720px]">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C4A882]">Our Story</span>
          </div>
          <h1 className="font-['Cormorant_Garamond'] text-[clamp(40px,5vw,68px)] font-light leading-[1.1] tracking-tight text-white mb-6 max-w-[640px]">
            We&apos;re Seattle parents.<br />
            <em className="italic text-[#C4A882]">We built this for us.</em>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-[520px]">
            Little Sound started with a Sunday afternoon, a lot of open tabs, and a growing feeling that there had to be a better way.
          </p>
        </div>
      </section>

      {/* ── THE STORY ── */}
      <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Photo */}
          <div className="hidden lg:block">
            <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden relative">
              <Image
                src="/images/founders.png"
                alt="Kelly and Evan Sherman, founders of Little Sound"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1280px) 50vw, 640px"
              />
            </div>
            <p className="text-[#7A9AAA] text-[13px] mt-3 pl-1">Kelly & Evan Sherman · Seattle</p>
          </div>

          {/* Story */}
          <div className="pt-2">
            <blockquote className="font-['Cormorant_Garamond'] text-[24px] font-light italic text-[#1C3A4A] leading-[1.55] mb-8 border-l-2 border-[#C4A882]/60 pl-6">
              &ldquo;One Sunday, I spent four hours on six different websites trying to find a soccer camp that didn&apos;t conflict with spring break. That was the last time.&rdquo;
            </blockquote>

            <div className="space-y-5 text-[16px] leading-[1.85] text-[#3A5A6A]">
              <p>
                We&apos;re <strong className="text-[#1C3A4A] font-semibold">Kelly and Evan Sherman</strong> — parents to a 9-year-old and a 4-year-old, and longtime Seattle residents. Like most Seattle parents, we spend a surprising amount of time just trying to figure out what our kids can do.
              </p>
              <p>
                It&apos;s not that the activities aren&apos;t out there. Seattle has an incredible ecosystem of camps, studios, sports leagues, and programs. The problem is finding them. Every provider has their own website. Registration opens on different dates. Pricing is buried. Age ranges are unclear. And by the time you&apos;ve done the research, the session is full.
              </p>
              <p>
                We built Little Sound to fix that — starting with the city we know best. One place to search, compare, and connect with Seattle&apos;s best activity providers. No more tab chaos.
              </p>
              <p>
                We&apos;re not a big tech company. We&apos;re not backed by people who&apos;ve never packed a camp bag at 7am. <strong className="text-[#1C3A4A] font-semibold">We&apos;re parents who got fed up and decided to fix it.</strong>
              </p>
            </div>

            <div className="flex items-center gap-6 mt-10 pt-8 border-t border-[#E8DFC8]">
              <div>
                <p className="text-[#1C3A4A] font-semibold text-[15px]">Kelly Sherman</p>
                <p className="text-[#7A9AAA] text-[13px]">Founder & CEO</p>
              </div>
              <div className="w-px h-8 bg-[#E8DFC8]" />
              <div>
                <p className="text-[#1C3A4A] font-semibold text-[15px]">Evan Sherman</p>
                <p className="text-[#7A9AAA] text-[13px]">Co-Founder & Strategy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION / VALUES ── */}
      <section className="bg-[#F5EFE0] py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">What we believe</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] max-w-[560px] mx-auto">
              Less searching. More living.<br />
              <em className="italic text-[#0D5C6E]">Families first.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-white rounded-[20px] p-9 border border-[#E8DFC8]">
                <span className="text-4xl mb-5 block">{v.emoji}</span>
                <h3 className="font-['Cormorant_Garamond'] text-[22px] font-semibold text-[#1C3A4A] mb-3">
                  {v.title}
                </h3>
                <p className="text-[15px] text-[#3A5A6A] leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0D5C6E] mb-4">Where we&apos;re headed</p>
            <h2 className="font-['Cormorant_Garamond'] text-[clamp(32px,4vw,50px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] max-w-[480px]">
              Starting small.<br />
              <em className="italic text-[#0D5C6E]">Building to last.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROADMAP.map((phase) => (
              <div
                key={phase.phase}
                className={`rounded-[20px] p-9 border ${
                  phase.status === 'now'
                    ? 'bg-[#0D5C6E] border-[#0D5C6E]'
                    : 'bg-[#F5EFE0] border-[#E8DFC8]'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${phase.status === 'now' ? 'text-[#C4A882]' : 'text-[#7A9AAA]'}`}>
                    {phase.phase}
                  </span>
                  {phase.status === 'now' && (
                    <span className="flex items-center gap-1.5 bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C4A882] animate-pulse" />
                      Now
                    </span>
                  )}
                </div>
                <h3 className={`font-['Cormorant_Garamond'] text-[24px] font-semibold mb-1 ${phase.status === 'now' ? 'text-white' : 'text-[#1C3A4A]'}`}>
                  {phase.label}
                </h3>
                <p className={`text-[13px] mb-6 ${phase.status === 'now' ? 'text-white/50' : 'text-[#7A9AAA]'}`}>
                  {phase.timeframe}
                </p>
                <ul className="space-y-2.5">
                  {phase.items.map((item) => (
                    <li key={item} className={`flex items-start gap-2.5 text-[14px] ${phase.status === 'now' ? 'text-white/75' : 'text-[#3A5A6A]'}`}>
                      <span className={`mt-1 flex-shrink-0 ${phase.status === 'now' ? 'text-[#C4A882]' : 'text-[#0D5C6E]'}`}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0A4A5A] py-24 px-6 md:px-10 lg:px-16 text-center">
        <div className="max-w-[640px] mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C4A882] mb-6">
            Come build with us
          </p>
          <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4vw,54px)] font-light leading-[1.15] tracking-tight text-white mb-5">
            Seattle families deserve better.<br />
            <em className="italic text-[#C4A882]">Let&apos;s fix it together.</em>
          </h2>
          <p className="text-[17px] text-white/55 leading-relaxed mb-10">
            Join 100+ families already on the waitlist, or reach out directly — we&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/for-families"
              className="inline-flex items-center justify-center bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-8 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
            >
              Join the Waitlist →
            </Link>
            <a
              href="mailto:hello@thelittlesound.com"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full px-8 py-4 text-[15px] transition-all duration-200 border border-white/20"
            >
              Say Hello
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
