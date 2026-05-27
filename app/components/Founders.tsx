import Image from 'next/image';

export default function Founders() {
  return (
    <section className="bg-[#0D5C6E] py-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Founders photo */}
          <div className="hidden lg:flex flex-col items-start gap-3">
            <div className="w-full aspect-[3/4] rounded-[20px] overflow-hidden relative">
              <Image
                src="/images/founders.png"
                alt="Kelly and Evan Sherman, founders of Little Sound"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1280px) 50vw, 640px"
              />
            </div>
            <p className="text-white/35 text-[13px] pl-1">Kelly & Evan Sherman · Seattle</p>
          </div>

          {/* Content */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C4A882] mb-6">
              Built by Seattle Parents
            </p>

            {/* Pull quote */}
            <blockquote className="font-['Cormorant_Garamond'] text-[22px] font-light italic text-white/90 leading-[1.55] mb-8 border-l-2 border-[#C4A882]/50 pl-6">
              "One Sunday, I spent four hours on six different websites trying to find a soccer camp that didn't conflict with spring break. That was the last time."
            </blockquote>

            <div className="space-y-4 text-[15px] leading-[1.8] text-white/60">
              <p>
                We're <strong className="text-white/90 font-semibold">Kelly and Evan Sherman</strong> — parents to a 9-year-old and a 4-year-old, and longtime Seattle residents. We built Little Sound because we experienced this problem over and over, and couldn't find anything that actually worked the way families think.
              </p>
              <p>
                We're not a big tech company. We're not backed by people who've never packed a camp bag at 7am. <strong className="text-white/90 font-semibold">We're parents who got fed up and decided to fix it.</strong>
              </p>
              <p>
                We're starting in Seattle because it's our home — and because Seattle families deserve a platform that gets them.
              </p>
            </div>

            {/* Bylines */}
            <div className="flex items-center gap-6 mt-10 pt-8 border-t border-white/10">
              <div>
                <p className="text-white font-semibold text-[15px]">Kelly Sherman</p>
                <p className="text-white/45 text-[13px]">Founder & CEO</p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div>
                <p className="text-white font-semibold text-[15px]">Evan Sherman</p>
                <p className="text-white/45 text-[13px]">Co-Founder & Strategy</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
