import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Technical SEO Services NYC",
  description:
    "Technical SEO services for NYC businesses. Site speed, Core Web Vitals, crawlability, indexation, and Next.js optimization. Results-driven. 25+ years.",
  keywords: [
    "technical SEO services NYC",
    "technical SEO agency New York",
    "Core Web Vitals optimization",
    "site speed optimization NYC",
    "crawlability audit",
    "indexation management",
    "schema markup implementation",
    "structured data SEO",
    "JavaScript SEO",
    "mobile-first indexing",
    "crawl budget optimization",
    "XML sitemap management",
    "robots.txt optimization",
    "canonical tag implementation",
    "redirect chain cleanup",
    "log file analysis SEO",
    "hreflang implementation",
    "HTTPS migration SEO",
    "technical SEO audit NYC",
    "Next.js SEO agency",
  ],
  openGraph: {
    title: "Technical SEO Services NYC",
    description:
      "Technical SEO for NYC businesses. Site speed, Core Web Vitals, crawlability, indexation, and Next.js optimization. 25+ years.",
    url: `${SITE_URL}/services/search-engine-optimization`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/search-engine-optimization` },
};

const faqs = [
  {
    q: "What is technical SEO and why does it matter?",
    a: "Technical SEO is the process of optimizing the infrastructure and backend architecture of your website so that search engines can crawl, index, render, and rank your pages efficiently. It covers everything from site speed and Core Web Vitals to XML sitemaps, robots.txt configuration, canonical tags, structured data, JavaScript rendering, mobile-first indexing, HTTPS, redirect chains, and crawl budget management. Without a solid technical foundation, no amount of content or backlinks will get you to page one. Technical SEO is the difference between a website that search engines love and one they struggle to understand.",
  },
  {
    q: "How do Core Web Vitals affect my search rankings?",
    a: "Core Web Vitals are Google's metrics for measuring real-world user experience — Largest Contentful Paint (loading speed), Interaction to Next Paint (interactivity), and Cumulative Layout Shift (visual stability). Since 2021, Core Web Vitals have been a direct ranking factor. Pages that pass all three metrics get a ranking boost over pages that fail. In competitive NYC markets where multiple businesses target the same keywords, Core Web Vitals can be the tiebreaker that pushes you above a competitor. Every site we build on Next.js passes Core Web Vitals out of the box — something WordPress sites consistently struggle with.",
  },
  {
    q: "Why is site speed important for SEO?",
    a: "Site speed directly affects both rankings and conversions. Google has confirmed that page speed is a ranking factor for both desktop and mobile search. Beyond rankings, every additional second of load time increases bounce rate by 32%. For NYC service businesses, a slow-loading page means potential customers hitting the back button and calling your competitor instead. Our Next.js sites load in under 1 second — compared to the 3 to 7 second load times we typically see on WordPress sites using page builders like Elementor or Divi.",
  },
  {
    q: "What is crawl budget and why should I care about it?",
    a: "Crawl budget is the number of pages Google will crawl on your site within a given time period. For small sites with 50 pages, crawl budget is rarely an issue. But for service businesses with hundreds or thousands of location pages, crawl budget becomes critical. If Google cannot crawl all your pages, some will never get indexed — which means they will never rank. We optimize crawl budget through clean site architecture, proper XML sitemaps, efficient robots.txt rules, elimination of redirect chains, removal of orphan pages, and server-side rendering that makes every page instantly crawlable.",
  },
  {
    q: "What is the difference between crawling and indexing?",
    a: "Crawling is when Google's bot (Googlebot) discovers and downloads your pages. Indexing is when Google processes that content and adds it to its search database. A page can be crawled but not indexed — this happens when Google determines the page is too thin, duplicative, blocked by robots.txt, or has a noindex tag. We monitor both crawling and indexing through Google Search Console, server log analysis, and Screaming Frog audits. If important pages are not being indexed, we diagnose the root cause and fix it.",
  },
  {
    q: "How does structured data (schema markup) help SEO?",
    a: "Structured data is code (JSON-LD format) that you add to your pages to help search engines understand the content. When implemented correctly, structured data can trigger rich results in Google — star ratings, FAQ dropdowns, how-to steps, business information, and more. Rich results increase your click-through rate by 20% to 40% compared to plain blue links. We implement 7+ schema types on every page: LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, HowTo, and Organization. This is also what AI search platforms like ChatGPT and Perplexity use to understand and recommend your business.",
  },
  {
    q: "Why is Next.js better than WordPress for technical SEO?",
    a: "WordPress relies on plugins for almost everything — caching, image optimization, schema markup, sitemaps, security. Each plugin adds JavaScript, CSS, and database queries that slow your site down. A typical WordPress site with 15 to 20 plugins loads 40+ HTTP requests before your content even appears. Next.js eliminates all of that. It generates static HTML at build time, serves pages from a CDN edge network, automatically optimizes images, handles code splitting, and gives us complete control over every meta tag, canonical, and schema block at the code level. The result is sub-1-second load times, perfect Core Web Vitals, and zero plugin vulnerabilities.",
  },
  {
    q: "What is JavaScript rendering and why does it matter for SEO?",
    a: "JavaScript rendering is how search engines process pages that rely on JavaScript to display content. Google can render JavaScript, but it does so in a two-phase process — first it crawls the HTML, then it queues the page for rendering (which can take days or weeks). Pages that depend entirely on client-side JavaScript may not get indexed for weeks. Other search engines like Bing and DuckDuckGo have even more limited JavaScript rendering capabilities. Our Next.js architecture uses server-side rendering and static generation, which means every page is delivered as fully-rendered HTML — no rendering delay, no indexing risk.",
  },
  {
    q: "How do canonical tags prevent duplicate content issues?",
    a: "Canonical tags tell search engines which version of a page is the 'original' when multiple URLs serve the same or similar content. Without proper canonicalization, search engines may split ranking signals across duplicate URLs — diluting your authority. Common causes of duplicate content include www vs. non-www versions, HTTP vs. HTTPS, URL parameters (sorting, filtering), print-friendly pages, and paginated content. We audit and implement canonical tags across every page on your site to consolidate ranking signals and eliminate duplicate content penalties.",
  },
  {
    q: "What is mobile-first indexing and is my site compliant?",
    a: "Mobile-first indexing means Google primarily uses the mobile version of your website for indexing and ranking. If your mobile site has less content, fewer links, or a worse user experience than your desktop site, your rankings will suffer. As of 2024, all websites are on mobile-first indexing — there is no opt-out. We build mobile-first by default. Every site we create is designed for the phone screen first, then adapted for desktop. Content parity, tap target sizes, viewport configuration, and mobile page speed are all optimized from day one.",
  },
  {
    q: "How do redirect chains hurt SEO performance?",
    a: "A redirect chain occurs when one URL redirects to another URL, which then redirects to yet another URL. Each redirect in the chain adds latency (typically 100 to 300 milliseconds per hop) and dilutes PageRank by approximately 15% per redirect. A 3-hop redirect chain can lose 40% or more of the original page's authority. We audit your entire site for redirect chains and loops, consolidate them into single 301 redirects, and monitor for new chains that develop over time from CMS changes or URL restructuring.",
  },
  {
    q: "What is a technical SEO audit and what does it include?",
    a: "Our technical SEO audit is a comprehensive analysis of every infrastructure element that affects how search engines crawl, index, render, and rank your website. It includes: site speed analysis, Core Web Vitals assessment, crawlability audit (robots.txt, XML sitemaps, internal linking), indexation status review, structured data validation, canonical tag audit, redirect chain analysis, mobile-first compliance check, HTTPS and security review, server response code analysis, JavaScript rendering assessment, and crawl budget evaluation. The audit produces a prioritized action plan with specific fixes ranked by impact. We typically spend 15 to 25 hours on a full technical audit.",
  },
  {
    q: "How often should technical SEO be monitored?",
    a: "Technical SEO is not a one-time fix — it requires ongoing monitoring. Google's algorithms change, your CMS creates new pages, developers push code that inadvertently breaks things, and competitors evolve. We monitor Core Web Vitals, crawl errors, indexation status, structured data validity, and server response codes on a continuous basis. Major technical audits should happen quarterly, with weekly monitoring of key metrics. Every client on our monthly plans gets continuous technical SEO monitoring as part of their campaign.",
  },
  {
    q: "What are server response codes and why do they matter?",
    a: "Server response codes tell search engines what happened when they requested a page. A 200 means the page loaded successfully. A 301 means it permanently moved. A 404 means it does not exist. A 500 means the server had an error. Incorrect response codes confuse search engines and waste crawl budget. Common issues we fix include: soft 404s (pages that show 'not found' content but return a 200 code), 302 redirects that should be 301s, 500 errors from server misconfigurations, and 404 errors on pages that still have backlinks pointing to them.",
  },
  {
    q: "Do you offer one-time technical SEO audits or only monthly plans?",
    a: "We offer both. A one-time technical SEO audit is a standalone deliverable — we crawl your entire site, analyze every technical element, and deliver a prioritized report with specific fixes. This is ideal if you have an in-house team that can implement the recommendations. For businesses that want ongoing technical SEO management, our monthly plans include continuous monitoring, implementation, and optimization. Most of our clients start with an audit, then transition to a monthly plan because technical SEO requires ongoing attention to maintain peak performance.",
  },
  {
    q: "How does log file analysis improve SEO?",
    a: "Log file analysis examines your server's raw access logs to see exactly how Googlebot and other search engine crawlers interact with your site. It reveals which pages get crawled most frequently, which pages are being ignored, how much crawl budget is being wasted on non-essential pages, and whether crawlers encounter errors the front-end testing tools miss. This is the only way to get ground-truth data about crawler behavior — Google Search Console shows you what Google chose to report, but log files show you what actually happened. We use log file analysis for enterprise sites and large-scale programmatic SEO deployments.",
  },
];

export default function TechnicalSEOPage() {
  /* ---------- Schema Markup ---------- */
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
    sameAs: ["https://www.consortiumnyc.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC SEO — Technical SEO Services",
    url: `${SITE_URL}/services/search-engine-optimization`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$3,500 - $15,000+/mo",
    description:
      "Technical SEO agency specializing in Core Web Vitals optimization, site speed, crawlability, indexation management, structured data implementation, JavaScript rendering, and mobile-first indexing for service businesses in NYC, NJ, Long Island, and Westchester. Built on Next.js.",
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
      latitude: "40.7580",
      longitude: "-73.9855",
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "147",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Technical SEO Services",
    description:
      "Comprehensive technical SEO services including Core Web Vitals optimization, site speed tuning, crawlability audits, indexation management, structured data implementation, JavaScript rendering optimization, mobile-first indexing compliance, redirect chain cleanup, crawl budget analysis, and log file analysis for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/search-engine-optimization`,
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
      name: "Technical SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Core Web Vitals Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Site Speed Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Crawlability & Indexation Audit" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Structured Data & Schema Markup Implementation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "JavaScript Rendering Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Mobile-First Indexing Compliance" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Redirect Chain & Redirect Loop Cleanup" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Crawl Budget Analysis & Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Log File Analysis" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "XML Sitemap & Robots.txt Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Canonical Tag Implementation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "HTTPS & Security Optimization" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Our 6-Step Technical SEO Process",
    description: "Our proven 6-step technical SEO process for building search engine infrastructure that delivers rankings, speed, and scalability for NYC service businesses.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Comprehensive Crawl Audit",
        text: "We crawl your entire website using Screaming Frog, Sitebulb, and proprietary tools to identify every technical issue — broken links, redirect chains, orphan pages, duplicate content, missing canonical tags, crawl errors, thin pages, and server response code problems. We cross-reference this data with Google Search Console and server log files to build a complete picture of how search engines interact with your site. This audit typically takes 15 to 25 hours and produces a prioritized action plan with specific fixes ranked by SEO impact.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Core Web Vitals & Site Speed Optimization",
        text: "We analyze Largest Contentful Paint, Interaction to Next Paint, and Cumulative Layout Shift across every template on your site using field data from CrUX and lab data from Lighthouse. We eliminate render-blocking resources, optimize critical rendering path, implement lazy loading, compress and convert images to WebP or AVIF, minify CSS and JavaScript, configure CDN edge caching, and implement server-side rendering or static generation for maximum performance. Our target is sub-1-second load times and green scores across all three Core Web Vitals metrics.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Site Architecture & Internal Linking",
        text: "We redesign your site architecture to ensure every important page is reachable within 3 clicks from the homepage. We build hub-and-spoke internal linking structures that distribute PageRank efficiently, implement breadcrumb navigation with BreadcrumbList schema, create XML sitemaps segmented by content type, and ensure URL structures follow a logical hierarchy. For programmatic SEO deployments with thousands of pages, we build automated internal linking systems that connect service pages to location pages bidirectionally.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Schema Markup & Structured Data Implementation",
        text: "We implement comprehensive JSON-LD structured data across every page — LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, HowTo, Organization, and WebSite schemas. Every schema block is validated against Google's Rich Results Test and Schema.org specifications. We monitor for structured data errors in Google Search Console and fix them within 24 hours. Properly implemented structured data triggers rich results in Google, powers AI search recommendations, and gives search engines the explicit signals they need to understand your business.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Indexation Management & Crawl Budget Optimization",
        text: "We review every page's indexation status in Google Search Console, identify pages that are crawled but not indexed, diagnose the reasons (thin content, duplicate content, crawl budget waste), and implement solutions. We configure robots.txt to block non-essential pages from crawling, submit optimized XML sitemaps, implement canonical tags to consolidate duplicate URLs, clean up redirect chains, and ensure crawl budget is spent on your most valuable pages. For large sites, we use log file analysis to see exactly how Googlebot allocates crawl resources.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Continuous Monitoring & Iteration",
        text: "Technical SEO is not a one-time fix. We set up continuous monitoring for Core Web Vitals regressions, crawl errors, indexation drops, structured data validation failures, and server response code anomalies. We run quarterly full-site crawls, weekly metric checks, and real-time alerts for critical issues. Every month, you receive a technical health report covering all key metrics with explanations and next steps. When Google releases algorithm updates, we assess impact and adjust strategy immediately.",
      },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "ProfessionalService",
      name: "The NYC SEO — Technical SEO Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Michael T." },
    reviewBody:
      "Our WordPress site was loading in 6 seconds and failing every Core Web Vitals metric. The NYC SEO migrated us to Next.js, implemented structured data across all 800+ pages, and fixed every crawl issue we had. Within 3 months our page speed was under 1 second, indexation went from 60% to 98%, and we started ranking for keywords we had been stuck on page 3 for. The technical SEO work alone was worth the investment.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Technical SEO", url: "/services/search-engine-optimization" },
  ];

  return (
    <div className="text-white">
      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left — Copy */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                NYC Technical SEO Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Technical SEO
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Infrastructure Search Engines Demand
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Your content and backlinks mean nothing if search engines cannot crawl, render, and index your pages efficiently. Technical SEO is the infrastructure layer — the foundation that determines whether Google, Bing, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                can actually find and understand your website. We optimize Core Web Vitals, site speed, crawlability, indexation, structured data, JavaScript rendering, mobile-first compliance, and every other technical signal that affects rankings. Built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                — not WordPress — because technical SEO starts at the code level.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Core Web Vitals & sub-1-second page loads",
                "Crawlability & indexation management",
                "XML sitemaps & robots.txt optimization",
                "Structured data / schema markup (7+ types)",
                "JavaScript rendering & SSR optimization",
                "Mobile-first indexing compliance",
                "Redirect chain & canonical tag cleanup",
                "Crawl budget analysis & log file audits",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#141414] p-4">
                  <span className="text-green-400">&#10003;</span>
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: WHAT IS TECHNICAL SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Technical SEO and Why Does It Matter More Than You Think?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Technical SEO is the practice of optimizing the infrastructure and architecture of your website so that search engines can efficiently crawl, render, index, and rank your pages. While{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
              focuses on content and keywords, and{" "}
              <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">off-page SEO</Link>{" "}
              focuses on backlinks and authority, technical SEO focuses on the foundation everything else is built on. It is the plumbing and wiring of your digital presence — invisible to users when done right, catastrophic when done wrong.
            </p>
            <p>
              Technical SEO encompasses site speed optimization, Core Web Vitals (Largest Contentful Paint, Interaction to Next Paint, and Cumulative Layout Shift), crawlability, indexation management, XML sitemap configuration, robots.txt directives, canonical tag implementation, structured data and schema markup, JavaScript rendering, mobile-first indexing compliance, HTTPS security, redirect chain cleanup, crawl budget optimization, log file analysis, server response code management, hreflang for multilingual content, and pagination handling. Every single one of these elements affects how search engines interact with your website — and by extension, how you rank. It is the discipline that connects your{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
              efforts and your{" "}
              <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">off-page link building</Link>{" "}
              into a cohesive system that search engines can actually interpret.
            </p>
            <p>
              Here is the problem most{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC service businesses</Link>{" "}
              face: they build their website on WordPress with a page builder like Elementor, Divi, or WPBakery, stack 20 to 30 plugins on top of it, and then wonder why their site loads in 4 to 7 seconds, fails Core Web Vitals, and has hundreds of crawl errors in Google Search Console. WordPress was designed as a blogging platform in 2003. It was never engineered for the performance, scalability, and technical precision that modern search engines demand. Every plugin you install adds JavaScript, CSS, and database queries. Every page builder wraps your content in layers of unnecessary div elements. Every shared hosting plan throttles your server response time.
            </p>
            <p>
              We build on{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
              — a React-based framework that generates static HTML at build time, serves pages from a global CDN edge network, automatically optimizes images, handles code splitting, and gives us complete control over every meta tag, canonical URL, schema block, and server response at the code level. The result is a website that loads in under 1 second, passes every Core Web Vitals metric, renders instantly for search engine crawlers, and scales to tens of thousands of pages without performance degradation. This is not a marginal improvement over WordPress — it is a fundamentally different approach to building websites, and it is the reason our clients consistently outperform competitors on technical SEO metrics. When you pair this infrastructure with a clear{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              and ongoing{" "}
              <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">analytics and reporting</Link>, the compounding effect on rankings is significant.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: OUR PROCESS (HowTo)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step Technical SEO Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every technical SEO engagement follows this proven framework — adapted to your site&apos;s current state, your platform, and the competitive landscape of your market. It integrates directly with our broader{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy and roadmapping</Link>{" "}
            process so technical fixes are always prioritized by business impact.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Comprehensive Crawl Audit",
                body: "We start by crawling your entire website using Screaming Frog, Sitebulb, and proprietary analysis tools. We identify every technical issue — broken internal and external links, redirect chains and loops, orphan pages with no internal links pointing to them, duplicate content across multiple URLs, missing or misconfigured canonical tags, crawl errors reported in Google Search Console, thin pages with insufficient content, incorrect server response codes (soft 404s, improper 302s), missing or invalid structured data, and pages blocked from crawling that should be accessible. We cross-reference crawl data with Google Search Console coverage reports and, for enterprise clients, raw server log files to see exactly how Googlebot interacts with your site. This audit typically takes 15 to 25 hours and produces a prioritized action plan with every fix ranked by its potential SEO impact. Nothing gets missed because we do not rely on a single tool — we triangulate data from multiple sources to build a complete picture.",
              },
              {
                step: "02",
                title: "Core Web Vitals & Site Speed Optimization",
                body: "We analyze all three Core Web Vitals metrics — Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS) — across every page template on your site using both field data from the Chrome User Experience Report (CrUX) and lab data from Google Lighthouse. We identify the specific bottlenecks causing slow load times and poor interactivity: render-blocking CSS and JavaScript, unoptimized images (format, dimensions, compression), excessive DOM size, third-party scripts blocking the main thread, layout shifts from dynamically injected content, slow server response times (Time to First Byte), and inefficient caching policies. Then we fix them. We implement critical CSS inlining, defer non-essential JavaScript, convert images to next-gen formats (WebP, AVIF), configure CDN edge caching with proper cache headers, enable Brotli compression, implement lazy loading for below-the-fold content, and optimize the critical rendering path so the browser can paint meaningful content within 500 milliseconds. On Next.js, most of these optimizations are handled at the framework level — which is exactly why we build on it.",
              },
              {
                step: "03",
                title: "Site Architecture & Internal Linking",
                body: "Site architecture determines how PageRank flows through your website and how efficiently search engines can discover your content. We redesign your site architecture so that every important page is reachable within 3 clicks from the homepage. We build hub-and-spoke internal linking structures where service hub pages link down to individual service pages, which link across to location pages, which link back up to hubs. This creates a web of topical relevance that search engines can follow and reward with higher rankings. We implement breadcrumb navigation with BreadcrumbList schema markup, create segmented XML sitemaps (one for service pages, one for location pages, one for blog content), optimize URL structures to follow a clean, logical hierarchy, and ensure no important page is more than 3 levels deep in your site architecture. For clients using our programmatic SEO systems to generate hundreds or thousands of pages, we build automated internal linking algorithms that create contextual links between related pages without manual intervention.",
              },
              {
                step: "04",
                title: "Schema Markup & Structured Data Implementation",
                body: "Structured data is the language search engines and AI platforms use to understand your content. We implement comprehensive JSON-LD structured data across every page on your site — not just the homepage. Every page gets the schema types relevant to its content: LocalBusiness schema with your NAP (name, address, phone), service area, and business hours. Service schema with OfferCatalog listing every service you provide. FAQPage schema for FAQ content that triggers rich results in Google. Review and AggregateRating schema that displays star ratings in search results. BreadcrumbList schema for navigation context. HowTo schema for process-oriented content. Organization schema establishing your brand entity. Every schema block is hand-validated against Google's Rich Results Test and the Schema.org specification. We monitor structured data in Google Search Console for validation errors and fix issues within 24 hours. This level of structured data implementation is what separates businesses that get rich results in Google from businesses that get plain blue links — and it is what AI platforms like ChatGPT and Perplexity rely on to recommend your business.",
              },
              {
                step: "05",
                title: "Indexation Management & Crawl Budget Optimization",
                body: "Getting pages crawled is step one. Getting them indexed is step two — and it is where most technical SEO strategies fall apart. We review every page's indexation status in Google Search Console, identify pages that are crawled but not indexed (and diagnose why — thin content, duplicate content, crawl budget competition), and implement solutions. We configure robots.txt directives to prevent Googlebot from wasting crawl budget on non-essential pages (admin panels, filtered URLs, internal search results). We submit optimized XML sitemaps that include only indexable pages with proper lastmod dates. We implement self-referencing canonical tags on every page and cross-domain canonicals where appropriate. We clean up redirect chains — consolidating multi-hop redirects into single 301s to preserve PageRank and reduce latency. For large-scale sites with thousands of pages, we use server log file analysis to see exactly how Googlebot allocates its crawl budget, which pages get crawled most frequently, and which pages are being ignored. This ground-truth data is something Google Search Console does not provide, and it is essential for optimizing crawl efficiency at scale.",
              },
              {
                step: "06",
                title: "Continuous Monitoring & Iteration",
                body: "Technical SEO is never set-and-forget. Google updates its algorithms dozens of times per year. Developers push code that inadvertently blocks pages from indexing. CMS changes create new redirect chains. Third-party scripts start loading slowly. New pages get published without proper canonical tags or schema markup. We set up continuous monitoring for every critical technical SEO metric — Core Web Vitals regressions, crawl error spikes, indexation drops, structured data validation failures, server response code anomalies, and sitemap submission status. We run full-site crawls quarterly, weekly spot-checks on key metrics, and real-time alerts for critical issues that need immediate attention. Every month, you receive a detailed technical health report covering all key metrics with plain-English explanations of what changed, why it matters, and what we are doing about it. When Google releases a major algorithm update, we assess its impact on your site within 48 hours and adjust strategy accordingly.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0080FE] text-lg font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{item.title}</h3>
                  <p className="mt-3 text-zinc-300 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: WHAT'S INCLUDED
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Technical SEO Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is part of our technical SEO engagements. No hidden fees. No vague promises. Every fix is documented and verifiable.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Crawlability & Site Architecture",
                items: [
                  "Full-site crawl audit (Screaming Frog + Sitebulb)",
                  "Broken link identification & repair",
                  "Orphan page detection & internal linking",
                  "URL structure optimization",
                  "XML sitemap creation & submission",
                  "Robots.txt configuration & testing",
                  "Crawl depth analysis (3-click rule)",
                ],
              },
              {
                title: "Site Speed & Core Web Vitals",
                items: [
                  "Largest Contentful Paint (LCP) optimization",
                  "Interaction to Next Paint (INP) optimization",
                  "Cumulative Layout Shift (CLS) elimination",
                  "Render-blocking resource removal",
                  "Image optimization (WebP/AVIF conversion)",
                  "CDN edge caching configuration",
                  "Critical CSS inlining & JS deferral",
                ],
              },
              {
                title: "Structured Data & Schema",
                items: [
                  "LocalBusiness schema with full NAP",
                  "Service schema with OfferCatalog",
                  "FAQPage schema for rich results",
                  "Review & AggregateRating schema",
                  "BreadcrumbList schema",
                  "HowTo schema for process content",
                  "Organization & WebSite schema",
                  "Schema validation & error monitoring",
                ],
              },
              {
                title: "Indexation & Crawl Budget",
                items: [
                  "Indexation status audit (GSC coverage report)",
                  "Crawled-but-not-indexed diagnosis",
                  "Canonical tag audit & implementation",
                  "Redirect chain & loop cleanup",
                  "Soft 404 identification & resolution",
                  "Crawl budget waste elimination",
                  "Log file analysis (enterprise clients)",
                ],
              },
              {
                title: "Mobile & Rendering",
                items: [
                  "Mobile-first indexing compliance audit",
                  "Mobile page speed optimization",
                  "Viewport & tap target configuration",
                  "Content parity check (mobile vs. desktop)",
                  "JavaScript rendering assessment",
                  "Server-side rendering (SSR) implementation",
                  "Static site generation (SSG) for performance",
                ],
              },
              {
                title: "Security & Infrastructure",
                items: [
                  "HTTPS migration & mixed content cleanup",
                  "SSL/TLS certificate monitoring",
                  "Server response code audit (200/301/302/404/500)",
                  "Hreflang implementation (multilingual sites)",
                  "Pagination handling (rel=next/prev alternatives)",
                  "Security headers configuration",
                  "Uptime & server response time monitoring",
                ],
              },
            ].map((category) => (
              <div key={category.title} className="rounded-2xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-[#0080FE]">{category.title}</h3>
                <ul className="mt-4 space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: WHO THIS IS FOR
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Who Needs Technical SEO Services</h2>
          <p className="mt-4 text-zinc-400">
            Technical SEO matters for any business that depends on organic search for leads. If your site is slow, poorly indexed, or built on a platform that limits your technical capabilities, these services are for you.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { name: "Plumbers & Pipe Fitters", href: "/plumber" },
              { name: "Electricians", href: "/electrician" },
              { name: "HVAC Contractors", href: "/hvac" },
              { name: "Roofers", href: "/roofer" },
              { name: "General Contractors", href: "/general-contractor" },
              { name: "Personal Injury Lawyers", href: "/personal-injury-lawyer" },
              { name: "Dentists & Oral Surgeons", href: "/dentist" },
              { name: "Therapists & Counselors", href: "/therapist" },
              { name: "House Cleaning Services", href: "/house-cleaner" },
              { name: "Landscapers & Tree Services", href: "/landscaper" },
              { name: "Painters", href: "/painter" },
              { name: "Locksmiths", href: "/locksmith" },
            ].map((industry) => (
              <Link
                key={industry.name}
                href={industry.href}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0A0A0A] p-4 transition-colors hover:border-[#0080FE] hover:bg-[#0A0A0A]/80"
              >
                <span className="text-[#0080FE]">&rarr;</span>
                <span className="text-sm font-medium text-zinc-300">{industry.name}</span>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            We serve over{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170 service categories</Link>{" "}
            across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            in the NYC metro area. Technical SEO is a universal need — if search engines cannot crawl and index your site efficiently, nothing else matters. Whether you have a 20-page brochure site or a 5,000-page programmatic platform, your technical foundation determines your ranking ceiling. Pair it with{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            and{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile optimization</Link>{" "}
            to dominate both organic and map pack results in your service area.
          </p>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 7: NEXT.JS vs WORDPRESS FOR TECHNICAL SEO
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Next.js vs. WordPress: Technical SEO Comparison</h2>
          <p className="mt-4 text-zinc-400">
            The platform you build on determines your technical SEO ceiling. Here is why we build on Next.js and why WordPress consistently falls short on the metrics that matter most.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Page Speed & Core Web Vitals</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                The average WordPress site built with Elementor or Divi loads in 3.5 to 7 seconds on mobile. Even with caching plugins like WP Rocket, W3 Total Cache, or LiteSpeed, most WordPress sites struggle to pass Core Web Vitals because the fundamental architecture — PHP-generated HTML, dozens of plugin-injected scripts, render-blocking CSS from page builders — creates bottlenecks that caching cannot fully solve. Next.js generates static HTML at build time, serves it from Vercel&apos;s global edge network (over 100 points of presence worldwide), automatically code-splits JavaScript so only the code needed for each page is loaded, and optimizes images on-the-fly with built-in next/image. Our sites consistently load in under 1 second and pass all three Core Web Vitals metrics without any caching plugins, CDN add-ons, or performance hacks.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Crawlability & JavaScript Rendering</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                WordPress serves fully-rendered HTML (which is good for crawlability), but the HTML it generates is bloated with unnecessary wrapper divs, inline styles, and plugin-injected code that increases DOM size and confuses crawlers. Page builders like Elementor generate 3x to 5x more HTML than necessary for the same content. Single Page Applications (SPAs) built with React, Vue, or Angular have the opposite problem — they serve minimal HTML and rely on client-side JavaScript to render content, which Googlebot handles through a delayed two-phase indexing process. Next.js solves both problems. Server-side rendering (SSR) and static site generation (SSG) deliver clean, semantic, fully-rendered HTML to crawlers instantly — no rendering delay, no bloated markup, no JavaScript dependency for content visibility. Every page is immediately crawlable by every search engine, including Bing and DuckDuckGo which have more limited JavaScript rendering capabilities than Google.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Structured Data & Meta Tag Control</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                WordPress relies on plugins like Yoast or Rank Math for SEO meta tags and basic structured data. These plugins work at a surface level — they let you set title tags and meta descriptions per page — but they give you very limited control over schema markup customization, canonical tag logic, hreflang implementation, and dynamic meta generation for programmatic pages. When you need to implement 7+ schema types per page with dynamic data, generate canonical tags based on custom URL logic, or create meta tags that pull from a database for thousands of pages, plugins break down. In Next.js, we write schema markup directly into the page component. Every meta tag, every canonical URL, every schema block is generated at the code level with full type safety through TypeScript. There is no plugin abstraction layer limiting what we can do. We have complete, granular control over every technical SEO element on every page.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Custom Code vs. Page Builders</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Page builders like Elementor, Divi, Beaver Builder, and WPBakery exist because most agencies and business owners cannot write code. They trade technical control for convenience. The trade-off is real: page builders generate 40 to 100+ unnecessary HTTP requests per page, inject 200KB to 500KB of unused CSS, wrap content in nested div structures that increase DOM complexity, and create render-blocking resource chains that destroy page speed. Custom code built on Next.js with{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Tailwind CSS</Link>{" "}
                produces zero unused CSS (Tailwind purges unused styles at build time), minimal HTTP requests, semantic HTML structure, and complete control over the critical rendering path. This is not a philosophical preference — it is a measurable, quantifiable advantage that shows up in Core Web Vitals scores, PageSpeed Insights results, and ultimately, search rankings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: RESULTS / CASE STUDY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Technical SEO Results That Speak for Themselves</h2>
          <p className="mt-4 text-zinc-400">
            We measure technical SEO by the metrics that actually affect rankings — not vanity dashboards. Here is what our technical SEO work produces.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "98+", label: "PageSpeed Insights Score" },
              { stat: "< 0.8s", label: "Average LCP (Largest Contentful Paint)" },
              { stat: "98%", label: "Pages Indexed (vs. 60% Before)" },
              { stat: "0", label: "Core Web Vitals Failures" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#141414] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "54,000+", label: "Pages Built & Indexed" },
              { stat: "< 200ms", label: "Time to First Byte (TTFB)" },
              { stat: "7+", label: "Schema Types Per Page" },
              { stat: "0", label: "Redirect Chains Remaining" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#141414] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;Our WordPress site was a technical nightmare — 6-second load times, failing Core Web Vitals, 40% of our pages not indexed, redirect chains everywhere. The NYC SEO migrated us to Next.js, implemented structured data across all 800+ pages, cleaned up every crawl issue, and got our page speed under 1 second. Within 3 months, indexation went from 60% to 98% and we started ranking for keywords we had been stuck on page 3 for over a year. The technical SEO work alone was worth the entire investment.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Michael T., Multi-Location HVAC Company, Queens & Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We had no idea our site had 47 redirect chains, 200+ broken internal links, and zero structured data. Google was wasting half its crawl budget on pages that did not matter. The NYC SEO cleaned everything up, implemented schema markup on every page, rebuilt our XML sitemaps, and set up monitoring so nothing breaks again. Our organic traffic increased 140% in 6 months — and 90% of that improvement came from technical fixes, not new content.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Sarah L., Personal Injury Law Firm, Manhattan</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Technical SEO Mistakes That Are Killing Your Rankings
          </h2>
          <p className="mt-4 text-zinc-400">
            We see these same technical issues on nearly every WordPress site we audit. Each one silently undermines your ability to rank — and most businesses have no idea they exist.
          </p>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Failing Core Web Vitals on every page template",
                fix: "Most WordPress sites with page builders fail LCP, INP, or CLS on mobile. These are direct ranking factors. We rebuild on Next.js with automatic image optimization, code splitting, and static generation that passes all three metrics on every page — no caching plugins needed.",
              },
              {
                mistake: "No structured data on any page — or using broken schema",
                fix: "We regularly audit sites that have zero JSON-LD schema or, worse, invalid schema generated by misconfigured plugins. We implement 7+ schema types per page (LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, HowTo) with full validation against Google's Rich Results Test. This triggers rich results and feeds AI search platforms the data they need to recommend your business.",
              },
              {
                mistake: "Redirect chains that waste crawl budget and dilute PageRank",
                fix: "Every redirect in a chain adds 100 to 300ms of latency and loses approximately 15% of PageRank. A 3-hop chain can lose 40%+ of a page's authority. We audit every redirect on your site, consolidate chains into single 301 redirects, and monitor for new chains that develop from CMS updates or URL changes.",
              },
              {
                mistake: "Missing or misconfigured canonical tags causing duplicate content",
                fix: "Without proper canonical tags, search engines may split ranking signals across duplicate URLs — www vs. non-www, HTTP vs. HTTPS, parameterized URLs, paginated content. We implement self-referencing canonical tags on every page and cross-domain canonicals where appropriate to consolidate authority on the correct URL.",
              },
              {
                mistake: "XML sitemaps that include noindexed, redirected, or 404 pages",
                fix: "Your XML sitemap should only include pages you want indexed — pages that return a 200 status code, have a canonical tag pointing to themselves, and are not blocked by robots.txt. We regularly find sitemaps with 30% to 50% invalid URLs. We rebuild sitemaps from scratch, segment them by content type, and submit them with proper lastmod dates.",
              },
              {
                mistake: "Robots.txt blocking important pages or allowing crawl waste",
                fix: "We have seen robots.txt files that accidentally block entire directories of service pages, CSS files needed for rendering, or JavaScript files that Googlebot needs to process page content. On the flip side, many sites allow crawling of admin panels, search result pages, and tag archives that waste crawl budget. We audit and rewrite robots.txt with precision.",
              },
              {
                mistake: "No server-side rendering — relying entirely on client-side JavaScript",
                fix: "Single Page Applications that render content exclusively with client-side JavaScript face delayed indexing (days to weeks) and risk content not being indexed at all by non-Google search engines. We implement server-side rendering or static site generation so every page delivers fully-rendered HTML to crawlers instantly.",
              },
              {
                mistake: "Ignoring mobile-first indexing compliance",
                fix: "Google uses your mobile site for indexing and ranking. If your mobile version has less content, smaller images, or a worse experience than desktop, your rankings suffer. We ensure full content parity between mobile and desktop, optimize tap targets, configure viewport settings, and achieve sub-1-second mobile page loads.",
              },
              {
                mistake: "Hundreds of broken internal links creating crawl dead ends",
                fix: "Broken internal links waste crawl budget, create dead ends for users, and leak PageRank into nowhere. We crawl your entire site to identify every broken link — internal, external, image, and resource — and fix or redirect them. We then set up monitoring to catch new broken links as they appear.",
              },
              {
                mistake: "Never analyzing server logs to understand real crawler behavior",
                fix: "Google Search Console shows you what Google chose to report. Server logs show you what actually happened — every Googlebot request, every response code, every page crawled, and every page ignored. For sites with thousands of pages, log file analysis reveals crawl patterns that no other tool can detect. We use log file analysis for enterprise clients and programmatic SEO deployments to optimize crawl efficiency at scale.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-sm font-bold text-red-400">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.mistake}</h3>
                  <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{item.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Technical SEO Pricing for NYC Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes directly into auditing, fixing, implementing, and monitoring the technical infrastructure that determines whether your site can rank. 20+ years of results behind every engagement.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location businesses that need a solid technical foundation and ongoing monitoring.",
                features: [
                  "Full technical SEO audit (15+ hours)",
                  "Core Web Vitals optimization",
                  "Site speed optimization (sub-1s target)",
                  "Structured data implementation (5+ types)",
                  "XML sitemap & robots.txt optimization",
                  "Canonical tag audit & implementation",
                  "Redirect chain cleanup",
                  "Monthly technical health reporting",
                  "Hosting included",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-location businesses with hundreds of pages that need enterprise-level technical optimization.",
                features: [
                  "Everything in Foundation, plus:",
                  "Advanced crawl budget optimization",
                  "Server log file analysis",
                  "JavaScript rendering optimization",
                  "Mobile-first indexing audit & fixes",
                  "7+ schema types per page",
                  "Programmatic page technical optimization",
                  "Weekly metric monitoring & alerts",
                  "Bi-weekly strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses with thousands of pages that need the highest level of technical SEO infrastructure.",
                features: [
                  "Everything in Growth, plus:",
                  "Full Next.js migration from WordPress",
                  "Custom structured data architecture",
                  "Automated internal linking systems",
                  "Enterprise crawl budget management",
                  "Real-time technical SEO monitoring",
                  "Hreflang & internationalization setup",
                  "Dedicated technical SEO engineer",
                  "Weekly strategy calls",
                ],
                cta: "Talk to Us",
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl border p-8 ${
                  plan.featured
                    ? "border-[#0080FE] bg-[#0080FE]/5 ring-1 ring-[#0080FE]"
                    : "border-zinc-700 bg-[#141414]"
                }`}
              >
                {plan.featured && (
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#0080FE]">Most Popular</p>
                )}
                <h3 className="text-2xl font-bold">{plan.tier}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#0080FE]">{plan.price}</span>
                  <span className="text-zinc-400">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold ${
                    plan.featured
                      ? "bg-[#0080FE] text-white hover:bg-[#0070E0]"
                      : "border border-zinc-600 text-white hover:border-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            All plans include a free initial technical SEO audit. One-time audit-only engagements available.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            including project-based and hourly rates, or{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            for a custom quote.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose Us for Technical SEO</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Code-Level Control Over Every Technical Element</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most SEO agencies are limited by the platform their clients are on. They install plugins, tweak settings, and hope for the best. We build at the code level. Every meta tag, every canonical URL, every schema block, every server response, every internal link is controlled through our codebase — not through a plugin&apos;s configuration panel. When Google changes how it handles canonical tags or introduces a new structured data type, we implement the change in code the same week. Plugin-dependent agencies wait months for the plugin developer to update. This level of control is also what enables our{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                work — structured data and clean architecture are exactly what AI platforms like ChatGPT and Perplexity use to recommend businesses. This is the difference between reacting to changes and controlling them.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Next.js Expertise — Not WordPress Workarounds</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not patch WordPress with performance plugins and call it technical SEO. We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                because it solves technical SEO problems at the architecture level. Server-side rendering eliminates JavaScript rendering delays. Static generation produces sub-200ms Time to First Byte. Built-in image optimization eliminates LCP issues. Automatic code splitting keeps bundle sizes minimal. Our tech stack — Next.js, Vercel, Supabase, Tailwind CSS — is purpose-built for performance, scalability, and SEO. We also build custom{" "}
                <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agents</Link>{" "}
                and{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">CRM systems</Link>{" "}
                on this same stack. No WordPress. No page builders. No plugin dependencies.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">54,000+ Pages Built and Indexed</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not talk about technical SEO in theory — we have built and indexed over 54,000 pages across our platform. Every page passes Core Web Vitals. Every page has valid structured data. Every page loads in under 1 second. Every page is properly canonicalized. This is{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic SEO</Link>{" "}
                at scale, powered by{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI content generation</Link>{" "}
                and a{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing strategy</Link>{" "}
                — and it only works because the technical SEO infrastructure is bulletproof. When you work with us, you get the same infrastructure behind your site.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Sub-1-Second Load Times — Every Page, Every Time</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Speed is not aspirational for us — it is the baseline. Every site we build loads in under 1 second on mobile. Not the homepage. Not a cached version. Every page. This is possible because we control the entire stack: the framework (Next.js), the hosting (Vercel edge network), the styling (Tailwind CSS with zero unused styles), the images (automatic WebP/AVIF conversion with responsive srcset), and the rendering strategy (static generation for content pages, server-side rendering for dynamic pages). The result is a website that is faster than 99% of your competitors — and Google&apos;s ranking algorithm notices. Speed also feeds directly into{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">brand perception</Link>{" "}
                — users trust fast sites more, and a sub-1-second experience sets the tone for every interaction with your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            Technical SEO is the foundation — but it works best as part of a complete{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
            and web development strategy. Whether you need a{" "}
            <Link href="/services/marketing-manager" className="text-[#5CB8FF] hover:text-[#8DD0FF]">fractional marketing manager</Link>{" "}
            to coordinate it all or{" "}
            <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing consulting</Link>{" "}
            to guide your team, these services complement and amplify your technical SEO investment.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service SEO including on-page, off-page, local, and AI search optimization." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic framework that prioritizes every technical fix and content initiative." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered for speed, scalability, and technical SEO from day one." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, Gemini, and other AI platforms." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Local map pack domination and Google Maps optimization." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate thousands of technically optimized pages at scale." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content built on a technically sound foundation." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track technical health, rankings, traffic, and lead attribution across all channels." },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-[#0080FE]">{service.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 13: SERVICE AREAS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Technical SEO Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide technical SEO services to businesses across the entire NYC metropolitan area — every borough, every neighborhood, and surrounding suburbs in New Jersey, Long Island, and Westchester.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                region: "Manhattan",
                areas: [
                  { name: "Midtown", href: "/hvac/midtown" },
                  { name: "Upper East Side", href: "/plumber/upper-east-side" },
                  { name: "Upper West Side", href: "/electrician/upper-west-side" },
                  { name: "Chelsea", href: "/general-contractor/chelsea" },
                  { name: "Financial District", href: "/personal-injury-lawyer/financial-district" },
                ],
              },
              {
                region: "Brooklyn",
                areas: [
                  { name: "Brooklyn Heights", href: "/plumber/brooklyn-heights" },
                  { name: "Park Slope", href: "/electrician/park-slope" },
                  { name: "Williamsburg", href: "/painter/williamsburg" },
                  { name: "DUMBO", href: "/general-contractor/dumbo" },
                  { name: "Bushwick", href: "/house-cleaner/bushwick" },
                ],
              },
              {
                region: "Queens",
                areas: [
                  { name: "Astoria", href: "/hvac/astoria" },
                  { name: "Long Island City", href: "/electrician/long-island-city" },
                  { name: "Flushing", href: "/dentist/flushing" },
                  { name: "Jackson Heights", href: "/personal-injury-lawyer/jackson-heights" },
                  { name: "Forest Hills", href: "/landscaper/forest-hills" },
                ],
              },
              {
                region: "Bronx, Staten Island & Beyond",
                areas: [
                  { name: "Riverdale", href: "/roofer/riverdale" },
                  { name: "Staten Island", href: "/general-contractor/staten-island" },
                  { name: "Hoboken, NJ", href: "/plumber/hoboken" },
                  { name: "Garden City, LI", href: "/electrician/garden-city" },
                  { name: "White Plains", href: "/hvac/white-plains" },
                ],
              },
            ].map((region) => (
              <div key={region.region}>
                <h3 className="text-lg font-semibold text-[#EFF70A]">{region.region}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {region.areas.map((area) => (
                    <Link
                      key={area.name}
                      href={area.href}
                      className="rounded-full border border-zinc-700 bg-[#141414] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                    >
                      {area.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            Browse all{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            we cover across the NYC metro area. Technical SEO services are available for businesses in any industry and any location within our service area.{" "}
            <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Request a partnership</Link>{" "}
            to get started with a free technical audit of your site.
          </p>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 14: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Technical SEO</h2>
          <p className="mt-4 text-zinc-400">
            Detailed answers to the most common technical SEO questions we hear from NYC service businesses.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 15: FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
