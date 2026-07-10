import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { STATES, TOTAL_CITIES } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { OFFICES } from "@/app/site/nycroadsideemergencyassistance/_data/offices";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: `NYC Coverage — $149/hr, $25 Off Online, No Catches. ${TOTAL_CITIES}+ Neighborhoods, All 5 Boroughs.`,
  description: `NYC Roadside Emergency Assistance covers all 5 boroughs at one transparent rate: $149/hour, $25 off online ($124 first hour). No NYC surcharge, no after-hours markup. Dispatch hubs in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. ${TOTAL_CITIES}+ neighborhoods, 24/7.`,
  alternates: { canonical: "/locations" },
};

export default function LocationsPage() {
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Locations", url: "/locations" },
          ]),
          itemListSchema(
            STATES.map((s) => ({
              name: `${s.name}, NYC`,
              url: `/locations/${s.slug}`,
              description: `${s.cities.length} neighborhoods covered in ${s.name}`,
            })),
            "NYC Towing Coverage Areas",
          ),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            5 Borough Hubs &bull; {TOTAL_CITIES}+ Neighborhoods &bull; 24/7
          </p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            NYC Tow Truck <span className="gradient-text">Coverage Areas</span> — All 5 Boroughs &amp; {TOTAL_CITIES}+ Neighborhoods
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Dispatch hubs in every borough. Trucks staged locally for fast arrival. 24/7 service across {TOTAL_CITIES}+ NYC neighborhoods.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* All 5 hubs */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Our 5 NYC Dispatch Hubs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">One hub in each borough. Trucks staged locally so arrival times stay short. Browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">full service menu</Link>, review <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">flat-rate pricing</Link>, or <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request service</Link>. Click any borough for neighborhood-level detail.</p>

          <div className="mt-10 space-y-4">
            {OFFICES.map((office) => {
              const stateData = STATES.find((s) => s.slug === office.stateSlug);
              const cityCount = stateData?.cities.length || 0;

              return (
                <div key={office.stateSlug} className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all hover:border-teal-400 hover:shadow-md">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Left */}
                      <div className="flex-1">
                        <Link href={`/locations/${office.stateSlug}`} className="group">
                          <h3 className="text-xl font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">
                            {office.state} Dispatch Hub
                          </h3>
                        </Link>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-base text-slate-700">{office.address}</p>
                          <p className="text-base text-slate-700">{office.city}, NY {office.zip}</p>
                          <p className="mt-1 text-sm text-slate-500">{PHONE}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{cityCount} neighborhoods covered across {office.state}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a href={SMS_HREF} className="inline-block rounded-md bg-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 font-cta">Text Us</a>
                          <a href={PHONE_HREF} className="inline-block rounded-md border border-teal-700 px-4 py-2 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-50 font-cta">Call Us</a>
                          <Link href="/book-towing-service-today" className="inline-block rounded-md bg-accent px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-dark font-cta">Request a Tow</Link>
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

      {/* Browse by borough */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Browse Neighborhoods by Borough
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Select a borough to see every neighborhood we serve with 24/7 towing and roadside. Flat-rate pricing the same in all boroughs.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {STATES.map((state) => (
              <Link
                key={state.slug}
                href={`/locations/${state.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{state.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{state.cities.length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need Dispatch Right Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Call <a href={PHONE_HREF} className="text-teal-200 font-semibold hover:underline">{PHONE}</a> — any borough, any neighborhood, any hour.</p>
          <div className="mt-8">
            <a href={PHONE_HREF}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}