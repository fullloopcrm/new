import Link from "next/link";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, SMS_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/theroadsidehelper/_data/customer-types";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";
import { STATES } from "@/app/site/theroadsidehelper/_data/cities";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { ValuationHint } from "@/app/site/theroadsidehelper/_components/ValuationHint";
import { customerTypeContent } from "@/app/site/theroadsidehelper/_data/customer-content";
import { breadcrumbSchema, jsonLd } from "@/app/site/theroadsidehelper/_lib/schema";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) return {};
  return pageSeo({
    title: `Roadside Assistance for ${ct.name} — The Roadside Helper for Your Stuff`,
    description: `${ct.description} $149/hr flat, all standard equipment included, 24/7 dispatch. ${CITY_COUNT}+ cities.`,
    path: `/who-we-serve/${type}`,
  });
}

export default async function CustomerTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const ct = CUSTOMER_TYPES.find((c) => c.slug === type);
  if (!ct) notFound();

  const relatedServices = SERVICES.filter((s) => ct.services.includes(s.slug));
  const otherTypes = CUSTOMER_TYPES.filter((c) => c.slug !== type).slice(0, 6);

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
            ]),
          ),
        }}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Roadside Assistance Built for {ct.name}</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Roadside Assistance for <span className="gradient-text">{ct.name}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">{ct.description}</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How Our Model Works for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why {ct.name} Choose The Roadside Helper</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">transparent pricing</Link>, browse <Link href="/services" className="text-teal-700 font-semibold hover:underline">every roadside service</Link>, or <Link href="/book-roadside-help-now" className="text-teal-700 font-semibold hover:underline">book roadside help</Link> today.
          </p>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            {customerTypeContent(ct).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <ValuationHint className="mx-auto mt-8 max-w-3xl" />
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Common Pain Points for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Problems We Solve for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Sound familiar? Every one of these is a reason to call us instead of waiting hours on an auto club.
          </p>
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

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Why {ct.name} Choose Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">What {ct.name} Get</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            What sets the service apart for your situation. See our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">full pricing page</Link> for detailed cost breakdowns.
          </p>
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            {ct.creditHighlights.map((ch) => (
              <div key={ch} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <span className="text-teal-600 mt-0.5 shrink-0 font-bold">✓</span>
                <span className="text-sm text-slate-700">{ch}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Top Services for {ct.name}</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Recommended Services for {ct.name}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            These are the services {ct.shortName.toLowerCase()} use most. <Link href="/services" className="text-teal-700 font-semibold hover:underline">Every roadside service</Link> is available.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map((s) => (
              <Link key={s.slug} href={`/who-we-serve/${type}/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">{s.title} for {ct.shortName} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Find {ct.name} Roadside Assistance in Your State</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Roadside Assistance for {ct.name} by State</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Select your state to find local {ct.shortName.toLowerCase()} roadside assistance with <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">our pricing</Link> and credits.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {STATES.map((s) => (
              <Link key={s.slug} href={`/who-we-serve/${type}/${s.slug}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-sm font-medium text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-all">
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">We Also Serve These Customer Types</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Other Customers We Work With</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherTypes.map((ot) => (
              <Link key={ot.slug} href={`/who-we-serve/${ot.slug}`} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700">{ot.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{ot.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Book Roadside Assistance for {ct.name} Today</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">{ct.name} — Your Stuff Has Value</h2>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}