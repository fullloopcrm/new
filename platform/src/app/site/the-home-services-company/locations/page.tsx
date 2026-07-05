import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/the-home-services-company/_data/content";
import { STATES, TOTAL_CITIES } from "@/app/site/the-home-services-company/_data/cities";
import { OFFICES } from "@/app/site/the-home-services-company/_data/offices";

export const metadata: Metadata = {
  title: `Home Services Locations — 50 Offices, ${TOTAL_CITIES}+ Cities, All 50 States`,
  description: `Home Services Co has 50 offices across all 50 states serving ${TOTAL_CITIES}+ cities. Find your nearest office with address and directions.`,
  alternates: { canonical: "/locations" },
};

export default function LocationsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            50 Offices &bull; {TOTAL_CITIES}+ Cities &bull; All 50 States
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services Co <span className="gradient-text">Locations</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One office in every state. {TOTAL_CITIES}+ cities served nationwide. starting at $99/hour, licensed and insured, same-day availability.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* All 50 offices */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Home Services Offices in All 50 States</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            All 50 Home Services Co Offices
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every state has a local office with crews who know your area. Browse our <Link href="/services" className="text-teal-700 font-semibold hover:underline">full service menu</Link>, review our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent hourly pricing</Link>, or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book your home services online</Link>. Click any state below for full city listings.</p>

          <div className="mt-10 space-y-4">
            {OFFICES.map((office) => {
              const stateData = STATES.find((s) => s.slug === office.stateSlug);
              const cityCount = stateData?.cities.length || 0;

              return (
                <div key={office.stateSlug} className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all hover:border-teal-400 hover:shadow-md">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Left — state name + address */}
                      <div className="flex-1">
                        <Link href={`/locations/${office.stateSlug}`} className="group">
                          <h3 className="text-xl font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">
                            Home Services Co {office.state}
                          </h3>
                        </Link>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-base text-slate-700">{office.address}</p>
                          <p className="text-base text-slate-700">{office.city}, {office.stateAbbr} {office.zip}</p>
                          <p className="mt-1 text-sm text-slate-500">{PHONE}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{cityCount} cities served in {office.stateAbbr}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a href={SMS_HREF} className="inline-block rounded-md bg-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 font-cta">Text Us</a>
                          <a href={PHONE_HREF} className="inline-block rounded-md border border-teal-700 px-4 py-2 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-50 font-cta">Call Us</a>
                          <Link href="/book" className="inline-block rounded-md bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-dark font-cta">Book Now</Link>
                        </div>
                      </div>

                      {/* Right — directions */}
                      <div className="sm:max-w-xs sm:text-right">
                        <p className="text-sm text-slate-600 leading-relaxed">{office.directions}</p>
                        <a href={office.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold text-teal-700 hover:underline font-cta">
                          Get Directions →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Browse by state */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Find Home Services Service in Your City</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Browse Cities by State
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Select your state to see every city we serve with <Link href="/services" className="text-teal-700 font-semibold hover:underline">full-service home services</Link>. Each location offers the same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">starting at $99/hour pricing with upfront estimates</Link>, and you can <Link href="/contact" className="text-teal-700 font-semibold hover:underline">contact us</Link> if you do not see your area listed.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {STATES.map((state) => (
              <Link
                key={state.slug}
                href={`/locations/${state.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{state.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{state.cities.length} cities</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* All 990 cities, grouped by state */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Every City We Serve</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            All {TOTAL_CITIES} Home Services Locations
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Every city we serve, grouped by state. Click any city for local pricing, same-day scheduling, and the full 40-service menu.
          </p>
          <div className="mt-10 space-y-10">
            {STATES.map((state) => (
              <div key={state.slug} id={state.slug}>
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xl font-bold text-slate-900 font-heading">
                    <Link href={`/locations/${state.slug}`} className="hover:text-teal-700 transition-colors">
                      {state.name}
                    </Link>
                  </h3>
                  <span className="text-sm text-slate-500">{state.cities.length} cities</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {state.cities.map((city) => (
                    <Link
                      key={city.slug}
                      href={`/locations/${state.slug}/${city.slug}`}
                      className="text-sm text-slate-700 hover:text-teal-700 hover:underline py-0.5"
                    >
                      {city.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Home Services Service Expanding Nationwide</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Don&apos;t See Your City?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">We are expanding every week and chances are we already have a crew in your area. <Link href="/contact" className="text-teal-200 font-semibold hover:underline">Send us a message</Link>, check our <Link href="/faq" className="text-teal-200 font-semibold hover:underline">FAQ for coverage questions</Link>, or explore <Link href="/franchise" className="text-teal-200 font-semibold hover:underline">franchise opportunities</Link> to bring Home Services Co to your market.</p>
          <div className="mt-8">
            <a href={PHONE_HREF}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
