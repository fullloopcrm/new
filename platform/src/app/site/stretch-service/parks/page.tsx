// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { parks, states, getParksByState, getParkUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Outdoor Stretch Service | 315+ Parks Nationwide | $99/hr",
  description: "Outdoor stretch service at 315+ parks across the United States. Central Park, Golden Gate Park, Millennium Park & more. $99/hr, 10% off weekly. Same-day available.",
  alternates: { canonical: `${SITE_URL}/parks` },
};

export default function ParksPage() {
  return (
    <>
      <JsonLd data={webPageSchema("Parks & Iconic Stretching Locations Nationwide", "Get stretched at 315+ iconic parks and public spaces across the US.", `${SITE_URL}/parks`)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: SITE_URL }, { name: "Parks & Iconic Locations", url: `${SITE_URL}/parks` }])} />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Outdoor Stretch Service Nationwide</p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">475+ Parks & Beaches | Outdoor Stretch Service | $99/hr</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Parks & Iconic <span className="text-teal-200">Stretch Service Locations</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            We bring professional stretch service to {parks.length}+ iconic parks and public spaces across the United States. $99/hr. Perfect for tourists and locals who love outdoor stretching.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          {states.map((s) => {
            const sParks = getParksByState(s.slug);
            if (sParks.length === 0) return null;
            return (
              <div key={s.slug} className="mb-12">
                <h2 className="text-2xl font-bold text-slate-900 font-heading">{s.name} Parks</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sParks.map((p, i) => (
                    <Link key={p.slug} href={getParkUrl(p)}>
                      <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{i + 1}</span>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                            <p className="mt-1 text-xs text-slate-500">{p.city}, {p.state} | Tourist Rating: {"★".repeat(p.touristRating)}</p>
                            <p className="mt-2 text-sm text-slate-600 line-clamp-2">{p.description}</p>
                            <p className="mt-2 text-xs text-teal-600 font-medium">Best spot: {p.bestSpot}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tourist CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Visiting a New City? Get Stretched at an Iconic Location</h2>
          <p className="mt-4 text-lg text-white/80">After walking 20,000 steps exploring, meet us at any park or we&apos;ll come to your hotel. You choose!</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <Link href="/hotel-stretching"><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Hotel Stretching Service</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
