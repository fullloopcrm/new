import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "SEO Automation & Programmatic SEO NYC",
  description:
    "SEO automation and programmatic page generation for NYC businesses. 54,000+ pages built. Automated content, internal linking, and schema at scale.",
  keywords: [
    "SEO automation NYC",
    "programmatic SEO agency",
    "programmatic page generation",
    "automated internal linking",
    "dynamic schema markup",
    "sitemap automation",
    "content generation pipeline",
    "SEO API integrations",
    "automated SEO reporting",
    "workflow automation SEO",
    "programmatic SEO New York",
    "SEO at scale",
    "bulk page generation SEO",
    "automated structured data",
    "SEO automation agency near me",
    "Full Loop CRM automation",
  ],
  openGraph: {
    title: "SEO Automation & Programmatic SEO NYC",
    description:
      "SEO automation and programmatic page generation. 54,000+ pages built. Automated content, linking, and schema at scale.",
    url: `${SITE_URL}/services/automation`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/automation` },
};

const faqs = [
  {
    q: "What is programmatic SEO and how does it work?",
    a: "Programmatic SEO uses data, templates, and automation to generate hundreds or thousands of unique, optimized web pages at scale. Instead of manually writing each page, you define a template and feed it structured data — service types, neighborhoods, pricing, reviews, FAQs — and the system generates a unique page for every combination. For example, a plumber serving 50 neighborhoods with 8 services gets 400 unique pages, each targeting a real search query like 'emergency plumber Park Slope' or 'water heater installation Astoria.' Every page includes unique content, proper schema markup, internal links, and meta tags. We built thenycseo.com this way — 172 services multiplied by 318 neighborhoods equals 54,000+ pages, all generated programmatically, all indexed, all ranking.",
  },
  {
    q: "How much does SEO automation cost?",
    a: "Project-based automation engagements range from $10,000 to $35,000 depending on scope, complexity, and the number of integrations required. This covers programmatic page generation systems, automated internal linking, dynamic schema markup, sitemap automation, content pipelines, and API integrations. For ongoing automation as part of a broader SEO campaign, automation is included in our Growth tier at $7,500 per month and our Domination tier at $15,000+ per month. These monthly tiers include continuous optimization, monitoring, and expansion of your automated systems alongside full SEO services.",
  },
  {
    q: "How many pages can you generate programmatically?",
    a: "There is no technical limit. We have built platforms with 54,000+ pages that load in under 1 second each and pass all Core Web Vitals. The real question is how many pages your business needs. A plumber with 8 services across 50 neighborhoods needs 400+ pages. A cleaning company with 12 services across 100 neighborhoods needs 1,200+ pages. A directory platform covering 172 services across 318 neighborhoods needs 54,000+ pages. We build the system to match your market, and it scales infinitely because every page is generated from data, not written by hand.",
  },
  {
    q: "Will Google penalize programmatically generated pages?",
    a: "Not if they are done correctly. Google penalizes thin, duplicate, or spammy auto-generated content — pages that exist only to manipulate rankings with no value to users. Google does not penalize well-structured, unique, useful pages generated from real data. Our programmatic pages include unique content for every page, proper schema markup, contextual internal links, real business data, and genuine value for the searcher. Google has explicitly stated that the method of content creation does not matter — what matters is quality, usefulness, and whether the content serves the user. Our 54,000+ page platform is fully indexed and ranking as proof.",
  },
  {
    q: "What is automated internal linking and why does it matter?",
    a: "Automated internal linking is a system that programmatically creates contextual links between related pages on your website. Instead of manually adding links to every page — which becomes impossible at scale — the system analyzes page content, service categories, geographic relationships, and topical relevance to automatically generate the right links. Internal linking is one of the most powerful and underutilized SEO signals. It distributes page authority across your site, helps search engines discover and understand your content hierarchy, and guides users to related information. At 54,000+ pages, manual internal linking is physically impossible. Automation makes it effortless.",
  },
  {
    q: "What is dynamic schema markup generation?",
    a: "Dynamic schema markup generation automatically creates JSON-LD structured data for every page on your site based on the page content and data. Instead of manually writing schema for each page, the system generates LocalBusiness, Service, FAQPage, BreadcrumbList, Review, AggregateRating, HowTo, Organization, and other schema types automatically. This structured data tells Google and AI search platforms exactly what your page is about, what services you offer, where you operate, and what your reviews say. It powers rich results in Google, helps AI platforms recommend your business, and is nearly impossible to implement manually at scale. We automate it completely.",
  },
  {
    q: "How does sitemap automation work?",
    a: "Sitemap automation generates and updates your XML sitemap automatically every time a page is added, modified, or removed. For a site with 54,000+ pages, manually managing a sitemap is impossible. Our system generates sitemaps dynamically, splits them into sitemap index files when they exceed size limits, includes proper lastmod timestamps, sets priority signals, and submits updates to Google Search Console automatically. This ensures every new page gets discovered and indexed as fast as possible without any manual intervention.",
  },
  {
    q: "What is a content generation pipeline?",
    a: "A content generation pipeline is an automated workflow that takes raw data and transforms it into publish-ready, SEO-optimized content. Our pipelines pull data from APIs, databases, and spreadsheets, then use templates, business rules, and AI to generate unique page content — titles, descriptions, body copy, FAQs, CTAs, and meta tags. Every output is unique, on-brand, and optimized for both search engines and AI platforms. The pipeline runs on demand or on a schedule, so new pages can be generated and deployed automatically as new data becomes available.",
  },
  {
    q: "Can you integrate SEO automation with my existing tools and CRM?",
    a: "Yes. We build API integrations with virtually any platform — CRMs, booking systems, review platforms, Google Business Profile, Google Search Console, analytics tools, and custom databases. We also built Full Loop CRM, a complete automation CRM that handles everything from lead generation to review collection. If your existing tools have an API, we can connect them into your SEO automation workflow. If they do not, we can replace them with systems that do.",
  },
  {
    q: "What is Full Loop CRM and how does it relate to SEO automation?",
    a: "Full Loop CRM is a full automation CRM built by our team at Consortium NYC and available at homeservicesbusinesscrm.com. It automates the entire customer lifecycle — from lead capture and qualification, to appointment booking, to follow-up sequences, to review requests and collection. It is customizable for any business type and integrates directly with your website and SEO systems. When someone finds your business through a programmatic page, Full Loop CRM captures that lead, routes it to the right person, automates follow-up, and after the job is complete, automatically requests a review. The review feeds back into your schema markup and local SEO. It is a closed loop — SEO generates the lead, CRM converts it, and the review makes your SEO stronger.",
  },
  {
    q: "How long does it take to build a programmatic SEO system?",
    a: "A basic programmatic page generation system — templates, data pipeline, schema, internal linking, sitemap — can be built and deployed in 2 to 4 weeks. More complex systems with multiple data sources, API integrations, custom content pipelines, and Full Loop CRM integration take 4 to 8 weeks. Enterprise-scale platforms with 50,000+ pages, multi-language support, and complex business logic take 8 to 12 weeks. Once the system is built, adding new pages takes minutes, not months. The upfront investment in automation pays for itself many times over in the first year.",
  },
  {
    q: "Do you build automation for WordPress sites?",
    a: "No. WordPress was not designed for programmatic SEO at scale. It struggles with performance beyond a few hundred pages, has no native support for static generation, and relies on plugins that create technical debt and security vulnerabilities. We build on Next.js because it was designed for exactly this kind of work — static generation of tens of thousands of pages, sub-second load times, perfect Core Web Vitals, server-side rendering when needed, and complete control over every SEO element at the code level. If you are on WordPress and want automation at scale, the first step is migrating to Next.js.",
  },
  {
    q: "What reporting and monitoring comes with SEO automation?",
    a: "Every automation system we build includes automated reporting dashboards that track indexation rates, page performance, schema validation, internal link distribution, sitemap health, crawl errors, and Core Web Vitals across all generated pages. We set up automated alerts for issues — pages dropping from the index, schema validation failures, broken internal links, performance degradation — so problems are caught and fixed before they impact rankings. Monthly reports include AI search visibility metrics and lead attribution tied to specific programmatic pages.",
  },
];

export default function AutomationPage() {
  /* ---------- Schema Markup ---------- */
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    email: "hi@consortiumnyc.com",
    sameAs: ["https://www.consortiumnyc.com", "https://homeservicesbusinesscrm.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "The NYC SEO — SEO Automation & Programmatic Page Generation",
    url: `${SITE_URL}/services/automation`,
    telephone: PHONE,
    priceRange: "$10,000 - $35,000",
    description:
      "SEO automation agency specializing in programmatic page generation, automated internal linking, dynamic schema markup, sitemap automation, content generation pipelines, API integrations, and workflow automation for service businesses in NYC.",
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
    name: "SEO Automation & Programmatic Page Generation",
    description:
      "Comprehensive SEO automation services including programmatic page generation, automated internal linking, dynamic schema markup generation, sitemap automation, content generation pipelines, API integrations, automated reporting, and workflow automation for service businesses.",
    url: `${SITE_URL}/services/automation`,
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
      name: "SEO Automation Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Programmatic Page Generation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Automated Internal Linking" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Dynamic Schema Markup Generation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Sitemap Automation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Generation Pipelines" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "API Integrations" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Automated SEO Reporting" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Workflow Automation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Full Loop CRM Integration" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our SEO Automation Process Works",
    description: "Our proven 6-step process for building scalable SEO automation systems that generate thousands of optimized pages.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Data Architecture & Audit",
        text: "We audit your existing data sources, service offerings, geographic coverage, and competitive landscape. We design the data architecture that will power your programmatic pages — service types, neighborhoods, pricing, FAQs, reviews, and business-specific attributes.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Template Engineering",
        text: "We build dynamic page templates in Next.js that render unique, optimized content for every data combination. Each template includes proper heading hierarchy, semantic HTML, schema markup injection points, internal linking logic, and responsive design.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Content Pipeline Development",
        text: "We build automated content pipelines that transform raw data into publish-ready content. Each pipeline generates unique titles, descriptions, body content, FAQs, CTAs, and meta tags for every page. AI-assisted generation ensures quality at scale.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Schema, Linking & Sitemap Automation",
        text: "We build systems that automatically generate JSON-LD structured data, contextual internal links, and XML sitemaps for every page. Schema types include LocalBusiness, Service, FAQPage, BreadcrumbList, Review, AggregateRating, and Organization.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Build, Deploy & Index",
        text: "We generate all pages through Next.js static generation, deploy to Vercel, and submit sitemaps to Google Search Console. Incremental Static Regeneration ensures pages stay fresh without full rebuilds. We monitor indexation until every page is live.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Monitor, Optimize & Scale",
        text: "We track indexation rates, rankings, traffic, and lead attribution across all programmatic pages. We identify underperforming pages, optimize templates, expand data coverage, and continuously scale the system to capture more search demand.",
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
      name: "The NYC SEO — SEO Automation Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Jason M." },
    reviewBody:
      "We needed location pages for every neighborhood we serve — over 200 combinations. The NYC SEO built us a programmatic system that generated all 200+ pages in under a week. Each page has unique content, schema markup, internal links, and targets a real keyword. Within 3 months, those pages were driving 40% of our total organic traffic. The automation saved us what would have been 6 months of manual work.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Automation", url: "/services/automation" },
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
                Service 07 of 11 &middot; 20+ Years Experience
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                SEO Automation
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  54,000+ Pages. Zero Manual Work.
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                We automate every repetitive, scalable part of SEO so your campaigns grow without limits. Programmatic page generation. Automated internal linking. Dynamic{" "}
                <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">schema markup</Link>. Sitemap management.{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Content generation pipelines</Link>. API integrations. Automated reporting. Full workflow automation — built into your{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js website</Link>{" "}
                at the code level by{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, a premium NYC agency with over 20 years of experience. This is how we built thenycseo.com — 172 services multiplied by 318 neighborhoods, generating 54,000+ unique, optimized pages that would take a traditional agency years to produce manually.
              </p>
              <CTAGroup variant="hero" title="Automate My SEO" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Programmatic page generation (hundreds to tens of thousands)",
                "Automated internal linking across all pages",
                "Dynamic JSON-LD schema markup generation",
                "XML sitemap automation & indexing management",
                "AI-powered content generation pipelines",
                "API integrations (CRM, analytics, review platforms)",
                "Automated SEO reporting & alerting",
                "Full Loop CRM lead-to-review automation",
                "Scheduled builds & zero-downtime deployments",
                "Next.js + Vercel + Supabase stack (no WordPress)",
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
          SECTION 2: WHAT IS SEO AUTOMATION
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is SEO Automation and Why Does Your Business Need It?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              SEO automation is the practice of using code, data, and systems to handle the repetitive, scalable parts of search engine optimization — things that would take a human team hundreds or thousands of hours to do manually. It is the difference between writing 500 location pages by hand over six months and generating all 500 in a single deployment. It is the difference between manually adding internal links to every page as your site grows and having a system that does it automatically, intelligently, contextually, every time a page is created.
            </p>
            <p>
              For{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
              in New York City, automation is not a luxury — it is the only way to compete at the scale the market demands. Consider the math: if you are a{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>{" "}
              offering 10 services across 50 neighborhoods, you need at least 500 unique landing pages to capture every service-plus-location search query your customers use. If you are an{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electrician</Link>{" "}
              covering the entire NYC metro — Manhattan, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, Westchester — the number climbs into the thousands. No human team can write, optimize, link, and maintain that many pages manually. Not at any reasonable cost. Not at any reasonable timeline.
            </p>
            <p>
              That is the problem SEO automation solves. We build systems — not pages. Systems that generate pages from structured data. Systems that create internal links based on topical and geographic relationships. Systems that inject the correct{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">schema markup</Link>{" "}
              into every page automatically. Systems that generate and submit sitemaps without anyone touching a file. Systems that monitor, report, and alert when something needs attention. We built thenycseo.com this way. It is living proof of what automation makes possible: 172 service categories multiplied by 318 neighborhoods, producing 54,000+ unique, fully optimized, fully indexed pages — each with its own content, schema markup, internal links, and meta tags. A traditional agency charging by the page would need years and millions of dollars to produce what our automation system generates in a single build.
            </p>
            <p>
              The technology stack matters. We build on{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
              and deploy on Vercel because this stack was purpose-built for exactly this kind of work. Static Site Generation (SSG) pre-renders every page at build time, producing blazing-fast HTML files that load in under one second. Incremental Static Regeneration (ISR) lets us update individual pages without rebuilding the entire site. Supabase handles our data layer — the service definitions, neighborhood data, pricing information, and review content that feeds into every programmatic page. Resend handles automated email notifications. Telnyx handles SMS and voice integrations. There is no WordPress. No plugins. No bloat. Just clean, fast, scalable code that does exactly what we tell it to do.
            </p>
            <p>
              And beyond the platform itself, we built{" "}
              <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
              — a full automation CRM that closes the loop from lead generation to customer reviews. When a potential customer finds your business through one of your programmatic pages, Full Loop CRM captures that lead, routes it, automates follow-up sequences, handles appointment booking, and after the job is done, automatically requests and collects a review. That review feeds back into your{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              and your schema markup, making your SEO even stronger. It is a closed loop — automation from the first impression to the five-star review and back again.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: THE NUMBERS
          ============================================================ */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">The Numbers Behind Our Automation Platform</h2>
          <p className="mx-auto mt-4 max-w-3xl text-blue-100">
            These are not projections. These are real numbers from thenycseo.com — our own platform, built with the same automation systems we build for clients.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { stat: "54K+", label: "Pages Generated Programmatically" },
              { stat: "172", label: "Service Categories Automated" },
              { stat: "318", label: "Neighborhoods Targeted" },
              { stat: "<1s", label: "Average Page Load Time" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-4xl font-extrabold text-white">{item.stat}</div>
                <div className="mt-2 text-sm text-blue-200">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { stat: "100%", label: "Valid Structured Data" },
              { stat: "7+", label: "Schema Types Per Page" },
              { stat: "25+", label: "Internal Links Per Page" },
              { stat: "0", label: "Manual Pages Written" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-4xl font-extrabold text-[#EFF70A]">{item.stat}</div>
                <div className="mt-2 text-sm text-blue-200">{item.label}</div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-lg text-blue-100">
            Every page generated automatically with unique{" "}
            <Link href="/services/content-marketing" className="text-white underline hover:text-blue-200">content</Link>,{" "}
            <Link href="/services/search-engine-optimization" className="text-white underline hover:text-blue-200">structured data</Link>, contextual internal links, and{" "}
            <Link href="/services/ai-search-optimization" className="text-white underline hover:text-blue-200">AI search optimization</Link>. Built on Next.js, deployed on Vercel, powered by Supabase.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: OUR PROCESS (HowTo)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step Automation Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every automation system follows the same proven framework — adapted to your data, your market, and your growth objectives. This is the same process we used to build thenycseo.com and every client platform we have deployed.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Data Architecture & Audit",
                body: "Every automation system starts with data. We audit your existing data sources — service offerings, geographic coverage, pricing, customer reviews, FAQs, competitor landscape — and design the data architecture that will power your programmatic pages. This means defining your data schema in Supabase, establishing relationships between services and locations, normalizing business information, and identifying every data point that can be templated into unique page content. For a plumber, this might mean 10 service types, 60 neighborhoods, pricing ranges, common FAQs per service, and review data. For a law firm, it might mean 8 practice areas, 40 jurisdictions, case type descriptions, and outcome statistics. The data architecture determines the ceiling of what automation can produce. We spend 10 to 15 hours on this step because getting the data model right is the foundation everything else is built on.",
              },
              {
                step: "02",
                title: "Template Engineering in Next.js",
                body: "With the data architecture in place, we build dynamic page templates in Next.js that render unique, fully optimized content for every data combination. Each template uses dynamic routing — [service]/[neighborhood] — to generate a unique URL for every combination in your data set. Templates include proper heading hierarchy (H1 through H4), semantic HTML5 structure, schema markup injection points for 7+ JSON-LD types, automated internal linking logic, responsive images with proper alt text, and mobile-first responsive design. We build templates for service hub pages, neighborhood hub pages, service-location combination pages, FAQ sections, and comparison pages. Every template passes Core Web Vitals before a single page is generated. For thenycseo.com, we engineered templates that scale from 1 page to 54,000+ pages without any performance degradation — every page loads in under 1 second.",
              },
              {
                step: "03",
                title: "Content Pipeline Development",
                body: "Raw data does not make a good page. The content pipeline transforms structured data into publish-ready, SEO-optimized content that reads naturally and provides genuine value to the searcher. Our pipelines generate unique page titles with keyword targeting, meta descriptions optimized for click-through rate, H1 headings with location and service modifiers, body content with semantic keyword variations, locally relevant FAQs for every service-location pair, calls to action customized by service type, and alt text for images. We use a combination of template logic, business rules, and AI-assisted generation to ensure every page is unique — not just technically unique, but meaningfully different. Google rewards pages that provide distinct value. Our content pipelines deliver that at scale. We also build content refresh pipelines that update pages as data changes — new reviews, updated pricing, seasonal service variations — keeping content fresh without manual intervention.",
              },
              {
                step: "04",
                title: "Schema, Linking & Sitemap Automation",
                body: "This is where most agencies fail at scale. Manually adding schema markup to 50,000 pages is impossible. Manually creating internal links across a growing site is impossible. Manually managing sitemaps for a site that changes daily is impossible. We automate all three. Our schema system generates JSON-LD structured data for every page automatically — LocalBusiness with service-specific attributes, Service with OfferCatalog, FAQPage with dynamically generated questions, BreadcrumbList matching the URL hierarchy, Review and AggregateRating with real data, and Organization linking back to Consortium NYC. Our internal linking system analyzes page content, service categories, and geographic proximity to automatically create 25+ contextual links per page — connecting plumber pages to related services, linking Brooklyn neighborhoods to adjacent neighborhoods, and building topical clusters that search engines reward with higher authority. Our sitemap system generates XML sitemaps dynamically, splits them into index files when they exceed size limits, updates lastmod timestamps on every build, and submits changes to Google Search Console through the API.",
              },
              {
                step: "05",
                title: "Build, Deploy & Index",
                body: "With templates, content pipelines, and automation systems in place, we generate all pages through Next.js Static Site Generation. For thenycseo.com, this means building 54,000+ pages as static HTML files that Vercel serves from its global CDN — instant load times from anywhere in the world. We deploy to Vercel with zero-downtime deployments, meaning your site is never offline during updates. After deployment, we submit sitemaps to Google Search Console and monitor indexation until every page is discovered and indexed. We use Incremental Static Regeneration to update individual pages without rebuilding the entire site — when a review changes or pricing updates, only the affected pages regenerate. For most sites, the full build and deployment takes less than 30 minutes. The indexation process takes 2 to 6 weeks depending on site size, but we see most pages indexed within 7 to 14 days.",
              },
              {
                step: "06",
                title: "Monitor, Optimize & Scale",
                body: "Automation does not mean set-and-forget. We continuously monitor every automated system — indexation rates, page performance, schema validation, internal link health, sitemap accuracy, Core Web Vitals, and ranking positions for programmatic pages. Automated alerts notify us of issues before they impact rankings: pages dropping from the index, schema validation errors, performance regressions, broken links, crawl errors. We analyze which page templates perform best, which content variations drive the most traffic, and which service-location combinations generate the most leads. We then optimize templates, expand data coverage, and scale the system to capture more search demand. The system grows with your business — add a new service, and the automation generates pages for every neighborhood you serve. Expand to a new territory, and the system generates pages for every service in that territory. Scale without limits.",
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
          SECTION 5: WHAT'S INCLUDED — AUTOMATION DELIVERABLES
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Automation Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every component below is engineered, deployed, and maintained as part of your automation system. No black boxes. No mystery tools. Clean, auditable code you own.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Programmatic Page Generation",
                items: [
                  "Dynamic route templates ([service]/[neighborhood])",
                  "Static Site Generation (SSG) for all pages",
                  "Incremental Static Regeneration (ISR)",
                  "Unique content per page — not spun or duplicated",
                  "Service hub pages & neighborhood hub pages",
                  "Comparison & category pages",
                  "Scales from 100 to 100,000+ pages",
                ],
              },
              {
                title: "Automated Internal Linking",
                items: [
                  "Contextual links based on topical relevance",
                  "Geographic proximity linking (adjacent neighborhoods)",
                  "Service category cross-linking",
                  "Hub-and-spoke link architecture",
                  "Breadcrumb navigation automation",
                  "25+ internal links per page, minimum",
                  "Automatic orphan page detection & resolution",
                ],
              },
              {
                title: "Dynamic Schema Markup",
                items: [
                  "LocalBusiness with service-specific attributes",
                  "Service with OfferCatalog",
                  "FAQPage with dynamically generated Q&A",
                  "BreadcrumbList matching URL hierarchy",
                  "Review & AggregateRating with real data",
                  "Organization with parent company linkage",
                  "HowTo for process-oriented pages",
                  "100% validation via Google Rich Results Test",
                ],
              },
              {
                title: "Sitemap & Indexing Automation",
                items: [
                  "Dynamic XML sitemap generation",
                  "Sitemap index files for large sites",
                  "Automatic lastmod timestamp updates",
                  "Google Search Console API integration",
                  "Priority and changefreq signal management",
                  "Automatic submission on deployment",
                  "Indexation monitoring & crawl budget optimization",
                ],
              },
              {
                title: "Content Generation Pipelines",
                items: [
                  "Template-based content generation from data",
                  "AI-assisted unique copy per page",
                  "Dynamic FAQ generation per service-location",
                  "Auto-generated meta titles & descriptions",
                  "Seasonal content variation support",
                  "Review data integration into page content",
                  "Content freshness automation via ISR",
                ],
              },
              {
                title: "API Integrations & Workflow",
                items: [
                  "Full Loop CRM lead capture & routing",
                  "Google Business Profile data sync",
                  "Google Search Console reporting API",
                  "Review platform integration (Google, Yelp)",
                  "Resend email notification automation",
                  "Telnyx SMS & voice integration",
                  "Custom webhook & API endpoint development",
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
          SECTION 6: MID-PAGE CTA
          ============================================================ */}
      <CTAGroup
        variant="mid"
        title="Still Building Pages by Hand?"
        subtitle="Your competitors are generating hundreds of optimized pages while you are writing one at a time. Let us show you what automation looks like."
      />

      {/* ============================================================
          SECTION 7: CASE STUDY — thenycseo.com
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Case Study: How We Built thenycseo.com With Automation</h2>
          <p className="mt-4 text-zinc-400">
            We do not just sell automation — we run our entire business on it. Here is exactly how we built this platform.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">The Challenge</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We wanted to build a platform that covers every{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service category</Link>{" "}
                across every{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">neighborhood</Link>{" "}
                in the NYC metro area. That meant 172 service categories — from{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>{" "}
                and{" "}
                <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>{" "}
                to{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury lawyers</Link>{" "}
                and{" "}
                <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>{" "}
                — across 318 neighborhoods spanning Manhattan, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, and Westchester. The math: 172 multiplied by 318 equals 54,696 unique service-location pages, plus hub pages, plus service pages, plus area pages. At a typical agency rate of $500 to $1,000 per page for custom content, that would cost $27 million to $55 million. At a pace of 5 pages per day, it would take 30 years. Obviously, that was not an option.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">The Solution: Full-Stack Automation</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We designed a data architecture in Supabase with tables for services (name, slug, description, common services, average rating, review count), neighborhoods (name, slug, region, borough, latitude, longitude), and the relationships between them. We built Next.js dynamic route templates — <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm text-[#EFF70A]">[serviceSlug]/[neighborhoodSlug]/page.tsx</code> — that accept any service-location combination and render a fully optimized page. The content pipeline generates unique titles, meta descriptions, body content, FAQs, and CTAs for every combination. The schema system generates LocalBusiness, Service, FAQPage, BreadcrumbList, Review, AggregateRating, and Organization schema for every single page — over 380,000 individual schema blocks across the site. The internal linking system connects every page to related services, nearby neighborhoods, and parent hub pages — generating 25+ contextual links per page. The sitemap system produces XML sitemaps automatically, split into index files, with proper timestamps and priority signals.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">The Result</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                54,000+ pages, fully generated, fully indexed, all loading in under 1 second. Every page passes Core Web Vitals. Every page has valid structured data. Every page has 25+ internal links. Every page targets a real keyword with real search volume. The entire system was built and deployed in under 6 weeks. Adding a new service category generates 318 new pages automatically. Adding a new neighborhood generates 172 new pages automatically. The system scales infinitely because it is built on data and code, not manual labor. This is the same system we build for clients — adapted to their data, their services, their markets. If we can do it for 54,000 pages, we can do it for your 500.
              </p>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mt-12 space-y-8">
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-lg text-yellow-400">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 italic text-zinc-300 leading-relaxed">
                &ldquo;We needed location pages for every neighborhood we serve — over 200 combinations of services and areas. The NYC SEO built us a programmatic system that generated all 200+ pages in under a week. Each page has unique content, schema markup, internal links, and targets a real keyword. Within 3 months, those pages were driving 40% of our total organic traffic. The automation saved us what would have been 6 months of manual work and tens of thousands in content writing fees.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— Jason M., HVAC Company Owner, Brooklyn & Queens</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-lg text-yellow-400">&#9733;</span>
                ))}
              </div>
              <blockquote className="mt-4 italic text-zinc-300 leading-relaxed">
                &ldquo;We were paying a content writer $150 per page and publishing 4 pages per month. At that rate, covering our service area would have taken 3 years. The NYC SEO built a programmatic system that generated 600+ pages in two weeks — each one better optimized than anything our writer produced. Plus they set us up on Full Loop CRM, so every lead that comes through those pages gets automatically followed up and reviewed. Our online reviews went from 45 to 180 in six months without us asking a single customer manually.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm font-semibold text-white">— Alicia R., Cleaning Service Owner, Manhattan & NJ</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: DEEP DIVE — EACH AUTOMATION COMPONENT
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            A Deep Dive Into Every Automation Component
          </h2>
          <p className="mt-4 text-zinc-400">
            Each component below is a standalone system that works independently but becomes exponentially more powerful when combined. Here is exactly what each one does and why it matters for your{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO campaign</Link>.
          </p>
          <div className="mt-10 space-y-12">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Programmatic Page Generation</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Programmatic page generation is the foundation of everything else. It uses structured data — your service types, your neighborhoods, your pricing, your FAQs, your reviews — and feeds that data into Next.js dynamic route templates that render unique, fully optimized pages for every combination. A{" "}
                <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning company</Link>{" "}
                with 12 services and 80 neighborhoods gets 960 unique pages. A{" "}
                <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">general contractor</Link>{" "}
                with 15 services and 100 neighborhoods gets 1,500 unique pages. Each page targets a real search query — &ldquo;deep cleaning service Williamsburg,&rdquo; &ldquo;kitchen renovation contractor Upper East Side&rdquo; — with unique content, proper heading structure, schema markup, and internal links. These are not thin doorway pages. Each page includes detailed service descriptions, locally relevant information, real FAQ content, review data, and actionable CTAs. Google indexes them, ranks them, and sends traffic to them — because they provide genuine value to the searcher. The key difference between our programmatic pages and the spam that gets penalized is quality. Our pages answer the exact question the searcher has, with accurate, useful, locally relevant information.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Automated Internal Linking</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Internal linking is one of the most powerful — and most neglected — SEO signals. It tells search engines which pages are important, how content is related, and how authority flows through your site. On a 10-page website, you can manage internal links manually. On a 500-page website, it gets tedious. On a 54,000-page website, it is physically impossible without automation. Our automated internal linking system uses a combination of rules and data relationships to generate contextual, relevant links on every page. A page about{" "}
                <Link href="/plumber/park-slope" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbing in Park Slope</Link>{" "}
                automatically links to the plumber hub page, to plumbing pages in adjacent neighborhoods (Gowanus, Prospect Heights, Windsor Terrace), to related services (water heater installation, drain cleaning, bathroom remodeling), and to the Park Slope neighborhood hub page. The system generates a minimum of 25 internal links per page, distributed naturally through the content — in body paragraphs, in navigation sections, in related services blocks, and in breadcrumbs. This creates a dense web of topical authority that search engines reward with higher rankings. And it happens automatically, on every page, every time the site builds.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Dynamic Schema Markup Generation</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Structured data — implemented as JSON-LD schema markup — is how you communicate directly with search engines and AI platforms in their own language. It tells Google exactly what your business does, where you operate, what your ratings are, what questions you answer, and how your content is organized. For{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>, schema markup is even more critical — it is the primary way AI models like ChatGPT, Perplexity, and Gemini understand and recommend businesses. Our dynamic schema generation system produces 7+ schema types per page automatically: LocalBusiness with service type, address, phone, geographic coordinates, and aggregate ratings. Service with OfferCatalog listing every service offered. FAQPage with questions and answers dynamically generated for the specific service-location combination. BreadcrumbList matching the URL hierarchy. Review with real customer feedback. AggregateRating with actual rating data. Organization linking to Consortium NYC as the parent company. Every schema block is generated from real data, passes Google Rich Results Test validation, and updates automatically when the underlying data changes. Across 54,000+ pages, that is over 380,000 individual schema blocks — all generated, all valid, all maintained automatically.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Sitemap Automation & Indexing Management</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Your XML sitemap is the roadmap you give to search engines. It tells Google which pages exist, when they were last updated, and how important they are relative to each other. For a site with 54,000+ pages, sitemap management is a non-trivial engineering problem. Google limits individual sitemaps to 50,000 URLs and 50MB. Our system generates sitemaps dynamically at build time, automatically splits them into multiple files when limits are approached, creates a sitemap index file that references all individual sitemaps, includes accurate lastmod timestamps for every page, sets priority signals based on page type (hub pages get higher priority than leaf pages), and submits updated sitemaps to Google Search Console through the API after every deployment. We also monitor indexation status — tracking which pages have been crawled, indexed, or excluded — and flag issues before they cascade. If Google drops a page from the index, our monitoring system catches it within 24 hours so we can diagnose and fix the cause.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Content Generation Pipelines</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Content is what separates programmatic SEO from doorway page spam. Our content generation pipelines take raw data and produce publish-ready content that is unique, useful, and optimized — for every single page. The pipeline has multiple stages: data ingestion (pulling service attributes, neighborhood data, pricing, reviews, and FAQs from Supabase), content templating (applying business rules to generate contextually appropriate copy), AI-assisted variation (using{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI content generation</Link>{" "}
                to create unique sentence structures and descriptions), SEO optimization (inserting keywords naturally, generating meta tags, building heading hierarchy), and quality validation (checking for duplicate content, readability scores, and keyword density). The result is pages that read like they were written by a human who knows the service, knows the neighborhood, and knows exactly what the searcher needs. Because in a sense, they were — we designed the system, trained the AI, and validated the output. The pipeline just does it at a scale no human team could match.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Loop CRM Integration</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                SEO generates traffic. Traffic generates leads. But what happens to those leads after they fill out a form or make a call? Most businesses lose 30% to 50% of their leads to slow follow-up, missed calls, and inconsistent processes. That is why we built{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                — a full automation CRM that closes the loop from lead generation to customer review. When a lead comes in through one of your programmatic pages, Full Loop CRM captures it instantly, routes it to the right team member, sends automated confirmation to the customer, triggers follow-up sequences if the lead goes cold, manages appointment scheduling, and after the service is completed, automatically sends review requests via email and SMS through Resend and Telnyx. The review gets posted to{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>, and the data feeds back into your schema markup — your AggregateRating improves, your review count grows, and your SEO gets stronger. It is a genuinely closed loop: SEO generates the lead, CRM converts it, the review strengthens the SEO. Full Loop CRM is customizable for any business type and available at homeservicesbusinesscrm.com.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Automated Reporting & Monitoring</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                You cannot optimize what you do not measure. Our automated reporting system tracks everything that matters across your entire programmatic page set: indexation rates (what percentage of your pages are in Google&apos;s index), page-level performance (which pages drive the most traffic and leads), schema validation status (100% valid or flagged for fixes),{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Core Web Vitals</Link>{" "}
                across all page templates, internal link distribution (no orphan pages, balanced authority flow), crawl error monitoring (404s, 500s, redirect chains), keyword rankings for programmatic pages, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>{" "}
                metrics. Automated alerts trigger when something needs attention — a page drops from the index, a schema block fails validation, performance degrades on a template, or a crawl error rate exceeds threshold. Monthly reports are delivered with a recorded walkthrough explaining exactly what the data means and what actions we are taking. No mystery. No black box. Full transparency into every automated system running on your platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: AUTOMATION vs MANUAL
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Automation vs. Manual SEO: The Math Does Not Lie</h2>
          <p className="mt-4 text-zinc-400">
            Here is a direct comparison of what it takes to build and maintain a 500-page local service website using traditional manual methods versus our automation approach.
          </p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="pb-4 pr-4 text-zinc-400">Task</th>
                  <th className="pb-4 pr-4 text-red-400">Manual Approach</th>
                  <th className="pb-4 text-green-400">Automated Approach</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {[
                  { task: "500 location pages", manual: "6-12 months, $75K-$150K", auto: "1-2 weeks, included in project" },
                  { task: "Schema markup (500 pages)", manual: "200+ hours manual coding", auto: "Generated automatically, 0 hours" },
                  { task: "Internal linking (500 pages)", manual: "100+ hours, constantly outdated", auto: "Generated automatically per build" },
                  { task: "Sitemap management", manual: "Manual updates every time a page changes", auto: "Generated dynamically on every deploy" },
                  { task: "Content updates", manual: "$50-$150/page for rewrites", auto: "Data change triggers automatic refresh" },
                  { task: "Adding 50 new pages", manual: "2-4 weeks, $7,500-$15,000", auto: "Add data rows, rebuild in minutes" },
                  { task: "Schema validation", manual: "Manual testing, page by page", auto: "Automated validation across all pages" },
                  { task: "Performance monitoring", manual: "Manual checks, sporadic", auto: "Continuous automated monitoring & alerts" },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td className="py-4 pr-4 font-medium text-white">{row.task}</td>
                    <td className="py-4 pr-4">{row.manual}</td>
                    <td className="py-4 text-green-300">{row.auto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-8 text-zinc-300 leading-relaxed">
            The total cost of building and maintaining a 500-page site manually over 12 months: $100,000 to $250,000 in content, development, and maintenance. The cost of building the same site with automation: $10,000 to $35,000 for the initial system, with minimal ongoing maintenance costs. The automation system pays for itself within the first quarter — and continues to scale at near-zero marginal cost for every additional page. That is why the most successful{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategies</Link>{" "}
            in 2026 are built on automation, not labor.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: WHO THIS IS FOR
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Who Needs SEO Automation?</h2>
          <p className="mt-4 text-zinc-400">
            Automation is not for everyone. If you have a 5-page brochure site and serve one neighborhood, manual SEO works fine. But if any of the following describe your business, automation is not optional — it is the only way to compete at the scale your market demands.
          </p>
          <div className="mt-10 space-y-6">
            {[
              {
                who: "Multi-location service businesses",
                why: "If you serve 20, 50, or 200+ neighborhoods, you need a unique landing page for every service in every location. That is hundreds or thousands of pages — impossible to build manually at any reasonable cost.",
              },
              {
                who: "Multi-service businesses expanding their keyword coverage",
                why: "Every new service you add should generate pages for every location you serve. With automation, adding a new service creates 50, 100, or 300+ new pages instantly. Without it, you are looking at months of manual work.",
              },
              {
                who: "Businesses competing against aggregators (Yelp, Angi, HomeAdvisor)",
                why: "Aggregators rank because they have massive page counts covering every service-location combination. The only way to compete is to match their coverage — and automation is the only way to do that as a single business.",
              },
              {
                who: "Franchises and multi-brand operations",
                why: "If you operate multiple brands, multiple territories, or multiple franchise locations, automation lets you generate and manage pages across all of them from a single system.",
              },
              {
                who: "Businesses with large product or service catalogs",
                why: "Lawyers with dozens of practice areas, home service companies with 15+ service types, medical practices with multiple specialties — the more services you offer, the more automation multiplies your reach.",
              },
              {
                who: "Anyone tired of paying agencies per page",
                why: "Traditional agencies charge $500 to $1,500 per page for custom content. At 500 pages, that is $250,000 to $750,000. Our automation systems cost a fraction of that and produce pages that are more consistent, more optimized, and easier to maintain.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="font-semibold text-[#0080FE]">{item.who}</h3>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{item.why}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            We serve over{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170 service categories</Link>{" "}
            across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            in the NYC metro area. If your business needs scale,{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            and we will show you exactly what automation can do for your specific market.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Automation Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Project-based automation for businesses that need a system built once and maintained. Monthly plans for businesses that want continuous automation as part of an ongoing{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO campaign</Link>. Every dollar goes into engineering, not overhead. 20+ years of results behind every build.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Project-Based",
                price: "$10,000",
                period: " - $35,000",
                description: "One-time build for businesses that need a programmatic SEO system designed, built, and deployed. Ideal for businesses with internal teams that can maintain the system after launch.",
                features: [
                  "Full data architecture & schema design",
                  "Next.js template engineering",
                  "Content generation pipeline",
                  "Automated internal linking system",
                  "Dynamic schema markup (7+ types)",
                  "Sitemap automation & GSC integration",
                  "Vercel deployment & configuration",
                  "30 days of post-launch monitoring",
                  "Full documentation & handoff",
                ],
                cta: "Request a Proposal",
              },
              {
                tier: "Growth (Monthly)",
                price: "$7,500",
                period: "/month",
                description: "Automation included as part of a full SEO campaign. For multi-service businesses targeting multiple boroughs or the full NYC metro area.",
                features: [
                  "Everything in Project-Based, plus:",
                  "Programmatic pages (up to 1,000 pages)",
                  "Ongoing template optimization",
                  "Content pipeline expansion & refresh",
                  "Full Loop CRM integration & management",
                  "Off-page link building (15+ links/month)",
                  "AI search optimization (GEO)",
                  "Bi-weekly strategy calls",
                  "Continuous monitoring & alerting",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination (Monthly)",
                price: "$15,000+",
                period: "/month",
                description: "Unlimited automation + full SEO campaign for businesses that want to own their entire market — every keyword, every neighborhood, every search platform.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited programmatic pages",
                  "Multi-territory & multi-state automation",
                  "Full Next.js website build or migration",
                  "Full Loop CRM setup & customization",
                  "AI agent development & integration",
                  "Aggressive link building (30+ links/month)",
                  "Dedicated account strategist",
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
            All plans include a free initial consultation. Custom scopes available for enterprise and multi-brand operations.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            for all services.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup
        variant="preFaq"
        title="20 Years. 54,000+ Pages Automated. Your Turn."
        subtitle="We have been building automation systems since before most agencies existed. Your competitors wish they had this kind of engineering on their side."
      />

      {/* ============================================================
          SECTION 13: FAQ
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About SEO Automation</h2>
          <p className="mt-4 text-zinc-400">
            Honest answers to the questions our clients ask most about programmatic SEO, automation, and scaling their online presence.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6"
              >
                <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-white">
                  {faq.q}
                  <span className="ml-4 text-zinc-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-zinc-300 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 14: RELATED SERVICES + FINAL CTA
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            Automation works best as part of an integrated system. These services complement and amplify your automation investment.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service SEO that automation is built to amplify." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic foundation that drives every automation decision." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered for automation from day one." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and AI platforms." },
              { name: "AI Content Generation", href: "/services/ai-content-generation", desc: "AI-powered content at scale for your programmatic pages." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "AI chatbots that qualify leads from your automated pages 24/7." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "Strategic content that supports your programmatic page architecture." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Local pack domination powered by automated review systems." },
              { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "Complete lead-to-review automation for any business type." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Automated dashboards tracking every programmatic page." },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="flex flex-col rounded-xl border border-zinc-800 bg-[#141414] p-4 transition-colors hover:border-[#0080FE] hover:bg-[#141414]/80"
              >
                <span className="text-sm font-semibold text-[#0080FE]">{service.name}</span>
                <span className="mt-1 text-xs text-zinc-400">{service.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <CTAGroup
        variant="final"
        title="Let Us Build the System That Builds Your Business."
        subtitle="Tell us what you do and where you do it. We will show you exactly how many pages, how much traffic, and how many leads automation can generate for your specific market."
      />
    </div>
  );
}
