import Link from "next/link";

const services = [
  { title: "Standard Cleaning", description: "Thorough cleaning of your home or office with attention to every detail.", icon: "🏠" },
  { title: "Deep Cleaning", description: "Intensive cleaning that covers hard-to-reach areas and built-up grime.", icon: "✨" },
  { title: "Move-In/Move-Out", description: "Complete cleaning for when you're transitioning between spaces.", icon: "📦" },
  { title: "Commercial Cleaning", description: "Keep your business spotless and professional for clients and staff.", icon: "🏢" },
  { title: "Post-Construction", description: "Remove dust, debris, and residue after renovations or construction.", icon: "🔨" },
  { title: "Recurring Service", description: "Scheduled weekly, bi-weekly, or monthly cleanings to keep things fresh.", icon: "🔄" },
];

const testimonials = [
  {
    name: "Sarah M.",
    rating: 5,
    quote: "Absolutely wonderful service! They were thorough, professional, and my home has never looked better. Highly recommend to anyone.",
  },
  {
    name: "James R.",
    rating: 5,
    quote: "We've been using them for our office space for over a year. Consistent quality and great communication every time.",
  },
  {
    name: "Maria L.",
    rating: 5,
    quote: "The move-out cleaning was incredible. Got our full security deposit back thanks to their attention to detail!",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-5 h-5 ${i < rating ? "fill-current" : "text-slate-300"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
            Professional Service
            <br />
            <span className="text-[var(--brand)]">You Can Trust</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Reliable, high-quality service for your home or business. Book online in minutes
            and experience the difference that true professionals make.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors shadow-lg shadow-teal-600/25"
            >
              Book Now
            </Link>
            <Link
              href="/site/services"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-[var(--brand)]">10+</div>
              <div className="mt-1 text-sm text-slate-600">Years in Business</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[var(--brand)]">4.9★</div>
              <div className="mt-1 text-sm text-slate-600">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[var(--brand)]">2,500+</div>
              <div className="mt-1 text-sm text-slate-600">Clients Served</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[var(--brand)]">100%</div>
              <div className="mt-1 text-sm text-slate-600">Satisfaction Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Our Services</h2>
            <p className="mt-3 text-slate-600 max-w-xl mx-auto">
              From routine cleanings to specialized deep-cleaning, we have a solution for every need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all"
              >
                <div className="text-3xl mb-4">{service.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900">{service.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/site/services"
              className="inline-flex items-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
            >
              View All Services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">What Our Clients Say</h2>
            <p className="mt-3 text-slate-600">Don&apos;t just take our word for it.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <StarRating rating={t.rating} />
                <p className="mt-4 text-slate-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-4 text-sm font-semibold text-slate-900">{t.name}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/site/reviews"
              className="inline-flex items-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
            >
              Read All Reviews &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-teal-100 max-w-xl mx-auto">
            Book your first appointment online in just a few minutes. No commitment required.
          </p>
          <Link
            href="/site/book"
            className="mt-8 inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-lg"
          >
            Book Now
          </Link>
        </div>
      </section>
    </div>
  );
}
