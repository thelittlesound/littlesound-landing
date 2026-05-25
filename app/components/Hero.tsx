'use client';

import WaitlistForm from './WaitlistForm';

export default function Hero() {
  return (
    <section className="relative bg-teal-800 text-white overflow-hidden pt-20 pb-32">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-800 via-teal-700 to-teal-900 opacity-50" />
      
      <div className="container relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left column - Headline & CTA */}
        <div>
          <div className="mb-6">
            <span className="text-label text-gold">Welcome to the family os</span>
          </div>

          <h1 className="text-display-lg mb-8 leading-tight">
            Less searching.{' '}
            <span className="text-gold">More living.</span>
          </h1>

          <p className="text-lg leading-relaxed mb-12 text-blue-grey-100">
            Stop wasting hours finding the right camps and activities for your kids. One platform. Zero friction.
          </p>

          <div className="flex items-center gap-6 mb-12">
            <WaitlistForm />
          </div>

          <p className="text-sm text-blue-grey-100">
            ✓ Free to join · ✓ Early access to Seattle beta · ✓ Founding family pricing
          </p>
        </div>

        {/* Right column - Hero image placeholder */}
        <div className="relative hidden md:block">
          <div className="bg-gradient-to-br from-blue-grey-300 to-teal-100 rounded-3xl aspect-square flex items-center justify-center overflow-hidden shadow-xl">
            <div className="text-center text-teal-700 p-8">
              <div className="text-6xl mb-4">📸</div>
              <p className="font-semibold">Hero Image</p>
              <p className="text-sm mt-2">Pacific Northwest family moment</p>
              <img src="/images/hero.jpg" alt="Little Sound family activities" className="w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-white" style={{
        clipPath: 'polygon(0 50%, 0 100%, 100% 100%, 100% 0%)',
      }} />
    </section>
  );
}
