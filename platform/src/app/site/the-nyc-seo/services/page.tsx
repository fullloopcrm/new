import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "SEO & Digital Marketing Services NYC",
  description:
    "18 SEO and digital marketing services for NYC businesses. Strategy, on-page, off-page, local SEO, AI search, web design, branding, automation, and Full Loop CRM.",
  openGraph: {
    title: "SEO & Digital Marketing Services NYC",
    description:
      "18 SEO and digital marketing services for NYC service businesses. Strategy to execution. Built by Consortium NYC.",
    url: `${SITE_URL}/services`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services` },
};

const serviceGroups = [
  {
    category: "SEO",
    services: [
      {
        number: "01",
        title: "SEO Services",
        slug: "/services/seo",
        description:
          "Full-service SEO for NYC service businesses. On-page, off-page, technical, local, and AI search optimization under one roof. The pillar that holds everything together.",
        details: ["On-page & off-page SEO", "Technical SEO & Core Web Vitals", "Local SEO & Google Maps", "AI search optimization"],
      },
      {
        number: "02",
        title: "SEO Strategy",
        slug: "/services/seo-strategy",
        description:
          "Every campaign starts with a plan. We audit your current rankings, analyze competitors in your market, research high-intent keywords, and build a roadmap that turns organic traffic into booked jobs.",
        details: ["Competitor gap analysis", "Long-tail keyword research", "Local search opportunity mapping", "90-day SEO roadmap"],
      },
      {
        number: "03",
        title: "On-Page SEO",
        slug: "/services/on-page-seo",
        description:
          "Title tags, meta descriptions, heading structure, content optimization, internal linking, schema markup, and image optimization — every element on your pages engineered to rank.",
        details: ["Title & meta optimization", "Schema markup (7+ types)", "Internal linking architecture", "Content optimization"],
      },
      {
        number: "04",
        title: "Off-Page SEO & Link Building",
        slug: "/services/off-page-seo",
        description:
          "Earned backlinks from authoritative sources, local citation building, digital PR, brand mentions, and review management. The external signals that tell Google you are the authority.",
        details: ["Editorial backlink acquisition", "Local citation building", "Digital PR & brand mentions", "Review management strategy"],
      },
      {
        number: "05",
        title: "Technical SEO",
        slug: "/services/search-engine-optimization",
        description:
          "Site speed, Core Web Vitals, crawlability, indexation, XML sitemaps, robots.txt, canonical tags, and redirect management. The foundation your content ranks on.",
        details: ["Core Web Vitals optimization", "Crawlability & indexation", "Next.js performance tuning", "Multi-engine optimization"],
      },
      {
        number: "06",
        title: "Local SEO",
        slug: "/services/local-seo",
        description:
          "Dominate the Google Map Pack and local search results. Google Business Profile optimization, local citations, neighborhood-targeted content, and review strategy for every borough.",
        details: ["Google Maps ranking", "Local Pack optimization", "Citation building (50+ directories)", "Neighborhood-level targeting"],
      },
      {
        number: "07",
        title: "Google Business Profile",
        slug: "/services/google-business-profile",
        description:
          "Your GBP is the first thing customers see in local search and Maps. We optimize every field, build review strategies, post updates, and convert searchers into callers.",
        details: ["GBP setup & optimization", "Review generation strategy", "Google Maps ranking", "Local pack visibility"],
      },
      {
        number: "08",
        title: "Content Marketing",
        slug: "/services/content-marketing",
        description:
          "Content that ranks and converts — not filler blog posts nobody reads. Service pages, location pages, FAQ content, and long-form articles targeting keywords your customers search.",
        details: ["SEO-optimized service pages", "Location-targeted landing pages", "Long-tail keyword content", "FAQ & knowledge base content"],
      },
    ],
  },
  {
    category: "AI",
    services: [
      {
        number: "09",
        title: "AI Search Optimization (GEO)",
        slug: "/services/ai-search-optimization",
        description:
          "AI search is the fastest growing discovery channel in 2026. We make sure ChatGPT, Perplexity, Gemini, and Claude recommend your business — not your competitor.",
        details: ["ChatGPT, Perplexity, Gemini & Claude", "Structured data for AI crawlers", "Answer Engine Optimization (AEO)", "AI citation & recommendation strategy"],
      },
      {
        number: "10",
        title: "AI Agent Development",
        slug: "/services/ai-agent-development",
        description:
          "Custom AI agents that work 24/7 — answering questions, qualifying leads, booking appointments, and handling intake before you pick up the phone.",
        details: ["Custom AI chatbots & voice agents", "Lead qualification automation", "Appointment booking integration", "Knowledge base from your SEO data"],
      },
      {
        number: "11",
        title: "AI Content Generation",
        slug: "/services/ai-content-generation",
        description:
          "AI-generated pages at scale — each targeting a real service + location keyword, each with unique content, proper schema, and natural language. This is how we build 54,000+ page platforms.",
        details: ["AI-generated service & location pages", "Natural language content at scale", "Automated schema & structured data", "Human-reviewed quality assurance"],
      },
    ],
  },
  {
    category: "Marketing",
    services: [
      {
        number: "12",
        title: "Marketing Consulting",
        slug: "/services/marketing-consulting",
        description:
          "CMO-level strategic advisory for service businesses. Channel selection, budget allocation, competitive positioning, and growth planning from someone who has done it for 20+ years.",
        details: ["Growth strategy & planning", "Channel selection & budget allocation", "Competitive positioning", "Marketing team advisory"],
      },
      {
        number: "13",
        title: "Fractional Marketing Manager",
        slug: "/services/marketing-manager",
        description:
          "Part-time marketing leadership without the full-time salary. Strategy, execution, vendor management, and team oversight — the marketing department you need but cannot justify hiring yet.",
        details: ["Part-time marketing leadership", "Vendor & agency management", "Campaign strategy & execution", "Marketing team oversight"],
      },
      {
        number: "14",
        title: "Analytics & Reporting",
        slug: "/services/analytics-reporting",
        description:
          "See exactly where traffic comes from, which pages rank, what keywords drive calls, and how your SEO investment performs. Real data tied to real business outcomes.",
        details: ["Google Analytics & Search Console", "AI search traffic tracking", "Keyword ranking dashboards", "Call & lead attribution"],
      },
    ],
  },
  {
    category: "Design & Build",
    services: [
      {
        number: "15",
        title: "Web Design & Development",
        slug: "/services/web-design-development",
        description:
          "Fast, mobile-first websites on Next.js engineered to rank. Every page designed for conversion — from homepage to your 500th programmatic landing page. No WordPress. No templates.",
        details: ["Next.js / React development", "Mobile-first responsive design", "Programmatic SEO page generation", "Core Web Vitals optimization"],
      },
      {
        number: "16",
        title: "Branding",
        slug: "/services/branding",
        description:
          "Your brand is how customers remember you when choosing between three Google results. We build identities that look professional, feel trustworthy, and stand out in crowded markets.",
        details: ["Logo & visual identity", "Brand voice & messaging", "Competitive positioning", "Trust signal design"],
      },
      {
        number: "17",
        title: "Automation",
        slug: "/services/automation",
        description:
          "Automate the repetitive parts of SEO so campaigns scale without burning hours. Programmatic page generation, automated internal linking, dynamic schema, and sitemap management.",
        details: ["Programmatic page generation", "Automated internal linking", "Dynamic structured data", "Sitemap & indexing automation"],
      },
    ],
  },
  {
    category: "CRM",
    services: [
      {
        number: "18",
        title: "Full Loop CRM",
        slug: "/services/fullloopcrm",
        description:
          "The first full-cycle CRM for service businesses. Organic lead generation, AI sales assistant, scheduling, GPS field ops, payments, reviews, and retargeting — one platform replaces 9+ tools. Territory exclusive. Customizable for any business.",
        details: ["Lead gen to 5-star review pipeline", "AI sales assistant (Selenas)", "Territory-exclusive licensing", "Replaces 9+ standalone tools"],
      },
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Services", url: "/services" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">18 Services &middot; One Platform</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              SEO &amp; AI Search Optimization
              <br /><span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">for Local Service Businesses</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
              From{" "}<Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">strategy</Link> and{" "}<Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link> to{" "}<Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web design</Link>,{" "}<Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">technical SEO</Link>,{" "}<Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>, and{" "}<Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agents</Link> &mdash; everything a{" "}<Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service business</Link> needs to dominate organic search and AI search in NYC, New Jersey, Long Island &amp; Westchester.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* Services by Category */}
      {serviceGroups.map((group) => (
        <section
          key={group.category}
          className={`py-20 ${
            group.category === "SEO" || group.category === "Design & Build"
              ? "bg-[#2A2A2A]"
              : group.category === "AI" || group.category === "CRM"
              ? "bg-[#0A0A0A]"
              : "bg-[#141414]"
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0080FE]">{group.category}</p>
            <div className="mt-6 space-y-6">
              {group.services.map((service) => (
                <div
                  key={service.number}
                  id={service.title.toLowerCase().replace(/[\s&()]+/g, "-")}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#141414]"
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0080FE] text-sm font-bold text-white">
                        {service.number}
                      </span>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-white sm:text-2xl">{service.title}</h2>
                        <p className="mt-3 text-zinc-400 leading-relaxed">{service.description}</p>
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                          {service.details.map((detail) => (
                            <li key={detail} className="flex items-center gap-2 text-sm text-zinc-300">
                              <span className="text-green-400">&#10003;</span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                        <Link href={service.slug} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#0080FE] hover:text-[#5CB8FF]">
                          Learn more <span aria-hidden="true">&rarr;</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Mid CTA */}
      <CTAGroup variant="mid" />

      {/* How It All Works Together */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Every Service Works Together</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300 leading-relaxed">
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Strategy</Link> informs{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>. SEO feeds{" "}
            <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search</Link>. AI search drives leads.{" "}
            <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agents</Link> close them.{" "}
            <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link> manages the entire journey.{" "}
            <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Analytics</Link> tracks everything. One integrated platform, not 18 disconnected tools.
          </p>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Transparent Pricing. No Hidden Fees.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400 leading-relaxed">
              Monthly retainers from $3,500/mo. Project-based from $2,500. Hourly consulting from $150/hr. Every dollar goes into strategy, content, optimization, and infrastructure that you own.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]"
            >
              View Pricing Guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Pre-FAQ CTA */}
      <CTAGroup variant="preFaq" />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
