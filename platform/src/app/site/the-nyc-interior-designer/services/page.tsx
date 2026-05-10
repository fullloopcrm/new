// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { services, getServiceUrl, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF, areas } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";

export const metadata: Metadata = {
  title: "18 Professional Interior Design Services — NYC Design Experts (2026)",
  description:
    "Browse all 18 interior design services: full-home design, kitchen & bathroom renovation, space planning, lighting design, staging, and more across NYC.",
  alternates: { canonical: `${SITE_DOMAIN}/services` },
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

export default function ServicesIndexPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "NYC Interior Design Services",
          "All 18 professional interior design services across New York City.",
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
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300 font-cta">
            18 Specialized Interior Design Services
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Every <span className="text-blue-300">Interior Design Service</span> for NYC Properties
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            From <Link href="/services/full-home-interior-design" className="text-blue-300 underline underline-offset-2 hover:text-white">full-home interior design</Link> to <Link href="/services/smart-home-integration" className="text-blue-300 underline underline-offset-2 hover:text-white">smart home integration</Link> — we cover every design service available in 2026 across <Link href="/areas" className="text-blue-300 underline underline-offset-2 hover:text-white">{areas.length}+ neighborhoods</Link>.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">
            How to Choose the Right <span className="text-blue-600">Interior Design Service</span>
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Not all interior design projects are the same. The right service depends on your property type, design goals, and budget. A <Link href="/services/kitchen-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">kitchen renovation in a pre-war co-op</Link> needs a different approach than a <Link href="/services/commercial-interior-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">commercial office fit-out in Midtown</Link> or a <Link href="/services/staging-styling" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">staging project for a Brooklyn listing</Link>.
            </p>
            <p>
              Each service page below explains how we work, who it&apos;s best for, key features, and what to expect. Not sure where to start? Give us a call at <a href={SMS_HREF} className="text-blue-700 underline underline-offset-2 hover:text-blue-900">{PHONE}</a> or browse our <Link href="/areas" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">service areas</Link> to find interior design near you.
            </p>
          </div>
          <Tip>Quick decision tree: Designing an entire home? &rarr; Full-Home Interior Design. Renovating one room? &rarr; Kitchen, Bathroom, Living Room, or Bedroom Design. Selling your property? &rarr; Staging &amp; Styling. Need help with a renovation? &rarr; Renovation Management. Want to refresh your look? &rarr; Color Consultation or Furniture Selection.</Tip>
        </div>
      </section>

      {/* Service Grid */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">All 18 Interior Design Services</h2>
          <p className="mt-2 text-base text-slate-600">Click any service for the full guide — process, features, tips, and neighborhood availability.</p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)}>
                <div className="group h-full rounded-xl border border-slate-200/60 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-lg">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 font-heading">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-blue-700 font-cta">
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
            Most Popular Interior Design Services in <span className="text-blue-600">2026</span>
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              <strong><Link href="/services/full-home-interior-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">Full-Home Interior Design</Link></strong> remains our most requested service — NYC homeowners want cohesive, professionally designed spaces that maximize every square foot. Close behind is <strong><Link href="/services/kitchen-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">Kitchen Design</Link></strong>, the most impactful single-room renovation for both daily living and resale value.
            </p>
            <p>
              The fastest-growing segment? <strong><Link href="/services/home-office-design" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">Home Office Design</Link></strong>. With remote and hybrid work now permanent, NYC professionals are investing in dedicated workspaces that boost productivity and look polished on video calls. <strong><Link href="/services/staging-styling" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">Staging &amp; Styling</Link></strong> also continues to surge as sellers recognize the ROI of professional staging in NYC&apos;s competitive real estate market.
            </p>
          </div>
          <Tip>If you already have a designed space that needs refreshing, start with a Color Consultation or Furniture Selection session. We will assess your existing interior, identify what is working and what is not, and recommend targeted updates that deliver the biggest visual impact for your budget.</Tip>
        </div>
      </section>

      {/* Cross-links */}
      <section className="bg-section-light py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Find Interior Design Services in Your Neighborhood</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every service above is available across all <Link href="/areas" className="text-blue-700 underline underline-offset-2 hover:text-blue-900">{areas.length}+ neighborhoods</Link> we serve. Browse by area to see service-specific guides tailored to your location, or get in touch today:
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={SMS_HREF} className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 font-cta">Text Us</a>
            <a href={PHONE_HREF} className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 font-cta">Call {PHONE}</a>
            <Link href="/contact" className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 font-cta">Get a Free Consultation</Link>
            <Link href="/areas" className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 font-cta">Browse {areas.length}+ Neighborhoods</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Not Sure Which Interior Design Service Is Right for You?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Text us your project details and a design specialist will recommend the right services — free, no obligation.
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
