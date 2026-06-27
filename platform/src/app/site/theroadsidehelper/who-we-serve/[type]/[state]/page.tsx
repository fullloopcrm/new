// @ts-nocheck
import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/theroadsidehelper/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/theroadsidehelper/_data/customer-types";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";
import { STATES, getStateBySlug } from "@/app/site/theroadsidehelper/_data/cities";
import { getOfficeByState } from "@/app/site/theroadsidehelper/_data/offices";
import { OfficeBlock } from "@/app/site/theroadsidehelper/_components/OfficeBlock";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { ValuationHint } from "@/app/site/theroadsidehelper/_components/ValuationHint";
import { customerStateContent } from "@/app/site/theroadsidehelper/_data/customer-content";
import { breadcrumbSchema, jsonLd } from "@/app/site/theroadsidehelper/_lib/schema";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; state: string }>;
}) {
  const { type, state: stateOrService } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) return {};

  if (isServiceSlug(stateOrService)) {
    const svc = SERVICES.find((s) => s.slug === stateOrService)!;
    return pageSeo({
      title: `${svc.title} for ${ct.name} — The Roadside Helper`,
      description: `${svc.title} specifically for ${ct.name.toLowerCase()}. ${svc.description} $149/hr flat, all standard equipment included.`,
      path: `/who-we-serve/${type}/${stateOrService}`,
    });
  }

  const state = getStateBySlug(stateOrService);
  if (!state) return {};
  return pageSeo({
    title: `Roadside Assistance for ${ct.name} in ${state.name} — The Roadside Helper`,
    description: `${ct.name} roadside assistance in ${state.cities.length} ${state.abbreviation} cities. ${ct.description} $149/hr flat, all standard equipment included.`,
    path: `/who-we-serve/${type}/${stateOrService}`,
  });
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              breadcrumbSchema([
                { name: "Home", path: "/" },
                { name: "Who We Serve", path: "/who-we-serve" },
                { name: ct.name, path: `/who-we-serve/${ct.slug}` },
                {
                  name: svc.title,
                  path: `/who-we-serve/${ct.slug}/${svc.slug}`,
                },
              ]),
            ),
          }}
        />
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
              See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>, browse <Link href={`/who-we-serve/${type}`} className="text-teal-700 font-semibold hover:underline">all services for {ct.shortName.toLowerCase()}</Link>, or <Link href="/book-roadside-help-now" className="text-teal-700 font-semibold hover:underline">book now</Link>.
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
              <p>{svc.longDescription}</p>
              <p>For {ct.name.toLowerCase()}, {svc.title.toLowerCase()} addresses specific needs: {ct.painPoints.slice(0, 3).join(", ")}. Our crew understands these challenges and delivers accordingly — with the same $149/hr flat rate, all standard equipment included, and 24/7 dispatch on every item worth something.</p>
            </div>
            <ValuationHint className="mx-auto mt-8 max-w-3xl" />
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Who We Serve", path: "/who-we-serve" },
              { name: ct.name, path: `/who-we-serve/${ct.slug}` },
              { name: state.name, path: `/who-we-serve/${ct.slug}/${state.slug}` },
            ]),
          ),
        }}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{ct.name} Roadside Assistance in {state.abbreviation}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Roadside Assistance for {ct.name}<br />in <span className="gradient-text">{state.name}</span>
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
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{ct.name} Roadside Assistance in {state.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            {state.cities.length} cities, same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link>, local crews. Browse <Link href={`/who-we-serve/${type}`} className="text-teal-700 font-semibold hover:underline">all {ct.shortName.toLowerCase()} services</Link> or <Link href="/book-roadside-help-now" className="text-teal-700 font-semibold hover:underline">book now</Link>.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            {customerStateContent(ct, state.name, state.abbreviation, state.cities.length).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <ValuationHint className="mx-auto mt-8 max-w-3xl" />
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">{ct.name} Roadside Assistance Cities in {state.abbreviation}</p>
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
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Book {ct.name} Roadside Assistance in {state.name}</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}