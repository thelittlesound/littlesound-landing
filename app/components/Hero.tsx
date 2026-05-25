'use client';

import WaitlistForm from './WaitlistForm';

export default function Hero() {
  return (
    <section 
      className="relative w-full min-h-screen flex items-center justify-start bg-cover bg-center"
      style={{
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(/images/hero.jpg)',
      }}
    >
      <div className="container relative z-10 max-w-2xl py-20">
        <div className="mb-6">
          <span className="text-label text-gold">Welcome to the family os</span>
        </div>

        <h1 className="text-display-lg mb-8 leading-tight text-white">
          Less searching.{' '}
          <span className="text-gold">More living.</span>
        </h1>

        <p className="text-lg leading-relaxed mb-12 text-white/90 max-w-xl">
          Stop wasting hours finding the right camps and activities for your kids. One platform. Zero friction.
        </p>

        <div className="flex items-center gap-6 mb-8">
          <WaitlistForm />
        </div>

        <p className="text-sm text-white/80">
          ✓ Free to join · ✓ Early access to Seattle beta · ✓ Founding family pricing
        </p>
      </div>
    </section>
  );
}
