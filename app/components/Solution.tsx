export default function Solution() {
  const steps = [
    {
      num: '01',
      icon: '🗺️',
      title: 'Tell Us About Your Family',
      body: 'Ages, interests, your neighborhood, your budget, your schedule. Takes two minutes. You\'ll never fill out another intake form again.',
      honest: 'No fluff. No five-page onboarding. Just the essentials.',
    },
    {
      num: '02',
      icon: '🌲',
      title: 'We Find the Best Options',
      body: 'Personalized picks based on your actual family — verified providers, real reviews, and current availability. No guesswork.',
      honest: 'We check credentials so you don\'t have to.',
    },
    {
      num: '03',
      icon: '☕',
      title: 'Book and Actually Relax',
      body: 'One-click booking. Calendar sync. Payment in one place. Your Sunday night is yours again.',
      honest: 'Go make some coffee. You\'ve earned it.',
    },
  ];

  return (
    <section className="bg-[#0D5C6E] py-24 px-6 md:px-10 lg:px-16 relative overflow-hidden">
      {/* Subtle wave decoration */}
      <svg
        className="absolute bottom-0 right-0 opacity-5 pointer-events-none"
        width="400" height="300" viewBox="0 0 400 300" fill="none"
      >
        <path d="M50,150 Q100,80 150,150 Q200,220 250,150 Q300,80 350,150" stroke="white" strokeWidth="2" fill="none"/>
        <path d="M50,180 Q100,110 150,180 Q200,250 250,180 Q300,110 350,180" stroke="white" strokeWidth="2" fill="none"/>
        <path d="M50,210 Q100,140 150,210 Q200,280 250,210 Q300,140 350,210" stroke="white" strokeWidth="2" fill="none"/>
      </svg>

      <div className="max-w-[1280px] mx-auto relative z-10">

        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest text-[#C4A882] mb-4">
          How It Works
        </p>

        {/* Headline */}
        <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4vw,52px)] font-light leading-[1.15] tracking-tight text-white mb-4 max-w-[540px]">
          Less clicks.<br />
          <em className="italic text-[#C4A882]">More living.</em>
        </h2>

        <p className="text-[17px] text-white/50 leading-relaxed max-w-[480px] mb-14">
          We do the research. You get the time back. Here's how it works once you're in.
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[860px]">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white/5 border border-white/10 rounded-[20px] p-9"
            >
              <p className="font-['Cormorant_Garamond'] text-[52px] font-semibold text-white/8 leading-none mb-4">
                {step.num}
              </p>
              <span className="text-[26px] mb-4 block">{step.icon}</span>
              <h3 className="font-['Cormorant_Garamond'] text-[20px] font-semibold text-white/90 mb-3">
                {step.title}
              </h3>
              <p className="text-[14px] leading-[1.8] text-white/45 mb-4">
                {step.body}
              </p>
              <p className="text-[13px] italic text-[#A8C8D8] font-['Cormorant_Garamond']">
                {step.honest}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
