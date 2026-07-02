// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-home-services-company/_data/content";
import { STATES, getStateBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { statePageContent } from "@/app/site/the-home-services-company/_data/content-templates";
import { getOfficeByState } from "@/app/site/the-home-services-company/_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) return {};
  const content = statePageContent(state.name, state.abbreviation, state.cities);
  return { title: content.title, description: content.metaDescription, alternates: { canonical: `/locations/${stateSlug}` } };
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateSlug } = await params;
  const state = getStateBySlug(stateSlug);
  if (!state) notFound();

  const content = statePageContent(state.name, state.abbreviation, state.cities);
  const office = getOfficeByState(stateSlug);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{content.heroSubtitle}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services in <span className="gradient-text">{state.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Professional home services in {state.cities.length} cities across {state.abbreviation}. 40 services starting at $99/hour, licensed and insured, same-day availability.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {office && <OfficeBlock office={office} />}

      {/* Inner-linked intro */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Every Home Service in {state.name} — One Phone Number
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Home Services Co operates in{" "}
              {state.cities.slice(0, 5).map((c, idx, arr) => (
                <span key={c.slug}>
                  <Link href={`/locations/${state.slug}/${c.slug}`} className="text-teal-700 font-semibold hover:underline">{c.name}</Link>
                  {idx < arr.length - 2 ? ", " : idx === arr.length - 2 ? ", and " : ""}
                </span>
              ))}
              {" "}and {state.cities.length - 5} other {state.abbreviation} cities — all at the same{" "}
              <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">$99/hour starting rate</Link> with{" "}
              <Link href="/blog/licensed-and-insured-what-it-means" className="text-teal-700 font-semibold hover:underline">licensed and insured</Link> technicians.
            </p>
            <p>
              The most common {state.abbreviation} calls are{" "}
              <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>,{" "}
              <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>,{" "}
              <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>,{" "}
              <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>,{" "}
              <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman work</Link>, and{" "}
              <Link href="/services/appliance-repair" className="text-teal-700 font-semibold hover:underline">appliance repair</Link>. Project work includes{" "}
              <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>,{" "}
              <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>,{" "}
              <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">roofing</Link>,{" "}
              <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link>, and{" "}
              <Link href="/services/flooring-installation" className="text-teal-700 font-semibold hover:underline">flooring installation</Link>.
            </p>
            <p>
              For recurring maintenance — <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>,{" "}
              <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>,{" "}
              <Link href="/services/pool-services" className="text-teal-700 font-semibold hover:underline">pool services</Link>,{" "}
              <Link href="/services/gutter-cleaning" className="text-teal-700 font-semibold hover:underline">gutter cleaning</Link> — ${state.name} accounts get consistent technicians and priority scheduling. For commercial clients, see our{" "}
              <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link> and{" "}
              <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property manager accounts</Link>.
              {state.cities.length > 0 && (
                <>
                  {" "}Licensed technicians in {state.name} —{" "}
                  <Link href={`/careers/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} careers</Link>. Contractors partnering with us —{" "}
                  <Link href={`/partnerships/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} partnerships</Link>.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Long-form content sections */}
      {content.sections.map((section, i) => (
        <section key={i} className={i % 2 === 0 ? "bg-section-white py-16" : "bg-section-teal py-16"}>
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{section.heading}</h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Cities grid */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {state.cities.length} Cities in {state.name}
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {state.cities.map((city) => (
              <Link key={city.slug} href={`/locations/${state.slug}/${city.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{city.name}</p>
                <p className="mt-0.5 text-xs text-teal-600">Same-day available</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Services available */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {SERVICES.length} Services Available in {state.name}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{s.subtitle}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book Home Services in {state.name} Today
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {state.cities.length} cities. Same-day available. Starting at $99/hour with upfront pricing.
          </p>
          <div className="mt-8">
            <a href={PHONE_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
