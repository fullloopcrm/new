import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getServiceBySlug,
  getNeighborhoodsByRegion,
  getRelatedServices,
  getCrossCategoryServices,
  getRegions,
} from "@/app/site/nyc-commercial-exterminator/_lib/data";
import {
  getServiceHubMeta,
  getServiceSchema,
  getFAQPageSchema,
  PHONE,
  SITE_URL,
  SITE_NAME,
} from "@/app/site/nyc-commercial-exterminator/_lib/seo";
import Breadcrumbs from "@/app/site/nyc-commercial-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/nyc-commercial-exterminator/_components/CTAGroup";

interface PageProps {
  params: Promise<{ service: string }>;
}

export async function generateStaticParams() {
  return getAllServices().map((s) => ({ service: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  if (!service) return {};

  const meta = getServiceHubMeta(service);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonical,
      type: "website",
    },
  };
}

export default async function ServiceHubPage({ params }: PageProps) {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  if (!service) notFound();

  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const relatedServices = getRelatedServices(service, 8);
  const crossCategoryServices = getCrossCategoryServices(service, 6);

  const totalNeighborhoods = Object.values(neighborhoodsByRegion).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const phonePlain = PHONE.replace(/-/g, "");
  const nameLower = service.name.toLowerCase();

  const serviceSchema = getServiceSchema(service);
  const faqSchema = getFAQPageSchema(service.faqs);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "PestControlService",
    name: SITE_NAME,
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressRegion: "NY",
      addressCountry: "US",
    },
    areaServed: regions.map((r) => ({ "@type": "Place", name: r })),
  };

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Services", url: "/services" },
              { name: service.name, url: `/${service.slug}` },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
                {service.category}
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                {service.name}{" "}
                <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                  NYC
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                {service.extendedDescription}
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
                    Emergency Service Available
                  </span>
                )}
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-300">
                  {totalNeighborhoods}+ Service Areas
                </span>
              </div>

              <CTAGroup variant="hero" />
            </div>

            <div className="rounded-xl border-2 border-green-700/50 bg-gradient-to-br from-green-950/40 to-zinc-900/60 p-8 shadow-2xl shadow-green-900/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-400">
                One Honest Rate. Pay on Completion.
              </p>
              <p className="mt-4 text-5xl font-extrabold text-white">
                $249<span className="text-lg font-medium text-zinc-400">/hr</span>
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Flat. Fully inclusive. Labor, products, treatment, follow-up. No deposit. No contract. No catches.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                <li>&#10003; Same $249/hr for {nameLower}</li>
                <li>&#10003; Free on-site inspection (off the clock)</li>
                <li>&#10003; Bill arrives only after the job is done</li>
                <li>&#10003; Free re-treatment inside the guarantee</li>
              </ul>
              <Link
                href="/schedule-service"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500"
              >
                Schedule {service.name} &rarr;
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
            What&apos;s Included in {service.name}
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Every {nameLower} service from NYC Commercial Exterminator includes a comprehensive treatment
            package performed by a licensed pest control technician. Here is what you get when you
            book {nameLower} with us across NYC, NJ, Long Island, and Westchester.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* ── NEIGHBORHOOD GRID ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} by Neighborhood
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            We provide professional {nameLower} services across {totalNeighborhoods}+ neighborhoods
            in NYC, New Jersey, Long Island, and Westchester County. Each area has unique pest
            pressures and building types that our licensed exterminators understand. Click any
            neighborhood below for location-specific {nameLower} details, pricing, and scheduling.
          </p>

          {regions.map((region) => {
            const neighborhoods = neighborhoodsByRegion[region] || [];
            if (neighborhoods.length === 0) return null;
            return (
              <div key={region} className="mt-10 first:mt-8">
                <h3 className="text-xl font-semibold">{region}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {neighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/${service.slug}/${n.slug}`}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-green-500 hover:text-white"
                    >
                      {n.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} — Frequently Asked Questions
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Common questions our licensed exterminators receive about {nameLower} in New York City,
            including costs, treatment timelines, preparation steps, and what results to expect.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {service.faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RELATED SERVICES ── */}
      {relatedServices.length > 0 && (
        <section className="bg-[#0A0A0A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Related {service.category} Services</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Dealing with other {service.category.toLowerCase()} pests? Our licensed NYC exterminators also
              handle these related pest control services with the same professional treatment and satisfaction guarantee.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedServices.map((s) => (
                <Link
                  key={s.slug}
                  href={`/${s.slug}`}
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

      {crossCategoryServices.length > 0 && (
        <section className="bg-[#2A2A2A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Other Pest Control Services</h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              NYC Commercial Exterminator offers 30+ professional pest control and extermination services beyond
              {" "}{nameLower}. Browse our full range of licensed exterminator services below.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {crossCategoryServices.map((s) => (
                <Link
                  key={s.slug}
                  href={`/${s.slug}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 transition-colors hover:border-green-500/50"
                >
                  <h3 className="font-medium text-white">{s.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{s.category}</p>
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
