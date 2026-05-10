// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site//_data/content";
import { CUSTOMER_TYPES } from "@/app/site//_data/customer-types";
import { SERVICES } from "@/app/site//_data/services";
import { STATES, getStateBySlug } from "@/app/site//_data/cities";
import { getOfficeByState } from "@/app/site//_data/offices";
import { OfficeBlock } from "@/app/site/the-home-services-company/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/the-home-services-company/_components/CtaButtons";
import { customerStateContent } from "@/app/site//_data/customer-content";

function isServiceSlug(slug: string) {
  return SERVICES.some((s) => s.slug === slug);
}

export function generateStaticParams() {
  const params: { type: string; state: string }[] = [];
  for (const ct of CUSTOMER_TYPES) {
    // State pages
    for (const s of STATES) {
      params.push({ type: ct.slug, state: s.slug });
    }
    // Service pages (type + service)
    for (const svc of SERVICES) {
      params.push({ type: ct.slug, state: svc.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ type: string; state: string }> }): Promise<Metadata> {
  const { type, state: stateOrService } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) return {};

  if (isServiceSlug(stateOrService)) {
    const svc = SERVICES.find((s) => s.slug === stateOrService)!;
    return {
      title: `${svc.title} for ${ct.name} — Home Services Co Home Services`,
      description: `${svc.title} specifically for ${ct.name.toLowerCase()}. ${svc.description} Starting at $99/hour, licensed and insured.`,
      alternates: { canonical: `/who-we-serve/${type}/${stateOrService}` },
    };
  }

  const state = getStateBySlug(stateOrService);
  if (!state) return {};
  return {
    title: `Home Services for ${ct.name} in ${state.name} — Home Services Co`,
    description: `${ct.name} home services in ${state.cities.length} ${state.abbreviation} cities. ${ct.description} Starting at $99/hour, licensed and insured.`,
    alternates: { canonical: `/who-we-serve/${type}/${stateOrService}` },
  };
}

export default async function TypeStatePage({ params }: { params: Promise<{ type: string; state: string }> }) {
  const { type, state: stateOrService } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) notFound();

  // ===== SERVICE PAGE (type + service) =====
  if (isServiceSlug(stateOrService)) {
    const svc = SERVICES.find((s) => s.slug === stateOrService)!;
    return (
      <>
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{svc.title} for {ct.name}</p>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
              <span className="gradient-text">{svc.title}</span><br />for {ct.name}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{svc.description}</p>
            <CtaButtons variant="dark" />
          </div>
        </section>
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How {svc.title} Works for {ct.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{svc.title} — Tailored for {ct.name}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>, browse <Link href={`/who-we-serve/${type}`} className="text-teal-700 font-semibold hover:underline">all services for {ct.shortName.toLowerCase()}</Link>, or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book now</Link>.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p>{svc.longDescription}</p>
              <p>For {ct.name.toLowerCase()}, {svc.title.toLowerCase()} addresses specific needs: {ct.painPoints.slice(0, 3).join(", ")}. Our technicians understand these challenges and deliver accordingly — starting at $99/hour with upfront pricing on every job, licensed and insured across every trade.</p>
            </div>
          </div>
        </section>
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">More Services for {ct.name}</p>
            <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Other Services {ct.name} Use</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.filter((s) => s.slug !== svc.slug).slice(0, 6).map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{s.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{s.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative mx-auto max-w-5xl px-6 text-center">
            <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book {svc.title} for {ct.name}</h2>
            <CtaButtons variant="dark" />
          </div>
        </section>
      </>
    );
  }

  // ===== STATE PAGE (type + state) =====
  const state = getStateBySlug(stateOrService);
  if (!state) notFound();
  const office = getOfficeByState(stateOrService);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{ct.name} Home Services in {state.abbreviation}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Home Services for {ct.name}<br />in <span className="gradient-text">{state.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {ct.description} Serving {state.cities.length} cities across {state.abbreviation}.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How We Help {ct.name} in {state.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{ct.name} Home Services in {state.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            {state.cities.length} cities, same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>, local crews. Browse <Link href={`/who-we-serve/${type}`} className="text-teal-700 font-semibold hover:underline">all {ct.shortName.toLowerCase()} services</Link> or <Link href="/book" className="text-teal-700 font-semibold hover:underline">book now</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            {customerStateContent(ct, state.name, state.abbreviation, state.cities.length).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Services {ct.name} in {state.name} Use Most</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Across our {state.name} operation, {ct.name.toLowerCase()} book services across essentially every trade we offer, but a few recurring patterns dominate the volume. For ongoing maintenance,{" "}
              <Link href="/services/house-cleaning" className="text-teal-700 font-semibold hover:underline">house cleaning</Link>,{" "}
              <Link href="/services/lawn-care" className="text-teal-700 font-semibold hover:underline">lawn care</Link>,{" "}
              <Link href="/services/pest-control" className="text-teal-700 font-semibold hover:underline">pest control</Link>, and{" "}
              <Link href="/services/gutter-cleaning" className="text-teal-700 font-semibold hover:underline">gutter cleaning</Link> are the most common recurring accounts in {state.abbreviation}.
              For repair and replacement,{" "}
              <Link href="/services/hvac-services" className="text-teal-700 font-semibold hover:underline">HVAC</Link>,{" "}
              <Link href="/services/plumbing" className="text-teal-700 font-semibold hover:underline">plumbing</Link>,{" "}
              <Link href="/services/electrical" className="text-teal-700 font-semibold hover:underline">electrical</Link>, and{" "}
              <Link href="/services/appliance-repair" className="text-teal-700 font-semibold hover:underline">appliance repair</Link> dominate the call volume.
            </p>
            <p>
              For project work, {ct.name.toLowerCase()} in {state.name} book{" "}
              <Link href="/services/kitchen-remodeling" className="text-teal-700 font-semibold hover:underline">kitchen remodeling</Link>,{" "}
              <Link href="/services/bathroom-remodeling" className="text-teal-700 font-semibold hover:underline">bathroom remodeling</Link>,{" "}
              <Link href="/services/roofing" className="text-teal-700 font-semibold hover:underline">roofing</Link>,{" "}
              <Link href="/services/painting" className="text-teal-700 font-semibold hover:underline">painting</Link>, and{" "}
              <Link href="/services/flooring-installation" className="text-teal-700 font-semibold hover:underline">flooring installation</Link> most often. These projects are quoted as written scopes with milestone payments rather than strictly hourly billing, and for larger jobs we assign a dedicated project manager who coordinates the trades and manages communication start to finish.
            </p>
            <p>
              Cross-trade work is where the one-vendor model shows its strongest value in {state.name}. When a scope touches multiple trades — a kitchen remodel pulling in plumbing, electrical, flooring, and painting; an exterior project combining roofing, siding, and gutters; a whole-home refresh touching interior paint, carpet cleaning, and handyman punch-list items — we coordinate the sequencing, the technicians, and the invoicing as one project. The alternative of juggling four separate {state.abbreviation} vendors for a single project usually produces schedule gaps, miscommunication, and invoicing mess that our consolidated model sidesteps.
            </p>
            <p>
              For {ct.name.toLowerCase()} with recurring or portfolio-scale work in {state.name}, dedicated account structures apply. A single account coordinator handles scheduling across every trade. Consolidated billing formats match {state.abbreviation} accounting systems. COI documentation with specific properties or owners listed as additional insured is available within 24 hours. The operational overhead savings compared to managing 10-15 separate vendor relationships are substantial, and the quality consistency across trades is typically better than what a patchwork of independent contractors produces. See our <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">commercial services page</Link> for full account details, or call {PHONE} to discuss the specific {ct.name.toLowerCase()} scenario you are trying to solve in {state.name}.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{ct.name} Home Services Cities in {state.abbreviation}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{state.cities.length} Cities in {state.name}</h2>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {state.cities.map((city) => (
              <Link key={city.slug} href={`/who-we-serve/${type}/${stateOrService}/${city.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700">{city.name}</p>
                <p className="mt-0.5 text-xs text-teal-600">{ct.shortName}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {office && <OfficeBlock office={office} />}

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book {ct.name} Home Services in {state.name}</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
