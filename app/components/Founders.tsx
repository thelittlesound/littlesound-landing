export default function Founders() {
  return (
    <section className="py-24 bg-teal-800 text-white">
      <div className="container">
        <div className="mb-16">
          <h2 className="text-heading-lg mb-2">Meet the Founders</h2>
          <div className="h-1 w-32 bg-gold"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-16">
          {/* Founders info */}
          <div>
            <div className="mb-12">
              <h3 className="text-2xl font-semibold mb-2">Kelly Sherman</h3>
              <p className="text-blue-grey-300 mb-8">Founder & CEO</p>
              
              <h3 className="text-2xl font-semibold mb-2 mt-8">Evan Sherman</h3>
              <p className="text-blue-grey-300">Co-Founder & Strategy</p>
            </div>

            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                <strong className="text-gold">We're building Little Sound because we experienced the problem firsthand.</strong>
              </p>

              <p>
                As the parents of two children ages 9 and 4, we've spent late nights navigating dozens of sites trying to piece together camps and activities that fit. It wasn't just inefficient — it took time away from our family.
              </p>

              <p>
                So we built Little Sound to give families that time back. A personalized platform to discover, plan, and book kids' activities — without the overwhelm.
              </p>

              <p className="pt-4 border-t border-white border-opacity-20">
                <strong className="text-gold">Our why is simple:</strong><br />
                <span className="text-xl">Less searching. More living. Families first.</span>
              </p>
            </div>
          </div>

          {/* Founder image placeholder */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-grey-300 to-teal-700 rounded-3xl aspect-square flex items-center justify-center overflow-hidden shadow-xl">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
                <p className="font-semibold text-teal-800">Family Photo</p>
                <p className="text-sm mt-2 text-teal-700">Kelly & Evan with their kids</p>
                <p className="text-xs text-teal-700 mt-4">(Replace with actual family photo)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Starting soon notice */}
        <div className="bg-white bg-opacity-10 rounded-xl p-8 text-center border border-white border-opacity-20">
          <p className="text-lg">
            <strong>Starting in Seattle.</strong> Building the category-defining platform for family activity planning.
          </p>
        </div>
      </div>
    </section>
  );
}
