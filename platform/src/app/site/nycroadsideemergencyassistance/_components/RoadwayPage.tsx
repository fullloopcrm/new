// @ts-nocheck
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { getStateBySlug, getCityBySlug } from "@/app/site/nycroadsideemergencyassistance/_data/cities";
import { JsonLd, breadcrumbSchema, placeSchema, faqPageSchema, serviceSchema, emergencyServiceForRoadway, type FaqItem } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";
import { KIND_LABEL, type Roadway } from "@/app/site/nycroadsideemergencyassistance/_data/roadways";

/**
 * Renders a roadway page for streets, highways, bridges, or tunnels.
 * Single shared template — each route just hands us its Roadway entry.
 */
export function RoadwayPage({ roadway }: { roadway: Roadway }) {
  const kindMeta = KIND_LABEL[roadway.kind];
  const servicesForRoadway = roadway.commonCalls
    .map((slug) => SERVICES.find((s) => s.slug === slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  // Build the FAQ in code so each roadway gets its own schema entries.
  const faqs: FaqItem[] = [
    {
      question: `How fast can a tow truck reach me on the ${roadway.name}?`,
      answer: `Typical arrival on the ${roadway.name} is 20-40 minutes from dispatch. We stage trucks in all five boroughs, so the closest yard rolls — not a national chain handing the call off three times before someone heads your way. If you're inside a tolled facility or a tunnel, dispatch coordinates with MTA Bridges & Tunnels or the Port Authority on protocol so we get cleared in to your spot.`,
    },
    {
      question: `Do you handle ${roadway.kind === "bridge" || roadway.kind === "tunnel" ? "stranded vehicles on the bridge or tunnel itself" : "breakdowns directly on the " + roadway.name}?`,
      answer: `Yes. ${roadway.kind === "bridge" || roadway.kind === "tunnel" ? `On any toll facility (Verrazzano, Throgs Neck, Whitestone, GWB, Lincoln, Holland, Queens-Midtown, Hugh L. Carey, etc.) we follow the MTA or Port Authority tow protocol. That usually means the agency tow assesses first, and a private wrecker — us — can be authorized for the dispatch you actually want (your shop, your dealer, your driveway). Call as soon as you're safely off the live lane.` : `Most ${roadway.name} calls come from the right lane, the curb, or a service road shoulder. We dispatch the right truck for what happened — flatbed for AWD/EV/exotic, light-duty hook for sedans and SUVs, heavy wrecker for box trucks and sprinter vans.`} One rate every time: $149/hour, 1-hour minimum, $25 off when you book online.`,
    },
    {
      question: `What does it cost to get help on the ${roadway.name}?`,
      answer: `Same rate as every other call: $149/hour, 1-hour minimum, half-hour increments after. Book online instead of calling and the first hour is $124 — $25 off, no catches. No NYC surcharge, no after-hours markup, no toll-facility surcharge, no storage fees on same-day drops. The number you hear on the phone is the number on the receipt.`,
    },
    {
      question: `Which neighborhoods does the ${roadway.name} cover?`,
      answer: `The ${roadway.name} ${roadway.segment.toLowerCase()} ${
        roadway.relatedNeighborhoods.length > 0
          ? `Customers most often call from ${roadway.relatedNeighborhoods
              .slice(0, 5)
              .map((n) => {
                const city = getCityBySlug(n.state, n.city);
                return city?.city.name ?? n.city;
              })
              .filter(Boolean)
              .join(", ")}.`
          : ""
      }`,
    },
  ];

  const roadwayUrl = `/${kindMeta.pathSeg}/${roadway.slug}`;
  const schemas: Array<Record<string, unknown>> = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: kindMeta.plural, url: `/${kindMeta.pathSeg}` },
      { name: roadway.name, url: roadwayUrl },
    ]),
    placeSchema({
      name: roadway.name,
      url: roadwayUrl,
      stateSlug: roadway.boroughs[0] ?? "manhattan",
      address: { city: roadway.name },
    }),
    emergencyServiceForRoadway({
      name: roadway.name,
      url: roadwayUrl,
      geo: roadway.geo,
      boroughSlug: roadway.boroughs[0],
    }),
    faqPageSchema(faqs),
    ...servicesForRoadway.map((s) =>
      serviceSchema(s, { url: roadwayUrl, roadwayName: roadway.name }),
    ),
  ];

  return (
    <>
      <JsonLd schema={schemas} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            NYC {kindMeta.singular} · 24/7 Roadside Emergency
          </p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">Same rate, every borough, every corridor.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">{roadway.name}</span> Roadside Help &amp; Towing
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Stranded on the {roadway.name}? Jump start, lockout, flat tire, fuel, accident recovery, winch-out, or full tow. 20-40 min typical arrival, flat-rate pricing, all 5 NYC boroughs.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Overview */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">
            {roadway.subType}
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">
            What the {roadway.name} Looks Like
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-700">
            {roadway.segment}
          </p>

          {(roadway.lanes || roadway.speedLimit || roadway.length) && (
            <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {roadway.lanes && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-500 font-cta">Lanes</dt>
                  <dd className="mt-2 text-base font-semibold text-slate-900">{roadway.lanes}</dd>
                </div>
              )}
              {roadway.speedLimit && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-500 font-cta">Speed Limit</dt>
                  <dd className="mt-2 text-base font-semibold text-slate-900">{roadway.speedLimit}</dd>
                </div>
              )}
              {roadway.length && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                  <dt className="text-xs font-bold uppercase tracking-widest text-slate-500 font-cta">Length</dt>
                  <dd className="mt-2 text-base font-semibold text-slate-900">{roadway.length}</dd>
                </div>
              )}
            </dl>
          )}

          {roadway.nearestExits && roadway.nearestExits.length > 0 && (
            <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 font-cta">Notable Exits / Approaches</p>
              <p className="mt-3 text-base leading-relaxed text-slate-700">{roadway.nearestExits.join(" · ")}</p>
            </div>
          )}
        </div>
      </section>

      {/* Hazards / why people call */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Why Drivers Call From the {roadway.name}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
            The {kindMeta.singular.toLowerCase()} has its own failure patterns. Knowing them is how dispatch picks the right truck before it rolls.
          </p>
          <ul className="mx-auto mt-8 max-w-3xl space-y-4">
            {roadway.hazards.map((hazard, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-sm font-bold text-yellow-700 font-cta">{i + 1}</span>
                <p className="text-base leading-relaxed text-slate-700">{hazard}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Services dispatched here */}
      {servicesForRoadway.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              What We Dispatch to the {roadway.name}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
              The calls that come in most often from this corridor. Same $149/hour rate on every one.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {servicesForRoadway.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                  <p className="mt-1 text-xs text-slate-600">{s.subtitle}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related neighborhoods */}
      {roadway.relatedNeighborhoods.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Neighborhoods Along the {roadway.name}
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {roadway.relatedNeighborhoods.map((n) => {
                const state = getStateBySlug(n.state);
                const cityLookup = getCityBySlug(n.state, n.city);
                if (!state || !cityLookup) return null;
                return (
                  <Link key={`${n.state}-${n.city}`} href={`/locations/${n.state}/${n.city}`}
                    className="group rounded-xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">{cityLookup.city.name}</p>
                    <p className="mt-0.5 text-xs text-teal-600">{state.name}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            FAQs — {roadway.name}
          </h2>
          <div className="mt-10 space-y-6">
            {faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer text-base font-bold text-slate-900 font-heading">{f.question}</summary>
                <p className="mt-3 text-base leading-relaxed text-slate-700">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Stranded on the {roadway.name}?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Call, text, or book online. 20-40 min typical arrival. Flat $149/hr. No NYC surcharge, no after-hours markup.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {PHONE}</a>
            <a href={PHONE_HREF} className="inline-block rounded-lg bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Call {PHONE}</a>
            <Link href="/book-towing-service-today" className="inline-block rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-accent-dark font-cta">Request Help — Save $25</Link>
          </div>
        </div>
      </section>
    </>
  );
}