// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { getAllBoroughs, getBoroughUrl, areas, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

export const metadata: Metadata = {
  title: `Interior Design Service Areas — ${areas.length}+ Neighborhoods Across NYC & Beyond`,
  description:
    `Professional interior design services across ${areas.length}+ neighborhoods in Manhattan, Brooklyn, Queens, Bronx, Staten Island, Long Island, Westchester, and New Jersey. 18 services per area.`,
  alternates: { canonical: `${SITE_DOMAIN}/areas` },
};

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#9997;&#65039;</span>
        <div className="text-sm leading-relaxed text-blue-900">
          <span className="font-bold uppercase tracking-wider text-blue-700 text-xs">Design Tip</span>
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
          "Interior Design Service Areas",
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
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300 font-cta">
            Every Major NYC Neighborhood Covered
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Interior Design in <span className="text-blue-300">{totalAreas}+ Neighborhoods</span> Across New York City &amp; Beyond
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Browse by borough or region to find neighborhood-specific interior design guides with all <Link href="/services" className="text-blue-300 underline underline-offset-2 hover:text-white">18 design services</Link> and tips from our team of experienced designers.
          </p>
        </div>
      </section>

      {/* Intro Content */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Why Location Matters for <span className="text-blue-600">NYC Interior Design</span>
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Interior design in New York City is unlike anywhere else. Every neighborhood has unique characteristics — architectural styles, natural light conditions, space constraints, building regulations, and aesthetic expectations all vary dramatically. A <Link href="/areas/manhattan/upper-east-side" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">pre-war apartment on the Upper East Side</Link> requires a completely different approach than a <Link href="/areas/brooklyn/williamsburg" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">loft conversion in Williamsburg</Link> or a <Link href="/areas/westchester/scarsdale" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">suburban home in Scarsdale</Link>.
            </p>
            <p>
              That&apos;s why we built neighborhood-specific guides for every area we serve. Each neighborhood page includes all <Link href="/services" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">18 interior design services</Link> available in that area — from <Link href="/services/full-home-interior-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">full-home interior design</Link> to <Link href="/services/staging-styling" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">real estate staging</Link> to <Link href="/services/renovation-management" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">renovation management</Link>. Call us at <a href={SMS_HREF} className="text-blue-700 underline underline-offset-2 hover:text-blue-900">{PHONE}</a> or browse below to find interior design near you.
            </p>
          </div>
          <Tip>The best interior design projects start with understanding your local context. Manhattan pre-war apartments have ornate moldings worth preserving, Brooklyn brownstones offer parlor-floor proportions perfect for entertaining, and Long Island homes benefit from open-plan layouts that connect indoor and outdoor living. Knowing your neighborhood&apos;s architectural DNA is the first step to a successful design.</Tip>
        </div>
      </section>

      {/* Borough / Region Grid */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Browse Interior Design by Borough &amp; Region</h2>
          <p className="mt-2 text-base text-slate-600">Select your borough or region to see all covered neighborhoods and available design services.</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boroughs.map((borough) => {
              const highlights: string[] = [];
              if (borough.slug === "manhattan") {
                highlights.push("Pre-war apartment specialists");
                highlights.push("Luxury condo design");
                highlights.push("Co-op renovation experts");
              } else if (borough.slug === "brooklyn") {
                highlights.push("Brownstone & townhouse design");
                highlights.push("Loft & industrial conversions");
                highlights.push("Modern family interiors");
              } else if (borough.slug === "queens") {
                highlights.push("Residential full-home design");
                highlights.push("Multi-family renovations");
                highlights.push("Kitchen & bath specialists");
              } else if (borough.slug === "bronx") {
                highlights.push("Residential & commercial interiors");
                highlights.push("Budget-friendly design");
                highlights.push("Renovation management");
              } else if (borough.slug === "staten-island") {
                highlights.push("Single-family home design");
                highlights.push("Open-plan living specialists");
                highlights.push("New construction interiors");
              } else if (borough.slug === "long-island") {
                highlights.push("Luxury residential design");
                highlights.push("Whole-home renovations");
                highlights.push("Coastal & contemporary styles");
              } else if (borough.slug === "westchester") {
                highlights.push("Estate-level interiors");
                highlights.push("Traditional & transitional design");
                highlights.push("Custom millwork & finishes");
              } else if (borough.slug === "new-jersey") {
                highlights.push("Waterfront condo design");
                highlights.push("Modern apartment interiors");
                highlights.push("Commercial office design");
              }

              return (
                <Link key={borough.slug} href={getBoroughUrl(borough.slug)}>
                  <div className="group h-full rounded-xl border border-slate-200/60 bg-white p-5 transition-all hover:border-blue-400 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900 group-hover:text-blue-700 font-heading">
                        {borough.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                        {borough.count} {borough.count === 1 ? "neighborhood" : "neighborhoods"}
                      </span>
                    </div>

                    {highlights.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {highlights.map((h) => (
                          <span key={h} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-800">{h}</span>
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
            Top Interior Design Neighborhoods in <span className="text-blue-600">2026</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            These are our most active service areas based on project volume, property types, and design investment. Each neighborhood has unique characteristics that shape the design approach.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name: "Upper East Side, Manhattan", href: "/areas/manhattan/upper-east-side", why: "Pre-war apartments, luxury renovations" },
              { name: "Tribeca, Manhattan", href: "/areas/manhattan/tribeca", why: "Loft conversions, high-end finishes" },
              { name: "Park Slope, Brooklyn", href: "/areas/brooklyn/park-slope", why: "Brownstone interiors, family design" },
              { name: "Scarsdale, Westchester", href: "/areas/westchester/scarsdale", why: "Estate-level whole-home design" },
              { name: "Williamsburg, Brooklyn", href: "/areas/brooklyn/williamsburg", why: "Modern lofts, creative spaces" },
              { name: "Forest Hills, Queens", href: "/areas/queens/forest-hills", why: "Tudor homes, classic interiors" },
              { name: "Garden City, Long Island", href: "/areas/long-island/garden-city", why: "Full residential design" },
              { name: "Hoboken, New Jersey", href: "/areas/new-jersey/hoboken", why: "Waterfront condos, modern design" },
            ].map((area) => (
              <Link key={area.href} href={area.href}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 font-heading">{area.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{area.why}</p>
                </div>
              </Link>
            ))}
          </div>
          <Tip>Manhattan and Brooklyn are our highest-volume boroughs for urban interior design — apartment renovations, kitchen and bathroom overhauls, and space-maximizing design dominate. Long Island and Westchester lead in full-home design with larger budgets and more expansive properties. Queens and the Bronx offer excellent value with growing demand for professional design services.</Tip>
        </div>
      </section>

      {/* Services Cross-link */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            18 Interior Design Services Available in <span className="text-blue-600">Every Neighborhood</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every neighborhood page includes access to all 18 design services. Whether you need <Link href="/services/full-home-interior-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">full-home design</Link>, <Link href="/services/kitchen-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">kitchen renovation</Link>, or <Link href="/services/staging-styling" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">real estate staging</Link> — your neighborhood page connects you to the right service with local context.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={SMS_HREF} className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 font-cta">Text Us</a>
            <a href={PHONE_HREF} className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 font-cta">Call {PHONE}</a>
            <Link href="/contact" className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 font-cta">Get a Free Consultation</Link>
            <Link href="/services" className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 font-cta">View All 18 Services</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Can&apos;t Find Your Neighborhood?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            We serve the entire NYC metropolitan area. Even if your neighborhood isn&apos;t listed, our team can help. Text us and we&apos;ll get you connected.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
