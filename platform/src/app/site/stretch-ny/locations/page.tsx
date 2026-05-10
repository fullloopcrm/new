// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { boroughs, neighborhoods, getNeighborhoodUrl, getBoroughUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Assisted Stretch Service NYC | All Boroughs & 374 Neighborhoods",
  description: "Assisted stretch service across 374 NYC neighborhoods. Manhattan, Brooklyn, Queens, Bronx & Staten Island. $99/hr, 10% off weekly. Same-day 7AM-10PM.",
  alternates: { canonical: `${SITE_URL}/locations` },
};

export default function LocationsPage() {
  return (
    <>
      <JsonLd data={webPageSchema("NYC Stretching Locations", "All neighborhoods served by Stretch NYC.", `${SITE_URL}/locations`)} />
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: SITE_URL }, { name: "Locations", url: `${SITE_URL}/locations` }])} />

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">374 NYC Neighborhoods | All 5 Boroughs | $99/hr</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            NYC Stretch Service <span className="text-teal-200">Locations</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional mobile stretch service across {neighborhoods.length}+ neighborhoods in all 5 NYC boroughs. $99/hr, we come to you!
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          {boroughs.map((b) => {
            const bNeighborhoods = neighborhoods.filter((n) => n.boroughSlug === b.slug);
            return (
              <div key={b.slug} className="mb-12">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 font-heading">{b.name}</h2>
                  <Link href={getBoroughUrl(b)} className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">
                    View All {b.name} &rarr;
                  </Link>
                </div>
                <p className="mt-1 text-sm text-slate-500">{bNeighborhoods.length} neighborhoods</p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {bNeighborhoods.map((n) => (
                    <Link key={n.slug} href={getNeighborhoodUrl(n)}>
                      <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{n.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{n.vibe}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Don&apos;t See Your Neighborhood?</h2>
          <p className="mt-4 text-lg text-white/80">We serve all of NYC. Text us your location and we&apos;ll confirm availability.</p>
          <a href={SITE_SMS_LINK} className="mt-6 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</a>
        </div>
      </section>
    </>
  );
}
