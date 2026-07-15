import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getRegions,
  getNeighborhoodsByRegion,
  getRelatedServices,
} from "@/app/site/the-nyc-seo/_lib/data";
import {
  getIndustryRegionMeta,
  serviceToIndustrySlug,
  getOrganizationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  SITE_URL,
} from "@/app/site/the-nyc-seo/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

interface PageProps {
  params: Promise<{ slug: string; region: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

function getServiceFromIndustrySlug(slug: string) {
  return getAllServices().find((s) => serviceToIndustrySlug(s) === slug);
}

function getRegionFromSlug(regionSlug: string) {
  return getRegions().find(
    (r) => r.toLowerCase().replace(/\s+/g, "-") === regionSlug
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, region: regionSlug } = await params;
  const service = getServiceFromIndustrySlug(slug);
  const region = getRegionFromSlug(regionSlug);
  if (!service || !region) return {};

  const meta = getIndustryRegionMeta(service, region);
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

export default async function IndustryRegionPage({ params }: PageProps) {
  const { slug, region: regionSlug } = await params;
  const service = getServiceFromIndustrySlug(slug);
  const region = getRegionFromSlug(regionSlug);
  if (!service || !region) notFound();

  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const neighborhoods = neighborhoodsByRegion[region] || [];
  const totalNeighborhoods = getAllNeighborhoods().length;
  const regions = getRegions();
  const otherRegions = regions.filter((r) => r !== region);
  const relatedServices = getRelatedServices(service, 6);

  /* ── Why this service needs SEO in this region ── */
  const whyReasons = [
    {
      title: `${region} Is Competitive`,
      text: `${region} is one of the most competitive markets for ${service.name.toLowerCase()} businesses. Without local SEO, you're invisible to the thousands of people searching for your services every month.`,
    },
    {
      title: `${neighborhoods.length} Neighborhoods to Dominate`,
      text: `${region} has ${neighborhoods.length} distinct neighborhoods, each with its own search landscape. We build a dedicated optimized page for your ${service.name.toLowerCase()} business in every single one.`,
    },
    {
      title: "Google Maps Drives Revenue",
      text: `When someone in ${region} searches "${service.name.toLowerCase()} near me," the Maps 3-pack gets 42% of clicks. We get your business into that pack — neighborhood by neighborhood.`,
    },
    {
      title: "AI Search Is Growing Fast",
      text: `More ${region} residents are asking ChatGPT and Perplexity for local recommendations. We structure your content so AI platforms recommend your ${service.name.toLowerCase()} business by name.`,
    },
  ];

  /* ── FAQ ── */
  const faqItems = [
    {
      q: `How much does ${service.name.toLowerCase()} SEO cost in ${region}?`,
      a: `Monthly retainers for ${service.name.toLowerCase()} SEO in ${region} start at $3,500/month. The exact cost depends on how many ${region} neighborhoods you want to target and how competitive your specific market is.`,
    },
    {
      q: `How many ${region} neighborhoods can you rank me in?`,
      a: `We cover all ${neighborhoods.length} neighborhoods in ${region}. Each gets a dedicated page targeting "${service.name.toLowerCase()} in [Neighborhood]" with unique content and schema markup.`,
    },
    {
      q: `How long to rank a ${service.name.toLowerCase()} business in ${region}?`,
      a: `Most ${service.name.toLowerCase()} businesses see improvements in 60-90 days. Google Business Profile changes can impact Maps ranking within weeks. Highly competitive ${region} neighborhoods may take 4-6 months.`,
    },
    {
      q: `Do you only do ${service.name.toLowerCase()} SEO in ${region}?`,
      a: `No. We cover all 8 regions in the NYC metro — ${regions.join(", ")}. If your ${service.name.toLowerCase()} business serves multiple regions, we build optimized pages for every neighborhood across all of them.`,
    },
    {
      q: `Can you rank my ${service.name.toLowerCase()} business on ChatGPT for ${region}?`,
      a: `Yes. AI search optimization is built into every campaign. We structure your content so when someone asks "best ${service.name.toLowerCase()} in ${region}," your business gets recommended.`,
    },
    {
      q: `What other services do you offer for ${service.name.toLowerCase()} businesses?`,
      a: `Beyond SEO, we offer Google Business Profile management, content marketing, web design on Next.js, AI search optimization, and Full Loop CRM. Everything a ${service.name.toLowerCase()} business needs to dominate online.`,
    },
  ];

  const organizationSchema = getOrganizationSchema();

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `SEO for ${service.name} Businesses in ${region}`,
    description: `Local SEO and AI search optimization for ${service.name.toLowerCase()} businesses across ${neighborhoods.length} neighborhoods in ${region}.`,
    url: `${SITE_URL}/industries/${serviceToIndustrySlug(service)}/${regionSlug}`,
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "Place",
      name: region,
    },
    serviceType: `${service.name} SEO`,
  };

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Industries", url: "/industries" },
    { name: service.name, url: `/industries/${serviceToIndustrySlug(service)}` },
    { name: region, url: `/industries/${serviceToIndustrySlug(service)}/${regionSlug}` },
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
              { name: region, url: `/industries/${serviceToIndustrySlug(service)}/${regionSlug}` },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {service.category} &middot; {region} &middot; {neighborhoods.length} Neighborhoods
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  {service.name}
                </span>{" "}
                Businesses in {region}
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search</Link>{" "}
                platforms for {service.name.toLowerCase()} businesses across all {neighborhoods.length} neighborhoods in {region}.
                Every neighborhood gets a dedicated optimized page targeting{" "}
                &ldquo;{service.name.toLowerCase()} in [Neighborhood]&rdquo; searches.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{neighborhoods.length}</div>
                <div className="mt-1 text-xs text-zinc-400">{region} Neighborhoods</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{service.commonServices.length}+</div>
                <div className="mt-1 text-xs text-zinc-400">{service.name} Services</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{neighborhoods.length * getAllServices().length}+</div>
                <div className="mt-1 text-xs text-zinc-400">{region} Pages Built</div>
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
          SECTION 2 — ALL NEIGHBORHOODS IN THIS REGION (money page links)
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} SEO in Every{" "}
            <span className="text-[#0080FE]">{region}</span> Neighborhood
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            We build a dedicated optimized page for your {service.name.toLowerCase()} business in each of these {neighborhoods.length} neighborhoods.
            Each link below goes to the live page we&apos;ve already built.
          </p>

