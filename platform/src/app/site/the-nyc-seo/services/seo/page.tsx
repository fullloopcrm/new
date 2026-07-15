import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "NYC SEO Services for Local Businesses",
  description:
    "Full-service SEO agency in NYC. On-page, off-page, technical, local, and AI search optimization for service businesses. 25+ years experience. Results-driven.",
  keywords: [
    "NYC SEO services",
    "SEO agency New York City",
    "local SEO services NYC",
    "search engine optimization NYC",
    "SEO company near me",
    "best SEO agency New York",
    "small business SEO NYC",
    "SEO for local businesses",
    "technical SEO agency",
    "on-page SEO services",
    "off-page SEO services",
    "NYC SEO consultant",
    "SEO experts New York",
  ],
  openGraph: {
    title: "NYC SEO Services for Local Businesses",
    description:
      "Full-service SEO agency in NYC. On-page, off-page, technical, local, and AI search optimization for service businesses. 25+ years experience.",
    url: `${SITE_URL}/services/seo`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/seo` },
};

const faqs = [
  {
    q: "How long does SEO take to show results in NYC?",
    a: "Most NYC service businesses see measurable ranking improvements within 90 to 120 days. Competitive industries like personal injury law or HVAC may take 6 months for top-3 positions. We provide monthly progress reports so you see movement from week one — indexation improvements, keyword position changes, and traffic growth. SEO is a compounding investment: the longer you maintain it, the harder it becomes for competitors to catch up.",
  },
  {
    q: "How much do SEO services cost in New York City?",
    a: "Our NYC SEO campaigns start at $3,500 per month for single-location service businesses. Multi-location and multi-borough campaigns range from $7,500 to $15,000+ per month depending on scope, competition level, and the number of service areas you need to dominate. Hourly consulting starts at $150 per hour for implementation work and goes up to $500 per hour for executive-level strategic advisory. Every dollar goes directly into strategy, content, technical optimization, and link building — no fluff, no vanity metrics.",
  },
  {
    q: "What is the difference between on-page SEO and off-page SEO?",
    a: "On-page SEO covers everything on your website — title tags, meta descriptions, heading structure, content optimization, internal linking, schema markup, image optimization, and site speed. Off-page SEO covers everything that happens outside your website — backlink acquisition, local citations, Google Business Profile optimization, review management, and brand mentions across the web. You need both to rank. We handle both as part of every campaign.",
  },
  {
    q: "Do you guarantee first page rankings on Google?",
    a: "No legitimate SEO agency guarantees specific rankings — Google explicitly warns against companies that make this claim. What we guarantee is a transparent process, measurable progress, and a team that has been ranking NYC businesses for over 25 years. Our track record speaks for itself: we consistently move service businesses into top-3 positions for their target keywords within 6 to 12 months.",
  },
  {
    q: "What is local SEO and why does my NYC business need it?",
    a: "Local SEO optimizes your online presence to attract customers from specific geographic areas. For NYC service businesses, this means ranking in Google Maps, appearing in the local pack for searches like 'plumber near me Brooklyn' or 'dentist Upper East Side,' and building location-specific landing pages that target every neighborhood you serve. Over 46% of all Google searches have local intent — if you are not doing local SEO, you are invisible to nearly half of your potential customers.",
  },
  {
    q: "What is technical SEO and does my website need it?",
    a: "Technical SEO ensures search engines can crawl, index, and understand your website efficiently. This includes site speed optimization, mobile responsiveness, structured data markup, XML sitemaps, canonical tags, robots.txt configuration, Core Web Vitals, and crawl budget management. If your site is built on WordPress with bloated plugins, your technical SEO is almost certainly holding you back. We build on Next.js specifically because it solves most technical SEO problems at the framework level.",
  },
  {
    q: "What is the difference between SEO and PPC (Google Ads)?",
    a: "PPC gives you immediate visibility but stops the moment you stop paying. SEO takes longer to build but generates free organic traffic indefinitely. The average cost-per-click for service keywords in NYC ranges from $15 to $85. A single page ranking organically for that keyword saves you thousands per month. Most of our clients run PPC during their first 90 days of SEO, then scale ads down as organic rankings take over. SEO has a 5x to 12x better ROI than PPC over a 12-month period.",
  },
  {
    q: "How is SEO different for service businesses versus e-commerce?",
    a: "Service businesses compete on local intent — 'electrician near me,' 'personal injury lawyer Brooklyn,' 'HVAC repair Queens.' E-commerce competes on product intent — 'buy running shoes online.' The strategies are fundamentally different. Service SEO requires Google Business Profile optimization, local citations, location-specific landing pages, review management, and schema markup for LocalBusiness. We specialize exclusively in service business SEO because the playbook is completely different from e-commerce.",
  },
  {
    q: "Do you work with businesses outside of NYC?",
    a: "Our core service area covers the entire NYC metro — Manhattan, Brooklyn, Queens, the Bronx, Staten Island, New Jersey, Long Island, and Westchester. We have deep expertise in these markets and the local search dynamics that drive rankings here. If your business serves customers in this region, we are the right fit. We do not take on clients in markets we do not understand.",
  },
  {
    q: "What is AI search optimization and should I care about it?",
    a: "AI search optimization — also called Generative Engine Optimization or GEO — ensures your business gets recommended when someone asks ChatGPT, Perplexity, Gemini, or Claude for a service provider. Over 100 million people use ChatGPT monthly, and AI search is growing faster than any channel since mobile. We optimize your structured data, content clarity, and entity associations so AI models recommend your business. This is not future-proofing — this is right now.",
  },
  {
    q: "What makes The NYC SEO different from other SEO agencies?",
    a: "Three things. First, we build on Next.js — not WordPress. This means your site loads in under 1 second, passes Core Web Vitals automatically, and scales to tens of thousands of pages without breaking. Second, we generate hundreds of optimized pages programmatically, targeting every service plus neighborhood combination your business serves. Third, we optimize for AI search platforms alongside traditional search engines. Most agencies are still stuck in 2019. We build for 2026 and beyond.",
  },
  {
    q: "How do you measure SEO success?",
    a: "We track keyword rankings across Google, Bing, Yahoo, DuckDuckGo, and AI platforms. We monitor organic traffic, click-through rates, and impressions in Google Search Console. We attribute phone calls and form submissions to specific pages and keywords. And we report on Core Web Vitals, crawl health, and indexation status monthly. Everything ties back to one question: are you getting more qualified leads this month than last month?",
  },
  {
    q: "Can you fix a Google penalty or ranking drop?",
    a: "Yes. We diagnose manual actions, algorithmic penalties, and sudden ranking drops. Common causes include thin content, unnatural backlink profiles, duplicate content, and technical crawl errors. We perform a full audit, identify the root cause, submit reconsideration requests if needed, and rebuild your site authority with clean, white-hat practices. Recovery timelines vary — manual action recoveries can take 2 to 8 weeks after the fix is submitted.",
  },
  {
    q: "What is programmatic SEO and how does it help my business?",
    a: "Programmatic SEO uses data and automation to generate hundreds or thousands of optimized pages at scale. For a plumber serving 50 neighborhoods, we generate 50 unique landing pages — one for each location — each targeting real search queries like 'plumber in Park Slope' or 'emergency plumber Astoria.' Each page includes unique content, proper schema markup, and internal links. This approach would take a traditional agency months of manual work. We do it in days.",
  },
  {
    q: "Do you offer monthly SEO reporting?",
    a: "Every client receives a detailed monthly SEO report covering keyword rankings, organic traffic trends, top-performing pages, new backlinks acquired, technical health scores, Core Web Vitals, and lead attribution data. We also include AI search visibility metrics — where your business appears in ChatGPT, Perplexity, and other AI platforms. Reports are delivered with a recorded walkthrough so you understand exactly what the data means and what we are doing next.",
  },
  {
    q: "What industries do you specialize in for SEO?",
    a: "We specialize in local service businesses across NYC — plumbers, electricians, HVAC companies, roofers, painters, general contractors, lawyers, dentists, therapists, cleaning services, landscapers, salons, and over 150 additional service categories. If your customers search for your service on Google or ask AI for a recommendation, we know how to get you found.",
  },
  {
    q: "How many pages does my website need for SEO?",
    a: "It depends on how many services you offer and how many areas you serve. A plumber offering 8 services across 40 neighborhoods needs at least 320 service-location pages, plus service hub pages, area hub pages, a homepage, about page, and blog content. Most competitive service businesses in NYC need 500 to 5,000+ pages to fully cover their keyword landscape. We build platforms that scale to 50,000+ pages without performance degradation.",
  },
  {
    q: "Is WordPress good for SEO?",
    a: "WordPress can rank, but it comes with significant technical baggage — slow page loads, plugin conflicts, bloated code, security vulnerabilities, and poor Core Web Vitals scores. For a 10-page brochure site, WordPress is fine. For a competitive service business that needs thousands of optimized pages, fast load times, and clean structured data, WordPress becomes a liability. We build on Next.js because it eliminates these problems at the framework level and gives us complete control over every SEO element.",
  },
];

export default function SEOServicesPage() {
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
    name: "The NYC SEO — SEO Services",
    url: `${SITE_URL}/services/seo`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$2,500 - $15,000/mo",
    description:
      "Full-service search engine optimization agency for local service businesses in NYC, NJ, Long Island, and Westchester. On-page SEO, off-page SEO, technical SEO, local SEO, and AI search optimization.",
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
      latitude: "40.7128",
      longitude: "-74.0060",
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
    name: "Search Engine Optimization (SEO) Services",
    description:
      "Comprehensive SEO services including on-page optimization, off-page link building, technical SEO, local SEO, and AI search optimization for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/seo`,
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
      name: "SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "On-Page SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Off-Page SEO & Link Building" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Technical SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Search Optimization (GEO)" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Programmatic SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "SEO Audits" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Keyword Research" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Schema Markup Implementation" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our NYC SEO Process Works",
    description: "Our proven 6-step SEO process for ranking NYC service businesses in Google, Bing, and AI search platforms.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "SEO Audit & Discovery",
        text: "We audit your current website, rankings, backlink profile, technical health, and competitive landscape. We identify every gap holding you back and every opportunity your competitors are missing.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Keyword Research & Strategy",
        text: "We research every keyword your customers search — high-volume head terms, long-tail phrases, question queries, and local modifiers. We map these keywords to pages and build a content strategy that covers your entire market.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Technical SEO Foundation",
        text: "We fix or rebuild your technical foundation — site architecture, page speed, mobile responsiveness, structured data, XML sitemaps, canonical tags, and Core Web Vitals. If your site is on WordPress, we migrate to Next.js.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "On-Page Optimization & Content",
        text: "We optimize every page — title tags, meta descriptions, heading hierarchy, internal linking, image alt text, and content depth. We create new pages targeting gaps in your keyword coverage.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Off-Page SEO & Authority Building",
        text: "We build your domain authority through strategic link acquisition, local citations, Google Business Profile optimization, review management, and digital PR. Every link is earned, never bought from link farms.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Reporting, Analysis & Iteration",
        text: "We track rankings, traffic, leads, and AI search visibility monthly. We analyze what is working, double down on winning strategies, and adjust underperforming areas. SEO is never set-and-forget — we optimize continuously.",
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
      name: "The NYC SEO — SEO Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "David R." },
    reviewBody:
      "We hired The NYC SEO to rebuild our website and handle our SEO. Within 4 months we were ranking top 3 for our primary keywords across Brooklyn and Manhattan. The programmatic pages they built generated more leads in 90 days than our old WordPress site did in 2 years. Highly recommend.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "SEO Services", url: "/services/seo" },
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
                NYC SEO Agency &middot; 25+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                SEO Services
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  That Actually Generate Leads
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Full-service search engine optimization for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
                in New York City, New Jersey, Long Island, and Westchester. On-page SEO, off-page link building, technical SEO, local SEO,{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>, and{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic SEO</Link>{" "}
                — built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>, not WordPress. We do not sell rankings. We build systems that generate qualified leads from organic search and AI search — month after month, year after year.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "On-page & technical SEO optimization",
                "Off-page link building & digital PR",
                "Local SEO & Google Business Profile",
                "AI search optimization (ChatGPT, Perplexity, Gemini)",
                "Programmatic SEO — hundreds of pages at scale",
                "JSON-LD structured data (7+ schema types)",
                "Core Web Vitals & sub-1-second load times",
                "Monthly reporting with lead attribution",
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
          SECTION 2: WHAT IS SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is SEO and Why Does Your NYC Business Need It?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Search engine optimization is the process of improving your website so it ranks higher in search results when potential customers search for your services. When someone in{" "}
              <Link href="/electrician/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn Heights</Link>{" "}
              searches &ldquo;electrician near me&rdquo; or a homeowner in{" "}
              <Link href="/hvac/westchester" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Westchester</Link>{" "}
              searches &ldquo;AC repair Westchester,&rdquo; SEO determines which businesses appear at the top of Google, Bing, Yahoo, DuckDuckGo, and increasingly, AI search platforms like ChatGPT and Perplexity.
            </p>
            <p>
              For NYC service businesses — <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">general contractors</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              — organic search is the highest-quality lead source available. These are customers who are actively searching for what you do, in the area you serve, right now. They are not scrolling social media. They are not passively watching an ad. They have a problem and they are looking for someone to solve it.
            </p>
            <p>
              The difference between ranking first and ranking tenth on Google is the difference between getting 30% of the clicks and getting less than 2%. In competitive NYC markets, that gap translates to hundreds of thousands of dollars in annual revenue. SEO is not optional for service businesses that want to grow — it is the foundation everything else is built on.
            </p>
            <p>
              And in 2026, SEO is no longer just about Google. Over 100 million people use ChatGPT monthly. Millions more use Perplexity, Gemini, and Claude to find service providers. If your website is not optimized for both traditional search engines and{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>, you are leaving money on the table. We optimize for all of them.
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
            Our 6-Step SEO Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every campaign follows the same proven framework — adapted to your market, your competition, and your business goals.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "SEO Audit & Discovery",
                body: "We start by auditing everything — your current rankings, backlink profile, technical health, content gaps, competitor landscape, and AI search visibility. We use Google Search Console, Ahrefs, Screaming Frog, and proprietary tools to identify every issue holding you back and every opportunity your competitors are missing. This audit becomes the foundation of your entire SEO strategy. Most agencies skip this step or do a surface-level scan. We spend 15 to 20 hours on discovery alone because getting the diagnosis right is more important than jumping into tactics.",
              },
              {
                step: "02",
                title: "Keyword Research & Strategy",
                body: "We research every keyword your customers search — high-volume head terms like 'plumber NYC,' long-tail phrases like 'emergency pipe burst repair Upper West Side,' question queries like 'how much does a plumber cost in Brooklyn,' and AI search queries like 'best plumber near me for old building pipes.' We map each keyword to a specific page, identify content gaps, and build a prioritized roadmap. The result is a complete keyword strategy that covers your entire service area across every neighborhood you serve.",
              },
              {
                step: "03",
                title: "Technical SEO Foundation",
                body: "We fix or rebuild your technical foundation from the ground up. This includes site architecture, URL structure, page speed optimization, mobile responsiveness, structured data implementation (7+ schema types per page), XML sitemaps, canonical tags, robots.txt, hreflang (if applicable), and Core Web Vitals optimization. If your site is on WordPress and suffering from technical debt, we recommend migrating to Next.js — our preferred framework because it solves most technical SEO problems at the code level. Every site we build scores 95+ on PageSpeed Insights.",
              },
              {
                step: "04",
                title: "On-Page Optimization & Content Creation",
                body: "We optimize every existing page and create new pages to fill keyword gaps. Title tags, meta descriptions, heading hierarchy (H1 through H4), internal linking architecture, image optimization, content depth, and semantic relevance — every element is tuned for both search engines and users. We build service pages, location pages, comparison pages, and FAQ content that targets the exact queries your customers search. For businesses that need scale, we use programmatic SEO to generate hundreds of pages — each unique, each optimized, each targeting a real search query.",
              },
              {
                step: "05",
                title: "Off-Page SEO & Authority Building",
                body: "We build your domain authority through strategic, white-hat link acquisition. This includes local citations across 50+ directories, digital PR and media outreach, guest content on relevant industry publications, Google Business Profile optimization, review generation strategies, and brand mention campaigns. Every link is earned through quality content and genuine relationships — never purchased from link farms or PBNs. We also monitor and disavow toxic backlinks that could hurt your rankings.",
              },
              {
                step: "06",
                title: "Reporting, Analysis & Continuous Optimization",
                body: "SEO is never done. We track keyword rankings across Google, Bing, Yahoo, DuckDuckGo, and AI platforms. We monitor organic traffic, click-through rates, conversion rates, and lead attribution. Every month, you receive a detailed report with a recorded walkthrough explaining what happened, what is working, and what we are doing next. We analyze data, identify new opportunities, adjust strategy, and continuously optimize. The businesses that win at SEO are the ones that treat it as an ongoing investment, not a one-time project.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our SEO Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is included in our monthly SEO campaigns. No hidden fees. No surprise upsells.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "On-Page SEO",
                items: ["Title tag & meta description optimization", "Heading hierarchy (H1-H4) structure", "Content optimization & keyword density", "Image alt text & compression", "Internal linking architecture", "URL structure optimization"],
              },
              {
                title: "Technical SEO",
                items: ["Core Web Vitals optimization", "Site speed & performance tuning", "Mobile responsiveness audit", "XML sitemap management", "Robots.txt configuration", "Crawl error resolution"],
              },
              {
                title: "Structured Data",
                items: ["LocalBusiness schema", "Service schema with OfferCatalog", "FAQPage schema", "Review & AggregateRating schema", "BreadcrumbList schema", "HowTo schema", "Organization schema"],
              },
              {
                title: "Off-Page SEO",
                items: ["Strategic link acquisition", "Local citation building (50+ directories)", "Google Business Profile optimization", "Review generation strategy", "Digital PR & brand mentions", "Toxic backlink monitoring & disavow"],
              },
              {
                title: "Local SEO",
                items: ["Google Maps optimization", "Local pack ranking strategy", "Location-specific landing pages", "NAP consistency across the web", "Neighborhood-targeted content", "Local competitor analysis"],
              },
              {
                title: "Reporting & Analytics",
                items: ["Monthly keyword ranking reports", "Google Analytics & Search Console monitoring", "Lead attribution by page & keyword", "AI search visibility tracking", "Core Web Vitals monitoring", "Recorded monthly report walkthrough"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our SEO Services Are For</h2>
          <p className="mt-4 text-zinc-400">
            We specialize exclusively in local service businesses. If your customers find you by searching for what you do plus where you do it, we are built for you.
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
          SECTION 6: SEO vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">SEO vs. Other Marketing Channels</h2>
          <p className="mt-4 text-zinc-400">
            Every marketing channel has trade-offs. Here is how SEO compares to the alternatives NYC service businesses typically consider.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO vs. PPC (Google Ads)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Google Ads delivers instant visibility but stops the moment you stop paying. The average cost-per-click for service keywords in NYC ranges from $15 to $85 — a single lead can cost $150 to $400 through ads. SEO takes 3 to 6 months to build momentum, but once you rank, every click is free. Over a 12-month period, SEO delivers 5x to 12x better ROI than PPC for service businesses. Most of our clients run Google Ads during their first 90 days while SEO builds, then scale ads down as organic traffic takes over. The smartest approach is both — but SEO is the foundation that makes everything else more efficient.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO vs. Social Media Marketing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Social media builds brand awareness, but it does not capture intent. When someone searches &ldquo;emergency plumber Brooklyn,&rdquo; they need a plumber right now. When someone scrolls past your Instagram post, they might remember your name — or they might not. For service businesses, search traffic converts at 3x to 8x the rate of social traffic because search captures demand at the moment of intent. Social media has its place in a marketing mix, but it should never be your primary lead channel if you are a service business.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO vs. Yelp, Angi & HomeAdvisor</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Lead aggregators charge $30 to $100+ per lead, share those leads with 3 to 5 competitors simultaneously, and give you zero control over lead quality. With SEO, you own your traffic. Your leads come to you directly. They visit your website, read your reviews, and call you — not you and four other companies at the same time. The cost per lead through organic search is a fraction of what aggregators charge, and the close rate is significantly higher because the customer has already chosen you before they pick up the phone.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">SEO vs. Door-to-Door, Flyers & Traditional Advertising</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Traditional advertising casts a wide net and hopes for the best. SEO targets customers at the exact moment they are searching for your service. There is no wasted reach, no geographic spray, and no timing dependency. A flyer in a mailbox has a 1% to 2% response rate on a good day. A Google search result for &ldquo;best roofer in Queens&rdquo; converts at 15% to 30%. The math is not close.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: RESULTS / CASE STUDY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results for NYC Service Businesses</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in vanity metrics. Here is what SEO looks like when it is done right.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "54,000+", label: "Pages Built & Indexed" },
              { stat: "170+", label: "Service Categories Covered" },
              { stat: "318", label: "Neighborhoods Targeted" },
              { stat: "< 1s", label: "Average Page Load Time" },
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
              &ldquo;We hired The NYC SEO to rebuild our website and handle our SEO. Within 4 months we were ranking top 3 for our primary keywords across Brooklyn and Manhattan. The programmatic pages they built generated more leads in 90 days than our old WordPress site did in 2 years. The difference between their approach and every other agency we talked to was night and day.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— David R., General Contractor, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;Before The NYC SEO, we were paying $6,000 a month on Google Ads and getting mediocre leads. Six months into our SEO campaign, organic traffic surpassed our paid traffic and the leads were higher quality — people who had already read our reviews and chose us before calling. We cut our ad spend in half and are getting better results.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Maria S., HVAC Company Owner, Queens</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 SEO Mistakes NYC Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Building on WordPress without technical SEO expertise",
                fix: "We build on Next.js — sub-1-second load times, perfect Core Web Vitals, zero plugin bloat. If you are on WordPress and it is holding you back, we migrate you to a modern stack.",
              },
              {
                mistake: "Targeting only broad keywords like 'plumber NYC'",
                fix: "Broad keywords are competitive and expensive. We build hundreds of long-tail pages targeting specific service + neighborhood combinations — 'emergency pipe repair Park Slope,' 'water heater installation Astoria' — where the competition is lower and the intent is higher.",
              },
              {
                mistake: "No structured data (schema markup) on any page",
                fix: "We implement 7+ schema types on every page — LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, and HowTo. This is what Google uses for rich results and what AI platforms use to recommend businesses.",
              },
              {
                mistake: "Ignoring AI search platforms entirely",
                fix: "Over 100 million people use ChatGPT monthly. We optimize your structured data and content so AI models recommend your business when someone asks for a service provider in your area.",
              },
              {
                mistake: "No internal linking strategy",
                fix: "We build 25+ contextual internal links per page, connecting service pages to location pages, blog posts to service pages, and creating a web of topical relevance that search engines reward with higher rankings.",
              },
              {
                mistake: "Buying cheap backlinks from link farms or PBNs",
                fix: "Toxic backlinks get you penalized. We earn links through local citations, digital PR, guest content, and genuine relationships. Every link we build is from a real, relevant website.",
              },
              {
                mistake: "One generic page for each service with no location targeting",
                fix: "A plumber serving 50 neighborhoods needs 50+ location pages. We use programmatic SEO to generate unique, optimized pages for every service-location combination your business serves.",
              },
              {
                mistake: "Ignoring Google Business Profile optimization",
                fix: "Your GBP is often the first thing customers see. We optimize every field, build review generation systems, post regular updates, and ensure your listing dominates the local map pack.",
              },
              {
                mistake: "No mobile optimization in a city where 70%+ of searches are mobile",
                fix: "Every site we build is mobile-first. Not mobile-friendly — mobile-first. The design, content, and user experience are built for the phone screen first, then adapted for desktop.",
              },
              {
                mistake: "Measuring success by rankings alone instead of leads",
                fix: "Rankings mean nothing if they do not generate leads. We track phone calls, form submissions, and revenue attributed to specific pages and keywords. The only metric that matters is qualified leads per month.",
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
          SECTION 9: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">SEO Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into strategy, content, optimization, and link building — not overhead. 20+ years of results behind every campaign.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses targeting one borough or region.",
                features: [
                  "Full SEO audit & keyword strategy",
                  "On-page optimization (up to 50 pages)",
                  "Technical SEO & Core Web Vitals",
                  "Local citation building (50+ directories)",
                  "Google Business Profile optimization",
                  "Schema markup (5+ types per page)",
                  "Monthly reporting with lead attribution",
                  "Hosting included",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses targeting multiple boroughs or the full NYC metro.",
                features: [
                  "Everything in Foundation, plus:",
                  "Programmatic page generation (up to 1,000 pages)",
                  "Off-page link building (15+ links/month)",
                  "AI search optimization (GEO)",
                  "Content creation (4 articles/month)",
                  "Competitor monitoring & gap analysis",
                  "7+ schema types per page",
                  "Bi-weekly strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want to own their entire market — every keyword, every neighborhood.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited programmatic pages",
                  "Aggressive link building (30+ links/month)",
                  "Full Next.js website build or migration",
                  "AI agent development & integration",
                  "Multi-location & multi-state targeting",
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
            All plans include a free initial SEO audit. Custom plans available.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            including project-based and hourly rates.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">25+ Years of Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We have been building websites and ranking businesses since before Google existed. Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over two decades of experience in digital marketing, branding, and web development. We have seen every algorithm update, every industry shift, and every new channel emerge. That experience means we do not chase trends — we build strategies that last.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Next.js — Not WordPress</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most SEO agencies build on WordPress because it is easy. We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                because it is better. Sub-1-second page loads. Perfect Core Web Vitals. Zero plugin vulnerabilities. Static generation for 50,000+ pages. Server-side rendering when you need dynamic content. Code-level control over every SEO element. WordPress cannot do what we do.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Programmatic SEO at Scale</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not manually write 500 location pages. We{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">build systems</Link>{" "}
                that generate them — each page unique, each page optimized, each page targeting a real keyword with real search volume. This is how we build 54,000+ page platforms that a traditional agency could not produce in a decade.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">AI Search — Before Your Competitors</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                While most agencies are still trying to figure out{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>, we are already ranking our clients in ChatGPT, Perplexity, Gemini, and Claude. We optimize structured data, content clarity, and entity associations so AI models understand and recommend your business. The agencies that figure this out first will dominate the next decade of search. We are already there.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            SEO works best as part of an integrated system. These services complement and amplify your SEO campaigns.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic foundation that drives every optimization decision." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered to rank from day one." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Dominate the local map pack and Google Maps." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content that ranks and converts." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of optimized pages at scale." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "AI chatbots that qualify leads 24/7 using your SEO data." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track rankings, traffic, and lead attribution across all channels." },
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
          SECTION 12: SERVICE AREAS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">NYC SEO Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide SEO services across the entire NYC metropolitan area — every borough, every neighborhood, every suburb.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                region: "Manhattan",
                areas: [
                  { name: "Upper East Side", href: "/plumber/upper-east-side" },
                  { name: "Upper West Side", href: "/electrician/upper-west-side" },
                  { name: "Midtown", href: "/hvac/midtown" },
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
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 13: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About NYC SEO Services</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about search engine optimization.
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
          SECTION 14: FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
