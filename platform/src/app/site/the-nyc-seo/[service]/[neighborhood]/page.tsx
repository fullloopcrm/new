import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getServiceBySlug,
  getNeighborhoodBySlug,
  getNeighborhoodsByRegion,
  getRelatedServices,
  getCrossCategoryServices,
  getNearbyNeighborhoods,
  getOtherRegionNeighborhoods,
  getRegions,
} from "@/app/site/the-nyc-seo/_lib/data";
import {
  getMoneyPageMeta,
  getLocalBusinessSchema,
  getFAQPageSchema,
  PHONE,
} from "@/app/site/the-nyc-seo/_lib/seo";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import ContactForm from "@/app/site/the-nyc-seo/_components/ContactForm";

interface PageProps {
  params: Promise<{ service: string; neighborhood: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

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

  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const nearbyNeighborhoods = getNearbyNeighborhoods(neighborhood, 8);
  const otherRegionNeighborhoods = getOtherRegionNeighborhoods(neighborhood, 4);
  const relatedServices = getRelatedServices(service, 6);
  const crossCategoryServices = getCrossCategoryServices(service, 4);
  const catContent = categoryContent[service.category];
  const regionNote = catContent?.regionNotes?.[neighborhood.region] || "";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getLocalBusinessSchema(service, neighborhood)
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQPageSchema(service.faqs)),
        }}
      />

      {/* Hero */}
      <section className="bg-[#0A0A0A] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: service.name, url: `/${service.slug}` },
              {
                name: neighborhood.name,
                url: `/${service.slug}/${neighborhood.slug}`,
              },
            ]}
            dark
          />

          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              SEO for {service.name} Businesses in {neighborhood.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-zinc-400">
              Local SEO and AI search optimization to help your{" "}
              {service.name.toLowerCase()} business rank on Google Maps, organic
              search, and AI platforms in {neighborhood.name},{" "}
              {neighborhood.region}.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-[#0080FE]">318</p>
              <p className="mt-1 text-xs text-zinc-500">Neighborhoods Served</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-[#0080FE]">172</p>
              <p className="mt-1 text-xs text-zinc-500">Service Categories</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-[#0080FE]">8</p>
              <p className="mt-1 text-xs text-zinc-500">Regions Covered</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-[#0080FE]">
                {service.commonServices.length}+
              </p>
              <p className="mt-1 text-xs text-zinc-500">Services We Optimize</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center justify-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0070E0]"
            >
              Get a Free SEO Audit
            </Link>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-zinc-900"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* Market Overview — 2-col with sidebar */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white">
                {neighborhood.name} {service.name} Market
              </h2>

              {catContent && (
                <p className="mt-4 leading-7 text-zinc-400">
                  {catContent.investmentContext}
                </p>
              )}

              <p className="mt-4 leading-7 text-zinc-400">
                {service.extendedDescription}
              </p>

              {regionNote && (
                <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                  <p className="text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      {neighborhood.region} SEO Opportunity:
                    </span>{" "}
                    {regionNote}
                  </p>
                </div>
              )}

              <h3 className="mt-8 text-lg font-semibold text-white">
                Services We Optimize For
              </h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {service.commonServices.map((cs) => (
                  <div key={cs} className="flex items-center gap-3">
                    <svg
                      className="h-4 w-4 shrink-0 text-[#0080FE]"
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
                    <span className="text-sm text-zinc-300">{cs}</span>
                  </div>
                ))}
              </div>

              {service.licensingNote && (
                <p className="mt-6 text-sm text-zinc-500">
                  <span className="font-medium text-zinc-400">
                    Industry Licensing:
                  </span>{" "}
                  {service.licensingNote}
                </p>
              )}
            </div>

            {/* Sidebar */}
            <aside>
              <div className="sticky top-8 space-y-6">
                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-white">
                    Get a Free SEO Audit
                  </h3>
                  <p className="mb-4 mt-2 text-sm text-zinc-400">
                    See how your {service.name.toLowerCase()} business ranks in{" "}
                    {neighborhood.name} and what it takes to dominate.
                  </p>
                  <ContactForm
                    service={service.name}
                    neighborhood={neighborhood.name}
                    compact
                    dark
                  />
                  <div className="mt-4 text-center">
                    <span className="text-xs text-zinc-500">or call </span>
                    <a
                      href={`tel:${PHONE.replace(/-/g, "")}`}
                      className="text-xs font-semibold text-[#0080FE] hover:text-white"
                    >
                      {PHONE}
                    </a>
                  </div>
                </div>

                {nearbyNeighborhoods.length > 0 && (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">
                    <h3 className="text-lg font-semibold text-white">
                      {service.name} SEO Nearby
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {nearbyNeighborhoods.map((n) => (
                        <li key={n.slug}>
                          <Link
                            href={`/${service.slug}/${n.slug}`}
                            className="text-sm text-[#0080FE] hover:text-white"
                          >
                            {service.name} SEO in {n.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-white">
                    Market Intelligence
                  </h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Avg Rating</span>
                      <span className="text-sm font-semibold text-white">
                        {service.avgRating}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">
                        Review Volume
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {service.reviewCount}+
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Price Range</span>
                      <span className="text-sm font-semibold text-white">
                        {service.priceRange}
                      </span>
                    </div>
                    {service.emergencyAvailable && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">
                          Emergency Services
                        </span>
                        <span className="text-sm font-semibold text-green-400">
                          Available
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    Industry data we use to shape your SEO strategy
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Why SEO Matters */}
      {catContent && (
        <section className="bg-[#0A0A0A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Why {service.name} Businesses in {neighborhood.name} Need SEO
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catContent.whySEOMatters.map((reason, i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080FE]/10 text-sm font-bold text-[#0080FE]">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-6 text-zinc-300">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How We Rank + SEO Checklist + Competitor Signs */}
      {catContent && (
        <section className="bg-[#2A2A2A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              How We Rank {service.name} Businesses in {neighborhood.name}
            </h2>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Our SEO Process
                </h3>
                <div className="mt-4 space-y-5">
                  {catContent.seoProcess.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-white">{item.step}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    SEO Checklist for {service.name} Businesses
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {service.seoChecklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg
                          className="mt-0.5 h-5 w-5 shrink-0 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm text-zinc-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Signs Competitors Are Outranking You
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {service.competitorSigns.map((sign, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg
                          className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                        <span className="text-sm text-zinc-300">{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SEO Investment */}
      {catContent && (
        <section className="bg-[#0A0A0A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              SEO Investment for {service.name} Businesses
            </h2>

            <div className="mt-6 grid gap-8 lg:grid-cols-2">
              <div>
                <p className="leading-7 text-zinc-400">
                  {catContent.investmentContext}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <p className="text-sm font-medium text-zinc-400">
                      Monthly Retainer
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#0080FE]">
                      From $3,500<span className="text-sm font-normal text-zinc-500">/mo</span>
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Full-service SEO: strategy, content, local SEO, GBP, link
                      building, and AI search optimization.
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                    <p className="text-sm font-medium text-zinc-400">
                      Project-Based
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[#0080FE]">
                      From $2,500
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      SEO audits, GBP optimization, website builds, or citation
                      building as standalone projects.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white">
                  What Affects Your SEO Investment
                </h3>
                <ul className="mt-4 space-y-3">
                  {catContent.investmentFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#0080FE]/10 text-xs font-bold text-[#0080FE]">
                        $
                      </span>
                      <span className="text-sm text-zinc-300">{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SEO Mistakes */}
      {catContent && catContent.seoMistakes.length > 0 && (
        <section className="bg-[#2A2A2A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              SEO Mistakes {service.name} Businesses Make
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {catContent.seoMistakes.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-5"
                >
                  <h3 className="font-medium text-white">{item.mistake}</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    {item.consequence}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Signs You Need SEO */}
      {catContent && (
        <section className="bg-[#0A0A0A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Signs Your {service.name} Business Needs SEO
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catContent.signsYouNeedSEO.map((sign, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
                >
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#0080FE]"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  <span className="text-sm text-zinc-300">{sign}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-[#0080FE] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {service.name} SEO FAQs
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-blue-100">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Services in Neighborhood */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {relatedServices.length > 0 && (
            <>
              <h2 className="text-2xl font-bold text-white">
                Related {service.category} SEO in {neighborhood.name}
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {relatedServices.map((rs) => (
                  <Link
                    key={rs.slug}
                    href={`/${rs.slug}/${neighborhood.slug}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-[#0080FE]/50 hover:shadow-md hover:shadow-[#0080FE]/5"
                  >
                    <h3 className="font-medium text-white">{rs.name} SEO</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      in {neighborhood.name}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {crossCategoryServices.length > 0 && (
            <>
              <h3 className="mt-10 text-xl font-semibold text-white">
                Other Services in {neighborhood.name}
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {crossCategoryServices.map((cs) => (
                  <Link
                    key={cs.slug}
                    href={`/${cs.slug}/${neighborhood.slug}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-[#0080FE]/50 hover:shadow-md hover:shadow-[#0080FE]/5"
                  >
                    <h3 className="font-medium text-white">{cs.name} SEO</h3>
                    <p className="mt-1 text-xs text-zinc-500">{cs.category}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Same Service in Other Neighborhoods */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white">
            {service.name} SEO in Other Neighborhoods
          </h2>
          <p className="mt-2 text-zinc-500">
            We optimize {service.name.toLowerCase()} businesses across the NYC
            metro area.
          </p>

          {regions.map((region) => {
            const neighborhoods = neighborhoodsByRegion[region];
            if (!neighborhoods || neighborhoods.length === 0) return null;
            const filtered = neighborhoods.filter(
              (n) => n.slug !== neighborhood.slug
            );
            if (filtered.length === 0) return null;
            return (
              <div key={region} className="mt-8">
                <h3 className="text-lg font-semibold text-white">
                  {service.name} SEO in {region}
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {filtered.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/${service.slug}/${n.slug}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-300 hover:border-[#0080FE]/50 hover:text-white"
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

      {/* Blog/Resource Links + Footer Links */}
      <section className="bg-[#0A0A0A] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h3 className="text-lg font-semibold text-white">
            Resources & Guides
          </h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/blog"
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
            >
              SEO & AI Search Guides
            </Link>
            <Link
              href="/services"
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
            >
              All Services
            </Link>
            <Link
              href="/areas"
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
            >
              All Areas
            </Link>
            <Link
              href="/businesses"
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
            >
              Featured Businesses
            </Link>
            <Link
              href={`/${service.slug}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
            >
              All {service.name} Areas
            </Link>
          </div>

          {catContent && catContent.stats.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-8 sm:grid-cols-4">
              {catContent.stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-xl font-bold text-[#0080FE]">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <CTAGroup variant="final" />
    </>
  );
}
