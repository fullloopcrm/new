// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { STATES, getAllCities, getCityBySlug, getStateBySlug } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { cityPageContent } from "@/app/site/nycroadsideemergencyassistance/_data/content-templates";
import { getOfficeByState } from "@/app/site/nycroadsideemergencyassistance/_data/offices";
import { OfficeBlock } from "@/app/site/nycroadsideemergencyassistance/_components/OfficeBlock";
import { JsonLd, breadcrumbSchema, localBusinessSchemaPerOffice, placeSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";
import { ALL_ROADWAYS, KIND_LABEL } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

function isBoroughGuide(slug: string) {
  return slug.startsWith("towing-in-") && slug.endsWith("-guide-and-pricing");
}

export const dynamicParams = true;

export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;

  if (isBoroughGuide(citySlug)) {
    const state = getStateBySlug(stateSlug);
    if (!state) return {};
    return {
      title: `${state.name} Tow Truck — $149/hr, $25 Off Online, No Catches. NYC.`,
      description: `${state.name} tow truck at one transparent rate: $149/hour, $25 off online ($124 first hour). No NYC surcharge, no after-hours markup, no hidden fees. 24/7 dispatch, 20–40 min arrival. Common breakdowns, pricing, and how to call dispatch fast.`,
      alternates: { canonical: `/locations/${stateSlug}/${citySlug}` },
    };
  }

  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};
  const content = cityPageContent(result.city.name, result.state.name, result.state.abbreviation, result.state.slug, result.state.cities.filter((c) => c.slug !== citySlug));
  return { title: content.title, description: content.metaDescription, alternates: { canonical: `/locations/${stateSlug}/${citySlug}` } };
}

