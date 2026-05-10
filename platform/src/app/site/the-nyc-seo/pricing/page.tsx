// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "SEO Pricing Guide 2026 | What SEO Actually Costs",
  description:
    "The complete guide to SEO pricing in 2026. Learn what SEO costs, pricing models, red flags, ROI calculations, and what NYC agencies actually charge. No fluff.",
  keywords: [
    "SEO pricing",
    "SEO cost",
    "how much does SEO cost",
    "SEO pricing guide",
    "SEO agency pricing",
    "monthly SEO cost",
    "SEO retainer pricing",
    "SEO pricing NYC",
    "SEO pricing models",
    "affordable SEO services",
    "SEO investment",
    "SEO ROI",
    "SEO cost per month",
    "what does SEO cost",
    "SEO consulting rates",
  ],
  openGraph: {
    title: "SEO Pricing Guide 2026 | What SEO Actually Costs",
    description:
      "The complete guide to SEO pricing. Learn what SEO costs, pricing models, red flags, and ROI calculations. By The NYC SEO.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/pricing` },
};

/* ──────────────────────────────────────────────────────────── */
/*  FAQ DATA                                                    */
/* ──────────────────────────────────────────────────────────── */
const faqs = [
  {
    q: "How much does SEO cost per month in 2026?",
    a: "SEO costs anywhere from $500 to $25,000+ per month depending on scope, competition, and geography. Nationally, the average is $1,500 to $5,000 per month for a small business. In competitive metro areas like NYC, quality SEO typically starts at $3,000 to $5,000 per month and can exceed $15,000 per month for multi-location campaigns targeting high-value keywords. Agencies charging under $1,000 per month are almost always cutting corners — outsourcing to overseas content farms, using automated link schemes, or delivering templated work that does not move the needle.",
  },
  {
    q: "What is the difference between cheap SEO and premium SEO?",
    a: "Cheap SEO ($300-$1,000/mo) typically involves templated audits, spun content, low-quality directory links, and minimal reporting. Premium SEO ($3,500+/mo) involves custom keyword research, hand-written content optimized for both traditional and AI search engines, editorial-quality backlinks, full technical optimization, schema markup, and transparent reporting with lead attribution. The difference is not just quality — it is whether the work actually generates revenue. Cheap SEO wastes money slowly. Premium SEO is an investment that compounds.",
  },
  {
    q: "Is SEO worth it for small businesses?",
    a: "Yes, but only if you work with someone who understands your market. A plumber in NYC paying $3,500 per month for SEO can realistically generate 50-200+ organic leads per month within 6-12 months. If their average job is worth $500-$2,000, the ROI is massive — often 5x to 20x the investment. The key is targeting the right keywords, building the right content, and optimizing for both Google and AI search platforms. SEO compounds: the longer you invest, the cheaper your cost per lead becomes.",
  },
  {
    q: "Why is NYC SEO more expensive than other markets?",
    a: "Three reasons. First, competition: every market in NYC is saturated with funded competitors, national brands, and aggregator sites (Yelp, Angi, Thumbtack) that dominate page one. Ranking requires significantly more content, more backlinks, and more technical sophistication. Second, keyword value: NYC service keywords have some of the highest CPCs in the country — $35 to $150+ per click on Google Ads. The organic equivalent of that traffic has enormous value. Third, labor costs: quality content writers, developers, and strategists in the NYC market command higher rates.",
  },
  {
    q: "What is a monthly SEO retainer?",
    a: "A monthly SEO retainer is an ongoing engagement where you pay a fixed monthly fee for a defined scope of SEO work. This typically includes keyword research, on-page optimization, content creation, link building, technical SEO maintenance, schema markup, and monthly reporting. Retainers work best because SEO is not a one-time project — it requires sustained effort over months to build rankings, and those rankings need ongoing maintenance to hold. Most agencies structure retainers in tiers based on the number of services, locations, and keywords included.",
  },
  {
    q: "What is project-based SEO pricing?",
    a: "Project-based SEO pricing covers one-time deliverables with a clear scope and timeline. Examples include a comprehensive SEO audit ($2,500-$7,500), a website migration with SEO preservation ($7,500-$35,000), or a programmatic SEO build generating hundreds or thousands of optimized pages ($10,000-$35,000). Project-based pricing works well when you need a specific outcome rather than ongoing management. Many businesses start with a project (like an audit or website build) and then transition to a monthly retainer for ongoing optimization.",
  },
  {
    q: "What is performance-based SEO pricing?",
    a: "Performance-based SEO pricing ties agency compensation to results — usually rankings, traffic, or leads. While this sounds attractive, it comes with significant risks. Agencies may chase easy, low-value keywords to hit targets, use black-hat techniques for short-term gains, or define 'performance' in ways that do not align with your business goals. Most reputable agencies avoid pure performance-based models because quality SEO takes 3-6 months to show results, and the best strategies prioritize long-term sustainable growth over quick wins that may not last.",
  },
  {
    q: "How long before SEO starts generating leads?",
    a: "Most businesses see measurable ranking improvements within 60-90 days and meaningful lead generation within 4-6 months. Highly competitive NYC markets (personal injury law, HVAC, plumbing) may take 6-12 months for top-3 positions. The timeline depends on your current domain authority, competition level, website quality, and how aggressively you invest. SEO is a compounding investment — month 12 generates significantly more leads than month 3, and by month 18-24, your cost per lead is typically a fraction of what it was at the start.",
  },
  {
    q: "How do I calculate the ROI of SEO?",
    a: "SEO ROI = (Revenue from organic leads - SEO investment) / SEO investment × 100. To calculate this, you need three numbers: your monthly organic traffic, your conversion rate, and your average customer value. For example, if SEO generates 100 leads per month, you close 20%, and each customer is worth $1,000, that is $20,000 in monthly revenue. If you are paying $7,500 per month for SEO, your ROI is 167%. The key metric to track is cost per lead from organic search versus cost per lead from paid channels.",
  },
  {
    q: "Should I do SEO myself or hire an agency?",
    a: "If you have time to learn and your market is not highly competitive, DIY SEO can work for basic optimization — claiming your Google Business Profile, writing blog posts, fixing obvious technical issues. But for competitive markets like NYC, you need the expertise, tools, and time investment that only an experienced agency provides. The real question is opportunity cost: every hour you spend learning SEO is an hour not spent running your business. Most business owners generate more revenue by focusing on their craft and letting specialists handle the marketing.",
  },
  {
    q: "What should an SEO proposal include?",
    a: "A legitimate SEO proposal should include: a summary of your current visibility and rankings, a competitive analysis showing who ranks for your target keywords, a keyword strategy with search volume and difficulty data, a detailed scope of work (exactly what will be done each month), clear deliverables and timelines, pricing with no hidden fees, reporting methodology, and case studies or references from similar businesses. If a proposal is vague about what you are paying for, that is a red flag.",
  },
  {
    q: "What are red flags in SEO pricing?",
    a: "Major red flags include: guaranteed first-page rankings (no one can guarantee this), pricing under $500 per month for competitive markets, long-term contracts with no performance benchmarks, vague deliverables ('we will optimize your site'), proprietary tools or platforms you cannot access, no reporting or transparency into what work is being done, and agencies that cannot show case studies from businesses similar to yours. Also be wary of agencies that own your website or domain — you should always retain full ownership of your digital assets.",
  },
  {
    q: "Is SEO better than Google Ads?",
    a: "They serve different purposes. Google Ads delivers immediate traffic but stops the moment you stop paying — and NYC service keywords cost $35-$150+ per click. SEO takes longer to build but generates free organic traffic that compounds over time. At $7,500 per month in SEO, most businesses generate 200-500+ organic leads within 12 months at a cost per lead of $15-$37, compared to $150-$400 per lead on Google Ads. The best strategy is usually SEO as the foundation with targeted ads for immediate lead flow while rankings build.",
  },
  {
    q: "What is the difference between local SEO and national SEO?",
    a: "Local SEO targets customers in a specific geographic area — optimizing for 'plumber in Brooklyn' or 'dentist near Times Square.' It focuses on Google Business Profile, local citations, review management, and location-specific content. National SEO targets broader, non-geographic keywords — 'best CRM software' or 'how to choose a plumber.' Local SEO is generally less expensive ($2,000-$7,500/mo) because the competitive landscape is smaller. National SEO campaigns can cost $10,000-$50,000+/mo because you are competing against the entire country.",
  },
  {
    q: "Do you offer contracts or month-to-month?",
    a: "We offer month-to-month engagements with no long-term contracts. We believe the work should speak for itself. If we are generating results, you stay. If we are not, you leave. That said, SEO is a 6-12 month investment — the compounding nature of organic search means results accelerate over time. Clients who commit to 12+ months consistently see the best ROI because rankings build on each other. We provide monthly reporting so you can see exactly what work was done and what results it generated.",
  },
  {
    q: "What is included in your $3,500/month Foundation plan?",
    a: "The Foundation plan includes: a comprehensive SEO audit and keyword strategy, on-page optimization for up to 50 pages, full technical SEO and Core Web Vitals optimization, local citation building across 50+ directories, Google Business Profile optimization, schema markup with 5+ JSON-LD types per page, monthly reporting with lead attribution, and hosting on our Next.js infrastructure. This plan is designed for single-location service businesses targeting one borough or region in NYC.",
  },
  {
    q: "What makes your SEO agency different from others in NYC?",
    a: "Three things. First, we build on Next.js — not WordPress. Our sites load in under one second, score perfect Core Web Vitals, and are engineered from the ground up for search engine performance. Second, we optimize for AI search platforms (ChatGPT, Perplexity, Gemini, Claude) alongside Google and Bing — most agencies have not even started thinking about this. Third, we own Full Loop CRM, which means our clients get a fully integrated lead-to-revenue pipeline that no other agency can offer. Plus 20+ years of experience and hundreds of businesses ranked.",
  },
];

