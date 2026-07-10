import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/we-pay-you-junk/_data/customer-types";
import { SERVICES } from "@/app/site/we-pay-you-junk/_data/services";
import { STATES } from "@/app/site/we-pay-you-junk/_data/cities";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { customerTypeContent } from "@/app/site/we-pay-you-junk/_data/customer-content";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) return {};
  return {
    title: `Junk Removal for ${ct.name} — We Pay You for Your Stuff`,
    description: `${ct.description} Starting at $200/hr, dump fees included, 50% Resale Credit (when applicable). ${CITY_COUNT}+ cities.`,
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Junk Removal Built for {ct.name}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Junk Removal for <span className="gradient-text">{ct.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{ct.description}</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How Our Model Works for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why {ct.name} Choose We Pay You Junk Removal</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link>, browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">all 34 services</Link>, or <Link href="/book-junk-removal-service-today" className="text-teal-700 font-semibold hover:underline">book your pickup</Link> today.
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What {ct.name} Earn in Resale Credits</p>
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Find {ct.name} Junk Removal in Your State</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Junk Removal for {ct.name} by State</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Select your state to find local {ct.shortName.toLowerCase()} junk removal with <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">our pricing</Link> and credits.
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Book Junk Removal for {ct.name} Today</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">{ct.name} — Your Stuff Has Value</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
