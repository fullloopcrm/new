// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { getAllBoroughs, getBoroughUrl, areas, SITE_DOMAIN, PHONE, SMS_HREF } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

export const metadata: Metadata = {
  title: "Landscaping Service Areas — 137+ Neighborhoods Across NYC & Beyond",
  description:
    "Professional landscaping services across 137+ neighborhoods in Manhattan, Brooklyn, Queens, Bronx, Staten Island, Long Island, and Westchester. 18 services per area.",
  alternates: { canonical: `${SITE_DOMAIN}/areas` },
};

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-green-300 bg-green-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
        <div className="text-sm leading-relaxed text-green-900">
          <span className="font-bold uppercase tracking-wider text-green-700 text-xs">Pro Tip</span>
          <p className="mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

export default function AreasIndexPage() {
  const boroughs = getAllBoroughs();
  const totalAreas = areas.length;

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Landscaping Service Areas",
          `${totalAreas}+ neighborhoods across NYC and surrounding regions.`,
          `${SITE_DOMAIN}/areas`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Areas", url: `${SITE_DOMAIN}/areas` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta">
            Every Major NYC Neighborhood Covered
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Landscaping in <span className="text-green-200">{totalAreas}+ Neighborhoods</span> Across New York City &amp; Beyond
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Browse by borough or region to find neighborhood-specific landscaping guides with all <Link href="/services" className="text-green-200 underline underline-offset-2 hover:text-white">18 landscaping services</Link> and tips from our team of experienced outdoor professionals.
          </p>
        </div>
      </section>

      {/* Intro Content */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why Location Matters for <span className="text-green-400">NYC Landscaping</span>
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Landscaping in New York City is unlike anywhere else. Every neighborhood has unique characteristics — soil conditions, sunlight exposure, space constraints, building regulations, and aesthetic expectations all vary dramatically. A <Link href="/areas/manhattan/upper-east-side" className="text-green-600 underline underline-offset-2 hover:text-green-800">townhouse garden on the Upper East Side</Link> requires a completely different approach than a <Link href="/areas/brooklyn/park-slope" className="text-green-600 underline underline-offset-2 hover:text-green-800">brownstone backyard in Park Slope</Link> or a <Link href="/areas/westchester/scarsdale" className="text-green-600 underline underline-offset-2 hover:text-green-800">suburban estate in Scarsdale</Link>.
            </p>
            <p>
              That&apos;s why we built neighborhood-specific guides for every area we serve. Each neighborhood page includes all <Link href="/services" className="text-green-600 underline underline-offset-2 hover:text-green-800">18 landscaping services</Link> available in that area — from <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">custom landscape design</Link> to <Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-800">rooftop garden installation</Link> to <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-800">winter snow removal</Link>. Call us at <a href={SMS_HREF} className="text-green-600 underline underline-offset-2 hover:text-green-800">{PHONE}</a> or browse below to find landscaping near you.
            </p>
          </div>
          <Tip>The best landscaping projects start with understanding your local microclimate. Manhattan rooftops face extreme wind exposure, Brooklyn brownstone yards have heavy shade from neighboring buildings, and Long Island properties benefit from more open sun and natural soil. Knowing your neighborhood&apos;s conditions is the first step to a successful landscape.</Tip>
        </div>
      </section>

      {/* Borough / Region Grid */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Browse Landscaping by Borough &amp; Region</h2>
          <p className="mt-2 text-base text-slate-600">Select your borough or region to see all covered neighborhoods and available landscaping services.</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boroughs.map((borough) => {
              const highlights: string[] = [];
              if (borough.slug === "manhattan") {
                highlights.push("Rooftop gardens & terraces");
                highlights.push("Townhouse & brownstone yards");
                highlights.push("High-rise container gardens");
              } else if (borough.slug === "brooklyn") {
                highlights.push("Brownstone backyard specialists");
                highlights.push("Community garden design");
                highlights.push("Urban farm installations");
              } else if (borough.slug === "queens") {
                highlights.push("Residential lawn care");
                highlights.push("Full property landscaping");
                highlights.push("Irrigation system experts");
              } else if (borough.slug === "bronx") {
                highlights.push("Residential & commercial grounds");
                highlights.push("Tree & shrub specialists");
                highlights.push("Property cleanup services");
              } else if (borough.slug === "staten-island") {
                highlights.push("Large residential properties");
                highlights.push("Full lawn & garden maintenance");
                highlights.push("Hardscape & patio design");
              } else if (borough.slug === "long-island") {
                highlights.push("Estate landscaping");
                highlights.push("Pool surrounds & outdoor living");
                highlights.push("Year-round maintenance plans");
              } else if (borough.slug === "westchester") {
                highlights.push("Luxury residential landscapes");
                highlights.push("Large property management");
                highlights.push("Custom outdoor living spaces");
              }

              return (
                <Link key={borough.slug} href={getBoroughUrl(borough.slug)}>
                  <div className="group h-full rounded-xl border border-green-200/60 bg-white p-5 transition-all hover:border-green-400 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900 group-hover:text-green-600 font-heading">
                        {borough.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                        {borough.count} {borough.count === 1 ? "neighborhood" : "neighborhoods"}
                      </span>
                    </div>

                    {highlights.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {highlights.map((h) => (
                          <span key={h} className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Neighborhoods */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Top Landscaping Neighborhoods in <span className="text-green-400">2026</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            These are our most active service areas based on project volume, property types, and outdoor investment. Each neighborhood has unique characteristics that shape the landscaping approach.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "Park Slope, Brooklyn", href: "/areas/brooklyn/park-slope", why: "Brownstone gardens, family-friendly yards" },
              { name: "Upper East Side, Manhattan", href: "/areas/manhattan/upper-east-side", why: "Townhouse gardens, rooftop terraces" },
              { name: "Scarsdale, Westchester", href: "/areas/westchester/scarsdale", why: "Estate landscaping, luxury outdoor living" },
              { name: "Garden City, Long Island", href: "/areas/long-island/garden-city", why: "Full residential landscaping" },
              { name: "Riverdale, Bronx", href: "/areas/bronx/riverdale", why: "Large lots, tree-lined properties" },
              { name: "Williamsburg, Brooklyn", href: "/areas/brooklyn/williamsburg", why: "Modern urban gardens, rooftops" },
              { name: "Forest Hills, Queens", href: "/areas/queens/forest-hills", why: "Tudor homes, mature landscapes" },
              { name: "Todt Hill, Staten Island", href: "/areas/staten-island/todt-hill", why: "Hilltop estates, expansive grounds" },
            ].map((area) => (
              <Link key={area.href} href={area.href}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-green-600 font-heading">{area.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{area.why}</p>
                </div>
              </Link>
            ))}
          </div>
          <Tip>Brooklyn and Manhattan are our highest-volume boroughs for urban landscaping — rooftop gardens, container plantings, and small-space design dominate. Long Island and Westchester lead in full-property estate landscaping with larger budgets and bigger outdoor spaces. Queens and the Bronx offer the best mix of residential yard work and community beautification projects.</Tip>
        </div>
      </section>

      {/* Services Cross-link */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            18 Landscaping Services Available in <span className="text-green-400">Every Neighborhood</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every neighborhood page includes access to all 18 landscaping services. Whether you need <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">landscape design</Link>, <Link href="/services/patio-hardscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">patio and hardscape installation</Link>, or <Link href="/services/lawn-garden-maintenance" className="text-green-600 underline underline-offset-2 hover:text-green-800">year-round lawn maintenance</Link> — your neighborhood page connects you to the right service with local context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/services" className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 font-cta">View All 18 Services</Link>
            <a href={SMS_HREF} className="rounded-lg border border-green-300 bg-white px-6 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 font-cta">Text Us: {PHONE}</a>
            <Link href="/contact" className="rounded-lg border border-green-300 bg-white px-6 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 font-cta">Get a Free Estimate</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Can&apos;t Find Your Neighborhood?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            We serve the entire NYC metropolitan area. Even if your neighborhood isn&apos;t listed, our team can help. Text us and we&apos;ll get you connected.
          </p>
          <div className="mt-8">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg hover:bg-green-50 font-cta">
              {PHONE} | Text Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