/* ──────────────────────────────────────────────────────────── */
/*  SCHEMA DATA                                                 */
/* ──────────────────────────────────────────────────────────── */
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
  sameAs: ["https://www.consortiumnyc.com", "https://www.fullloopcrm.com"],
  parentOrganization: {
    "@type": "Organization",
    name: "Consortium NYC",
    url: "https://www.consortiumnyc.com",
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
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
  geo: {
    "@type": "GeoCoordinates",
    latitude: 40.759,
    longitude: -73.9845,
  },
  priceRange: "$3,500 - $15,000+/mo",
  areaServed: {
    "@type": "City",
    name: "New York",
  },
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
  name: "SEO Services",
  description:
    "Comprehensive SEO services including on-page, off-page, technical, local, and AI search optimization for NYC service businesses.",
  provider: {
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
  },
  areaServed: {
    "@type": "City",
    name: "New York",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "SEO Pricing Plans",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Foundation SEO Plan",
        price: "3500",
        priceCurrency: "USD",
        description: "Monthly SEO retainer for single-location businesses.",
      },
      {
        "@type": "Offer",
        name: "Growth SEO Plan",
        price: "7500",
        priceCurrency: "USD",
        description: "Monthly SEO retainer for multi-service, multi-borough businesses.",
      },
      {
        "@type": "Offer",
        name: "Domination SEO Plan",
        price: "15000",
        priceCurrency: "USD",
        description: "Premium monthly SEO retainer for full-market domination.",
      },
    ],
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Evaluate SEO Pricing and Choose the Right Agency",
  description:
    "A step-by-step guide to understanding SEO costs, evaluating proposals, and choosing the right SEO agency for your business.",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Understand Your Market Competition",
      text: "Research how competitive your industry and location are. More competition means higher SEO investment required. Check who ranks for your target keywords and assess their domain authority.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Learn the SEO Pricing Models",
      text: "Understand the four main pricing models: monthly retainer, project-based, hourly consulting, and performance-based. Each has pros and cons depending on your business needs.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Calculate Your Potential ROI",
      text: "Estimate your organic traffic potential, conversion rate, and average customer value. Compare the projected revenue against the monthly SEO investment to calculate expected ROI.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Request and Compare Proposals",
      text: "Get proposals from 3-5 agencies. Compare scope of work, deliverables, reporting methodology, and case studies. Look for transparency and specificity — avoid vague proposals.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Check for Red Flags",
      text: "Avoid agencies that guarantee rankings, charge under $500/month for competitive markets, require long-term contracts without performance benchmarks, or are vague about deliverables.",
    },
    {
      "@type": "HowToStep",
      position: 6,
      name: "Start and Measure",
      text: "Begin with a clear scope and timeline. Track keyword rankings, organic traffic, lead volume, and cost per lead monthly. Expect measurable improvements within 60-90 days and meaningful ROI within 6-12 months.",
    },
  ],
};

