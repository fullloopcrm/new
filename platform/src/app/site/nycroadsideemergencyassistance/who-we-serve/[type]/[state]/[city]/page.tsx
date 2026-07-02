// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/nycroadsideemergencyassistance/_data/customer-types";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { getAllCities, getCityBySlug } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { getOfficeByState } from "@/app/site/nycroadsideemergencyassistance/_data/offices";
import { OfficeBlock } from "@/app/site/nycroadsideemergencyassistance/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { customerCityContent } from "@/app/site/nycroadsideemergencyassistance/_data/customer-content";
import { JsonLd, breadcrumbSchema, localBusinessSchemaPerOffice, serviceSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ type: string; state: string; city: string }> }): Promise<Metadata> {
  const { type, state: stateSlug, city: citySlug } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  const result = getCityBySlug(stateSlug, citySlug);
  if (!ct || !result) return {};
  return {
    title: `${ct.name} Tow in ${result.city.name}, ${result.state.abbreviation} — $149/hr, $25 Off Online, No Catches.`,
    description: `${ct.name} tow truck and roadside service in ${result.city.name}, ${result.state.name} at one rate: $149/hour, $25 off online ($124 first hour). No NYC surcharge, no after-hours markup. 24/7 dispatch. ${ct.description}`,
    alternates: { canonical: `/who-we-serve/${type}/${stateSlug}/${citySlug}` },
  };
}

export default async function TypeCityPage({ params }: { params: Promise<{ type: string; state: string; city: string }> }) {
  const { type, state: stateSlug, city: citySlug } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  const result = getCityBySlug(stateSlug, citySlug);
  if (!ct || !result) notFound();

  const { state, city } = result;
  const office = getOfficeByState(stateSlug);
  const nearbyCities = state.cities.filter((c) => c.slug !== citySlug).slice(0, 8);
  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));

  const whoCitySchemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: ct.name, url: `/who-we-serve/${type}` },
      { name: state.name, url: `/who-we-serve/${type}/${stateSlug}` },
      { name: city.name, url: `/who-we-serve/${type}/${stateSlug}/${citySlug}` },
    ]),
    ...(relatedServices[0]
      ? [
          serviceSchema(relatedServices[0], {
            url: `/who-we-serve/${type}/${stateSlug}/${citySlug}`,
            location: { stateName: state.name, cityName: city.name },
          }),
        ]
      : []),
  ];
  if (office) whoCitySchemas.push(localBusinessSchemaPerOffice(office));

  return (
    <>
      <JsonLd schema={whoCitySchemas} />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{ct.name} Towing & Roadside in {city.name}</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{ct.name}</span> Tow Truck Service in {city.name}, NYC — 24/7 Dispatch
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{ct.description}</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How We Help {ct.name} in {city.name}, {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why {city.name} {ct.name} Choose Us</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Local crew in {city.name}. Same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>. Same credits. Browse <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">all services in {city.name}</Link> or <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">book now</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            {customerCityContent(ct, city.name, state.name, state.abbreviation).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Top Services for {ct.name} in {city.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Recommended Services</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map((s) => (
              <Link key={s.slug} href={`/locations/${stateSlug}/${citySlug}/${s.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{s.title}</h3>
                <p className="mt-1 text-xs text-teal-600">{s.subtitle}</p>
                <p className="mt-2 text-xs text-slate-500">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{ct.name} Pain Points We Solve in {city.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Common {ct.name} Challenges</h2>
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

      {office && <OfficeBlock office={office} cityName={city.name} />}

      {nearbyCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{ct.name} Towing & Roadside Near {city.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Nearby Neighborhoods</h2>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {nearbyCities.map((c) => (
                <Link key={c.slug} href={`/who-we-serve/${type}/${stateSlug}/${c.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">{ct.shortName}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book {ct.name} Towing & Roadside in {city.name}</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
