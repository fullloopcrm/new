import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import {
  getNeighborhoodsByRegion,
  getAllNeighborhoods,
  getAllServices,
  getRegions,
  getCategories,
  categoryToSlug,
  getServicesByCategory,
} from "@/app/site/the-nyc-seo/_lib/data";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import {
  getOrganizationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
  SITE_URL,
} from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Local SEO Across 318+ NYC Metro Neighborhoods | The NYC SEO",
  description:
    "SEO and AI search optimization for businesses in 318+ neighborhoods across NYC, New Jersey, Long Island & Westchester. 8 regions. 172 service types. 54,000+ optimized pages.",
  keywords: [
    "NYC local SEO",
    "local SEO NYC neighborhoods",
    "SEO service areas NYC",
    "New Jersey local SEO",
    "Long Island SEO",
    "Westchester SEO",
    "Brooklyn SEO",
    "Queens SEO",
    "Manhattan SEO",
    "Bronx SEO",
    "Staten Island SEO",
    "NYC metro SEO agency",
    "neighborhood SEO NYC",
    "local business SEO NYC",
  ],
  openGraph: {
    title: "Local SEO Across 318+ NYC Metro Neighborhoods",
    description:
      "8 regions. 318+ neighborhoods. 172 service types. 54,000+ optimized pages. SEO and AI search for every local business in the NYC metro.",
    url: `${SITE_URL}/areas`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/areas`,
  },
};

/* ── Featured services to showcase ── */
const featuredServices = [
  { name: "SEO Services", href: "/services/seo", desc: "Full-service search engine optimization" },
  { name: "Local SEO", href: "/services/local-seo", desc: "Google Maps, citations, and local pack ranking" },
  { name: "AI Search Optimization", href: "/services/ai-search-optimization", desc: "ChatGPT, Perplexity, Gemini visibility" },
  { name: "Google Business Profile", href: "/services/google-business-profile", desc: "GBP setup, optimization, and management" },
  { name: "Content Marketing", href: "/services/content-marketing", desc: "Blog posts, guides, and location content" },
  { name: "Technical SEO", href: "/services/search-engine-optimization", desc: "Core Web Vitals, schema, crawlability" },
  { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js sites built for speed and SEO" },
  { name: "Off-Page SEO", href: "/services/off-page-seo", desc: "Link building and authority development" },
  { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Rank tracking, traffic, and lead attribution" },
  { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "Lead-to-review CRM for service businesses" },
];

export default function AreasPage() {
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalNeighborhoods = getAllNeighborhoods().length;
  const allServices = getAllServices();
  const totalServices = allServices.length;
  const totalPages = totalServices * totalNeighborhoods;
  const regions = getRegions();
  const categories = getCategories();
  const servicesByCategory = getServicesByCategory();

  /* ── Process steps ── */
  const processSteps = [
    { step: "Neighborhood Research", detail: "We study the competitive landscape, search volume, and business density for every neighborhood in your target area." },
    { step: "Keyword Mapping by Location", detail: "Map service-specific keywords to each neighborhood — \"plumber in Park Slope,\" \"dentist near Hoboken,\" and thousands more." },
    { step: "Programmatic Page Generation", detail: `We build ${totalPages.toLocaleString()}+ unique pages — one for every service type in every neighborhood — with structured data, content, and internal linking.` },
    { step: "Google Business Profile per Area", detail: "Each location gets GBP optimization with neighborhood-specific content, categories, photos, and review strategy." },
    { step: "Local Citation Building", detail: "Directory submissions, NAP consistency, and region-specific citations for every area you serve." },
    { step: "AI Search Structuring", detail: "Entity relationships and authority signals structured so ChatGPT, Perplexity, and Gemini recommend your business by location." },
    { step: "Internal Linking Architecture", detail: "Every neighborhood page links to related services, nearby areas, and region hubs — building topical authority at scale." },
    { step: "Ongoing Optimization", detail: "Monthly content updates, new neighborhood expansions, ranking reports, and traffic analytics tied to real leads." },
  ];

  /* ── Stats ── */
  const stats = [
    { value: totalNeighborhoods.toString(), label: "Neighborhoods Covered" },
    { value: "8", label: "Regions" },
    { value: totalServices.toString(), label: "Service Types" },
    { value: totalPages.toLocaleString() + "+", label: "Optimized Pages" },
    { value: categories.length.toString(), label: "Industries" },
    { value: "95+", label: "Core Web Vitals Score" },
    { value: "< 1s", label: "Average Load Time" },
    { value: "24/7", label: "AI Search Visibility" },
  ];

  /* ── FAQ ── */
  const faqItems = [
    {
      q: "How many neighborhoods do you cover?",
      a: `We cover ${totalNeighborhoods}+ neighborhoods across 8 regions — Manhattan, Brooklyn, Queens, Bronx, Staten Island, New Jersey, Long Island, and Westchester. Every neighborhood gets dedicated optimized pages for every service type we support.`,
    },
    {
      q: "What does a neighborhood SEO page include?",
      a: "Each page includes optimized title tags and meta descriptions, JSON-LD structured data (LocalBusiness, FAQPage, BreadcrumbList), neighborhood-specific content, service details, pricing context, internal links to related services and nearby areas, and a contact form. Every page is built to rank.",
    },
    {
      q: "How do programmatic location pages work?",
      a: `We generate a unique page for every combination of service type and neighborhood. That is ${totalServices} services × ${totalNeighborhoods} neighborhoods = ${totalPages.toLocaleString()}+ pages. Each page targets a specific keyword like "plumber in Brooklyn Heights" or "dentist in Jersey City" with unique content and schema.`,
    },
    {
      q: "Can I target specific neighborhoods only?",
      a: "Yes. While our platform covers the full NYC metro, we can prioritize specific neighborhoods for your campaign. Many clients start with their core service area and expand outward as they grow. Each neighborhood gets its own dedicated strategy.",
    },
    {
      q: "How is this different from just having a service area page?",
      a: "A single service area page tells Google you serve \"the NYC area.\" Our approach creates a dedicated, optimized page for every neighborhood — each with unique content, schema markup, and internal linking. Google rewards specificity. One page for 318 areas loses to 318 pages each targeting one area.",
    },
    {
      q: "Do these pages work for AI search (ChatGPT, Perplexity)?",
      a: "Yes. Every page includes entity relationships, structured data, and authority signals that AI search platforms use when making recommendations. When someone asks ChatGPT \"best plumber in Park Slope,\" our structured pages are what get cited.",
    },
    {
      q: "How long until my business ranks in a new neighborhood?",
      a: "Programmatic location pages typically start ranking within 60-120 days. Google Business Profile optimizations can impact Maps ranking within weeks. Highly competitive neighborhoods in Manhattan may take longer than outer borough or NJ locations.",
    },
    {
      q: "Can I see which neighborhoods are generating leads?",
      a: "Yes. We provide monthly reporting broken down by neighborhood showing keyword rankings, traffic, phone calls, form submissions, and lead attribution. You will know exactly which areas are producing ROI.",
    },
    {
      q: "What if my neighborhood isn't listed?",
      a: "We are constantly expanding our coverage. Contact us and we will add your area to the platform. New neighborhoods can be added and indexed within weeks.",
    },
    {
      q: "Do you do SEO for businesses outside the NYC metro?",
      a: "Our programmatic platform is currently focused on the NYC metro area — all five boroughs, Northern New Jersey, Long Island, and Westchester. If you operate outside this area, contact us to discuss a custom SEO campaign.",
    },
  ];

  /* ── JSON-LD ── */
  const organizationSchema = getOrganizationSchema();

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Local SEO Across NYC Metro Neighborhoods",
    description: `SEO and AI search optimization for businesses across ${totalNeighborhoods}+ neighborhoods in NYC, New Jersey, Long Island, and Westchester. ${totalServices} service types. ${totalPages.toLocaleString()}+ optimized pages.`,
    url: `${SITE_URL}/areas`,
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: regions.map((r) => ({ "@type": "Place", name: r })),
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "NYC Metro Neighborhoods We Cover",
    numberOfItems: totalNeighborhoods,
    itemListElement: Object.entries(neighborhoodsByRegion)
      .flatMap(([, neighborhoods]) => neighborhoods)
      .map((n, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: n.name,
        url: `${SITE_URL}/areas/${n.slug}`,
      })),
  };

  const faqSchema = getFAQPageSchema(faqItems);

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Service Areas", url: "/areas" },
  ]);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Service Areas", url: "/areas" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {totalNeighborhoods} Neighborhoods &middot; 8 Regions &middot; {totalServices} Services &middot; {totalPages.toLocaleString()}+ Pages
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Local SEO Across{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  {totalNeighborhoods}+ NYC Metro
                </span>{" "}
                Neighborhoods
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Every{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">neighborhood</Link>{" "}
                in our coverage area gets dedicated, optimized pages for every{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service type</Link>{" "}
                we support. That means a page for{" "}
                <Link href="/plumber/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers in Brooklyn Heights</Link>,{" "}
                a page for{" "}
                <Link href="/electrician/jersey-city" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians in Jersey City</Link>,{" "}
                a page for{" "}
                <Link href="/personal-injury-lawyer/astoria" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers in Astoria</Link>{" "}
                &mdash; each with{" "}
                <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">structured data</Link>{" "}
                and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-white">{totalNeighborhoods}</div>
                <div className="mt-1 text-xs text-zinc-400">Neighborhoods</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-white">8</div>
                <div className="mt-1 text-xs text-zinc-400">Regions</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{totalPages.toLocaleString()}+</div>
                <div className="mt-1 text-xs text-zinc-400">Optimized Pages</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{totalServices}</div>
                <div className="mt-1 text-xs text-zinc-400">Service Types</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — 8 REGIONS FEATURED
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            8 Regions. {totalNeighborhoods} Neighborhoods. <span className="text-[#0080FE]">Total Coverage.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            We cover every major neighborhood across the NYC metro area. Click any region to see its neighborhoods,
            or click a neighborhood to see all {totalServices} services available there.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region] || [];
              const regionSlug = region.toLowerCase().replace(/\s+/g, "-");
              return (
                <div
                  key={region}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`#${regionSlug}`}
                      className="text-lg font-bold text-white hover:text-[#0080FE]"
                    >
                      {region}
                    </Link>
                    <span className="rounded-full bg-[#0080FE]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0080FE]">
                      {neighborhoods.length}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {neighborhoods.slice(0, 5).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded bg-zinc-700/50 px-2 py-1 text-xs text-zinc-300 hover:bg-[#0080FE]/20 hover:text-white"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {neighborhoods.length > 5 && (
                      <Link
                        href={`#${regionSlug}`}
                        className="rounded bg-zinc-700/50 px-2 py-1 text-xs text-[#0080FE] hover:bg-[#0080FE]/20"
                      >
                        +{neighborhoods.length - 5} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHAT WE BUILD FOR EVERY LOCATION
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for <span className="text-[#0080FE]">Every Location</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Each neighborhood in our coverage gets the full SEO treatment. Here are the core services
            we deploy across all {totalNeighborhoods} areas.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {featuredServices.map((svc) => (
              <Link
                key={svc.href}
                href={svc.href}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-[#0080FE]/50"
              >
                <h3 className="font-semibold text-white">{svc.name}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{svc.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 5 — FULL NEIGHBORHOOD GRID BY REGION
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            All {totalNeighborhoods} Neighborhoods
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Every neighborhood links to its dedicated hub page showing all {totalServices} services we rank there.
          </p>

          {regions.map((region) => {
            const neighborhoods = neighborhoodsByRegion[region] || [];
            if (neighborhoods.length === 0) return null;
            const regionSlug = region.toLowerCase().replace(/\s+/g, "-");
            return (
              <div key={region} id={regionSlug} className="mt-14 first:mt-10">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold">{region}</h3>
                  <span className="text-sm text-zinc-500">{neighborhoods.length} areas</span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {neighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/areas/${n.slug}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                    >
                      {n.name}
                      <span className="ml-1 text-xs text-zinc-600">({n.type})</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — HOW LOCATION SEO WORKS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How Location SEO Works
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Our 8-step process for building neighborhood-level SEO platforms that dominate local search and AI recommendations.
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
          SECTION 7 — THE NUMBERS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">The Numbers</h2>
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{stat.value}</p>
                <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
              </div>
            ))}
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
            Location SEO — Frequently Asked Questions
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
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

      {/* ============================================================
          SECTION 10 — CROSS-LINKS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Explore More</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/services"
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50"
            >
              <h3 className="font-semibold text-white">Our Services</h3>
              <p className="mt-1 text-xs text-zinc-500">18 SEO, AI, and marketing services</p>
            </Link>
            <Link
              href="/businesses"
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50"
            >
              <h3 className="font-semibold text-white">Industries We Serve</h3>
              <p className="mt-1 text-xs text-zinc-500">{totalServices} business types across {categories.length} industries</p>
            </Link>
            <Link
              href="/industries"
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50"
            >
              <h3 className="font-semibold text-white">SEO by Industry</h3>
              <p className="mt-1 text-xs text-zinc-500">{totalServices} industry-specific SEO pages</p>
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50"
            >
              <h3 className="font-semibold text-white">Pricing</h3>
              <p className="mt-1 text-xs text-zinc-500">Transparent SEO pricing for every budget</p>
            </Link>
          </div>

          {/* Industry cross-links */}
          <h3 className="mt-10 text-lg font-semibold text-white">Browse by Industry</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/businesses/${categoryToSlug(cat)}`}
                className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-sm text-zinc-300 hover:border-[#0080FE] hover:text-white"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11 — FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
