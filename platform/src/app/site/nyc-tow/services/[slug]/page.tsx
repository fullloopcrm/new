import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, CITY_COUNT } from "@/app/site/nyc-tow/_data/content";
import { SERVICES, SERVICE_CATEGORIES, getExtendedContent } from "@/app/site/nyc-tow/_data/services";
import { getLinkifiedExtendedContent } from "@/app/site/nyc-tow/_data/services-links";
import { getServiceTips } from "@/app/site/nyc-tow/_data/service-tips";
import { getServiceFAQs } from "@/app/site/nyc-tow/_data/service-faq";
import { STATES } from "@/app/site/nyc-tow/_data/cities";
import { JsonLd, breadcrumbSchema, serviceSchema, faqPageSchema } from "@/app/site/nyc-tow/_lib/schema";

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  return {
    title: `${service.title} in NYC — 24/7 Tow Truck Near Me, All Boroughs`,
    description: `${service.title} in NYC — 24/7 tow truck dispatch near you. ${service.description} Flat-rate pricing, 20–40 min arrival across all 5 boroughs.`,
    alternates: { canonical: `/services/${slug}` },
  };
}

/** Curated neighborhood list per service — pulls from cities data, ranked by call volume profile */
function getRelevantNeighborhoods(slug: string): Array<{ slug: string; name: string; borough: string; boroughSlug: string }> {
  // Build lookup maps of all neighborhoods by name
  const allNeighborhoods: Array<{ slug: string; name: string; borough: string; boroughSlug: string }> = [];
  for (const state of STATES) {
    for (const city of state.cities) {
      allNeighborhoods.push({
        slug: city.slug,
        name: city.name,
        borough: state.name,
        boroughSlug: state.slug,
      });
    }
  }

  // Service-specific neighborhood picks (by neighborhood slug, for precision)
  const picks: Record<string, string[]> = {
    "light-duty-towing": ["upper-east-side", "upper-west-side", "williamsburg", "park-slope", "astoria", "forest-hills", "flushing", "riverdale"],
    "motorcycle-towing": ["williamsburg", "greenpoint", "bushwick", "red-hook", "long-island-city", "astoria", "east-village", "ridgewood-border"],
    "heavy-duty-towing": ["hunts-point", "maspeth", "long-island-city", "red-hook", "navy-yard", "mott-haven", "flushing", "staten-island-expressway"],
    "flatbed-towing": ["tribeca", "soho", "west-village", "hudson-yards", "upper-east-side", "brooklyn-heights", "dumbo", "long-island-city"],
    "accident-recovery": ["upper-east-side", "hunts-point", "flushing", "bay-ridge", "harlem", "williamsburg", "bed-stuy", "jamaica"],
    "long-distance-towing": ["tribeca", "upper-east-side", "brooklyn-heights", "forest-hills", "riverdale", "long-island-city", "park-slope", "flushing"],
    "rv-motorhome-towing": ["staten-island-expressway", "riverdale", "flushing", "forest-hills", "bay-ridge", "mill-basin", "throgs-neck", "todt-hill"],
    "roadside-assistance": ["midtown", "harlem", "astoria", "park-slope", "williamsburg", "forest-hills", "riverdale", "jamaica"],
    "jump-start": ["upper-east-side", "upper-west-side", "astoria", "long-island-city", "park-slope", "williamsburg", "flushing", "forest-hills"],
    "battery-replacement": ["upper-east-side", "astoria", "forest-hills", "park-slope", "bay-ridge", "flushing", "riverdale", "bed-stuy"],
    "gas-delivery": ["midtown", "midtown-east", "financial-district", "tribeca", "harlem", "astoria", "long-island-city", "flushing"],
    "flat-tire-change": ["upper-east-side", "upper-west-side", "williamsburg", "bushwick", "astoria", "forest-hills", "jamaica", "riverdale"],
    "lockout-service": ["upper-east-side", "williamsburg", "park-slope", "astoria", "long-island-city", "forest-hills", "bay-ridge", "bed-stuy"],
    "winch-out-recovery": ["red-hook", "gowanus", "long-island-city", "flushing", "hunts-point", "bay-ridge", "jamaica", "bed-stuy"],
    "winter-snow-extraction": ["park-slope", "bay-ridge", "astoria", "forest-hills", "riverdale", "bed-stuy", "flushing", "crown-heights"],
    "mobile-mechanic-on-site-repairs": ["midtown", "long-island-city", "maspeth", "hunts-point", "bed-stuy", "astoria", "flushing", "sunset-park"],
    "junk-car-removal": ["jamaica", "flushing", "brownsville", "east-new-york", "mill-basin", "marine-park", "throgs-neck", "bed-stuy"],
    "illegally-parked-towing": ["midtown", "chelsea", "soho", "long-island-city", "flushing", "sunset-park", "bay-ridge", "bed-stuy"],
    "impound-recovery": ["navy-yard", "flushing", "midtown-west", "mott-haven", "hunts-point", "red-hook", "midtown", "hudson-yards"],
    "abandoned-vehicle-removal": ["hunts-point", "jamaica", "brownsville", "east-new-york", "mott-haven", "morrisania", "tremont", "south-ozone-park"],
    "ev-tesla-towing": ["tribeca", "soho", "west-village", "hudson-yards", "brooklyn-heights", "dumbo", "long-island-city", "williamsburg"],
    "luxury-exotic-towing": ["tribeca", "soho", "west-village", "upper-east-side", "hudson-yards", "battery-park-city", "brooklyn-heights", "long-island-city"],
    "insurance-claim-towing": ["upper-east-side", "williamsburg", "astoria", "flushing", "bay-ridge", "riverdale", "jamaica", "harlem"],
    "auto-body-collision-delivery": ["long-island-city", "maspeth", "navy-yard", "hunts-point", "east-williamsburg", "travis", "mariners-harbor", "mott-haven"],
    "boat-trailer-towing": ["sheepshead-bay", "bay-ridge", "coney-island", "flushing", "city-island", "manhattan-beach", "mill-basin", "brighton-beach"],
    "classic-antique-car-transport": ["tribeca", "soho", "west-village", "brooklyn-heights", "dumbo", "hudson-yards", "upper-east-side", "long-island-city"],
    "fleet-towing": ["long-island-city", "maspeth", "navy-yard", "hunts-point", "red-hook", "flushing", "jamaica", "mott-haven"],
    "commercial-towing": ["hunts-point", "maspeth", "long-island-city", "navy-yard", "red-hook", "flushing", "jamaica", "mott-haven"],
    "emergency-247-towing": ["midtown", "harlem", "astoria", "long-island-city", "williamsburg", "flushing", "jamaica", "riverdale"],
    "dealer-auto-transport": ["long-island-city", "flushing", "bay-ridge", "bensonhurst", "hudson-yards", "midtown-west", "yorkville", "jamaica"],
  };

  const slugsToFind = picks[slug] ?? ["midtown", "upper-east-side", "williamsburg", "astoria", "park-slope", "forest-hills", "flushing", "riverdale"];

  const result: Array<{ slug: string; name: string; borough: string; boroughSlug: string }> = [];
  for (const s of slugsToFind) {
    const found = allNeighborhoods.find((n) => n.slug === s);
    if (found) result.push(found);
  }
  // Backfill if any picks didn't resolve
  while (result.length < 8) {
    const fallback = allNeighborhoods.find((n) => !result.find((r) => r.slug === n.slug));
    if (!fallback) break;
    result.push(fallback);
  }
  return result.slice(0, 8);
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  const serviceIndex = SERVICES.indexOf(service);
  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const otherServices = SERVICES.filter((s) => s.category !== service.category).slice(0, 6);
  const quickTips = getServiceTips(service.slug).rightNow.slice(0, 4);
  const siblingForTip = relatedServices[0] ?? SERVICES.find((s) => s.slug !== service.slug)!;
  const secondSibling = relatedServices[1] ?? SERVICES.find((s) => s.slug !== service.slug && s.slug !== siblingForTip.slug)!;

  const faqs = getServiceFAQs(service.slug);
  const neighborhoods = getRelevantNeighborhoods(service.slug);

  // Resolve the service.relatedServices slugs into Service objects for the related-services card grid
  const relatedByField = service.relatedServices
    .map((relSlug) => SERVICES.find((s) => s.slug === relSlug))
    .filter((s): s is NonNullable<typeof s> => !!s);

  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Services", url: "/services" },
            { name: service.title, url: `/services/${service.slug}` },
          ]),
          serviceSchema(service),
          faqPageSchema(faqs.map((f) => ({ question: f.q, answer: f.a }))),
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {category.label} — Service #{serviceIndex + 1} of {SERVICES.length}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            {service.title} <span className="gradient-text">NYC</span> — 24/7 Tow Truck Near Me, All Boroughs
          </h1>
          <p className="mt-4 text-2xl font-bold text-teal-200 font-heading">
            {service.subtitle}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {service.description}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-teal-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* Long description */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-lg">
            </div>
          <h2 className="mt-10 text-center text-3xl font-bold text-slate-900 font-heading">
            About {service.title}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>{service.longDescription}</p>
          </div>
        </div>
      </section>

      {/* Extended deep-dive content — the 4,500-word generator output, now linkified */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Everything You Need to Know About {service.title} in NYC</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            {getLinkifiedExtendedContent(service, getExtendedContent(service)).map((parts, i) => (
              <p key={i}>{parts}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-2xl border-2 border-teal-400 bg-white p-8 shadow-md sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-700 font-cta">
              Emergency 101
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">
              Quick Tips for {service.title} in NYC
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              The short version of what to do while you wait for dispatch. For the full step-by-step with do&apos;s, don&apos;ts, pricing breakdown, and NYC-specific FAQs, see the{" "}
              <Link href={`/services/${service.slug}/tips`} className="text-teal-700 font-semibold hover:underline">
                full {service.title} guide
              </Link>
              . If the situation shifts into something adjacent — a{" "}
              <Link href={`/services/${siblingForTip.slug}`} className="text-teal-700 font-semibold hover:underline">
                {siblingForTip.title.toLowerCase()}
              </Link>{" "}
              or a{" "}
              <Link href={`/services/${secondSibling.slug}`} className="text-teal-700 font-semibold hover:underline">
                {secondSibling.title.toLowerCase()}
              </Link>{" "}
              call — dispatch can re-route on the same phone call.
            </p>
            <ul className="mt-8 space-y-3">
              {quickTips.map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 inline-block h-6 w-6 shrink-0 rounded-full bg-teal-600 text-center text-xs font-bold leading-6 text-white">
                    {i + 1}
                  </span>
                  <span className="text-base leading-relaxed text-slate-700">
                    {tip.replace(/\{link:[^|}]+\|([^}]+)\}/g, "$1")}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href={`/services/${service.slug}/tips`}
                className="inline-flex items-center rounded-lg bg-teal-700 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-teal-800 font-cta"
              >
                Read the Full {service.title} Guide →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            How {service.title} Works in NYC
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Call Dispatch", desc: `Call ${PHONE} and describe the situation — where you are (cross-streets are fine), what&apos;s wrong, and the year/make/model. 90-second call.` },
              { step: "2", title: "Flat Rate + Live ETA", desc: `Dispatcher quotes a flat rate on the call and gives you an honest ETA. Typical arrival 20–40 minutes. Truck number and driver name before you hang up.` },
              { step: "3", title: "Driver Arrives", desc: `Driver confirms condition, takes timestamped photos, and walks through the procedure. Nothing happens out of sight.` },
              { step: "4", title: "Done & Receipt", desc: `Paid at completion by card, Apple Pay, Google Pay, or cash. Receipt emailed immediately. Insurance billing direct for accident tows.` },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{item.step}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                {/* SAFE: static operator-authored literal (colocated array in this file); raw HTML is intentional (HTML entities / inline <a>). Sanitize if ever DB-sourced — audit §2.4b. */}
                <p className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: item.desc }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service-specific FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Frequently Asked Questions About {service.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            The questions we hear most often from NYC drivers calling for {service.title.toLowerCase()}. Still have questions? Call dispatch at {PHONE} — we answer them on the phone the same way.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{faq.q}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-700">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Choose Us for {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>NYC has plenty of options for {service.title.toLowerCase()} — national roadside networks, light-pole flyer operators, and local shops. We&apos;re the licensed local operator those networks subcontract to when they do the job right. When you call us directly, you skip the dispatch markup and the subcontractor chain. Faster response, lower rate, cleaner execution.</p>
            <p>Our drivers are W-2 employees, not gig workers. They train on every common vehicle platform — conventional cars, AWD and 4WD, EVs with manufacturer-spec procedures, motorcycles with proper flatbed technique, low-clearance luxury cars, and heavy commercial vehicles. The right truck shows up the first time.</p>
            <p>Flat-rate pricing quoted on the phone before dispatch. NYC DCWP licensed. Commercial auto, garage liability, and on-hook insurance on every truck and every load. No NYC surcharge, no after-hours markup, no storage fees on same-day drops. Receipts emailed before the truck leaves the scene.</p>
          </div>
        </div>
      </section>

      {/* Where in NYC this happens most — neighborhoods grid */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Where in NYC {service.title} Happens Most
          </h2>
          <div className="mx-auto mt-6 max-w-3xl text-center text-base leading-relaxed text-slate-700">
            <p>
              {service.neighborhoodContext}
            </p>
            <p className="mt-4">
              We dispatch to every neighborhood in the five boroughs, but these are the areas where we run {service.title.toLowerCase()} calls most often. Click any to see our full {service.title.toLowerCase()} service in that neighborhood, or call{" "}
              <a href={PHONE_HREF} className="text-teal-700 font-semibold hover:underline">{PHONE}</a>{" "}
              for dispatch right now.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {neighborhoods.map((n) => (
              <Link
                key={n.slug}
                href={`/locations/${n.boroughSlug}/${n.slug}`}
                className="group rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md"
              >
                <p className="text-sm font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">
                  {n.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">{n.borough}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing reminder */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            {service.title} Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Flat-rate, quoted on the phone before dispatch. See <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">full pricing page</Link>.
          </p>
          <div className="mt-8 max-w-sm mx-auto">
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center shadow-md">
              <p className="text-2xl font-bold text-teal-700 font-heading">{category.label}</p>
              <p className="mt-3 text-sm text-slate-500">{category.description}</p>
            </div>
          </div>
          <div className="mt-6">
            <Link href="/pricing" className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              View Full Pricing Details →
            </Link>
          </div>
        </div>
      </section>

      {/* Related services card grid — pulled from service.relatedServices field */}
      {relatedByField.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Related Services We Handle Too
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
              {service.title} calls often overlap with these services. If your situation shifts mid-call, dispatch re-routes without you having to start over.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedByField.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                  <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                  <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related services in same category */}
      {relatedServices.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
              Also in {category.label}
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedServices.map((s) => (
                <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                  <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                  <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Other services */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Other Services We Run
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-teal-700 font-semibold text-sm hover:underline font-cta">
              View All {SERVICES.length} Services →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">
            Need {service.title} Right Now?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            24/7 dispatch. Flat-rate pricing. 20–40 minute typical arrival. {CITY_COUNT}+ neighborhoods across all 5 boroughs.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
