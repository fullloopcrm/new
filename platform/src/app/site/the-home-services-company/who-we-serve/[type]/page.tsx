// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site//_data/content";
import { CUSTOMER_TYPES } from "@/app/site//_data/customer-types";
import { SERVICES } from "@/app/site//_data/services";
import { STATES } from "@/app/site//_data/cities";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { customerTypeContent } from "@/app/site//_data/customer-content";

export function generateStaticParams() {
  return CUSTOMER_TYPES.map((ct) => ({ type: ct.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) return {};
  return {
    title: `Home Services for ${ct.name} — Home Services Co for Your Stuff`,
    description: `${ct.description} Starting at $99/hour, licensed and insured, upfront pricing. ${CITY_COUNT} cities.`,
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
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Home Services Built for {ct.name}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services for <span className="gradient-text">{ct.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{ct.description}</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How Our Model Works for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why {ct.name} Choose Home Services Co Home Services</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link>, browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 40 services</Link>, or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book your service</Link> today.
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
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The {ct.name} Service Relationship Over Time</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most {ct.name.toLowerCase()} who become customers use us for between three and ten services per year once the relationship is established. The first appointment is typically a specific need — something broken, a project being planned, or a vendor search that brought them to us. That first appointment is the one that determines whether the relationship deepens. The operational standards we hold on every first appointment are specifically calibrated to make the case for repeat work on its own merit rather than relying on contracts, minimums, or loyalty programs.</p>
            <p>The second and third appointments from {ct.name.toLowerCase()} tend to be different services than the first. A customer who booked us for plumbing might call back for <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC maintenance</Link>. A customer who started with <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link> might call back for <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman work</Link>. This cross-service adoption is the clearest sign the one-vendor model is working for that customer — they have generalized from "this company did a plumbing job well" to "this is a company that handles home services competently across every trade I need."</p>
            <p>Over longer horizons of a year or more, {ct.name.toLowerCase()} customers typically have five to ten distinct services in their account history with us. The services split roughly into three buckets — reactive repair and maintenance (plumbing, electrical, HVAC, appliance repair), planned project work (remodels, flooring, painting, roofing), and recurring service (cleaning, lawn care, pest control, pool service where applicable). Each bucket has different booking patterns, pricing structures, and scheduling expectations, and our system handles all three for the same customer without requiring the customer to manage different relationships for each category.</p>
            <p>The operating benefit of the longer-horizon relationship is compounding knowledge. Our technicians have access to the full service history on your account when they arrive, which means a technician showing up for your second or third service already knows the context of your property, the quirks of the systems, and the preferences you have expressed before. This is something the patchwork of independent contractors in most customers&apos; current vendor stable simply cannot provide, because each contractor has their own records (or no records) and no context-sharing across vendors.</p>
            <p>If you are comparing us against your current vendor setup, the right test is the second appointment, not the first. First appointments from any vendor are usually the most attentive because the vendor is trying to earn the relationship. The second and third appointments — where the same standard of care, communication, and pricing holds — are where most home service relationships actually break down for {ct.name.toLowerCase()}. Our operational standards are set explicitly to hold the same line across every appointment for the life of the account.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Common Pain Points for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Problems We Solve for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Sound familiar? Every one of these is a reason to call us instead of a flat-rate hauler.
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What {ct.name} Get with Home Services Co</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Credit Highlights for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Real numbers from real jobs. See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">full pricing page</Link> for detailed breakdowns.
          </p>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {ct.creditHighlights.map((ch) => (
              <div key={ch} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <span className="text-teal-600 mt-0.5 shrink-0 font-bold">$</span>
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
            These are the services {ct.shortName.toLowerCase()} use most. All <Link href="/services" className="text-teal-700 font-semibold hover:underline">34 services</Link> are available.
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Find {ct.name} Home Services in Your State</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Home Services for {ct.name} by State</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Select your state to find local {ct.shortName.toLowerCase()} home services with <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">our pricing</Link>.
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Book Home Services for {ct.name} Today</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">{ct.name} — Your Stuff Has Value</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
