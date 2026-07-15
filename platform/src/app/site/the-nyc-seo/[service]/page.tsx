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
  categoryToSlug,
} from "@/app/site/the-nyc-seo/_lib/data";
import {
  getServiceHubMeta,
  getFAQPageSchema,
  PHONE,
  SITE_URL,
} from "@/app/site/the-nyc-seo/_lib/seo";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

interface PageProps {
  params: Promise<{ service: string }>;
}

export const dynamicParams = true;

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
  const catContent = categoryContent[service.category];

  const totalNeighborhoods = Object.values(neighborhoodsByRegion).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const phonePlain = PHONE.replace(/-/g, "");
  const nameLower = service.name.toLowerCase();

  /* ── JSON-LD Schemas ── */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    sameAs: ["https://www.consortiumnyc.com", "https://homeservicesbusinesscrm.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `SEO for ${service.name} Businesses NYC`,
    description: `Full-service SEO, AI search optimization, and digital marketing for ${nameLower} businesses in NYC, New Jersey, Long Island, and Westchester.`,
    url: `${SITE_URL}/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.name} SEO Services`,
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: `${service.name} Local SEO` } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: `${service.name} Google Business Profile` } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: `${service.name} Content Marketing` } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: `${service.name} AI Search Optimization` } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: `${service.name} Programmatic SEO` } },
      ],
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$3,500 - $15,000+/mo",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.759,
      longitude: -73.9845,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
    ],
  };

  /* ── SEO-focused FAQs for this industry ── */
  const seoFaqs = [
    {
      q: `How much does SEO cost for a ${nameLower} business in NYC?`,
      a: `SEO for ${nameLower} businesses typically starts at $3,500/month for a full-service retainer covering on-page SEO, local SEO, Google Business Profile optimization, content marketing, and link building. Project-based work starts at $2,500. The cost depends on your competitive landscape, number of locations, and how many neighborhoods you want to target. A ${nameLower} targeting 5 neighborhoods needs less investment than one targeting all of Brooklyn. See our pricing guide for detailed breakdowns.`,
    },
    {
      q: `How long does it take for a ${nameLower} business to rank on Google in NYC?`,
      a: `Most ${nameLower} businesses see measurable improvements in 60-90 days, with significant ranking gains in 4-6 months. Google Business Profile optimizations can impact your Maps ranking within weeks. Location page rankings typically appear in 60-120 days. Competitive neighborhoods like Midtown, Williamsburg, or Park Slope take longer. We provide monthly progress reports so you see movement from week one.`,
    },
    {
      q: `What SEO services do you offer for ${nameLower} businesses?`,
      a: `We offer the full stack: on-page SEO (title tags, schema, content optimization), technical SEO (Core Web Vitals, crawlability), local SEO (Google Maps, citations, review strategy), Google Business Profile optimization, content marketing (service pages, location pages, blog content), off-page SEO (link building, digital PR), AI search optimization (ChatGPT, Perplexity, Gemini), programmatic page generation (${totalNeighborhoods}+ neighborhood pages), and Full Loop CRM for lead management.`,
    },
    {
      q: `Can you help my ${nameLower} business show up on ChatGPT and Perplexity?`,
      a: `Yes. AI search optimization (GEO) is one of our core services. We structure your content with the entity relationships, authority signals, and citation patterns that AI platforms use to formulate recommendations. When someone asks ChatGPT "best ${nameLower} in [neighborhood]," we make sure your business is the one that gets recommended.`,
    },
    {
      q: `Do you build location pages for ${nameLower} businesses?`,
      a: `Yes. We build optimized landing pages for every neighborhood you serve using programmatic SEO. A ${nameLower} targeting the full NYC metro area gets ${totalNeighborhoods}+ unique location pages — each with original content, proper schema markup, and internal linking. When someone searches "${nameLower} in Park Slope" or "${nameLower} Astoria," your dedicated page is what ranks.`,
    },
    {
      q: `What makes your SEO different from other agencies for ${nameLower} businesses?`,
      a: `Three things. First, we build on Next.js — not WordPress — so your site is fast, secure, and scores 95+ on Core Web Vitals. Second, we use programmatic SEO to create hundreds of location pages at scale, each unique and optimized. Third, we optimize for AI search (ChatGPT, Perplexity, Gemini) in addition to Google — something 95% of agencies still ignore. We also offer Full Loop CRM so your leads actually get followed up on.`,
    },
    {
      q: `How do you handle Google Business Profile for ${nameLower} businesses?`,
      a: `We optimize every element of your GBP: primary and secondary categories, business description, service areas covering every neighborhood you serve, service listings with descriptions, weekly Google Posts, Q&A seeding, photo optimization, review generation strategy, and review response management. For multi-location ${nameLower} businesses, we manage separate profiles for each location.`,
    },
    {
      q: `Do you work with ${nameLower} businesses outside of NYC?`,
      a: `We serve ${nameLower} businesses across the entire NYC metro area — all five boroughs, Northern New Jersey, Long Island (Nassau and Suffolk counties), and Westchester County. That is ${totalNeighborhoods}+ neighborhoods with dedicated location pages for each.`,
    },
  ];

  const faqSchema = getFAQPageSchema(seoFaqs);

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How We Build an SEO Platform for ${service.name} Businesses`,
    description: `Our step-by-step process for ranking ${nameLower} businesses on Google and AI search platforms in NYC.`,
    step: [
      { "@type": "HowToStep", position: 1, name: "SEO Audit & Strategy", text: `We audit your current rankings, analyze your ${nameLower} competitors, research high-intent keywords, and build a 90-day roadmap.` },
      { "@type": "HowToStep", position: 2, name: "Website Build or Optimization", text: `We build (or rebuild) your website on Next.js with mobile-first design, Core Web Vitals optimization, and conversion-focused architecture.` },
      { "@type": "HowToStep", position: 3, name: "On-Page & Technical SEO", text: `Title tags, meta descriptions, schema markup, internal linking, and technical optimizations across every page on your site.` },
      { "@type": "HowToStep", position: 4, name: "Local SEO & Google Business Profile", text: `Full GBP optimization, citation building, review strategy, and local pack optimization for every neighborhood you serve.` },
      { "@type": "HowToStep", position: 5, name: "Programmatic Location Pages", text: `We generate optimized landing pages for every service + neighborhood combination — ${totalNeighborhoods}+ pages for full metro coverage.` },
      { "@type": "HowToStep", position: 6, name: "AI Search Optimization", text: `We structure your content so ChatGPT, Perplexity, Gemini, and Claude recommend your ${nameLower} business to users.` },
      { "@type": "HowToStep", position: 7, name: "Link Building & Off-Page", text: `Earned backlinks from authoritative sources, local citations, digital PR, and review management to build domain authority.` },
      { "@type": "HowToStep", position: 8, name: "Analytics & Reporting", text: `Monthly reporting on keyword rankings, traffic, leads, and ROI so you see exactly what your investment produces.` },
    ],
  };

  const breadcrumbItems = [
    { name: "Businesses", url: "/businesses" },
    { name: service.category, url: `/businesses/${categoryToSlug(service.category)}` },
    { name: service.name, url: `/${service.slug}` },
  ];

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(howToSchema) }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <Link
                href={`/businesses/${categoryToSlug(service.category)}`}
                className="inline-block rounded-full bg-[#0080FE]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0080FE] hover:bg-[#0080FE]/20"
              >
                {service.category}
              </Link>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                SEO for{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  {service.name}
                </span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that rank {nameLower} businesses across {totalNeighborhoods}+ neighborhoods in{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC, New Jersey, Long Island &amp; Westchester</Link>.{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Local SEO</Link>,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>,{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic pages</Link>, and{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link> — all under one roof.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Stats Card */}
            <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-8">
              <h2 className="text-lg font-semibold text-[#0080FE]">{service.name} SEO at a Glance</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Neighborhoods Targeted</span>
                  <span className="font-semibold">{totalNeighborhoods}+</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Location Pages Built</span>
                  <span className="font-semibold">{totalNeighborhoods}+</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Regions Covered</span>
                  <span className="font-semibold">{regions.length}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Search Engines &amp; AI</span>
                  <span className="font-semibold">Google, Bing, ChatGPT, Perplexity, Gemini, Claude</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Retainers From</span>
                  <span className="font-semibold text-[#0080FE]">$3,500/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Platform</span>
                  <span className="font-semibold">Next.js (not WordPress)</span>
                </div>
              </div>
              {catContent && catContent.stats.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-6">
                  {catContent.stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-lg font-bold text-[#EFF70A]">{stat.value}</p>
                      <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — THE SEO CHALLENGE FOR THIS INDUSTRY
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why {service.name} Businesses Need SEO in NYC</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            {service.extendedDescription} In NYC, {nameLower} businesses compete in one of the most saturated local search markets in the country. When someone searches &ldquo;{nameLower} near me&rdquo; or &ldquo;best {nameLower} in [neighborhood],&rdquo; there are dozens of competitors fighting for three spots in the{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Local Pack</Link>. Without a deliberate{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>, your {nameLower} business is invisible to the customers actively searching for your services right now.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#0080FE]">93%</p>
              <p className="mt-2 text-sm text-zinc-400">of local experiences start with a search engine</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#EFF70A]">42%</p>
              <p className="mt-2 text-sm text-zinc-400">of clicks go to the Google Local Pack</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-white">0%</p>
              <p className="mt-2 text-sm text-zinc-400">of clicks go to page 2 results</p>
            </div>
          </div>

          {service.commonServices.length > 0 && (
            <>
              <h3 className="mt-12 text-xl font-semibold">Keywords We Target for {service.name} Businesses</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Every {nameLower} service becomes a keyword target — combined with {totalNeighborhoods}+ neighborhoods for maximum coverage.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {service.commonServices.map((cs) => (
                  <div key={cs} className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] px-4 py-3">
                    <span className="shrink-0 text-green-400">&#10003;</span>
                    <span className="text-sm text-zinc-300">&ldquo;{cs.toLowerCase()} [neighborhood]&rdquo;</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHAT'S INCLUDED
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What We Build for {service.name} Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every {nameLower} client gets a complete{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO and digital marketing platform</Link>{" "}
            — not piecemeal tactics. Here is what is included.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                num: "01",
                title: "SEO Strategy & Audit",
                desc: `We audit your current rankings, analyze your ${nameLower} competitors, research high-intent keywords (like "${nameLower} near me" and every service you offer), and build a 90-day roadmap.`,
                href: "/services/seo-strategy",
                link: "SEO strategy",
              },
              {
                num: "02",
                title: "Website Design & Development",
                desc: `Fast, mobile-first website on Next.js — not WordPress. Every page designed for conversion. Scores 95+ on Core Web Vitals. Built to scale to hundreds of pages.`,
                href: "/services/web-design-development",
                link: "web design",
              },
              {
                num: "03",
                title: "On-Page & Technical SEO",
                desc: `Title tags, meta descriptions, schema markup (7+ types), internal linking architecture, image optimization, Core Web Vitals, crawlability, and indexation management.`,
                href: "/services/on-page-seo",
                link: "on-page SEO",
              },
              {
                num: "04",
                title: "Local SEO & Google Maps",
                desc: `Google Business Profile optimization, local citation building (50+ directories), review generation strategy, NAP consistency, and geo-grid rank tracking for every neighborhood.`,
                href: "/services/local-seo",
                link: "local SEO",
              },
              {
                num: "05",
                title: "Content Marketing",
                desc: `SEO-optimized service pages, blog content targeting long-tail keywords your ${nameLower} customers search, FAQ content, and industry guides that build topical authority.`,
                href: "/services/content-marketing",
                link: "content marketing",
              },
              {
                num: "06",
                title: "Programmatic Location Pages",
                desc: `Automated landing pages for every neighborhood — "${nameLower} in Park Slope," "${nameLower} in Astoria," "${nameLower} in Hoboken." ${totalNeighborhoods}+ pages, each with unique content and schema.`,
                href: "/services/automation",
                link: "programmatic SEO",
              },
              {
                num: "07",
                title: "AI Search Optimization",
                desc: `We make ChatGPT, Perplexity, Gemini, and Claude recommend your ${nameLower} business. Structured data, entity relationships, and content architecture built for AI crawlers.`,
                href: "/services/ai-search-optimization",
                link: "AI search optimization",
              },
              {
                num: "08",
                title: "Off-Page SEO & Link Building",
                desc: `Earned backlinks from authoritative sources, industry-specific directory listings, digital PR, brand mentions, and a review management strategy that builds trust signals.`,
                href: "/services/off-page-seo",
                link: "off-page SEO",
              },
              {
                num: "09",
                title: "Google Business Profile",
                desc: `Complete GBP setup and optimization — categories, services, posts, Q&A, photos, review responses, and ongoing management. The foundation of your local pack visibility.`,
                href: "/services/google-business-profile",
                link: "GBP optimization",
              },
              {
                num: "10",
                title: "Analytics & Reporting",
                desc: `Monthly reporting on keyword rankings, organic traffic, leads generated, call tracking, and ROI. Google Analytics, Search Console, and custom dashboards. No vanity metrics.`,
                href: "/services/analytics-reporting",
                link: "analytics",
              },
            ].map((item) => (
              <div key={item.num} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0080FE] text-xs font-bold text-white">{item.num}</span>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                <Link href={item.href} className="mt-3 inline-block text-sm text-[#5CB8FF] hover:text-[#8DD0FF]">
                  Learn about {item.link} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — OUR PROCESS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">How We Rank {service.name} Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Our process is the same one that has ranked hundreds of{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
            across the NYC metro. Here is how it works for {nameLower} businesses specifically.
          </p>
          <div className="mt-10 space-y-6">
            {[
              { step: "1. Audit & Research", detail: `We crawl your current site (if you have one), pull ranking data, analyze the top-ranking ${nameLower} businesses in your target neighborhoods, and identify keyword gaps. This becomes your strategy document.` },
              { step: "2. Build the Foundation", detail: `We build (or rebuild) your website on Next.js with mobile-first design, Core Web Vitals optimization, proper schema markup, and an architecture designed to scale to hundreds of pages.` },
              { step: "3. Optimize Every Page", detail: `On-page SEO across your entire site — title tags, meta descriptions, heading hierarchy, image alt text, internal linking, and 7+ types of schema markup. Nothing gets published without optimization.` },
              { step: "4. Launch Location Pages", detail: `Programmatic generation of ${totalNeighborhoods}+ neighborhood-specific landing pages. Each page targets "${nameLower} in [neighborhood]" with unique content, local schema, and internal links.` },
              { step: "5. Local SEO & GBP", detail: `Full Google Business Profile optimization, citation building across 50+ directories, review generation strategy, and geo-grid rank tracking to monitor your local pack positions.` },
              { step: "6. Content & Link Building", detail: `Ongoing content marketing (service pages, blog posts, industry guides) and off-page SEO (editorial backlinks, digital PR, local citations) to build authority month over month.` },
              { step: "7. AI Search Optimization", detail: `We structure your content so AI platforms recommend your ${nameLower} business. This is the fastest-growing discovery channel in 2026 and most agencies ignore it entirely.` },
              { step: "8. Measure & Report", detail: `Monthly reporting on rankings, traffic, leads, and ROI. Quarterly strategy reviews. You know exactly what your investment produces.` },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <div>
                  <h3 className="font-semibold text-[#0080FE]">{item.step}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 5 — INDUSTRY CONTEXT
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Understanding the {service.name} Market in NYC</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            {service.description} To build an effective SEO strategy for your {nameLower} business, we need to understand your industry inside and out — the services you offer, how customers find you, and what makes them choose one provider over another.
          </p>

          {service.licensingNote && (
            <div className="mt-8 rounded-xl border border-yellow-900/30 bg-yellow-900/10 p-6">
              <h3 className="font-semibold text-[#EFF70A]">NYC Licensing &amp; Trust Signals</h3>
              <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                {service.licensingNote} We incorporate licensing credentials, certifications, and trust signals directly into your website&apos;s schema markup and content — Google and AI platforms use these as authority indicators when deciding who to rank and recommend.
              </p>
            </div>
          )}

          {catContent && (
            <>
              <h3 className="mt-10 text-xl font-semibold">Our SEO Process for {service.name} Businesses</h3>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                We use these steps to build a comprehensive{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content strategy</Link>{" "}
                and{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page optimization</Link>{" "}
                plan for your {nameLower} business.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {catContent.seoProcess.map((item, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0080FE] text-xs font-bold">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.step}</p>
                      <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {catContent && catContent.investmentFactors.length > 0 && (
            <>
              <h3 className="mt-10 text-xl font-semibold">{service.name} Industry Pricing Context</h3>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                Typical industry pricing: <strong className="text-white">{service.priceRange}</strong>. {catContent.investmentContext} Understanding your industry&apos;s pricing helps us craft{" "}
                <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content and keyword strategies</Link>{" "}
                that target the highest-value searches.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — WHY LOCAL SEO MATTERS
          ============================================================ */}
      {catContent && (
        <section className="bg-[#0A0A0A] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">Why Local SEO Matters for {service.name} Businesses</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              These are the realities of the NYC {nameLower} market — and exactly why{" "}
              <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
              is the most important investment your business can make.
            </p>
            <div className="mt-10 space-y-4">
              {catContent.whySEOMatters.map((reason, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-zinc-800 bg-[#141414] p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">{i + 1}</span>
                  <p className="text-sm text-zinc-300 leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 7 — PRICING
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">SEO Pricing for {service.name} Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every dollar goes into strategy, content, optimization, and infrastructure that your {nameLower} business owns. No fluff, no vanity metrics.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Monthly Retainer</h3>
              <p className="mt-2 text-2xl font-extrabold">From $3,500<span className="text-base font-normal text-zinc-500">/mo</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Full-service SEO: strategy, on-page, local SEO, content, link building, GBP, AI search, analytics. The complete platform for {nameLower} businesses serious about ranking.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Project-Based</h3>
              <p className="mt-2 text-2xl font-extrabold">From $2,500</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Website builds, SEO audits, GBP optimization, citation building, or programmatic page generation as standalone projects.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Consulting</h3>
              <p className="mt-2 text-2xl font-extrabold">From $150<span className="text-base font-normal text-zinc-500">/hr</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Strategic advisory for {nameLower} businesses that want to build or manage their own SEO. Get expert guidance without a retainer commitment.
              </p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="inline-flex items-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]">
              Full Pricing Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — REGION COVERAGE
          ============================================================ */}
      {catContent && (
        <section className="bg-[#141414] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">{service.name} SEO by Region</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              Each region has unique search patterns and competitive dynamics. We tailor your {nameLower} SEO strategy to match the neighborhoods you serve.
            </p>
            <div className="mt-10 space-y-4">
              {regions.map((region) => {
                const regionNote = catContent.regionNotes[region];
                if (!regionNote) return null;
                const neighborhoods = neighborhoodsByRegion[region];
                const topNeighborhoods = neighborhoods ? neighborhoods.slice(0, 4) : [];
                return (
                  <div key={region} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6">
                    <h3 className="text-lg font-semibold text-white">{service.name} SEO in {region}</h3>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{regionNote}</p>
                    {topNeighborhoods.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {topNeighborhoods.map((n) => (
                          <Link
                            key={n.slug}
                            href={`/${service.slug}/${n.slug}`}
                            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-[#5CB8FF] hover:border-[#0080FE] hover:text-white"
                          >
                            {n.name}
                          </Link>
                        ))}
                        <Link
                          href={`#${service.slug}-${region.toLowerCase().replace(/\s/g, "-")}`}
                          className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-500 hover:border-[#0080FE] hover:text-white"
                        >
                          All {neighborhoods?.length} areas &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 9 — FULL NEIGHBORHOOD GRID
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{service.name} SEO — All {totalNeighborhoods}+ Neighborhoods</h2>
          <p className="mt-4 text-zinc-400">
            We build a dedicated landing page for your {nameLower} business in every neighborhood listed below. Each page is optimized for &ldquo;{nameLower} in [neighborhood]&rdquo; with unique content, schema markup, and internal links.
          </p>

          {regions.map((region) => {
            const neighborhoods = neighborhoodsByRegion[region];
            if (!neighborhoods || neighborhoods.length === 0) return null;
            return (
              <div key={region} className="mt-10" id={`${service.slug}-${region.toLowerCase().replace(/\s/g, "-")}`}>
                <h3 className="text-lg font-semibold text-white">
                  {region}
                  <span className="ml-2 text-sm font-normal text-zinc-500">({neighborhoods.length} areas)</span>
                </h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {neighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/${service.slug}/${n.slug}`}
                      className="rounded-lg border border-zinc-800 bg-[#141414] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE]/50 hover:text-white"
                    >
                      {service.name} in {n.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 10 — FAQ
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            FAQ: SEO for {service.name} Businesses
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions from {nameLower} business owners about SEO and digital marketing in NYC.
          </p>
          <div className="mt-10 space-y-4">
            {seoFaqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11 — RELATED BUSINESSES & CROSS-LINKS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {relatedServices.length > 0 && (
            <>
              <h2 className="text-2xl font-bold sm:text-3xl">More {service.category} Businesses We Help</h2>
              <p className="mt-2 text-zinc-500">
                Other{" "}
                <Link href={`/businesses/${categoryToSlug(service.category)}`} className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  {service.category.toLowerCase()}
                </Link>{" "}
                businesses we build SEO platforms for.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {relatedServices.map((rs) => (
                  <Link
                    key={rs.slug}
                    href={`/${rs.slug}`}
                    className="rounded-xl border border-zinc-800 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]/50"
                  >
                    <h3 className="font-medium text-white">SEO for {rs.name}s</h3>
                    <p className="mt-1 text-xs text-zinc-500">{rs.category}</p>
                  </Link>
                ))}
              </div>
            </>
          )}

          {crossCategoryServices.length > 0 && (
            <>
              <h3 className="mt-12 text-xl font-semibold text-white">Other Industries We Serve</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {crossCategoryServices.map((cs) => (
                  <Link
                    key={cs.slug}
                    href={`/${cs.slug}`}
                    className="rounded-xl border border-zinc-800 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]/50"
                  >
                    <h4 className="text-sm font-medium text-white">{cs.name}</h4>
                    <p className="mt-1 text-xs text-zinc-500">{cs.category}</p>
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="mt-12 flex flex-wrap gap-3 border-t border-zinc-800 pt-8">
            <Link href="/businesses" className="text-sm text-[#0080FE] hover:text-white">All Businesses</Link>
            <span className="text-zinc-700">|</span>
            <Link href={`/businesses/${categoryToSlug(service.category)}`} className="text-sm text-[#0080FE] hover:text-white">{service.category}</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services" className="text-sm text-[#0080FE] hover:text-white">All Services</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/areas" className="text-sm text-[#0080FE] hover:text-white">All Areas</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/pricing" className="text-sm text-[#0080FE] hover:text-white">Pricing</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/partnership-request-form" className="text-sm text-[#0080FE] hover:text-white">Contact</Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
