// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Stretch Service Pricing | $99/hr | 10% Off Weekly",
  description: "Stretch NYC pricing: $99/hr single session, $89/hr weekly (10% off). Mobile stretch service across NYC. Professional equipment included. Same-day available.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

const pricingTiers = [
  {
    name: "Single Session",
    price: "$99",
    per: "per session",
    description: "Perfect for trying assisted stretching or occasional sessions when you need relief.",
    features: [
      "60-minute session",
      "Full-body mobility assessment",
      "Personalized treatment plan",
      "Professional equipment included",
      "Any NYC location",
      "Same-day availability",
    ],
    highlight: false,
  },
  {
    name: "Weekly Program",
    price: "$89",
    per: "per session",
    description: "Best value for consistent results. Weekly clients see the biggest improvements in flexibility and pain relief.",
    features: [
      "60-minute sessions weekly",
      "10% savings per session",
      "Priority scheduling",
      "Same therapist continuity",
      "Progress tracking",
      "Customized long-term plan",
      "Flexible rescheduling",
    ],
    highlight: true,
  },
  {
    name: "Group / Corporate",
    price: "Custom",
    per: "per program",
    description: "On-site stretching for offices, teams, events, and group wellness programs across NYC.",
    features: [
      "Multiple therapists available",
      "On-site at your office or venue",
      "Flexible scheduling",
      "Employee wellness programs",
      "Team building events",
      "Volume pricing available",
    ],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Stretch NYC Pricing", "Mobile assisted stretching pricing for NYC. $99/session, $89 weekly.", `${SITE_URL}/pricing`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Pricing", url: `${SITE_URL}/pricing` },
      ])} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Simple, Transparent Pricing</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch NYC Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional mobile assisted stretching with no hidden fees. Everything is included — equipment, travel, and a personalized session at your location.
          </p>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 ${
                  tier.highlight
                    ? "border-teal-400 bg-teal-50 shadow-lg ring-2 ring-teal-400"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tier.highlight && (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Most Popular</p>
                )}
                <h2 className="text-xl font-bold text-slate-900 font-heading">{tier.name}</h2>
                <div className="mt-3">
                  <span className="text-4xl font-bold text-teal-700">{tier.price}</span>
                  <span className="ml-2 text-sm text-slate-500">{tier.per}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
                <ul className="mt-6 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={SITE_SMS_LINK}
                  className={`mt-6 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors font-cta ${
                    tier.highlight
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                  }`}
                >
                  {tier.name === "Group / Corporate" ? "Get a Quote" : "Book Now"}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What&apos;s Included in Every Session</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              "Full-body mobility assessment",
              "60 minutes of professional stretching",
              "PNF and assisted stretching techniques",
              "Professional massage table and equipment",
              "Personalized treatment plan",
              "Post-session recommendations",
              "Travel to your NYC location",
              "No hidden fees or surcharges",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-lg border border-teal-200/60 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <p className="text-sm text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Discounts */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Discounts &amp; Special Offers</h2>
          <div className="mt-10 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">10% OFF Weekly Programs</h3>
              <p className="mt-2 text-sm text-slate-600">
                Commit to weekly sessions at $89/session (normally $99). Weekly clients get priority scheduling, same therapist continuity, and the best long-term results. Consistency is key to lasting flexibility.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Referral Program</h3>
              <p className="mt-2 text-sm text-slate-600">
                Refer a friend and both of you receive a discount on your next session. The best way to save is to share the stretch. Ask your therapist for details.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Corporate Volume Pricing</h3>
              <p className="mt-2 text-sm text-slate-600">
                Companies booking regular on-site stretching sessions for employees receive custom pricing based on frequency and group size. <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">Learn about our corporate wellness programs</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Book Your Session?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Text or call us to schedule. Same-day appointments available across NYC.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Text {SITE_PHONE} — Book Now
            </a>
            <a href={SITE_PHONE_LINK} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Call {SITE_PHONE}
            </a>
          </div>
        </div>
      </section>
      {/* Explore Links */}
      <section className="bg-section-teal py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Our Assisted Stretch Service</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href="/locations" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">374 Neighborhoods</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">132 Parks</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Corporate</Link>
            <Link href="/stretching-101" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Stretching 101</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/discounts" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Discounts</Link>
            <Link href="/services/assisted-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service-in-nyc" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
            <Link href="/locations/manhattan" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Manhattan</Link>
            <Link href="/locations/brooklyn" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Brooklyn</Link>
            <Link href="/locations/queens" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Queens</Link>
          </div>
        </div>
      </section>

    </>
  );
}
