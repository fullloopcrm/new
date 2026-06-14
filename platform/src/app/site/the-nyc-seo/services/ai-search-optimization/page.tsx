// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "AI Search Optimization | GEO & AEO NYC",
  description:
    "AI search optimization (GEO/AEO) for NYC businesses. Get found on ChatGPT, Perplexity, Gemini, and Claude. Structured data and entity optimization.",
  keywords: [
    "AI search optimization NYC",
    "generative engine optimization",
    "GEO agency New York",
    "answer engine optimization",
    "AEO services NYC",
    "ChatGPT optimization",
    "Perplexity optimization",
    "Gemini optimization",
    "Claude optimization",
    "AI search agency",
    "structured data for AI",
    "entity optimization",
    "knowledge graph optimization",
    "AI referral traffic",
    "AI citation strategy",
    "LLM optimization",
    "AI search visibility",
    "generative AI SEO",
    "answer-ready content",
    "AI recommendation optimization",
  ],
  openGraph: {
    title: "AI Search Optimization | GEO & AEO NYC",
    description:
      "AI search optimization for NYC businesses. Get found on ChatGPT, Perplexity, Gemini, and Claude. GEO and AEO services.",
    url: `${SITE_URL}/services/ai-search-optimization`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/ai-search-optimization` },
};

const faqs = [
  {
    q: "What is AI search optimization and how is it different from traditional SEO?",
    a: "AI search optimization — also called Generative Engine Optimization (GEO) or Answer Engine Optimization (AEO) — is the process of optimizing your business so AI platforms like ChatGPT, Perplexity, Gemini, and Claude recommend you by name when users ask for service providers. Traditional SEO focuses on ranking in Google's 10 blue links. AI search optimization focuses on being the 1 of 2-3 businesses that AI models recommend in a conversational response. The strategies overlap — structured data, content authority, and entity optimization matter for both — but AI search requires additional techniques like answer-ready content formatting, citation network building, and multi-platform entity consistency that traditional SEO alone does not address.",
  },
  {
    q: "How much does AI search optimization cost?",
    a: "Our AI search optimization services start at $2,500 per month as an add-on to an existing SEO campaign, or $3,500 per month as a standalone service. Full AI search optimization bundled with traditional SEO ranges from $3,500 to $8,000 per month depending on competition level, service area size, and the number of AI platforms you want to target. Our Foundation tier starts at $3,500/mo, Growth at $7,500/mo, and Domination at $15,000+/mo. Every dollar goes into structured data, entity building, content optimization, and citation strategy — not overhead.",
  },
  {
    q: "Which AI search platforms do you optimize for?",
    a: "We optimize for all major AI search platforms: ChatGPT (which uses Bing data and its own web browsing), Perplexity (which crawls the live web in real-time), Google Gemini (which pulls from Google's index and knowledge graph), Anthropic's Claude (which references training data and web sources), Microsoft Copilot (powered by Bing and OpenAI), Apple Intelligence, and Meta AI. Each platform has different data sources and ranking signals, so we optimize for each one individually while building a unified entity authority that works across all of them.",
  },
  {
    q: "How long does it take to see results from AI search optimization?",
    a: "Initial improvements in AI search visibility typically appear within 30 to 60 days for structured data and entity optimization changes. Meaningful recommendation frequency — where AI platforms consistently recommend your business — usually takes 90 to 180 days depending on your starting authority, competition level, and industry. Unlike traditional SEO where you can track daily ranking changes, AI search results are probabilistic — the same query can produce different recommendations on different days. We track recommendation frequency over time and measure the trend, not individual responses.",
  },
  {
    q: "Can you guarantee my business will be recommended by ChatGPT?",
    a: "No one can guarantee specific AI recommendations, and you should be skeptical of anyone who claims otherwise. AI search results are probabilistic and contextual — the same query can produce different results based on conversation context, user location, and model updates. What we can guarantee is that we implement every known optimization technique to maximize your recommendation probability. We build the structured data, entity authority, citation networks, and answer-ready content that AI models use to select which businesses to recommend. Our clients consistently see measurable increases in AI recommendation frequency within 90 days.",
  },
  {
    q: "Do I still need traditional SEO if I do AI search optimization?",
    a: "Yes — absolutely. AI search optimization and traditional SEO are complementary, not replacements. Google still processes over 8.5 billion searches per day, and traditional organic search remains the largest single source of high-intent traffic for service businesses. AI search is the fastest-growing channel, but it is additive to — not a replacement for — traditional SEO. The good news is that many AI search optimization techniques (structured data, content authority, entity optimization) also improve your traditional SEO performance. We recommend a combined approach because the strategies reinforce each other.",
  },
  {
    q: "What is Generative Engine Optimization (GEO)?",
    a: "Generative Engine Optimization (GEO) is the practice of optimizing your digital presence so that generative AI models — ChatGPT, Gemini, Perplexity, Claude — recommend your business when users ask relevant questions. GEO involves structured data optimization, entity authority building, answer-ready content formatting, citation strategy, knowledge graph presence, and multi-platform consistency. It is the AI-era equivalent of SEO. Just as SEO made businesses visible in search engine results, GEO makes businesses visible in AI-generated responses. The NYC SEO is one of the first agencies in New York to offer dedicated GEO services.",
  },
  {
    q: "What is Answer Engine Optimization (AEO)?",
    a: "Answer Engine Optimization (AEO) focuses specifically on structuring your content to be the direct answer that AI platforms cite and reference. AEO involves creating FAQ content with proper schema markup, writing concise answer-ready paragraphs that AI models can extract verbatim, implementing question-and-answer structured data, and building topical authority around the specific questions your customers ask. When someone asks Perplexity 'who is the best plumber in Brooklyn,' AEO is what determines whether your business is cited as the answer. It is a subset of GEO focused specifically on answer extraction and citation.",
  },
  {
    q: "How do you track AI search visibility and recommendations?",
    a: "We use a combination of automated monitoring tools and manual testing across ChatGPT, Perplexity, Gemini, Claude, and Copilot. We run your target queries weekly across all platforms and track which businesses are recommended, how often, and in what context. We monitor AI referral traffic through your analytics — Perplexity and ChatGPT browsing send identifiable traffic that we can track in Google Analytics and server logs. We also track citation mentions, entity references, and structured data parsing across platforms. Every month, you receive an AI search visibility report alongside your traditional SEO metrics.",
  },
  {
    q: "What is entity optimization and why does it matter for AI search?",
    a: "Entity optimization is the process of building a clear, consistent, and authoritative digital identity for your business across the web. AI models do not rank websites — they recommend entities. An entity is a recognized thing: your business name, your services, your location, your expertise. Entity optimization involves ensuring your business information is consistent across every directory, citation, social profile, and website that mentions you. It means building structured data that explicitly defines your entity relationships — what you do, where you do it, who you are affiliated with. The stronger and more consistent your entity is, the more likely AI models are to recognize and recommend you.",
  },
  {
    q: "What is the difference between AI search and voice search optimization?",
    a: "Voice search optimization (Siri, Alexa, Google Assistant) and AI search optimization overlap but are distinct. Voice search typically returns a single answer from a featured snippet or knowledge panel. AI search returns conversational recommendations that can include multiple businesses, context, and reasoning. Voice search is keyword-triggered; AI search is context-aware and conversational. The structured data and content strategies we implement work for both, but AI search optimization includes additional techniques like multi-turn conversation optimization, contextual entity building, and cross-platform citation strategies that voice search alone does not require.",
  },
  {
    q: "My competitor is already being recommended by ChatGPT. Can I overtake them?",
    a: "Yes. AI search recommendations are not fixed — they change based on entity authority, content freshness, citation networks, and structured data quality. If your competitor is currently being recommended and you are not, it means they have stronger entity signals right now. We close that gap by building your structured data, creating answer-ready content, expanding your citation network, and establishing your entity authority across multiple platforms. In competitive markets, we typically see our clients enter the AI recommendation set within 90 to 120 days and achieve parity or dominance within 6 months.",
  },
  {
    q: "Does AI search optimization work for local service businesses?",
    a: "Local service businesses are actually the best fit for AI search optimization. When someone asks ChatGPT 'who is the best electrician in Park Slope,' the AI can only recommend 2-3 businesses — not 10 like Google. This means the reward for being optimized is disproportionately high. Local businesses also benefit from strong entity signals: a physical address, local citations, Google Business Profile, local reviews, and community presence all contribute to AI recommendation probability. We specialize in local service businesses because the AI search opportunity is enormous and most local businesses have not started optimizing yet.",
  },
  {
    q: "What structured data do you implement for AI search optimization?",
    a: "We implement comprehensive JSON-LD structured data including LocalBusiness schema, Service schema with OfferCatalog, FAQPage schema, Review and AggregateRating schema, Organization schema, HowTo schema, BreadcrumbList schema, and custom entity markup. Each schema type serves a specific purpose: LocalBusiness tells AI models who you are and where you operate; Service schema defines exactly what you offer; FAQPage provides answer-ready content that AI models can cite; Review schema establishes social proof and quality signals. We implement 7+ schema types per page — significantly more than the industry average of 1-2 types.",
  },
  {
    q: "Is AI search optimization a one-time project or an ongoing service?",
    a: "AI search optimization is an ongoing service. AI models update constantly — ChatGPT updates its training data and browsing capabilities, Perplexity crawls the web in real-time, Gemini updates with Google's index. Your competitors are also optimizing, which means the competitive landscape shifts continuously. The initial implementation (structured data, entity foundation, content restructuring) takes 60 to 90 days. After that, ongoing optimization includes citation monitoring, content freshness updates, new platform adaptation, recommendation tracking, and competitive response. Businesses that treat AI search optimization as ongoing consistently outperform those that do a one-time project.",
  },
  {
    q: "How does AI search optimization work with my existing website?",
    a: "We can optimize any website for AI search, but the depth of optimization depends on your platform. If your site is built on Next.js (which we recommend and build), we have complete control over structured data, content structure, and technical implementation. If your site is on WordPress or another CMS, we can still implement structured data via plugins or custom code, restructure content for answer-readability, and build external entity authority. For maximum AI search performance, we recommend our Next.js platform because it gives us code-level control over every element that AI crawlers parse.",
  },
];

export default function AISearchOptimizationPage() {
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
    name: "The NYC SEO — AI Search Optimization Services",
    url: `${SITE_URL}/services/ai-search-optimization`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$2,500 - $8,000/mo",
    description:
      "AI search optimization agency specializing in Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO) for local service businesses in NYC, NJ, Long Island, and Westchester. ChatGPT, Perplexity, Gemini, and Claude optimization.",
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
    name: "AI Search Optimization (GEO & AEO) Services",
    description:
      "Comprehensive AI search optimization services including Generative Engine Optimization (GEO), Answer Engine Optimization (AEO), ChatGPT optimization, Perplexity optimization, Gemini optimization, Claude optimization, structured data for AI crawlers, entity optimization, citation strategy, knowledge graph presence, and AI referral traffic tracking for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/ai-search-optimization`,
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
      name: "AI Search Optimization Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Generative Engine Optimization (GEO)" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Answer Engine Optimization (AEO)" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "ChatGPT Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Perplexity Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Gemini Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Claude Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Structured Data for AI Crawlers" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Entity Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Citation Strategy" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Knowledge Graph Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Answer-Ready Content Formatting" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Referral Traffic Tracking" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our AI Search Optimization Process Works",
    description: "Our proven 6-step AI search optimization process for getting NYC service businesses recommended by ChatGPT, Perplexity, Gemini, and Claude.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "AI Search Audit & Entity Assessment",
        text: "We audit your current AI search visibility across ChatGPT, Perplexity, Gemini, and Claude. We assess your entity authority, structured data quality, citation network, and content answer-readiness. We identify gaps between your current presence and what AI models need to recommend you.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Entity Foundation & Structured Data",
        text: "We build or rebuild your entity foundation with comprehensive JSON-LD structured data — LocalBusiness, Service, FAQPage, Review, Organization, HowTo, and BreadcrumbList schema. We ensure entity consistency across every directory, citation, and platform where your business is mentioned.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Answer-Ready Content Optimization",
        text: "We restructure your content so AI models can extract clear, citable answers. FAQ content with proper schema, concise answer paragraphs, definitive statements about your services and expertise, and topical depth that establishes you as the authoritative source for your service category.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Citation Network & Authority Building",
        text: "We build a citation network across 50+ directories, industry platforms, and authoritative websites. Every mention reinforces your entity — consistent name, address, phone, services, and expertise across the web. This is the signal strength that AI models use to validate recommendations.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Multi-Platform Optimization",
        text: "We optimize for each AI platform individually. ChatGPT via Bing signals and web browsing. Perplexity via live web crawling and citation authority. Gemini via Google Knowledge Graph and search index. Claude via training data and web references. Each platform has different signals — we optimize for all of them.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Monitoring, Tracking & Continuous Optimization",
        text: "We track AI recommendation frequency, AI referral traffic, citation mentions, and entity authority across all platforms. Monthly reports show your AI search visibility trend alongside traditional SEO metrics. We continuously adapt to platform updates and competitive changes.",
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
      name: "The NYC SEO — AI Search Optimization Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Rachel M." },
    reviewBody:
      "The NYC SEO was one of the only agencies we talked to that even understood AI search optimization. Within 3 months, our business started appearing in ChatGPT and Perplexity recommendations for our target keywords. The leads coming from AI search are some of the highest quality we have ever seen — people who already know our name and have decided to hire us before they even call. This is the future and they are way ahead of everyone else.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "AI Search Optimization", url: "/services/ai-search-optimization" },
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
                Service 08 of 11 &middot; The Cutting Edge
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                AI Search Optimization
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] via-[#A9A6FA] to-[#EFF70A] bg-clip-text text-transparent">
                  Get Recommended, Not Just Ranked
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Google is no longer the only search engine that matters. Over 100 million people use ChatGPT every month. Millions more use Perplexity, Gemini, and Claude to find{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service providers</Link>{" "}
                — and these AI platforms do not show 10 blue links. They recommend 2 to 3 businesses by name. If your business is not one of them, your competitor is. We are one of the first agencies in New York City offering dedicated Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO) — the discipline of getting your business recommended by AI search platforms. This is not future-proofing. This is right now. And your competitors have not started yet.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "ChatGPT optimization & recommendation targeting",
                "Perplexity real-time citation optimization",
                "Google Gemini & knowledge graph presence",
                "Claude entity authority building",
                "Generative Engine Optimization (GEO)",
                "Answer Engine Optimization (AEO)",
                "JSON-LD structured data for AI crawlers (7+ types)",
                "Entity optimization & citation strategy",
                "Answer-ready content formatting",
                "AI referral traffic tracking & attribution",
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
          SECTION 2: THE SHIFT — WHY AI SEARCH MATTERS NOW
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Biggest Shift in Search Since Google: Why AI Search Optimization Is Non-Negotiable in 2026
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Search is undergoing the most fundamental transformation since Google launched in 1998. For 25 years, the playbook was simple: rank on Google, get traffic, convert leads. That playbook still works — <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">traditional SEO</Link> is not dead, and Google still processes over 8.5 billion searches per day. But a second search channel has emerged that is growing faster than any channel since mobile, and most businesses do not even know it exists.
            </p>
            <p>
              ChatGPT crossed 100 million monthly active users faster than any application in history. It now processes over 1 billion queries per week. Perplexity is growing at 40% month-over-month. Google Gemini is integrated into Android, Chrome, and Google Search itself. Anthropic&apos;s Claude is used by millions of professionals and consumers. Microsoft Copilot ships with every Windows PC and every Office 365 subscription. Apple Intelligence is built into every new iPhone, iPad, and Mac.
            </p>
            <p>
              These are not niche tools. These are mainstream platforms that hundreds of millions of people use daily to find information, compare options, and make purchasing decisions. And when someone asks ChatGPT &ldquo;who is the best <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber</Link> in <Link href="/plumber/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn Heights</Link>,&rdquo; it does not show 10 blue links with ads at the top. It recommends 2 to 3 businesses by name, with context about why each one is a good choice. If you are one of those 2 to 3 businesses, you receive a pre-qualified lead — someone who already knows your name and has been told you are a good option. If you are not one of them, that lead goes to your competitor.
            </p>
            <p>
              This is fundamentally different from traditional search. In Google, you compete with 9 other organic results plus 4 ads. In AI search, you compete for 2 to 3 recommendation slots with zero ads. The barrier to entry is higher, but the reward is disproportionately large. There are no ads to buy your way in. There is no &ldquo;position 7&rdquo; in an AI response — you are either recommended or you are not.
            </p>
            <p>
              The businesses that optimize for AI search now — while their competitors are still stuck in 2019 SEO — will own the recommendation layer for years. AI models build associations over time. The earlier you establish entity authority, the harder it becomes for competitors to displace you. This is exactly the same first-mover advantage that businesses had with{" "}
              <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google SEO</Link>{" "}
              in 2005 — except the window is closing faster because AI adoption is accelerating exponentially.
            </p>
            <p>
              At <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">The NYC SEO</Link>, we have been building websites and ranking businesses for over 20 years. Our parent company, <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been in digital marketing since before Google existed. We were early to SEO, early to local SEO, early to mobile optimization, and we are early to AI search optimization. This is not a pivot — it is the next logical step in a two-decade trajectory of staying ahead of where search is going.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: STATS BANNER
          ============================================================ */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">The Numbers Do Not Lie</h2>
          <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <div className="text-4xl font-extrabold text-white">100M+</div>
              <div className="mt-2 text-sm text-blue-200">ChatGPT monthly active users</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#EFF70A]">1B+</div>
              <div className="mt-2 text-sm text-blue-200">ChatGPT queries per week</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-white">2-3</div>
              <div className="mt-2 text-sm text-blue-200">Businesses recommended per query (not 10)</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#EFF70A]">0</div>
              <div className="mt-2 text-sm text-blue-200">Ads in AI search results</div>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <div className="text-4xl font-extrabold text-white">40%</div>
              <div className="mt-2 text-sm text-blue-200">of Gen Z prefers AI search over Google</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#EFF70A]">300M+</div>
              <div className="mt-2 text-sm text-blue-200">Perplexity monthly queries</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-white">2B+</div>
              <div className="mt-2 text-sm text-blue-200">Gemini users via Google ecosystem</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-[#EFF70A]">&lt;1%</div>
              <div className="mt-2 text-sm text-blue-200">of local businesses optimized for AI search</div>
            </div>
          </div>
          <p className="mt-8 text-lg text-blue-100">
            When someone asks ChatGPT &ldquo;best <Link href="/electrician" className="text-white underline hover:text-blue-200">electrician</Link> in Brooklyn,&rdquo; it does not show 10 blue links. It recommends 2 to 3 businesses by name. Your competitors are invisible to this channel. You do not have to be.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: WHAT IS GEO & AEO
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            GEO and AEO Explained: The Two Disciplines of AI Search Optimization
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              AI search optimization encompasses two complementary disciplines: Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO). Understanding the difference matters because each addresses a different aspect of how AI models select, cite, and recommend businesses.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-[#0080FE]/30 bg-[#0080FE]/5 p-8">
              <h3 className="text-2xl font-bold text-[#0080FE]">Generative Engine Optimization (GEO)</h3>
              <p className="mt-4 text-zinc-300 leading-relaxed">
                GEO is the broad discipline of optimizing your entire digital presence so that generative AI models recognize, trust, and recommend your business. It encompasses everything from{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">structured data implementation</Link>{" "}
                and entity optimization to citation building and knowledge graph presence. GEO is to AI search what <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> is to traditional search — the comprehensive practice of making your business visible in the channel.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Entity authority building across the web",
                  "Structured data that AI crawlers parse and understand",
                  "Citation networks that validate your expertise",
                  "Knowledge graph presence and disambiguation",
                  "Multi-platform optimization (ChatGPT, Perplexity, Gemini, Claude)",
                  "Brand mention consistency and sentiment management",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#EFF70A]/30 bg-[#EFF70A]/5 p-8">
              <h3 className="text-2xl font-bold text-[#EFF70A]">Answer Engine Optimization (AEO)</h3>
              <p className="mt-4 text-zinc-300 leading-relaxed">
                AEO is the focused practice of structuring your content so AI platforms extract and cite your answers to specific questions. When someone asks Perplexity &ldquo;how much does a{" "}
                <Link href="/roofer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">roofer</Link>{" "}
                cost in Queens,&rdquo; AEO determines whether your content is cited as the source. It is about creating{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content</Link>{" "}
                that AI models can extract verbatim — clear, authoritative, answer-ready content with proper FAQ schema.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Answer-ready content formatting for AI extraction",
                  "FAQ schema with comprehensive question coverage",
                  "Concise, citable answer paragraphs",
                  "Topical authority and depth signals",
                  "Question-and-answer structured data markup",
                  "Content clarity optimization for LLM parsing",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 text-zinc-300 leading-relaxed">
            At The NYC SEO, we implement both GEO and AEO as integrated components of every AI search optimization campaign. GEO builds the foundation that makes AI models trust your entity. AEO creates the content that AI models cite and recommend. Together, they create a compounding advantage that grows stronger over time — just like traditional SEO, but for the next generation of search.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: HOW AI SEARCH WORKS (PLATFORM BREAKDOWN)
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How Each AI Search Platform Works — And How We Optimize for All of Them
          </h2>
          <p className="mt-4 text-zinc-400">
            Every AI search platform has different data sources, different ranking signals, and different recommendation logic. A one-size-fits-all approach does not work. Here is how each platform operates and what we do to optimize your visibility on each one.
          </p>
          <div className="mt-10 space-y-10">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">ChatGPT Optimization</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                ChatGPT is the largest AI search platform with over 100 million monthly active users. It generates recommendations using a combination of its training data (which includes web content indexed through its cutoff date), real-time web browsing via Bing, and user context. For local service businesses, ChatGPT pulls heavily from Bing&apos;s local results, structured data on your website, review aggregates, and content authority signals. We optimize your Bing presence, implement comprehensive{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">structured data</Link>, build entity authority through citations, and create content that ChatGPT&apos;s browsing feature can parse and cite. We also monitor ChatGPT&apos;s recommendation patterns for your target queries and adjust strategy based on what the model is currently prioritizing.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Perplexity Optimization</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Perplexity is the fastest-growing AI search platform and the most transparent about its sources. It crawls the live web in real-time for every query and cites its sources with linked references — meaning you can see exactly which websites Perplexity is pulling from. For service businesses, this makes Perplexity optimization highly actionable. We optimize your website structure for Perplexity&apos;s crawler, ensure your{" "}
                <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">citation network</Link>{" "}
                includes high-authority sources that Perplexity trusts, and create answer-ready content that Perplexity can cite verbatim. Perplexity also sends identifiable referral traffic, so we can track exactly how many visitors and leads come from Perplexity recommendations.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Google Gemini Optimization</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Gemini is Google&apos;s AI model, integrated into Google Search, Android, and Chrome. It pulls from Google&apos;s Knowledge Graph, Google Search index, Google Maps, and{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                data. This means your existing <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google SEO</Link> and local SEO signals directly influence Gemini&apos;s recommendations. We optimize your Google Business Profile, build your Knowledge Graph presence through structured data and Wikipedia/Wikidata references, and ensure your Google Search rankings feed into Gemini&apos;s recommendation engine. If you are already investing in traditional SEO with us, Gemini optimization is a natural extension that amplifies your existing investment.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Claude Optimization</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Anthropic&apos;s Claude uses a combination of training data and web references to generate recommendations. Claude tends to prioritize authoritative, well-structured content with clear entity definitions. Our Claude optimization strategy focuses on building comprehensive structured data that explicitly defines your entity (who you are, what you do, where you operate), creating long-form authoritative content that establishes topical depth, and building your presence on high-authority platforms that are well-represented in Claude&apos;s training data. Claude is particularly sensitive to content quality and consistency — vague or contradictory information across different sources hurts your recommendation probability.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Microsoft Copilot & Apple Intelligence</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Microsoft Copilot is powered by OpenAI&apos;s models and Bing&apos;s search index, making its optimization strategy similar to ChatGPT with additional Bing-specific signals. Apple Intelligence, built into every new Apple device, draws from multiple data sources including on-device models and web search. We optimize for both through Bing presence management, structured data implementation, and cross-platform entity consistency. As these platforms evolve, our strategies adapt — this is why AI search optimization is an ongoing service, not a one-time project.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6: OUR 6-STEP PROCESS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our 6-Step AI Search Optimization Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every AI search optimization campaign follows this proven framework — adapted to your industry, competition level, and target platforms.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "AI Search Audit & Entity Assessment",
                body: "We start by testing your current AI search visibility. We run your target queries across ChatGPT, Perplexity, Gemini, Claude, and Copilot and document exactly what each platform says about your business — or does not say. We assess your entity authority: how consistently your business is described across the web, the quality and quantity of your citations, the depth of your structured data, and the answer-readiness of your content. We analyze your competitors' AI search presence to understand who is currently being recommended and why. This audit takes 10 to 15 hours and produces the strategic foundation for your entire campaign.",
              },
              {
                step: "02",
                title: "Entity Foundation & Structured Data Implementation",
                body: "We build your entity foundation from the ground up. This means implementing comprehensive JSON-LD structured data on every page of your website — LocalBusiness schema, Service schema with OfferCatalog, FAQPage schema, Review and AggregateRating schema, Organization schema, HowTo schema, and BreadcrumbList schema. We ensure every schema block explicitly defines your entity: your business name, your services, your service areas, your expertise, your contact information, and your organizational relationships. If your site is built on Next.js (which we build and recommend), we implement this at the code level for maximum control. If you are on WordPress, we implement via custom code or structured data plugins.",
              },
              {
                step: "03",
                title: "Answer-Ready Content Optimization",
                body: "We restructure every piece of content on your site for AI extraction. This means creating concise, definitive answer paragraphs that AI models can cite verbatim. Building comprehensive FAQ content with proper schema markup for every question your customers ask. Writing service descriptions that clearly state what you do, where you do it, and why you are the best choice. Creating topical depth through long-form content, comparison pages, and educational resources that establish your authority. Every page is optimized with both traditional SEO keywords and AI-parseable content structures.",
              },
              {
                step: "04",
                title: "Citation Network & Authority Building",
                body: "We build and clean your citation network across 50+ directories, industry platforms, and authoritative websites. Every citation is consistent — same business name, same address, same phone number, same service descriptions. We identify and fix inconsistencies that confuse AI models. We build citations on platforms that each AI model trusts: Bing Places for ChatGPT and Copilot, high-authority websites for Perplexity, Google Business Profile for Gemini, and authoritative reference sources for Claude. We also pursue brand mentions, guest content, and digital PR that build your entity authority across the web.",
              },
              {
                step: "05",
                title: "Multi-Platform Testing & Optimization",
                body: "We run weekly testing across all target AI platforms, querying every target keyword and documenting which businesses are recommended, in what context, and with what confidence. We identify patterns — which platforms are responding to our optimizations first, which keywords are closest to tipping into recommendations, and where competitors are vulnerable. We adjust strategy in real-time based on these results. This is an iterative, data-driven process that compounds over time as your entity authority grows and AI models build stronger associations with your business.",
              },
              {
                step: "06",
                title: "Reporting, Tracking & Continuous Adaptation",
                body: "Every month, you receive a comprehensive AI search visibility report showing recommendation frequency across all platforms, AI referral traffic to your website, citation health scores, entity consistency metrics, and competitive positioning. We track AI search alongside your traditional SEO metrics so you see the full picture of your search presence. We adapt continuously to platform updates — AI models change rapidly, and what works today may need adjustment next month. Your campaign evolves as the platforms evolve, ensuring you maintain and extend your competitive advantage.",
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
          SECTION 7: MID-PAGE CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 8: TRADITIONAL SEO vs AI SEARCH — COMPARISON
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Traditional SEO vs. AI Search Optimization: What Changes and What Stays the Same</h2>
          <p className="mx-auto mt-4 max-w-3xl text-center text-zinc-400">
            AI search optimization does not replace traditional SEO — it extends it. Here is how the two disciplines compare.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-semibold text-zinc-400">Traditional SEO Only</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Rank in Google&apos;s 10 organic results</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Compete with ads for top-of-page visibility</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Traffic from Google, Bing, Yahoo, DuckDuckGo</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Users compare multiple search results before choosing</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Click-through rates of 2% to 30% depending on position</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Invisible to 100M+ ChatGPT users</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>No presence in Perplexity, Gemini, or Claude results</li>
                <li className="flex items-start gap-2"><span className="mt-0.5">&#8226;</span>Losing market share to AI-first searchers daily</li>
              </ul>
            </div>
            <div className="rounded-xl border border-[#0080FE]/30 bg-[#0080FE]/10 p-8">
              <h3 className="text-lg font-semibold text-[#EFF70A]">Traditional SEO + AI Search Optimization (What We Do)</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>Rank on Google AND get recommended by AI</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>Zero competition from ads in AI results</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>Traffic from Google + ChatGPT + Perplexity + Gemini + Claude</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>AI recommends you by name — leads arrive pre-sold</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>Only 2-3 businesses get recommended (not 10)</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>First-mover advantage while competitors sleep</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>AI referral traffic tracked and attributed to campaigns</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-green-400">&#10003;</span>Future-proof presence that grows as AI search adoption accelerates</li>
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-zinc-400">
            Both channels matter. We optimize for both simultaneously. Learn more about our{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">comprehensive SEO services</Link>{" "}
            and how they integrate with AI search optimization.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: WHAT'S INCLUDED — DELIVERABLES
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our AI Search Optimization Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is included in our AI search optimization campaigns. No hidden fees. No black-box processes. Full transparency on every tactic.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Structured Data for AI",
                items: [
                  "LocalBusiness JSON-LD schema",
                  "Service schema with OfferCatalog",
                  "FAQPage schema with comprehensive Q&A",
                  "Review & AggregateRating schema",
                  "Organization schema with entity relationships",
                  "HowTo & BreadcrumbList schema",
                  "7+ schema types per page",
                ],
              },
              {
                title: "Entity Optimization",
                items: [
                  "Cross-platform entity consistency audit",
                  "NAP standardization across 50+ directories",
                  "Knowledge Graph presence building",
                  "Wikipedia/Wikidata entity references",
                  "Entity disambiguation and authority signals",
                  "Brand mention monitoring and management",
                ],
              },
              {
                title: "Answer-Ready Content",
                items: [
                  "Content restructuring for AI extraction",
                  "FAQ content creation with schema",
                  "Concise, citable answer paragraphs",
                  "Topical depth and authority content",
                  "Question-query coverage mapping",
                  "Content clarity optimization for LLMs",
                ],
              },
              {
                title: "Citation Strategy",
                items: [
                  "50+ directory citation building",
                  "High-authority platform placement",
                  "Industry-specific citation networks",
                  "Review generation and management",
                  "Digital PR and brand mentions",
                  "Toxic citation monitoring and cleanup",
                ],
              },
              {
                title: "Multi-Platform Optimization",
                items: [
                  "ChatGPT optimization (Bing + browsing)",
                  "Perplexity optimization (live web crawling)",
                  "Gemini optimization (Google Knowledge Graph)",
                  "Claude optimization (entity authority)",
                  "Copilot optimization (Bing + OpenAI)",
                  "Apple Intelligence readiness",
                ],
              },
              {
                title: "Tracking & Reporting",
                items: [
                  "Weekly AI recommendation monitoring",
                  "AI referral traffic tracking in analytics",
                  "Recommendation frequency trend reports",
                  "Citation health scoring",
                  "Entity consistency monitoring",
                  "Monthly AI visibility report with walkthrough",
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
          SECTION 10: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">AI Search Optimization Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into structured data, entity building, content optimization, and citation strategy — not overhead. 20+ years of results behind every campaign.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses entering AI search for the first time.",
                features: [
                  "Full AI search audit across all platforms",
                  "Structured data implementation (7+ schema types)",
                  "Entity foundation & citation building (50+ directories)",
                  "Answer-ready content optimization (up to 30 pages)",
                  "Google Business Profile optimization for Gemini",
                  "Monthly AI recommendation tracking",
                  "Monthly reporting with trend analysis",
                  "Traditional SEO foundation included",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses targeting aggressive AI search visibility across all platforms.",
                features: [
                  "Everything in Foundation, plus:",
                  "Multi-platform optimization (ChatGPT, Perplexity, Gemini, Claude)",
                  "Programmatic content generation (up to 500 pages)",
                  "Aggressive citation & authority building (15+ links/month)",
                  "AI-optimized content creation (4 articles/month)",
                  "Weekly AI recommendation monitoring",
                  "Competitor AI search analysis",
                  "Bi-weekly strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want to own every AI recommendation in their market.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited programmatic pages",
                  "Full Next.js website build or migration",
                  "Aggressive link building (30+ links/month)",
                  "AI agent development & integration",
                  "Multi-location & multi-state targeting",
                  "Knowledge Graph & Wikidata presence building",
                  "Dedicated strategist + weekly calls",
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
            AI search optimization can also be added to any existing SEO campaign starting at $2,500/mo.{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>{" "}
            or <Link href="/contact" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contact us</Link> for a custom quote.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 11: WHY CHOOSE THE NYC SEO
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for AI Search Optimization</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Were First — And We Are Still Ahead</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                While most SEO agencies are still debating whether AI search matters, we are already optimizing clients for ChatGPT, Perplexity, Gemini, and Claude. We started building AI search optimization capabilities in 2023 when ChatGPT first launched. We have been testing, iterating, and refining our approach through every model update, every platform change, and every competitive shift. Most agencies will start offering &ldquo;AI SEO&rdquo; services in the next 12 to 18 months — by then, our clients will have a multi-year head start in entity authority that new entrants cannot quickly replicate.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Search Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company, <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been in digital marketing for over two decades. We have seen every paradigm shift in search — from the early days of keyword stuffing to the rise of backlinks, from mobile-first indexing to local pack dominance. AI search is the next major shift, and our institutional knowledge of how search evolves gives us a strategic advantage that no startup agency can match. We do not chase trends. We anticipate them, prepare for them, and execute before the market catches up.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Build on Next.js — Not WordPress</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                AI search optimization requires precise control over structured data, content structure, and technical implementation. WordPress plugins cannot deliver the level of schema precision and code-level control that AI crawlers need. We build every client site on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                — deployed on Vercel, backed by Supabase, with email through Resend and communications through Telnyx. This modern stack gives us complete control over every element that AI models parse: JSON-LD structured data at the code level, server-side rendering for crawler accessibility, sub-1-second page loads that improve crawl efficiency, and the ability to deploy{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">thousands of programmatic pages</Link>{" "}
                without performance degradation.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Full-Stack AI Integration</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not just optimize for AI search — we build with AI. Our{" "}
                <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agent development</Link>{" "}
                team builds custom chatbots and lead qualification agents. Our{" "}
                <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI content generation</Link>{" "}
                capabilities create answer-ready content at scale. Our{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                tracks AI referral traffic alongside every other lead source. This end-to-end AI capability means your AI search optimization is not a siloed service — it is integrated into every aspect of your digital presence and lead pipeline.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Specialize in Local Service Businesses</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                AI search optimization for a local <Link href="/hvac" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC company</Link> is fundamentally different from AI search optimization for a SaaS company or an e-commerce brand. Local service businesses need location-specific entity optimization, local citation networks,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
                integration, and neighborhood-level content targeting. We serve over{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170 service categories</Link>{" "}
                across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">318 neighborhoods</Link>{" "}
                in the NYC metro area. We know exactly how AI models recommend local businesses because we have tested it across thousands of local queries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: RESULTS & TESTIMONIALS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results: AI Search Visibility for NYC Service Businesses</h2>
          <p className="mt-4 text-zinc-400">
            AI search optimization is new, but results are already measurable. Here is what our early-adopter clients are experiencing.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "90 days", label: "Average time to first AI recommendation" },
              { stat: "6+", label: "AI platforms optimized simultaneously" },
              { stat: "7+", label: "Schema types implemented per page" },
              { stat: "< 1%", label: "Of competitors doing this yet" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6 text-center">
                <p className="text-3xl font-extrabold text-[#0080FE]">{item.stat}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-zinc-700 bg-[#0A0A0A] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-lg text-yellow-400">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 italic text-zinc-300 leading-relaxed">
              &ldquo;The NYC SEO was one of the only agencies we talked to that even understood AI search optimization. Within 3 months, our business started appearing in ChatGPT and Perplexity recommendations for our target keywords. The leads coming from AI search are some of the highest quality we have ever seen — people who already know our name and have decided to hire us before they even call. This is the future and they are way ahead of everyone else.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Rachel M., Interior Designer, Manhattan</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#0A0A0A] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-lg text-yellow-400">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 italic text-zinc-300 leading-relaxed">
              &ldquo;I asked ChatGPT for the best plumber in my neighborhood and my competitor came up — not me. That is when I called The NYC SEO. Four months later, I am the one being recommended. The structured data work they did on my site is incredible — every page has multiple schema types, and the AI models clearly understand what I do and where I operate. My phone is ringing from a channel that did not exist two years ago.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— James K., Plumber, Brooklyn</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#0A0A0A] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-lg text-yellow-400">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 italic text-zinc-300 leading-relaxed">
              &ldquo;We were already doing traditional SEO with another agency. The NYC SEO showed us that we were completely invisible on ChatGPT, Perplexity, and Gemini — platforms our customers are increasingly using. They added AI search optimization to our existing campaign and within 90 days we started tracking AI referral traffic in our analytics. It is still a small percentage of total traffic, but it is growing fast and the conversion rate is the highest of any channel.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Sarah T., HVAC Company Owner, Queens</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 13: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 14: RELATED SERVICES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Services That Amplify Your AI Search Visibility</h2>
          <p className="mt-4 text-zinc-400">
            AI search optimization works best as part of an integrated search strategy. These services complement and multiply your AI search presence.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Comprehensive traditional SEO that feeds into AI search signals." },
              { name: "On-Page SEO", href: "/services/on-page-seo", desc: "Structured data, content optimization, and schema markup implementation." },
              { name: "Off-Page SEO & Link Building", href: "/services/off-page-seo", desc: "Citation networks and authority signals that AI models trust." },
              { name: "Local SEO", href: "/services/local-seo", desc: "Location-specific optimization for AI local recommendations." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Gemini optimization through GBP authority and Knowledge Graph." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "Answer-ready content that AI platforms cite and reference." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js sites with code-level structured data control." },
              { name: "AI Agent Development", href: "/services/ai-agent-development", desc: "AI chatbots that qualify leads from AI search referrals." },
              { name: "AI Content Generation", href: "/services/ai-content-generation", desc: "AI-powered content creation for answer-readiness at scale." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of AI-optimized pages programmatically." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "Strategic planning that integrates traditional and AI search." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "AI referral traffic tracking and recommendation monitoring." },
              { name: "Full Loop CRM", href: "/services/fullloopcrm", desc: "Track AI search leads alongside every other channel." },
              { name: "Marketing Consulting", href: "/services/marketing-consulting", desc: "Executive-level guidance on AI search strategy and investment." },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-5 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-[#0080FE]">{service.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">{service.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 15: SERVICE AREAS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">AI Search Optimization Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We optimize AI search visibility for service businesses across the entire NYC metropolitan area — every borough, every suburb, every neighborhood where your customers are asking AI for recommendations.
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
                  { name: "SoHo", href: "/painter/soho" },
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
                  { name: "Crown Heights", href: "/locksmith/crown-heights" },
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
                      className="rounded-full border border-zinc-700 bg-[#0A0A0A] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
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
            we cover and all{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170+ service categories</Link>{" "}
            we optimize for AI search visibility.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 16: FAQ
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About AI Search Optimization</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about Generative Engine Optimization (GEO), Answer Engine Optimization (AEO), and getting recommended by AI search platforms.
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
          SECTION 17: FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
