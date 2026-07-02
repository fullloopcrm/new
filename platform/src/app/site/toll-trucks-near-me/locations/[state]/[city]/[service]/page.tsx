// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/toll-trucks-near-me/_data/content";
import { getTopCitiesPerState, getCityBySlug } from "@/app/site/toll-trucks-near-me/_data/cities";
import { SERVICES } from "@/app/site/toll-trucks-near-me/_data/services";
import { cityServicePageContent } from "@/app/site/toll-trucks-near-me/_data/content-templates";
import { generateCityTips } from "@/app/site/toll-trucks-near-me/_data/city-tips";
import { getOfficeByState } from "@/app/site/toll-trucks-near-me/_data/offices";
import { OfficeBlock } from "@/app/site/toll-trucks-near-me/_components/OfficeBlock";

function isTipsSlug(slug: string) {
  return slug.includes("tow-truck-in-") && slug.endsWith("-guide-rates-arrival");
}

export const dynamicParams = true;

export const revalidate = 2592000

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
  const content = cityServicePageContent(result.city.name, result.state.name, result.state.abbreviation, service);
  return { title: content.title, description: content.metaDescription, alternates: { canonical } };
}

export default async function CityServicePage({ params }: { params: Promise<{ state: string; city: string; service: string }> }) {
  const { state: stateSlug, city: citySlug, service: serviceSlug } = await params;
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) notFound();

  // ===== TIPS PAGE =====
  if (isTipsSlug(serviceSlug)) {
    const { state, city } = result;
    const tips = generateCityTips(city.name, state.name, state.abbreviation);
    const otherCities = state.cities.filter((c) => c.slug !== citySlug).slice(0, 8);
    const tipsOffice = getOfficeByState(state.slug);

    return (
      <>
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Guide — Tips & Costs for {city.name}, {state.abbreviation}</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              {city.name} Tow Truck Dispatch<br /><span className="gradient-text">Guide — Tips & Costs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Expert tow truck service advice specific to {city.name}, {state.abbreviation}. Local tips, seasonal guidance, and insider knowledge to save you money.
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
        {(tips.extraSections as Array<{ heading: string; paragraphs: string[] }>).map((section, i) => (
          <section key={`e${i}`} className={i % 2 === 0 ? "bg-section-teal py-16" : "bg-section-white py-16"}>
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{section.heading}</h2>
              <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
                {section.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
              </div>
            </div>
          </section>
        ))}

        {/* Services in this city */}
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Tow Truck Services in {city.name}</h2>
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

        {/* Nearby cities */}
        {otherCities.length > 0 && (
          <section className="bg-section-teal py-16">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Roadside Tips for Nearby Cities</h2>
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {otherCities.map((c) => (
                  <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}/tow-truck-in-${c.slug}-guide-rates-arrival`}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                    <p className="mt-0.5 text-xs text-teal-600">Tips &amp; Guide</p>
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
            <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Book in {city.name}?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">starting at $95 hookup. Flat upfront pricing with no surcharge games. flat upfront pricing. Same-day available.</p>
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
  const content = cityServicePageContent(city.name, state.name, state.abbreviation, service);
  const otherCities = state.cities.filter((c) => c.slug !== citySlug).slice(0, 6);
  const otherServicesInCity = SERVICES.filter((s) => s.slug !== serviceSlug).slice(0, 8);
  const office = getOfficeByState(state.slug);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {content.heroSubtitle}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{service.title}</span><br />
            in {city.name}, {state.abbreviation}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {service.description} starting at $95 hookup, flat upfront pricing, flat upfront pricing in {city.name}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-teal-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Long-form content sections — 5k+ words */}
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

      {/* Pricing */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} Pricing in {city.name}
          </h2>
          <div className="mt-8 max-w-sm mx-auto">
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center shadow-md">
              <p className="text-5xl font-bold text-teal-700 font-heading">$100</p>
              <p className="mt-1 text-base text-slate-600">per hour &bull; 1 hour minimum</p>
              <p className="mt-3 text-sm text-slate-500">Flat upfront pricing with no surcharge games &bull; flat upfront pricing on valuable items</p>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/pricing" className="text-teal-700 font-semibold text-sm hover:underline font-cta">Full Pricing Details →</Link>
          </div>
        </div>
      </section>

      {/* Related services in same city */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Tow Truck Services in {city.name}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherServicesInCity.map((s) => (
              <Link key={s.slug} href={`/locations/${state.slug}/${city.slug}/${s.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading">{s.title}</h3>
                <p className="mt-1 text-xs text-teal-600">{city.name}, {state.abbreviation}</p>
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

      {/* Same service in nearby cities */}
      {otherCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              {service.title} Near {city.name}
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {otherCities.map((c) => (
                <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}/${service.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}, {state.abbreviation}</p>
                  <p className="mt-0.5 text-xs text-teal-600">{service.title}</p>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold text-sm hover:underline font-cta">
                All Cities in {state.name} →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Breadcrumb links */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            More Links
          </h2>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Office */}
      {office && <OfficeBlock office={office} cityName={city.name} />}

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book {service.title} in {city.name} Today
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Same-day available. starting at $95 hookup. Flat upfront pricing with no surcharge games. flat upfront pricing on valuable items.
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
