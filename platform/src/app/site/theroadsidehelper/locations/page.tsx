import Link from "next/link";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { ValuationHint } from "@/app/site/theroadsidehelper/_components/ValuationHint";
import { PHONE, PHONE_HREF, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { STATES, TOTAL_CITIES } from "@/app/site/theroadsidehelper/_data/cities";
import { OFFICES } from "@/app/site/theroadsidehelper/_data/offices";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title: `Roadside Assistance Locations — 50 Offices, ${TOTAL_CITIES}+ Cities, All 50 States`,
  description: `Roadside assistance in 50 states, ${TOTAL_CITIES}+ cities. Flat $149/hr 24/7 nationwide. No membership. Call (888) 944-3001. Find your local office address and directions.`,
  path: "/locations",
});

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
            Roadside Assistance Near Me —<br /><span className="gradient-text">{TOTAL_CITIES}+ Cities, 24/7</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One office in every state. {TOTAL_CITIES}+ cities served nationwide. $149/hr flat, all standard equipment included, 24/7 dispatch nationwide.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* All 50 offices */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Roadside Assistance Offices in All 50 States</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            All 50 The Roadside Helper Offices
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every state has a local office with crews who know your area. Browse our <Link href="/services" className="text-teal-700 font-semibold hover:underline">full service menu</Link>, review our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent hourly pricing</Link>, or <Link href="/book-roadside-help-now" className="text-teal-700 font-semibold hover:underline">book your roadside assistance online</Link>. Click any state below for full city listings.</p>

          <ValuationHint className="mx-auto mt-6 max-w-3xl" />

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
                            The Roadside Helper {office.state}
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
                          <Link href="/book-roadside-help-now" className="inline-block rounded-md bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-dark font-cta">Book Now &amp; Save $10</Link>
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Find Roadside Assistance Service in Your City</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Browse Cities by State
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Select your state to see every city we serve with <Link href="/services" className="text-teal-700 font-semibold hover:underline">full-service roadside assistance</Link>. Each location offers the same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">$149/hr flat pricing with response times</Link>, and you can <Link href="/contact-the-roadside-helper" className="text-teal-700 font-semibold hover:underline">contact us</Link> if you do not see your area listed.</p>
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

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Roadside Assistance Service Expanding Nationwide</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Don&apos;t See Your City?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">We are expanding every week and chances are we already have a crew in your area. <Link href="/contact-the-roadside-helper" className="text-teal-200 font-semibold hover:underline">Send us a message</Link>, check our <Link href="/faq" className="text-teal-200 font-semibold hover:underline">FAQ for coverage questions</Link>, or explore <Link href="/franchise" className="text-teal-200 font-semibold hover:underline">franchise opportunities</Link> to bring The Roadside Helper to your market.</p>
          <div className="mt-8">
            <a href={PHONE_HREF}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}