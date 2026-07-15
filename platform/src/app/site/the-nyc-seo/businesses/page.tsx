import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategory,
  getAllServices,
  getAllNeighborhoods,
  categoryToSlug,
  getRegions,
  getServicesByCategorySlug,
} from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "SEO for 172 Business Types in NYC",
  description:
    "We build SEO and AI search platforms for 172 service industries across 318 neighborhoods. Plumbers to lawyers to med spas. See every business we rank.",
  keywords: [
    "SEO for service businesses NYC",
    "local SEO NYC businesses",
    "SEO agency for plumbers NYC",
    "SEO for lawyers New York",
    "SEO for contractors NYC",
    "SEO for dentists NYC",
    "SEO for med spas NYC",
    "small business SEO NYC",
    "local business SEO New York City",
    "SEO for home service businesses",
    "SEO for healthcare businesses NYC",
    "NYC business SEO agency",
    "AI search optimization NYC businesses",
    "programmatic SEO service businesses",
    "Google Maps SEO NYC",
  ],
  openGraph: {
    title: "SEO for 172 Business Types in NYC",
    description:
      "Full-service SEO and AI search platforms for 172 service industries across NYC, NJ, Long Island & Westchester.",
    url: `${SITE_URL}/businesses`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses`,
  },
};

/* ── Top 10 industries with own pages ── */
const topIndustries = [
  { name: "Home Services", slug: "home-services", count: 53, examples: "Plumbers, Electricians, HVAC, Roofers, Painters, Handymen", pitch: "Emergency searches, \"near me\" intent, and seasonal demand spikes make home services the most competitive local SEO category in NYC. We rank contractors in every borough." },
  { name: "Health & Medical", slug: "health-medical", count: 34, examples: "Dentists, Chiropractors, Therapists, Med Spas, Dermatologists", pitch: "Patients choose providers based on proximity, reviews, and trust. We build the local SEO and AI search presence that fills your appointment calendar." },
  { name: "Legal", slug: "legal", count: 19, examples: "Personal Injury, Divorce, Criminal Defense, Immigration, Estate", pitch: "Law firm SEO in NYC is the most expensive keyword market in the country. We outrank firms spending $10K+/month through strategy, not just spend." },
  { name: "Business Services", slug: "business-services", count: 9, examples: "Web Designers, Marketing Agencies, IT Consultants, Photographers", pitch: "B2B service providers need credibility signals that only come from ranking. We build the SEO infrastructure that makes prospects trust you before they call." },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", count: 8, examples: "Hair Salons, Barber Shops, Nail Salons, Med Spas, Makeup Artists", pitch: "Instagram is not enough. Google and AI search drive the bookings. We rank beauty businesses in the neighborhoods where your clients live and work." },
  { name: "Events", slug: "events", count: 7, examples: "Wedding Planners, Event Planners, DJs, Photographers, Videographers", pitch: "High-value bookings worth thousands each. Clients search months in advance. We make sure they find you first." },
  { name: "Financial", slug: "financial", count: 6, examples: "Accountants, Financial Advisors, Insurance Agents, Tax Preparers", pitch: "Trust is everything in financial services. Your prospects compare your online presence against every competitor before making contact." },
  { name: "Education", slug: "education", count: 6, examples: "Tutors, Music Lessons, Dance Studios, Language Schools, Driving", pitch: "Parents research obsessively. They compare reviews, credentials, proximity, and pricing — all through Google. We make you the top result." },
  { name: "Real Estate", slug: "real-estate", count: 6, examples: "Real Estate Agents, Property Managers, Home Inspectors, Mortgage", pitch: "The most competitive real estate market in the country. Local SEO determines which agent gets the inquiry and which one never knows the lead existed." },
  { name: "Automotive", slug: "automotive", count: 5, examples: "Auto Mechanics, Body Shops, Towing Services, Car Dealerships", pitch: "When someone needs a tow or their car breaks down, they search on their phone and call first. Local SEO is the difference between getting that call or not." },
];

/* ── Bottom 5 industries folded into this page ── */
const foldedIndustries = [
  "Fitness & Wellness",
  "Lifestyle",
  "Food & Dining",
  "Pet Services",
  "Seasonal",
];

export default function BusinessesPage() {
  const servicesByCategory = getServicesByCategory();
  const totalServices = getAllServices().length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalPages = totalServices * totalNeighborhoods;
  const regions = getRegions();
  const phonePlain = PHONE.replace(/-/g, "");

  /* ── JSON-LD ── */
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

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Service Businesses NYC",
    description: `Full-service SEO, AI search optimization, and digital marketing for ${totalServices} service industries across ${totalNeighborhoods}+ neighborhoods in NYC, New Jersey, Long Island, and Westchester.`,
    url: `${SITE_URL}/businesses`,
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
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Business Industries We Serve",
    numberOfItems: Object.keys(servicesByCategory).length,
    itemListElement: Object.entries(servicesByCategory).map(([cat, services], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: cat,
      url: `${SITE_URL}/businesses/${categoryToSlug(cat)}`,
      description: `${services.length} ${cat.toLowerCase()} business types we build SEO platforms for.`,
    })),
  };

  const faqItems = [
    {
      q: "How much does SEO cost for a service business in NYC?",
      a: "Monthly retainers start at $3,500/month for a full-service SEO campaign covering on-page optimization, local SEO, Google Business Profile, content marketing, link building, and AI search optimization. Project-based work starts at $2,500. Hourly consulting from $150/hour. The exact cost depends on your industry, competitive landscape, and how many neighborhoods you want to target. A plumber targeting 5 neighborhoods needs less investment than a law firm targeting all of Manhattan.",
    },
    {
      q: "What types of businesses do you do SEO for?",
      a: `We build SEO and AI search platforms for ${totalServices} service business types across 15 industries — home services (plumbers, electricians, HVAC), healthcare (dentists, chiropractors, med spas), legal (personal injury, divorce, immigration), financial, automotive, beauty, fitness, food & dining, events, education, business services, real estate, pet services, lifestyle, and seasonal businesses. If you serve customers locally, we can rank you.`,
    },
    {
      q: "How long does SEO take to work for local businesses in NYC?",
      a: "Most local service businesses see measurable improvements in 60-90 days, with significant ranking gains in 4-6 months. Google Business Profile optimizations can impact your Maps ranking within weeks. Programmatic location pages typically start ranking in 60-120 days. Highly competitive industries like personal injury law or cosmetic dentistry may take 6-12 months for top positions. We provide monthly reporting so you see progress from week one.",
    },
    {
      q: "Do you only work with businesses in New York City?",
      a: `We serve businesses across the entire NYC metro area — all five boroughs (Manhattan, Brooklyn, Queens, Bronx, Staten Island), Northern New Jersey, Long Island (Nassau and Suffolk counties), and Westchester County. That is ${totalNeighborhoods}+ neighborhoods with dedicated landing pages for each. If your service area touches the NYC metro, we can rank you.`,
    },
    {
      q: "What is programmatic SEO and how does it work for local businesses?",
      a: `Programmatic SEO is the automated generation of optimized landing pages at scale. For a plumber serving the NYC metro, we build ${totalNeighborhoods}+ pages — one for every neighborhood. "Plumber in Park Slope," "Plumber in Astoria," "Plumber in Hoboken" — each with unique content, proper schema markup, and internal linking. When someone searches "[your service] in [neighborhood]," your dedicated page is what ranks. This is how we build ${totalPages.toLocaleString()}+ page platforms.`,
    },
    {
      q: "Can you help my business show up on ChatGPT and Perplexity?",
      a: "Yes. AI search optimization (also called Generative Engine Optimization or GEO) is one of our core services. We structure your content with entity relationships, authority signals, and citation patterns that AI platforms use when formulating recommendations. When someone asks ChatGPT 'best plumber in Brooklyn' or 'recommended dentist Upper East Side,' we make sure your business is the one that gets recommended — not your competitor.",
    },
    {
      q: "What is the difference between your SEO and typical agency SEO?",
      a: "Three things. First, we build on Next.js — not WordPress — so your site scores 95+ on Core Web Vitals and loads in under 1 second. Second, we use programmatic SEO to generate hundreds of location-specific pages, each with unique content and schema. Third, we optimize for AI search platforms (ChatGPT, Perplexity, Gemini, Claude) in addition to Google — something 95% of agencies still ignore. We also offer Full Loop CRM so your leads actually get followed up on.",
    },
    {
      q: "What is Full Loop CRM and do I need it?",
      a: "Full Loop CRM is the first full-cycle CRM built for service businesses. It manages the entire journey from the first Google search to the 5-star review — organic lead generation, AI sales assistant, scheduling, GPS field operations, payments, reviews, and retargeting. One platform replaces 9+ standalone tools. It is territory-exclusive, meaning your competitors cannot use it in your area. It is optional but recommended for businesses serious about converting the leads our SEO generates.",
    },
    {
      q: "Do you offer SEO for franchise or multi-location businesses?",
      a: "Yes. Multi-location SEO is one of our specialties. Each location gets its own Google Business Profile, dedicated landing pages, localized citation strategy, separate review generation, and location-specific content. We manage campaigns for businesses with 2 to 50+ locations across the NYC metro. Each location gets a tailored strategy based on its competitive landscape and neighborhood demographics.",
    },
    {
      q: "What SEO results can I expect for my local business?",
      a: "Results vary by industry and competition, but typical outcomes include: 3-5x increase in organic traffic within 6 months, top-3 Google Maps ranking for primary service + neighborhood keywords, 40-60% increase in phone calls from organic search, and measurable AI search presence on ChatGPT and Perplexity. We provide monthly ranking reports, traffic analytics, call tracking, and lead attribution so you see exactly what your investment produces.",
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How We Build SEO Platforms for Service Businesses",
    description: "Our step-by-step process for ranking local service businesses on Google and AI search platforms.",
    step: [
      { "@type": "HowToStep", position: 1, name: "Industry & Competitor Audit", text: "We analyze your industry, audit your current rankings, research your competitors, and identify keyword opportunities specific to your service type and target neighborhoods." },
      { "@type": "HowToStep", position: 2, name: "Strategy & Roadmap", text: "We build a 90-day SEO roadmap covering keyword targets, content priorities, technical fixes, and local SEO actions. Every campaign starts with a plan." },
      { "@type": "HowToStep", position: 3, name: "Website Build or Optimization", text: "We build (or rebuild) your website on Next.js with mobile-first design, Core Web Vitals optimization, and architecture designed to scale to hundreds of pages." },
      { "@type": "HowToStep", position: 4, name: "On-Page & Technical SEO", text: "Title tags, meta descriptions, schema markup, internal linking, crawlability, and indexation management across every page." },
      { "@type": "HowToStep", position: 5, name: "Local SEO & Google Business Profile", text: "Full GBP optimization, citation building, review strategy, and geo-grid rank tracking for every neighborhood you serve." },
      { "@type": "HowToStep", position: 6, name: "Programmatic Location Pages", text: "Automated generation of optimized landing pages for every service + neighborhood combination." },
      { "@type": "HowToStep", position: 7, name: "AI Search Optimization", text: "Content structuring for ChatGPT, Perplexity, Gemini, and Claude recommendations." },
      { "@type": "HowToStep", position: 8, name: "Link Building & Content Marketing", text: "Ongoing editorial backlinks, local citations, blog content, and service page optimization." },
      { "@type": "HowToStep", position: 9, name: "Analytics & Reporting", text: "Monthly reporting on keyword rankings, traffic, leads, and ROI tied to real business outcomes." },
    ],
  };

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema).replace(/</g, '\\u003c') }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Businesses", url: "/businesses" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {totalServices} Industries &middot; {totalNeighborhoods} Neighborhoods &middot; {totalPages.toLocaleString()}+ Pages
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                We Rank{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">Every Type</span>{" "}
                of Service Business in NYC
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full-service SEO</Link>,{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>,{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>,{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic SEO</Link>, and{" "}
                <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link>{" "}
                for {totalServices} service industries across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">{totalNeighborhoods}+ neighborhoods</Link>{" "}
                in NYC, New Jersey, Long Island &amp; Westchester.{" "}
                <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Plumbers</Link>,{" "}
                <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
                <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
                <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
                <Link href="/med-spa" className="text-[#5CB8FF] hover:text-[#8DD0FF]">med spas</Link>{" "}
                — if you serve customers locally, we rank you.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{totalServices}</div>
                <div className="mt-1 text-xs text-zinc-400">Business Types</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                <div className="text-3xl font-extrabold text-white">{totalNeighborhoods}</div>
                <div className="mt-1 text-xs text-zinc-400">Neighborhoods</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{totalPages.toLocaleString()}+</div>
                <div className="mt-1 text-xs text-zinc-400">Pages Built</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                <div className="text-3xl font-extrabold text-white">6+</div>
                <div className="mt-1 text-xs text-zinc-400">Search Engines &amp; AI</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — TOP 10 INDUSTRIES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">10 Industries We Dominate</h2>
          <p className="mt-4 text-zinc-400">
            Each industry has a dedicated page breaking down our{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>,{" "}
            process, and pricing for that market. Click to see how we rank businesses in your industry.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {topIndustries.map((ind, i) => (
              <Link
                key={ind.slug}
                href={`/businesses/${ind.slug}`}
                className="group rounded-2xl border border-zinc-800 bg-[#0A0A0A] p-6 transition-all hover:border-[#0080FE]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0080FE] text-sm font-bold text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#0080FE]">{ind.name}</h3>
                    <p className="text-xs text-zinc-500">{ind.count} business types</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{ind.pitch}</p>
                <p className="mt-3 text-xs text-zinc-600">{ind.examples}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#0080FE] group-hover:text-[#5CB8FF]">
                  See full {ind.name.toLowerCase()} SEO guide &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — HOW WE DO IT
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">How We Rank Local Service Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Same methodology.{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Strategy</Link> first. Then{" "}
            <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">build</Link>. Then{" "}
            <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">optimize</Link>. Then{" "}
            <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">scale</Link>. Then{" "}
            <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">extend to AI search</Link>. Then{" "}
            <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">measure everything</Link>. Customized for every industry, every business type, every neighborhood.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { num: "01", title: "SEO Strategy & Audit", desc: "Competitor analysis, keyword research, opportunity mapping, and a 90-day roadmap tailored to your industry.", href: "/services/seo-strategy" },
              { num: "02", title: "Next.js Website Build", desc: "Fast, mobile-first, conversion-focused. Not WordPress. Scores 95+ on Core Web Vitals. Built to scale.", href: "/services/web-design-development" },
              { num: "03", title: "On-Page & Technical SEO", desc: "Title tags, schema markup (7+ types), internal linking, Core Web Vitals, crawlability, and indexation.", href: "/services/on-page-seo" },
              { num: "04", title: "Local SEO & Google Maps", desc: "GBP optimization, citations (50+ directories), review strategy, geo-grid tracking, NAP consistency.", href: "/services/local-seo" },
              { num: "05", title: "Programmatic Location Pages", desc: `${totalNeighborhoods}+ neighborhood-specific pages per business type. Each unique, each optimized, each targeting a real search.`, href: "/services/automation" },
              { num: "06", title: "Content Marketing", desc: "Service pages, blog posts, FAQ content, and industry guides targeting long-tail keywords your customers search.", href: "/services/content-marketing" },
              { num: "07", title: "AI Search Optimization", desc: "ChatGPT, Perplexity, Gemini, Claude. We structure content so AI platforms recommend you — not your competitor.", href: "/services/ai-search-optimization" },
              { num: "08", title: "Off-Page SEO & Link Building", desc: "Editorial backlinks, local citations, digital PR, brand mentions, and review management for domain authority.", href: "/services/off-page-seo" },
              { num: "09", title: "Google Business Profile", desc: "Categories, services, posts, Q&A, photos, review responses, and ongoing management for local pack visibility.", href: "/services/google-business-profile" },
              { num: "10", title: "Full Loop CRM", desc: "Lead gen to 5-star review. AI sales assistant. Territory exclusive. One platform replaces 9+ tools.", href: "/services/fullloopcrm" },
            ].map((item) => (
              <Link key={item.num} href={item.href} className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-all hover:border-[#0080FE]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0080FE] text-xs font-bold">{item.num}</span>
                  <h3 className="font-semibold text-white group-hover:text-[#0080FE]">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — THE NUMBERS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">The Numbers That Matter</h2>
          <p className="mx-auto mt-6 max-w-2xl text-zinc-300 leading-relaxed">
            Every stat here is a real number from real campaigns for NYC service businesses.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "93%", label: "of local experiences start with search" },
              { value: "42%", label: "of clicks go to the Google Local Pack" },
              { value: "76%", label: "of local searchers visit a business within 24 hours" },
              { value: "0%", label: "of clicks go to page 2" },
              { value: "433%", label: "average ROI from local SEO (12 months)" },
              { value: "3-5x", label: "traffic increase in first 6 months" },
              { value: "$15-85", label: "avg cost-per-click saved vs Google Ads" },
              { value: "50%+", label: "of search queries now go to AI platforms" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <p className="text-2xl font-extrabold text-[#0080FE]">{stat.value}</p>
                <p className="mt-2 text-xs text-zinc-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 5 — REMAINING INDUSTRIES (FOLDED IN)
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">More Industries We Rank</h2>
          <p className="mt-4 text-zinc-400">
            Beyond our top 10 industry verticals, we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
            for every type of service business. Here are 5 more industries with their full business type listings.
          </p>

          {foldedIndustries.map((catName) => {
            const catSlug = categoryToSlug(catName);
            const services = getServicesByCategorySlug(catSlug);
            const catData = categoryContent[catName];
            if (!services.length) return null;
            return (
              <div key={catName} className="mt-12 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{catName}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{services.length} business types</p>
                  </div>
                  <span className="text-3xl font-extrabold text-[#0080FE]">{services.length}</span>
                </div>

                {catData && (
                  <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                    {catData.investmentContext}
                  </p>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/${s.slug}`}
                      className="group rounded-lg border border-zinc-700 bg-[#0A0A0A] p-4 transition-colors hover:border-[#0080FE]"
                    >
                      <h4 className="font-medium text-white group-hover:text-[#0080FE]">SEO for {s.name}s</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{s.description}</p>
                    </Link>
                  ))}
                </div>

                {catData && catData.whySEOMatters.length > 0 && (
                  <div className="mt-6 rounded-xl border border-zinc-700 bg-[#0A0A0A] p-5">
                    <h4 className="text-sm font-semibold text-[#0080FE]">Why {catName} Businesses Need Local SEO</h4>
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{catData.whySEOMatters[0]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — ALL 172 BUSINESS TYPES (FULL GRID)
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">All {totalServices} Business Types We Rank</h2>
          <p className="mt-4 text-zinc-400">
            Every service business type we build{" "}
            <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content</Link>,{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>,{" "}
            <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic pages</Link>, and{" "}
            <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
            platforms for. Click any business type to see the full SEO breakdown.
          </p>

          {Object.entries(servicesByCategory).map(([category, services]) => {
            const catSlug = categoryToSlug(category);
            const hasOwnPage = topIndustries.some((t) => t.slug === catSlug);
            return (
              <div key={category} className="mt-12 first:mt-8">
                {hasOwnPage ? (
                  <Link href={`/businesses/${catSlug}`} className="text-xl font-bold text-white hover:text-[#0080FE]">
                    {category}
                    <span className="ml-2 text-sm font-normal text-zinc-500">({services.length}) &rarr;</span>
                  </Link>
                ) : (
                  <h3 className="text-xl font-bold text-white">
                    {category}
                    <span className="ml-2 text-sm font-normal text-zinc-500">({services.length})</span>
                  </h3>
                )}
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {services.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/${s.slug}`}
                      className="rounded-lg border border-zinc-800 bg-[#0A0A0A] p-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 7 — PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What SEO Costs for Your Business</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Transparent pricing. No hidden fees. Every dollar goes into strategy, content, optimization, and infrastructure that your business owns.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Monthly Retainer</h3>
              <p className="mt-2 text-3xl font-extrabold">$3,500<span className="text-base font-normal text-zinc-500">/mo</span></p>
              <p className="mt-1 text-xs text-zinc-500">Starting price</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Full-service SEO</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Local SEO &amp; GBP</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Content marketing</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> AI search optimization</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Monthly reporting</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Project-Based</h3>
              <p className="mt-2 text-3xl font-extrabold">$2,500</p>
              <p className="mt-1 text-xs text-zinc-500">Starting price</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Website builds</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> SEO audits</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> GBP optimization</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Citation building</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Programmatic pages</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Consulting</h3>
              <p className="mt-2 text-3xl font-extrabold">$150<span className="text-base font-normal text-zinc-500">/hr</span></p>
              <p className="mt-1 text-xs text-zinc-500">Starting price</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Strategy sessions</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> SEO advisory</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Vendor management</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Team training</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> No retainer required</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="inline-flex items-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]">
              Full Pricing Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — REGION COVERAGE
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">{regions.length} Regions. {totalNeighborhoods}+ Neighborhoods. Every Business Type.</h2>
          <p className="mt-4 text-zinc-400">
            We build location-specific SEO pages for every business type across every neighborhood listed below. That is{" "}
            <strong className="text-white">{totalPages.toLocaleString()}+ pages</strong> of{" "}
            <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic SEO</Link> content.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => {
              const neighborhoods = getAllNeighborhoods().filter((n) => n.region === region);
              return (
                <div key={region} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                  <h3 className="text-lg font-bold text-white">{region}</h3>
                  <p className="mt-1 text-sm text-[#0080FE]">{neighborhoods.length} neighborhoods</p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {neighborhoods.slice(0, 6).map((n) => (
                      <span key={n.slug} className="rounded-full bg-[#0A0A0A] px-2 py-0.5 text-xs text-zinc-500">{n.name}</span>
                    ))}
                    {neighborhoods.length > 6 && (
                      <span className="rounded-full px-2 py-0.5 text-xs text-zinc-600">+{neighborhoods.length - 6} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 9 — FAQ (10 QUESTIONS)
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">SEO for Local Businesses — FAQ</h2>
          <p className="mt-4 text-zinc-400">
            Everything business owners ask about SEO, local search, AI search, and what it costs to rank in NYC.
          </p>
          <div className="mt-10 space-y-4">
            {faqItems.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10 — WHAT MAKES US DIFFERENT
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why Businesses Choose The NYC SEO</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#EFF70A]">Not WordPress</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                — faster, more secure, and 2-3x better Core Web Vitals scores than any WordPress site. Your competitors are still loading plugins. You are loading in under 1 second.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#EFF70A]">AI Search Before Everyone Else</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                95% of SEO agencies still do not optimize for{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search</Link>.
                We have been building for ChatGPT, Perplexity, and Gemini since day one. When your competitors figure it out, you will already own the space.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#EFF70A]">Programmatic at Scale</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                {totalPages.toLocaleString()}+ pages is not a typo. We use{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">programmatic SEO</Link>{" "}
                to generate unique, optimized landing pages for every service + neighborhood combination. Each page has original content, proper schema, and internal linking. That is the kind of coverage no competitor can match manually.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#EFF70A]">20+ Years of Experience</h3>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                We have been doing this since before Google existed. Hundreds of businesses ranked across the NYC metro.{" "}
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">20+ years</Link>{" "}
                of strategic marketing experience means we know what works, what does not, and what is a waste of your money.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11 — DON'T SEE YOUR INDUSTRY
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Don&apos;t See Your Industry?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300 leading-relaxed">
            We build{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO and AI search platforms</Link>{" "}
            for any local service business. If you serve customers in the NYC metro area, we can rank you. Tell us what you do and we will show you exactly what we would build — and what we would not waste your money on.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center rounded-lg bg-[#0080FE] px-6 py-3 text-lg font-semibold text-white hover:bg-[#0070E0]"
            >
              Tell Us About Your Business
            </Link>
            <a
              href={`tel:${phonePlain}`}
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-lg font-semibold text-white hover:border-zinc-500"
            >
              Call {PHONE}
            </a>
            <a
              href={`sms:${phonePlain}`}
              className="inline-flex items-center rounded-lg px-6 py-3 text-lg font-semibold text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Text Us
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12 — CROSS-LINKS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-8">
            <Link href="/services" className="text-sm text-[#0080FE] hover:text-white">All Services</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/seo" className="text-sm text-[#0080FE] hover:text-white">SEO</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/local-seo" className="text-sm text-[#0080FE] hover:text-white">Local SEO</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/ai-search-optimization" className="text-sm text-[#0080FE] hover:text-white">AI Search</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/google-business-profile" className="text-sm text-[#0080FE] hover:text-white">Google Business Profile</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/automation" className="text-sm text-[#0080FE] hover:text-white">Automation</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/fullloopcrm" className="text-sm text-[#0080FE] hover:text-white">Full Loop CRM</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/areas" className="text-sm text-[#0080FE] hover:text-white">All Areas</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/pricing" className="text-sm text-[#0080FE] hover:text-white">Pricing</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/partnership-request-form" className="text-sm text-[#0080FE] hover:text-white">Contact</Link>
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
