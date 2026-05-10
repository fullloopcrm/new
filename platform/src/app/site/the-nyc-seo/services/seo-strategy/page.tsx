// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Custom SEO Strategy for NYC Businesses",
  description:
    "Custom SEO strategy for NYC service businesses. Keyword research, competitive analysis, content roadmaps, and technical audits. Data-driven. 25+ years.",
  keywords: [
    "SEO strategy NYC",
    "SEO roadmap New York",
    "SEO strategy for service businesses",
    "custom SEO plan NYC",
    "SEO competitor analysis",
    "keyword research NYC",
    "content gap analysis",
    "local search mapping",
    "AI search strategy",
    "SEO audit NYC",
    "SEO consulting New York",
    "SEO strategy agency",
    "90-day SEO plan",
    "SEO KPI framework",
  ],
  openGraph: {
    title: "Custom SEO Strategy for NYC Businesses",
    description:
      "Custom SEO strategy for NYC service businesses. Keyword research, competitive analysis, content roadmaps, and technical audits. 25+ years.",
    url: `${SITE_URL}/services/seo-strategy`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/seo-strategy` },
};

const faqs = [
  {
    q: "What is an SEO strategy and why do I need one?",
    a: "An SEO strategy is a documented plan that defines exactly how your business will rank in search engines and AI platforms. It includes competitor analysis, keyword research, content planning, technical priorities, and a timeline for execution. Without a strategy, SEO becomes a series of random tactics — fixing a title tag here, writing a blog post there — with no clear direction. A strategy ensures every action is intentional, prioritized by impact, and aligned with your business goals. It is the difference between guessing and knowing.",
  },
  {
    q: "How long does it take to develop an SEO strategy?",
    a: "A comprehensive SEO strategy for a single-location service business typically takes 2 to 3 weeks to complete. Multi-location businesses or highly competitive industries may take 3 to 4 weeks. This includes the discovery call, competitor analysis, keyword research, technical audit, content gap analysis, local search mapping, AI search assessment, and roadmap creation. We do not rush this process because getting the strategy right is more important than starting fast. A bad strategy executed quickly costs more than a good strategy delivered in three weeks.",
  },
  {
    q: "How much does a custom SEO strategy cost?",
    a: "Our standalone SEO strategy and audit packages range from $2,500 to $7,500 depending on the scope — number of services, number of locations, competitive landscape, and current website complexity. For businesses that move into a monthly SEO campaign, the strategy cost is credited toward the first month. Monthly campaigns start at $3,500 per month for single-location businesses, $7,500 per month for multi-service or multi-borough campaigns, and $15,000+ per month for businesses that want to dominate their entire market.",
  },
  {
    q: "What is the difference between an SEO strategy and an SEO audit?",
    a: "An SEO audit tells you what is wrong. An SEO strategy tells you what to do about it — and in what order. An audit identifies technical issues, content gaps, backlink problems, and competitive weaknesses. A strategy takes those findings and builds a prioritized action plan with timelines, KPIs, and expected outcomes. We deliver both as part of our strategy engagement because you need the diagnosis before you can build the treatment plan.",
  },
  {
    q: "Do I need a new website before investing in SEO strategy?",
    a: "Not necessarily, but it depends on your current site. If your site is built on a modern framework with clean code, good page speed, and solid architecture, we can optimize what you have. If your site is on WordPress with bloated plugins, 5-second load times, and poor Core Web Vitals, the strategy will likely recommend a rebuild on Next.js before investing in content and link building. There is no point building on a broken foundation. Our strategy will give you an honest assessment of whether your current site can support serious SEO or needs to be replaced.",
  },
  {
    q: "What tools do you use for SEO research and analysis?",
    a: "We use a combination of professional-grade tools: Ahrefs for backlink analysis and keyword research, Screaming Frog for technical crawl audits, Google Search Console for indexation and performance data, Google Analytics for traffic and conversion data, Semrush for competitive intelligence, Surfer SEO for content optimization benchmarks, and proprietary scripts for AI search visibility testing across ChatGPT, Perplexity, Gemini, and Claude. We also use custom automation built on our own tech stack for large-scale keyword mapping and content gap analysis.",
  },
  {
    q: "How is your SEO strategy different from what other agencies offer?",
    a: "Three ways. First, we include AI search assessment as a core component — most agencies are not even thinking about ChatGPT, Perplexity, or Gemini yet. Second, our strategies are built specifically for local service businesses in the NYC metro area. We know this market, we know the search dynamics, and we know what it takes to rank here. Third, we do not hand you a generic PDF and disappear. Our strategies include specific page templates, URL structures, schema recommendations, and a 90-day implementation roadmap with weekly priorities. You could hand it to any developer and they could execute it.",
  },
  {
    q: "What if I already have an SEO agency — can you audit their work?",
    a: "Absolutely. We regularly audit the work of other agencies for businesses that suspect they are not getting results. We will analyze your current rankings, review the technical health of your site, assess the quality of backlinks being built, evaluate content quality, and check whether structured data is properly implemented. We provide an honest, data-backed assessment of whether your current agency is doing quality work or wasting your budget. If they are doing well, we will tell you. If they are not, we will show you exactly where they are falling short.",
  },
  {
    q: "Do you help with strategy implementation or just planning?",
    a: "Both. Our standalone strategy package delivers a complete roadmap that any qualified team can execute. But most clients choose to have us implement the strategy through our monthly SEO campaigns because we built the plan and know exactly how to execute it. Implementation includes on-page optimization, technical fixes, content creation, programmatic page generation, link building, local SEO, and AI search optimization. The strategy is the blueprint — implementation is the construction.",
  },
  {
    q: "What KPIs should I track to measure SEO success?",
    a: "The primary KPIs we track are: organic traffic growth (month over month), keyword rankings for target terms (positions 1-3, 4-10, 11-20), click-through rate from search results, conversion rate from organic traffic (phone calls, form submissions, chats), cost per lead from organic versus paid channels, Core Web Vitals scores, pages indexed in Google, and AI search visibility (how often your business is recommended by ChatGPT, Perplexity, and other AI platforms). We establish baseline metrics during the strategy phase and set specific targets for 30, 60, and 90 days.",
  },
  {
    q: "How do you handle keyword research for businesses serving multiple neighborhoods?",
    a: "We map every service you offer to every neighborhood you serve, creating a complete keyword matrix. A plumber offering 8 services across 40 neighborhoods has at least 320 primary keyword targets. We research search volume, competition, and intent for each combination, then prioritize based on revenue potential and competitive difficulty. This matrix becomes the blueprint for programmatic page generation — creating unique, optimized landing pages for each service-location combination. We also identify long-tail variations, question queries, and AI search phrases for each combination.",
  },
  {
    q: "What is local search mapping and why does it matter for my business?",
    a: "Local search mapping is the process of identifying every geographic search query relevant to your business and matching it to a content strategy. For a moving company in NYC, this means mapping searches like 'movers Upper East Side,' 'moving company Brooklyn Heights,' 'long distance movers Queens,' and hundreds more across every neighborhood. Without this mapping, you are leaving massive amounts of local search traffic on the table. With it, you have a clear blueprint for building location-specific pages that capture customers in every area you serve.",
  },
  {
    q: "What is an AI search assessment and why should I care?",
    a: "An AI search assessment evaluates how your business appears — or does not appear — when someone asks ChatGPT, Perplexity, Gemini, or Claude for a service provider in your area. Over 100 million people use ChatGPT monthly, and AI search is growing faster than any channel since mobile. We test dozens of prompts relevant to your business and document where you appear, where competitors appear, and what signals the AI models are using to make recommendations. Then we build a strategy to improve your AI visibility through structured data, content clarity, and entity optimization.",
  },
  {
    q: "Can you build an SEO strategy for a brand new website?",
    a: "Yes — and in many ways, it is easier. A new website is a blank slate with no technical debt, no toxic backlinks, and no penalties to recover from. We design the strategy from the ground up: optimal site architecture, URL structure, content hierarchy, schema markup, and keyword targeting. New sites built on Next.js with a proper SEO strategy from day one typically see meaningful rankings within 60 to 90 days for low-competition keywords and 4 to 6 months for competitive terms. Starting with strategy is always faster than trying to fix a poorly built site later.",
  },
  {
    q: "How often should an SEO strategy be updated?",
    a: "We recommend a full strategy refresh every 6 to 12 months. Search algorithms change, new competitors enter your market, AI platforms evolve, and your business priorities shift. Between full refreshes, we make tactical adjustments monthly based on performance data — doubling down on what is working and pivoting away from what is not. The initial strategy sets the direction; ongoing optimization keeps you on course. SEO strategy is not a one-time document — it is a living plan that evolves with your market.",
  },
  {
    q: "What happens after I receive my SEO strategy?",
    a: "You have two options. First, you can take the strategy and hand it to your internal team or another agency for implementation. The deliverable is detailed enough for any qualified developer or SEO professional to execute. Second, you can engage us to implement it through one of our monthly SEO campaigns. Most clients choose option two because we built the strategy and can execute it faster and more accurately than someone reading our documentation cold. Either way, you own the strategy — it is yours to keep regardless of whether you continue working with us.",
  },
];

export default function SEOStrategyPage() {
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
    name: "The NYC SEO — SEO Strategy Services",
    url: `${SITE_URL}/services/seo-strategy`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$2,500 - $15,000/mo",
    description:
      "Custom SEO strategy and roadmapping for local service businesses in NYC, NJ, Long Island, and Westchester. Competitor analysis, keyword research, content gap analysis, local search mapping, AI search assessment, and 90-day implementation roadmaps.",
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
    name: "SEO Strategy & Roadmapping Services",
    description:
      "Custom SEO strategy services including competitor analysis, keyword research, content gap analysis, local search mapping, AI search opportunity assessment, technical audit, and 90-day implementation roadmaps for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/seo-strategy`,
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
      name: "SEO Strategy Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Competitor Analysis" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Keyword Research & Mapping" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Gap Analysis" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local Search Mapping" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Search Opportunity Assessment" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Technical SEO Audit" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "90-Day SEO Roadmap" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "KPI Framework & Reporting Setup" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How We Build Your Custom SEO Strategy",
    description: "Our proven 6-step process for developing a custom SEO strategy for NYC service businesses.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Discovery Call & Business Assessment",
        text: "We start with a deep-dive discovery call to understand your business goals, target customers, service areas, competitive landscape, and current marketing efforts. We review your existing website, analytics, Google Search Console data, and any previous SEO work. This call sets the foundation for everything that follows — we cannot build a strategy if we do not understand your business.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Competitor Analysis & Market Research",
        text: "We identify your top 10 to 15 competitors in organic search, analyze their keyword rankings, content depth, backlink profiles, structured data, site architecture, and AI search visibility. We document every gap and every opportunity — where competitors are strong, where they are weak, and where the market is underserved.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Keyword Research & Intent Mapping",
        text: "We research every keyword your customers search — head terms, long-tail phrases, question queries, local modifiers, and AI search queries. We map each keyword to a specific page, categorize by search intent (informational, navigational, transactional, local), and prioritize by revenue potential and competitive difficulty.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Content & Architecture Mapping",
        text: "We design the optimal site architecture — URL structure, page hierarchy, internal linking strategy, content clusters, and hub-and-spoke models. We map every page that needs to exist, define the content requirements for each, and build templates for programmatic page generation across service-location combinations.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "AI Search Opportunity Assessment",
        text: "We test dozens of prompts across ChatGPT, Perplexity, Gemini, and Claude to assess your current AI search visibility. We document where you appear, where competitors appear, and what signals AI models use to recommend businesses. We then define the structured data, content, and entity optimization needed to improve your AI recommendations.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "90-Day Roadmap Delivery",
        text: "We compile everything into a comprehensive strategy document with a 90-day implementation roadmap. The roadmap includes weekly priorities, specific deliverables, KPI targets, and expected outcomes. We walk you through the entire plan in a recorded strategy session, answer your questions, and define the path forward.",
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
      name: "The NYC SEO — SEO Strategy Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "James L." },
    reviewBody:
      "The SEO strategy The NYC SEO built for us was a complete game-changer. They identified keyword opportunities our previous agency had completely missed, mapped out a content plan that covered every neighborhood we serve, and gave us a clear 90-day roadmap. Within 4 months of implementing their strategy, our organic leads tripled. Worth every penny.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "SEO Strategy", url: "/services/seo-strategy" },
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
                NYC SEO Agency &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                SEO Strategy
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Custom Roadmaps That Drive Results
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Every successful SEO campaign starts with a strategy. We audit your current position, analyze your competitors, research the high-intent keywords your customers actually search, assess your{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>, and build a 90-day roadmap that turns organic traffic into booked jobs and signed clients. No guesswork. No generic playbooks. A custom{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
                built specifically for your{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">business</Link>{" "}
                in your{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">market</Link>{" "}
                — built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>, not WordPress.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Competitor analysis & gap identification",
                "Keyword research & intent mapping",
                "Content gap analysis & site architecture",
                "Local search mapping (service x neighborhood)",
                "AI search opportunity assessment (ChatGPT, Perplexity, Gemini)",
                "Technical SEO audit & Core Web Vitals review",
                "90-day prioritized implementation roadmap",
                "KPI framework & success metrics",
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
          SECTION 2: WHAT IS AN SEO STRATEGY
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is an SEO Strategy and Why Does It Come First?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              An SEO strategy is the documented plan that tells you exactly how to get from where you are today to where you want to be in search rankings. It defines which keywords to target, which pages to build, which technical issues to fix, how to structure your content, and in what order to do all of it. Without a strategy, SEO becomes a collection of random tactics — optimizing a title tag here, writing a blog post there, building a few backlinks somewhere — with no clear direction and no way to measure whether any of it is actually working.
            </p>
            <p>
              This is why most businesses fail at SEO. They skip straight to tactics. They hire an agency that starts &ldquo;doing SEO&rdquo; without ever asking the fundamental questions: Who are your competitors? What keywords actually drive revenue in your market? What does your site architecture need to look like? Where are the content gaps? What is your{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>{" "}
              situation? Without answering these questions, every dollar you spend on SEO is a gamble — and most businesses lose that gamble for months or years before they realize the problem was never execution. The problem was the absence of a plan.
            </p>
            <p>
              A proper SEO strategy changes everything. Instead of guessing which keywords to target, you know — because you have data showing search volume, competition level, and revenue potential for every term. Instead of wondering what pages to build, you have a complete site architecture map with every URL defined, every content template ready, and every{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page element</Link>{" "}
              specified. Instead of hoping your{" "}
              <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">link building</Link>{" "}
              moves the needle, you have a competitive gap analysis showing exactly how many links you need and from what types of sources. Strategy turns SEO from an expense into an investment with predictable returns.
            </p>
            <p>
              At The NYC SEO, strategy always comes first — before{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web design</Link>, before{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content creation</Link>, before{" "}
              <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO implementation</Link>. Our parent company,{" "}
              <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over 20 years of experience in digital strategy for NYC businesses. We have seen what happens when businesses invest $50,000 in SEO without a plan — and it is not pretty. We have also seen what happens when strategy comes first. The difference is night and day.
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
            Our 6-Step SEO Strategy Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every strategy follows the same proven framework — adapted to your market, your competition, and your business goals. Here is exactly what happens from the first call to the final deliverable.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Discovery Call & Business Assessment",
                body: "We start with a 60-to-90-minute deep-dive discovery call. We need to understand your business inside and out before we touch a single keyword tool. What services do you offer? Which ones are the most profitable? Which neighborhoods do you serve? Where do you want to expand? Who are your best customers and how do they find you today? What has your previous SEO experience been — good, bad, or nonexistent? We review your existing website, Google Analytics, Google Search Console data, and any previous SEO audits or reports. We also examine your Google Business Profile, review profiles, and local citations. This call is not a sales pitch — it is a working session that sets the foundation for everything that follows. We cannot build a strategy if we do not deeply understand your business, your market, and your goals.",
              },
              {
                step: "02",
                title: "Competitor Analysis & Market Research",
                body: "We identify your top 10 to 15 competitors in organic search — not who you think your competitors are, but who is actually ranking for the keywords that drive revenue in your market. We analyze their keyword rankings, content depth, backlink profiles, domain authority, site architecture, structured data implementation, page speed, and AI search visibility. We document every gap — where they rank and you do not, where their content is thin and yours could be better, where their backlink profile is weak, and where they have completely ignored AI search optimization. We also identify dark-horse competitors — businesses from adjacent markets that are encroaching on your keywords. The result is a competitive intelligence report that tells you exactly what it takes to win in your market.",
              },
              {
                step: "03",
                title: "Keyword Research & Intent Mapping",
                body: "We research every keyword your customers search — high-volume head terms like 'plumber NYC,' long-tail phrases like 'emergency pipe burst repair Park Slope,' question queries like 'how much does a plumber cost in Brooklyn,' and AI search queries like 'who is the best plumber for pre-war buildings in Manhattan.' We categorize every keyword by search intent — navigational, informational, transactional, or local — and map each one to a specific page on your site. We calculate the revenue potential of each keyword cluster based on search volume, click-through rate benchmarks, and your average customer value. The result is a prioritized keyword matrix that tells you exactly which terms to target first, which pages to build, and what the expected return on investment is for each.",
              },
              {
                step: "04",
                title: "Content & Architecture Mapping",
                body: "We design the optimal site architecture for your business — URL structure, page hierarchy, content clusters, hub-and-spoke models, and internal linking strategy. We map every page that needs to exist, from your homepage and service pages to location-specific landing pages, comparison content, FAQ hubs, and blog posts. For businesses that serve multiple neighborhoods, we build the blueprint for programmatic page generation — creating unique, optimized landing pages for every service-location combination. A plumber offering 10 services across 50 neighborhoods needs 500+ pages. We define the template, content variables, schema markup, and internal linking for each. We also specify the content requirements for each page type — word count targets, heading structures, keyword placement, calls to action, and structured data types.",
              },
              {
                step: "05",
                title: "AI Search Opportunity Assessment",
                body: "We test dozens of prompts across ChatGPT, Perplexity, Gemini, and Claude to assess your current AI search visibility. We ask questions like 'Who is the best plumber in Brooklyn Heights?' and 'Can you recommend a personal injury lawyer in Manhattan?' and document exactly which businesses appear in the AI responses — and why. We analyze the signals AI models use to recommend businesses: structured data quality, content clarity, entity associations, review signals, citation consistency, and domain authority. We then define the specific optimizations needed to improve your AI recommendations — from schema markup improvements to content restructuring to entity optimization. This is the fastest growing lead channel in 2026, and most agencies are not even measuring it yet. We are already optimizing for it.",
              },
              {
                step: "06",
                title: "90-Day Roadmap Delivery",
                body: "We compile everything — competitor analysis, keyword research, content mapping, technical audit findings, AI search assessment — into a comprehensive strategy document with a 90-day implementation roadmap. The roadmap is broken into weekly priorities: week 1 through 4 focuses on technical fixes and quick wins, weeks 5 through 8 focuses on content creation and on-page optimization, and weeks 9 through 12 focuses on link building, AI search optimization, and programmatic page deployment. Each week has specific deliverables, responsible parties, and success metrics. We walk you through the entire plan in a recorded 90-minute strategy session, answer every question, and define the path forward — whether you implement with us or hand the plan to another team.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Your SEO Strategy</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every strategy engagement includes the following deliverables. No hidden fees. No surface-level audits. This is the real thing.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Competitor Analysis",
                items: [
                  "Top 10-15 competitor identification",
                  "Keyword overlap & gap analysis",
                  "Backlink profile comparison",
                  "Content depth benchmarking",
                  "Structured data audit (competitor sites)",
                  "AI search visibility comparison",
                ],
              },
              {
                title: "Keyword Research",
                items: [
                  "Full keyword universe discovery",
                  "Search intent categorization",
                  "Revenue potential scoring",
                  "Long-tail & question query mapping",
                  "Service x neighborhood keyword matrix",
                  "AI search query identification",
                ],
              },
              {
                title: "Technical Audit",
                items: [
                  "Core Web Vitals assessment",
                  "Site speed & performance analysis",
                  "Mobile responsiveness review",
                  "Crawl error identification",
                  "Schema markup audit",
                  "Indexation & sitemap review",
                ],
              },
              {
                title: "Content Gap Analysis",
                items: [
                  "Existing content quality assessment",
                  "Missing page identification",
                  "Content template creation",
                  "Heading structure recommendations",
                  "Word count & depth benchmarks",
                  "Internal linking architecture plan",
                ],
              },
              {
                title: "Local Search Mapping",
                items: [
                  "Service area identification",
                  "Neighborhood-level keyword mapping",
                  "Google Business Profile audit",
                  "Local citation consistency check",
                  "NAP data verification",
                  "Programmatic page blueprint",
                ],
              },
              {
                title: "AI Search Assessment",
                items: [
                  "ChatGPT visibility testing",
                  "Perplexity recommendation audit",
                  "Gemini & Claude testing",
                  "Structured data recommendations",
                  "Entity optimization strategy",
                  "AI-specific content guidelines",
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Needs a Custom SEO Strategy?</h2>
          <p className="mt-4 text-zinc-400">
            Our SEO strategy services are built for local service businesses in the NYC metro area. If your customers find you by searching for what you do plus where you do it, this is for you.
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
          SECTION 7: CUSTOM STRATEGY vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Custom SEO Strategy vs. the Alternatives</h2>
          <p className="mt-4 text-zinc-400">
            Most businesses take one of four approaches to SEO planning. Here is how a custom strategy compares to the alternatives — and why it wins every time.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Custom SEO Strategy vs. Generic SEO Packages</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Generic SEO packages treat every business the same. You get a predetermined number of keywords, a set amount of content, and a cookie-cutter link building plan — regardless of your market, your competition, or your business goals. A{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link>{" "}
                in Brooklyn Heights and a{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury lawyer</Link>{" "}
                in Manhattan have completely different competitive landscapes, keyword economics, and content requirements. A generic package cannot account for these differences. A custom strategy is built from scratch based on your specific market data, competitor analysis, and business goals. It tells you exactly which keywords to target, which pages to build, and in what order — because the data says so, not because it is on a template.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Custom SEO Strategy vs. DIY Keyword Research</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Keyword research is one piece of an SEO strategy — but it is not the strategy itself. You can spend hours in a keyword tool pulling search volumes and difficulty scores, but without competitive analysis, intent mapping, content architecture planning, technical audit findings, and AI search assessment, you are missing 80% of the picture. DIY keyword research tells you what people search. A custom strategy tells you what to do about it — which pages to build, how to structure them, how to link them together, what schema to implement, and how to beat the specific competitors ranking for each term. The keyword list is the ingredient list. The strategy is the recipe.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Custom SEO Strategy vs. Copying Competitors</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                &ldquo;Just do what they are doing&rdquo; is the most dangerous SEO advice in existence. Copying a competitor means you are always behind — you are building what they built last year while they are already working on what comes next. You also cannot see what is happening behind their rankings: you do not know which pages are actually driving leads, which backlinks are moving the needle, or whether their traffic is even converting. A custom strategy does not copy competitors — it dissects them. We analyze what is working for them, what is not, and where the gaps are that they have missed entirely. Then we build a plan to leapfrog them by doing what they cannot or will not do — like{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic page generation</Link>{" "}
                at scale or{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                before they even know it matters.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Custom SEO Strategy vs. &ldquo;We&apos;ll Figure It Out as We Go&rdquo;</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                This is the most expensive approach of all, because it costs you time. Time spent optimizing the wrong keywords. Time spent building pages that no one searches for. Time spent fixing technical issues that should have been identified on day one. Time is the one resource you cannot get back, and in competitive NYC markets, every month you spend wandering without a plan is a month your competitors are executing with one. The average business that starts SEO without a strategy wastes 3 to 6 months before they realize they need to course-correct. That is $10,000 to $90,000 in wasted budget. A $2,500 to $7,500 strategy upfront saves you multiples of that by ensuring every dollar goes toward actions with proven ROI.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results from Strategy-First SEO</h2>
          <p className="mt-4 text-zinc-400">
            When strategy comes first, results follow. Here is what happens when NYC service businesses invest in a proper SEO roadmap before execution.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "3x", label: "Average Lead Increase Within 6 Months" },
              { stat: "500+", label: "Pages Mapped Per Strategy" },
              { stat: "< 90 Days", label: "To First Ranking Improvements" },
              { stat: "12:1", label: "Average ROI Over 12 Months" },
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
              &ldquo;The SEO strategy The NYC SEO built for us was a complete game-changer. Our previous agency had us targeting the wrong keywords for two years — broad terms with massive competition that we had no chance of ranking for. The NYC SEO identified 150+ long-tail keywords we had never considered, mapped out a content plan that covered every neighborhood we serve, and gave us a clear 90-day roadmap. Within 4 months of implementing their strategy, our organic leads tripled and our cost per lead dropped by 60%. The strategy paid for itself in the first week of results.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— James L., Plumbing Company Owner, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We had been doing SEO in-house for three years with almost nothing to show for it. The NYC SEO did a strategy audit and showed us exactly why — we had duplicate content issues, no structured data, our site architecture was flat, and we were completely invisible in AI search. Their 90-day roadmap prioritized the highest-impact fixes first, and by month two we were already seeing ranking improvements. Six months in, we are on page one for 40+ keywords we were not even targeting before. Should have done this years ago.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Rachel T., Law Firm Partner, Manhattan</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 SEO Strategy Mistakes That Cost NYC Businesses Thousands
          </h2>
          <p className="mt-4 text-zinc-400">
            We see these mistakes every week from businesses that skipped strategy or worked with agencies that did not know better. Every one of them is fixable — but only if you know to look for them.
          </p>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Starting SEO without a competitor analysis",
                fix: "You cannot build a winning strategy if you do not know who you are competing against. We analyze the top 10 to 15 competitors in your market — their keywords, content, backlinks, and AI visibility — before we recommend a single optimization. Knowing the competitive landscape is what separates strategic SEO from blind guessing.",
              },
              {
                mistake: "Targeting keywords based on volume alone, ignoring intent",
                fix: "A keyword with 10,000 monthly searches and informational intent generates fewer leads than a keyword with 100 searches and transactional intent. We categorize every keyword by intent — informational, navigational, transactional, local — and prioritize the ones that drive revenue, not just traffic.",
              },
              {
                mistake: "Building a flat site architecture with no content hierarchy",
                fix: "Search engines reward topical authority — sites that cover a subject comprehensively and organize content in clear hierarchies. We build hub-and-spoke content models where service hub pages link to location pages, which link to FAQ content, which links back to the hub. This structure signals expertise to both search engines and AI platforms.",
              },
              {
                mistake: "No local search mapping for multi-neighborhood businesses",
                fix: "If you serve 40 neighborhoods but only have one 'Service Areas' page, you are invisible in 39 of those neighborhoods. We map every service to every neighborhood and build the blueprint for{' '}<Link href='/services/automation' className='text-[#5CB8FF] hover:text-[#8DD0FF]'>programmatic page generation</Link> — hundreds of unique, optimized pages targeting real local search queries.",
              },
              {
                mistake: "Ignoring AI search entirely",
                fix: "Over 100 million people ask ChatGPT, Perplexity, and Gemini for recommendations every month. If your strategy does not include an{' '}<Link href='/services/ai-search-optimization' className='text-[#5CB8FF] hover:text-[#8DD0FF]'>AI search optimization</Link> component, you are planning for 2020, not 2026. We assess your AI visibility as a core part of every strategy engagement.",
              },
              {
                mistake: "No structured data strategy",
                fix: "Schema markup is how you communicate with search engines and AI platforms in their language. Without it, your pages are just text on a screen. We define the specific schema types needed for every page — LocalBusiness, Service, FAQPage, HowTo, Review, BreadcrumbList, Organization — and map them into the strategy document.",
              },
              {
                mistake: "Setting vague KPIs like 'more traffic' or 'better rankings'",
                fix: "We set specific, measurable KPIs: number of keywords in positions 1-3, organic conversion rate, cost per organic lead, pages indexed, AI search mention frequency, and month-over-month lead growth. If you cannot measure it, you cannot improve it.",
              },
              {
                mistake: "No content gap analysis — building content at random",
                fix: "Without a content gap analysis, you are writing blog posts and building pages based on gut feeling. We compare your content inventory against competitor content inventories and keyword demand to identify exactly which pages are missing, which pages need to be expanded, and which pages are cannibalizing each other.",
              },
              {
                mistake: "Treating SEO strategy as a one-time project instead of a living document",
                fix: "Markets change. Competitors enter and exit. Algorithms update. AI platforms evolve. We recommend a full strategy refresh every 6 to 12 months, with monthly tactical adjustments based on performance data. The initial strategy sets the direction — ongoing analysis keeps you on course.",
              },
              {
                mistake: "Choosing an SEO strategy based on price instead of depth",
                fix: "A $500 SEO audit from Fiverr is not a strategy — it is a generated report from a crawl tool. A real strategy requires 40 to 80 hours of human analysis: competitive research, keyword mapping, content architecture, technical review, and AI search assessment. The cheap option costs more in the long run because it leads to months of misdirected effort and wasted budget.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">SEO Strategy & Campaign Pricing</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Start with a standalone strategy or go straight into a monthly campaign that includes strategy as the first phase. Every dollar goes into research, analysis, and actionable planning — not overhead.
            </p>
          </div>

          {/* Standalone Audit */}
          <div className="mt-12 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#EFF70A]">Standalone Option</p>
                <h3 className="mt-2 text-2xl font-bold">SEO Strategy & Audit</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#0080FE]">$2,500 – $7,500</span>
                  <span className="text-zinc-400">one-time</span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">
                  For businesses that want a comprehensive strategy before committing to a monthly campaign. Price depends on number of services, locations, and competitive landscape complexity. Strategy cost is credited toward the first month if you move into a monthly campaign.
                </p>
              </div>
              <div>
                <ul className="space-y-3">
                  {[
                    "Complete competitor analysis (10-15 competitors)",
                    "Full keyword research & intent mapping",
                    "Technical SEO audit & Core Web Vitals review",
                    "Content gap analysis & site architecture plan",
                    "Local search mapping (service x neighborhood)",
                    "AI search visibility assessment",
                    "90-day prioritized implementation roadmap",
                    "KPI framework & success metrics",
                    "Recorded 90-minute strategy walkthrough",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className="mt-6 inline-flex items-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]"
                >
                  Request Your Strategy
                </Link>
              </div>
            </div>
          </div>

          {/* Monthly Tiers */}
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses targeting one borough or region. Strategy is built during month one.",
                features: [
                  "Full SEO strategy & audit (month 1)",
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
                description: "For multi-service businesses targeting multiple boroughs or the full NYC metro area.",
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
                description: "For businesses that want to own their entire market — every keyword, every neighborhood, every platform.",
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
            All plans include strategy as the foundation. Custom plans available.{" "}
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
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Trust Our SEO Strategy</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of NYC Market Expertise</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over two decades of experience in digital marketing and strategy for businesses in the New York City metropolitan area. We know this market — the search dynamics, the competitive landscape, the neighborhoods, the industries. We have built SEO strategies for{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
                <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
                <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contractors</Link>, and dozens of other service categories across every borough. That experience means our strategies are grounded in reality, not theory.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Built on Next.js, Vercel & Modern Infrastructure</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our strategies are designed for modern tech stacks — not WordPress templates with bloated plugins. We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                deployed on Vercel, with{" "}
                <a href="https://www.fullloopcrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                for lead management, Supabase for data infrastructure, Resend for transactional email, and Telnyx for voice and SMS. This modern stack means sub-1-second page loads, perfect Core Web Vitals, and the ability to scale to tens of thousands of pages without performance degradation. Our strategies leverage these technical capabilities in ways WordPress-based agencies simply cannot.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">AI Search Is Not an Afterthought — It Is Core</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most agencies are still figuring out what{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
                even means. We have been optimizing for ChatGPT, Perplexity, Gemini, and Claude since these platforms started recommending local businesses. Every strategy we build includes a comprehensive AI search assessment and a dedicated plan for improving your visibility in AI-generated recommendations. The agencies that figure this out first will dominate the next decade of search. We are already there — and our strategies ensure our clients are too.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Strategy That Is Actionable, Not Academic</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not deliver 100-page PDFs full of jargon and pie charts that no one reads. Our strategies are actionable implementation documents. Every recommendation includes specific instructions: which pages to build, what URLs to use, what schema to implement, what content to write, what links to pursue, and in what order. You could hand our strategy document to any qualified developer or SEO professional and they could start executing on day one. That is the standard. If a strategy is not actionable, it is not a strategy — it is a book report.
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
            SEO strategy is the foundation. These services are the execution layer that turns your roadmap into rankings, traffic, and leads.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service SEO implementation — on-page, off-page, technical, and local." },
              { name: "On-Page SEO", href: "/services/on-page-seo", desc: "Title tags, meta descriptions, heading hierarchy, content optimization, and internal linking." },
              { name: "Off-Page SEO & Link Building", href: "/services/off-page-seo", desc: "Strategic link acquisition, local citations, and digital PR." },
              { name: "Local SEO", href: "/services/local-seo", desc: "Google Maps, local pack rankings, and neighborhood-specific landing pages." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, Gemini, and other AI platforms." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered to rank from day one." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content that ranks, converts, and builds authority." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of optimized pages at scale with programmatic systems." },
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
          <h2 className="text-3xl font-bold sm:text-4xl">SEO Strategy Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We build SEO strategies for service businesses across the entire NYC metropolitan area — every borough, every neighborhood, every suburb.
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
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 14: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About SEO Strategy</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about SEO strategy, planning, and roadmapping.
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
