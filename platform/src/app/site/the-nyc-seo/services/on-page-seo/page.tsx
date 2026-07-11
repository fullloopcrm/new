import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "On-Page SEO Services NYC",
  description:
    "On-page SEO services for NYC businesses. Title tags, meta descriptions, content optimization, internal linking, and schema markup. 25+ years experience.",
  keywords: [
    "on-page SEO services NYC",
    "on-page SEO agency New York",
    "title tag optimization NYC",
    "meta description optimization",
    "content optimization services",
    "heading hierarchy optimization",
    "internal linking strategy NYC",
    "image alt text optimization",
    "URL structure optimization",
    "keyword density optimization",
    "on-page SEO consultant NYC",
    "E-E-A-T optimization services",
    "semantic SEO New York",
  ],
  openGraph: {
    title: "On-Page SEO Services NYC",
    description:
      "On-page SEO for NYC businesses. Title tags, meta descriptions, content optimization, internal linking, and schema markup. 25+ years.",
    url: `${SITE_URL}/services/on-page-seo`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/on-page-seo` },
};

const faqs = [
  {
    q: "What is on-page SEO and why does it matter for my NYC business?",
    a: "On-page SEO is the practice of optimizing every element on your website that search engines use to understand, index, and rank your pages. This includes title tags, meta descriptions, heading hierarchy (H1 through H4), content quality and depth, keyword placement, image alt text, internal linking, URL structure, and structured data markup. For NYC service businesses competing in one of the most saturated local markets in the world, on-page SEO is the foundation that determines whether Google, Bing, and AI search platforms understand what you do, where you do it, and why you are the best choice. Without proper on-page optimization, even the best backlink profile and technical infrastructure will underperform. On-page SEO is not optional — it is the baseline requirement for ranking in competitive NYC markets.",
  },
  {
    q: "How much do on-page SEO services cost in New York City?",
    a: "Our on-page SEO campaigns start at $3,500 per month for single-location service businesses that need comprehensive page-level optimization across their entire website. Multi-location businesses targeting multiple boroughs or the full NYC metro area typically invest $7,500 to $15,000+ per month depending on the number of pages, services, and neighborhoods being targeted. Hourly consulting for on-page SEO implementation starts at $150 per hour and goes up to $500 per hour for executive-level strategic advisory. Every dollar goes directly into title tag research, content optimization, heading structure, internal link architecture, and schema markup implementation — no fluff, no vanity deliverables.",
  },
  {
    q: "What is the difference between on-page SEO and off-page SEO?",
    a: "On-page SEO covers everything on your website that you directly control — title tags, meta descriptions, heading hierarchy, content quality, keyword optimization, image alt text, internal linking, URL structure, schema markup, and content depth. Off-page SEO covers everything outside your website — backlink acquisition, local citations, Google Business Profile optimization, review management, digital PR, and brand mentions across the web. Think of on-page SEO as the foundation of your house and off-page SEO as the reputation of your neighborhood. Both matter, but without a strong on-page foundation, your off-page efforts will never reach their full potential. We handle both, but on-page always comes first because it is what Google reads when it crawls your site.",
  },
  {
    q: "How do you optimize title tags for NYC service businesses?",
    a: "We follow a proven title tag formula that balances keyword targeting, geographic relevance, and click-through rate optimization. Every title tag includes the primary keyword, the target location, and a value differentiator — all within 55 to 60 characters to avoid truncation in search results. For a plumber in Brooklyn Heights, the title tag might read: 'Brooklyn Heights Plumber | 24/7 Emergency Service | Licensed & Insured.' We A/B test title tags using Search Console data, monitor click-through rates, and iterate monthly. Most NYC businesses we audit have generic title tags like 'Home | Company Name' or duplicate title tags across every page — both are ranking killers that we fix immediately.",
  },
  {
    q: "What makes a good meta description and does it affect rankings?",
    a: "Meta descriptions do not directly affect rankings — Google has confirmed this. However, they significantly impact click-through rate, which indirectly influences rankings through user engagement signals. A good meta description is 150 to 160 characters, includes the target keyword naturally, communicates a clear value proposition, and contains a call to action. For NYC service businesses, we include the service type, the area served, a trust signal (years in business, licensing, reviews), and a reason to click. We write unique meta descriptions for every single page — no templates, no duplicates. A well-written meta description can increase your click-through rate by 20% to 40%, which means more traffic from the same ranking position.",
  },
  {
    q: "How important is heading hierarchy (H1-H4) for SEO?",
    a: "Heading hierarchy is one of the strongest on-page ranking signals available. Your H1 tells Google the primary topic of the page. Your H2s break the content into major sections. Your H3s and H4s add subtopic depth and semantic structure. Google uses heading hierarchy to understand content organization, topical relevance, and the relationships between concepts on your page. Most NYC business websites we audit have multiple H1 tags per page, skip heading levels (jumping from H1 to H4), or use headings purely for visual styling rather than content structure. We restructure every page with a single H1 containing the primary keyword, logical H2 sections for major topics, and H3/H4 tags for supporting details. This alone can move pages up 3 to 5 positions in search results.",
  },
  {
    q: "What is content optimization and how does it differ from content creation?",
    a: "Content creation is writing new content from scratch. Content optimization is improving existing content to rank better for target keywords. Optimization includes adjusting keyword density and placement, expanding thin content to meet topical depth requirements, adding semantic keywords and related entities, improving readability and structure, updating outdated information, and strengthening E-E-A-T signals. For most NYC service businesses, content optimization delivers faster results than creating new content because you are improving pages that Google has already indexed and partially ranked. We audit every existing page for content gaps, keyword opportunities, and competitive shortfalls before recommending new content creation.",
  },
  {
    q: "What is keyword density and how much does it matter in 2026?",
    a: "Keyword density — the percentage of times a keyword appears relative to total word count — used to be the primary on-page ranking factor. In 2026, it is still relevant but far less mechanical. Google now evaluates semantic relevance, topic coverage, entity associations, and natural language patterns rather than raw keyword frequency. That said, your primary keyword should appear in the title tag, H1, first paragraph, at least one H2, image alt text, and naturally throughout the body content. We target a keyword density of 1% to 2% for primary terms and use natural language processing tools to ensure comprehensive topic coverage. Keyword stuffing — cramming keywords unnaturally — will hurt your rankings. Strategic keyword placement will help them.",
  },
  {
    q: "How does internal linking affect on-page SEO?",
    a: "Internal linking is one of the most underused and most powerful on-page SEO tactics available. Internal links pass authority (PageRank) between pages, help Google discover and index new content, establish topical relevance clusters, and guide users through your site. For NYC service businesses, a strong internal linking strategy connects service pages to location pages, location pages to each other, blog content to service pages, and every page back to your highest-priority conversion pages. We build 15 to 25+ contextual internal links per page and maintain a site-wide linking architecture that distributes authority strategically. Most businesses we audit have 0 to 3 internal links per page — a massive missed opportunity.",
  },
  {
    q: "Why is image alt text important for SEO?",
    a: "Image alt text serves three critical functions: accessibility for visually impaired users, context for search engines that cannot see images, and ranking potential in Google Image Search. For NYC service businesses, image alt text is an opportunity to reinforce geographic and service relevance — 'licensed electrician installing panel in Brooklyn Heights brownstone' tells Google exactly what the image shows, what service is being performed, and where. We optimize every image on your site with descriptive, keyword-relevant alt text, compress images for faster load times, and use modern formats like WebP for optimal performance. Google Image Search drives 20% to 30% of total search traffic — alt text is how you capture it.",
  },
  {
    q: "How does URL structure impact on-page SEO?",
    a: "URL structure directly impacts how search engines understand and rank your pages. Clean, descriptive URLs like '/plumber/brooklyn-heights' tell Google exactly what the page is about before it even reads the content. Long, messy URLs like '/page?id=12345&cat=services' communicate nothing. Best practices include using lowercase letters, hyphens between words, including the target keyword, keeping URLs as short as possible while remaining descriptive, and maintaining a logical hierarchy that mirrors your site architecture. We structure URLs to follow a service/location pattern that scales across hundreds of pages — '/service/neighborhood' — which creates a clear, crawlable taxonomy that search engines love.",
  },
  {
    q: "What is E-E-A-T and how do you optimize for it?",
    a: "E-E-A-T stands for Experience, Expertise, Authoritativeness, and Trustworthiness — Google's framework for evaluating content quality. For NYC service businesses, E-E-A-T optimization means demonstrating real-world experience through case studies and project photos, showcasing expertise through detailed service descriptions and educational content, building authority through backlinks and industry recognition, and establishing trust through reviews, licensing information, and transparent business practices. On-page, we implement E-E-A-T signals through author bios, business credentials, customer testimonials, detailed about pages, trust badges, and schema markup that communicates your qualifications to search engines. E-E-A-T is especially critical for YMYL (Your Money or Your Life) industries like law, healthcare, and financial services.",
  },
  {
    q: "How often should on-page SEO be updated?",
    a: "On-page SEO is not a one-time project — it requires ongoing optimization. Title tags and meta descriptions should be reviewed quarterly based on click-through rate data from Search Console. Content should be audited every 6 months for freshness, accuracy, and competitive gaps. Internal linking should be updated whenever new pages are published. Schema markup should be validated monthly to ensure compliance with Google's evolving specifications. Keyword targeting should be adjusted based on ranking data and search trend changes. We include ongoing on-page optimization in every monthly campaign because the businesses that treat on-page SEO as a continuous process consistently outrank those that optimize once and forget about it.",
  },
  {
    q: "Can on-page SEO alone help my business rank on Google?",
    a: "On-page SEO alone can absolutely improve your rankings — especially if your current website has significant on-page issues like missing title tags, duplicate meta descriptions, broken heading hierarchy, thin content, or zero internal links. We have seen businesses jump 10 to 20 positions in search results from on-page fixes alone. However, in competitive NYC markets, on-page SEO is necessary but not sufficient. You also need strong technical SEO, quality backlinks, local SEO signals, and increasingly, AI search optimization. Think of on-page SEO as the foundation — it makes everything else work better. A page with perfect on-page optimization and 10 backlinks will outrank a page with poor on-page optimization and 50 backlinks.",
  },
  {
    q: "What tools do you use for on-page SEO analysis?",
    a: "We use a combination of industry-standard and proprietary tools. Google Search Console for click-through rate data, impression data, and indexation status. Ahrefs for competitive keyword analysis, content gap analysis, and internal link auditing. Screaming Frog for site-wide crawl analysis, title tag audits, heading structure validation, and duplicate content detection. Surfer SEO and Clearscope for content optimization and semantic keyword analysis. PageSpeed Insights and Web Vitals for performance metrics. Custom scripts for schema validation and internal link distribution analysis. We do not rely on any single tool — we cross-reference data from multiple sources to build a complete picture of your on-page health.",
  },
  {
    q: "What is semantic SEO and how does it apply to on-page optimization?",
    a: "Semantic SEO is the practice of optimizing content for meaning and context rather than just specific keywords. Instead of repeating 'plumber Brooklyn' twenty times, semantic SEO ensures your content covers related concepts — pipe repair, water heater installation, drain cleaning, emergency service, licensed and insured, residential and commercial — that help Google understand the full scope of your expertise. We use natural language processing tools to identify the semantic keywords and entities that top-ranking competitors cover in their content, then ensure your pages match or exceed that topical coverage. Semantic SEO is how you rank for hundreds of related queries from a single well-optimized page.",
  },
  {
    q: "Do you handle on-page SEO for websites not built by your team?",
    a: "Yes. We provide on-page SEO optimization for existing websites regardless of the platform they are built on. If your site is on WordPress, Squarespace, Wix, Shopify, or a custom CMS, we can optimize title tags, meta descriptions, heading structure, content, internal linking, image alt text, and schema markup within your current platform. That said, some platforms impose limitations — WordPress plugins can conflict with schema markup, Wix restricts URL structure control, and Squarespace limits heading customization. If your platform is actively holding back your on-page SEO, we will tell you honestly and recommend either a migration to Next.js or specific workarounds within your current stack.",
  },
  {
    q: "How does on-page SEO affect AI search platforms like ChatGPT and Perplexity?",
    a: "AI search platforms like ChatGPT, Perplexity, Gemini, and Claude rely heavily on on-page signals to understand and recommend businesses. Clear heading hierarchy helps AI models parse your content structure. Comprehensive, well-organized content gives AI models confidence in your expertise. Schema markup provides structured data that AI platforms use to generate accurate recommendations. Descriptive alt text helps multimodal AI models understand your visual content. The businesses that AI models recommend are the ones with the clearest, most well-structured, and most authoritative on-page content. On-page SEO is not just about Google anymore — it is the foundation for being discovered across every search platform, traditional and AI-powered.",
  },
];

export default function OnPageSEOServicesPage() {
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
    name: "The NYC SEO — On-Page SEO Services",
    url: `${SITE_URL}/services/on-page-seo`,
    telephone: PHONE,
    priceRange: "$3,500 - $15,000+/mo",
    description:
      "Expert on-page SEO services for NYC service businesses. Title tag optimization, meta description writing, heading hierarchy structuring, content optimization, internal linking, image alt text, URL structure, and schema markup implementation.",
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
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "On-Page SEO Services",
    description:
      "Comprehensive on-page SEO services including title tag optimization, meta description writing, heading hierarchy structuring, content optimization, keyword density analysis, image alt text, internal linking architecture, URL structure optimization, and schema markup implementation for NYC service businesses.",
    url: `${SITE_URL}/services/on-page-seo`,
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
      name: "On-Page SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Title Tag Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Meta Description Writing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Heading Hierarchy Optimization (H1-H4)" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Optimization & Keyword Density" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Image Alt Text Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Internal Linking Architecture" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "URL Structure Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Schema Markup Implementation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "E-E-A-T Signal Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Semantic SEO & Entity Optimization" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our On-Page SEO Process Works",
    description: "Our proven 6-step on-page SEO process for optimizing NYC service business websites to rank higher in Google, Bing, and AI search platforms.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "On-Page SEO Audit",
        text: "We crawl your entire website and audit every on-page element — title tags, meta descriptions, heading hierarchy, content depth, keyword targeting, image alt text, internal links, URL structure, and schema markup. We identify every issue, score each page, and prioritize fixes by impact.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Keyword Mapping & Content Gap Analysis",
        text: "We research every keyword your target customers search, map each keyword to a specific page on your site, and identify gaps where you are missing content entirely. We analyze competitor pages that outrank you and document exactly what they cover that you do not.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Title Tag & Meta Description Optimization",
        text: "We rewrite every title tag and meta description across your site — each one unique, keyword-targeted, geographically relevant, and optimized for maximum click-through rate. We follow character limits, include primary keywords, and add value propositions that differentiate you from competitors in search results.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Heading Hierarchy & Content Optimization",
        text: "We restructure every page with proper heading hierarchy — a single H1 with the primary keyword, logical H2 sections for major topics, and H3/H4 tags for supporting details. We optimize content depth, keyword density, semantic relevance, and E-E-A-T signals to meet or exceed what top-ranking competitors deliver.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Internal Linking & Technical On-Page Elements",
        text: "We build a comprehensive internal linking architecture with 15 to 25+ contextual links per page, optimize image alt text across the entire site, clean up URL structures, and implement schema markup that gives search engines and AI platforms structured data about your business, services, and locations.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Monitoring, Testing & Continuous Optimization",
        text: "We monitor rankings, click-through rates, and user engagement for every optimized page. We A/B test title tags, track content performance, update internal links as new pages are published, and continuously optimize based on data. On-page SEO is never finished — the businesses that iterate consistently outperform those that optimize once.",
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


  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "On-Page SEO Services", url: "/services/on-page-seo" },
  ];

  return (
    <div className="text-white">
      {/* Schema Markup */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

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
                On-Page SEO Experts &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                On-Page SEO Services
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  That Move the Needle in NYC
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Precision on-page optimization for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC service businesses</Link>{" "}
                — title tags, meta descriptions, heading hierarchy, content optimization, internal linking, image alt text, URL structure, and schema markup. We do not guess. We audit every page, map every keyword, and optimize every element that Google, Bing, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                use to rank your website. Built on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>, not WordPress. 20+ years of experience turning underperforming pages into top-ranking lead generators.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Title tag & meta description optimization",
                "Heading hierarchy (H1-H4) restructuring",
                "Content optimization & keyword density tuning",
                "Internal linking architecture (25+ links/page)",
                "Image alt text & WebP compression",
                "URL structure cleanup & optimization",
                "Schema markup (7+ types per page)",
                "E-E-A-T signal implementation",
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
          SECTION 2: WHAT IS ON-PAGE SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is On-Page SEO and Why Does Every NYC Business Need It?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              On-page SEO is the discipline of optimizing every element on your web pages that search engines read, evaluate, and use to determine your rankings. It is the most fundamental layer of search engine optimization — the layer that tells Google, Bing, and AI search platforms exactly what each page is about, who it is for, and why it deserves to rank above your competitors. When a homeowner in{" "}
              <Link href="/plumber/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn Heights</Link>{" "}
              searches &ldquo;emergency plumber near me&rdquo; or a business owner in{" "}
              <Link href="/electrician/midtown" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Midtown Manhattan</Link>{" "}
              searches &ldquo;commercial electrician NYC,&rdquo; on-page SEO determines whether your page appears in those results or gets buried on page three.
            </p>
            <p>
              On-page optimization encompasses everything visible on the page and everything embedded in its code: title tags that appear in search results and browser tabs, meta descriptions that convince searchers to click, heading hierarchy (H1 through H4) that structures your content for both readers and crawlers, content depth and quality that demonstrates expertise, keyword placement that signals topical relevance, image alt text that provides context for visual content, internal links that distribute authority and create topical clusters, URL structures that communicate page purpose, and structured data markup that gives search engines machine-readable information about your business. For{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC service businesses</Link>{" "}
              — <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">attorneys</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contractors</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              — every one of these elements needs to be optimized for both the service you provide and the specific neighborhoods you serve.
            </p>
            <p>
              The difference between a page with optimized on-page SEO and one without is staggering. A properly optimized service page with a keyword-rich title tag, a compelling meta description, a clear heading hierarchy, 1,500+ words of semantically rich content, 20+ internal links, optimized images, clean URLs, and complete schema markup will outrank a thin, unstructured page with a generic title tag every single time — even if the thin page has more backlinks. Google has gotten remarkably good at evaluating on-page quality, and in 2026, on-page signals are weighted more heavily than ever because they are the primary input for AI search platforms like ChatGPT and Perplexity.
            </p>
            <p>
              Most NYC businesses we audit have critical on-page SEO failures: duplicate title tags across every page, missing meta descriptions, broken heading hierarchy, thin content with fewer than 300 words per page, zero internal links, missing image alt text, and no structured data whatsoever. These are not minor issues — they are ranking killers. Our{" "}
              <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO services</Link>{" "}
              start with a comprehensive on-page audit because fixing these foundational issues often produces the fastest, most dramatic ranking improvements. On-page SEO is where every successful{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              begins — and it is where most of your competitors are still failing.
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
            Our 6-Step On-Page SEO Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every on-page optimization campaign follows this proven framework — adapted to your industry, your competitive landscape, and your target neighborhoods across NYC.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "On-Page SEO Audit",
                body: "We crawl your entire website using Screaming Frog, Ahrefs, and proprietary tools to audit every on-page element across every page. Title tags — are they unique, keyword-targeted, and within character limits? Meta descriptions — do they exist, are they compelling, do they include calls to action? Heading hierarchy — is there a single H1 per page with logical H2/H3/H4 structure? Content — is it deep enough, semantically relevant, and targeting the right keywords? Images — do they have descriptive alt text and optimal compression? Internal links — how many per page and are they contextually relevant? URLs — are they clean, descriptive, and logically structured? Schema markup — is it implemented, validated, and covering the right types? We score every page, flag every issue, and prioritize fixes by ranking impact. Most NYC business websites we audit have 50 to 200+ on-page issues that are actively hurting their rankings.",
              },
              {
                step: "02",
                title: "Keyword Mapping & Content Gap Analysis",
                body: "We research every keyword your potential customers use when searching for your services — head terms like 'plumber NYC,' long-tail phrases like 'clogged drain repair Upper West Side,' question queries like 'how much does a plumber charge in Brooklyn,' and conversational queries that AI search platforms surface. We map each keyword to a specific page on your site, ensuring every page has a clear primary keyword and a set of supporting semantic keywords. Then we perform a content gap analysis — comparing your on-page content against the top 10 ranking pages for each target keyword to identify exactly what topical coverage you are missing. This keyword map becomes the blueprint for every on-page optimization we perform.",
              },
              {
                step: "03",
                title: "Title Tag & Meta Description Optimization",
                body: "We rewrite every title tag and meta description on your website. Every title tag follows our proven formula: primary keyword + geographic modifier + value differentiator, all within 55 to 60 characters to prevent truncation. Every meta description is 150 to 160 characters, includes the target keyword naturally, communicates a specific value proposition, and contains a call to action that drives clicks. We never duplicate title tags or meta descriptions across pages — each one is unique, tested, and optimized for maximum click-through rate. We monitor CTR data in Google Search Console monthly and iterate on underperforming tags. A 10% improvement in click-through rate from better title tags can increase your organic traffic by thousands of visits per month without changing your ranking position.",
              },
              {
                step: "04",
                title: "Heading Hierarchy & Content Optimization",
                body: "We restructure the heading hierarchy on every page to create a clear, logical content outline that search engines can parse instantly. Each page gets a single H1 containing the primary keyword. H2 tags break the content into major topical sections. H3 and H4 tags add depth and subtopic structure. Then we optimize the content itself — expanding thin pages to meet competitive depth requirements (typically 1,200 to 2,500+ words for service pages), adjusting keyword density to the 1% to 2% range, adding semantic keywords and related entities that top-ranking competitors cover, improving readability with shorter paragraphs and clear transitions, and strengthening E-E-A-T signals with credentials, case studies, and specific NYC-relevant expertise. Every piece of content is optimized for both traditional search engines and AI platforms that rely on well-structured, authoritative content to generate recommendations.",
              },
              {
                step: "05",
                title: "Internal Linking, Images & Technical On-Page Elements",
                body: "We build a comprehensive internal linking architecture across your entire site — connecting service pages to location pages, location pages to each other, blog posts to service pages, and every page to your highest-priority conversion pages. Each page receives 15 to 25+ contextual internal links with descriptive anchor text that reinforces topical relevance. We optimize every image with descriptive, keyword-relevant alt text, compress images to modern WebP format, and add proper width/height attributes to prevent layout shift. We clean up URL structures to follow a logical service/location hierarchy, add or fix canonical tags to prevent duplicate content issues, and implement comprehensive schema markup — LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, HowTo, and Organization — across every relevant page. These technical on-page elements are what separate amateur SEO from professional-grade optimization.",
              },
              {
                step: "06",
                title: "Monitoring, Testing & Continuous Optimization",
                body: "On-page SEO is never a one-time project. We monitor keyword rankings for every optimized page across Google, Bing, and AI search platforms. We track click-through rates in Search Console and A/B test title tags on pages with high impressions but below-average CTR. We audit content freshness quarterly and update pages that are losing rankings to newer competitor content. We rebuild internal link structures whenever new pages are published. We validate schema markup monthly against Google's evolving specifications. And we report on every metric that matters — ranking changes, traffic growth, CTR improvements, and lead attribution — so you see exactly how on-page optimization is driving real business results. The businesses that treat on-page SEO as a continuous discipline consistently outrank those that optimize once and walk away.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our On-Page SEO Services</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is part of our on-page SEO campaigns. Comprehensive, transparent, and focused on the elements that actually move rankings.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Title Tags & Meta Data",
                items: ["Unique title tag for every page (55-60 chars)", "Unique meta description for every page (150-160 chars)", "Open Graph tags for social sharing", "Twitter Card markup", "Canonical tag implementation", "Click-through rate optimization & A/B testing"],
              },
              {
                title: "Heading Hierarchy & Structure",
                items: ["Single H1 with primary keyword per page", "Logical H2 section structure", "H3/H4 subtopic depth", "Heading-based content outline creation", "Competitive heading analysis", "Semantic heading optimization"],
              },
              {
                title: "Content Optimization",
                items: ["Keyword density analysis & tuning (1-2%)", "Semantic keyword & entity integration", "Content depth expansion (1,200-2,500+ words)", "E-E-A-T signal implementation", "Readability & engagement optimization", "Content freshness audits & updates"],
              },
              {
                title: "Internal Linking",
                items: ["15-25+ contextual internal links per page", "Anchor text optimization", "Topical cluster architecture", "Authority distribution mapping", "Orphan page identification & linking", "Conversion page link prioritization"],
              },
              {
                title: "Images & Media",
                items: ["Descriptive alt text for every image", "WebP format conversion & compression", "Width/height attributes (CLS prevention)", "Lazy loading implementation", "Image filename optimization", "Featured image strategy"],
              },
              {
                title: "Technical On-Page Elements",
                items: ["URL structure cleanup & optimization", "Schema markup (7+ types per page)", "Canonical tag audit & implementation", "Breadcrumb navigation & markup", "Mobile-first content optimization", "Core Web Vitals on-page factors"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who On-Page SEO Services Are For</h2>
          <p className="mt-4 text-zinc-400">
            If your website has pages that should be ranking but are not, on-page SEO is almost always the first fix. We specialize in local service businesses across the NYC metro area.
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
            We optimize on-page SEO for over{" "}
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
          SECTION 7: ON-PAGE SEO vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">On-Page SEO vs. Other Optimization Approaches</h2>
          <p className="mt-4 text-zinc-400">
            On-page SEO is one piece of a comprehensive search strategy. Here is how it compares to — and complements — other approaches NYC service businesses use.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">On-Page SEO vs. Technical SEO</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Technical SEO ensures search engines can crawl, index, and render your website — site speed, mobile responsiveness, XML sitemaps, robots.txt, Core Web Vitals, and server configuration. On-page SEO optimizes the actual content and HTML elements on each page — title tags, headings, content, internal links, and schema markup. Think of technical SEO as building the roads and on-page SEO as putting up the signs. You need both: a fast, crawlable site with perfectly optimized page-level elements. We handle both as part of our comprehensive{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO services</Link>, but on-page optimization typically delivers faster ranking improvements because it directly addresses how Google evaluates individual pages.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">On-Page SEO vs. Off-Page SEO (Link Building)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Off-page SEO — primarily backlink acquisition, citations, and digital PR — builds your website&apos;s overall domain authority and tells Google that other websites trust and reference your content. On-page SEO ensures that when Google evaluates the page itself, every signal confirms relevance, quality, and expertise. A page with 50 backlinks but a generic title tag, thin content, and zero internal links will lose to a page with 10 backlinks that has a keyword-optimized title, deep content, strong heading structure, and 25 internal links. On-page SEO maximizes the value of every backlink you earn. We build authority through our off-page campaigns, but we always optimize on-page elements first because they are the multiplier that makes link building work harder.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">On-Page SEO vs. Content Marketing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Content marketing</Link>{" "}
                is the process of creating and distributing valuable content to attract and retain customers. On-page SEO is the optimization layer that ensures that content actually ranks in search results. You can write the best blog post in the world, but if the title tag is generic, the heading structure is broken, and there are no internal links pointing to it, Google will not rank it. On-page SEO and content marketing are not alternatives — they are partners. Every piece of content we create or optimize includes full on-page SEO treatment from the moment it is published.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">On-Page SEO vs. Paid Search (Google Ads)</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Google Ads puts you at the top of search results instantly — for a price. Service keyword CPCs in NYC range from $15 to $85 per click, and you pay for every single click whether it converts or not. On-page SEO is a longer-term investment that generates free organic clicks indefinitely once your pages are properly optimized and ranking. A single page with a well-optimized title tag ranking in position 1 for &ldquo;plumber Brooklyn&rdquo; can generate $5,000 to $15,000 worth of equivalent paid traffic every single month — at zero ongoing cost per click. Most of our clients use Google Ads during the first 90 days while on-page optimizations take effect, then reduce ad spend as organic traffic grows.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Real On-Page SEO Results for NYC Businesses</h2>
          <p className="mt-4 text-zinc-400">
            On-page optimization is where we consistently deliver the fastest, most measurable ranking improvements. Here are the numbers.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "312%", label: "Average Organic Traffic Increase" },
              { stat: "2.4x", label: "Click-Through Rate Improvement" },
              { stat: "54,000+", label: "Pages Optimized & Indexed" },
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
              &ldquo;The NYC SEO completely rebuilt our on-page SEO from the ground up. They rewrote every title tag, restructured our heading hierarchy, optimized all our content for our target keywords, and built an internal linking system that connected all our service and location pages. Within 3 months our organic traffic doubled and we started ranking for keywords we had never appeared for before. Their attention to detail is unmatched — they found on-page issues that two previous agencies had completely missed.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Sarah K., Dental Practice Owner, Upper East Side</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;We thought our on-page SEO was fine — we had an SEO plugin on WordPress that gave us green lights on everything. The NYC SEO showed us that those plugin scores were meaningless. Our title tags were all duplicates, our heading structure was broken, our content was half the depth of our competitors, and we had almost no internal links. After they optimized everything, we went from page 3 to the top 5 for our most important keywords in under 60 days. The ROI has been incredible.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— James T., HVAC Company Owner, Astoria</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 On-Page SEO Mistakes NYC Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Duplicate or generic title tags across every page",
                fix: "The most common on-page SEO failure we see. Businesses with 50 pages often have the same title tag — 'Home | Company Name' — on every single one. We write unique, keyword-targeted, geographically specific title tags for every page on your site. Each one is crafted to maximize both ranking potential and click-through rate from search results.",
              },
              {
                mistake: "Missing or duplicate meta descriptions",
                fix: "When meta descriptions are missing, Google generates its own snippet — and it rarely chooses the most compelling text. When they are duplicated, Google may devalue the pages entirely. We write unique, 150-to-160-character meta descriptions for every page with clear value propositions and calls to action.",
              },
              {
                mistake: "Broken heading hierarchy — multiple H1s, skipped levels, styling-only headings",
                fix: "We audit and restructure the heading hierarchy on every page. One H1 per page with the primary keyword. H2s for major sections. H3s and H4s for subtopics. Headings are used for content structure, not visual styling. This gives search engines a clear content outline and can move pages up 3 to 5 ranking positions on its own.",
              },
              {
                mistake: "Thin content — pages with fewer than 300 words",
                fix: "Google rewards comprehensive, in-depth content that fully answers the searcher's query. A service page with 200 words cannot compete with a competitor's page that has 2,000 words covering every angle of the topic. We expand thin pages to 1,200 to 2,500+ words of semantically rich, keyword-optimized content that demonstrates genuine expertise.",
              },
              {
                mistake: "No internal linking strategy — pages with zero or one internal link",
                fix: "Internal links pass authority, establish topical relevance, and help Google discover your content. Pages with no internal links are orphaned — Google may never find them. We build 15 to 25+ contextual internal links per page, connecting your content into topical clusters that reinforce authority across your entire site.",
              },
              {
                mistake: "Missing image alt text on every image",
                fix: "Images without alt text are invisible to search engines and inaccessible to visually impaired users. We add descriptive, keyword-relevant alt text to every image — 'licensed plumber repairing copper pipes in Park Slope brownstone' — that reinforces your service, location, and expertise to Google and captures traffic from Google Image Search.",
              },
              {
                mistake: "Messy URL structures — long, parameter-heavy, non-descriptive",
                fix: "URLs like '/page?id=47&cat=3' tell Google nothing about the page content. We restructure URLs to follow a clean, descriptive pattern — '/plumber/brooklyn-heights' — that communicates page purpose, includes target keywords, and creates a logical site hierarchy that search engines can crawl efficiently.",
              },
              {
                mistake: "No schema markup whatsoever",
                fix: "Schema markup gives search engines structured, machine-readable data about your business, services, reviews, and content. Without it, you are missing rich result opportunities and making it harder for AI platforms to recommend you. We implement 7+ schema types per page — LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, HowTo, and Organization.",
              },
              {
                mistake: "Keyword stuffing instead of semantic optimization",
                fix: "Repeating 'plumber NYC' 50 times on a page does not work — it triggers Google's spam filters and hurts your rankings. We use semantic SEO: covering related topics, entities, and natural language variations that demonstrate comprehensive expertise on the subject. This is how you rank for hundreds of related queries from a single page.",
              },
              {
                mistake: "Relying on WordPress SEO plugins to handle on-page optimization",
                fix: "Yoast, RankMath, and other SEO plugins provide basic checklists, not real optimization. A green light from a plugin means nothing if your title tag is generic, your content is thin, your headings are broken, and your internal links are nonexistent. We go far beyond what any plugin can do — because plugins cannot write compelling title tags, restructure content for semantic depth, or build strategic internal linking architectures. We build on Next.js where we have code-level control over every on-page element.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">On-Page SEO Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into title tag research, content optimization, heading restructuring, internal linking, and schema implementation — not overhead. 20+ years of results behind every campaign.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses needing comprehensive on-page optimization.",
                features: [
                  "Full on-page SEO audit (every page scored)",
                  "Title tag & meta description optimization (up to 50 pages)",
                  "Heading hierarchy restructuring",
                  "Content optimization & keyword density tuning",
                  "Internal linking architecture (15+ links/page)",
                  "Image alt text optimization",
                  "Schema markup implementation (5+ types)",
                  "Monthly on-page performance reporting",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses targeting multiple boroughs with deep content optimization.",
                features: [
                  "Everything in Foundation, plus:",
                  "On-page optimization for up to 500 pages",
                  "Content depth expansion (1,500-2,500+ words/page)",
                  "Semantic keyword & entity optimization",
                  "E-E-A-T signal implementation",
                  "Click-through rate A/B testing",
                  "7+ schema types per page",
                  "Bi-weekly on-page strategy calls",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want every page on their site to be a top-ranking lead generator.",
                features: [
                  "Everything in Growth, plus:",
                  "Unlimited page optimization",
                  "Programmatic on-page optimization at scale",
                  "Full Next.js migration with on-page SEO built in",
                  "AI search content optimization",
                  "Competitive content gap domination",
                  "Dedicated on-page SEO strategist",
                  "Weekly optimization & strategy calls",
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
            All plans include a free initial on-page SEO audit. Custom plans available. Hourly consulting: $150-$500/hr.{" "}
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
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for On-Page Optimization</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of On-Page Expertise</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has been optimizing web pages since before Google launched its first algorithm update. We have adapted our on-page methodology through Panda, Penguin, Hummingbird, RankBrain, BERT, and the Helpful Content Update. We know exactly what Google rewards at the page level in 2026 because we have been studying, testing, and refining on-page optimization for over two decades. That institutional knowledge means we do not waste time on tactics that used to work — we apply what works right now.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Code-Level Control with Next.js</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most agencies are limited by their platform. WordPress plugins add overhead, restrict customization, and create conflicts. We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                where we have complete code-level control over every on-page element — title tags rendered server-side, heading hierarchy enforced programmatically, schema markup generated dynamically, internal links built into the architecture, and images optimized at build time. No plugins. No workarounds. No compromises. This is why our sites score 95+ on PageSpeed Insights and pass every Core Web Vital threshold while WordPress sites struggle with basic on-page elements.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Proprietary Tools Built by{" "}
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>
              </h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not just use off-the-shelf SEO tools. We build our own. Our proprietary on-page analysis tools — developed by our sister company Full Loop CRM — crawl your entire site, score every page against 47 on-page ranking factors, identify the highest-impact fixes, and generate optimization recommendations that our team implements immediately. This gives us a speed and precision advantage that agencies relying solely on third-party tools simply cannot match. Our tech stack — Next.js, Vercel, Supabase, Resend, and Telnyx — is built for performance at every layer.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">On-Page SEO for AI Search — Not Just Google</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                While most agencies are still optimizing title tags for Google alone, we optimize on-page elements for every search platform — Google, Bing, Yahoo, DuckDuckGo, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                like ChatGPT, Perplexity, Gemini, and Claude. AI models rely heavily on clear heading structure, comprehensive content, and accurate schema markup to understand and recommend businesses. The on-page optimization work we do today ensures your business is discoverable across every search platform — traditional and AI-powered — for years to come.
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
            On-page SEO is the foundation. These services build on that foundation and amplify your results across every channel.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services (Full-Service)", href: "/services/seo", desc: "Comprehensive SEO including on-page, off-page, technical, and local optimization." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic framework that guides every on-page optimization decision." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites with on-page SEO built into the architecture from day one." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Optimize on-page elements for ChatGPT, Perplexity, and AI-powered search." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content creation with full on-page optimization included." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Local SEO and map pack optimization that complements on-page efforts." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Generate hundreds of on-page-optimized pages at scale using programmatic systems." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track on-page performance, CTR, rankings, and lead attribution across all pages." },
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
          <h2 className="text-3xl font-bold sm:text-4xl">On-Page SEO Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide on-page SEO optimization for service businesses across the entire NYC metropolitan area — every borough, every neighborhood, every suburb.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                region: "Manhattan",
                areas: [
                  { name: "Midtown", href: "/hvac/midtown" },
                  { name: "Upper East Side", href: "/dentist/upper-east-side" },
                  { name: "Upper West Side", href: "/therapist/upper-west-side" },
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
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About On-Page SEO Services</h2>
          <p className="mt-4 text-zinc-400">
            Detailed answers to the most common questions NYC service businesses ask about on-page search engine optimization.
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
