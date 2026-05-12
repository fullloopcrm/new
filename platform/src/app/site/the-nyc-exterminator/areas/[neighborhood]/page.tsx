// @ts-nocheck
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllNeighborhoods,
  getAllServices,
  getNeighborhoodBySlug,
  getServicesByCategory,
  getNearbyNeighborhoods,
  getOtherRegionNeighborhoods,
  getCategories,
} from "@/app/site/the-nyc-exterminator/_lib/data";
import {
  getNeighborhoodHubMeta,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
  SITE_URL,
  SITE_NAME,
} from "@/app/site/the-nyc-exterminator/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-exterminator/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";
import { getJobDates } from "@/app/site/the-nyc-exterminator/_lib/jobDates";

// Regenerate every 7 days so JobPosting `datePosted` stays fresh for Google.
export const revalidate = 604800;

interface PageProps {
  params: Promise<{ neighborhood: string }>;
}

export const dynamicParams = true

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { neighborhood: slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);
  if (!neighborhood) return {};

  const meta = getNeighborhoodHubMeta(neighborhood);
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonical,
    },
  };
}

export default async function NeighborhoodHubPage({ params }: PageProps) {
  const { neighborhood: slug } = await params;
  const neighborhood = getNeighborhoodBySlug(slug);
  if (!neighborhood) notFound();

  const allServices = getAllServices();
  const servicesByCategory = getServicesByCategory();
  const categories = getCategories();
  const nearbyNeighborhoods = getNearbyNeighborhoods(neighborhood, 12);
  const otherRegionNeighborhoods = getOtherRegionNeighborhoods(neighborhood, 7);
  const totalServices = allServices.length;

  const location =
    neighborhood.name === neighborhood.region
      ? neighborhood.name
      : `${neighborhood.name}, ${neighborhood.region}`;

  const faqItems = [
    {
      q: `What pest control services are available in ${neighborhood.name}?`,
      a: `We offer ${totalServices}+ pest control services in ${neighborhood.name} including cockroach extermination, bed bug treatment, rat and mouse control, termite treatment, wildlife removal, and more. All services include free inspection and upfront pricing.`,
    },
    {
      q: `How much does pest control cost in ${neighborhood.name}?`,
      a: `Pest control costs in ${neighborhood.name} vary by service. General pest control starts at $125-$300. Bed bug treatment runs $300-$1,500. Rodent control starts at $200-$600. We provide free inspections and upfront quotes.`,
    },
    {
      q: `Do you offer same-day pest control in ${neighborhood.name}?`,
      a: `Yes. We offer same-day and emergency pest control service in ${neighborhood.name} and throughout ${neighborhood.region}. Call us for urgent situations.`,
    },
    {
      q: `Are your ${neighborhood.name} exterminators licensed?`,
      a: `Yes. All our technicians serving ${neighborhood.name} hold NYS DEC Commercial Pesticide Applicator licenses and are fully insured. Wildlife operators hold additional DEC licenses.`,
    },
  ];

  const faqSchema = getFAQPageSchema(faqItems);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Service Areas", url: "/areas" },
    { name: neighborhood.name, url: `/areas/${neighborhood.slug}` },
  ]);
  // LocalBusiness schema emitted globally in layout.tsx — removed page-level
  // duplicate to avoid Google's duplicate-type warnings.

  const { datePosted, validThrough } = getJobDates();
  const jobPostingSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: `Pest Control Technician — ${neighborhood.name}`,
    description: `Licensed pest control technician and exterminator position serving ${location}. Full-time, competitive pay, benefits included. Join ${SITE_NAME}.`,
    datePosted,
    validThrough,
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: neighborhood.name,
        addressRegion: neighborhood.region === "New Jersey" ? "NJ" : "NY",
        addressCountry: "US",
      },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: 45000,
        maxValue: 85000,
        unitText: "YEAR",
      },
    },
  };

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }} />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Service Areas", url: "/areas" },
              { name: neighborhood.name, url: `/areas/${neighborhood.slug}` },
            ]}
          />

          <div className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
              {neighborhood.region} &middot; {totalServices} Services Available
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Pest Control in{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                {neighborhood.name}
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Professional pest control and extermination in {location}.
              {totalServices}+ services including cockroaches, bed bugs, rats, mice,
              termites, wildlife, and more. Licensed, insured, same-day service available.
            </p>

            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* ── SERVICES BY CATEGORY ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            All Pest Control Services in {neighborhood.name}
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Browse every professional exterminator service available in {neighborhood.name},{" "}
            {neighborhood.region}. Each service includes a free on-site inspection, upfront
            pricing, and treatment by a licensed NYC pest control technician.
          </p>

          <div className="mt-10 space-y-10">
            {categories.map((category) => {
              const services = servicesByCategory[category] || [];
              if (services.length === 0) return null;
              return (
                <div key={category}>
                  <h3 className="text-xl font-semibold text-white">{category}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {services.map((service) => (
                      <Link
                        key={service.slug}
                        href={`/${service.slug}/${neighborhood.slug}`}
                        className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 transition-colors hover:border-green-500/50"
                      >
                        <h4 className="font-medium text-white">{service.name}</h4>
                        <p className="mt-1 text-xs text-zinc-500">{service.priceRange}</p>
                        {service.emergencyAvailable && (
                          <span className="mt-2 inline-block rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                            Emergency
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MID CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pest Control in {neighborhood.name} — Frequently Asked Questions
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Common questions about hiring a licensed exterminator in {neighborhood.name},{" "}
            {neighborhood.region}, including service availability, pricing, and what to expect
            from your pest control appointment.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
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
              Pest Control Near {neighborhood.name}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Our licensed exterminators also serve these neighborhoods near {neighborhood.name}.
              Same-day pest control appointments available throughout {neighborhood.region}.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {nearbyNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/areas/${n.slug}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-green-500 hover:text-white"
                >
                  {n.name}
                </Link>
              ))}
            </div>

            {otherRegionNeighborhoods.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-semibold">Other Regions</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {otherRegionNeighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/areas/${n.slug}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-green-500 hover:text-white"
                    >
                      {n.name}
                      <span className="ml-1 text-xs text-zinc-600">({n.region})</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
