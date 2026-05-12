// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF } from "@/app/site/nyc-tow/_data/content";
import { getAllCities, getCityBySlug } from "@/app/site/nyc-tow/_data/cities";
import { SERVICES } from "@/app/site/nyc-tow/_data/services";
import { cityServicePageContentV2 } from "@/app/site/nyc-tow/_data/city-service-content";
import { generateCityTips } from "@/app/site/nyc-tow/_data/city-tips";
import { getNeighborhoodTips } from "@/app/site/nyc-tow/_data/service-tips";
import { getOfficeByState } from "@/app/site/nyc-tow/_data/offices";
import { OfficeBlock } from "@/app/site/nyc-tow/_components/OfficeBlock";
import { JsonLd, breadcrumbSchema, localBusinessSchemaPerOffice, serviceSchema, placeSchema } from "@/app/site/nyc-tow/_lib/schema";

function isTipsSlug(slug: string) {
  return slug.startsWith("towing-in-") && slug.endsWith("-guide-and-pricing");
}

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string; service: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, service: serviceSlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};

  const canonical = `/locations/${stateSlug}/${citySlug}/${serviceSlug}`;

  if (isTipsSlug(serviceSlug)) {
    const tips = generateCityTips(result.city.name, result.state.name, result.state.abbreviation);
    return { title: tips.title, description: tips.metaDescription, alternates: { canonical } };
  }

  const service = SERVICES.find((s) => s.slug === serviceSlug);
  if (!service) return {};
  const content = cityServicePageContentV2(result.city.name, result.state.name, result.state.abbreviation, service, result.city.slug);
  return { title: content.title, description: content.metaDescription, alternates: { canonical } };
}

