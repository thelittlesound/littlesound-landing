export default function Problem() {
  const problems = [
    {
      icon: '🏃',
      title: 'The Camp & Activity Marathon',
      body: 'Every season it\'s the same. Hours of searching, comparing, and second-guessing — before you\'ve booked a single thing.',
      realTalk: '"We counted. 6 sites. That\'s too many."',
    },
    {
      icon: '🌀',
      title: 'The Booking Black Hole',
      body: 'Payment here. Schedule there. Confirmation buried in your inbox. Nothing talks to anything else.',
      realTalk: '"One place. That\'s all it should take."',
    },
    {
      icon: '⏰',
      title: 'The Always-Full Problem',
      body: 'You found the perfect one. Great reviews. Right age group. Right price. Waitlist only. Try again next year.',
      realTalk: '"Little Sound shows you what\'s open right now."',
    },
  ];

  return (
    <section className="bg-white py-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-[1280px] mx-auto">

        {/* Eyebrow */}
        <p className="text-xs font-bold uppercase tracking-widest text-[#1A7A8A] mb-4">
          The Real Problem
        </p>

        {/* Headline */}
        <h2 className="font-['Cormorant_Garamond'] text-[clamp(34px,4vw,52px)] font-light leading-[1.15] tracking-tight text-[#1C3A4A] mb-4 max-w-[640px]">
          It shouldn't take<br />
          <em className="italic text-[#1A7A8A]">this long.</em>
        </h2>

        <p className="text-[17px] text-[#3A5A6A] leading-relaxed max-w-[520px] mb-14">
          6 websites. 14 tabs. 3 group chats. And you still don't know if there's a spot left.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-[#F5EFE0] border border-[#E8DFC8] rounded-[20px] p-8 relative overflow-hidden"
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1A7A8A] to-[#2A9AAA]" />

              <span className="text-3xl mb-4 block">{p.icon}</span>

              <h3 className="font-['Cormorant_Garamond'] text-[19px] font-semibold text-[#1C3A4A] mb-3">
                {p.title}
              </h3>

              <p className="text-[14px] leading-[1.8] text-[#3A5A6A]">
                {p.body}
              </p>

              <p className="mt-4 pt-4 border-t border-[#E8DFC8] text-[13px] italic text-[#1A7A8A] font-['Cormorant_Garamond']">
                {p.realTalk}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
