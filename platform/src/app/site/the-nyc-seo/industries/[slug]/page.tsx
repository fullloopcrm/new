import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getRegions,
  getNeighborhoodsByRegion,
  getRelatedServices,
  getCrossCategoryServices,
} from "@/app/site/the-nyc-seo/_lib/data";
import {
  getIndustryHubMeta,
  serviceToIndustrySlug,
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
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

export const revalidate = 2592000

export async function generateStaticParams() { return [] }

function getServiceFromIndustrySlug(slug: string) {
  return getAllServices().find((s) => serviceToIndustrySlug(s) === slug);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceFromIndustrySlug(slug);
  if (!service) return {};

  const meta = getIndustryHubMeta(service);
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

export default async function IndustryHubPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getServiceFromIndustrySlug(slug);
  if (!service) notFound();

  const regions = getRegions();
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalServices = getAllServices().length;
  const relatedServices = getRelatedServices(service, 8);
  const crossCategoryServices = getCrossCategoryServices(service, 6);

  /* ── Why this industry needs SEO ── */
  const whyReasons = [
    {
      title: `"${service.name} Near Me" Is a Gold Mine`,
      text: `Every day, thousands of people across the NYC metro search for "${service.name.toLowerCase()} near me." Without local SEO, your ${service.name.toLowerCase()} business doesn't exist to these high-intent customers ready to buy.`,
    },
    {
      title: "Google Maps Drives Phone Calls",
      text: `The local 3-pack captures 42% of clicks for service searches. Ranking in the Maps pack for ${service.name.toLowerCase()} keywords across multiple neighborhoods means more calls, more leads, more revenue.`,
    },
    {
      title: "AI Search Is the New Referral",
      text: `When someone asks ChatGPT "best ${service.name.toLowerCase()} in Brooklyn" or "recommend a ${service.name.toLowerCase()} near me," AI pulls from structured web data. If your business isn't optimized for AI search, competitors get recommended instead.`,
    },
    {
      title: "Your Competitors Are Investing",
      text: `The ${service.category.toLowerCase()} industry in NYC is fiercely competitive. Every month you delay SEO, competitors build more authority, earn more reviews, and lock in positions that become harder to overtake.`,
    },
    {
      title: "Reviews Compound Over Time",
      text: "Businesses that start SEO earlier accumulate more reviews, build stronger citation profiles, and establish domain authority. The gap between early movers and latecomers widens every month.",
    },
    {
      title: `${totalNeighborhoods} Neighborhoods = ${totalNeighborhoods} Opportunities`,
      text: `We build a dedicated optimized page for your ${service.name.toLowerCase()} business in every neighborhood you serve. Each page targets a specific search — "${service.name.toLowerCase()} in Park Slope," "${service.name.toLowerCase()} in Hoboken" — with unique content and schema.`,
    },
  ];

  /* ── Process steps ── */
  const processSteps = [
    { step: `${service.name} Industry Audit`, detail: `We analyze every ${service.name.toLowerCase()} competitor in your target areas — their rankings, reviews, backlinks, and content — to identify where you can win.` },
    { step: "Keyword & Intent Strategy", detail: `Map every search query potential customers use to find ${service.name.toLowerCase()} services — from broad terms to long-tail neighborhood-specific searches.` },
    { step: "Website Build or Optimization", detail: `We build (or rebuild) your site on Next.js with ${service.name.toLowerCase()}-specific content architecture, mobile-first design, and sub-second load times.` },
    { step: "Google Business Profile", detail: `Full GBP optimization with ${service.name.toLowerCase()}-specific categories, service descriptions, photos, posts, and a review generation strategy.` },
    { step: "Programmatic Location Pages", detail: `Dedicated optimized pages for "${service.name} in [Neighborhood]" across all ${totalNeighborhoods} areas — each with unique content, schema, and internal linking.` },
    { step: "On-Page & Technical SEO", detail: "Title tags, meta descriptions, schema markup, internal linking, Core Web Vitals, and crawlability optimization across every page." },
    { step: "AI Search Optimization", detail: `Structure your ${service.name.toLowerCase()} content so ChatGPT, Perplexity, Gemini, and Claude recommend your business when people ask for ${service.name.toLowerCase()} recommendations.` },
    { step: "Link Building & Growth", detail: `Ongoing editorial backlinks, ${service.category.toLowerCase()} directory citations, content marketing, and monthly reporting on rankings, traffic, and leads.` },
  ];

  /* ── FAQ ── */
  const faqItems = [
    {
      q: `How much does SEO cost for a ${service.name.toLowerCase()} business?`,
      a: `Monthly SEO retainers for ${service.name.toLowerCase()} businesses start at $3,500/month. Project-based work starts at $2,500. The exact cost depends on your competitive landscape, number of locations, and target neighborhoods. We provide a custom quote after auditing your current position.`,
    },
    {
      q: `How long does it take for ${service.name.toLowerCase()} SEO to work?`,
      a: `Most ${service.name.toLowerCase()} businesses see measurable improvements in 60-90 days, with significant ranking gains in 4-6 months. GBP optimizations can impact Maps ranking within weeks. Competitive markets may take 6-12 months for top positions.`,
    },
    {
      q: `What neighborhoods can you rank my ${service.name.toLowerCase()} business in?`,
      a: `We cover ${totalNeighborhoods}+ neighborhoods across 8 regions — Manhattan, Brooklyn, Queens, Bronx, Staten Island, New Jersey, Long Island, and Westchester. Each neighborhood gets a dedicated page for your ${service.name.toLowerCase()} business.`,
    },
    {
      q: `Do you work with other ${service.category.toLowerCase()} businesses?`,
      a: `Yes. We build SEO platforms for ${totalServices} service business types across 15 industries. In ${service.category.toLowerCase()} alone, we work with ${relatedServices.length + 1}+ business types. Our system handles multiple clients in the same industry without conflicts.`,
    },
    {
      q: `Can you help my ${service.name.toLowerCase()} business show up on ChatGPT?`,
      a: `Yes. AI search optimization is a core part of every campaign. We structure your content so when someone asks "best ${service.name.toLowerCase()} in [neighborhood]," your business gets recommended — not your competitor.`,
    },
    {
      q: `What makes your ${service.name.toLowerCase()} SEO different?`,
      a: "Three things: We build on Next.js for 95+ Core Web Vitals scores. We use programmatic SEO to build hundreds of location pages. And we optimize for AI search — something 95% of agencies ignore. Plus Full Loop CRM to convert the leads we generate.",
    },
    {
      q: `Do you manage Google Business Profile for ${service.name.toLowerCase()} businesses?`,
      a: `Yes. Full GBP management is included — category optimization, ${service.name.toLowerCase()}-specific service descriptions, photo strategy, review generation, posts, and Q&A management.`,
    },
    {
      q: `What results can I expect for my ${service.name.toLowerCase()} business?`,
      a: `Typical outcomes: 3-5x increase in organic traffic within 6 months, top-3 Maps ranking for primary keywords, 40-60% increase in phone calls, and AI search presence on ChatGPT and Perplexity. We provide monthly reporting tied to real business outcomes.`,
    },
  ];

  /* ── JSON-LD ── */
  const organizationSchema = getOrganizationSchema();

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `SEO for ${service.name} Businesses`,
    description: `SEO and AI search optimization for ${service.name.toLowerCase()} businesses across ${totalNeighborhoods}+ neighborhoods in NYC, New Jersey, Long Island, and Westchester.`,
    url: `${SITE_URL}/industries/${serviceToIndustrySlug(service)}`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    areaServed: regions.map((r) => ({ "@type": "Place", name: r })),
    serviceType: `${service.name} SEO`,
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Industries", url: "/industries" },
    { name: service.name, url: `/industries/${serviceToIndustrySlug(service)}` },
  ]);

  const faqSchema = getFAQPageSchema(faqItems);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Industries", url: "/industries" },
              { name: service.name, url: `/industries/${serviceToIndustrySlug(service)}` },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {service.category} &middot; {totalNeighborhoods} Neighborhoods &middot; SEO &amp; AI Search
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  {service.name}
                </span>{" "}
                Businesses
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search</Link>{" "}
                platforms specifically for {service.name.toLowerCase()} businesses.{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Local SEO</Link>,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>,{" "}
                programmatic location pages across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">{totalNeighborhoods}+ neighborhoods</Link>,{" "}
                and AI search visibility on ChatGPT, Perplexity, and Gemini.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{totalNeighborhoods}+</div>
                <div className="mt-1 text-xs text-zinc-400">Neighborhoods</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">8</div>
                <div className="mt-1 text-xs text-zinc-400">Regions Covered</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{service.commonServices.length}+</div>
                <div className="mt-1 text-xs text-zinc-400">{service.name} Services</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">95+</div>
                <div className="mt-1 text-xs text-zinc-400">Core Web Vitals</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — REGIONS (links to /industries/[slug]/[region])
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} SEO by <span className="text-[#0080FE]">Region</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            We rank {service.name.toLowerCase()} businesses across 8 regions in the NYC metro.
            Each region page shows every neighborhood where we build {service.name.toLowerCase()} SEO platforms.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region] || [];
              const regionSlug = region.toLowerCase().replace(/\s+/g, "-");
              return (
                <Link
                  key={region}
                  href={`/industries/${serviceToIndustrySlug(service)}/${regionSlug}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{region}</h3>
                    <span className="rounded-full bg-[#0080FE]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0080FE]">
                      {neighborhoods.length}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {service.name} SEO across {neighborhoods.length} neighborhoods
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {neighborhoods.slice(0, 3).map((n) => (
                      <span key={n.slug} className="rounded bg-zinc-700/50 px-2 py-0.5 text-[10px] text-zinc-400">
                        {n.name}
                      </span>
                    ))}
                    {neighborhoods.length > 3 && (
                      <span className="rounded bg-zinc-700/50 px-2 py-0.5 text-[10px] text-[#0080FE]">
                        +{neighborhoods.length - 3}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHY THIS INDUSTRY NEEDS SEO
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why {service.name} Businesses Need SEO
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whyReasons.map((reason, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
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
          SECTION 5 — HOW WE RANK [SERVICE] BUSINESSES
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank <span className="text-[#0080FE]">{service.name}</span> Businesses
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Our 8-step process for building {service.name.toLowerCase()} SEO platforms that dominate local search and AI recommendations.
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
          SECTION 6 — SERVICES WE OPTIMIZE FOR
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} Services We Optimize
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            We build optimized pages for each of these {service.name.toLowerCase()} service types across {totalNeighborhoods}+ neighborhoods.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {service.commonServices.map((cs) => (
              <div key={cs} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                <svg className="h-4 w-4 shrink-0 text-[#0080FE]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-sm text-zinc-300">{cs}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7 — RELATED INDUSTRIES
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {relatedServices.length > 0 && (
            <>
              <h2 className="text-2xl font-bold">
                Related {service.category} Industries
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {relatedServices.map((rs) => (
                  <Link
                    key={rs.slug}
                    href={`/industries/${serviceToIndustrySlug(rs)}`}
                    className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                  >
                    {rs.name} SEO
                  </Link>
                ))}
              </div>
            </>
          )}

          {crossCategoryServices.length > 0 && (
            <>
              <h3 className="mt-10 text-xl font-semibold text-white">Other Industries We Rank</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {crossCategoryServices.map((cs) => (
                  <Link
                    key={cs.slug}
                    href={`/industries/${serviceToIndustrySlug(cs)}`}
                    className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                  >
                    {cs.name} SEO
                    <span className="ml-2 text-xs text-zinc-600">{cs.category}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/industries" className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              All {totalServices} Industries
            </Link>
            <Link href="/businesses" className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              Industries by Category
            </Link>
            <Link href="/areas" className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              All {totalNeighborhoods} Neighborhoods
            </Link>
            <Link href="/pricing" className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 9 — FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} SEO — Frequently Asked Questions
          </h2>
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

      {/* ============================================================
          SECTION 10 — FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
