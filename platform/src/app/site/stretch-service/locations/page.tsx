import Link from "next/link";
import type { Metadata } from "next";
import { states, cities, getCitiesByState, getStateUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Stretch Service Locations | 902+ Cities, 50 States | $99/hr",
  description: "Professional mobile stretch service in 902+ cities across all 50 states. Find a certified stretch therapist near you. $99/hr, 10% off weekly. Same-day available.",
  alternates: { canonical: `${SITE_URL}/locations` },
};

export default function LocationsPage() {
  return (
    <>
      <JsonLd data={webPageSchema("All Stretch Service Locations — 50 States", "Find mobile stretch service in your city. 902+ cities across all 50 states.", `${SITE_URL}/locations`)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: SITE_URL }, { name: "Locations", url: `${SITE_URL}/locations` }])} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">$99/hr Mobile Stretch Service</p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">902 Cities | 50 States | $99/hr Mobile Stretch Service</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service Locations — <span className="text-teal-200">All 50 States</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional mobile stretch service in {cities.length}+ cities across the United States. Find a certified stretch therapist near you. $99/hr, 10% off weekly.
          </p>
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">50</p>
              <p className="text-xs text-teal-200">States</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{cities.length}+</p>
              <p className="text-xs text-teal-200">Cities</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">$99</p>
              <p className="text-xs text-teal-200">Per Hour</p>
            </div>
          </div>
        </div>
      </section>

      {/* All 50 States */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Browse Stretch Service by State</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">Click any state to explore cities, services, and local parks where we deliver professional stretch service.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((s) => {
              const stateCities = getCitiesByState(s.slug);
              return (
                <Link key={s.slug} href={getStateUrl(s)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{stateCities.length} {stateCities.length === 1 ? "city" : "cities"} served</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">{s.abbr}</span>
                    </div>
                    {stateCities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {stateCities.slice(0, 4).map((c) => (
                          <span key={c.slug} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{c.name}</span>
                        ))}
                        {stateCities.length > 4 && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">+{stateCities.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Don&apos;t See Your City? We&apos;re Expanding Fast</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Text us your location and we&apos;ll check availability. We&apos;re adding new cities every week.</p>
          <a href={SITE_SMS_LINK} className="mt-6 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
            Text {SITE_PHONE}
          </a>
        </div>
      </section>
    </>
  );
}