          <div className="mt-8 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {neighborhoods.map((n) => (
              <Link
                key={n.slug}
                href={`/${service.slug}/${n.slug}`}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
              >
                {service.name} in {n.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHY [SERVICE] BUSINESSES IN [REGION] NEED SEO
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why {service.name} Businesses in {region} Need SEO
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
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
          SECTION 5 — SERVICES WE OPTIMIZE
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {service.name} Services We Optimize in {region}
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {service.commonServices.map((cs) => (
              <div key={cs} className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3">
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
          SECTION 6 — RELATED INDUSTRIES IN THIS REGION
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {relatedServices.length > 0 && (
            <>
              <h2 className="text-2xl font-bold">
                Other {service.category} SEO in {region}
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {relatedServices.map((rs) => (
                  <Link
                    key={rs.slug}
                    href={`/industries/${serviceToIndustrySlug(rs)}/${regionSlug}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                  >
                    {rs.name} SEO in {region}
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Other regions for same service */}
          <h3 className="mt-10 text-xl font-semibold text-white">
            {service.name} SEO in Other Regions
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {otherRegions.map((r) => (
              <Link
                key={r}
                href={`/industries/${serviceToIndustrySlug(service)}/${r.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
              >
                {service.name} SEO in {r}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/industries/${serviceToIndustrySlug(service)}`} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              {service.name} SEO — All Regions
            </Link>
            <Link href="/industries" className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              All Industries
            </Link>
            <Link href={`/areas#${regionSlug}`} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              All {region} Neighborhoods
            </Link>
            <Link href="/areas" className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-[#0080FE] hover:text-white">
              All Service Areas
            </Link>
          </div>
        </div>
      </section>

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
            {service.name} SEO in {region} — FAQ
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9 — FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
