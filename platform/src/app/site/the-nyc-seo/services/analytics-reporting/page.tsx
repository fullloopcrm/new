// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "SEO Analytics & Reporting Services NYC",
  description:
    "SEO analytics and reporting for NYC businesses. Real-time dashboards, lead attribution, keyword tracking, and ROI reporting. Data-driven decisions.",
  keywords: [
    "SEO analytics NYC",
    "SEO reporting services",
    "Google Analytics 4 setup NYC",
    "keyword rank tracking",
    "AI search visibility tracking",
    "lead attribution SEO",
    "call tracking SEO",
    "Core Web Vitals monitoring",
    "Google Search Console management",
    "SEO dashboard NYC",
    "conversion rate optimization NYC",
    "monthly SEO reports",
    "SEO ROI tracking",
    "analytics agency New York",
    "search engine reporting",
  ],
  openGraph: {
    title: "SEO Analytics & Reporting Services NYC",
    description:
      "SEO analytics and reporting for NYC businesses. Real-time dashboards, lead attribution, keyword tracking, and ROI reporting.",
    url: `${SITE_URL}/services/analytics-reporting`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/analytics-reporting` },
};

const faqs = [
  {
    q: "What analytics platforms do you use for SEO reporting?",
    a: "We use Google Analytics 4 (GA4) as the primary web analytics platform, Google Search Console for organic search performance data, and Full Loop CRM for lead attribution and revenue tracking. For keyword rank tracking, we monitor positions across Google, Bing, Yahoo, and DuckDuckGo daily. For AI search visibility, we use proprietary monitoring tools that track when and how ChatGPT, Perplexity, Gemini, and Claude mention your business. Core Web Vitals are monitored through a combination of PageSpeed Insights, Chrome UX Report data, and real user monitoring. Every data source feeds into a unified real-time dashboard you can access anytime.",
  },
  {
    q: "How much do SEO analytics and reporting services cost in NYC?",
    a: "Our standalone analytics and reporting services start at $1,500 per month for single-location businesses and scale to $5,000 per month for multi-location operations with complex tracking requirements. Most of our clients include analytics as part of a full SEO campaign — our Foundation tier starts at $3,500 per month, Growth at $7,500 per month, and Domination at $15,000+ per month, all of which include comprehensive analytics and reporting. Every dollar is tied to measurable outcomes — we do not bill for dashboards that sit unread.",
  },
  {
    q: "What is the difference between vanity metrics and revenue metrics?",
    a: "Vanity metrics are numbers that look impressive but do not connect to revenue — total page views, social media impressions, raw traffic numbers, and keyword count. Revenue metrics track outcomes that directly impact your bottom line — phone calls attributed to specific pages, form submissions by keyword, conversion rates by landing page, cost per lead by channel, and revenue generated per organic visit. We report both, but our dashboards lead with revenue metrics because that is what actually matters to your business. A page with 10,000 visits and zero calls is a failure. A page with 200 visits and 40 calls is a winner.",
  },
  {
    q: "How do you track AI search visibility across ChatGPT, Perplexity, and Gemini?",
    a: "We run regular queries across ChatGPT, Perplexity, Gemini, and Claude that mirror what your potential customers would ask — questions like 'best plumber in Brooklyn' or 'who should I hire for HVAC repair in Queens.' We track whether your business is mentioned, how prominently it appears, what context surrounds the mention, and how the recommendations change over time. This data feeds into your monthly report alongside traditional ranking data. AI search visibility is still a frontier — most agencies do not track it at all. We have been monitoring it since these platforms launched and have proprietary benchmarks for over 170 service categories across 318 NYC neighborhoods.",
  },
  {
    q: "Do I get access to a real-time dashboard or just monthly PDFs?",
    a: "Both. You get a real-time dashboard powered by Full Loop CRM that you can check anytime — keyword rankings, traffic trends, lead counts, call logs, form submissions, and conversion rates are all updated continuously. You also receive a comprehensive monthly report delivered as a recorded video walkthrough where we explain what happened, what it means, and what we are doing next. The PDF-only model is dead — you should never have to wait 30 days to see how your marketing is performing.",
  },
  {
    q: "What is call tracking and how does it work for SEO?",
    a: "Call tracking uses unique phone numbers on your website and Google Business Profile to attribute every incoming call to its source — which page the caller visited, which keyword brought them there, which search engine they came from, and how long the call lasted. We use Telnyx for call tracking infrastructure because it provides carrier-grade reliability and detailed call metadata. Every call is logged in Full Loop CRM with the source data attached, so you can see exactly which SEO efforts are generating phone calls and which need adjustment. This is how you know whether your investment in local SEO is actually driving revenue.",
  },
  {
    q: "How do you track form submissions and attribute them to SEO?",
    a: "Every form submission on your website is captured with full attribution data — the page the visitor was on when they submitted, the keyword that brought them to your site, the search engine they used, whether they were a new or returning visitor, and their geographic location. We track this through a combination of GA4 event tracking, UTM parameters, and Full Loop CRM form integration. No submission slips through the cracks. You can see every lead, trace it back to the exact page and keyword that generated it, and calculate your true cost per lead from organic search.",
  },
  {
    q: "What are Core Web Vitals and why do you monitor them?",
    a: "Core Web Vitals are Google's metrics for measuring user experience — Largest Contentful Paint (how fast your main content loads), Interaction to Next Paint (how quickly the page responds to user input), and Cumulative Layout Shift (how stable the layout is as the page loads). Google uses these as ranking factors, meaning poor Core Web Vitals directly hurt your search rankings. We monitor them continuously because performance degrades over time — new images, third-party scripts, and content changes can all slow your site down. When a metric drops below threshold, we fix it before it impacts your rankings. Every site we build on Next.js scores 95+ on PageSpeed Insights, but even high-performing sites need ongoing monitoring.",
  },
  {
    q: "How often do you report on SEO performance?",
    a: "You have real-time access to your dashboard 24/7. Formal reports are delivered monthly and include a recorded video walkthrough. For clients on Growth and Domination tiers, we also provide bi-weekly or weekly check-ins where we review performance data and adjust strategy in real time. If something significant happens — a major ranking change, a traffic spike or drop, a Core Web Vitals issue — we notify you immediately and explain what happened and what we are doing about it. You should never be surprised by your own analytics.",
  },
  {
    q: "Can you set up analytics for a website you did not build?",
    a: "Yes. We set up and configure Google Analytics 4, Google Search Console, call tracking, form tracking, and conversion events on any website regardless of platform. However, we strongly recommend migrating to Next.js for the best possible tracking accuracy and site performance. WordPress sites often have plugin conflicts that interfere with tracking scripts, slow page loads that cause data loss, and caching issues that make analytics unreliable. We have set up analytics on WordPress, Wix, Squarespace, Shopify, and custom-built sites — but the cleanest data always comes from sites we build ourselves.",
  },
  {
    q: "What is conversion rate optimization and how does it relate to analytics?",
    a: "Conversion rate optimization (CRO) uses analytics data to improve the percentage of visitors who take a desired action — calling you, filling out a form, or booking an appointment. Analytics tells us which pages have high traffic but low conversions, which calls-to-action get clicked and which get ignored, and where visitors drop off before converting. We then test changes — different headlines, button placements, form lengths, page layouts — and measure the impact. A 1% improvement in conversion rate on a page that gets 1,000 visits per month means 10 additional leads per month without spending a dollar on additional traffic. CRO is where analytics becomes action.",
  },
  {
    q: "Do you track rankings across multiple search engines or just Google?",
    a: "We track keyword rankings across Google, Bing, Yahoo, and DuckDuckGo — plus AI search platforms including ChatGPT, Perplexity, Gemini, and Claude. Google dominates market share, but Bing powers a significant portion of voice search and is the default search engine for Microsoft Edge users. DuckDuckGo has grown substantially among privacy-conscious users. Yahoo still captures meaningful search volume. And AI search platforms are the fastest-growing discovery channel since mobile. Tracking only Google means you are blind to 20-30% of your potential search visibility.",
  },
  {
    q: "How do you measure the ROI of SEO specifically?",
    a: "We calculate SEO ROI by tracking every lead generated through organic search — phone calls, form submissions, and AI agent interactions — and comparing the revenue those leads generate against the cost of your SEO campaign. Using Full Loop CRM, we can attribute specific customers and revenue back to the exact keyword, page, and search engine that drove them to your site. If your SEO campaign costs $3,500 per month and generates 40 qualified leads that close at a 25% rate with an average job value of $2,000, your monthly revenue from SEO is $20,000 — a 5.7x return. We track this monthly so you always know exactly what your SEO investment is producing.",
  },
  {
    q: "What happens if my rankings drop — will I see it in the dashboard?",
    a: "Yes, immediately. Our rank tracking updates daily, so any significant position changes appear in your dashboard within 24 hours. If a critical keyword drops out of the top 10, we are alerted automatically and begin investigating before you even notice. Common causes include algorithm updates, competitor activity, technical issues, or content changes. We diagnose the cause, implement fixes, and report back to you with a clear explanation of what happened and what we did about it. This is why continuous monitoring matters — the faster you catch a problem, the faster you fix it.",
  },
  {
    q: "Can analytics help me decide which services or areas to expand into?",
    a: "Absolutely. Analytics data reveals which keywords have high search volume but low competition — these are expansion opportunities. We can show you which neighborhoods are searching for your services but finding no relevant results, which service categories have growing demand in your area, and which competitor gaps you can exploit. This data directly informs your SEO strategy, content calendar, and business development decisions. Some of our clients have opened new service lines or expanded into new boroughs based entirely on what the search data told us.",
  },
];

export default function AnalyticsReportingPage() {
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
    name: "The NYC SEO — Analytics & Reporting Services",
    url: `${SITE_URL}/services/analytics-reporting`,
    telephone: PHONE,
    priceRange: "$1,500 - $5,000/mo",
    description:
      "SEO analytics and reporting services for NYC service businesses. Google Analytics 4, Search Console, multi-engine keyword tracking, AI search visibility monitoring, Core Web Vitals, call tracking, lead attribution, and monthly reports with recorded walkthroughs.",
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
    name: "SEO Analytics & Reporting Services",
    description:
      "Comprehensive analytics and reporting for SEO campaigns including Google Analytics 4 setup, Google Search Console management, keyword rank tracking across Google, Bing, Yahoo, and DuckDuckGo, AI search visibility monitoring across ChatGPT, Perplexity, Gemini, and Claude, Core Web Vitals monitoring, call tracking, form submission tracking, lead attribution, conversion rate optimization, and monthly reports with recorded walkthroughs.",
    url: `${SITE_URL}/services/analytics-reporting`,
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
      name: "Analytics & Reporting Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Analytics 4 Setup & Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Search Console Management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Multi-Engine Keyword Rank Tracking" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Search Visibility Monitoring" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Core Web Vitals Monitoring" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Call Tracking & Attribution" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Form Submission Tracking" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Lead Attribution by Page & Keyword" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Conversion Rate Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Monthly Reports with Recorded Walkthroughs" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Real-Time SEO Dashboards" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Analytics & Reporting Process Works",
    description: "Our proven 6-step analytics and reporting process for tracking SEO performance across traditional search engines and AI platforms.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Analytics Audit & Infrastructure Setup",
        text: "We audit your existing analytics setup, identify gaps and misconfigurations, and deploy a comprehensive tracking infrastructure — Google Analytics 4, Google Search Console, call tracking via Telnyx, form tracking, and Full Loop CRM integration.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Keyword & Rank Tracking Configuration",
        text: "We configure daily keyword rank tracking across Google, Bing, Yahoo, and DuckDuckGo for every target keyword, service type, and location your business targets. AI search visibility monitoring is set up across ChatGPT, Perplexity, Gemini, and Claude.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Conversion Tracking & Lead Attribution",
        text: "We implement event-level tracking for every conversion action — phone calls, form submissions, chat interactions, and bookings. Each conversion is attributed to its source keyword, page, and search engine using Full Loop CRM.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Real-Time Dashboard Build",
        text: "We build a custom real-time dashboard that unifies all data sources — rankings, traffic, leads, calls, Core Web Vitals, and AI search visibility — into a single view you can access anytime from any device.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Monthly Reporting & Walkthrough",
        text: "Every month, we deliver a comprehensive report with a recorded video walkthrough explaining performance trends, wins, issues, and strategic recommendations. No jargon — just clear explanations tied to revenue impact.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Continuous Optimization & Alerting",
        text: "We continuously monitor all metrics and set alerts for ranking drops, Core Web Vitals regressions, traffic anomalies, and conversion rate changes. When something changes, we investigate and act before it impacts your revenue.",
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
      name: "The NYC SEO — Analytics & Reporting Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "James K." },
    reviewBody:
      "Before The NYC SEO, we had no idea which pages were generating calls and which were dead weight. Their analytics setup showed us that 3 pages were driving 80% of our leads — and 47 pages were generating zero. We restructured our content strategy based on the data and doubled our lead volume in 4 months without spending an extra dollar on ads.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Analytics & Reporting", url: "/services/analytics-reporting" },
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
                Analytics & Reporting &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                SEO Analytics That Track
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Every Click, Call & AI Mention
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Most agencies hand you a monthly PDF full of vanity metrics and call it reporting. We give you real-time dashboards that track{" "}
                <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">organic search rankings</Link>{" "}
                across Google, Bing, Yahoo, and DuckDuckGo — plus{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>{" "}
                across ChatGPT, Perplexity, Gemini, and Claude. Every phone call is tracked. Every form submission is attributed. Every lead is traced back to the exact keyword and page that generated it. You see what is working, what is not, and where every dollar of your{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO investment</Link>{" "}
                is going — in real time, not 30 days after the fact.
              </p>
              <CTAGroup variant="hero" title="See My Analytics" subtitle="" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Google Analytics 4 setup & management",
                "Google Search Console monitoring",
                "Keyword rank tracking (Google, Bing, Yahoo, DuckDuckGo)",
                "AI search visibility (ChatGPT, Perplexity, Gemini, Claude)",
                "Core Web Vitals continuous monitoring",
                "Call tracking with keyword-level attribution",
                "Form submission tracking & lead source tagging",
                "Conversion rate optimization (CRO)",
                "Real-time dashboards via Full Loop CRM",
                "Monthly reports with recorded video walkthroughs",
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
          SECTION 2: WHY ANALYTICS MATTER
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why SEO Analytics Matter More Than Rankings
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Rankings tell you where you appear in search results. Analytics tell you whether that position is actually generating revenue. A{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentist</Link>{" "}
              can rank number one for a keyword and still lose money if the page is not converting visitors into leads. A{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">general contractor</Link>{" "}
              can rank number seven and be wildly profitable if every visitor who lands on that page picks up the phone. Without analytics, you are guessing. With analytics, you are making decisions based on data that ties directly to your bottom line.
            </p>
            <p>
              The problem with most{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO agencies</Link>{" "}
              is that they report on what is easy to measure, not what matters. They send you screenshots of keyword positions and traffic graphs and call it a day. They never tell you which pages are generating phone calls. They never show you which keywords produce customers who actually pay. They never track whether your{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              is driving more calls than your organic listings. And they certainly do not track whether ChatGPT or Perplexity are recommending your business when someone asks for a{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>{" "}
              or{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electrician</Link>{" "}
              in your neighborhood.
            </p>
            <p>
              We built our analytics practice around one principle: every metric must connect to a lead or a dollar. If a number does not help you make a better business decision, it does not belong in your report. This is why our dashboards lead with revenue metrics — calls, form submissions, conversion rates, cost per lead, and revenue per keyword — not impressions, page views, or bounce rates. Whether you are a{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury lawyer</Link>{" "}
              tracking case inquiries or a{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning service</Link>{" "}
              tracking booking requests, vanity metrics have their place in diagnosis, but they should never be the headline of your monthly report.
            </p>
            <p>
              In 2026, the analytics landscape is more complex than ever. Your customers are finding you through Google, Bing, DuckDuckGo, Yahoo, ChatGPT, Perplexity, Gemini, Claude, Google Maps, voice search on Alexa and Siri, and dozens of other channels. Whether they are searching from{" "}
              <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">neighborhoods across the NYC metro</Link>{" "}
              or browsing{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service categories</Link>{" "}
              on AI platforms, if you are only tracking Google organic traffic, you are blind to a growing percentage of your potential customers. Our analytics infrastructure tracks every channel, attributes every lead, and gives you a complete picture of how your{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              is performing across the entire search ecosystem.
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
            Our 6-Step Analytics & Reporting Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every analytics engagement follows a structured process — from auditing your current tracking infrastructure to delivering monthly reports that tie every metric to revenue.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Analytics Audit & Infrastructure Setup",
                body: "We start by auditing your existing analytics infrastructure — Google Analytics configuration, Search Console setup, conversion tracking, call tracking, and any third-party tools. Most businesses have broken or misconfigured tracking: GA4 events that do not fire, Search Console properties that are not verified, missing call tracking numbers, and form submissions that are not captured. We identify every gap, fix what is broken, and deploy a comprehensive tracking stack. This includes GA4 with custom event tracking, Google Search Console verification and configuration, Telnyx-powered call tracking with unique numbers per traffic source, form submission tracking with full attribution, and Full Loop CRM integration for unified lead management. Whether your site needs a full technical audit or a complete rebuild, the infrastructure we deploy captures every interaction a potential customer has with your business online.",
              },
              {
                step: "02",
                title: "Keyword & Rank Tracking Configuration",
                body: "We set up daily keyword rank tracking across all four major search engines — Google, Bing, Yahoo, and DuckDuckGo — for every keyword your business targets. This includes head terms like 'plumber NYC,' long-tail phrases like 'emergency pipe burst repair Park Slope,' local modifiers like 'best dentist near me Upper East Side,' and question queries like 'how much does HVAC repair cost in Queens.' We also configure AI search visibility monitoring across ChatGPT, Perplexity, Gemini, and Claude, tracking when your business is mentioned, how prominently it appears, and which queries trigger recommendations. Position tracking is not just about knowing where you rank — it is about understanding movement patterns, identifying opportunities, and catching drops before they cost you leads.",
              },
              {
                step: "03",
                title: "Conversion Tracking & Lead Attribution",
                body: "This is where most agencies fail completely. We implement event-level tracking for every conversion action on your website — phone call clicks, form submissions, chat interactions, appointment bookings, and direction requests. Each conversion is attributed to its full source chain: the search engine, the keyword, the landing page, the device type, and the geographic location of the searcher. We connect this data to Full Loop CRM so every lead has a complete attribution trail from first click to closed deal. When you ask 'which keywords are generating revenue,' we can answer with exact numbers, not estimates. When you ask 'which pages are wasting traffic,' we can tell you precisely which ones have high visits and zero conversions.",
              },
              {
                step: "04",
                title: "Real-Time Dashboard Build",
                body: "We build a custom real-time dashboard that unifies every data source into a single, easy-to-read interface. Your dashboard includes keyword rankings with daily position changes and trend lines, organic traffic by search engine and landing page, lead counts broken down by source (organic, maps, AI search, direct), call logs with duration, source attribution, and recording access, form submission feeds with complete attribution data, Core Web Vitals scores with historical trends, AI search visibility scores and mention tracking, and conversion rate metrics by page, keyword, and traffic source. The dashboard is accessible from any device, updates in real time, and requires zero technical knowledge to read. If a metric needs explanation, we label it in plain language. No jargon, no confusion.",
              },
              {
                step: "05",
                title: "Monthly Reporting & Recorded Walkthrough",
                body: "Every month, we compile a comprehensive report covering all performance metrics. But we do not just email you a PDF and move on. Every report comes with a recorded video walkthrough where we explain what happened over the past 30 days — which keywords moved up, which pages generated the most leads, which conversion rates improved, which Core Web Vitals changed, and what we are doing next. We highlight wins so you understand what is working. We flag concerns so you know what we are monitoring. And we outline next steps so you understand exactly where your investment is going. Our Growth and Domination tier clients also receive bi-weekly or weekly strategy calls where we review real-time data together and make optimization decisions on the spot.",
              },
              {
                step: "06",
                title: "Continuous Optimization & Proactive Alerting",
                body: "Analytics is not a set-it-and-forget-it service. We continuously monitor every metric and maintain automated alerts for critical events — keyword ranking drops of 5+ positions, Core Web Vitals failing thresholds, traffic drops exceeding 15%, conversion rate declines, and crawl errors. When an alert fires, we investigate immediately, diagnose the cause, implement a fix, and notify you with a clear explanation. We also use analytics data to drive ongoing optimization decisions: if a page is ranking well but converting poorly, we test new calls-to-action. If a keyword is generating traffic but not leads, we audit the landing page. If AI search mentions are declining, we adjust your structured data and content strategy. Analytics without action is just data collection. We turn data into revenue.",
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
          SECTION 4: WHAT WE TRACK (DELIVERABLES)
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What We Track (and What It Means for Your Revenue)</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every metric below is tracked continuously and reported monthly. No hidden dashboards. No data you cannot access. Complete transparency into everything your{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO campaign</Link>{" "}
              is producing.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Google Analytics 4",
                items: ["Custom event tracking for all conversions", "Traffic segmentation by source & medium", "User behavior flow analysis", "Landing page performance metrics", "Goal completion tracking", "E-commerce & revenue attribution (where applicable)"],
              },
              {
                title: "Google Search Console",
                items: ["Organic click & impression tracking", "Click-through rate by query & page", "Index coverage & crawl status", "Sitemap health monitoring", "Mobile usability reports", "Manual action & security alerts"],
              },
              {
                title: "Multi-Engine Rank Tracking",
                items: ["Daily position tracking (Google, Bing, Yahoo, DuckDuckGo)", "SERP feature monitoring (featured snippets, local pack)", "Competitor position comparison", "Keyword movement trends & alerts", "Local vs. national ranking differences", "Desktop vs. mobile rank splits"],
              },
              {
                title: "AI Search Visibility",
                items: ["ChatGPT mention monitoring", "Perplexity recommendation tracking", "Gemini citation tracking", "Claude mention monitoring", "Query-level visibility scores", "Competitor AI search comparison"],
              },
              {
                title: "Lead Attribution & CRM",
                items: ["Call tracking with keyword attribution (Telnyx)", "Form submission source tracking", "Lead scoring by traffic source", "Revenue attribution by page & keyword", "Customer journey mapping", "Full Loop CRM integration & dashboards"],
              },
              {
                title: "Technical Performance",
                items: ["Core Web Vitals (LCP, INP, CLS)", "PageSpeed Insights monitoring", "Uptime & availability tracking", "Crawl budget analysis", "Structured data validation", "SSL & security monitoring"],
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
          SECTION 5: MID-PAGE CTA
          ============================================================ */}
      <CTAGroup
        variant="mid"
        title="Wondering What Your SEO Is Actually Producing?"
        subtitle="Most NYC businesses have no idea which pages generate calls and which are dead weight. We show you exactly where every lead comes from."
      />

      {/* ============================================================
          SECTION 6: OUR REPORTING vs THEIRS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Our Reporting vs. Their Reporting</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-zinc-400">
            The difference between our analytics and what most agencies deliver is the difference between knowing and guessing.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-semibold text-red-400">Typical SEO Agency Reporting</h3>
              <ul className="mt-6 space-y-4 text-sm text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>Monthly PDF emailed 2 weeks late with no context or explanation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>Google-only rank tracking — blind to Bing, Yahoo, DuckDuckGo, and AI search</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>Vanity metrics front and center — impressions, page views, bounce rate</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>No call tracking — no idea which pages generate phone calls</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>No lead attribution — cannot connect a customer to a keyword</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>No AI search tracking — completely ignoring the fastest-growing channel</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>No real-time access — you wait until they decide to send something</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-red-400">&#10007;</span>
                  <span>No video explanation — just raw data with no interpretation</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#0080FE] bg-[#0080FE]/5 p-8 ring-1 ring-[#0080FE]">
              <h3 className="text-lg font-semibold text-[#EFF70A]">The NYC SEO Reporting</h3>
              <ul className="mt-6 space-y-4 text-sm text-zinc-300">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>Real-time dashboard — check your data anytime from any device</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>Multi-engine tracking — Google, Bing, Yahoo, DuckDuckGo + AI platforms</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>Revenue metrics first — calls, leads, conversion rates, cost per lead</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>Full call tracking with keyword and page attribution via Telnyx</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>Complete lead attribution — every customer traced to source keyword</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>AI search visibility — ChatGPT, Perplexity, Gemini, Claude monitoring</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>24/7 real-time access through Full Loop CRM dashboards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-green-400">&#10003;</span>
                  <span>Monthly recorded walkthrough explaining every metric and next steps</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-zinc-400">
            Transparency is not a feature we offer — it is a requirement we demand of ourselves. Our parent company,{" "}
            <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has operated this way for over 20 years. If you are paying for{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
            <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>,{" "}
            or{" "}
            <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>,{" "}
            you deserve to see exactly what your investment is producing — in real time, not when your agency gets around to it.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: TECH STACK
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Our Analytics Tech Stack</h2>
          <p className="mt-4 text-zinc-400">
            We use enterprise-grade tools — not WordPress plugins, not free tier dashboards, not cobbled-together spreadsheets. Every tool in our stack is chosen for reliability, accuracy, and integration capabilities.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Google Analytics 4 (GA4)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                GA4 is the foundation of our web analytics setup. We configure custom events for every conversion action, set up enhanced measurement for scroll depth and file downloads, implement cross-domain tracking where needed, and build custom reports that surface the metrics that matter to your business. GA4 replaced Universal Analytics in 2023, and most businesses still have not configured it properly — broken event tracking, missing conversion goals, and incorrect attribution models are epidemic. We fix all of this during setup and validate tracking accuracy before declaring the infrastructure live.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Google Search Console</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Search Console is the only source of truth for how Google sees your website. We monitor organic clicks, impressions, click-through rates, and average positions for every query and page. We track index coverage to ensure every page that should be indexed is indexed and every page that should not be is excluded. We monitor Core Web Vitals from Chrome User Experience Report data, review mobile usability issues, and set up alerts for manual actions and security problems. For businesses with{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page SEO</Link>{" "}
                campaigns, Search Console data is essential for measuring the impact of optimization changes.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full Loop CRM</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                <a href="https://www.fullloopcrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                is the unified dashboard that ties everything together. It integrates with GA4, Search Console, our call tracking system, and form submissions to provide a single source of truth for lead attribution and revenue tracking. Every lead that enters the system is tagged with its source — which keyword, which page, which search engine, which device — and tracked through the sales pipeline to closed deal. This is how we calculate true SEO ROI: not theoretical value based on traffic estimates, but actual revenue attributed to organic search performance. Full Loop CRM also powers the real-time dashboards our clients access directly.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Telnyx (Call Tracking)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We use Telnyx for call tracking because it provides carrier-grade reliability, number portability, and detailed call metadata that consumer-grade solutions cannot match. Every traffic source gets its own tracking number — one for organic Google traffic, one for Bing, one for{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local search</Link>{" "}
                via your{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                listing, one for direct traffic. When a potential customer calls, we know exactly which page they were on, which keyword brought them there, and how long the call lasted. Call data flows into Full Loop CRM in real time, so your dashboard always shows the latest lead count.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Next.js, Vercel & Supabase</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our websites are built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                and deployed on Vercel, which gives us code-level control over every tracking script, every event, and every data point. Unlike WordPress — where tracking depends on plugins that conflict, break, and slow your site down — our implementation is hardcoded into the application. Form submissions are processed through Supabase and Resend, ensuring every submission is captured, stored, and attributed correctly. Combined with our{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">automation infrastructure</Link>{" "}
                and{" "}
                <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agents</Link>{" "}
                that qualify leads 24/7, there are no plugin conflicts, no caching issues, and no data loss. When we say every interaction is tracked, we mean every interaction.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: RESULTS & TESTIMONIALS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What Happens When Analytics Drive Your SEO</h2>
          <p className="mt-4 text-zinc-400">
            Data without action is just trivia. Here is what happens when analytics actually inform strategy, content, and optimization decisions.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "3.2x", label: "Average Lead Increase in 6 Months" },
              { stat: "47%", label: "Average Conversion Rate Improvement" },
              { stat: "170+", label: "Service Categories Tracked" },
              { stat: "< 24h", label: "Ranking Drop Detection Time" },
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
              &ldquo;Before The NYC SEO, we had no idea which pages were generating calls and which were dead weight. Their analytics setup showed us that 3 pages were driving 80% of our leads — and 47 pages were generating zero. We restructured our{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content strategy</Link>{" "}
              based on the data and doubled our lead volume in 4 months without spending an extra dollar on ads. The real-time dashboard alone was worth the investment.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— James K., HVAC Company Owner, Queens</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;Our previous agency sent us a PDF every month with traffic numbers. That was it. The NYC SEO set up call tracking, connected everything to their CRM, and within the first week I could see exactly how many calls each page was generating. Turns out our 'About' page was generating more leads than our 'Services' page — something no amount of traffic data would have revealed. The level of visibility they provide is on another level.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Rachel M., Personal Injury Attorney, Manhattan</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;The AI search tracking was what sold me. I had no idea that ChatGPT was already recommending three of my competitors by name for plumbing services in Brooklyn. The NYC SEO showed me exactly where I was invisible in AI search, built an optimization plan around it, and within 90 days I was getting mentioned in Perplexity and ChatGPT responses. Nobody else is even tracking this.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Tony D., Master Plumber, Brooklyn</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON ANALYTICS MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Analytics Mistakes NYC Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Still running Universal Analytics code instead of GA4",
                fix: "Universal Analytics stopped processing data in July 2023. If your site still has UA code, you have been collecting zero analytics data for over two years. We deploy GA4 with full event tracking, conversion configuration, and historical data import where possible.",
              },
              {
                mistake: "No call tracking — guessing which pages generate phone calls",
                fix: "Without call tracking, you cannot attribute phone leads to specific pages or keywords. We deploy Telnyx-powered call tracking with unique numbers per traffic source, giving you keyword-level attribution for every incoming call.",
              },
              {
                mistake: "Tracking only Google rankings and ignoring Bing, Yahoo, and DuckDuckGo",
                fix: "Google owns 85% of search, but that remaining 15% represents thousands of potential customers — especially Bing users (powered by Microsoft Edge and Copilot) and privacy-focused DuckDuckGo users. We track rankings across all four engines daily.",
              },
              {
                mistake: "Zero AI search visibility monitoring",
                fix: "Over 100 million people use ChatGPT monthly. If you are not tracking whether AI platforms recommend your business, you are blind to the fastest-growing discovery channel since mobile. We monitor mentions across ChatGPT, Perplexity, Gemini, and Claude and optimize your content to earn recommendations.",
              },
              {
                mistake: "Reporting on impressions and page views instead of leads and revenue",
                fix: "Impressions do not pay your bills. We restructure your reporting to lead with revenue metrics — calls, form submissions, conversion rates, and cost per lead. Vanity metrics are included for diagnosis, but they never headline your report.",
              },
              {
                mistake: "No conversion tracking — forms submit but nobody knows where the lead came from",
                fix: "We implement event-level form tracking with full attribution. Every submission is tagged with the source keyword, landing page, search engine, device type, and geographic location. Full Loop CRM captures and organizes every lead automatically.",
              },
              {
                mistake: "Ignoring Core Web Vitals until rankings drop",
                fix: "Core Web Vitals are a ranking factor. By the time you notice a ranking drop caused by poor performance, you have already lost leads. We monitor LCP, INP, and CLS continuously and fix regressions before they impact your positions.",
              },
              {
                mistake: "Using free rank tracking tools that check positions weekly or less",
                fix: "Weekly rank tracking misses critical daily fluctuations — algorithm updates, competitor movements, and indexation issues all happen between checks. We track positions daily across all engines so you see changes as they happen, not a week later.",
              },
              {
                mistake: "No attribution model — unable to connect a paying customer back to a keyword",
                fix: "Without end-to-end attribution, you cannot calculate ROI. We implement full-funnel attribution through Full Loop CRM — from the first keyword search to the closed deal — so you know exactly which SEO efforts drive revenue.",
              },
              {
                mistake: "Getting monthly reports with no explanation, no context, and no action plan",
                fix: "Data without interpretation is noise. Every monthly report includes a recorded video walkthrough where we explain what happened, why it matters, and what we are doing next. You never have to wonder what a metric means or what actions are being taken.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">Analytics & Reporting Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Standalone analytics starts at $1,500/month. Most clients include analytics as part of a full SEO campaign for maximum impact. Every tier includes real-time dashboards, call tracking, and monthly reports with recorded walkthroughs.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses. Full SEO campaign with comprehensive analytics and reporting included.",
                features: [
                  "GA4 setup & custom event tracking",
                  "Google Search Console monitoring",
                  "Daily rank tracking (Google + 3 engines)",
                  "Call tracking with source attribution",
                  "Form submission tracking",
                  "Core Web Vitals monitoring",
                  "Real-time Full Loop CRM dashboard",
                  "Monthly report with recorded walkthrough",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses across multiple boroughs. Advanced analytics with AI search tracking.",
                features: [
                  "Everything in Foundation, plus:",
                  "AI search visibility monitoring (ChatGPT, Perplexity, Gemini, Claude)",
                  "Competitor rank & visibility comparison",
                  "Conversion rate optimization (CRO) testing",
                  "Revenue attribution by keyword & page",
                  "Custom KPI dashboards",
                  "Bi-weekly strategy calls with data review",
                  "Proactive alerting for ranking & traffic changes",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want total market visibility. Enterprise analytics across every channel and competitor.",
                features: [
                  "Everything in Growth, plus:",
                  "Multi-location analytics & tracking",
                  "Full competitive intelligence suite",
                  "Custom API integrations & data feeds",
                  "Advanced CRO with A/B testing",
                  "Executive-level reporting for stakeholders",
                  "Dedicated analytics strategist",
                  "Weekly strategy calls with real-time optimization",
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
            Standalone analytics-only engagements start at $1,500/month. Custom plans available for enterprise and multi-location businesses.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            including project-based and hourly rates, or{" "}
            <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link>{" "}
            to discuss your specific needs. Learn more{" "}
            <Link href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">about our team</Link>{" "}
            and 20+ year track record.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup
        variant="preFaq"
        title="20 Years of Data-Driven Results. Your Turn."
        subtitle="We have been measuring what matters since before Google Analytics existed. Your competitors wish they had this kind of insight."
      />

      {/* ============================================================
          SECTION 12: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Related Services</h2>
          <p className="mt-4 text-zinc-400">
            Analytics is the nervous system that connects every service we offer. These are the services that generate the data we track and the results we report on.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "The comprehensive SEO campaigns that analytics tracks and measures." },
              { name: "Search Engine Optimization", href: "/services/search-engine-optimization", desc: "On-page, off-page, and technical SEO with full performance tracking." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, Gemini — we track every mention." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Local map pack optimization with call and direction request tracking." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content with per-page performance and lead attribution." },
              { name: "On-Page SEO", href: "/services/on-page-seo", desc: "Title tags, meta descriptions, and page optimization — all tracked for impact." },
              { name: "Off-Page SEO", href: "/services/off-page-seo", desc: "Link building and citation campaigns with authority and traffic tracking." },
              { name: "Local SEO", href: "/services/local-seo", desc: "Neighborhood-level rank tracking and local lead attribution." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js sites with tracking baked into every page from day one." },
              { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "The CRM that powers our dashboards, lead tracking, and revenue attribution." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "Data-driven strategy informed by analytics and competitive intelligence." },
              { name: "Marketing Consulting", href: "/services/marketing-consulting", desc: "Strategic consulting backed by real performance data and analytics." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Automated page generation with per-page performance tracking." },
              { name: "AI Content Generation", href: "/services/ai-content-generation", desc: "AI-assisted content creation with performance tracking per piece." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "AI chatbots with full conversation tracking and lead attribution." },
              { name: "Branding", href: "/services/branding", desc: "Brand strategy and identity with search visibility measurement." },
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
          SECTION 13: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About SEO Analytics & Reporting</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions NYC service businesses ask about analytics, reporting, tracking, and attribution.
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
      <CTAGroup
        variant="final"
        title="Stop Guessing. Start Knowing."
        subtitle="Tell us about your business and we will build an analytics infrastructure that shows you exactly where every lead comes from and what every dollar of your SEO investment produces."
      />
    </div>
  );
}
