'use client';

import WaitlistForm from './WaitlistForm';

export default function CTA() {
  return (
    <section className="py-24 bg-teal-800 text-white">
      <div className="container max-w-2xl text-center">
        <span className="text-label text-gold mb-6 block">Ready to Join?</span>
        
        <h2 className="text-display-md mb-8">
          Be among the first Seattle families to try Little Sound.
        </h2>

        <p className="text-lg text-blue-grey-100 mb-12 leading-relaxed">
          Join our waitlist and get early access to the platform that's changing how families find and book activities.
        </p>

        <div className="flex justify-center mb-12">
          <WaitlistForm />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 pt-12 border-t border-white border-opacity-20">
          <div>
            <div className="text-stat text-gold mb-2">100+</div>
            <p className="text-sm">Families on the waitlist</p>
          </div>
          <div>
            <div className="text-stat text-gold mb-2">Q3 2026</div>
            <p className="text-sm">Seattle beta launch</p>
          </div>
          <div>
            <div className="text-stat text-gold mb-2">$49+</div>
            <p className="text-sm">Founding family pricing</p>
          </div>
        </div>
      </div>
    </section>
  );
}
