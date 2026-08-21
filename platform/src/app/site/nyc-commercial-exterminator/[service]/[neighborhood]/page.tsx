import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getServiceBySlug,
  getNeighborhoodBySlug,
  getRelatedServices,
  getCrossCategoryServices,
  getNearbyNeighborhoods,
  getOtherRegionNeighborhoods,
} from "@/app/site/nyc-commercial-exterminator/_lib/data";
import {
  getMoneyPageMeta,
  getLocalBusinessSchema,
  getFAQPageSchema,
  PHONE,
} from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import Breadcrumbs from "@/app/site/nyc-commercial-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/nyc-commercial-exterminator/_components/CTAGroup";

interface PageProps {
  params: Promise<{ service: string; neighborhood: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  const services = getAllServices().slice(0, 5);
  const neighborhoods = getAllNeighborhoods().slice(0, 10);

  return services.flatMap((s) =>
    neighborhoods.map((n) => ({
      service: s.slug,
      neighborhood: n.slug,
    }))
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { service: serviceSlug, neighborhood: neighborhoodSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  const neighborhood = getNeighborhoodBySlug(neighborhoodSlug);
  if (!service || !neighborhood) return {};

  const meta = getMoneyPageMeta(service, neighborhood);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function MoneyPage({ params }: PageProps) {
  const { service: serviceSlug, neighborhood: neighborhoodSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  const neighborhood = getNeighborhoodBySlug(neighborhoodSlug);

  if (!service || !neighborhood) notFound();

  const nearbyNeighborhoods = getNearbyNeighborhoods(neighborhood, 8);
  const otherRegionNeighborhoods = getOtherRegionNeighborhoods(neighborhood, 4);
  const relatedServices = getRelatedServices(service, 6);
  const crossCategoryServices = getCrossCategoryServices(service, 4);

  const location =
    neighborhood.name === neighborhood.region
      ? neighborhood.name
      : `${neighborhood.name}, ${neighborhood.region}`;

  const nameLower = service.name.toLowerCase();
  const phonePlain = PHONE.replace(/-/g, "");

  const localBusinessSchema = getLocalBusinessSchema(service, neighborhood);
  const faqSchema = getFAQPageSchema(service.faqs);
  // Breadcrumb schema is injected once, by the <Breadcrumbs> component below
  // (which also prepends "Home") — this page used to build and inject its
  // own second, Home-less BreadcrumbList on top of that, so every one of
  // these ~10,800 service/neighborhood pages shipped two BreadcrumbList
  // blocks.

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: service.name, url: `/${service.slug}` },
              { name: neighborhood.name, url: `/${service.slug}/${neighborhood.slug}` },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
                {service.category} &middot; {neighborhood.region}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                {service.name} in{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  {neighborhood.name}
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Professional {nameLower} in {location}. Our licensed
                exterminators provide thorough inspections, targeted treatments,
                and follow-up service to ensure your pest problem is eliminated.
                {service.emergencyAvailable && " Same-day emergency service available."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-400">
                  {service.priceRange} &middot; fully inclusive
                </span>
                <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-400">
                  Pay on completion
                </span>
                {service.emergencyAvailable && (
                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-medium text-red-400">
                    Same-Day Available
                  </span>
                )}
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-300">
                  Free Inspection
                </span>
              </div>

              <CTAGroup variant="hero" />
            </div>

            <div className="rounded-xl border-2 border-green-700/50 bg-gradient-to-br from-green-950/40 to-zinc-900/60 p-8 shadow-2xl shadow-green-900/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
                Same $249/hr in {neighborhood.name}
              </p>
              <p className="mt-4 text-5xl font-extrabold text-white">
                $249<span className="text-lg font-medium text-zinc-400">/hr</span>
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Flat. Fully inclusive. The only fully inclusive hourly exterminator pricing platform in NYC.
                No deposit, no contract, no catches &mdash; pay only when the job is done.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                <li>&#10003; $249/hr for {nameLower} in {neighborhood.name}</li>
                <li>&#10003; Free on-site inspection (off the clock)</li>
                <li>&#10003; Pay only after the work is done</li>
                <li>&#10003; Free re-treatment inside the guarantee</li>
              </ul>
              <Link
                href="/schedule-service"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500"
              >
                Schedule Service &rarr;
              </Link>
              <p className="mt-3 text-center text-xs text-zinc-500">
                Or call/text{" "}
                <a href={`tel:${phonePlain}`} className="font-semibold text-green-400 hover:text-green-300">
                  {PHONE}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT'S INCLUDED ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} Services in {neighborhood.name}
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Every {nameLower} appointment in {location} is performed by a licensed, insured
            exterminator and includes a free on-site inspection, targeted treatment using
            EPA-registered products, follow-up service, and our satisfaction guarantee. Here
            is what&apos;s included:
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {service.commonServices.map((cs) => (
              <div
                key={cs}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300"
              >
                {cs}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            {service.licensingNote}
          </p>
        </div>
      </section>

      {/* ── MID CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} in {neighborhood.name} — Frequently Asked Questions
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Common questions {neighborhood.name} residents and business owners ask about
            {" "}{nameLower} services, including costs, treatment timelines, and what to expect
            from your licensed exterminator.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {service.faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEARBY NEIGHBORHOODS ── */}
      {nearbyNeighborhoods.length > 0 && (
        <section className="bg-[#2A2A2A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">
              {service.name} Near {neighborhood.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              We also provide professional {nameLower} services in these neighborhoods near
              {" "}{neighborhood.name}. Our licensed exterminators serve the entire {neighborhood.region} area
              with same-day availability.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {nearbyNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/${service.slug}/${n.slug}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:border-green-500 hover:text-white"
                >
                  {n.name}
                </Link>
              ))}
              {otherRegionNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/${service.slug}/${n.slug}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:border-green-500 hover:text-white"
                >
                  {n.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RELATED SERVICES ── */}
      {relatedServices.length > 0 && (
        <section className="bg-[#0A0A0A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Other Pest Control Services in {neighborhood.name}</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Beyond {nameLower}, NYC Commercial Exterminator offers 30+ professional pest control
              services in {neighborhood.name} and throughout {neighborhood.region}. All services include
              free inspection and upfront pricing.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...relatedServices, ...crossCategoryServices].slice(0, 8).map((s) => (
                <Link
                  key={s.slug}
                  href={`/${s.slug}/${neighborhood.slug}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-green-500/50"
                >
                  <h3 className="font-medium text-white">{s.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{s.priceRange}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
