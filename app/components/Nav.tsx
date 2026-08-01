'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { label: 'Browse Activities', href: '/discover' },
  { label: 'For Families',      href: '/for-families' },
  { label: 'For Providers',     href: '/for-providers' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D5C6E]/95 backdrop-blur-sm border-b border-white/10 h-16">
      <div className="max-w-[1280px] mx-auto px-6 md:px-10 lg:px-16 h-full flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="font-['Cormorant_Garamond'] text-xl font-semibold text-white tracking-tight shrink-0"
        >
          Little Sound
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'text-white'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <a
          href="/#waitlist"
          className="hidden md:inline-flex bg-[#C4A882] hover:bg-[#A8865A] text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors shrink-0"
        >
          Join Waitlist
        </a>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8"
          aria-label="Toggle menu"
        >
          <span className={`block h-[2px] w-6 bg-white transition-all duration-200 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block h-[2px] w-6 bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block h-[2px] w-6 bg-white transition-all duration-200 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#0A4A5A] border-t border-white/10 px-6 py-5 space-y-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block py-3 text-[15px] font-medium border-b border-white/10 transition-colors ${
                pathname === link.href ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <a
            href="/#waitlist"
            onClick={() => setOpen(false)}
            className="block mt-4 text-center bg-[#C4A882] hover:bg-[#A8865A] text-white font-semibold rounded-full px-5 py-3 text-[15px] transition-colors"
          >
            Join Waitlist
          </a>
        </div>
      )}
    </nav>
  );
}
