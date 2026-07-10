import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/nycroadsideemergencyassistance/_data/customer-types";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { STATES } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { customerTypeContent } from "@/app/site/nycroadsideemergencyassistance/_data/customer-content";
import { JsonLd, breadcrumbSchema, serviceSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) return {};
  return {
    title: `NYC Tow for ${ct.name} — $149/hr, $25 Off Online, No Catches.`,
    description: `${ct.description} One rate: $149/hour, $25 off online ($124 first hour). No NYC surcharge, no after-hours markup. 24/7 dispatch, all 5 NYC boroughs.`,
    alternates: { canonical: `/who-we-serve/${type}` },
  };
}

export default async function CustomerTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) notFound();

  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  const otherTypes = CUSTOMER_TYPES.filter((c) => c.slug !== type).slice(0, 6);

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Who We Serve", url: "/who-we-serve/stranded-motorists" },
            { name: ct.name, url: `/who-we-serve/${type}` },
          ]),
          ...(relatedServices[0]
            ? [
                serviceSchema(relatedServices[0], {
                  url: `/who-we-serve/${type}`,
                }),
              ]
            : []),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Towing & Roadside for {ct.name}</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            NYC Tow Truck &amp; Roadside Service for <span className="gradient-text">{ct.name}</span> — 24/7 Dispatch
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{ct.description}</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How We Work With {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why {ct.name} Call NYC Roadside Emergency Assistance</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">flat-rate pricing</Link>, browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">all {SERVICES.length} services</Link>, or <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request service</Link> today.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            {customerTypeContent(ct).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Common Pain Points for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Problems We Solve for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Sound familiar? Every one of these is a reason to call a local NYC operator directly instead of a national roadside network.
          </p>
          <div className="mx-auto mt-8 max-w-2xl grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ct.painPoints.map((pp) => (
              <div key={pp} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="text-accent mt-0.5 shrink-0">→</span>
                <span className="text-sm text-slate-700">{pp}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What {ct.name} Get From Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Standards for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Standard operating procedure on every call. See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing page</Link> for rate breakdowns.
          </p>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {ct.creditHighlights.map((ch) => (
              <div key={ch} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <span className="text-teal-600 mt-0.5 shrink-0 font-bold">✓</span>
                <span className="text-sm text-slate-700">{ch}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Top Services for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Recommended Services for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            These are the services {ct.shortName.toLowerCase()} use most. All <Link href="/services" className="text-teal-700 font-semibold hover:underline">{SERVICES.length} services</Link> are available 24/7.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map((s) => (
              <Link key={s.slug} href={`/who-we-serve/${type}/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">{s.title} for {ct.shortName} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Coverage by Borough</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Towing for {ct.name} by NYC Borough</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Select your borough to see local service for {ct.shortName.toLowerCase()} with flat-rate pricing.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {STATES.map((s) => (
              <Link key={s.slug} href={`/who-we-serve/${type}/${s.slug}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-all">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">We Also Serve These Customer Types</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Other Customers We Work With</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherTypes.map((ot) => (
              <Link key={ot.slug} href={`/who-we-serve/${ot.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{ot.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{ot.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Dispatch for {ct.name} — 24/7</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">{ct.name} — Call Dispatch Anytime</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}