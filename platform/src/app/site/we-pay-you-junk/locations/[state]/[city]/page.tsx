import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { notFound } from "next/navigation";
import { STATES, getTopCitiesPerState, getCityBySlug, getStateBySlug } from "@/app/site/we-pay-you-junk/_data/cities";
import { SERVICES } from "@/app/site/we-pay-you-junk/_data/services";
import { cityPageContent } from "@/app/site/we-pay-you-junk/_data/content-templates";
import { getOfficeByState } from "@/app/site/we-pay-you-junk/_data/offices";
import { OfficeBlock } from "@/app/site/we-pay-you-junk/_components/OfficeBlock";

function isStateGuide(slug: string) {
  return slug.includes("junk-removal-in-") && slug.endsWith("-guide-tips-and-costs");
}

export const dynamicParams = true;

export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ state: string; city: string }> }): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;

  if (isStateGuide(citySlug)) {
    const state = getStateBySlug(stateSlug);
    if (!state) return {};
    return {
      title: `Junk Removal in ${state.name} — Complete Guide, Tips & Costs`,
      description: `Everything ${state.name} residents need to know about junk removal. Local tips, pricing, what items earn you credit, and how to save in ${state.abbreviation}.`,
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

  // ===== STATE GUIDE PAGE =====
  if (isStateGuide(citySlug)) {
    const state = getStateBySlug(stateSlug);
    if (!state) notFound();
    const office = getOfficeByState(stateSlug);
    const topCities = state.cities.slice(0, 12);

    return (
      <>
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Expert Junk Removal Guide for {state.abbreviation} Residents</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              Junk Removal in {state.name}<br /><span className="gradient-text">Guide, Tips &amp; Costs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Everything {state.name} residents need to know — local pricing, what items earn you credit, how to prepare, and when to book.
            </p>
            <CtaButtons variant="dark" />
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What {state.name} Residents Need to Know About Junk Removal</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Complete Guide to Junk Removal in {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              From <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.cities.length} cities served</Link> to <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link> to <Link href="/services" className="text-teal-700 font-semibold hover:underline">34 service types</Link>.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p>Here&apos;s the industry secret every {state.name} resident should know: <strong>every junk removal company in {state.abbreviation} has been charging you for the service AND keeping 35%+ of your items to resell for profit.</strong> We Pay You Junk Removal is the only company in {state.name} that credits you 50% (when applicable) of resale value. Starting at $200/hr with dump fees included (an industry first).</p>
              <p>Our {state.abbreviation} crews know the local resale markets, recycling centers, and donation partners in your area. That local knowledge means better appraisals, faster jobs, and more money back in your pocket.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Items Worth Money in {state.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What Earns You Credit in {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              {state.name} homes have items worth more than you think. Here&apos;s what our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">local crews</Link> see most often.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p><strong>Furniture ($50–$2,000+):</strong> Solid wood dining sets, dressers, desks, leather sofas. <Link href="/services/furniture-removal" className="text-teal-700 font-semibold hover:underline">Furniture removal</Link> is our most-requested service in {state.abbreviation}.</p>
              <p><strong>Appliances ($75–$600+):</strong> Working refrigerators, washers, dryers, ovens. <Link href="/services/appliance-removal" className="text-teal-700 font-semibold hover:underline">Appliance removal</Link> frequently covers the entire bill.</p>
              <p><strong>Tools ($25–$500+):</strong> DeWalt, Milwaukee, Makita — {state.name} garages are full of value most homeowners don&apos;t realize.</p>
              <p><strong>Electronics, exercise equipment, instruments, outdoor gear</strong> — all have active resale markets in {state.abbreviation}.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">City-Specific Junk Removal Guides in {state.abbreviation}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{state.name} City Guides</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every city is different. Click yours for local tips.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {topCities.map((c) => (
                <Link key={c.slug} href={`/locations/${stateSlug}/${c.slug}/junk-removal-in-${c.slug}-guide-tips-and-costs`}
                  className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">Guide &amp; Tips</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {office && <OfficeBlock office={office} />}

        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book Junk Removal in {state.name} Today</h2>
            <CtaButtons variant="dark" />
          </div>
        </section>
      </>
    );
  }

  // ===== CITY PAGE =====
  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) notFound();

  const { state, city } = result;
  const otherCities = state.cities.filter((c) => c.slug !== citySlug);
  const content = cityPageContent(city.name, state.name, state.abbreviation, state.slug, otherCities);
  const office = getOfficeByState(state.slug);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{content.heroSubtitle}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Junk Removal in <span className="gradient-text">{city.name}, {state.abbreviation}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            The only junk removal company in {city.name} that pays you. starting at $200/hr, dump fees included, 50% Resale Credit (when applicable).
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

      {/* Services in this city — links to city+service pages */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {SERVICES.length} Junk Removal Services in {city.name}, {state.abbreviation}
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

      {/* Nearby cities */}
      {content.nearbyCities.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Junk Removal Near {city.name}
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {content.nearbyCities.map((c) => (
                <Link key={c.slug} href={`/locations/${state.slug}/${c.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600">{state.abbreviation} — Same-day</p>
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

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Book Junk Removal in {city.name} Today
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Same-day available. starting at $200/hr. Dump fees included (an industry first). 50% Resale Credit (when applicable).
          </p>
          <div className="mt-8">
            <Link href="/book-junk-removal-service-today">
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Book Now &amp; Save $10</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
