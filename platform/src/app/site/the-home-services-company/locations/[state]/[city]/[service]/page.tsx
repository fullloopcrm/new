import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-home-services-company/_data/content";
import { getTopCitiesPerState, getCityBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { cityServicePageContent } from "@/app/site/the-home-services-company/_data/content-templates";
import { generateCityTips } from "@/app/site/the-home-services-company/_data/city-tips";
import { getOfficeByState } from "@/app/site/the-home-services-company/_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";

function isTipsSlug(slug: string) {
  return slug.includes("junk-removal-in-") && slug.endsWith("-guide-tips-and-costs");
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
              {city.name} Home Services<br /><span className="gradient-text">Guide — Tips & Costs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Expert home services advice specific to {city.name}, {state.abbreviation}. Local tips, seasonal guidance, and insider knowledge to save you money.
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

        {/* Services in this city */}
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Home Services Services in {city.name}</h2>
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
              <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Home Services Tips for Nearby Cities</h2>
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {otherCities.map((c) => (
                  <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}/junk-removal-in-${c.slug}-guide-tips-and-costs`}
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
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Starting at $99/hour. Upfront pricing. Licensed and insured. Same-day available.</p>
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
            {service.description} Starting at $99/hour in {city.name}, licensed and insured, upfront pricing.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-teal-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Inner-linked intro */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} in {city.name}, {state.abbreviation} — The Quick Version
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If you just need {service.title.toLowerCase()} handled in {city.name}, the fastest path is to{" "}
              <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">call {PHONE}</a> or{" "}
              <Link href="/book" className="text-teal-700 font-semibold hover:underline">book online</Link>.
              Starting at{" "}
              <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">$99 per hour</Link> with{" "}
              <Link href="/blog/licensed-and-insured-what-it-means" className="text-teal-700 font-semibold hover:underline">licensed and insured</Link> technicians,{" "}
              <Link href="/blog/how-home-service-pricing-works" className="text-teal-700 font-semibold hover:underline">upfront pricing</Link> on every job, and same-day service in most {state.abbreviation} markets.
            </p>
            <p>
              This page is specifically for {service.title.toLowerCase()} in {city.name}. For other home services in the same city, see the{" "}
              <Link href={`/locations/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} services hub</Link>.
              For {service.title.toLowerCase()} in nearby {state.abbreviation} cities, see{" "}
              {otherCities.slice(0, 4).map((c, idx, arr) => (
                <span key={c.slug}>
                  <Link href={`/locations/${state.slug}/${c.slug}/${service.slug}`} className="text-teal-700 font-semibold hover:underline">{service.title} in {c.name}</Link>
                  {idx < arr.length - 2 ? ", " : idx === arr.length - 2 ? ", or " : ""}
                </span>
              ))}
              . For the full {state.name} service area, see our{" "}
              <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} directory</Link>.
            </p>
            <p>
              Related services in the same category:{" "}
              {content.relatedServices.slice(0, 6).map((rs, idx, arr) => (
                <span key={rs.slug}>
                  <Link href={`/locations/${state.slug}/${city.slug}/${rs.slug}`} className="text-teal-700 font-semibold hover:underline">{rs.title} in {city.name}</Link>
                  {idx < arr.length - 2 ? ", " : idx === arr.length - 2 ? ", and " : ""}
                </span>
              ))}
              . For the general {service.title.toLowerCase()} overview across all 990 cities we serve, see our main{" "}
              <Link href={`/services/${service.slug}`} className="text-teal-700 font-semibold hover:underline">{service.title} service page</Link>.
            </p>
            <p>
              Licensed {service.title.toLowerCase()} technicians in {city.name} looking for steady routes:{" "}
              <Link href={`/careers/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} careers</Link>.
              Contracting businesses looking to partner on {service.title.toLowerCase()} in {city.name}:{" "}
              <Link href={`/partnerships/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} partnerships</Link>.
              Property managers managing {service.title.toLowerCase()} across {state.abbreviation} portfolios:{" "}
              <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property manager accounts</Link> and{" "}
              <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link>.
            </p>
          </div>
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
              <p className="text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-base text-slate-600">per hour &bull; 1 hour minimum</p>
              <p className="mt-3 text-sm text-slate-500">Licensed and insured &bull; Upfront pricing with parts itemized</p>
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
            Other Home Services Services in {city.name}
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

      {/* Breadcrumbs + inner linking wrap-up */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Keep Browsing — {city.name} and Beyond
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <strong>This page:</strong>{" "}
              <Link href={`/services/${service.slug}`} className="text-teal-700 font-semibold hover:underline">{service.title}</Link>{" "}→{" "}
              <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name}</Link>{" "}→{" "}
              <Link href={`/locations/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name}</Link>{" "}→{" "}
              {service.title} in {city.name}
            </p>
            <p>
              <strong>Explore every other home service in {city.name}:</strong>{" "}
              {otherServicesInCity.map((s, idx, arr) => (
                <span key={s.slug}>
                  <Link href={`/locations/${state.slug}/${city.slug}/${s.slug}`} className="text-teal-700 font-semibold hover:underline">{s.title}</Link>
                  {idx < arr.length - 1 ? " · " : ""}
                </span>
              ))}
              . Or see the full <Link href={`/locations/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} services hub</Link> with all {SERVICES.length} trades.
            </p>
            <p>
              <strong>Related guides:</strong>{" "}
              <Link href="/blog/how-to-choose-a-home-services-contractor" className="text-teal-700 font-semibold hover:underline">choosing a contractor</Link>,{" "}
              <Link href="/blog/home-maintenance-schedule" className="text-teal-700 font-semibold hover:underline">home maintenance schedule</Link>,{" "}
              <Link href="/blog/signs-you-need-to-call-a-professional" className="text-teal-700 font-semibold hover:underline">signs you need a pro</Link>,{" "}
              <Link href="/blog/emergency-home-services" className="text-teal-700 font-semibold hover:underline">emergency services</Link>,{" "}
              <Link href="/blog/one-vendor-for-every-home-service" className="text-teal-700 font-semibold hover:underline">the one-vendor model</Link>.
            </p>
            <p>
              <strong>For business and portfolio customers:</strong>{" "}
              <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link> ·{" "}
              <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property managers</Link> ·{" "}
              <Link href="/who-we-serve/businesses" className="text-teal-700 font-semibold hover:underline">small businesses</Link> ·{" "}
              <Link href="/who-we-serve/realtors" className="text-teal-700 font-semibold hover:underline">realtors</Link> ·{" "}
              <Link href="/franchise" className="text-teal-700 font-semibold hover:underline">franchise opportunities</Link>
            </p>
          </div>
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
            Same-day available. Starting at $99/hour. Licensed and insured. Upfront pricing on every job.
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
