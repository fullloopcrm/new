import { safeJsonLd } from '@/lib/escape-html'
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
} from "@/app/site/fla-dumpster-rentals/_lib/data";
import {
  getServiceHubMeta,
  getServiceSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  getOrganizationSchema,
  PHONE,
  SITE_URL,
} from "@/app/site/fla-dumpster-rentals/_lib/seo";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";

interface PageProps {
  params: Promise<{ service: string }>;
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

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

  /* JSON-LD Schemas */
  const organizationSchema = getOrganizationSchema();
  const serviceSchema = getServiceSchema(service);
  const faqSchema = getFAQPageSchema(service.faqs);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Services", url: "/services" },
    { name: service.name, url: `/${service.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(serviceSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(faqSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(breadcrumbSchema),
        }}
      />

      <div className="text-white">
        {/* Hero */}
        <section className="bg-stone-950 pb-20 pt-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Breadcrumbs
              items={[
                { name: "Services", url: "/services" },
                { name: service.name, url: `/${service.slug}` },
              ]}
            />

            <div className="mt-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                Dumpster Rental Service
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                {service.name}
                <br />
                <span className="text-orange-500">Across Florida</span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300">
                {service.description} 10, 20 &amp; 30 yard roll-off dumpsters
                available for same-day or next-day delivery anywhere in Florida.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href={`sms:${phonePlain}`}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  Text Us for a Quote
                </a>
                <a
                  href={`tel:${phonePlain}`}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
                >
                  Call {PHONE}
                </a>
                <Link
                  href="/schedule-dumpster-rental-form"
                  className="inline-flex items-center justify-center rounded-lg border border-stone-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
                >
                  Book Online
                </Link>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">3</p>
                <p className="mt-1 text-xs text-stone-500">Dumpster Sizes</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {totalNeighborhoods}+
                </p>
                <p className="mt-1 text-xs text-stone-500">Areas Served</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">Same Day</p>
                <p className="mt-1 text-xs text-stone-500">Delivery Available</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">
                  {service.priceRange}
                </p>
                <p className="mt-1 text-xs text-stone-500">Price Range</p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Details */}
        <section className="bg-stone-900 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-white">
                  About {service.name}
                </h2>
                <p className="mt-4 leading-7 text-stone-400">
                  {service.extendedDescription}
                </p>

                {service.recommendedSize && (
                  <div className="mt-6 rounded-lg border border-orange-600/30 bg-orange-600/5 p-4">
                    <p className="text-sm text-stone-300">
                      <span className="font-semibold text-orange-400">
                        Recommended Dumpster Size:
                      </span>{" "}
                      {service.recommendedSize}
                    </p>
                  </div>
                )}

                <h3 className="mt-8 text-lg font-semibold text-white">
                  Common Uses
                </h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {service.commonServices.map((cs) => (
                    <div key={cs} className="flex items-center gap-3">
                      <svg
                        className="h-4 w-4 shrink-0 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span className="text-sm text-stone-300">{cs}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <aside>
                <div className="sticky top-8 space-y-6">
                  <div className="rounded-xl border border-stone-700 bg-stone-800 p-6">
                    <h3 className="text-lg font-semibold text-white">
                      Get a Free Quote
                    </h3>
                    <p className="mb-4 mt-2 text-sm text-stone-400">
                      Tell us about your {nameLower} project and we will
                      recommend the right dumpster size.
                    </p>
                    <a
                      href={`sms:${phonePlain}`}
                      className="block w-full rounded-lg bg-orange-600 py-3 text-center text-sm font-semibold text-white hover:bg-orange-700"
                    >
                      Text Us for a Quote
                    </a>
                    <a
                      href={`tel:${phonePlain}`}
                      className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-white hover:border-stone-400"
                    >
                      Call {PHONE}
                    </a>
                    <Link
                      href="/schedule-dumpster-rental-form"
                      className="mt-3 block w-full rounded-lg border border-stone-600 py-3 text-center text-sm font-semibold text-orange-400 hover:border-orange-500 hover:text-white"
                    >
                      Book Online
                    </Link>
                  </div>

                  <div className="rounded-xl border border-stone-700 bg-stone-800 p-6">
                    <h3 className="text-lg font-semibold text-white">
                      Quick Pricing
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-400">10 Yard</span>
                        <span className="text-sm font-semibold text-white">
                          From $275
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-400">20 Yard</span>
                        <span className="text-sm font-semibold text-white">
                          From $350
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-400">30 Yard</span>
                        <span className="text-sm font-semibold text-white">
                          From $450
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/pricing"
                      className="mt-4 block text-center text-sm text-orange-500 hover:text-white"
                    >
                      View full pricing &rarr;
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* Locations Grid */}
        <section className="bg-stone-950 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {service.name} in{" "}
              <span className="text-orange-500">Every Florida Region</span>
            </h2>
            <p className="mt-2 text-stone-500">
              Click any area to see {nameLower} dumpster rental details and
              pricing for that location.
            </p>

            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region];
              if (!neighborhoods || neighborhoods.length === 0) return null;
              return (
                <div key={region} className="mt-8">
                  <h3 className="text-lg font-semibold text-white">{region}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {neighborhoods.map((n) => (
                      <Link
                        key={n.slug}
                        href={`/${service.slug}/${n.slug}`}
                        className="rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-300 hover:border-orange-600/50 hover:text-white"
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

        {/* Mid CTA */}
        <CTAGroup variant="mid" />

        {/* FAQ */}
        <section className="bg-orange-600 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {service.name} FAQs
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {service.faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm"
                >
                  <h3 className="font-semibold text-white">{faq.q}</h3>
                  <p className="mt-3 text-sm leading-6 text-orange-100">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <section className="bg-stone-950 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-white">
                Related {service.category} Services
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {relatedServices.map((rs) => (
                  <Link
                    key={rs.slug}
                    href={`/${rs.slug}`}
                    className="rounded-lg border border-stone-800 bg-stone-900/50 p-4 hover:border-orange-600/50"
                  >
                    <h3 className="font-medium text-white">{rs.name}</h3>
                    <p className="mt-1 text-xs text-stone-500">{rs.category}</p>
                  </Link>
                ))}
              </div>

              {crossCategoryServices.length > 0 && (
                <>
                  <h3 className="mt-10 text-xl font-semibold text-white">
                    Other Dumpster Services
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                    {crossCategoryServices.map((cs) => (
                      <Link
                        key={cs.slug}
                        href={`/${cs.slug}`}
                        className="rounded-lg border border-stone-800 bg-stone-900/50 p-4 hover:border-orange-600/50"
                      >
                        <h3 className="font-medium text-white">{cs.name}</h3>
                        <p className="mt-1 text-xs text-stone-500">
                          {cs.category}
                        </p>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* Resource Links */}
        <section className="bg-stone-900 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h3 className="text-lg font-semibold text-white">
              Helpful Links
            </h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-2 text-sm text-orange-500 hover:text-white"
              >
                Pricing Guide
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-2 text-sm text-orange-500 hover:text-white"
              >
                All Services
              </Link>
              <Link
                href="/areas"
                className="rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-2 text-sm text-orange-500 hover:text-white"
              >
                All Areas
              </Link>
              <Link
                href="/blog"
                className="rounded-lg border border-stone-800 bg-stone-900/50 px-4 py-2 text-sm text-orange-500 hover:text-white"
              >
                Blog &amp; Guides
              </Link>
            </div>
          </div>
        </section>

        <ProTip
          tips={[
            {
              title: "Tell Us the Project, Not Just the Size",
              body: `Saying "I need a dumpster for a ${service.name.replace(" Dumpster Rental", "").toLowerCase()} project" tells us way more than "I need a 20-yarder." We'll match the right container to your actual debris — and save you from overpaying or running out of space.`,
            },
            {
              title: "Book Before Demo Day",
              body: "The worst time to order a dumpster is when your crew is standing around waiting for one. Book at least a day ahead — same-day is available but mornings fill up fast, especially in South Florida.",
            },
            {
              title: "Cover It If Rain Is Coming",
              body: "Florida afternoon thunderstorms can add hundreds of pounds of water weight to an open dumpster. A cheap tarp from Home Depot can save you from overage charges. Trust us — we see this every summer.",
            },
          ]}
        />

        {/* Final CTA */}
        <CTAGroup variant="final" />
      </div>
    </>
  );
}
