import Link from "next/link";

const trustBadges = [
  { label: "One Trade Per Metro — Exclusive", href: "/full-loop-crm-pricing" },
  { label: "50+ Service Industries", href: "/full-loop-crm-service-business-industries" },
  { label: "All-in-One Full-Cycle CRM", href: "/full-loop-crm-service-features" },
  { label: "AI-Powered Automation", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
  { label: "300+ US Metros", href: "/full-loop-crm-service-business-industries" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244, 244, 241, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 244, 241, 0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ink overlay */}
      <div className="absolute inset-0 z-[1]" style={{ backgroundColor: "rgba(28, 28, 28, 0.86)" }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-36 pb-20">
        {/* Pre-headline badge */}
        <div className="mb-4 animate-hero-fade-in">
          <span className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-[0.15em] uppercase px-5 py-2.5 font-cta">
            One Trade Per Metro. One Operator Gets Everything.
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="font-extrabold text-white leading-[1.1] font-heading mb-6 animate-hero-slide-up"
          style={{ animationDelay: "0.15s" }}
        >
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
            Your city.
          </span>
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-teal-400 mt-2">
            <em className="not-italic">Your trade. Nobody else.</em>
          </span>
          <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-300 mt-4">
            The only full-cycle CRM — licensed to one operator per metro.
          </span>
        </h1>

        {/* Price block */}
        <div
          className="flex items-center justify-center gap-4 mb-6 animate-hero-slide-up"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono">$199<span className="text-lg sm:text-xl text-white/60 font-normal">/mo</span></span>
          <span className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-wider uppercase px-3 py-1.5 rounded font-cta">
            ALL FEATURES INCLUDED
          </span>
        </div>

        {/* Description */}
        <p
          className="text-base sm:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed mb-2 animate-hero-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          When you claim a territory, every AI-generated lead in your city routes to you. Every local SEO asset points to you. Every competitor in your trade is locked out of this platform &mdash; forever.{" "}
          <Link href="/full-loop-crm-pricing" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">$199/mo to hold the license.</Link>
        </p>
        <p
          className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed mb-4 animate-hero-slide-up"
          style={{ animationDelay: "0.45s" }}
        >
          No contracts. Month to month. We set it all up. But once a territory is claimed, it&apos;s off the board.
        </p>

        {/* Autonomy line */}
        <div
          className="flex items-center justify-center gap-2 mb-10 animate-hero-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-teal-400 text-sm sm:text-base font-semibold font-cta">
            Flip one switch &mdash; 100% autonomous. Your business runs itself.
          </span>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-hero-slide-up"
          style={{ animationDelay: "0.6s" }}
        >
          <Link
            href="/crm-partnership-request-form"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta"
          >
            Check My Territory
          </Link>
          <a
            href="tel:+12122029220"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors font-cta"
          >
            Call (212) 202-9220
          </a>
        </div>

        {/* Footer note */}
        <p
          className="text-slate-400 text-sm mb-10 animate-hero-fade-in"
          style={{ animationDelay: "0.7s" }}
        >
          Accepting one exclusive <Link href="/crm-partnership-request-form" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">partnership per trade per metro</Link> across <Link href="/full-loop-crm-service-business-industries" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">50+ industries</Link> and 300+ US cities.
        </p>

        {/* Trust badges */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 animate-hero-slide-up"
          style={{ animationDelay: "0.8s" }}
        >
          {trustBadges.map((badge) => (
            <Link
              key={badge.label}
              href={badge.href}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white/90 border border-white/20 rounded-full bg-white/10 backdrop-blur-sm font-cta hover:bg-white/20 transition-colors"
            >
              {badge.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
