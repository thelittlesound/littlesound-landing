export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-teal-900 text-white py-16 border-t border-white border-opacity-10">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="relative inline-block font-['Cormorant_Garamond'] text-xl font-semibold mb-4">
              <img
                src="/images/logo-waves.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute -left-1.5 -top-4 w-[120px] max-w-none -rotate-[8deg] opacity-60"
              />
              <span className="relative">Little Sound</span>
            </h3>
            <p className="font-display italic text-lg font-light text-gold mb-1">
              One platform. Zero friction.
            </p>
            <p className="text-sm text-blue-grey-300">
              Kids&apos; camps, classes and sports across Seattle, in one place.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gold">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/for-families" className="text-blue-grey-300 hover:text-white transition">For Families</a></li>
              <li><a href="/for-providers" className="text-blue-grey-300 hover:text-white transition">For Providers</a></li>
              <li><a href="/" className="text-blue-grey-300 hover:text-white transition">How it Works</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gold">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/about" className="text-blue-grey-300 hover:text-white transition">About</a></li>
              <li><a href="mailto:hello@thelittlesound.com" className="text-blue-grey-300 hover:text-white transition">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gold">
              Legal
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="/privacy" className="text-blue-grey-300 hover:text-white transition">Privacy Policy</a></li>
              <li><a href="/terms" className="text-blue-grey-300 hover:text-white transition">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white border-opacity-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-blue-grey-300">
            © {currentYear} Little Sound. All rights reserved.
          </p>
          
        </div>
      </div>
    </footer>
  );
}
