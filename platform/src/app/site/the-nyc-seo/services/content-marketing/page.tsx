import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Content Marketing for NYC Businesses",
  description:
    "Content marketing for NYC service businesses. SEO-optimized service pages, location pages, blog content, and content strategy. AI-enhanced at scale.",
  keywords: [
    "content marketing NYC",
    "SEO content marketing",
    "content marketing agency New York",
    "content strategy NYC",
    "SEO content writing",
    "content marketing for service businesses",
    "blog content NYC",
    "service page content",
    "location page content",
    "FAQ content marketing",
    "content marketing agency near me",
    "NYC content marketing services",
    "content marketing for local businesses",
  ],
  openGraph: {
    title: "Content Marketing for NYC Businesses",
    description:
      "Content marketing for NYC service businesses. SEO-optimized service pages, location pages, blog content, and strategy. AI-enhanced.",
    url: `${SITE_URL}/services/content-marketing`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/content-marketing` },
};

const faqs = [
  {
    q: "How much does content marketing cost for NYC service businesses?",
    a: "Our content marketing campaigns range from $2,000 to $7,500 per month depending on scope, volume, and competition level. Foundation-level content marketing starts at $2,000 per month and includes core service pages, basic blog content, and FAQ development. Full content marketing within our Growth SEO tier at $7,500 per month includes programmatic location pages, weekly blog articles, comparison content, and comprehensive content strategy. Every dollar goes directly into research, writing, optimization, and publishing — no fluff, no filler.",
  },
  {
    q: "What types of content do you create for service businesses?",
    a: "We create six primary content types: service pages that target your core offerings with deep, keyword-rich content; location pages that target every neighborhood you serve with unique, localized content; blog articles that target long-tail keywords and answer customer questions; FAQ content with structured data that ranks in featured snippets and feeds AI search platforms; comparison content that captures customers evaluating alternatives; and content strategy documents that map every keyword to a specific page on your site. Every piece is optimized for both traditional search engines and AI platforms.",
  },
  {
    q: "How is your content different from what other agencies produce?",
    a: "Three ways. First, every piece of content we write is built on keyword research — we do not write a single word until we know exactly which queries that content needs to rank for. Second, we use AI-enhanced workflows to produce content at scale while maintaining quality — every piece is human-reviewed, human-edited, and human-approved before it goes live. Third, we optimize for AI search platforms alongside Google. Most agencies are still writing generic blog posts that nobody reads. We build content systems that generate leads.",
  },
  {
    q: "How long does it take for content marketing to generate leads?",
    a: "Service pages and location pages typically start ranking and generating leads within 60 to 120 days of publication, depending on your domain authority and competition level. Blog content targeting long-tail keywords can rank within 30 to 60 days for lower-competition queries. The compounding effect of content marketing means results accelerate over time — month 6 produces more than months 1 through 5 combined. By month 12, most clients see a 3x to 10x return on their content marketing investment.",
  },
  {
    q: "Do you write the content or do we need to provide it?",
    a: "We handle everything. Our content process starts with a discovery call where we learn your business, services, service areas, and competitive advantages. Then we conduct keyword research, create content briefs, write the content, optimize it for search, implement structured data, and publish it on your site. You review and approve before anything goes live, but you do not need to write a single word. We have industry-specific knowledge across 170+ service categories from plumbers to personal injury lawyers.",
  },
  {
    q: "What is the difference between content marketing and SEO?",
    a: "Content marketing is a subset of SEO. SEO includes technical optimization, link building, local citations, structured data, and more. Content marketing is specifically the creation and optimization of written content that targets search queries. You cannot do SEO without content — Google and AI search platforms need something to rank. Content marketing without SEO strategy is just blogging and hoping for the best. We integrate content marketing directly into your SEO campaign so every piece of content serves a strategic purpose.",
  },
  {
    q: "How many pieces of content do you produce per month?",
    a: "It depends on your plan and goals. At the Foundation level, we produce 4 to 8 pieces of optimized content per month — typically service pages and core blog articles. At the Growth level, we produce 10 to 20 pieces per month including location pages, blog content, and FAQ expansions. For Domination-tier clients, we use programmatic content generation to produce 50 to 100+ pages per month at scale, each unique and optimized. The right volume depends on your keyword landscape and how aggressively you want to capture market share.",
  },
  {
    q: "Do you use AI to write content?",
    a: "Yes, strategically. We use AI as a writing tool — not a replacement for human expertise. Our content workflow combines AI-generated first drafts with human editing, fact-checking, brand voice alignment, and SEO optimization. This allows us to produce high-quality content at a scale and speed that would be impossible with purely manual writing. Every piece is reviewed by a human editor before publication. The result is content that reads naturally, ranks well, and accurately represents your business — produced at 3x the speed of traditional content agencies.",
  },
  {
    q: "What is a service page and why does my business need one?",
    a: "A service page is a dedicated page on your website for each specific service you offer. If you are a plumber, you need separate pages for drain cleaning, water heater installation, pipe repair, sewer line replacement, and every other service you provide. Each page targets the exact keywords customers search when they need that specific service. Without dedicated service pages, you are asking one generic page to rank for dozens of different keywords — and that does not work. Google and AI platforms rank specific, deep content over thin, generic pages.",
  },
  {
    q: "What are location pages and how many do I need?",
    a: "Location pages are dedicated pages targeting each geographic area you serve — neighborhoods, boroughs, cities, and towns. A plumber serving 40 neighborhoods in NYC needs 40 location pages, each with unique content about serving that specific area. Combined with your service pages, this creates a matrix — 10 services times 40 neighborhoods equals 400 unique pages, each targeting a real search query like 'drain cleaning Park Slope' or 'water heater installation Astoria.' We use programmatic content generation to build these at scale while maintaining unique, natural content on every page.",
  },
  {
    q: "How do you optimize content for AI search platforms like ChatGPT?",
    a: "AI search platforms pull information from structured, clear, factual content. We optimize for AI by implementing comprehensive FAQ schema markup, writing in clear question-and-answer formats, ensuring factual accuracy and specificity, using structured data that AI models can parse, and building topical authority across your entire content library. When someone asks ChatGPT or Perplexity for a plumber in Brooklyn, the models draw on the same indexed content that Google uses — but they weight clarity, structure, and authority differently. We optimize for both.",
  },
  {
    q: "What is content strategy and do I need one before you start writing?",
    a: "Content strategy is the research-driven plan that determines what content to create, in what order, targeting which keywords, and how each piece connects to the rest of your site. We develop your content strategy as the first phase of every engagement — keyword research, competitor content analysis, content gap identification, topic clustering, and a prioritized production calendar. Without a strategy, content marketing is just throwing words at a wall. With a strategy, every piece of content serves a measurable purpose in your overall SEO campaign.",
  },
  {
    q: "Can content marketing work for highly competitive industries like law or HVAC?",
    a: "Absolutely — competitive industries are where content marketing delivers the highest ROI. In competitive markets, the businesses with the deepest, most comprehensive content libraries dominate search results. A personal injury lawyer with 50 pages of thin content cannot compete with a firm that has 500 pages of expert-level content covering every practice area, every borough, every type of case, and every common question. We build content libraries that are impossible for competitors to replicate quickly, creating a sustainable competitive moat.",
  },
  {
    q: "Do you handle content publishing or just writing?",
    a: "We handle the entire content lifecycle — research, writing, optimization, structured data implementation, internal linking, image optimization, and publishing directly to your website. If your site is built on our Next.js platform, we deploy content directly through our development workflow. If you are on another platform, we provide fully formatted content with all meta tags, schema markup, and internal links ready to publish. Either way, you review and approve before anything goes live on your site.",
  },
  {
    q: "How do you measure content marketing success?",
    a: "We track keyword rankings for every piece of content, organic traffic to each page, click-through rates from search results, time on page, conversion rates (phone calls and form submissions attributed to specific content), and AI search visibility. Monthly reports show exactly which content is generating leads and which needs optimization. The only metric that ultimately matters is whether your content is generating more qualified leads this month than last month. Everything else is a supporting indicator.",
  },
  {
    q: "What if I already have content on my website?",
    a: "We start with a content audit. We analyze every page on your site for keyword targeting, content depth, technical optimization, structured data, and ranking performance. Pages that are performing well get minor optimizations. Pages with potential get rewritten and expanded. Pages that are thin, duplicate, or targeting the wrong keywords get consolidated or replaced. Most NYC service business websites have 5 to 15 pages of generic content when they need 200 to 2,000 pages of targeted content. We close that gap systematically.",
  },
];

export default function ContentMarketingPage() {
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
    name: "The NYC SEO — Content Marketing Services",
    url: `${SITE_URL}/services/content-marketing`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$2,000 - $7,500/mo",
    description:
      "Content marketing agency for NYC service businesses. SEO-optimized service pages, location pages, blog content, FAQ content, comparison articles, and full content strategy. AI-enhanced content at scale.",
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
    name: "Content Marketing Services",
    description:
      "Comprehensive content marketing for NYC service businesses including SEO-optimized service pages, location pages, blog content, FAQ content, comparison articles, and content strategy. AI-enhanced content production at scale.",
    url: `${SITE_URL}/services/content-marketing`,
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
      name: "Content Marketing Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "SEO Service Page Content" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Location Page Content" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Blog Content & Articles" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "FAQ Content Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Comparison Content" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Strategy & Planning" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI-Enhanced Content Production" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Audits & Optimization" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Content Marketing Process Works",
    description: "Our proven 6-step content marketing process for ranking NYC service businesses in Google, Bing, and AI search platforms.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Content Audit & Discovery",
        text: "We audit your existing content, analyze competitor content strategies, identify keyword gaps, and map every opportunity in your market. We examine what is ranking, what is missing, and what your competitors are doing that you are not.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Keyword Research & Content Strategy",
        text: "We research every keyword your customers search — service queries, location queries, question queries, comparison queries, and AI search queries. We map each keyword to a specific content piece and build a prioritized production calendar.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Content Architecture & Planning",
        text: "We design your content architecture — topic clusters, internal linking structure, URL hierarchy, and content templates. Every piece of content is planned to support your overall SEO strategy and connect to other content on your site.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Content Production & Optimization",
        text: "We write, edit, and optimize every piece of content. AI-enhanced first drafts are refined by human editors for accuracy, brand voice, and SEO optimization. Structured data, meta tags, and internal links are added to every page.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Publishing & Technical Implementation",
        text: "We publish content directly to your site with proper schema markup, image optimization, canonical tags, and XML sitemap updates. For programmatic content, we deploy hundreds of pages simultaneously through our automated build pipeline.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Performance Tracking & Iteration",
        text: "We track rankings, traffic, and conversions for every piece of content. Underperforming content gets optimized. High-performing content gets expanded. New content opportunities are identified and added to the production calendar. Content marketing is a continuous cycle, not a one-time deliverable.",
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
      name: "The NYC SEO — Content Marketing Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Jason M." },
    reviewBody:
      "We went from 12 pages on our website to over 400 in six months. Every page targets a real keyword, every page has unique content, and the leads started coming in within 90 days. The content quality is excellent — our customers comment on how helpful our website is. The NYC SEO completely transformed our online presence.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Content Marketing", url: "/services/content-marketing" },
  ];

  return (
    <div className="text-white">
      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema).replace(/</g, '\\u003c') }} />

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
                NYC Content Marketing Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Content Marketing
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  That Ranks and Converts
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Not filler blog posts nobody reads. We write{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service pages</Link>,{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">location pages</Link>, FAQ content, comparison articles, and long-form content targeting the exact keywords your customers search before they pick up the phone. Every piece is optimized for{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">traditional search engines</Link>,{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>, and the humans who actually read it. Built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link> — not WordPress. AI-enhanced. Human-reviewed. Deployed at scale through{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic systems</Link>{" "}
                that a traditional content agency could not replicate in a decade.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "SEO-optimized service pages that convert",
                "Location-targeted landing pages at scale",
                "Long-tail keyword blog content",
                "FAQ & knowledge base content with schema",
                "Comparison & alternative content",
                "AI-enhanced writing — human-reviewed quality",
                "Structured data on every piece of content",
                "Content strategy backed by keyword research",
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
          SECTION 2: WHAT IS CONTENT MARKETING
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Content Marketing for Service Businesses?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Content marketing is the strategic creation and distribution of written content designed to attract, engage, and convert potential customers through search engines and AI platforms. For{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC service businesses</Link>{" "}
              — <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contractors</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              — content marketing is not about going viral on social media or publishing thought leadership that only your peers read. It is about creating pages on your website that rank for the exact search queries your customers type into Google, ask ChatGPT, or speak into their phone when they need what you sell.
            </p>
            <p>
              The math is straightforward. Every service you offer and every neighborhood you serve represents a keyword that real customers are searching right now. A{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>{" "}
              offering 10 services across 40 neighborhoods has 400 high-intent keyword opportunities. Without content targeting each one, you are invisible for 399 of them. With one generic homepage and a few thin service descriptions, you are competing against businesses that have invested in deep, comprehensive content — and losing.
            </p>
            <p>
              Content marketing for service businesses means building a content library that covers your entire keyword landscape — service pages targeting &ldquo;drain cleaning Brooklyn,&rdquo; location pages targeting &ldquo;best plumber in Park Slope,&rdquo; FAQ pages answering &ldquo;how much does a plumber cost in NYC,&rdquo; blog articles targeting &ldquo;signs you need pipe replacement in an old brownstone,&rdquo; and comparison content targeting &ldquo;plumber vs handyman for bathroom renovation.&rdquo; Each piece of content captures a specific customer at a specific moment in their buying journey.
            </p>
            <p>
              In 2026, content marketing is no longer just about Google. Over 100 million people use ChatGPT monthly to find service providers. Millions more use Perplexity, Gemini, and Claude. These{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
              recommend businesses based on the quality, clarity, and structure of their content. FAQ content with proper schema markup, service pages with comprehensive details, and location pages with genuine local relevance are what AI models use to decide which businesses to recommend. Content marketing is not a nice-to-have for NYC service businesses — it is the single most important investment you can make in your online visibility across every search channel that matters.
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
            Our 6-Step Content Marketing Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every content marketing engagement follows the same proven framework — adapted to your industry, your market, and your business goals. No shortcuts. No guesswork.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Content Audit & Discovery",
                body: "We start by auditing everything you already have — existing pages, current rankings, content gaps, competitor content strategies, and keyword coverage. We use Google Search Console, Ahrefs, Screaming Frog, and proprietary tools to identify every page that is underperforming, every keyword you should be targeting but are not, and every piece of competitor content that is outranking you. This audit typically reveals that NYC service businesses have 5 to 15 pages of generic content when they need 200 to 2,000 pages of targeted content. The audit becomes the foundation of your entire content strategy. We spend 10 to 15 hours on discovery alone because building on a flawed diagnosis wastes everyone's time and money.",
              },
              {
                step: "02",
                title: "Keyword Research & Content Strategy",
                body: "We research every keyword your customers search — high-volume head terms like 'plumber NYC,' long-tail phrases like 'emergency pipe burst repair Upper West Side,' question queries like 'how much does a plumber cost in Brooklyn,' comparison queries like 'plumber vs handyman for bathroom renovation,' and AI search queries like 'best plumber near me for old building pipes.' We map each keyword to a specific content piece — a service page, location page, blog article, FAQ entry, or comparison article. The result is a complete content strategy document with a prioritized production calendar, topic clusters, internal linking plan, and success metrics for every piece of content.",
              },
              {
                step: "03",
                title: "Content Architecture & Planning",
                body: "Before we write a single word, we design your content architecture. This includes topic clustering — grouping related content together to build topical authority — URL hierarchy, internal linking structure, content templates for each content type, and structured data specifications. For a plumber, this means building a hub page for each service (drain cleaning, water heater installation, pipe repair), with spoke pages for each neighborhood, all connected through strategic internal links. This architecture tells search engines and AI platforms that your site is the authoritative source for your services in your market.",
              },
              {
                step: "04",
                title: "Content Production & Optimization",
                body: "We write, edit, and optimize every piece of content using our AI-enhanced production workflow. First drafts are generated using AI tools trained on your brand voice and service details. Then human editors refine every piece for accuracy, readability, keyword optimization, and conversion. We implement title tags, meta descriptions, heading hierarchy (H1 through H4), image alt text, internal links (25+ per page), and structured data (FAQPage, LocalBusiness, Service, HowTo, BreadcrumbList, Review, and Organization schema). Every page is built to rank in Google, Bing, and AI search platforms simultaneously.",
              },
              {
                step: "05",
                title: "Publishing & Technical Implementation",
                body: "We publish content directly to your website with full technical implementation — proper canonical tags, XML sitemap updates, Open Graph tags, and structured data validation. For clients on our Next.js platform, content is deployed through our CI/CD pipeline and indexed within hours. For programmatic content like location pages, we deploy hundreds of unique pages simultaneously through automated build processes — something that would take a traditional content agency months of manual work. We handle everything from writing to deployment so you never have to touch your website's backend.",
              },
              {
                step: "06",
                title: "Performance Tracking & Iteration",
                body: "Content marketing is never done. We track keyword rankings, organic traffic, click-through rates, time on page, and conversion rates (phone calls and form submissions) for every piece of content. Monthly reports show exactly which content is generating leads and which needs optimization. Underperforming content gets rewritten, expanded, or consolidated. High-performing content gets updated and expanded to capture even more traffic. New keyword opportunities are identified and added to the production calendar. This continuous optimization cycle is what separates content marketing that generates leads from content marketing that collects dust.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Content Marketing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Six categories of content, each built on keyword research and optimized for search engines, AI platforms, and the humans who read them. No filler. No fluff.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Service Pages",
                items: [
                  "Dedicated page for every service you offer",
                  "2,000+ words of expert-level content",
                  "Targeted keyword optimization per page",
                  "FAQ section with FAQPage schema",
                  "Service schema with OfferCatalog",
                  "Internal links to related services & areas",
                  "Conversion-optimized CTAs",
                ],
              },
              {
                title: "Location Pages",
                items: [
                  "Unique page for every neighborhood you serve",
                  "Localized content — not keyword-swapped templates",
                  "LocalBusiness schema per location",
                  "Embedded Google Maps with service area",
                  "Local landmarks & neighborhood context",
                  "Programmatic generation at scale",
                  "NAP consistency on every page",
                ],
              },
              {
                title: "Blog Content",
                items: [
                  "Long-tail keyword targeting articles",
                  "How-to guides and educational content",
                  "Seasonal and trending topic coverage",
                  "Internal linking to service & location pages",
                  "AI-enhanced writing, human-reviewed quality",
                  "Featured snippet optimization",
                  "Social sharing and distribution support",
                ],
              },
              {
                title: "FAQ Content",
                items: [
                  "Comprehensive FAQ pages per service",
                  "FAQPage schema on every FAQ section",
                  "Question-and-answer format for AI search",
                  "Targets 'People Also Ask' queries",
                  "Voice search optimization",
                  "Customer objection handling content",
                  "Updated quarterly with new questions",
                ],
              },
              {
                title: "Comparison Content",
                items: [
                  "Service vs. service comparison articles",
                  "Your business vs. DIY alternatives",
                  "Cost comparison and pricing guides",
                  "Product and material comparison pages",
                  "Captures customers in evaluation phase",
                  "Targets high-intent comparison keywords",
                  "Builds authority and trust signals",
                ],
              },
              {
                title: "Content Strategy",
                items: [
                  "Full keyword landscape mapping",
                  "Competitor content gap analysis",
                  "Topic clustering and content hierarchy",
                  "Prioritized production calendar",
                  "Internal linking architecture plan",
                  "Content performance benchmarks",
                  "Quarterly strategy reviews and updates",
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our Content Marketing Is For</h2>
          <p className="mt-4 text-zinc-400">
            We specialize exclusively in content marketing for local service businesses. If your customers search for what you do before they hire someone, content marketing is how you get found.
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
            We create content for over{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170 service categories</Link>{" "}
            across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
            in the NYC metro area. If your industry is not listed above,{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            — we almost certainly cover it.
          </p>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 7: CONTENT MARKETING VS ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Content Marketing vs. the Alternatives</h2>
          <p className="mt-4 text-zinc-400">
            Every marketing channel has trade-offs. Here is how content marketing stacks up against the alternatives NYC service businesses typically consider — and why content is the foundation everything else should be built on.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Content Marketing vs. Paid Ads (Google Ads, LSAs)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Ads</Link> deliver instant visibility but stop the moment you stop paying. The average cost-per-click for service keywords in NYC ranges from $15 to $85 — a single lead through paid ads can cost $150 to $400. Content marketing takes 60 to 120 days to build momentum, but once a page ranks, every click is free for as long as you maintain that content. Over a 12-month period, content-driven organic traffic delivers 5x to 12x better ROI than paid advertising for service businesses. The smartest strategy is to run paid ads during your first 90 days while content builds, then reduce ad spend as organic traffic grows. But content marketing is the asset that appreciates in value over time — paid ads are a monthly expense that resets to zero every billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Content Marketing vs. Social Media</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Social media builds brand awareness, but it does not capture buying intent. When someone searches &ldquo;emergency plumber Brooklyn&rdquo; on Google or asks ChatGPT for a plumber recommendation, they need a plumber right now. When someone scrolls past your Instagram post, they might remember your name next month — or they might not. For service businesses, search traffic converts at 3x to 8x the rate of social traffic because search captures demand at the exact moment of intent. Social media content disappears in hours. A well-optimized service page ranks for years. Social media has its place in a marketing mix, but if you are spending $3,000 a month on social media and $0 on content marketing, your priorities are backwards.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Content Marketing vs. Doing Nothing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                The cost of doing nothing is the most expensive option of all. Every month you do not invest in content marketing, your competitors are publishing pages that target the keywords your customers are searching. Every page they publish and you do not is a customer you will never reach. In competitive NYC markets like{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury law</Link>,{" "}
                <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC</Link>, and{" "}
                <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentistry</Link>, the gap between businesses that invest in content and businesses that do not grows exponentially. A competitor who started content marketing six months ago now has 200 pages indexed in Google. If you start today, you are not just building — you are catching up. And the longer you wait, the harder and more expensive that catch-up becomes. The best time to start content marketing was a year ago. The second best time is right now.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Real Content Marketing Results</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in vanity metrics. Here is what content marketing looks like when every page is built on keyword research and optimized for conversions.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "54,000+", label: "Content Pages Built & Indexed" },
              { stat: "170+", label: "Service Categories Covered" },
              { stat: "318", label: "Neighborhoods Targeted" },
              { stat: "3x-10x", label: "Avg. ROI Within 12 Months" },
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
              &ldquo;We went from 12 pages on our website to over 400 in six months. Every page targets a real keyword, every page has unique content, and the leads started coming in within 90 days. Before The NYC SEO, we were getting maybe 5 organic leads a month. Now we are getting 40 to 50. The content quality is excellent — our customers actually comment on how helpful our website is. This is not generic SEO content. These pages genuinely answer the questions our customers have.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Jason M., Plumbing Company Owner, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;Our old agency was charging us $2,500 a month to write two blog posts that nobody ever read. The NYC SEO built us 300 location pages, 15 service pages, and a FAQ section that actually ranks in Google and shows up in ChatGPT. The difference in lead quality is staggering. People call us already knowing what we do and where we serve. That is what good content does — it pre-sells the customer before they ever pick up the phone.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Sandra K., HVAC Business Owner, Queens</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Content Marketing Mistakes NYC Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Writing blog posts without keyword research",
                fix: "Every piece of content we create starts with keyword research. We identify the exact queries your customers search, map them to content types, and write pages that target those queries specifically. No more writing about topics nobody is searching for.",
              },
              {
                mistake: "One generic service page trying to rank for everything",
                fix: "A single 'Our Services' page cannot rank for 10 different services. We create dedicated, deep service pages for every service you offer — each targeting its own set of keywords, each with unique content, and each with proper structured data. This is how you capture the full breadth of search demand.",
              },
              {
                mistake: "No location pages for the neighborhoods you serve",
                fix: "If you serve 40 neighborhoods but only have one page mentioning your service area, you are invisible for 39 of them. We build unique location pages for every neighborhood you serve using programmatic content generation — each page with localized content, not keyword-swapped templates.",
              },
              {
                mistake: "Publishing thin, 300-word pages and expecting them to rank",
                fix: "Google and AI platforms reward depth. Our service pages average 2,000+ words, our blog articles average 1,500+ words, and every piece includes FAQs, internal links, and structured data. Thin content does not rank in competitive NYC markets. Period.",
              },
              {
                mistake: "No FAQ content or schema markup",
                fix: "FAQ content with FAQPage schema ranks in Google's featured snippets, answers 'People Also Ask' queries, and provides the structured Q&A data that AI search platforms use to recommend businesses. We build comprehensive FAQ sections with proper schema into every service page and create standalone FAQ pages for common customer questions.",
              },
              {
                mistake: "Ignoring content for AI search platforms",
                fix: "When someone asks ChatGPT, Perplexity, or Gemini for a service provider, these platforms draw from the same indexed content as Google — but they weight clarity, structure, and factual specificity differently. We optimize content for both traditional search and AI platforms with clear formatting, comprehensive structured data, and direct question-answer pairs.",
              },
              {
                mistake: "Publishing content once and never updating it",
                fix: "Content marketing is a continuous process, not a one-time project. We track performance monthly and optimize underperforming content — expanding thin pages, updating outdated information, adding new keywords as search trends evolve, and consolidating duplicate content. The businesses that win at content are the ones that treat it as an ongoing investment.",
              },
              {
                mistake: "No internal linking strategy connecting your content",
                fix: "Internal links tell search engines how your content is connected and help users navigate your site. We build 25+ contextual internal links per page — service pages link to related location pages, blog posts link to relevant service pages, FAQ pages link to detailed service content. This web of internal links builds topical authority that search engines and AI platforms reward.",
              },
              {
                mistake: "Hiring cheap content mills that produce generic, duplicate content",
                fix: "Cheap content looks cheap to Google. Duplicate or near-duplicate content across location pages gets flagged and filtered. We use AI-enhanced workflows with human editing to produce unique, high-quality content at scale. Every page reads naturally, provides genuine value, and targets a specific keyword opportunity. Our content passes AI detection tools and, more importantly, passes the test of whether a real human would find it helpful.",
              },
              {
                mistake: "Measuring content success by word count instead of leads generated",
                fix: "A 5,000-word blog post that generates zero leads is worthless. A 1,200-word service page that generates 20 calls a month is priceless. We measure content marketing success by keyword rankings, organic traffic, and most importantly, phone calls and form submissions attributed to specific content. The only metric that matters is whether your content is converting searchers into customers.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">Content Marketing Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into research, writing, optimization, and publishing — not overhead. Content marketing is included as a core component of our SEO campaigns, or available as a standalone service starting at $2,000/month.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses building their content foundation.",
                features: [
                  "Content audit & keyword strategy",
                  "Up to 8 optimized pages/month",
                  "Service page content (up to 10 services)",
                  "Core blog content (2 articles/month)",
                  "FAQ content with FAQPage schema",
                  "On-page SEO & structured data",
                  "Monthly content performance reporting",
                  "Hosting included",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses scaling content across multiple boroughs and service areas.",
                features: [
                  "Everything in Foundation, plus:",
                  "Up to 20 optimized pages/month",
                  "Programmatic location pages (up to 1,000)",
                  "Weekly blog content (4 articles/month)",
                  "Comparison & evaluation content",
                  "AI search content optimization",
                  "Content strategy with quarterly reviews",
                  "Bi-weekly strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want to own every keyword, every neighborhood, every content opportunity.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited programmatic content",
                  "50-100+ new pages/month",
                  "Full Next.js website build or migration",
                  "Custom content types & templates",
                  "Multi-location & multi-state content",
                  "Dedicated content strategist",
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
            Standalone content marketing starts at $2,000/month. All full SEO plans include content marketing.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            or{" "}
            <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">request a custom quote</Link>.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for Content Marketing</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We have been creating content that ranks since before content marketing had a name. Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over two decades of experience in digital marketing, branding, and content strategy. We have written content for hundreds of NYC service businesses across every industry from{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbing</Link> to{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury law</Link>. That depth of experience means we understand your industry, your customers, and the content they need to see before they hire you.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">AI-Enhanced, Human-Reviewed</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not outsource to content mills and we do not publish raw AI output. Our content workflow uses{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI-enhanced content generation</Link>{" "}
                for speed and scale, with human editors ensuring every piece is accurate, on-brand, and genuinely helpful. This hybrid approach lets us produce 10x the volume of a traditional content agency at half the cost — without sacrificing quality. Every word that goes live on your site has been reviewed by a human who understands your business.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Built on Next.js — Not WordPress</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Content on a slow, bloated WordPress site is like putting premium fuel in a broken engine. Our{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js platform</Link>{" "}
                delivers sub-1-second page loads, perfect Core Web Vitals scores, and the ability to scale to 50,000+ pages without performance degradation. Every piece of content we publish benefits from the technical foundation underneath it. When your content loads in under a second and Google gives you a 99/100 performance score, your content has a competitive advantage before a human even reads the first sentence.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Programmatic Scale When You Need It</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                A traditional content agency writing location pages manually can produce maybe 10 per month. We use{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic content generation</Link>{" "}
                to build hundreds of unique, optimized pages in days — each with genuine localized content, not keyword-swapped templates. This is how we build content libraries of 54,000+ pages. This is how we cover your entire service area before a competitor even finishes their first draft.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Optimized for AI Search — Not Just Google</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most content agencies are still writing for Google circa 2019. We write for the search landscape of 2026 and beyond — which means optimizing for{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                like ChatGPT, Perplexity, Gemini, and Claude alongside traditional search engines. Every piece of content includes structured data, clear formatting, and the factual specificity that AI models need to recommend your business. The agencies that figure this out first will own the next decade of search. We are already there.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Stack — From Strategy to Deployment</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We are not just writers. We are an{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO agency</Link>{" "}
                that builds, deploys, and optimizes content as part of a comprehensive search strategy. Keyword research, content strategy, writing, technical optimization, structured data implementation, publishing, performance tracking, and iteration — we handle the entire content lifecycle. You do not need to hire a writer, an SEO specialist, a developer, and a strategist separately. We are all of them, integrated into a single team that has been doing this for two decades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 13: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            Content marketing works best as part of an integrated search strategy. These services complement and amplify the content we create for your business.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service SEO that turns your content into rankings and leads." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic foundation that drives every content decision." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "AI Content Generation", href: "/services/ai-content-generation", desc: "AI-enhanced content production at scale with human quality control." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered to make your content rank from day one." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Dominate the local map pack and Google Maps with optimized content." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of optimized content pages at scale." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track content performance, rankings, and lead attribution." },
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
          SECTION 14: SERVICE AREAS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Content Marketing Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We create content targeting the entire NYC metropolitan area — every borough, every neighborhood, every suburb. Here are some of the areas we cover.
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
            we cover across the NYC metro area.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 15: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Content Marketing</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about content marketing, content strategy, and what it takes to rank with content.
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
          FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
