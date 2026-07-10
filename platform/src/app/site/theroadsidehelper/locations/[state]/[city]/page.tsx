import Link from "next/link";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/theroadsidehelper/_data/content";
import { STATES, getTopCitiesPerState, getCityBySlug, getStateBySlug } from "@/app/site/theroadsidehelper/_data/cities";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";
import { cityPageContent } from "@/app/site/theroadsidehelper/_data/content-templates";
import { getOfficeByState } from "@/app/site/theroadsidehelper/_data/offices";
import { OfficeBlock } from "@/app/site/theroadsidehelper/_components/OfficeBlock";
import { ValuationHint } from "@/app/site/theroadsidehelper/_components/ValuationHint";
import { breadcrumbSchema, jsonLd, placeSchema, graph } from "@/app/site/theroadsidehelper/_lib/schema";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

function isStateGuide(slug: string) {
  return slug.includes("roadside-help-in-") && slug.endsWith("-guide-tips-and-costs");
}

export const dynamicParams = true;

export function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state: stateSlug, city: citySlug } = await params;

  if (isStateGuide(citySlug)) {
    const state = getStateBySlug(stateSlug);
    if (!state) return {};
    return pageSeo({
      title: `Roadside Assistance in ${state.name} — Complete Guide, Tips & Costs`,
      description: `Everything ${state.name} residents need to know about roadside assistance. Local tips, pricing, what items earn you credit, and how to save in ${state.abbreviation}.`,
      path: `/locations/${stateSlug}/${citySlug}`,
    });
  }

  const result = getCityBySlug(stateSlug, citySlug);
  if (!result) return {};
  const content = cityPageContent(
    result.city.name,
    result.state.name,
    result.state.abbreviation,
    result.state.slug,
    result.state.cities.filter((c) => c.slug !== citySlug),
  );
  return pageSeo({
    title: content.title,
    description: content.metaDescription,
    path: `/locations/${stateSlug}/${citySlug}`,
  });
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              breadcrumbSchema([
                { name: "Home", path: "/" },
                { name: "Locations", path: "/locations" },
                { name: state.name, path: `/locations/${state.slug}` },
                {
                  name: `${state.name} Guide`,
                  path: `/locations/${stateSlug}/${citySlug}`,
                },
              ]),
            ),
          }}
        />
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Expert Roadside Assistance Guide for {state.abbreviation} Residents</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              Roadside Assistance in {state.name}<br /><span className="gradient-text">Guide, Tips &amp; Costs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Everything {state.name} residents need to know — local pricing, what items earn you credit, how to prepare, and when to book.
            </p>
            <CtaButtons variant="dark" />
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What {state.name} Residents Need to Know About Roadside Assistance</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">The Complete Guide to Roadside Assistance in {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              From <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.cities.length} cities served</Link> to <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link> to <Link href="/services" className="text-teal-700 font-semibold hover:underline">every roadside service</Link>.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p>Here&apos;s what makes us different in {state.name}: <strong>no membership, no annual dues, no contracts.</strong> You pay only when you actually need help — one flat $149/hr rate, 1-hour minimum, same price overnight, weekends, and holidays. No after-hours surcharges, no equipment up-charges, no hidden trip fees.</p>
              <p>Our {state.abbreviation} dispatch knows the highways, the shoulder hazards, and the towing destinations in your area. That local knowledge means faster ETAs, safer scenes, and fewer surprises when help arrives.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Most Common Roadside Calls in {state.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What We Handle Most in {state.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              Here&apos;s what our <Link href={`/locations/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{state.name} dispatch</Link> sees on a typical week — and what one flat $149/hr rate covers.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p><strong>Jump-Starts &amp; Dead Batteries:</strong> The #1 call in {state.abbreviation}. <Link href="/services/jump-start-service" className="text-teal-700 font-semibold hover:underline">Jump-start service</Link> at $149 flat, with a quick alternator check included.</p>
              <p><strong>Flat Tires &amp; Blowouts:</strong> Spare swaps, on-site plug-and-inflate, or full <Link href="/services/mobile-tire-replacement" className="text-teal-700 font-semibold hover:underline">mobile tire replacement</Link> if the sidewall is gone.</p>
              <p><strong>Lockouts:</strong> Keys locked in the car, trunk, or snapped off in the ignition. <Link href="/services/car-lockout-service" className="text-teal-700 font-semibold hover:underline">Car lockout service</Link> in 5–15 minutes, no damage to door panels or seals.</p>
              <p><strong>Fuel Delivery, Tows &amp; Winch-Outs</strong> — plus EV charging delivery and accident-tow coordination, all at the same flat rate across {state.abbreviation}.</p>
            </div>
          </div>
        </section>

        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">City-Specific Roadside Assistance Guides in {state.abbreviation}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{state.name} City Guides</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every city is different. Click yours for local tips.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {topCities.map((c) => (
                <Link key={c.slug} href={`/locations/${stateSlug}/${c.slug}/roadside-help-in-${c.slug}-guide-tips-and-costs`}
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
            <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book Roadside Assistance in {state.name} Today</h2>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Locations", path: "/locations" },
              { name: state.name, path: `/locations/${state.slug}` },
              {
                name: city.name,
                path: `/locations/${state.slug}/${city.slug}`,
              },
            ]),
            placeSchema({ city: city.name, state: state.name, stateAbbr: state.abbreviation }),
          ]),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{content.heroSubtitle}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Roadside Assistance in <span className="gradient-text">{city.name}, {state.abbreviation}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            The only roadside assistance company in {city.name} that pays you. $149/hr flat, all standard equipment included, 24/7 dispatch.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {office && <OfficeBlock office={office} cityName={city.name} />}

      <section className="bg-section-white pt-8">
        <div className="mx-auto max-w-3xl px-6">
          <ValuationHint />
        </div>
      </section>

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
            {SERVICES.length} Roadside Assistance Services in {city.name}, {state.abbreviation}
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
              Roadside Assistance Near {city.name}
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
            Book Roadside Assistance in {city.name} Today
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Same-day available. $149/hr flat. No memberships, no surcharges. 24/7 dispatch.
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