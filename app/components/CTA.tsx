import Link from 'next/link';

// Closing "get started" section, shared by the home page and /for-families.
// Replaced the waitlist form (2026-11-18): Little Sound is live, so every
// waitlist ask is now "Create your free account". id="get-started" is the
// anchor for in-page links.
export default function CTA() {
  return (
    <section id="get-started" className="scroll-mt-16 bg-teal-900 py-24 px-6 md:px-10 lg:px-16 text-center">
      <div className="max-w-[640px] mx-auto">

        <p className="text-label text-gold mb-6">Get started</p>

        <h2 className="font-display text-[clamp(36px,4.5vw,56px)] font-light leading-[1.15] tracking-tight text-white mb-5">
          Your Sunday nights<br />
          <em className="italic text-gold">deserve better.</em>
        </h2>

        <p className="text-[17px] text-white/70 leading-relaxed mb-10">
          Parents spend way too many hours hunting for kids&apos; activities. Little Sound gives that time back.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
          <Link
            href="/families/signup"
            className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-white font-semibold rounded-pill px-7 py-4 text-[15px] transition-all duration-200 hover:-translate-y-0.5"
          >
            Create your free account &rarr;
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-pill px-7 py-4 text-[15px] transition-all duration-200 border border-white/20"
          >
            Browse activities
          </Link>
        </div>

        <div className="flex justify-center flex-wrap gap-x-7 gap-y-2 mb-10">
          {['Free to join', 'Hundreds of programs', 'No spam, ever'].map((perk) => (
            <span key={perk} className="flex items-center gap-1.5 text-white/55 text-[13px]">
              <span className="text-gold font-semibold">✓</span>
              {perk}
            </span>
          ))}
        </div>

        <p className="font-display italic text-[22px] font-light text-gold/90">
          Less searching. More living.
        </p>

      </div>
    </section>
  );
}
