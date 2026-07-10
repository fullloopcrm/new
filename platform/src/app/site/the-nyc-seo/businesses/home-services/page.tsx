import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import {
  getServicesByCategorySlug,
  getNeighborhoodsByRegion,
  getRegions,
  getCategories,
  categoryToSlug,
} from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";

export const metadata: Metadata = {
  title: "SEO for Home Service Businesses NYC",
  description:
    "SEO and AI search optimization for home service businesses in NYC. We rank plumbers, electricians, HVAC, roofers, and 50+ trades across 318 neighborhoods.",
  keywords: [
    "SEO for home service businesses NYC",
    "plumber SEO NYC",
    "electrician SEO New York",
    "HVAC SEO NYC",
    "contractor SEO agency",
    "home services marketing NYC",
    "local SEO for plumbers",
    "home service business marketing",
    "SEO for contractors NYC",
    "roofer SEO New York",
  ],
  openGraph: {
    title: "SEO for Home Service Businesses NYC",
    description:
      "SEO and AI search optimization for plumbers, electricians, HVAC, roofers, and 50+ home service trades across NYC.",
    url: `${SITE_URL}/businesses/home-services`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/businesses/home-services` },
};

const faqs = [
  {
    q: "How long does SEO take for a home service business in NYC?",
    a: "Most home service businesses see measurable ranking improvements within 60 to 90 days. Google Business Profile optimizations can impact Maps visibility within weeks. Competitive trades like plumbing and HVAC in dense boroughs like Manhattan and Brooklyn may take 4 to 6 months for consistent top-3 local pack positions. We provide monthly reporting so you see movement from day one, and our programmatic neighborhood pages start indexing within the first 30 days.",
  },
  {
    q: "How much does SEO cost for a plumber or electrician in NYC?",
    a: "Our SEO retainers for home service businesses start at $3,500 per month. This includes Google Business Profile optimization, local citation building across 80+ directories, neighborhood-targeted landing pages, on-page SEO, content strategy, and monthly reporting. Project-based engagements like a full website rebuild with SEO architecture start at $2,500. Consulting is available at $150 per hour for businesses that want expert guidance but prefer to execute in-house.",
  },
  {
    q: "Do you work with home service businesses outside Manhattan?",
    a: "Absolutely. We build SEO platforms for home service businesses across all five boroughs, plus Northern New Jersey, Long Island, and Westchester County. In fact, outer borough and suburban markets often present the best ROI opportunities because competition is lower than Manhattan while search volume remains strong. A roofer in Staten Island or an HVAC company in Queens can dominate their local market faster than a competitor trying to rank in Midtown.",
  },
  {
    q: "What makes SEO different for home service businesses vs. other industries?",
    a: "Home service SEO is driven by emergency and near-me search intent. When a pipe bursts at 2 AM, the homeowner searches 'emergency plumber near me' and calls the first business they see. This means Google Business Profile optimization, review velocity, and local pack rankings matter more than long-form blog content. We also build programmatic pages for every service-neighborhood combination — 'electrician Park Slope,' 'HVAC repair Astoria,' 'roofer Bay Ridge' — because home service searches are inherently hyperlocal.",
  },
  {
    q: "Can you help a home service business that already has a website?",
    a: "Yes. Most of our home service clients come to us with an existing website — often built on WordPress, Wix, or Squarespace — that is underperforming in search. We audit the site for technical SEO issues, content gaps, and structural problems, then either optimize the existing site or rebuild it on Next.js for maximum performance. We never throw away what is working. If your current site has backlinks and domain authority, we preserve that equity while fixing everything that is holding you back.",
  },
  {
    q: "How do you handle SEO for multi-trade home service companies?",
    a: "Multi-trade companies — general contractors who do plumbing, electrical, and renovation work, for example — need a hub-and-spoke content architecture. We create dedicated service pages for each trade, neighborhood pages for each service area, and cross-linked category pages that signal topical authority to Google. This prevents keyword cannibalization (where your plumbing page and your electrical page compete against each other) and ensures each service line ranks independently.",
  },
  {
    q: "Do you optimize for AI search platforms like ChatGPT and Perplexity?",
    a: "Yes. AI search optimization is built into every campaign. When a homeowner asks ChatGPT 'who is the best plumber in Brooklyn,' the answer is pulled from structured data, authoritative content, and consistent business information across the web. Our SEO strategies — schema markup, citation consistency, review signals, and comprehensive content — are exactly what AI search platforms use to recommend businesses. We optimize for Google, Bing, ChatGPT, Perplexity, and Gemini simultaneously.",
  },
  {
    q: "What kind of results can a home service business expect from SEO?",
    a: "Our home service clients typically see a 3x to 5x increase in organic leads within 6 to 12 months. This translates to more phone calls from Google Maps, more form submissions from organic search, and more visibility in AI search results. A typical plumber or electrician ranking in the local pack for their top 10 keywords receives 40 to 80 calls per month from Google alone. The math is simple: if your average job is $500 and you close 30% of inbound calls, 60 monthly calls equals $9,000 in new revenue — from a $3,500/month investment.",
  },
];

export default function HomeServicesPage() {
  const services = getServicesByCategorySlug("home-services");
  const content = categoryContent["Home Services"];
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const allCategories = getCategories().filter((c) => c !== "Home Services");

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
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Home Service Businesses NYC",
    description:
      "Comprehensive SEO and AI search optimization for home service businesses including plumbers, electricians, HVAC contractors, roofers, painters, and 50+ trades across New York City, New Jersey, Long Island, and Westchester.",
    url: `${SITE_URL}/businesses/home-services`,
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
      name: "Home Service SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local SEO for Home Services" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Business Profile Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Programmatic Neighborhood Pages" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Search Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Content Marketing for Contractors" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Review Generation Systems" } },
      ],
    },
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

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Home Services", url: "/businesses/home-services" },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Business Types &middot; 318 Neighborhoods &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for Home Service
                <br />
                <span className="text-[#EFF70A]">Businesses in NYC</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Your customers are searching &ldquo;plumber near me,&rdquo; &ldquo;emergency electrician Brooklyn,&rdquo; and &ldquo;best HVAC company Queens&rdquo; right now. If you are not in the{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Maps local pack</Link>{" "}
                and the top organic results, your competitor is getting that call. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
                that put home service businesses in front of homeowners, property managers, and building supers across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">every neighborhood</Link>{" "}
                in the NYC metro area. Not WordPress templates. Not vanity metrics. Real rankings, real calls, real revenue.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: `${services.length}`, label: "Home Service Types" },
                { value: "318", label: "Neighborhoods Covered" },
                { value: "46%", label: "Of Google Searches Are Local" },
                { value: "3x–5x", label: "Avg Lead Increase in 12 Mo" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                  <div className="text-3xl font-extrabold text-[#0080FE]">{stat.value}</div>
                  <div className="mt-1 text-xs text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: WHY HOME SERVICE BUSINESSES NEED SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Home Service Businesses in NYC Need SEO
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              New York City has over 45,000 licensed contractors competing for the same homeowners. When someone&rsquo;s boiler dies in January or a pipe bursts at midnight, they don&rsquo;t flip through the Yellow Pages — they grab their phone and search. The{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              that appears at the top of Google Maps gets the call. The business buried on page two gets nothing.
            </p>
            <p>
              The home services industry is one of the most competitive{" "}
              <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
              markets in the country. Google Ads for plumber and HVAC keywords in NYC cost $45 to $85 per click — and that is before you factor in the 70% of clicks that go to organic results, not ads. Businesses that invest in{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              stop paying per click and start building an asset that generates leads month after month.
            </p>
            <p>
              The challenge is that most home service businesses try to handle SEO themselves — or hire a general marketing agency that doesn&rsquo;t understand the trades. They end up with a WordPress site that loads in 8 seconds, no{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page optimization</Link>, inconsistent business listings across the web, and zero{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>. We have been building SEO for contractors, plumbers, electricians, and every other home service trade in NYC for over 20 years. We know what works because we have done it hundreds of times.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: WHAT WE BUILD — SERVICE CARDS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Home Service Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Every deliverable below is designed specifically for the home services industry — not repurposed from a generic marketing playbook.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Local SEO & Google Maps",
                desc: "Dominate the local pack for every trade and neighborhood you serve. Citation building, NAP consistency, geo-grid tracking.",
                href: "/services/local-seo",
              },
              {
                num: "02",
                title: "Google Business Profile",
                desc: "Full GBP optimization — categories, services, photos, posts, Q&A, and review strategy tailored to home service businesses.",
                href: "/services/google-business-profile",
              },
              {
                num: "03",
                title: "Programmatic Neighborhood Pages",
                desc: "Unique landing pages for every service-neighborhood combination. 'Plumber Park Slope,' 'HVAC Astoria,' 'Electrician Bay Ridge' — at scale.",
                href: "/services/automation",
              },
              {
                num: "04",
                title: "AI Search Optimization",
                desc: "Get recommended when homeowners ask ChatGPT, Perplexity, or Gemini for the best contractor in their area.",
                href: "/services/ai-search-optimization",
              },
              {
                num: "05",
                title: "Content Marketing",
                desc: "Seasonal content, how-to guides, emergency response pages, and service comparison content that builds topical authority.",
                href: "/services/content-marketing",
              },
              {
                num: "06",
                title: "On-Page & Technical SEO",
                desc: "Schema markup, site speed optimization, mobile-first design, and structured data that search engines trust.",
                href: "/services/on-page-seo",
              },
              {
                num: "07",
                title: "Off-Page SEO & Link Building",
                desc: "Local backlinks from neighborhood blogs, business associations, home improvement directories, and NYC media outlets.",
                href: "/services/off-page-seo",
              },
              {
                num: "08",
                title: "Web Design & Development",
                desc: "Fast, modern websites built on Next.js — not WordPress. Sub-second load times, mobile-first, conversion-optimized for service calls.",
                href: "/services/web-design-development",
              },
              {
                num: "09",
                title: "Analytics & Reporting",
                desc: "Monthly reports with call tracking, form attribution, ranking movement, and ROI calculations. Every dollar accounted for.",
                href: "/services/analytics-reporting",
              },
              {
                num: "10",
                title: "Full Loop CRM",
                desc: "Turn every lead into a tracked opportunity. Automated follow-ups, review requests, and pipeline management built for service businesses.",
                href: "/services/fullloopcrm",
              },
            ].map((card) => (
              <Link
                key={card.num}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <span className="text-sm font-bold text-[#0080FE]">{card.num}</span>
                <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: OUR PROCESS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank Home Service Businesses
          </h2>
          <p className="mt-4 text-zinc-400">
            A proven process refined over two decades of ranking contractors, plumbers, electricians, and every trade in between across the NYC metro area.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Industry & Competitive Audit",
                body: "We analyze your local search footprint — Google Business Profile health, citation accuracy across 80+ directories, review profile, current rankings on a geo-grid of your service area, and exactly where your competitors outrank you. For home service businesses, we also audit your service area alignment, making sure your GBP service areas match the neighborhoods where you actually want leads.",
              },
              {
                step: "02",
                title: "Keyword Strategy & Architecture",
                body: "Home service keywords follow a specific pattern: [trade] + [neighborhood] + [modifier]. 'Emergency plumber Upper West Side,' 'licensed electrician Astoria,' 'affordable HVAC repair Bay Ridge.' We map every high-intent keyword to a page on your site, building a content architecture that signals topical authority to Google and prevents keyword cannibalization between your service pages.",
              },
              {
                step: "03",
                title: "Website Build or Optimization",
                body: "We build your site on Next.js for sub-second load times and perfect Core Web Vitals — or optimize your existing site if it has authority worth preserving. Every page gets LocalBusiness schema, service-specific structured data, and internal linking that passes ranking power from your strongest pages to your newest neighborhood targets.",
              },
              {
                step: "04",
                title: "Programmatic Page Deployment",
                body: "We generate unique, optimized landing pages for every service-neighborhood combination you target. A plumber serving 40 neighborhoods gets 40+ pages, each with localized content about building types, common issues in that area, and neighborhood-specific calls to action. These pages start indexing within 30 days and compound over time.",
              },
              {
                step: "05",
                title: "GBP, Citations & Review Engine",
                body: "Full Google Business Profile optimization, citation building across 80+ directories (Yelp, Angi, Thumbtack, HomeAdvisor, BBB, and trade-specific platforms), NAP cleanup, and automated review generation. For home service businesses, review velocity is a critical ranking factor — we build systems that generate reviews on autopilot after every completed job.",
              },
              {
                step: "06",
                title: "Ongoing Optimization & Reporting",
                body: "Monthly geo-grid rank tracking, call attribution, lead counting, and ROI analysis. We track which neighborhoods are converting, which keywords are climbing, and where to double down. Home service SEO is never finished — seasonal shifts, new competitors, and algorithm updates require continuous optimization.",
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
          SECTION 5: MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 6: INDUSTRY DEEP-DIVE
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Home Services Market in NYC
          </h2>
          <p className="mt-4 text-zinc-400">
            Understanding the landscape your business competes in — and why{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
            is the highest-ROI channel for home service leads.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {content.stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800 bg-[#141414] p-4 text-center">
                <div className="text-xl font-extrabold text-[#EFF70A]">{stat.value}</div>
                <div className="mt-1 text-xs text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Why Local Matters */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Why Local Visibility Matters for Home Services</h3>
            <ul className="mt-4 space-y-3">
              {content.whySEOMatters.map((point) => (
                <li key={point} className="flex gap-3 text-zinc-300">
                  <span className="mt-1 text-[#0080FE]">&#9654;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cost Factors */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Cost Factors in the Home Services Industry</h3>
            <p className="mt-3 text-zinc-400">{content.investmentContext}</p>
            <ul className="mt-4 space-y-2">
              {content.investmentFactors.map((factor) => (
                <li key={factor} className="flex gap-3 text-sm text-zinc-300">
                  <span className="text-[#EFF70A]">&bull;</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common Mistakes */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Mistakes We Help Clients Avoid</h3>
            <div className="mt-4 space-y-4">
              {content.seoMistakes.map((item) => (
                <div key={item.mistake} className="rounded-lg border border-zinc-800 bg-[#141414] p-4">
                  <p className="font-medium text-white">{item.mistake}</p>
                  <p className="mt-1 text-sm text-zinc-400">{item.consequence}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: ALL BUSINESS TYPES IN THIS CATEGORY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            All {services.length} Home Service Business Types We Rank
          </h2>
          <p className="mt-4 text-zinc-400">
            Every type of home service business we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>, and{" "}
            <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic pages</Link>{" "}
            for. Click any business type for the full SEO breakdown.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-medium text-white">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              SEO Pricing for Home Service Businesses
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Transparent pricing. No long-term contracts. No hidden fees. Cancel anytime with 30 days notice.{" "}
              <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                name: "Monthly Retainer",
                price: "$3,500/mo",
                desc: "Ongoing SEO, local SEO, content, and optimization",
                features: [
                  "Full SEO & local SEO management",
                  "Google Business Profile optimization",
                  "Programmatic neighborhood pages",
                  "Citation building & NAP management",
                  "Review generation system",
                  "Monthly reporting & strategy calls",
                  "AI search optimization",
                ],
              },
              {
                name: "Project-Based",
                price: "$2,500+",
                desc: "One-time projects: site builds, audits, page creation",
                features: [
                  "Website build or redesign",
                  "Comprehensive SEO audit",
                  "Technical SEO remediation",
                  "Schema markup implementation",
                  "Content architecture planning",
                  "Competitor analysis report",
                  "GBP setup & optimization",
                ],
              },
              {
                name: "Consulting",
                price: "$150/hr",
                desc: "Expert guidance for in-house teams",
                features: [
                  "SEO strategy sessions",
                  "Keyword research & mapping",
                  "Content planning & review",
                  "Technical SEO guidance",
                  "Team training & workshops",
                  "Quarterly strategy reviews",
                  "On-call SEO support",
                ],
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-8"
              >
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="mt-2 text-3xl font-extrabold text-[#0080FE]">{tier.price}</div>
                <p className="mt-2 text-sm text-zinc-400">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className="mt-8 block rounded-lg bg-[#0080FE] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#0070E0]"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: REGION COVERAGE
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Areas We Cover for Home Service SEO
          </h2>
          <p className="mt-4 text-zinc-400">
            We build{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            campaigns targeting every neighborhood in your service area.
          </p>
          <div className="mt-10 space-y-10">
            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region] || [];
              const note = content.regionNotes[region];
              return (
                <div key={region}>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{region}</h3>
                  {note && <p className="mt-2 text-sm text-zinc-400">{note}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {neighborhoods.slice(0, 12).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {neighborhoods.length > 12 && (
                      <span className="rounded-full px-3 py-1 text-xs text-zinc-600">
                        +{neighborhoods.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 11: FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Home Service SEO: Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-zinc-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: CROSS-LINKS & FINAL CTA
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Other Industries We Rank
          </h2>
          <p className="mt-4 text-zinc-400">
            Home services is one of {allCategories.length + 1} industries we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
            for. Explore our work in other industries.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allCategories.map((cat) => (
              <Link
                key={cat}
                href={`/businesses/${categoryToSlug(cat)}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 text-center font-medium text-white transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
              >
                {cat}
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Services</Link>
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Business Types</Link>
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Areas</Link>
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Pricing</Link>
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>
            <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Branding</Link>
            <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing Consulting</Link>
            <Link href="/services/marketing-manager" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing Manager</Link>
            <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Agent Development</Link>
            <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Content Generation</Link>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
