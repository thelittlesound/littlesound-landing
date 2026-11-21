import { IconChip } from './LineIcon';

export default function Solution() {
  const steps = [
    {
      num: '01',
      icon: 'pencil',
      title: 'Tell Us About Your Family',
      body: 'Your kids\' ages, what they\'re into, and your neighborhood. Takes two minutes.',
      honest: 'No fluff. No five-page onboarding. Just the essentials.',
    },
    {
      num: '02',
      icon: 'sparkle',
      title: 'We Find the Best Options',
      body: 'A few picks for each child, matched to their age, interests and neighborhood, with details straight from each provider\'s own site.',
      honest: 'We read their sites so you don\'t have to.',
    },
    {
      num: '03',
      icon: 'go',
      title: 'Save and Get Going',
      body: 'Every card shows when, ages, where and cost the same way, so you can weigh options at a glance. Save your favorites to your family plan, then sign up on the provider\'s own site.',
      honest: 'Go make some coffee. You\'ve earned it.',
    },
  ];

  return (
    <section className="bg-teal-800 py-24 px-6 md:px-10 lg:px-16 relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto relative z-10">

        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest text-gold mb-4">
          How It Works
        </p>

        {/* Headline */}
        <h2 className="font-display text-[clamp(34px,4vw,52px)] font-light leading-[1.15] tracking-tight text-white mb-4 max-w-[540px]">
          Less clicks.<br />
          <em className="italic text-gold">More living.</em>
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
              <div className="flex items-center justify-between mb-5">
                <IconChip name={step.icon} dark />
                <span className="font-display text-[44px] font-medium leading-none text-white/15">{step.num}</span>
              </div>
              <h3 className="font-display text-[20px] font-medium text-white/90 mb-3">
                {step.title}
              </h3>
              <p className="text-[14px] leading-[1.8] text-white/45 mb-4">
                {step.body}
              </p>
              <p className="text-[13px] italic text-blue-grey-300 font-display">
                {step.honest}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