const faqPageSchema = {
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
    name: "The NYC SEO",
    url: SITE_URL,
  },
  author: {
    "@type": "Person",
    name: "David R.",
  },
  reviewRating: {
    "@type": "Rating",
    ratingValue: "5",
    bestRating: "5",
  },
  reviewBody:
    "Transparent pricing, zero fluff, and they actually explain what they are doing and why. We went from invisible on Google to generating 200+ leads per month within 8 months. The ROI is undeniable.",
};

const breadcrumbItems = [{ name: "Pricing", url: "/pricing" }];

/* ──────────────────────────────────────────────────────────── */
/*  PAGE COMPONENT                                              */
/* ──────────────────────────────────────────────────────────── */
export default function PricingPage() {
  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                The Complete Guide to SEO Pricing in 2026
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                What Does SEO
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Actually Cost?
                </span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                If you have ever Googled &ldquo;how much does SEO cost,&rdquo; you know the answer is frustrating: it depends. This guide cuts through the noise. We will break down every{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO pricing</Link> model, explain what you are actually paying for, show you how to calculate your ROI, and give you the exact red flags that separate legitimate agencies from ones that will waste your money. Written by an agency with 20+ years of experience and hundreds of{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC businesses</Link> ranked.
              </p>
              <CTAGroup variant="hero" />
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-8">
              <h2 className="text-lg font-semibold text-[#0080FE]">SEO Pricing at a Glance (2026)</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">National average (small business)</span>
                  <span className="font-semibold">$1,500 - $5,000/mo</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">NYC / competitive metros</span>
                  <span className="font-semibold">$3,000 - $15,000+/mo</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Enterprise / national SEO</span>
                  <span className="font-semibold">$10,000 - $50,000+/mo</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Hourly consulting</span>
                  <span className="font-semibold">$100 - $500/hr</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Project-based (one-time)</span>
                  <span className="font-semibold">$2,500 - $50,000+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Average ROI (12 months)</span>
                  <span className="font-semibold text-green-400">5x - 20x investment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — WHAT SEO ACTUALLY COSTS (INDUSTRY OVERVIEW)
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What SEO Costs in 2026: The Real Numbers</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            SEO pricing varies dramatically based on four factors: the competitiveness of your market, your geographic area, the scope of work required, and the experience level of the agency or consultant you hire. Understanding these factors is the first step to making an informed investment.
          </p>

          <h3 className="mt-10 text-xl font-semibold">National SEO Pricing Benchmarks</h3>
          <p className="mt-4 text-zinc-300 leading-relaxed">
            Across the United States, small businesses typically pay between $1,500 and $5,000 per month for professional{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO services</Link>. This range covers keyword research, on-page optimization, basic content creation, and monthly reporting. At the lower end, you are getting minimal work — perhaps a few pages optimized and a handful of blog posts per month. At the higher end, you are getting a more comprehensive approach that includes{" "}
            <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page optimization</Link>,{" "}
            <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">link building</Link>, and{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">technical SEO</Link>.
          </p>
          <p className="mt-4 text-zinc-300 leading-relaxed">
            Freelancers and solo consultants typically charge $75 to $200 per hour, which translates to $1,000 to $3,000 per month for part-time work. Mid-tier agencies charge $3,000 to $10,000 per month. Premium agencies with established track records charge $10,000 to $50,000+ per month for enterprise or highly competitive campaigns.
          </p>

          <h3 className="mt-10 text-xl font-semibold">Why NYC SEO Costs More</h3>
          <p className="mt-4 text-zinc-300 leading-relaxed">
            If you are a{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service business in New York City</Link>, your SEO investment will be at the higher end of these ranges. Here is why:
          </p>
          <ul className="mt-4 space-y-3 text-zinc-300">
            <li className="flex gap-3">
              <span className="mt-1 shrink-0 text-[#0080FE]">&#9679;</span>
              <span><strong className="text-white">Competition density.</strong> Every market in NYC has dozens or hundreds of competitors fighting for the same keywords. A{" "}
              <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber in Manhattan</Link> is competing against national aggregators (Yelp, Angi, Thumbtack, HomeAdvisor), funded startups, and other agencies&apos; clients — all for the same ten blue links on page one.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 shrink-0 text-[#0080FE]">&#9679;</span>
              <span><strong className="text-white">Keyword value.</strong> NYC service keywords have some of the highest CPCs in the country. &ldquo;Emergency plumber NYC&rdquo; costs $65-$85 per click on Google Ads. &ldquo;Personal injury lawyer Manhattan&rdquo; exceeds $150 per click. The organic equivalent of that traffic has enormous monetary value, which is exactly why it takes more effort and expertise to earn it.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 shrink-0 text-[#0080FE]">&#9679;</span>
              <span><strong className="text-white">Multi-borough complexity.</strong> NYC is not one market — it is dozens. A{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn electrician</Link> needs to rank in Brooklyn, but also in specific neighborhoods like Williamsburg, Park Slope, and Bed-Stuy. This multiplies the content, the{" "}
              <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link> optimization, and the technical infrastructure required.</span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 shrink-0 text-[#0080FE]">&#9679;</span>
              <span><strong className="text-white">AI search is changing the game.</strong> In 2026, a growing percentage of searches happen through{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI platforms like ChatGPT, Perplexity, and Gemini</Link>. Optimizing for these platforms requires structured data, entity optimization, and content strategies that most agencies have not even started thinking about.</span>
            </li>
          </ul>

          <h3 className="mt-10 text-xl font-semibold">What Affects Your SEO Price</h3>
          <p className="mt-4 text-zinc-300 leading-relaxed">
            Beyond geography and competition, your specific SEO cost depends on:
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Number of services", detail: "More services = more pages, more keywords, more content" },
              { label: "Number of locations", detail: "Multi-location businesses need localized content for each area" },
              { label: "Current website condition", detail: "A site with technical debt requires more upfront work" },
              { label: "Content gap", detail: "If competitors have 200 pages and you have 10, there is catching up to do" },
              { label: "Domain age and authority", detail: "New domains take longer to build trust with search engines" },
              { label: "Industry regulations", detail: "Healthcare, legal, and finance require YMYL-compliant content" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-4">
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — THE 5 SEO PRICING MODELS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">The 5 SEO Pricing Models Explained</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Not every agency prices the same way. Understanding the different models helps you evaluate proposals and find the right fit for your business. Here are the five most common pricing structures for{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO services</Link>.
          </p>

          {/* Model 1 */}
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">1</span>
              <h3 className="text-xl font-semibold">Monthly Retainer</h3>
            </div>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              The most common and generally most effective model. You pay a fixed monthly fee for an agreed-upon scope of work. The agency handles{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">strategy</Link>, execution, and reporting on an ongoing basis. Retainers work because SEO is not a one-time project — it requires sustained effort over months, and the compounding nature of organic search means results accelerate over time.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-green-400">Pros</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10003; Predictable monthly cost</li>
                  <li>&#10003; Ongoing optimization and maintenance</li>
                  <li>&#10003; Results compound over time</li>
                  <li>&#10003; Dedicated team knows your business</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-400">Cons</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10007; Requires 6-12 month commitment for real ROI</li>
                  <li>&#10007; Can feel slow in the first 90 days</li>
                  <li>&#10007; Hard to evaluate agencies before committing</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#0080FE]">Typical range: $1,500 - $25,000+/month</p>
          </div>

          {/* Model 2 */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">2</span>
              <h3 className="text-xl font-semibold">Project-Based</h3>
            </div>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              One-time engagements with a defined scope and deliverable. Common project types include SEO audits, website migrations, programmatic{" "}
              <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO builds</Link>,{" "}
              <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website design</Link>, and{" "}
              <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link> projects. Project-based pricing works well when you need a specific outcome rather than ongoing management.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-green-400">Pros</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10003; Clear deliverables and timeline</li>
                  <li>&#10003; No ongoing commitment</li>
                  <li>&#10003; Good for specific needs</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-400">Cons</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10007; No ongoing optimization</li>
                  <li>&#10007; Results can decay without maintenance</li>
                  <li>&#10007; Often leads to a retainer anyway</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#0080FE]">Typical range: $2,500 - $50,000+</p>
          </div>

          {/* Model 3 */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">3</span>
              <h3 className="text-xl font-semibold">Hourly Consulting</h3>
            </div>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              Pay for expertise by the hour. Useful for ad-hoc{" "}
              <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing consulting</Link>, strategy sessions, team training, or supplementing an in-house marketing team with specialized expertise. Rates vary widely based on the consultant&apos;s experience and the complexity of the work.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-green-400">Pros</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10003; Pay only for what you need</li>
                  <li>&#10003; Flexible and scalable</li>
                  <li>&#10003; Access to senior expertise</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-400">Cons</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10007; Can get expensive quickly</li>
                  <li>&#10007; No continuity or momentum</li>
                  <li>&#10007; You manage the execution</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#0080FE]">Typical range: $100 - $500/hour</p>
          </div>

          {/* Model 4 */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">4</span>
              <h3 className="text-xl font-semibold">Performance-Based</h3>
            </div>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              The agency ties compensation to results — rankings achieved, traffic generated, or leads delivered. While this sounds attractive on paper, it comes with significant risks. Agencies may chase easy, low-value keywords to hit targets, use aggressive techniques that risk penalties, or define &ldquo;performance&rdquo; in ways that do not align with your business goals.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-green-400">Pros</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10003; Low upfront risk</li>
                  <li>&#10003; Agency is incentivized to deliver</li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-400">Cons</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>&#10007; Incentivizes short-term tactics</li>
                  <li>&#10007; Risky keyword targeting</li>
                  <li>&#10007; Misaligned goals common</li>
                  <li>&#10007; Most reputable agencies avoid this</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-sm text-[#0080FE]">Typical range: Varies widely (often base + bonus)</p>
          </div>

          {/* Model 5 */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">5</span>
              <h3 className="text-xl font-semibold">Hybrid (Retainer + Performance)</h3>
            </div>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              A base retainer covers ongoing work with a performance bonus tied to specific milestones. This is the most balanced model — the agency has stability to do quality work, and the business gets upside tied to measurable results. Not all agencies offer this structure, but it is worth asking about.
            </p>
            <p className="mt-4 text-sm text-[#0080FE]">Typical range: $2,000 - $10,000/mo base + performance bonus</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — WHAT YOU'RE PAYING FOR
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What You Are Actually Paying For</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            When an agency quotes you $5,000 per month, where does that money go? Understanding the components of SEO work helps you evaluate whether a proposal is fair, comprehensive, and worth the investment. Here is the breakdown of what a quality{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO campaign</Link> includes.
          </p>

          <div className="mt-10 space-y-6">
            {[
              {
                title: "Technical SEO & Site Health",
                pct: "15-20%",
                desc: "Crawlability, indexation, site speed optimization, Core Web Vitals, mobile responsiveness, XML sitemaps, robots.txt, structured data, canonical tags, and redirect management. This is the foundation — if the technical infrastructure is broken, nothing else works.",
                link: "/services/search-engine-optimization",
                linkText: "technical SEO",
              },
              {
                title: "Keyword Research & Strategy",
                pct: "10-15%",
                desc: "Identifying every keyword your potential customers use to find your services. Mapping those keywords to specific pages. Analyzing competition, search volume, intent, and difficulty. Building a content roadmap that targets the highest-value opportunities first.",
                link: "/services/seo-strategy",
                linkText: "SEO strategy",
              },
              {
                title: "On-Page Optimization",
                pct: "15-20%",
                desc: "Title tags, meta descriptions, heading structure, content optimization, internal linking architecture, image optimization, and schema markup. Every page on your site needs to be individually optimized for its target keywords and search intent.",
                link: "/services/on-page-seo",
                linkText: "on-page SEO",
              },
              {
                title: "Content Creation",
                pct: "20-30%",
                desc: "Service pages, location pages, blog articles, FAQ content, comparison guides, and case studies. Content is the fuel that drives organic traffic. Quality content requires research, writing, editing, optimization, and publishing — and it needs to be done consistently.",
                link: "/services/content-marketing",
                linkText: "content marketing",
              },
              {
                title: "Off-Page SEO & Link Building",
                pct: "15-25%",
                desc: "Earning backlinks from authoritative websites, building local citations, managing online reviews, and building brand mentions across the web. Backlinks remain one of the strongest ranking signals — and the hardest to earn.",
                link: "/services/off-page-seo",
                linkText: "link building",
              },
              {
                title: "Reporting & Analytics",
                pct: "5-10%",
                desc: "Monthly reporting on keyword rankings, organic traffic, lead volume, conversion rates, and cost per lead. Tracking ROI so you can see exactly how your investment is performing and make data-driven decisions.",
                link: "/services/analytics-reporting",
                linkText: "analytics and reporting",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <span className="shrink-0 rounded-full bg-[#0080FE]/20 px-3 py-1 text-xs font-semibold text-[#0080FE]">{item.pct} of budget</span>
                </div>
                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                  {item.desc}{" "}
                  <Link href={item.link} className="text-[#5CB8FF] hover:text-[#8DD0FF]">Learn more about {item.linkText} &rarr;</Link>
                </p>
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
          SECTION 5 — RED FLAGS IN SEO PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Red Flags: When SEO Pricing Is Too Good to Be True</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            The SEO industry has a trust problem. For every legitimate agency doing real work, there are dozens of operations running scams, delivering low-quality work, or promising results they cannot deliver. Here are the red flags to watch for when evaluating SEO proposals.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {[
              {
                flag: "Guaranteed #1 Rankings",
                why: "No one can guarantee specific rankings. Google's algorithm uses 200+ signals and changes constantly. Any agency promising guaranteed positions is either lying or planning to target keywords no one searches for.",
              },
              {
                flag: "Under $500/Month for Competitive Markets",
                why: "Quality SEO requires real human expertise — strategy, writing, technical work, outreach. At $500/month, the math doesn't work. You are getting outsourced, templated, or automated work that won't move the needle.",
              },
              {
                flag: "Long-Term Contracts Required Upfront",
                why: "Reputable agencies earn your business every month. If someone needs to lock you into a 12-month contract before showing any results, ask yourself why they're not confident enough to work month-to-month.",
              },
              {
                flag: "Vague Deliverables",
                why: "'We will optimize your website' tells you nothing. Demand specifics: how many pages optimized, how many links built, how many articles written, what reporting will look like. If they can't be specific, walk away.",
              },
              {
                flag: "They Own Your Website or Content",
                why: "Some agencies build your site on proprietary platforms or retain ownership of content they create. If you leave, you lose everything. You should always own your domain, your website code, your content, and your data.",
              },
              {
                flag: "No Reporting or Transparency",
                why: "If an agency can't show you exactly what work they did each month and what results it generated, you have no way to evaluate whether your investment is working. Demand monthly reporting with clear metrics.",
              },
              {
                flag: "They Cannot Show Case Studies",
                why: "Any agency with real experience should be able to show you examples of businesses they have ranked — ideally in your industry or a similar one. No case studies means no track record.",
              },
              {
                flag: "Buying Links or Using PBNs",
                why: "Paid link schemes and private blog networks are violations of Google's guidelines. They may produce short-term gains but inevitably lead to penalties that can devastate your organic traffic for months or years.",
              },
            ].map((item) => (
              <div key={item.flag} className="rounded-xl border border-red-900/30 bg-[#141414] p-6">
                <h3 className="font-semibold text-red-400">{item.flag}</h3>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — HOW TO EVALUATE AN SEO PROPOSAL
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">How to Evaluate an SEO Proposal</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Whether you are evaluating our proposal or comparing us against other agencies, here is exactly what a legitimate SEO proposal should include. Use this checklist to separate serious agencies from operations that will waste your money.
          </p>

          <ol className="mt-8 space-y-6">
            {[
              { step: "Current State Assessment", desc: "A summary of your current rankings, organic traffic, technical health, and competitive position. If an agency proposes a plan without first understanding where you are, they are guessing." },
              { step: "Competitive Analysis", desc: "Who ranks for your target keywords? What are they doing that you are not? How strong is their domain authority? A good proposal shows you exactly who you are competing against and what it will take to outrank them." },
              { step: "Keyword Strategy with Data", desc: "Specific keywords with search volume, difficulty scores, and intent classification. Not vague promises — real data showing exactly what you are targeting and why." },
              { step: "Detailed Scope of Work", desc: "Exactly what will be done each month: number of pages optimized, articles written, links built, technical fixes implemented. Monthly deliverables should be specific and measurable." },
              { step: "Timeline and Milestones", desc: "When will you see first improvements? When should you expect meaningful lead generation? A realistic timeline shows the agency understands how SEO works — not that they are just telling you what you want to hear." },
              { step: "Transparent Pricing", desc: "No hidden fees, no surprise charges, no markup on third-party tools. You should know exactly what you are paying and where that money goes." },
              { step: "Reporting Methodology", desc: "How will results be measured and reported? What metrics will be tracked? How often will you receive reports? What tools are used for tracking?" },
              { step: "Case Studies and References", desc: "Real examples of businesses the agency has ranked, ideally in your industry or a similar competitive market. If they cannot show proof, they do not have it." },
            ].map((item, i) => (
              <li key={item.step} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-white">{item.step}</h3>
                  <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================================================
          SECTION 7 — HOW TO CALCULATE SEO ROI
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">How to Calculate Your SEO ROI</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            The most important question about SEO pricing is not &ldquo;how much does it cost?&rdquo; — it is &ldquo;what will I get back?&rdquo; Here is how to calculate the return on your SEO investment.
          </p>

          <div className="mt-10 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <h3 className="text-lg font-semibold text-[#0080FE]">The SEO ROI Formula</h3>
            <div className="mt-6 rounded-xl bg-[#0A0A0A] p-6 text-center">
              <p className="text-lg text-zinc-400">Monthly organic leads × Close rate × Average customer value</p>
              <div className="my-3 text-3xl font-bold text-white">=</div>
              <p className="text-lg text-zinc-400">Monthly revenue from SEO</p>
              <div className="my-3 text-3xl font-bold text-white">&minus;</div>
              <p className="text-lg text-zinc-400">Monthly SEO investment</p>
              <div className="my-3 text-3xl font-bold text-white">=</div>
              <p className="text-2xl font-bold text-green-400">Monthly SEO profit</p>
            </div>
          </div>

          <h3 className="mt-10 text-xl font-semibold">Real Example: NYC Plumber</h3>
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-[#141414] p-8">
            <div className="space-y-3 text-sm text-zinc-300">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span>Monthly SEO investment</span>
                <span className="font-semibold text-white">$7,500</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span>Monthly organic leads (after 12 months)</span>
                <span className="font-semibold text-white">250</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span>Close rate</span>
                <span className="font-semibold text-white">20%</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span>Average job value</span>
                <span className="font-semibold text-white">$800</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span>Monthly revenue from organic leads</span>
                <span className="font-semibold text-green-400">$40,000</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span>Monthly profit after SEO cost</span>
                <span className="font-semibold text-green-400">$32,500</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-semibold text-white">Annual ROI</span>
                <span className="text-xl font-bold text-green-400">433%</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-zinc-300 leading-relaxed">
            And this is conservative. SEO compounds — month 18 generates more leads than month 12, and by year two your cost per lead drops significantly because the infrastructure you built keeps working. Compare that to Google Ads, where every lead stops the moment you stop paying.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — SEO vs GOOGLE ADS
          ============================================================ */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            SEO vs Google Ads: The Math
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-blue-100">
            Both have their place, but the economics tell a clear story over time.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-8 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">Google Ads</h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-100">
                <li>$5,000/month average ad spend (NYC service keywords)</li>
                <li>$60,000/year in clicks</li>
                <li>$35 - $85 cost per click</li>
                <li>Leads stop the moment you stop paying</li>
                <li>Competitors can outbid you tomorrow</li>
                <li>$0 in equity built</li>
              </ul>
              <p className="mt-6 text-3xl font-bold text-white">$60,000/year</p>
              <p className="text-sm text-blue-200">and nothing to show for it when you stop</p>
            </div>
            <div className="rounded-xl bg-white/10 p-8 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">SEO Investment</h3>
              <ul className="mt-4 space-y-3 text-sm text-blue-100">
                <li>$7,500/month SEO investment</li>
                <li>$90,000/year total</li>
                <li>$0 cost per click — organic traffic is free</li>
                <li>Leads keep coming and compounding</li>
                <li>Rankings get stronger every month</li>
                <li>You own the platform and the traffic forever</li>
              </ul>
              <p className="mt-6 text-3xl font-bold text-white">$90,000/year</p>
              <p className="text-sm text-blue-200">and an asset that appreciates in value</p>
            </div>
          </div>
          <p className="mt-10 text-center text-lg text-blue-100">
            At $7,500/month our clients typically generate <strong className="text-white">200-500+ organic leads/month</strong> within 12 months.
            That is a cost per lead of <strong className="text-white">$15-$37</strong> — compared to <strong className="text-white">$150-$400</strong> on Google Ads.
            And it gets cheaper every month as rankings compound.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 9 — OUR MONTHLY RETAINER PLANS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">Our Pricing</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Monthly SEO & Marketing Retainers</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Now that you understand what SEO costs and what to look for, here is what we charge — and exactly what you get.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {/* Foundation */}
            <div className="rounded-2xl border border-zinc-700 bg-[#363636] p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0080FE]">Foundation</h3>
              <p className="mt-4 text-4xl font-bold">
                $3,500<span className="text-lg font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                For single-location{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service businesses</Link>{" "}
                targeting one borough or region. The essential SEO foundation.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Full SEO audit &amp; keyword strategy</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">On-page optimization</Link> (up to 50 pages)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Technical SEO</Link> &amp; Core Web Vitals</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Local citation building (50+ directories)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link> optimization</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Schema markup (5+ types per page)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Monthly reporting with lead attribution</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Hosting included</li>
              </ul>
              <Link
                href="/partnership-request-form"
                className="mt-8 block w-full rounded-lg border border-zinc-600 py-3 text-center text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
              >
                Get Started
              </Link>
            </div>

            {/* Growth */}
            <div className="rounded-2xl border-2 border-[#0080FE] bg-[#363636] p-8 ring-1 ring-[#0080FE]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0080FE]">Growth</h3>
                <span className="rounded-full bg-[#0080FE]/20 px-3 py-1 text-xs font-semibold text-[#0080FE]">Most Popular</span>
              </div>
              <p className="mt-4 text-4xl font-bold">
                $7,500<span className="text-lg font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                For multi-service businesses targeting multiple boroughs or the full NYC metro. This is where the real scale happens.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Everything in Foundation, plus:</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Programmatic SEO</Link> (up to 1,000 pages)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Off-page link building</Link> (15+ links/mo)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link> (GEO)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Content creation</Link> (4 articles/month)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Competitor monitoring &amp; gap analysis</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> 7+ schema types per page</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Bi-weekly strategy calls</li>
              </ul>
              <Link
                href="/partnership-request-form"
                className="mt-8 block w-full rounded-lg bg-[#0080FE] py-3 text-center text-sm font-semibold text-white hover:bg-[#0070E0]"
              >
                Get Started
              </Link>
            </div>

            {/* Domination */}
            <div className="rounded-2xl border border-zinc-700 bg-[#363636] p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#EFF70A]">Domination</h3>
              <p className="mt-4 text-4xl font-bold">
                $15,000+<span className="text-lg font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                For businesses that want to own their entire market — every keyword, every neighborhood, every search engine, every AI platform.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Everything in Growth, plus:</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Unlimited programmatic pages</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Aggressive link building (30+ links/mo)</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Full <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js website</Link> build or migration</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI agent development</Link> &amp; integration</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Multi-location &amp; multi-state targeting</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Dedicated account strategist</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Weekly strategy calls</li>
              </ul>
              <Link
                href="/partnership-request-form"
                className="mt-8 block w-full rounded-lg border border-zinc-600 py-3 text-center text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
              >
                Talk to Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10 — SERVICE-SPECIFIC PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Service-Specific Pricing</h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Need a specific service without a full retainer? Every service below can be purchased standalone or bundled into a custom plan.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { service: "SEO Services", range: "$3,500 - $15,000+/mo", href: "/services/seo", desc: "On-page, off-page, technical, and local SEO. Full campaign management." },
              { service: "AI Search Optimization", range: "$2,500 - $8,000/mo", href: "/services/ai-search-optimization", desc: "GEO/AEO — get recommended by ChatGPT, Perplexity, Gemini, and Claude." },
              { service: "Content Marketing", range: "$2,000 - $7,500/mo", href: "/services/content-marketing", desc: "SEO-optimized articles, service pages, location pages, and FAQ content." },
              { service: "Google Business Profile", range: "$1,000 - $2,500/mo", href: "/services/google-business-profile", desc: "GBP optimization, review strategy, posts, and local pack dominance." },
              { service: "Marketing Manager", range: "$5,000 - $10,000/mo", href: "/services/marketing-manager", desc: "Fractional marketing leadership. Strategy, execution, and team management." },
              { service: "Marketing Consulting", range: "$350 - $500/hr", href: "/services/marketing-consulting", desc: "CMO-level strategic advisory. Growth planning, positioning, and market analysis." },
              { service: "Analytics & Reporting", range: "$1,500 - $5,000/mo", href: "/services/analytics-reporting", desc: "Keyword tracking, traffic analysis, lead attribution, and AI search monitoring." },
              { service: "Automation & Programmatic", range: "$5,000 - $25,000", href: "/services/automation", desc: "Project-based. Programmatic page generation, automated linking, dynamic schema." },
              { service: "Full Loop CRM", range: "$25,000/yr", href: "/services/fullloopcrm", desc: "Territory-exclusive. Lead gen to reviews. Replaces 9+ tools. One platform." },
            ].map((item) => (
              <Link
                key={item.service}
                href={item.href}
                className="rounded-2xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-white">{item.service}</h3>
                <p className="mt-1 text-lg font-bold text-[#0080FE]">{item.range}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 11 — PROJECT-BASED PRICING
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Project-Based Pricing</h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            One-time projects with clear deliverables and timelines. No ongoing commitment required.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { project: "Next.js Website Build", range: "$10,000 - $50,000+", desc: "Custom Next.js website engineered to rank. Mobile-first. Sub-1-second loads. Schema markup. Programmatic page generation." },
              { project: "WordPress to Next.js Migration", range: "$7,500 - $35,000", desc: "Full migration with URL mapping, redirect strategy, content transfer, and SEO preservation. Zero ranking loss." },
              { project: "Branding & Identity", range: "$5,000 - $15,000", desc: "Logo, visual identity, brand voice, positioning, and brand guidelines. Designed for trust and recognition." },
              { project: "SEO Audit (Standalone)", range: "$2,500 - $7,500", desc: "Comprehensive audit — technical, on-page, off-page, content gaps, competitor analysis, and AI search visibility." },
              { project: "AI Agent Development", range: "$7,500 - $30,000+", desc: "Custom AI chatbot or voice agent. Lead qualification, appointment booking, FAQ handling. Built on your data." },
              { project: "Programmatic SEO Build", range: "$10,000 - $35,000", desc: "Hundreds to thousands of optimized pages generated from your service + location data. Each unique, each optimized." },
            ].map((item) => (
              <div key={item.project} className="rounded-2xl border border-zinc-700 bg-[#141414] p-6">
                <h3 className="font-semibold text-white">{item.project}</h3>
                <p className="mt-1 text-lg font-bold text-[#0080FE]">{item.range}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12 — HOURLY CONSULTING RATES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Hourly Consulting Rates</h2>
          <p className="mt-4 text-zinc-400">
            Need ad-hoc expertise without a monthly commitment? Book hours as you need them.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { tier: "Implementation", rate: "$150/hr", desc: "Content writing, citation building, GBP management, basic on-page optimization." },
              { tier: "Specialist", rate: "$250/hr", desc: "Technical SEO, link building strategy, AI search optimization, Next.js development." },
              { tier: "Strategist", rate: "$350/hr", desc: "SEO strategy, marketing consulting, competitive analysis, campaign architecture." },
              { tier: "Executive Advisory", rate: "$500/hr", desc: "CMO-level consulting. Multi-channel strategy, business growth planning, market positioning." },
            ].map((item) => (
              <div key={item.tier} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5">
                <div>
                  <h3 className="font-semibold text-white">{item.tier}</h3>
                  <p className="mt-1 text-sm text-zinc-400">{item.desc}</p>
                </div>
                <p className="shrink-0 pl-6 text-xl font-bold text-[#0080FE]">{item.rate}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 13 — WHAT EVERY ENGAGEMENT INCLUDES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What Every Engagement Includes</h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            No matter which plan or service you choose, you get the foundation that makes everything work.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Next.js — Not WordPress", desc: "Every site we build runs on Next.js. Sub-1-second loads. Perfect Core Web Vitals. Zero plugin bloat. This is why our sites outrank WordPress." },
              { title: "Multi-Engine SEO", desc: "Optimized for Google, Bing, Yahoo, and DuckDuckGo simultaneously. Your competitors only target Google — we target all of them." },
              { title: "AI Search Optimization", desc: "Structured for ChatGPT, Perplexity, Gemini, and Claude. AI search is the fastest growing discovery channel in 2026." },
              { title: "Full Schema Markup", desc: "7+ JSON-LD schema types on every page — LocalBusiness, Service, FAQPage, Review, AggregateRating, BreadcrumbList, HowTo." },
              { title: "You Own Everything", desc: "Your website, your content, your data, your domains. If you ever leave, everything goes with you. No lock-in." },
              { title: "20+ Years of Proof", desc: "We have been ranking businesses since before Google existed. Consortium NYC. Hundreds of businesses ranked across the NYC metro." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 14 — FULL LOOP CRM CALLOUT
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0080FE]">By Consortium NYC</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Full Loop CRM — $25,000/year</h2>
            <p className="mt-4 text-zinc-300 leading-relaxed">
              The first full-cycle CRM for home service businesses. Organic lead generation,{" "}
              <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI sales assistant</Link>, scheduling, GPS field operations, payments, reviews, and retargeting — one platform replaces 9+ tools. Territory-exclusive: one provider per trade per metro. Customizable for any business. Built on the same stack as The NYC SEO.
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/services/fullloopcrm"
                className="inline-flex items-center justify-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]"
              >
                Learn About Full Loop CRM &rarr;
              </Link>
              <a
                href="https://fullloopcrm.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-600 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-400 hover:bg-white/5"
              >
                Visit fullloopcrm.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 15 — TESTIMONIAL
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <blockquote className="rounded-2xl border border-zinc-800 bg-[#141414] p-8 sm:p-12">
            <div className="flex gap-1 text-[#EFF70A]">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mt-6 text-lg italic leading-relaxed text-zinc-300">
              &ldquo;Transparent pricing, zero fluff, and they actually explain what they are doing and why. We went from invisible on Google to generating 200+ leads per month within 8 months. The ROI is undeniable. Every dollar is accounted for in their monthly reports.&rdquo;
            </p>
            <footer className="mt-6">
              <p className="font-semibold text-white">David R.</p>
              <p className="text-sm text-zinc-500">NYC Service Business Owner</p>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 16 — FAQ
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About SEO Pricing</h2>
          <p className="mt-4 text-zinc-400">
            Everything business owners ask about SEO costs, answered honestly.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
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
