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
  categoryToSlug,
} from "@/app/site/the-nyc-seo/_lib/data";
import {
  getNeighborhoodHubMeta,
  getOrganizationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
  SITE_URL,
  SITE_NAME,
} from "@/app/site/the-nyc-seo/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

interface PageProps {
  params: Promise<{ neighborhood: string }>;
}

export const dynamicParams = false;

export const revalidate = 86400

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
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalPages = totalServices * totalNeighborhoods;

  const location =
    neighborhood.name === neighborhood.region
      ? neighborhood.name
      : `${neighborhood.name}, ${neighborhood.region}`;

  /* ── Why businesses need SEO — region-specific ── */
  const whyReasons = [
    {
      title: "Google \"Near Me\" Dominance",
      text: `When someone in ${neighborhood.name} searches for a service provider, Google serves results based on proximity, relevance, and prominence. Without local SEO, your business is invisible to these high-intent searchers.`,
    },
    {
      title: "AI Search Is Replacing Directories",
      text: `ChatGPT, Perplexity, and Gemini now recommend local businesses directly. If your ${neighborhood.region} business isn't structured for AI search, you're losing referrals to competitors who are.`,
    },
    {
      title: "Google Maps Pack = 42% of Clicks",
      text: `The local 3-pack captures nearly half of all clicks for service searches. Ranking in the Maps pack for "${neighborhood.name}" keywords is the single highest-ROI marketing investment for local businesses.`,
    },
    {
      title: "Your Competitors Already Invest",
      text: `${neighborhood.region} is one of the most competitive local SEO markets in the country. Every month you wait, competitors build more authority, earn more reviews, and claim more of the search landscape.`,
    },
    {
      title: "Review Velocity Compounds",
      text: `Businesses that start SEO earlier accumulate more reviews, build stronger citation profiles, and establish domain authority that becomes increasingly difficult for latecomers to overcome.`,
    },
    {
      title: `${totalServices} Service Types, One Strategy`,
      text: `Whether you're a plumber, lawyer, dentist, or med spa in ${neighborhood.name} — the local SEO playbook is proven. We've ranked every type of service business across ${totalNeighborhoods}+ neighborhoods.`,
    },
  ];

  /* ── 8-step process ── */
  const processSteps = [
    { step: "Industry & Competitor Audit", detail: `We analyze every competitor ranking for your service type in ${neighborhood.name} and identify the gaps, weaknesses, and opportunities they're missing.` },
    { step: "Keyword & Intent Mapping", detail: `Map every search query your potential customers use — from "[service] in ${neighborhood.name}" to long-tail questions — and build a content strategy around them.` },
    { step: "Technical SEO Foundation", detail: "Core Web Vitals optimization, schema markup, crawlability, site architecture, and indexation management. Your site needs to be fast, structured, and crawlable." },
    { step: "Google Business Profile", detail: `Full GBP optimization with ${neighborhood.name}-specific content, category selection, service descriptions, photo strategy, and review generation workflow.` },
    { step: "On-Page Optimization", detail: "Title tags, meta descriptions, header hierarchy, internal linking, content optimization, and entity relationships for every page on your site." },
    { step: "Programmatic Location Pages", detail: `We build dedicated optimized pages for your service in every neighborhood you serve — not just ${neighborhood.name}, but all ${totalNeighborhoods}+ areas in our coverage.` },
    { step: "AI Search Optimization", detail: "Structure your content with entity relationships, authority signals, and citation patterns that ChatGPT, Perplexity, Gemini, and Claude use when recommending businesses." },
    { step: "Link Building & Authority", detail: `Ongoing editorial backlinks, local citations, ${neighborhood.region} directory listings, and content marketing to build domain authority month over month.` },
  ];

  /* ── FAQ ── */
  const faqItems = [
    {
      q: `How much does SEO cost for a business in ${neighborhood.name}?`,
      a: `Monthly SEO retainers for ${neighborhood.region} businesses start at $3,500/month for a full-service campaign. Project-based work starts at $2,500. The exact cost depends on your industry, competitive landscape, and how many neighborhoods you want to target. We provide a custom quote after auditing your current position.`,
    },
    {
      q: `How long does it take to rank in ${neighborhood.name}?`,
      a: `Most businesses see measurable improvements in 60-90 days, with significant ranking gains in 4-6 months. Google Business Profile optimizations can impact Maps ranking within weeks. Highly competitive industries may take 6-12 months for top positions.`,
    },
    {
      q: `Do you only do SEO for businesses in ${neighborhood.name}?`,
      a: `No. We build SEO platforms across ${totalNeighborhoods}+ neighborhoods in NYC, New Jersey, Long Island, and Westchester. If your business serves multiple areas, we create dedicated optimized pages for each neighborhood.`,
    },
    {
      q: "What types of businesses do you work with?",
      a: `We build SEO platforms for ${totalServices} service business types — plumbers, electricians, lawyers, dentists, med spas, contractors, accountants, and more across 15 industries.`,
    },
    {
      q: "Can you help my business show up on ChatGPT and Perplexity?",
      a: `Yes. AI search optimization is one of our core services. We structure your content so that when someone asks ChatGPT "best [service] in ${neighborhood.name}," your business is recommended.`,
    },
    {
      q: `What makes your SEO different from other agencies in ${neighborhood.region}?`,
      a: `Three things: We build on Next.js (not WordPress) for 95+ Core Web Vitals scores. We use programmatic SEO to generate hundreds of location pages. And we optimize for AI search platforms — something 95% of agencies still ignore.`,
    },
    {
      q: "Do you offer Google Business Profile management?",
      a: `Yes. Full GBP optimization is included in every campaign — category selection, service descriptions, photos, posts, Q&A management, and a review generation strategy tailored to ${neighborhood.name} customers.`,
    },
    {
      q: `What results can I expect for my ${neighborhood.name} business?`,
      a: "Typical outcomes: 3-5x increase in organic traffic within 6 months, top-3 Maps ranking for primary keywords, 40-60% increase in phone calls from organic search, and measurable AI search presence on ChatGPT and Perplexity.",
    },
  ];

  /* ── JSON-LD ── */
  const organizationSchema = getOrganizationSchema();

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${neighborhood.name}`,
    description: `SEO and AI search optimization agency serving businesses in ${location}. Local SEO, Google Maps, programmatic SEO, and AI search optimization for ${totalServices} service types.`,
    url: `${SITE_URL}/areas/${neighborhood.slug}`,
    telephone: PHONE,
    areaServed: {
      "@type": "Place",
      name: location,
    },
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Service Areas", url: "/areas" },
    { name: neighborhood.region, url: `/areas#${neighborhood.region.toLowerCase().replace(/\s+/g, "-")}` },
    { name: neighborhood.name, url: `/areas/${neighborhood.slug}` },
  ]);

  const faqSchema = getFAQPageSchema(faqItems);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Service Areas", url: "/areas" },
              { name: neighborhood.region, url: `/areas#${neighborhood.region.toLowerCase().replace(/\s+/g, "-")}` },
              { name: neighborhood.name, url: `/areas/${neighborhood.slug}` },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {totalServices} Services &middot; {neighborhood.region} &middot; Local SEO &amp; AI Search
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO Services in{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  {neighborhood.name}
                </span>
                {neighborhood.name !== neighborhood.region && (
                  <span className="block text-2xl font-bold text-zinc-400 sm:text-3xl">{neighborhood.region}</span>
                )}
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                platforms for every type of service business in {neighborhood.name}.{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Local SEO</Link>,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>, and{" "}
                programmatic pages for all {totalServices} service types.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{totalServices}</div>
                <div className="mt-1 text-xs text-zinc-400">Service Types</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{nearbyNeighborhoods.length}</div>
                <div className="mt-1 text-xs text-zinc-400">Nearby Areas</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{totalPages.toLocaleString()}+</div>
                <div className="mt-1 text-xs text-zinc-400">Total Pages Built</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">15</div>
                <div className="mt-1 text-xs text-zinc-400">Industries</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — ALL SERVICES GRID BY CATEGORY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Every Service We Rank in{" "}
            <span className="text-[#0080FE]">{neighborhood.name}</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            {totalServices} service types across {categories.length} industries. Each links to a dedicated
            optimized page for {neighborhood.name} with schema markup, content, and internal linking.
          </p>

          {categories.map((category) => {
            const services = servicesByCategory[category] || [];
            if (services.length === 0) return null;
            return (
              <div key={category} className="mt-10" id={categoryToSlug(category)}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold text-white">
                    <Link
                      href={`/businesses/${categoryToSlug(category)}`}
                      className="hover:text-[#0080FE]"
                    >
                      {category}
                    </Link>
                  </h3>
                  <span className="text-sm text-zinc-500">{services.length} services</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/${service.slug}/${neighborhood.slug}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                    >
                      {service.name}
                      <span className="ml-1 text-xs text-zinc-600">in {neighborhood.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHY BUSINESSES NEED SEO
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why {neighborhood.name} Businesses Need SEO
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            {neighborhood.region} is one of the most competitive local search markets in the country.
            Here&apos;s why investing in SEO is non-negotiable for businesses in {neighborhood.name}.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whyReasons.map((reason, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080FE]/10 text-sm font-bold text-[#0080FE]">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold text-white">{reason.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{reason.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 5 — HOW WE RANK BUSINESSES
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank Businesses in{" "}
            <span className="text-[#0080FE]">{neighborhood.name}</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Our 8-step process for building SEO platforms that dominate local search and AI recommendations.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {processSteps.map((item, i) => (
              <div key={i} className="flex gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0080FE] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.step}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — NEARBY NEIGHBORHOODS
          ============================================================ */}
      {nearbyNeighborhoods.length > 0 && (
        <section className="bg-[#0A0A0A] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Nearby {neighborhood.region} Neighborhoods
            </h2>
            <p className="mt-3 text-zinc-400">
              We also build SEO platforms for businesses in these nearby areas.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {nearbyNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/areas/${n.slug}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                >
                  {n.name}
                  <span className="ml-1 text-xs text-zinc-600">({n.type})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 7 — PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 8 — FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            SEO FAQs for {neighborhood.name} Businesses
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
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

      {/* ============================================================
          SECTION 9 — OTHER REGIONS
          ============================================================ */}
      {otherRegionNeighborhoods.length > 0 && (
        <section className="bg-[#0A0A0A] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold">SEO Services in Other Regions</h2>
            <p className="mt-2 text-zinc-500">
              We cover {totalNeighborhoods}+ neighborhoods across 8 regions in the NYC metro area.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {otherRegionNeighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  href={`/areas/${n.slug}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                >
                  {n.name}
                  <span className="ml-1 text-xs text-zinc-600">{n.region}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/areas"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
              >
                All {totalNeighborhoods} Neighborhoods
              </Link>
              <Link
                href="/industries"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
              >
                SEO by Industry
              </Link>
              <Link
                href="/businesses"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
              >
                All {totalServices} Business Types
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
              >
                Our Services
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white"
              >
                Pricing
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 10 — FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
