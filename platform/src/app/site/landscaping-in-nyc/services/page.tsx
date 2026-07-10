import type { Metadata } from "next";
import Link from "next/link";
import { services, getServiceUrl, SITE_DOMAIN, PHONE, SMS_HREF, areas } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";

export const metadata: Metadata = {
  title: "18 Professional Landscaping Services — NYC Outdoor Experts (2026)",
  description:
    "Browse all 18 landscaping services: landscape design, rooftop gardens, irrigation, hardscaping, lawn maintenance, snow removal, and more across NYC.",
  alternates: { canonical: `${SITE_DOMAIN}/services` },
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

export default function ServicesIndexPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "NYC Landscaping Services",
          "All 18 professional landscaping services across New York City.",
          `${SITE_DOMAIN}/services`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
          { name: "Services", url: `${SITE_DOMAIN}/services` },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta">
            18 Specialized Landscaping Services
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Every <span className="text-green-200">Landscaping Service</span> for NYC Properties
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            From <Link href="/services/landscape-design" className="text-green-200 underline underline-offset-2 hover:text-white">custom landscape design</Link> to <Link href="/services/snow-removal" className="text-green-200 underline underline-offset-2 hover:text-white">snow removal</Link> — we cover every outdoor service available in 2026 across <Link href="/areas" className="text-green-200 underline underline-offset-2 hover:text-white">{areas.length}+ neighborhoods</Link>.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            How to Choose the Right <span className="text-green-400">Landscaping Service</span>
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Not all landscaping projects are the same. The right service depends on your property type, outdoor goals, and budget. A <Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-800">rooftop garden project in Manhattan</Link> needs a different approach than a <Link href="/services/lawn-garden-maintenance" className="text-green-600 underline underline-offset-2 hover:text-green-800">lawn maintenance plan in Queens</Link> or a <Link href="/services/patio-hardscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">hardscape installation in Brooklyn</Link>.
            </p>
            <p>
              Each service page below explains how we work, who it&apos;s best for, key features, and what to expect. Not sure where to start? Give us a call at <a href={SMS_HREF} className="text-green-600 underline underline-offset-2 hover:text-green-800">{PHONE}</a> or browse our <Link href="/areas" className="text-green-600 underline underline-offset-2 hover:text-green-800">service areas</Link> to find landscaping near you.
            </p>
          </div>
          <Tip>Quick decision tree: Building a new outdoor space? &rarr; Landscape Design or Patio &amp; Hardscape. Maintaining an existing landscape? &rarr; Lawn &amp; Garden Maintenance. Want color year-round? &rarr; Seasonal Flower Rotations. Need to fix water issues? &rarr; Drainage Solutions. Own a rooftop? &rarr; Rooftop Gardens &amp; Terraces.</Tip>
        </div>
      </section>

      {/* Service Grid */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">All 18 Landscaping Services</h2>
          <p className="mt-2 text-base text-slate-600">Click any service for the full guide — process, features, tips, and neighborhood availability.</p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)}>
                <div className="group h-full rounded-xl border border-green-200/60 bg-white p-6 transition-all hover:border-green-400 hover:shadow-lg">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-green-600 font-heading">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-green-600 font-cta">
                    {service.tagline}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    {service.shortDesc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Most Popular */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            Most Popular Landscaping Services in <span className="text-green-400">2026</span>
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong><Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">Landscape Design</Link></strong> remains our most requested service — NYC property owners want thoughtful, custom outdoor spaces that maximize every square foot. Close behind is <strong><Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-800">Rooftop Gardens &amp; Terraces</Link></strong>, which have exploded in demand as more building owners and residents invest in green rooftop amenities.
            </p>
            <p>
              The fastest-growing segment? <strong><Link href="/services/outdoor-living-spaces" className="text-green-600 underline underline-offset-2 hover:text-green-800">Outdoor Living Spaces</Link></strong>. NYC homeowners who invested in properties in recent years are now upgrading their backyards, terraces, and rooftops with outdoor kitchens, fire pits, and pergolas. <strong><Link href="/services/lawn-garden-maintenance" className="text-green-600 underline underline-offset-2 hover:text-green-800">Lawn &amp; Garden Maintenance</Link></strong> contracts are also surging as busy New Yorkers prefer professional year-round grounds care.
            </p>
          </div>
          <Tip>If you already have a landscape but it needs refreshing, start with a seasonal cleanup and maintenance plan. We will assess your existing plantings, hardscape, and irrigation, then recommend targeted upgrades that deliver the biggest visual impact for your budget.</Tip>
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Find Landscaping Services in Your Neighborhood</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every service above is available across all <Link href="/areas" className="text-green-600 underline underline-offset-2 hover:text-green-800">{areas.length}+ neighborhoods</Link> we serve. Browse by area to see service-specific guides tailored to your location, or get in touch today:
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/areas" className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 font-cta">Browse {areas.length}+ Neighborhoods</Link>
            <Link href="/services" className="rounded-lg border border-green-300 bg-white px-6 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 font-cta">All 18 Services</Link>
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
            Not Sure Which Landscaping Service Is Right for You?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Text us your project details and a landscaping specialist will recommend the right services — free, no obligation.
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
