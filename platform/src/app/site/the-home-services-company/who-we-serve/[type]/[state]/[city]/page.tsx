import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-home-services-company/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/the-home-services-company/_data/customer-types";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";
import { getTopCitiesPerState, getCityBySlug } from "@/app/site/the-home-services-company/_data/cities";
import { getOfficeByState } from "@/app/site/the-home-services-company/_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { customerCityContent } from "@/app/site/the-home-services-company/_data/customer-content";

export const dynamicParams = true;

export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ type: string; state: string; city: string }> }): Promise<Metadata> {
  const { type, state: stateSlug, city: citySlug } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  const result = getCityBySlug(stateSlug, citySlug);
  if (!ct || !result) return {};
  return {
    title: `Home Services for ${ct.name} in ${result.city.name}, ${result.state.abbreviation}`,
    description: `${ct.name} home services in ${result.city.name}, ${result.state.abbreviation}. ${ct.description} Starting at $99/hour.`,
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

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{ct.name} Home Services in {city.name}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{ct.name}</span> Home Services<br />in {city.name}, {state.abbreviation}
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
            Local crew in {city.name}. Same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>. Same credits. Browse <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">all services in {city.name}</Link> or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book now</Link>.
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

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Inner-Linked Guide — {ct.name} in {city.name}</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {ct.name} in {city.name} typically book between five and ten of our services per year, across a mix of recurring, project, and one-off work. The most common recurring services in {city.name} for {ct.name.toLowerCase()} are{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/house-cleaning`} className="text-teal-700 font-semibold hover:underline">house cleaning</Link>,{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/lawn-care`} className="text-teal-700 font-semibold hover:underline">lawn care</Link>,{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/pest-control`} className="text-teal-700 font-semibold hover:underline">pest control</Link>, and{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/pool-services`} className="text-teal-700 font-semibold hover:underline">pool service</Link> where applicable. The most common project work in {city.name} is{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/kitchen-remodeling`} className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>,{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/bathroom-remodeling`} className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>, and{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/painting`} className="text-teal-700 font-semibold hover:underline">interior or exterior painting</Link>. The most common reactive work is{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/hvac-services`} className="text-teal-700 font-semibold hover:underline">HVAC repair</Link>,{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/plumbing`} className="text-teal-700 font-semibold hover:underline">plumbing fixes</Link>, and{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}/appliance-repair`} className="text-teal-700 font-semibold hover:underline">appliance repair</Link>.
            </p>
            <p>
              For the full service menu available to {ct.name.toLowerCase()} in {city.name}, see the{" "}
              <Link href={`/locations/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">{city.name} service hub</Link>. For similar {ct.name.toLowerCase()} pages in other {state.abbreviation} cities, visit{" "}
              {nearbyCities.slice(0, 4).map((c, idx, arr) => (
                <span key={c.slug}>
                  <Link href={`/who-we-serve/${type}/${stateSlug}/${c.slug}`} className="text-teal-700 font-semibold hover:underline">{ct.name} in {c.name}</Link>
                  {idx < arr.length - 2 ? ", " : idx === arr.length - 2 ? ", or " : ""}
                </span>
              ))}
              . For the statewide view, see{" "}
              <Link href={`/who-we-serve/${type}/${stateSlug}`} className="text-teal-700 font-semibold hover:underline">{ct.name} in {state.name}</Link>. For the national {ct.name.toLowerCase()} profile, see{" "}
              <Link href={`/who-we-serve/${type}`} className="text-teal-700 font-semibold hover:underline">{ct.name} nationwide</Link>.
            </p>
            <p>
              Related service guides worth reading before your first appointment as {ct.name.toLowerCase()} in {city.name}:{" "}
              <Link href="/blog/how-to-choose-a-home-services-contractor" className="text-teal-700 font-semibold hover:underline">how to choose a home services contractor</Link>,{" "}
              <Link href="/blog/how-home-service-pricing-works" className="text-teal-700 font-semibold hover:underline">how pricing actually works</Link>,{" "}
              <Link href="/blog/one-vendor-for-every-home-service" className="text-teal-700 font-semibold hover:underline">why the one-vendor model works</Link>, and{" "}
              <Link href="/blog/licensed-and-insured-what-it-means" className="text-teal-700 font-semibold hover:underline">what licensed and insured actually means</Link>.
              For commercial-scale work, see <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services</Link>. For workers and contractors in {city.name} joining our team, see <Link href={`/careers/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">{city.name} careers</Link> and <Link href={`/partnerships/${stateSlug}/${citySlug}`} className="text-teal-700 font-semibold hover:underline">{city.name} partnerships</Link>.
            </p>
            <p>
              To book anything in {city.name}, call <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a>, text the same number, or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book online</Link>. Response within one business hour during business hours. Same-day service available for morning calls in most cases. For scheduled work we offer two-hour arrival windows. For questions about the specific {ct.name.toLowerCase()} scenario you are working through, our scheduling team will walk through options on the call.
            </p>
          </div>
        </div>
      </section>

      {office && <OfficeBlock office={office} cityName={city.name} />}

      {nearbyCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{ct.name} Home Services Near {city.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Nearby Cities</h2>
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
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book {ct.name} Home Services in {city.name}</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
