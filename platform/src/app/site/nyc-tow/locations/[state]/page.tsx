// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/nyc-tow/_data/content";
import { STATES, getStateBySlug } from "@/app/site/nyc-tow/_data/cities";
import { SERVICES } from "@/app/site/nyc-tow/_data/services";
import { statePageContent } from "@/app/site/nyc-tow/_data/content-templates";
import { getOfficeByState } from "@/app/site/nyc-tow/_data/offices";
import { OfficeBlock } from "@/app/site/nyc-tow/_components/OfficeBlock";
import { JsonLd, breadcrumbSchema, localBusinessSchemaPerOffice, placeSchema } from "@/app/site/nyc-tow/_lib/schema";

export function generateStaticParams() {
  return STATES.map((s) => ({ state: s.slug }));
}

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

  const schemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Locations", url: "/locations" },
      { name: state.name, url: `/locations/${stateSlug}` },
    ]),
    placeSchema({
      name: `${state.name}, NYC`,
      url: `/locations/${stateSlug}`,
      stateSlug: stateSlug,
      address: { city: state.name },
    }),
  ];
  if (office) schemas.push(localBusinessSchemaPerOffice(office));

  return (
    <>
      <JsonLd schema={schemas} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{content.heroSubtitle}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{state.name} Tow Truck Service</span> Near Me — 24/7 Dispatch in {state.name}, NYC
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            24/7 towing and roadside across {state.cities.length} {state.name} neighborhoods. Flat-rate pricing, 20–40 minute typical arrival. Licensed and insured.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {office && <OfficeBlock office={office} />}

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

      {/* Neighborhoods grid */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {state.cities.length} {state.name} Neighborhoods
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {state.cities.map((city) => (
              <Link key={city.slug} href={`/locations/${state.slug}/${city.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{city.name}</p>
                <p className="mt-0.5 text-xs text-teal-600">24/7 dispatch</p>
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
            Need a Tow or Roadside in {state.name}?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {state.cities.length} neighborhoods covered. 24/7 dispatch. Flat-rate pricing. Typical 20–40 min arrival.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={`sms:${(office?.phoneHref ?? PHONE_HREF).replace("tel:", "")}`} className="inline-block rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {office?.phone ?? PHONE}</a>
            <a href={office?.phoneHref ?? PHONE_HREF} className="inline-block rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {office?.phone ?? PHONE}</a>
            <Link href="/book-towing-service-today" className="inline-block rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark font-cta">Book a Tow</Link>
          </div>
        </div>
      </section>
    </>
  );
}
