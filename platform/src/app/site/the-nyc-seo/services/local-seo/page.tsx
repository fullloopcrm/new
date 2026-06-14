// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Local SEO Services NYC | Google Maps",
  description:
    "Local SEO services for NYC businesses. Google Maps, Local Pack, GBP optimization, citations, and review management. Dominate local search in every borough.",
  keywords: [
    "local SEO services NYC",
    "local SEO agency New York City",
    "Google Maps optimization NYC",
    "local pack ranking NYC",
    "Google Business Profile optimization",
    "local citations NYC",
    "NAP consistency",
    "near me SEO",
    "neighborhood SEO NYC",
    "local search optimization",
    "local SEO company near me",
    "best local SEO agency New York",
    "small business local SEO NYC",
    "local SEO for service businesses",
    "Google Maps ranking service",
  ],
  openGraph: {
    title: "Local SEO Services NYC | Google Maps",
    description:
      "Local SEO for NYC businesses. Google Maps, Local Pack, GBP optimization, citations, and review management. Dominate local search.",
    url: `${SITE_URL}/services/local-seo`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/local-seo` },
};

const faqs = [
  {
    q: "What is local SEO and how is it different from regular SEO?",
    a: "Local SEO is a specialized branch of search engine optimization that focuses on improving your visibility in geographically relevant search results. While traditional SEO targets broad, national, or global keywords, local SEO targets searches with local intent — queries like 'plumber near me,' 'best dentist Upper East Side,' or 'emergency electrician Brooklyn.' Local SEO involves optimizing your Google Business Profile, building local citations, managing reviews, ensuring NAP consistency across the web, and creating neighborhood-targeted landing pages. For NYC service businesses, local SEO is what puts you in the Google Maps 3-pack and drives phone calls from customers in your exact service area.",
  },
  {
    q: "How long does local SEO take to show results in NYC?",
    a: "Most NYC service businesses see measurable improvements in local pack visibility within 60 to 90 days. Google Business Profile optimizations — categories, attributes, photos, posts, and Q&A — can impact your Maps ranking within weeks. Citation building and NAP cleanup typically show results in 60 to 120 days as search engines re-crawl and verify your business information across the web. Competitive neighborhoods like Midtown Manhattan, Williamsburg, or Park Slope may take 4 to 6 months for consistent top-3 local pack positions. We provide monthly progress reports so you see movement from week one.",
  },
  {
    q: "How much does local SEO cost in New York City?",
    a: "Our local SEO campaigns start at $3,500 per month for single-location service businesses targeting one borough or region. Multi-location campaigns covering multiple boroughs or the full NYC metro area range from $7,500 to $15,000+ per month depending on the number of locations, service areas, and competitive landscape. Every dollar goes into Google Business Profile optimization, citation building, review strategy, location page creation, local link building, and monthly reporting. No fluff, no vanity metrics — just the work that moves your local rankings.",
  },
  {
    q: "What is the Google local pack and why does it matter?",
    a: "The Google local pack — also called the map pack or 3-pack — is the section of Google search results that shows three local businesses on a map. It appears for searches with local intent, like 'plumber near me' or 'dentist Brooklyn Heights.' The local pack gets approximately 42% of all clicks on the search results page, making it the single most valuable real estate in local search. If your business is not in the local pack for your target keywords, you are invisible to nearly half of your potential customers. Local SEO is the discipline that gets you into — and keeps you in — the local pack.",
  },
  {
    q: "How do you optimize a Google Business Profile for NYC businesses?",
    a: "We optimize every element of your Google Business Profile: primary and secondary categories, business description with target keywords, service areas covering every neighborhood you serve, complete service listings with descriptions and pricing, regular Google Posts (weekly minimum), Q&A seeding with common customer questions, photo optimization with geo-tagged images, attributes that match your service offerings, and review response templates. We also monitor your profile for unauthorized edits, competitor sabotage, and Google suspensions. For multi-location businesses, we manage separate profiles for each location with unique content and localized strategies.",
  },
  {
    q: "What are local citations and why do they matter for local SEO?",
    a: "Local citations are mentions of your business name, address, and phone number (NAP) on external websites — directories like Yelp, Yellow Pages, BBB, Angi, Thumbtack, industry-specific directories, and local business listings. Citations are one of Google's primary signals for verifying that your business is legitimate, located where you say you are, and serving the areas you claim. Inconsistent citations — different phone numbers, old addresses, misspelled business names — confuse search engines and suppress your local rankings. We build citations on 80+ authoritative directories and clean up every inconsistency across the web.",
  },
  {
    q: "What is NAP consistency and how does it affect my local rankings?",
    a: "NAP stands for Name, Address, Phone number. NAP consistency means your business information is identical everywhere it appears online — your website, Google Business Profile, Yelp, Facebook, BBB, industry directories, and every other listing. Even small discrepancies — 'Street' vs 'St,' '212-202-9220' vs '(212) 202-9220,' 'Suite 4B' vs '#4B' — can confuse search engines and hurt your local rankings. We audit every existing citation, correct inconsistencies, suppress duplicate listings, and establish a standardized NAP format that we enforce across all platforms.",
  },
  {
    q: "How important are Google reviews for local SEO in NYC?",
    a: "Google reviews are one of the top three ranking factors for the local pack. Businesses with more reviews, higher average ratings, and recent review activity consistently outrank competitors with fewer or older reviews. In competitive NYC markets, the difference between ranking first and fourth in the local pack often comes down to review volume and velocity. We implement review generation systems — automated follow-up emails, SMS review requests, QR codes for in-person businesses — that systematically increase your review count. We also create response templates so every review gets a thoughtful, keyword-rich reply.",
  },
  {
    q: "Do you create location-specific landing pages for each neighborhood?",
    a: "Yes. Location pages are one of the most powerful local SEO tactics for service businesses. If you are a plumber serving 40 neighborhoods, you need 40 unique location pages — one targeting 'plumber Park Slope,' another targeting 'plumber Astoria,' another targeting 'plumber Upper West Side,' and so on. Each page includes unique content about that neighborhood, localized testimonials, specific service details relevant to the area (building types, common plumbing issues, etc.), proper LocalBusiness schema markup, and internal links to your service and area hub pages. We use programmatic SEO to generate these pages at scale — each unique, each optimized, each targeting a real search query.",
  },
  {
    q: "What is the difference between local SEO and Google Ads for local businesses?",
    a: "Google Ads (Local Services Ads and Search Ads) give you immediate visibility at the top of search results, but you pay for every click or lead. Local SEO takes 60 to 120 days to build momentum, but once you rank in the local pack and organic results, every click is free. In NYC, the average cost-per-click for local service keywords ranges from $15 to $85. A plumber ranking in the local pack for 'plumber near me' gets 50+ free clicks per day that would cost $750 to $4,250 daily through Google Ads. Most of our clients run ads during their first 90 days while local SEO builds, then reduce ad spend as organic rankings take over.",
  },
  {
    q: "Can you help with local SEO for multiple business locations in NYC?",
    a: "Absolutely. Multi-location local SEO is one of our specialties. Each location needs its own Google Business Profile, unique landing page, localized citations, separate review generation strategy, and location-specific content. We manage multi-location campaigns for businesses with 2 to 50+ locations across the NYC metro area. Each location gets its own local SEO strategy based on its specific competitive landscape, neighborhood demographics, and service offerings. We also manage location group structures in Google Business Profile and ensure no two locations cannibalize each other's rankings.",
  },
  {
    q: "How does local SEO work for service-area businesses without a storefront?",
    a: "Service-area businesses (SABs) — plumbers, electricians, cleaners, landscapers, and other businesses that travel to customers — use a different Google Business Profile setup than storefront businesses. Instead of displaying a physical address, SABs define service areas by city, zip code, or region. We optimize your SAB profile by selecting the right service areas (up to 20), ensuring your hidden address matches your other citations, and building location pages that target each service area individually. SABs can absolutely dominate the local pack — they just require a different optimization approach than brick-and-mortar businesses.",
  },
  {
    q: "What local SEO tools do you use?",
    a: "We use a combination of industry-leading tools and proprietary systems. For citation auditing and building: BrightLocal, Whitespark, and Yext. For Google Business Profile analytics: the GBP dashboard, GMB Crush, and Local Falcon for geo-grid ranking reports. For keyword research: Ahrefs, SEMrush, and Google Keyword Planner with local modifiers. For technical auditing: Screaming Frog, Google Search Console, and PageSpeed Insights. For review monitoring: our custom review aggregation system built on our Full Loop CRM platform. And for reporting: custom dashboards that combine data from all sources into a single monthly report.",
  },
  {
    q: "Do you handle local SEO for businesses in New Jersey, Long Island, and Westchester?",
    a: "Yes. Our core service area covers the entire NYC metropolitan area — all five boroughs plus Northern New Jersey (Hoboken, Jersey City, Newark, Montclair, and surrounding areas), Long Island (Nassau and Suffolk counties), and Westchester County. The local search dynamics in these areas are closely tied to NYC, and many businesses serve customers across state and county lines. We understand the nuances of multi-jurisdiction local SEO and build strategies that maximize visibility in every market you serve.",
  },
  {
    q: "What is geo-grid ranking and how do you use it for local SEO?",
    a: "Geo-grid ranking (also called local rank tracking or heat map ranking) shows your Google Maps ranking at multiple geographic points across your service area. Instead of checking your rank from a single location, we check it from a grid of 25 to 100+ points spread across your target area. This reveals exactly where you rank well, where you are weak, and where your competitors outperform you. We use this data to prioritize optimizations — if you rank #1 within a mile of your office but fall to #8 three miles away, we know exactly where to focus our citation building, content targeting, and GBP optimization efforts.",
  },
  {
    q: "How do 'near me' searches work and how do you optimize for them?",
    a: "When someone searches 'plumber near me' or 'dentist near me,' Google uses the searcher's physical location (via GPS, Wi-Fi, or IP address) to determine which local businesses to show. You cannot directly target the keyword 'near me' — instead, you optimize your overall local SEO footprint so Google considers your business relevant for nearby searchers. This means having a well-optimized Google Business Profile, strong citation presence, consistent NAP data, positive reviews, and relevant content on your website. We also optimize for explicit neighborhood searches — 'plumber Park Slope,' 'dentist Midtown' — which capture the same intent but with a specific location modifier.",
  },
  {
    q: "What happens if my Google Business Profile gets suspended?",
    a: "GBP suspensions happen more frequently than most business owners realize — duplicate listings, address changes, category disputes, and false reports from competitors can all trigger suspensions. If your profile gets suspended, you disappear from Google Maps entirely. We handle GBP reinstatement as part of our local SEO service. This includes identifying the suspension cause, preparing reinstatement documentation, submitting appeals through the proper channels, and escalating through Google's support hierarchy if needed. For high-priority cases, we leverage our Google Business Profile product expert network for faster resolution.",
  },
  {
    q: "Can local SEO help my business appear in voice search results?",
    a: "Yes. Voice searches — through Google Assistant, Siri, Alexa, and other voice platforms — are inherently local. When someone says 'Hey Google, find me a plumber near me,' Google pulls from the same local pack results that local SEO optimizes for. Voice search results heavily favor businesses with complete Google Business Profiles, high review ratings, and strong local authority. We optimize your content for conversational queries that match how people speak, not just how they type. As voice search grows (projected to account for 50% of all searches by 2027), local SEO becomes even more critical.",
  },
];

export default function LocalSEOServicesPage() {
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
    name: "The NYC SEO — Local SEO Services",
    url: `${SITE_URL}/services/local-seo`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$3,500 - $15,000+/mo",
    description:
      "Local SEO agency specializing in Google Maps optimization, local pack rankings, Google Business Profile management, local citation building, NAP consistency, review strategy, and neighborhood-targeted landing pages for service businesses across NYC, NJ, Long Island, and Westchester.",
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
      latitude: "40.7590",
      longitude: "-73.9845",
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
    name: "Local SEO Services",
    description:
      "Comprehensive local SEO services including Google Business Profile optimization, local citation building, NAP consistency management, Google Maps optimization, review strategy, location page creation, and local link building for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/local-seo`,
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
      name: "Local SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Business Profile Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local Citation Building" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "NAP Consistency Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Maps Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Review Generation & Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Location Page Creation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local Link Building" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Geo-Grid Rank Tracking" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local Keyword Research" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Competitor Local Analysis" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our NYC Local SEO Process Works",
    description: "Our proven 6-step local SEO process for getting NYC service businesses into the Google Maps local pack and dominating neighborhood search results.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Local SEO Audit & Citation Analysis",
        text: "We audit your current local search visibility — Google Business Profile health, existing citations across 80+ directories, NAP consistency, review profile, local pack rankings across a geo-grid, and competitor local presence. We identify every inconsistency, every missing citation, and every opportunity your competitors are exploiting that you are not.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Google Business Profile Optimization",
        text: "We optimize every element of your GBP — primary and secondary categories, business description, service areas, service listings, attributes, photos with geo-tags, Google Posts, Q&A seeding, and product listings. For multi-location businesses, we set up and optimize separate profiles for each location.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Citation Building & NAP Cleanup",
        text: "We build citations on 80+ authoritative directories — general directories like Yelp, BBB, and Yellow Pages, plus industry-specific directories relevant to your trade. We correct every NAP inconsistency, suppress duplicate listings, and establish a standardized format enforced across all platforms.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Location Page Creation & On-Page Local SEO",
        text: "We create unique, optimized landing pages for every neighborhood you serve — each with localized content, LocalBusiness schema markup, neighborhood-specific testimonials, and internal links to your service and area hub pages. We use programmatic SEO to generate these pages at scale.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Review Strategy & Local Link Building",
        text: "We implement automated review generation systems, create review response templates, and build local backlinks through community sponsorships, local business associations, chamber of commerce memberships, neighborhood blogs, and local media outreach.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Geo-Grid Tracking, Reporting & Optimization",
        text: "We track your local pack rankings across a geo-grid of 25 to 100+ points covering your entire service area. Monthly reports include Google Maps rankings, local pack positions, citation health, review metrics, and lead attribution. We continuously optimize based on data — doubling down on what works and fixing what does not.",
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
      name: "The NYC SEO — Local SEO Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Anthony M." },
    reviewBody:
      "We were buried on page 3 of Google Maps for every keyword that mattered. The NYC SEO rebuilt our Google Business Profile, cleaned up 40+ incorrect citations, and built location pages for every neighborhood we serve in Brooklyn and Queens. Within 90 days we were in the local pack for our top 5 keywords. Within 6 months we were getting 3x the phone calls from Google Maps alone. Best investment we ever made.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Local SEO Services", url: "/services/local-seo" },
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
                NYC Local SEO Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Local SEO Services
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  That Dominate the Map Pack
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                The #1 local SEO agency for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service businesses</Link>{" "}
                in New York City. We put you in the Google Maps local pack, build your{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                into a lead-generating machine, and create neighborhood-targeted landing pages for every{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">area you serve</Link>{" "}
                — from{" "}
                <Link href="/plumber/upper-east-side" className="text-[#5CB8FF] hover:text-[#8DD0FF]">the Upper East Side</Link>{" "}
                to{" "}
                <Link href="/electrician/astoria" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Astoria</Link>{" "}
                to{" "}
                <Link href="/hvac/hoboken" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Hoboken</Link>.{" "}
                Built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>, not WordPress. No vanity metrics — just phone calls from customers who found you on the map.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Google Business Profile optimization & management",
                "Google Maps & local pack ranking strategy",
                "Local citation building (80+ directories)",
                "NAP consistency audit & cleanup",
                "Review generation & response systems",
                "Neighborhood-targeted location pages",
                "Geo-grid rank tracking across your service area",
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
          SECTION 2: WHAT IS LOCAL SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Local SEO and Why Does Your NYC Business Need It?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Local SEO is the practice of optimizing your online presence so you appear in search results when potential customers search for services near them. When a homeowner in{" "}
              <Link href="/plumber/park-slope" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Park Slope</Link>{" "}
              searches &ldquo;plumber near me,&rdquo; when a business owner in{" "}
              <Link href="/electrician/midtown" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Midtown Manhattan</Link>{" "}
              searches &ldquo;commercial electrician Midtown,&rdquo; or when someone in{" "}
              <Link href="/dentist/astoria" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Astoria</Link>{" "}
              asks Google &ldquo;best dentist near Astoria Queens&rdquo; — local SEO determines which businesses appear in the Google Maps local pack, the organic results, and increasingly, in AI search platforms like ChatGPT and Perplexity. Over 46% of all Google searches have local intent. In New York City — the most competitive local search market in the United States — that percentage is even higher because nearly every service search is inherently geographic.
            </p>
            <p>
              The Google local pack — the three business listings that appear with a map at the top of search results — captures approximately 42% of all clicks for local searches. Below it, the organic results capture another 30% to 40%. If your business is not visible in either of these areas, you are invisible to the vast majority of customers actively searching for what you do in your area. For NYC{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC contractors</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>,{" "}
              and every other service category, the local pack is where the highest-intent customers live. These are people who need your service right now, in their neighborhood, and they are ready to call.
            </p>
            <p>
              Local SEO is different from general{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine optimization</Link>{" "}
              because it relies on a unique set of ranking factors. Your Google Business Profile is the centerpiece — categories, attributes, photos, reviews, posts, Q&A, and service listings all influence your Maps ranking. Beyond that, citation consistency across the web (Yelp, BBB, Yellow Pages, industry directories), review volume and velocity, proximity to the searcher, and the localized relevance of your website content all determine where you appear in the local pack. Traditional SEO tactics like backlinks and content quality still matter, but they work alongside these local-specific signals. You need both to win.
            </p>
            <p>
              New York City is uniquely challenging for local SEO because of the density of competition. A{" "}
              <Link href="/plumber/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber in Brooklyn Heights</Link>{" "}
              competes not only with other Brooklyn Heights plumbers but with plumbers in{" "}
              <Link href="/plumber/downtown-brooklyn" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Downtown Brooklyn</Link>,{" "}
              <Link href="/plumber/cobble-hill" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Cobble Hill</Link>,{" "}
              <Link href="/plumber/dumbo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">DUMBO</Link>, and surrounding neighborhoods — all within a two-mile radius. The businesses that rank in the local pack here are the ones with the most optimized profiles, the most consistent citations, the best review strategies, and the strongest locally-relevant content. That is exactly what we build. We have been doing local SEO in this city for over 20 years, and we know what it takes to win in the most competitive local search market in the country.
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
            Our 6-Step Local SEO Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every local SEO campaign follows our proven framework — adapted to your industry, your neighborhoods, and your competitive landscape.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Local SEO Audit & Citation Analysis",
                body: "We start by auditing your entire local search footprint. We analyze your Google Business Profile health score, existing citations across 80+ directories, NAP consistency, review profile (count, velocity, average rating, response rate), local pack rankings across a geo-grid of your service area, and your competitors' local presence. We use BrightLocal, Whitespark, Local Falcon, Screaming Frog, and proprietary tools to identify every inconsistency, every missing citation, and every opportunity your competitors are exploiting that you are not. This audit typically uncovers 20 to 50 actionable issues that are suppressing your local rankings — from incorrect phone numbers on obscure directories to missing GBP categories to duplicate listings cannibalizing your visibility.",
              },
              {
                step: "02",
                title: "Google Business Profile Optimization",
                body: "Your Google Business Profile is the single most important asset for local SEO. We optimize every element: primary and secondary categories (the #1 local ranking factor), keyword-rich business description, comprehensive service areas covering every neighborhood you serve, detailed service listings with descriptions and pricing, business attributes that match your offerings, geo-tagged photos (exterior, interior, team, work examples), weekly Google Posts to signal freshness, Q&A seeding with the top questions your customers ask, and product listings where applicable. For multi-location businesses, we set up and optimize separate profiles for each location with unique content and localized strategies. We also set up monitoring for unauthorized edits, competitor-submitted suggestions, and potential suspensions.",
              },
              {
                step: "03",
                title: "Citation Building & NAP Cleanup",
                body: "We build your citation profile across 80+ authoritative directories — general platforms like Yelp, BBB, Yellow Pages, Foursquare, and Apple Maps, plus industry-specific directories relevant to your trade (Angi, Thumbtack, Avvo for lawyers, Healthgrades for dentists, Houzz for contractors). Simultaneously, we audit every existing citation, correct NAP inconsistencies (even minor formatting differences), suppress duplicate listings, and establish a standardized NAP format that we enforce across all platforms. Citation consistency is one of Google's primary trust signals — if your phone number is different on Yelp than on your website, Google is less confident about your business information, and your local rankings suffer.",
              },
              {
                step: "04",
                title: "Location Page Creation & On-Page Local SEO",
                body: "We create unique, SEO-optimized landing pages for every neighborhood you serve. A plumber serving 40 NYC neighborhoods gets 40 unique location pages, each targeting queries like 'plumber Park Slope,' 'emergency plumber Astoria,' 'plumber near me Upper West Side.' Each page includes localized content about the neighborhood (building types, common service issues, local landmarks for context), LocalBusiness schema markup, neighborhood-specific testimonials, photos, internal links to your service hub and area hub pages, and clear calls to action. We use programmatic SEO to generate these pages at scale — each unique, each properly optimized, each targeting a real search query with real volume. This approach would take a traditional agency months of manual work. We do it in days.",
              },
              {
                step: "05",
                title: "Review Strategy & Local Link Building",
                body: "Reviews are one of the top three local pack ranking factors. We implement automated review generation systems — follow-up emails after service completion, SMS review requests, QR codes for in-person handoff, and integration with your CRM or scheduling software. We create review response templates (both positive and negative) so every review gets a thoughtful, keyword-rich reply that reinforces your local relevance. For link building, we target locally relevant sources: neighborhood blogs, local business associations, chamber of commerce memberships, community sponsorships, local media coverage, and partnerships with complementary businesses in your area. Every link is earned, never purchased from link farms.",
              },
              {
                step: "06",
                title: "Geo-Grid Tracking, Reporting & Continuous Optimization",
                body: "We track your local pack rankings across a geo-grid of 25 to 100+ points covering your entire service area — showing exactly where you rank at every point on the map. Monthly reports include Google Maps rankings, local pack positions for target keywords, citation health scores, review metrics (new reviews, average rating, response rate), website traffic from local searches, phone call and form submission attribution, and competitor movement. We analyze the data, identify what is working, double down on winning strategies, and adjust underperforming areas. Local SEO is never set-and-forget — search landscapes shift, competitors optimize, and Google updates its algorithms. We optimize continuously.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Local SEO Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is included in our monthly local SEO campaigns. No hidden fees. No surprise upsells. Everything you need to dominate the local pack in NYC.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Google Business Profile Optimization",
                items: ["Primary & secondary category optimization", "Keyword-rich business description", "Service area configuration (all target neighborhoods)", "Service listings with descriptions & pricing", "Weekly Google Posts for freshness signals", "Photo optimization with geo-tagging", "Q&A seeding with target keywords", "Suspension monitoring & reinstatement"],
              },
              {
                title: "Local Citation Building",
                items: ["80+ directory submissions (general & industry-specific)", "Yelp, BBB, Yellow Pages, Apple Maps, Foursquare", "Industry directories (Angi, Thumbtack, Avvo, Houzz, etc.)", "Data aggregator submissions (Neustar, Factual, Infogroup)", "Duplicate listing suppression", "Monthly citation auditing & maintenance"],
              },
              {
                title: "Location Pages & Content",
                items: ["Unique landing pages for every target neighborhood", "Localized content with neighborhood context", "LocalBusiness schema markup per page", "Internal linking to service & area hubs", "Programmatic page generation at scale", "Location-specific calls to action"],
              },
              {
                title: "Review Strategy",
                items: ["Automated review request systems (email & SMS)", "QR code generation for in-person requests", "Review response templates (positive & negative)", "Review monitoring across all platforms", "Competitor review benchmarking", "Review widget integration for your website"],
              },
              {
                title: "NAP Consistency",
                items: ["Full NAP audit across all platforms", "Standardized NAP format enforcement", "Incorrect citation correction", "Old address & phone number cleanup", "Franchise/multi-location NAP management", "Ongoing consistency monitoring"],
              },
              {
                title: "Local Link Building",
                items: ["Neighborhood blog outreach & placements", "Local business association memberships", "Chamber of commerce directory listings", "Community sponsorship link opportunities", "Local media & press outreach", "Complementary business partnerships"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our Local SEO Services Are For</h2>
          <p className="mt-4 text-zinc-400">
            If your customers find you by searching for what you do plus where you do it, local SEO is the single most important marketing investment you can make. We specialize in these NYC service industries:
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
            — we almost certainly cover it. Any service business that depends on local customers finding them through Google Maps and local search is a perfect fit for our local SEO campaigns.
          </p>
        </div>
      </section>

      {/* ============================================================
          MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 7: LOCAL SEO vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Local SEO vs. Other Marketing Channels</h2>
          <p className="mt-4 text-zinc-400">
            NYC service businesses have limited marketing budgets. Here is how local SEO compares to the alternatives — and why it delivers the highest ROI for businesses that depend on local customers.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Local SEO vs. National/Traditional SEO</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Traditional{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
                focuses on ranking for broad, non-geographic keywords — &ldquo;best CRM software&rdquo; or &ldquo;project management tools.&rdquo; Local SEO focuses on ranking for geographically modified searches — &ldquo;plumber Brooklyn Heights,&rdquo; &ldquo;dentist near me Midtown,&rdquo; &ldquo;emergency electrician Queens.&rdquo; The ranking factors are different: local SEO weighs Google Business Profile signals, citation consistency, review metrics, and proximity heavily, while traditional SEO weighs backlinks, content depth, and domain authority more. For NYC service businesses, you need both — but local SEO is the foundation because it controls your visibility in the map pack, which is where 42% of local clicks happen. We integrate local SEO with your broader{" "}
                <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
                so every channel reinforces the others.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Local SEO vs. Google Ads (PPC)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Google Ads — including Local Services Ads (LSAs) — give you instant visibility but cost $15 to $85 per click for service keywords in NYC. A plumber paying $40 per click who gets 50 clicks a day spends $2,000 daily — $60,000 a month — just to maintain visibility. Local SEO takes 60 to 120 days to build, but once you rank in the local pack, every click is free. A plumber in the #1 local pack position for &ldquo;plumber near me&rdquo; in Brooklyn gets 50+ free clicks per day that would cost thousands through ads. The smartest approach: run Google Ads during your first 90 days while local SEO builds, then scale ads down as your local pack rankings take over. Over 12 months, local SEO delivers 8x to 15x better ROI than PPC for local service businesses.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Local SEO vs. Yelp, Angi & Lead Aggregators</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Yelp, Angi, HomeAdvisor, and Thumbtack charge $30 to $100+ per lead and share those leads with 3 to 5 competitors simultaneously. You are bidding against other businesses for the same customer, and the platform controls pricing, lead quality, and distribution. With local SEO, customers find you directly on Google Maps, visit your website, read your reviews, and call you — not you and four other companies at the same time. The cost per lead through local SEO is a fraction of what aggregators charge, your close rate is significantly higher because the customer has already chosen you, and you own the relationship from the first interaction. Aggregators rent you visibility. Local SEO builds an asset you own permanently.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Local SEO vs. Social Media Marketing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Social media builds awareness but does not capture intent. When someone searches &ldquo;emergency plumber Brooklyn&rdquo; at 2 AM with a burst pipe, they are not scrolling Instagram — they are on Google Maps. Social media has a 1% to 3% conversion rate for service businesses. Local search converts at 15% to 30% because it captures customers at the exact moment of need. Social media has its place for brand building and community engagement, but for service businesses that need phone calls and booked jobs, local SEO is the highest-converting channel available. Every dollar spent on local SEO generates more leads than the equivalent spent on social media advertising.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Real Local SEO Results for NYC Service Businesses</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in vanity metrics. Here is what local SEO looks like when it is done right — in the most competitive local market in the country.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "3x", label: "Average Increase in Google Maps Calls" },
              { stat: "42%", label: "Click Share from Local Pack Rankings" },
              { stat: "318", label: "NYC Neighborhoods Targeted" },
              { stat: "80+", label: "Citation Directories Managed" },
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
              &ldquo;We were buried on page 3 of Google Maps for every keyword that mattered. The NYC SEO rebuilt our Google Business Profile, cleaned up over 40 incorrect citations, and built location pages for every neighborhood we serve in Brooklyn and Queens. Within 90 days we were in the local pack for our top 5 keywords. Within 6 months we were getting 3x the phone calls from Google Maps alone. They explained everything they were doing and why — no mystery, no fluff. Best investment we have ever made in marketing.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Anthony M., Plumbing Company Owner, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We run a multi-location dental practice across Manhattan and Queens. Before The NYC SEO, our local listings were a mess — duplicate profiles, inconsistent addresses, no review strategy. They consolidated everything, optimized each location's GBP individually, and built neighborhood pages that rank for every 'dentist near me' search in our areas. Our new patient inquiries from Google Maps doubled in 4 months. The geo-grid reports they provide show exactly where we rank at every point across the city. No other agency we spoke to even knew what that was.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Dr. Lisa K., Multi-Location Dental Practice, Manhattan & Queens</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Local SEO Mistakes NYC Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Using the wrong primary category on Google Business Profile",
                fix: "Your primary GBP category is the single most influential local ranking factor. A plumber using 'Home Improvement' instead of 'Plumber' is sabotaging their own rankings. We research the optimal primary and secondary categories for your specific industry and verify them against what top-ranking competitors use in your market.",
              },
              {
                mistake: "Inconsistent NAP across the web — different addresses, old phone numbers, misspelled names",
                fix: "We audit every citation across 80+ directories, correct every inconsistency, suppress duplicates, and establish a standardized NAP format. Even small discrepancies like 'St' vs 'Street' or '212-202-9220' vs '(212) 202-9220' confuse search engines and suppress your local rankings.",
              },
              {
                mistake: "Zero review strategy — relying on customers to leave reviews on their own",
                fix: "The average NYC service business gets 2 to 3 organic reviews per year without a strategy. Your competitors with 200+ reviews are using systems — automated follow-up emails, SMS requests, QR codes. We build and implement these systems so your review count grows consistently month over month.",
              },
              {
                mistake: "One generic service page instead of neighborhood-specific location pages",
                fix: "A plumber with a single 'Services' page cannot rank for 'plumber Park Slope,' 'plumber Astoria,' and 'plumber Upper East Side' simultaneously. You need dedicated location pages for each neighborhood. We use programmatic SEO to generate unique, optimized pages for every service-location combination — hundreds of pages, each targeting a real search query.",
              },
              {
                mistake: "Not responding to Google reviews — especially negative ones",
                fix: "Google has confirmed that review responses influence local rankings. More importantly, 89% of consumers read review responses before choosing a business. We create response templates for every scenario and ensure every review — positive and negative — gets a thoughtful, keyword-rich reply within 24 hours.",
              },
              {
                mistake: "Ignoring Google Posts and treating GBP as a 'set and forget' listing",
                fix: "Google rewards active profiles. We publish Google Posts weekly — offers, updates, events, and tips — to signal freshness and keep your profile engaging. Businesses that post weekly see 7x more profile views than those that do not post at all.",
              },
              {
                mistake: "No photos or low-quality photos on Google Business Profile",
                fix: "Businesses with 100+ photos on GBP get 520% more calls than the average business. We upload geo-tagged, high-quality photos of your team, your work, your vehicles, and your service areas. Every image includes EXIF data with location coordinates that reinforce your geographic relevance.",
              },
              {
                mistake: "Claiming service areas that are too broad — all of NYC instead of specific neighborhoods",
                fix: "Claiming you serve all of New York City dilutes your relevance for any specific neighborhood. We configure your service areas strategically — targeting the neighborhoods where you actually work and can realistically rank. For broader coverage, we use location pages on your website to capture searches in areas beyond your GBP service area radius.",
              },
              {
                mistake: "Not tracking local pack rankings with geo-grid reports",
                fix: "Checking your Google Maps ranking from your office tells you how you rank at one point. Geo-grid tracking shows your ranking at 25 to 100+ points across your entire service area. You might rank #1 near your address but #12 three miles away. Without geo-grid data, you are optimizing blind. We track and report this monthly.",
              },
              {
                mistake: "Relying on Yelp and aggregators instead of building owned local visibility",
                fix: "Yelp and lead aggregators rent you visibility that disappears when you stop paying. Local SEO builds an asset you own — your Google Business Profile, your citations, your reviews, your location pages. Every month of local SEO makes your business harder to displace and less dependent on paid platforms.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">Local SEO Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into GBP optimization, citation building, review strategy, location pages, and local link building — not overhead. 20+ years of results behind every campaign.
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
                  "Full local SEO audit & citation analysis",
                  "Google Business Profile optimization",
                  "Citation building (80+ directories)",
                  "NAP consistency audit & cleanup",
                  "Review generation system setup",
                  "Location pages (up to 20 neighborhoods)",
                  "LocalBusiness schema markup",
                  "Monthly geo-grid ranking reports",
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
                  "Multi-location GBP management",
                  "Programmatic location pages (up to 100 neighborhoods)",
                  "Local link building (10+ links/month)",
                  "Review strategy across multiple platforms",
                  "Competitor local pack monitoring",
                  "AI search optimization for local queries",
                  "Bi-weekly strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want to own the local pack in every neighborhood they serve — every keyword, every map result.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited location pages",
                  "Aggressive local link building (25+ links/month)",
                  "Full Next.js website build or migration",
                  "Multi-state local SEO (NYC, NJ, LI, Westchester)",
                  "Custom review management dashboard",
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
            All plans include a free initial local SEO audit. Custom plans available for multi-location businesses.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            including project-based and hourly rates.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE US
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for Local SEO</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years in NYC Local Search</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We have been ranking NYC businesses in local search since before Google Maps existed. Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over two decades of experience in digital marketing, web development, and local search optimization in the New York City market. We know this city — every borough, every neighborhood, every competitive pocket. We know that ranking a plumber in Park Slope requires a different approach than ranking one in Astoria, and that the local search dynamics in Jersey City are different from those in White Plains. That deep, market-specific knowledge is what separates us from agencies that treat every city the same.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Next.js + Programmatic Local SEO at Scale</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most agencies manually create location pages on WordPress. We build{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js platforms</Link>{" "}
                that generate hundreds of optimized location pages programmatically — each unique, each with proper LocalBusiness schema, each targeting a real local search query. A plumber serving 50 neighborhoods gets 50 location pages in days, not months. And because we build on Next.js instead of WordPress, every page loads in under 1 second, passes Core Web Vitals automatically, and scales to tens of thousands of pages without performance degradation. WordPress cannot do what we do at the scale we do it.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Loop CRM Integration for Review Management</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not just tell you to &ldquo;get more reviews.&rdquo; We build automated systems that make it happen. Through our own{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                platform, we integrate review requests directly into your workflow — automated emails after job completion, SMS follow-ups, QR codes for in-person handoff. Every review request is timed, templated, and tracked. Businesses using our review systems see 5x to 10x increases in monthly review volume within 90 days. More reviews, higher ratings, better local rankings — the entire flywheel accelerates.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Geo-Grid Tracking That Shows the Full Picture</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most agencies check your Google Maps ranking from one location and call it a day. We track your ranking from 25 to 100+ points across your entire service area using Local Falcon geo-grid technology. This shows exactly where you rank strong, where you are weak, and where competitors are beating you — block by block, neighborhood by neighborhood. Our monthly reports include visual heat maps that make it clear where we need to focus next. This is the level of granularity that separates agencies that guess from agencies that know.
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
            Local SEO works best as part of an integrated local marketing system. These services complement and amplify your local SEO campaigns.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service search engine optimization — on-page, off-page, technical, and AI search." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Deep-dive GBP optimization and ongoing management for maximum local pack visibility." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered for local SEO performance from day one." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and AI platforms for local service queries." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "Locally-relevant content that builds topical authority in your service areas." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of neighborhood-targeted location pages at scale." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Geo-grid tracking, lead attribution, and local search performance dashboards." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic foundation that guides every local and organic optimization decision." },
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
          <h2 className="text-3xl font-bold sm:text-4xl">NYC Local SEO Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide local SEO services across the entire NYC metropolitan area — every borough, every neighborhood, every suburb. Here are some of the areas where we actively rank businesses in the local pack.
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
                region: "Bronx, Staten Island, NJ & Long Island",
                areas: [
                  { name: "Riverdale", href: "/roofer/riverdale" },
                  { name: "Staten Island", href: "/general-contractor/staten-island" },
                  { name: "Hoboken, NJ", href: "/plumber/hoboken" },
                  { name: "Jersey City, NJ", href: "/electrician/jersey-city" },
                  { name: "Garden City, LI", href: "/hvac/garden-city" },
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
            we cover across the NYC metro area, or view local SEO results by{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">industry</Link>.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Local SEO in NYC</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about local SEO, Google Maps rankings, Google Business Profile optimization, and neighborhood-targeted search strategies.
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