export default async function CityServicePage({ params }: { params: Promise<{ state: string; city: string; service: string }> }) {
  const { state: stateSlug, city: citySlug, service: serviceSlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) notFound();

  // ===== NEIGHBORHOOD TIPS / GUIDE PAGE =====
  if (isTipsSlug(serviceSlug)) {
    const { state, city } = result;
    const tips = generateCityTips(city.name, state.name, state.abbreviation);
    const otherCities = state.cities.filter((c) => c.slug !== citySlug).slice(0, 8);
    const tipsOffice = getOfficeByState(state.slug);

    const tipsSchemas: Array<Record<string, unknown>> = [
      breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Locations", url: "/locations" },
        { name: state.name, url: `/locations/${state.slug}` },
        { name: city.name, url: `/locations/${state.slug}/${city.slug}` },
        { name: `${city.name} Towing Guide`, url: `/locations/${state.slug}/${city.slug}/${serviceSlug}` },
      ]),
      placeSchema({
        name: `${city.name}, ${state.name}`,
        url: `/locations/${state.slug}/${city.slug}/${serviceSlug}`,
        stateSlug: state.slug,
        citySlug: city.slug,
        address: { city: city.name },
      }),
    ];
    if (tipsOffice) tipsSchemas.push(localBusinessSchemaPerOffice(tipsOffice));

    return (
      <>
        <JsonLd schema={tipsSchemas} />
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Towing Guide — {city.name}, {state.name}</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              {city.name} <span className="gradient-text">Tow Truck Guide</span> — Pricing &amp; Local Dispatch Tips
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Local tips, pricing, and common breakdown scenarios specific to {city.name}, {state.name}.
            </p>
          </div>
        </section>

        {tips.sections.map((section, i) => (
          <section key={`s${i}`} className={i % 2 === 0 ? "bg-section-white py-16" : "bg-section-teal py-16"}>
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{section.heading}</h2>
              <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
                {section.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
              </div>
            </div>
          </section>
        ))}

        {/* Extended guide sections */}
        {tips.extraSections.map((section, i) => (
          <section key={`e${i}`} className={i % 2 === 0 ? "bg-section-teal py-16" : "bg-section-white py-16"}>
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{section.heading}</h2>
              <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
                {section.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
              </div>
            </div>
          </section>
        ))}

        {/* Services in this neighborhood */}
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Services Available in {city.name}</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.slice(0, 9).map((s) => (
                <Link key={s.slug} href={`/locations/${state.slug}/${city.slug}/${s.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading">{s.title}</h3>
                  <p className="mt-1 text-xs text-teal-600">{s.subtitle}</p>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={`/locations/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold text-sm hover:underline font-cta">All Services in {city.name} →</Link>
            </div>
          </div>
        </section>

        {/* Nearby neighborhoods */}
        {otherCities.length > 0 && (
          <section className="bg-section-teal py-16">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Guides for Nearby Neighborhoods</h2>
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {otherCities.map((c) => (
                  <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}/towing-in-${c.slug}-guide-and-pricing`}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                    <p className="mt-0.5 text-xs text-teal-600">Guide</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {tipsOffice && <OfficeBlock office={tipsOffice} cityName={city.name} />}

        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Need Dispatch in {city.name}?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">24/7, flat-rate pricing, 20–40 minute typical arrival.</p>
            <CtaButtons variant="dark" />
          </div>
        </section>
      </>
    );
  }

  // ===== SERVICE PAGE =====
  const service = SERVICES.find((s) => s.slug === serviceSlug);
  if (!service) notFound();

  const { state, city } = result;
  const content = cityServicePageContentV2(city.name, state.name, state.abbreviation, service, city.slug);
  const otherCities = state.cities.filter((c) => c.slug !== citySlug).slice(0, 6);
  const otherServicesInCity = SERVICES.filter((s) => s.slug !== serviceSlug).slice(0, 8);
  const office = getOfficeByState(state.slug);

  const cityServiceSchemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Locations", url: "/locations" },
      { name: state.name, url: `/locations/${state.slug}` },
      { name: city.name, url: `/locations/${state.slug}/${city.slug}` },
      { name: service.title, url: `/locations/${state.slug}/${city.slug}/${service.slug}` },
    ]),
    serviceSchema(service, {
      url: `/locations/${state.slug}/${city.slug}/${service.slug}`,
      location: { stateName: state.name, cityName: city.name },
    }),
  ];
  if (office) cityServiceSchemas.push(localBusinessSchemaPerOffice(office));

  return (
    <>
      <JsonLd schema={cityServiceSchemas} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {content.heroSubtitle}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{service.title}</span> in {city.name}, {state.name} — 24/7 Tow Truck Near Me
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {service.description} 24/7 dispatch in {city.name}, typical 20–40 minute arrival, flat-rate pricing.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-teal-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Long-form content sections */}
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

      {/* Neighborhood-specific tips embed */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border-2 border-teal-400 bg-white p-8 shadow-md sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">
              Local Tips
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
              {service.title} Tips for {city.name} Drivers
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              {city.name} has its own patterns for {service.title.toLowerCase()} calls — informed by {state.name} traffic, local streets, and the mix of vehicles on the road. Browse{" "}
              <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">
                all {state.name} neighborhoods
              </Link>{" "}
              or get the full service overview on the{" "}
              <Link href={`/services/${service.slug}`} className="text-teal-700 font-semibold hover:underline">
                {service.title} service page
              </Link>
              . For the deep-dive how-to — step-by-step protocol, do&apos;s and don&apos;ts, common causes, and FAQs — see the{" "}
              <Link href={`/services/${service.slug}/tips`} className="text-teal-700 font-semibold hover:underline">
                full {service.title} guide
              </Link>
              .
            </p>
            <ul className="mt-8 space-y-3">
              {getNeighborhoodTips(state.slug, city.slug, city.name, service.slug).map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 inline-block h-6 w-6 shrink-0 rounded-full bg-teal-600 text-center text-xs font-bold leading-6 text-white">
                    {i + 1}
                  </span>
                  <span className="text-base leading-relaxed text-slate-700">{tip}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href={`/services/${service.slug}/tips`}
                className="inline-flex items-center text-base font-semibold text-teal-700 hover:underline font-cta"
              >
                Read the full {service.title} guide →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} Pricing in {city.name}
          </h2>
          <div className="mt-8 max-w-sm mx-auto">
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center shadow-md">
              <p className="text-2xl font-bold text-teal-700 font-heading">{content.category.label}</p>
              <p className="mt-3 text-sm text-slate-600">Flat-rate pricing, quoted before dispatch.</p>
              <p className="mt-2 text-sm text-slate-500">No NYC surcharge. No after-hours markup. No storage fees on same-day drops.</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/pricing" className="text-teal-700 font-semibold text-sm hover:underline font-cta">Full Pricing Details →</Link>
          </div>
        </div>
      </section>

      {/* Related services in same neighborhood */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Services in {city.name}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherServicesInCity.map((s) => (
              <Link key={s.slug} href={`/locations/${state.slug}/${city.slug}/${s.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading">{s.title}</h3>
                <p className="mt-1 text-xs text-teal-600">{city.name}, {state.name}</p>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href={`/locations/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              All Services in {city.name} →
            </Link>
          </div>
        </div>
      </section>

      {/* Same service in nearby neighborhoods */}
      {otherCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              {service.title} in Nearby {state.name} Neighborhoods
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {otherCities.map((c) => (
                <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}/${service.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}, {state.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">{service.title}</p>
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

      {/* Office */}
      {office && <OfficeBlock office={office} cityName={city.name} />}

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Need {service.title} in {city.name}?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            24/7 dispatch. Flat-rate pricing. Typical 20–40 min arrival.
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
