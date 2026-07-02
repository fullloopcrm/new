// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-home-services-company/_data/content";
import { STATES, getTopCitiesPerState, getCityBySlug, getStateBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { cityPageContent } from "@/app/site/the-home-services-company/_data/content-templates";
import { getOfficeByState } from "@/app/site/the-home-services-company/_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";
import { LocalBusinessSchema, BreadcrumbSchema } from "@/app/site/the-home-services-company/_components/SiteSchema";

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
      title: `Home Services in ${state.name} — Complete Guide, Tips & Costs`,
      description: `Everything ${state.name} residents need to know about home services. Local tips, pricing, what items earn you credit, and how to save in ${state.abbreviation}.`,
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
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Expert Home Services Guide for {state.abbreviation} Residents</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              Home Services in {state.name}<br /><span className="gradient-text">Guide, Tips &amp; Costs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Everything {state.name} residents need to know — local pricing, what items earn you credit, how to prepare, and when to book.
            </p>
            <CtaButtons variant="dark" />
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What {state.name} Residents Need to Know About Home Services</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Complete Guide to Home Services in {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              From <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.cities.length} cities served</Link> to <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link> to <Link href="/services" className="text-teal-700 font-semibold hover:underline">40 service types</Link>.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p>Here&apos;s the consolidation problem every {state.name} homeowner runs into: <strong>vendor sprawl across every home service trade — a different company for HVAC, plumbing, electrical, painting, cleaning, handyman.</strong> Home Services Co is the one company in {state.name} that handles all 40 services under one phone number. Starting at $99/hour with upfront pricing on every job.</p>
              <p>Our {state.abbreviation} technicians know the local supply houses, permit offices, and code requirements in your area. That local knowledge means faster jobs, fewer callbacks, and work done right the first time.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Most-Requested Services in {state.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What {state.name} Homeowners Call Us For</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              {state.name} homes run into the same recurring maintenance and repair needs every year. Here&apos;s what our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">local technicians</Link> handle most often.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p><strong>HVAC, plumbing, and electrical:</strong> Emergency repairs and seasonal maintenance. <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>, <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>, and <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link> are our top call volume in {state.abbreviation}.</p>
              <p><strong>House cleaning and handyman:</strong> Weekly, biweekly, and one-time service. <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">House cleaning</Link> and <Link href="/services/handyman-services" className="text-teal-700 font-semibold hover:underline">handyman work</Link> are the easiest entry point for new {state.abbreviation} customers.</p>
              <p><strong>Painting, flooring, and remodeling:</strong> Interior and exterior upgrades. Licensed painters, installers, and remodel crews across all {state.cities.length} {state.abbreviation} cities.</p>
              <p><strong>Landscaping, pest control, pressure washing, and roofing</strong> — seasonal exterior work booked in advance or same-day in most {state.abbreviation} markets.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">City-Specific Home Services Guides in {state.abbreviation}</p>
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
            <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book Home Services in {state.name} Today</h2>
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
      <LocalBusinessSchema
        cityName={city.name}
        stateAbbr={state.abbreviation}
        address={office?.address}
        zip={office?.zip}
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Locations", url: "/locations" },
          { name: state.name, url: `/locations/${state.slug}` },
          { name: city.name, url: `/locations/${state.slug}/${city.slug}` },
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{content.heroSubtitle}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services in <span className="gradient-text">{city.name}, {state.abbreviation}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Home Services Co in {city.name} — 40 services under one phone number. Starting at $99/hour, licensed and insured, upfront pricing.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {office && <OfficeBlock office={office} cityName={city.name} />}

      {/* Cross-linked intro — masterful inner-linking */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Every Home Service in {city.name}, {state.abbreviation} — One Phone Number
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {city.name} homeowners who hire Home Services Co get access to the same 40-service menu we operate nationwide — starting at{" "}
              <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">$99 per hour</Link>, with{" "}
              <Link href="/blog/licensed-and-insured-what-it-means" className="text-teal-700 font-semibold hover:underline">licensed and insured</Link> technicians dispatched from our{" "}
              <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} operation</Link>. The fastest way to get started is to{" "}
              <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">call {PHONE}</a> or{" "}
              <Link href="/book" className="text-teal-700 font-semibold hover:underline">book online</Link>.
            </p>
            <p>
              The most common {city.name} calls are{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/hvac-services`} className="text-teal-700 font-semibold hover:underline">HVAC in {city.name}</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/plumbing`} className="text-teal-700 font-semibold hover:underline">plumbing in {city.name}</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/electrical`} className="text-teal-700 font-semibold hover:underline">electrical in {city.name}</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/house-cleaning`} className="text-teal-700 font-semibold hover:underline">house cleaning in {city.name}</Link>, and{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/handyman-services`} className="text-teal-700 font-semibold hover:underline">handyman work in {city.name}</Link>.
              For project work, browse <Link href={`/locations/${state.slug}/${city.slug}/kitchen-remodeling`} className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/bathroom-remodeling`} className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/roofing`} className="text-teal-700 font-semibold hover:underline">roofing</Link>, and{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/painting`} className="text-teal-700 font-semibold hover:underline">painting</Link> — all dedicated pages with local pricing and scheduling.
            </p>
            <p>
              If you are comparing vendors, read our guides on{" "}
              <Link href="/blog/how-to-choose-a-home-services-contractor" className="text-teal-700 font-semibold hover:underline">how to choose a home services contractor</Link>,{" "}
              <Link href="/blog/how-home-service-pricing-works" className="text-teal-700 font-semibold hover:underline">how home service pricing actually works</Link>, and{" "}
              <Link href="/blog/signs-you-need-to-call-a-professional" className="text-teal-700 font-semibold hover:underline">signs you need to call a professional</Link>.
              For property managers and commercial accounts in {city.name}, see our{" "}
              <Link href="/who-we-serve/property-managers" className="text-teal-700 font-semibold hover:underline">property manager services</Link> and{" "}
              <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial facility services</Link>. Jobs available to licensed technicians in {city.name} —{" "}
              <Link href={`/careers/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">apply here</Link>. Contracting businesses looking to partner with us:{" "}
              <Link href={`/partnerships/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} partnership inquiries</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Long-form content */}
      {content.sections.map((section, i) => (
        <section key={i} className={i % 2 === 0 ? "bg-section-teal py-16" : "bg-section-white py-16"}>
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{section.heading}</h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
              {section.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
            </div>
          </div>
        </section>
      ))}

      {/* Additional inner-linked prose — maintenance + related local pages */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            What to Know Before You Book in {city.name}
          </h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Seasonal home services rhythms matter in {city.name}. Our{" "}
              <Link href="/blog/home-maintenance-schedule" className="text-teal-700 font-semibold hover:underline">home maintenance schedule</Link> walks through when to schedule each trade, and our{" "}
              <Link href="/blog/top-home-improvement-projects-that-add-value" className="text-teal-700 font-semibold hover:underline">home improvement projects that add value</Link> guide covers the remodels that return the most on resale. For urgent situations read{" "}
              <Link href="/blog/emergency-home-services" className="text-teal-700 font-semibold hover:underline">how our emergency service works</Link> — or call{" "}
              <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a> right now if you are in one.
            </p>
            <p>
              Looking at another {state.abbreviation} market? Our{" "}
              {otherCities.slice(0, 5).map((c, idx, arr) => (
                <span key={c.slug}>
                  <Link href={`/locations/${state.slug}/${c.slug}`} className="text-teal-700 font-semibold hover:underline">{c.name} home services</Link>
                  {idx < arr.length - 2 ? ", " : idx === arr.length - 2 ? ", and " : ""}
                </span>
              ))}
              {" "}pages follow the same structure as this {city.name} page.
              Or browse the full <Link href={`/locations/${state.slug}`} className="text-teal-700 font-semibold hover:underline">{state.name} directory</Link> with every {state.abbreviation} city we cover.
            </p>
            <p>
              Every home service we offer in {city.name} is available same-day in most cases —{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/pest-control`} className="text-teal-700 font-semibold hover:underline">pest control</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/carpet-cleaning`} className="text-teal-700 font-semibold hover:underline">carpet cleaning</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/window-cleaning`} className="text-teal-700 font-semibold hover:underline">window cleaning</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/pressure-washing`} className="text-teal-700 font-semibold hover:underline">pressure washing</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/gutter-cleaning`} className="text-teal-700 font-semibold hover:underline">gutter cleaning</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/lawn-care`} className="text-teal-700 font-semibold hover:underline">lawn care</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/landscaping`} className="text-teal-700 font-semibold hover:underline">landscaping</Link>, and{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/tree-services`} className="text-teal-700 font-semibold hover:underline">tree services</Link>. For structural work,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/fence-installation`} className="text-teal-700 font-semibold hover:underline">fence installation</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/deck-building`} className="text-teal-700 font-semibold hover:underline">deck building</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/concrete-services`} className="text-teal-700 font-semibold hover:underline">concrete</Link>,{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/masonry`} className="text-teal-700 font-semibold hover:underline">masonry</Link>, and{" "}
              <Link href={`/locations/${state.slug}/${city.slug}/siding-installation`} className="text-teal-700 font-semibold hover:underline">siding</Link> are all booked locally with {city.name} crews.
            </p>
            <p>
              For recurring service accounts in {city.name} — HOAs, property portfolios, small businesses —{" "}
              <Link href="/blog/one-vendor-for-every-home-service" className="text-teal-700 font-semibold hover:underline">the one-vendor model</Link> typically saves twenty to forty percent versus juggling separate trade vendors. Ask for a{" "}
              <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial account review</Link> when you call, or email through the form on our{" "}
              <Link href={`/partnerships/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">{city.name} partnerships page</Link>. For technicians looking for steady routes in {city.name},{" "}
              <Link href={`/careers/${state.slug}/${city.slug}`} className="text-teal-700 font-semibold hover:underline">careers in {city.name}</Link> lists every trade currently hiring.
            </p>
          </div>
        </div>
      </section>

      {/* Services in this city — links to city+service pages */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {SERVICES.length} Home Services Services in {city.name}, {state.abbreviation}
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
              Home Services Near {city.name}
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
            Book Home Services in {city.name} Today
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
