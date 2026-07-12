import { safeJsonLd } from '@/lib/escape-html'
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
} from "@/app/site/the-nyc-exterminator/_lib/data";
import {
  getMoneyPageMeta,
  getLocalBusinessSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
} from "@/app/site/the-nyc-exterminator/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";
import ContactForm from "@/app/site/the-nyc-exterminator/_components/ContactForm";

interface PageProps {
  params: Promise<{ service: string; neighborhood: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

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
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Services", url: "/services" },
    { name: service.name, url: `/${service.slug}` },
    { name: neighborhood.name, url: `/${service.slug}/${neighborhood.slug}` },
  ]);

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

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
                  {service.priceRange}
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

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h2 className="text-lg font-semibold text-white">
                Get a Free Quote in {neighborhood.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {nameLower} &middot; {location}
              </p>
              <div className="mt-4">
                <ContactForm
                  service={service.name}
                  neighborhood={neighborhood.name}
                  compact
                  dark
                />
              </div>
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
              Beyond {nameLower}, The NYC Exterminator offers 30+ professional pest control
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
