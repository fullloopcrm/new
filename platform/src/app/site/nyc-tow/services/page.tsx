// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site//_data/content";
import { SERVICES, SERVICE_CATEGORIES } from "@/app/site//_data/services";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/app/site/nyc-tow/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck & Roadside Services Near Me — 24/7 Dispatch, All Boroughs",
  description: "Full towing and roadside service across all 5 NYC boroughs. Light-duty, flatbed (AWD / EV / luxury), heavy-duty, motorcycle, accident recovery, and full roadside. Flat-rate pricing, 24/7 dispatch.",
  alternates: { canonical: "/services" },
};

type CategoryKey = keyof typeof SERVICE_CATEGORIES;

const CATEGORY_ORDER: CategoryKey[] = ["light-duty", "heavy-duty", "roadside", "specialty", "commercial"];

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Services", url: "/services" },
          ]),
          itemListSchema(
            SERVICES.map((s) => ({
              name: s.title,
              url: `/services/${s.slug}`,
              description: s.description,
            })),
            "NYC Towing & Roadside Services",
          ),
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {SERVICES.length} Services — One NYC Phone Number
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            NYC Tow Truck & <span className="gradient-text">Roadside Services Near Me</span> — 24/7 Dispatch
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Light-duty tows, flatbed for AWD and EVs, heavy-duty for commercial rigs, motorcycle transport, accident recovery, and every common roadside call. Flat-rate pricing, 24/7, across all {STATE_COUNT} boroughs and {CITY_COUNT}+ neighborhoods.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* INTRO */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How One Phone Number Covers Every NYC Breakdown</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Most NYC drivers discover that breakdowns come in a handful of flavors. A dead battery on a cold morning. A flat tire from a pothole. Keys locked in the car. Ran out of gas. Needs a flatbed to a shop because it&apos;s AWD. Got totaled and needs a collision tow with insurance billing. Got towed by NYPD and needs pound recovery. Each of those needs different equipment, different expertise, and different pricing — but they should all come from one phone number.</p>
            <p>Our {SERVICES.length} services cover all of it. Dispatchers ask three things on the call — where you are, what&apos;s wrong, and the year/make/model — and route the right truck accordingly. You don&apos;t need to know whether your vehicle needs a wheel-lift or a flatbed. You don&apos;t need to know whether to call for a tow or roadside. Describe the situation. We&apos;ll figure it out.</p>
            <p>Flat-rate pricing on every service. Quoted on the phone before we dispatch. No NYC surcharge, no after-hours markup, no storage fees on same-day drops. 24/7 operation with trucks staged in every borough — typical arrival 20–40 minutes.</p>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {CATEGORY_ORDER.map((catKey, idx) => {
        const cat = SERVICE_CATEGORIES[catKey];
        const services = SERVICES.filter((s) => s.category === catKey);
        const isAlt = idx % 2 === 0;
        return (
          <section key={catKey} className={`${isAlt ? "bg-section-teal" : "bg-section-white"} py-16`}>
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{cat.label}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">{cat.description}</p>
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <Link key={service.slug} href={`/services/${service.slug}`} className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-teal-400 hover:shadow-md h-full">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      </div>
                    <div className="flex flex-col p-6">
                      <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{service.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-teal-600">{service.subtitle}</p>
                      <p className="mt-3 text-sm text-slate-600">{service.description}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {service.ideal.map((tag) => (<span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>))}
                      </div>
                      <p className="mt-4 text-sm font-semibold text-teal-600 group-hover:text-teal-700 font-cta">Learn More →</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* PRICING */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How Pricing Works Across All {SERVICES.length} Services</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Flat-rate, quoted on the phone before dispatch. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">full pricing page</Link> for examples.
          </p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Light-duty tow:</strong> $125 base plus $4/mile past the first five. Covers conventional cars, sedans, compact SUVs. Wheel-lift trucks.</p>
            <p><strong>Flatbed tow:</strong> $175 base plus $5/mile past five. Required for AWD, 4WD, EVs, low-clearance luxury, motorcycles, and long-distance.</p>
            <p><strong>Heavy-duty tow:</strong> Quoted per job. For box trucks, sprinters, commercial rigs, and Class 6–8 vehicles.</p>
            <p><strong>Roadside flat rate:</strong> $85 per call for jump-start, flat tire, lockout, or gas delivery. Winch-out starts at $125.</p>
            <p><strong>No hidden fees:</strong> No NYC surcharge. No after-hours markup. No storage fees on same-day drops. No &quot;heavy item&quot; or &quot;access&quot; surcharges. Receipts emailed within minutes.</p>
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Available Across All {STATE_COUNT} NYC Boroughs</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every service runs 24/7 across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. <Link href="/locations" className="text-teal-700 font-semibold hover:underline">Browse coverage areas</Link> or <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">request service</Link>.</p>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Need Any Of These Services Right Now?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Call <a href={PHONE_HREF} className="text-white underline">{PHONE}</a>. 24/7 dispatch. Any borough. Any hour.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