export default async function CityPage({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state: stateSlug, city: citySlug } = await params;

  // ===== BOROUGH GUIDE PAGE =====
  if (isBoroughGuide(citySlug)) {
    const state = getStateBySlug(stateSlug);
    if (!state) notFound();
    const office = getOfficeByState(stateSlug);
    const topCities = state.cities.slice(0, 12);

    const guideSchemas: Array<Record<string, unknown>> = [
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Locations", url: "/locations" },
        { name: state.name, url: `/locations/${stateSlug}` },
        { name: `Towing in ${state.name} Guide`, url: `/locations/${stateSlug}/${citySlug}` },
      ]),
      placeSchema({
        name: `${state.name}, NYC`,
        url: `/locations/${stateSlug}/${citySlug}`,
        stateSlug: stateSlug,
        address: { city: state.name },
      }),
    ];
    if (office) guideSchemas.push(localBusinessSchemaPerOffice(office));

    return (
      <>
        <JsonLd schema={guideSchemas} />
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Towing & Roadside Guide — {state.name}, NYC</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              {state.name} <span className="gradient-text">Tow Truck Guide</span> — Pricing &amp; Local Dispatch Tips
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Everything {state.name} drivers need to know — pricing, common breakdown scenarios, and how to call dispatch fast.
            </p>
            <CtaButtons variant="dark" />
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Towing & Roadside in {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              From <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.cities.length} neighborhoods covered</Link> to <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">flat-rate pricing</Link> and <Link href="/services" className="text-teal-700 font-semibold hover:underline">{SERVICES.length} services</Link>.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p>NYC Roadside Emergency Assistance dispatches from a dedicated {state.name} hub with trucks staged locally. Typical arrival across {state.name} neighborhoods is 20–40 minutes. One rate for every service: $149 / hour, 1-hour minimum, $25 off when you book online ($124 first hour) — estimated total hours quoted before we dispatch.</p>
              <p>No NYC surcharge, no after-hours markup, no storage fees on same-day drops. Receipts emailed within minutes. NYC DCWP licensed, fully insured. For accident and collision tows, we bill your insurance carrier directly in most cases.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Common Breakdowns in {state.name}</h2>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p><strong>Dead battery:</strong> Winter-cold overnight kills marginal batteries. We test and replace on scene. <Link href="/services/jump-start" className="text-teal-700 font-semibold hover:underline">$149/hr, 1-hr minimum — $124 first hour online</Link>.</p>
              <p><strong>Flat tire:</strong> Pothole damage on NYC highways is legendary. Spare mounted or tire plugged on-site when possible. <Link href="/services/flat-tire-change" className="text-teal-700 font-semibold hover:underline">$149/hr, 1-hr minimum — $124 first hour online</Link>.</p>
              <p><strong>Lockout:</strong> Air wedges and long-reach tools — no slim-jim (fries modern airbag modules). <Link href="/services/lockout-service" className="text-teal-700 font-semibold hover:underline">$149/hr, 1-hr minimum — $124 first hour online</Link>.</p>
              <p><strong>AWD / EV flatbed tow:</strong> Required for Subaru, Audi, Tesla, Rivian, and other AWD / 4WD / EV vehicles. <Link href="/services/flatbed-towing" className="text-teal-700 font-semibold hover:underline">$149/hr, 1-hr minimum — $124 first hour online</Link>.</p>
              <p><strong>Collision tow:</strong> Scene cleanup, proper loading, insurance billed direct. <Link href="/services/accident-recovery" className="text-teal-700 font-semibold hover:underline">Accident recovery</Link>.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{state.name} Neighborhood Guides</h2>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {topCities.map((c) => (
                <Link key={c.slug} href={`/locations/${stateSlug}/${c.slug}/towing-in-${c.slug}-guide-and-pricing`}
                  className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">Guide</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {office && <OfficeBlock office={office} />}

        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need Dispatch in {state.name}?</h2>
            <CtaButtons variant="dark" />
          </div>
        </section>
      </>
    );
  }

  // ===== NEIGHBORHOOD PAGE =====
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) notFound();

  const { state, city } = result;
  const otherCities = state.cities.filter((c) => c.slug !== citySlug);
  const content = cityPageContent(city.name, state.name, state.abbreviation, state.slug, otherCities);
  const office = getOfficeByState(state.slug);

  const citySchemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Locations", url: "/locations" },
      { name: state.name, url: `/locations/${state.slug}` },
      { name: city.name, url: `/locations/${state.slug}/${city.slug}` },
    ]),
    placeSchema({
      name: `${city.name}, ${state.name}`,
      url: `/locations/${state.slug}/${city.slug}`,
      stateSlug: state.slug,
      citySlug: city.slug,
      address: { city: city.name },
    }),
  ];
  if (office) citySchemas.push(localBusinessSchemaPerOffice(office));

  return (
    <>
      <JsonLd schema={citySchemas} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{content.heroSubtitle}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{city.name} Tow Truck Service</span> Near Me — 24/7 Towing in {city.name}, {state.name}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            24/7 dispatch covering {city.name}. Flat-rate pricing, 20–40 minute typical arrival, licensed and insured.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {office && <OfficeBlock office={office} cityName={city.name} />}

      {/* Long-form content */}
      {content.sections.map((section, i) => (
        <section key={i} className={i % 2 === 0 ? "bg-section-white py-16" : "bg-section-teal py-16"}>
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{section.heading}</h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
              {section.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
            </div>
          </div>
        </section>
      ))}

      {/* Services in this neighborhood */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {SERVICES.length} Services Available in {city.name}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Link key={s.slug} href={`/locations/${state.slug}/${city.slug}/${s.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs text-teal-600">{s.subtitle}</p>
                <p className="mt-2 text-xs text-slate-500">{s.description}</p>
                <p className="mt-2 text-xs font-semibold text-teal-600 font-cta">
                  {s.title} in {city.name} →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby neighborhoods */}
      {content.nearbyCities.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Nearby in {state.name}
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {content.nearbyCities.map((c) => (
                <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">24/7</p>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold text-sm hover:underline font-cta">
                All {state.name} Neighborhoods →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Roadways serving this neighborhood */}
      {(() => {
        const roads = ALL_ROADWAYS.filter((r) =>
          r.relatedNeighborhoods.some((n) => n.state === state.slug && n.city === city.slug),
        );
        if (roads.length === 0) return null;
        return (
          <section className="bg-section-white py-16">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
                Streets, Highways &amp; Bridges We Cover Near {city.name}
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
                Specific corridors where we get the most calls from {city.name} drivers. Tap one for breakdown patterns and dispatch notes.
              </p>
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roads.map((r) => (
                  <Link key={`${r.kind}-${r.slug}`} href={`/${KIND_LABEL[r.kind].pathSeg}/${r.slug}`}
                    className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">{KIND_LABEL[r.kind].singular}</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{r.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">{r.subType}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Need Dispatch in {city.name}?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            24/7, flat-rate, typical 20–40 min arrival. Any time of day, any day of the year.
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