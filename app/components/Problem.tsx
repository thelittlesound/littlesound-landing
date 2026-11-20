import { IconChip } from './LineIcon';

export default function Problem() {
  const problems = [
    {
      icon: 'tabs',
      title: 'The Camp & Activity Marathon',
      body: 'Every season it\'s the same. Hours of searching, comparing, and second-guessing — before you\'ve booked a single thing.',
      realTalk: '"We counted. 6 sites. That\'s too many."',
    },
    {
      icon: 'inbox',
      title: 'The Booking Black Hole',
      body: 'Payment here. Schedule there. Confirmation buried in your inbox. Nothing talks to anything else.',
      realTalk: '"Your saved picks, dates and clashes, in one family plan."',
    },
    {
      icon: 'full',
      title: 'The Always-Full Problem',
      body: 'You found the perfect one. Great reviews. Right age group. Right price. Waitlist only. Try again next year.',
      realTalk: '"Save it, and we\'ll email you before registration opens."',
    },
  ];

  return (
    <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1280px] mx-auto">

        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-4">
          The Real Problem
        </p>

        {/* Headline */}
        <h2 className="font-display text-[clamp(34px,4vw,52px)] font-light leading-[1.15] tracking-tight text-text-dark mb-4 max-w-[640px]">
          It shouldn't take<br />
          <em className="italic text-teal-700">this long.</em>
        </h2>

        <p className="text-[17px] text-text-mid leading-relaxed max-w-[520px] mb-14">
          6 websites. 14 tabs. 3 group chats. And you still don't know if there's a spot left.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-cream-500 border border-cream-700 rounded-[20px] p-8 relative overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-700 to-teal-600" />

              <IconChip name={p.icon} className="mb-5" />

              <h3 className="font-display text-[19px] font-medium text-text-dark mb-3">
                {p.title}
              </h3>

              <p className="text-[14px] leading-[1.8] text-text-mid">
                {p.body}
              </p>

              <p className="mt-4 pt-4 border-t border-cream-700 text-[13px] italic text-teal-700 font-display">
                {p.realTalk}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
