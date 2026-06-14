// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "Marketing Consulting Services NYC",
  description:
    "Marketing consulting for NYC service businesses. Strategic advisory, channel selection, budget allocation, and growth planning. $250-$500/hr. 20+ years.",
  keywords: [
    "marketing consulting NYC",
    "marketing consultant New York City",
    "marketing strategy consulting NYC",
    "CMO consulting services",
    "fractional CMO NYC",
    "marketing advisory services New York",
    "small business marketing consultant NYC",
    "strategic marketing consulting",
    "marketing consulting for service businesses",
    "NYC marketing strategist",
    "marketing consultant near me",
    "growth marketing consulting NYC",
    "digital marketing consultant New York",
  ],
  openGraph: {
    title: "Marketing Consulting Services NYC",
    description:
      "Marketing consulting for NYC service businesses. Strategic advisory, channel selection, budget allocation, and growth planning. 20+ years.",
    url: `${SITE_URL}/services/marketing-consulting`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services/marketing-consulting` },
};

const faqs = [
  {
    q: "What does a marketing consultant actually do for my business?",
    a: "A marketing consultant provides CMO-level strategic oversight without the CMO salary. We analyze your current marketing efforts, identify gaps and opportunities, develop a comprehensive multi-channel strategy, and create an actionable roadmap that aligns marketing spend with revenue goals. For NYC service businesses, this means auditing your SEO, paid advertising, social media, referral systems, reputation management, and lead nurturing workflows — then prioritizing the channels that will generate the highest return for your specific market, service area, and competitive landscape. We do not execute random tactics. We build a strategic framework that makes every marketing dollar work harder.",
  },
  {
    q: "How much does marketing consulting cost in NYC?",
    a: "Our marketing consulting engagements start at $350 per hour for focused strategy sessions and go up to $500 per hour for executive-level advisory that includes ongoing implementation oversight. Monthly retainers range from $5,000 to $10,000 per month depending on scope, meeting frequency, and the complexity of your marketing ecosystem. For businesses that need a full marketing overhaul, our Foundation tier starts at $3,500 per month, Growth at $7,500 per month, and Domination at $15,000+ per month — these include marketing strategy plus execution across SEO, content, paid media, and automation. Every dollar goes into strategy and results — not overhead, not junior account managers, not bloated reporting decks.",
  },
  {
    q: "What is the difference between a marketing consultant and a marketing agency?",
    a: "A marketing agency executes tactics — they run your ads, post your social content, send your emails. A marketing consultant provides strategic direction — we determine which tactics to pursue, how to allocate your budget, what channels to prioritize, and how to measure success. Think of it as the difference between a pilot and an air traffic controller. Most service businesses do not need more execution — they need better strategy. We often work alongside your existing agency or in-house team, providing the strategic oversight that ensures every marketing dollar is spent on the right channel at the right time targeting the right audience.",
  },
  {
    q: "How is marketing consulting different from hiring a fractional CMO?",
    a: "In practice, our marketing consulting engagements function as fractional CMO relationships. You get CMO-level strategic thinking, market analysis, competitive intelligence, and growth planning without the $250,000 to $400,000 annual salary that a full-time CMO commands. The difference is flexibility — our consulting engagements can scale from a few hours per month to a full strategic partnership, and you are not locked into a long-term employment contract. For most NYC service businesses generating $1 million to $20 million in revenue, a fractional CMO through consulting delivers significantly more value per dollar than a full-time hire.",
  },
  {
    q: "What industries do you specialize in for marketing consulting?",
    a: "We specialize exclusively in local service businesses across the NYC metro area — plumbers, electricians, HVAC contractors, roofers, general contractors, personal injury lawyers, dentists, therapists, cleaning services, landscapers, salons, and over 150 additional service categories. We do not consult for e-commerce brands, SaaS companies, or national retail chains. Our deep specialization in service businesses means we understand the lead generation dynamics, seasonal patterns, competitive landscapes, and customer acquisition costs that are unique to your industry. Generic marketing consultants give generic advice. We give advice built on 20+ years of service business marketing data.",
  },
  {
    q: "How long does a marketing consulting engagement typically last?",
    a: "Our initial strategy engagements typically run 90 days — enough time to audit your current marketing, develop a comprehensive strategy, create an implementation roadmap, and begin measuring results. Many clients continue with ongoing monthly retainers for continuous strategic oversight, performance monitoring, and strategy adjustment. Marketing is not a one-time project — the competitive landscape shifts, channels evolve, and your business grows. The businesses that win are the ones that invest in continuous strategic refinement. That said, we do not lock you into long-term contracts. If we are not delivering value, you can walk away at any time.",
  },
  {
    q: "Do you help with implementation or just strategy?",
    a: "We provide both. Our core offering is strategic consulting — the thinking, planning, and decision-making that determines where your marketing dollars go. But we also offer implementation support across every channel we recommend. If your strategy calls for SEO, we have a dedicated SEO team. If it calls for a website rebuild, we build on Next.js. If it calls for automation, we build it with our proprietary CRM platform Full Loop CRM. If it calls for content, we create it. The advantage of working with us over a pure strategy consultancy is that we can execute every recommendation we make. No handoffs. No translation losses. No waiting for a third-party vendor to interpret our strategy document.",
  },
  {
    q: "What marketing channels do you typically recommend for NYC service businesses?",
    a: "For most NYC service businesses, the highest-ROI channel mix is SEO plus Google Business Profile plus reputation management plus a referral system. These four channels capture customers at the moment of intent — when they are actively searching for your service. Beyond that, the channel mix depends on your specific business. High-ticket services like legal and dental benefit from content marketing and paid search. Home services benefit from local SEO and programmatic page generation. Recurring services benefit from email nurturing and automation. We never recommend a channel because it is trendy — we recommend it because the data shows it will generate positive ROI for your specific business.",
  },
  {
    q: "How do you measure the success of a marketing consulting engagement?",
    a: "We measure success the same way you do — revenue. Specifically, we track qualified leads per month, cost per lead by channel, lead-to-customer conversion rate, customer acquisition cost, customer lifetime value, and marketing ROI by channel. We also track leading indicators like keyword rankings, organic traffic, Google Business Profile visibility, review velocity, and brand mention growth. Every metric ties back to one question: is your marketing generating more revenue this month than last month at a sustainable cost per acquisition? If the answer is not yes, we adjust strategy until it is.",
  },
  {
    q: "Can you audit my current marketing and tell me what is working?",
    a: "Yes — every engagement starts with a comprehensive marketing audit. We analyze your website performance, SEO health, paid advertising efficiency, social media ROI, email marketing metrics, review profile, Google Business Profile optimization, competitive positioning, and lead attribution data. The audit typically takes 15 to 20 hours and results in a detailed report that identifies what is generating ROI, what is wasting money, what opportunities you are missing, and what your competitors are doing that you are not. This audit becomes the foundation of your entire marketing strategy. Many businesses discover they are spending 30% to 50% of their marketing budget on channels that generate zero measurable return.",
  },
  {
    q: "What makes The NYC SEO different from other marketing consultants?",
    a: "Three things differentiate us. First, we own the technology — we build on Next.js, deploy on Vercel, use Supabase for data, and built our own CRM (Full Loop CRM). When we recommend a technical solution, we build it ourselves instead of outsourcing to a third party. Second, we specialize exclusively in NYC service businesses. We do not consult for tech startups or national brands — we know the NYC service market because we have been working in it for over 20 years. Third, we are results-driven to the point of obsession. We do not produce 50-page strategy documents that sit in a drawer. We produce actionable roadmaps, execute them, measure the results, and adjust. Every recommendation we make is backed by data and tied to revenue.",
  },
  {
    q: "Do I need marketing consulting if I already have an SEO agency?",
    a: "An SEO agency optimizes your search visibility. A marketing consultant ensures your entire marketing ecosystem works together. SEO is one channel — an important one, but still one channel. If your SEO is driving traffic but your website does not convert, your phone system drops calls, your review profile is weak, or your follow-up process loses leads, you are leaving money on the table. Marketing consulting provides the strategic layer that sits above individual channel execution and ensures every piece of your marketing machine works together to generate and close leads. Many of our consulting clients already have SEO agencies — they hire us to make sure the whole system is optimized, not just one piece.",
  },
  {
    q: "How do you handle businesses that have tried marketing consultants before with no results?",
    a: "Most marketing consultants fail service businesses for one of three reasons: they lack industry specialization, they deliver strategy without execution capability, or they measure vanity metrics instead of revenue. We solve all three. We specialize in NYC service businesses — no generalists, no guessing. We execute everything we recommend — no handoffs, no translation losses. And we measure leads and revenue — not impressions, not engagement rates, not brand awareness scores. If your previous consultant gave you a 50-page PDF and disappeared, you did not get consulting — you got a document. We provide ongoing strategic partnership with measurable outcomes.",
  },
  {
    q: "Can you help me figure out my marketing budget?",
    a: "Budget allocation is one of the most important deliverables in our consulting engagements. We analyze your revenue goals, customer acquisition costs, customer lifetime value, and competitive landscape to determine the optimal marketing investment level. For most NYC service businesses, marketing spend should be 7% to 15% of target revenue — but how you allocate that budget across channels is what determines your ROI. We build a channel-by-channel budget model that projects expected leads, cost per lead, and revenue return for every dollar spent. This eliminates the guesswork that causes most businesses to overspend on low-performing channels and underspend on high-performing ones.",
  },
  {
    q: "What happens during the first 30 days of a consulting engagement?",
    a: "The first 30 days are dedicated to discovery and audit. We conduct a deep-dive into your business — revenue goals, service offerings, target areas, competitive landscape, current marketing channels, lead flow, conversion process, and customer journey. We audit every active marketing channel for performance and ROI. We analyze your top 5 competitors to identify gaps and opportunities. We review your technology stack, CRM, phone system, and lead management process. By day 30, you have a comprehensive marketing audit, a prioritized list of opportunities, and a 90-day strategic roadmap with specific actions, timelines, and projected outcomes. No fluff. No theory. Just a clear plan to generate more revenue.",
  },
  {
    q: "Do you offer one-time strategy sessions or only ongoing retainers?",
    a: "We offer both. One-time strategy sessions are $350 to $500 per hour and are ideal for businesses that need focused advice on a specific challenge — launching a new service, entering a new market, evaluating a marketing vendor, or troubleshooting a specific channel. Ongoing retainers at $5,000 to $10,000 per month provide continuous strategic oversight, monthly performance reviews, quarterly strategy updates, and on-demand advisory access. Most clients start with a one-time audit or strategy session, see the value, and transition to an ongoing retainer. We do not pressure anyone into long-term commitments — the results do the selling.",
  },
];

export default function MarketingConsultingPage() {
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
    name: "The NYC SEO — Marketing Consulting Services",
    url: `${SITE_URL}/services/marketing-consulting`,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    priceRange: "$5,000 - $15,000/mo",
    description:
      "CMO-level marketing consulting for local service businesses in NYC, NJ, Long Island, and Westchester. Multi-channel strategy, growth planning, competitive analysis, market positioning, budget optimization, and KPI frameworks.",
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
    name: "Marketing Consulting Services",
    description:
      "Comprehensive marketing consulting services including multi-channel strategy development, competitive analysis, market positioning, growth planning, budget allocation, and KPI framework creation for service businesses in the NYC metro area.",
    url: `${SITE_URL}/services/marketing-consulting`,
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
      name: "Marketing Consulting Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Growth Strategy Development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Competitive Market Analysis" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Channel Optimization & Budget Allocation" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Brand Positioning & Messaging" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Marketing Audit & Performance Review" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "KPI Framework & Reporting Setup" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fractional CMO Advisory" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Lead Generation Strategy" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Marketing Technology Stack Advisory" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Customer Journey Mapping" } },
      ],
    },
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How Our Marketing Consulting Process Works",
    description: "Our proven 6-step marketing consulting process for growing NYC service businesses through strategic, data-driven marketing.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Discovery & Business Analysis",
        text: "We start with a deep-dive into your business — revenue goals, service offerings, target demographics, competitive landscape, current marketing channels, lead flow, and customer journey. We interview your team, analyze your data, and develop a complete picture of where you are and where you need to go.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Comprehensive Marketing Audit",
        text: "We audit every active marketing channel — SEO, paid advertising, social media, email, reputation management, referral systems, and offline marketing. We analyze performance data, identify what is generating ROI, what is wasting money, and what opportunities you are missing entirely.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Strategy Development",
        text: "Based on audit findings and business goals, we develop a comprehensive multi-channel marketing strategy. This includes channel prioritization, budget allocation, messaging framework, competitive positioning, and a detailed 90-day implementation roadmap with specific actions and projected outcomes.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Implementation Roadmap",
        text: "We create a prioritized, week-by-week implementation plan that your team or our team can execute. Every action item has a clear owner, deadline, expected outcome, and measurement criteria. No vague recommendations — specific, actionable tasks organized by impact and urgency.",
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Execution Support",
        text: "We do not hand you a strategy document and disappear. We provide hands-on execution support — overseeing implementation, troubleshooting issues, managing vendors, and ensuring every element of the strategy is executed correctly. If you need us to execute directly, we have in-house teams for SEO, web development, content, and automation.",
      },
      {
        "@type": "HowToStep",
        position: 6,
        name: "Performance Review & Optimization",
        text: "Every 30 days, we review performance data against projections. We analyze what is working, what needs adjustment, and what new opportunities have emerged. We update strategy, reallocate budget, and refine tactics based on real data — not assumptions. Marketing strategy is a living document that evolves with your business.",
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
      name: "The NYC SEO — Marketing Consulting Services",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    author: { "@type": "Person", name: "Michael T." },
    reviewBody:
      "We were spending $12,000 a month on marketing across five different channels and had no idea what was working. The NYC SEO audited everything, cut two channels that were generating zero leads, doubled down on SEO and Google Business Profile, and within 6 months our cost per lead dropped by 60% while lead volume increased by 40%. The strategic clarity alone was worth ten times the consulting fee.",
  };

  const breadcrumbItems = [
    { name: "Services", url: "/services" },
    { name: "Marketing Consulting", url: "/services/marketing-consulting" },
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
                NYC Marketing Consultants &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Marketing Consulting
                <br />
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  CMO-Level Strategy Without the CMO Salary
                </span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Strategic marketing consulting for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
                in New York City, New Jersey, Long Island, and Westchester. Multi-channel growth strategy, competitive analysis, market positioning, budget optimization, and{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">KPI frameworks</Link>{" "}
                — backed by 20+ years of{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web development</Link>, and{" "}
                <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing automation</Link>{" "}
                experience. We do not sell theory. We build strategic roadmaps that generate qualified leads and measurable revenue growth — month after month, quarter after quarter.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Right — Feature Checklist */}
            <div className="space-y-4">
              {[
                "Multi-channel growth strategy development",
                "Competitive market analysis & positioning",
                "Marketing budget optimization & allocation",
                "KPI framework & performance dashboards",
                "Fractional CMO advisory & oversight",
                "Channel-by-channel ROI analysis",
                "Customer journey mapping & conversion optimization",
                "Quarterly strategy reviews with actionable roadmaps",
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
          SECTION 2: WHAT IS MARKETING CONSULTING
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What Is Marketing Consulting and Why Does Your NYC Business Need It?
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              Marketing consulting is CMO-level strategic advisory for businesses that need expert guidance on where to invest their marketing dollars, which channels to prioritize, how to position their brand in a competitive market, and how to build a lead generation system that produces consistent, predictable revenue growth. It is the difference between throwing money at tactics and building a machine that compounds results over time. For{" "}
              <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC service businesses</Link>{" "}
              — <Link href="/plumber" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/electrician" className="text-[#5CB8FF] hover:text-[#8DD0FF]">electricians</Link>,{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/dentist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>,{" "}
              <Link href="/general-contractor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">contractors</Link>,{" "}
              <Link href="/house-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">cleaning services</Link>{" "}
              — the marketing landscape in 2026 is more complex than ever. You are competing across Google organic search, Google Maps, paid search, AI search platforms like ChatGPT and Perplexity, social media, review sites, referral networks, and email. Each channel has its own rules, its own costs, and its own ROI profile.
            </p>
            <p>
              Most service business owners are not marketing experts — nor should they be. You are an expert at your trade. But without strategic marketing direction, you end up in one of two traps: either you spend too little on marketing and grow too slowly, or you spend too much on the wrong channels and wonder why revenue is flat despite a five-figure monthly marketing budget. A marketing consultant eliminates this uncertainty by providing the strategic clarity that turns marketing spend into a predictable growth engine.
            </p>
            <p>
              The NYC metro area is one of the most competitive service markets in the country. A{" "}
              <Link href="/plumber/manhattan" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumber in Manhattan</Link>{" "}
              competes against hundreds of other plumbers for the same customers. A{" "}
              <Link href="/personal-injury-lawyer/brooklyn" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury lawyer in Brooklyn</Link>{" "}
              faces some of the highest cost-per-click rates in the country. A{" "}
              <Link href="/dentist/queens" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentist in Queens</Link>{" "}
              needs to stand out in a market saturated with options. In this environment, random marketing does not work. You need a strategic framework that identifies the channels, messages, and positioning that will differentiate your business and generate the highest return on every marketing dollar invested.
            </p>
            <p>
              That is exactly what we provide. Our marketing consulting engagements deliver the same caliber of strategic thinking you would get from a $300,000-per-year Chief Marketing Officer — at a fraction of the cost, with the flexibility to scale up or down as your business evolves. We analyze your market, audit your current efforts, develop a comprehensive multi-channel strategy, create an actionable implementation roadmap, and provide ongoing oversight to ensure every element executes as planned. We have been doing this for NYC service businesses for over 20 years through our parent company{" "}
              <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>{" "}
              — and the strategic frameworks we build are backed by real data, real results, and real revenue growth.
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
            Our 6-Step Marketing Consulting Process
          </h2>
          <p className="mt-4 text-zinc-400">
            Every consulting engagement follows the same proven framework — adapted to your market, your competition, your budget, and your growth goals.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Discovery & Business Analysis",
                body: "Every engagement starts with a deep-dive into your business. We analyze your revenue history, service mix, customer demographics, geographic coverage, seasonal patterns, competitive positioning, and growth targets. We interview your team to understand your sales process, lead flow, close rates, and customer lifetime value. We review your current marketing stack — every platform, every vendor, every channel. This is not a surface-level intake call. We spend 10 to 15 hours in discovery because getting the diagnosis right is the most important step in the entire process. A wrong diagnosis leads to a wrong strategy, and a wrong strategy wastes money.",
              },
              {
                step: "02",
                title: "Comprehensive Marketing Audit",
                body: "We audit every active marketing channel against industry benchmarks and your specific competitive landscape. SEO performance — keyword rankings, organic traffic trends, technical health, content gaps. Paid advertising — cost per click, cost per lead, conversion rates, return on ad spend. Social media — engagement rates, lead attribution, ROI analysis. Reputation — review volume, average rating, response strategy, competitive comparison. Email and nurturing — open rates, click rates, lead re-engagement performance. We also audit what you are not doing — the channels your competitors use that you do not, the keywords they rank for that you miss, the audiences they target that you overlook. The audit typically reveals 5 to 10 immediate opportunities that most businesses miss entirely.",
              },
              {
                step: "03",
                title: "Strategy Development",
                body: "Based on audit findings and business goals, we build a comprehensive multi-channel marketing strategy. This includes channel prioritization (which 2-3 channels will deliver the highest ROI for your specific business), budget allocation (how much to invest in each channel and why), messaging framework (what to say, to whom, and when), competitive positioning (how to differentiate your business in a crowded market), and a customer acquisition model (projected leads, conversion rates, and revenue by channel). The strategy is specific, measurable, and tied directly to your revenue goals. We do not produce vague recommendations like 'invest in SEO' — we produce specific plans like 'invest $4,000/month in SEO targeting 35 service-location keywords with projected 120 additional monthly leads within 6 months.'",
              },
              {
                step: "04",
                title: "Implementation Roadmap",
                body: "Strategy without execution is a wish list. We create a week-by-week implementation roadmap for the first 90 days that specifies every action item, every owner, every deadline, and every expected outcome. The roadmap is organized by priority — high-impact, quick-win items first, followed by longer-term strategic initiatives. If your strategy calls for a new website, the roadmap includes design, development, content creation, and launch timelines. If it calls for SEO, the roadmap includes audit completion, technical fixes, content calendar, and link building schedule. Every element has a clear metric for success so you know if execution is on track.",
              },
              {
                step: "05",
                title: "Execution Support & Oversight",
                body: "We do not hand you a strategy document and disappear — that is the consulting model that gives consulting a bad name. We provide hands-on execution support throughout the implementation phase. This means weekly check-ins with your team or vendors, quality control on deliverables, troubleshooting when things do not go as planned, and strategic adjustments as real-world data comes in. If you need us to execute directly, we have in-house capabilities for SEO, web development on Next.js, content creation, marketing automation through Full Loop CRM, and AI search optimization. The advantage of working with a consulting firm that can also execute is that there are no translation losses between strategy and implementation.",
              },
              {
                step: "06",
                title: "Performance Review & Continuous Optimization",
                body: "Every 30 days, we conduct a performance review that compares actual results against strategic projections. We analyze lead volume by channel, cost per lead, conversion rates, revenue attribution, and ROI. We identify what is outperforming (and why), what is underperforming (and how to fix it), and what new opportunities have emerged since the last review. Marketing strategy is not a static document — it is a living framework that evolves with your business, your competition, and the market. The businesses that win are the ones that review, adjust, and optimize continuously. We build that discipline into every engagement.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s Included in Our Marketing Consulting</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Every deliverable below is part of our consulting engagements. Strategic clarity on every front — no gaps, no guesswork.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Growth Strategy",
                items: ["Revenue goal modeling & forecasting", "Customer acquisition cost analysis", "Market expansion planning", "Service offering optimization", "Seasonal demand strategy", "Growth milestone roadmapping"],
              },
              {
                title: "Competitive Analysis",
                items: ["Top 10 competitor deep-dive", "Keyword gap analysis vs. competitors", "Pricing & positioning benchmarking", "Competitor ad spend & channel analysis", "Review profile comparison", "Market share opportunity mapping"],
              },
              {
                title: "Channel Optimization",
                items: ["SEO performance & opportunity audit", "Paid advertising ROI analysis", "Social media effectiveness review", "Email & nurture workflow audit", "Referral system evaluation", "AI search readiness assessment"],
              },
              {
                title: "Brand Positioning",
                items: ["Unique value proposition development", "Messaging framework & brand voice", "Target audience persona creation", "Competitive differentiation strategy", "Service area positioning", "Reputation & trust signal strategy"],
              },
              {
                title: "Budget Allocation",
                items: ["Channel-by-channel budget model", "Cost per lead projections by channel", "ROI forecasting & scenario planning", "Marketing spend benchmarking", "Vendor evaluation & selection", "Technology stack recommendations"],
              },
              {
                title: "KPI Framework",
                items: ["Custom KPI dashboard setup", "Lead attribution by channel & campaign", "Monthly performance reporting", "Quarterly business review presentations", "Revenue attribution modeling", "Conversion funnel analysis"],
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
          <h2 className="text-3xl font-bold sm:text-4xl">Who Our Marketing Consulting Is For</h2>
          <p className="mt-4 text-zinc-400">
            We work exclusively with local service businesses. If your customers find you by searching for what you do in the area you serve, our strategic frameworks are built for you.
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
          SECTION 7: MARKETING CONSULTING vs ALTERNATIVES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Marketing Consulting vs. the Alternatives</h2>
          <p className="mt-4 text-zinc-400">
            Service business owners typically weigh three options for marketing leadership. Here is how they compare.
          </p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Marketing Consulting vs. Hiring a Full-Time CMO</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                A full-time Chief Marketing Officer in New York City commands a salary of $250,000 to $400,000 per year, plus benefits, equity, and bonuses. For most service businesses generating $1 million to $20 million in annual revenue, that is an enormous commitment for a single hire — especially when you consider the ramp-up time, the risk of a bad hire, and the fact that a CMO still needs a team to execute. Our marketing consulting engagements deliver the same strategic output — market analysis, channel strategy, budget optimization, competitive positioning, and growth planning — at $60,000 to $120,000 per year on a retainer basis. You get CMO-level thinking without the CMO-level overhead. And because we work with dozens of service businesses across the NYC metro, we bring cross-industry insights and benchmarking data that a single in-house CMO simply cannot match.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Marketing Consulting vs. DIY Marketing</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Many service business owners try to handle marketing themselves — and there is nothing wrong with that at the earliest stages. But as your business grows beyond $500,000 in annual revenue, the opportunity cost of the owner managing marketing becomes enormous. Every hour you spend researching keywords, tweaking Google Ads, writing social posts, or figuring out email automation is an hour you are not spending on sales, operations, or the trade that built your business. DIY marketing also suffers from a lack of perspective — you are too close to your own business to objectively evaluate what is working and what is not. A marketing consultant provides the outside perspective, strategic experience, and data-driven frameworks that eliminate guesswork and accelerate growth. The ROI is not subtle — most clients see a 3x to 5x return on their consulting investment within the first 6 months.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Marketing Consulting vs. Agency Retainer</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most marketing agencies operate on a retainer model where they execute specific tactics — run your ads, manage your social media, produce your content. The problem is that most agencies execute without strategy. They run the playbook they run for every client, regardless of whether those tactics are the right fit for your specific business, market, and growth stage. A marketing consultant sits above the agency layer and provides strategic direction. We determine which tactics should be executed, which channels deserve investment, and how to measure success. Many of our consulting clients have existing agency relationships — we make those agencies more effective by ensuring they are doing the right work, not just doing work. Think of it this way: an agency is the engine, but a marketing consultant is the GPS that tells the engine where to go.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Real Results from Strategic Marketing Consulting</h2>
          <p className="mt-4 text-zinc-400">
            We do not deal in vanity metrics. Here is what strategic marketing consulting looks like when it is done right.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { stat: "60%", label: "Average Reduction in Cost Per Lead" },
              { stat: "3x-5x", label: "Typical ROI Within 6 Months" },
              { stat: "40%+", label: "Average Increase in Lead Volume" },
              { stat: "20+", label: "Years of Strategic Experience" },
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
              &ldquo;We were spending $12,000 a month on marketing across five different channels and had no idea what was actually generating leads. The NYC SEO audited everything, cut two channels that were producing zero measurable return, reallocated that budget to SEO and Google Business Profile, and within 6 months our cost per lead dropped by 60% while lead volume increased by 40%. The strategic clarity alone was worth ten times the consulting fee. We finally understand where our money goes and what it produces.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— Michael T., HVAC Company Owner, Manhattan</p>
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-700 bg-[#141414] p-8">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-lg">&#9733;</span>
              ))}
            </div>
            <blockquote className="mt-4 text-zinc-300 leading-relaxed italic">
              &ldquo;I was doing everything myself — running ads, posting on Instagram, trying to figure out SEO, managing my Yelp page — and burning out. The NYC SEO came in, looked at everything objectively, and told me to stop wasting time on Instagram and Yelp for my trade (commercial electrician), double down on SEO and referral partnerships, and build a proper follow-up system. Within 4 months I had more leads than I could handle and my marketing spend actually went down. That is what real strategic consulting looks like.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-white">— James K., Commercial Electrician, Brooklyn</p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: COMMON MISTAKES
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            10 Marketing Mistakes NYC Service Businesses Make (and How We Fix Them)
          </h2>
          <div className="mt-10 space-y-6">
            {[
              {
                mistake: "Spreading budget across too many channels without data",
                fix: "Most service businesses are active on 5 to 7 marketing channels but only 2 to 3 generate positive ROI. We audit every channel, identify the winners, and reallocate budget from underperforming channels to high-performing ones. This alone typically increases lead volume by 30% to 50% without increasing total spend.",
              },
              {
                mistake: "No clear understanding of cost per lead by channel",
                fix: "If you do not know what a lead costs from Google Ads versus SEO versus Yelp versus referrals, you are flying blind. We implement lead attribution tracking across every channel so you know exactly what each lead costs and which channels deliver the best quality leads that actually close into paying customers.",
              },
              {
                mistake: "Investing in social media when search intent drives your industry",
                fix: "For most service businesses, social media generates brand awareness but almost zero direct leads. A plumber does not get emergency calls from Instagram. We redirect social media budget to search-based channels — SEO, Google Ads, Google Business Profile — where customers are actively looking for your service right now.",
              },
              {
                mistake: "No competitive analysis — marketing in a vacuum",
                fix: "Your competitors' marketing strategy directly impacts yours. If three competitors are dominating Google for your top keywords, your strategy needs to account for that. We analyze your top 10 competitors across every channel — their keywords, their ad spend, their review velocity, their content strategy — and identify gaps you can exploit.",
              },
              {
                mistake: "Chasing the latest marketing trend instead of building fundamentals",
                fix: "TikTok, AI chatbots, influencer marketing — every year there is a new shiny object. Fundamentals win. For service businesses, fundamentals are SEO, Google Business Profile, reputation management, and a solid referral system. We build the foundation first, then layer advanced tactics on top once the fundamentals are producing consistent results.",
              },
              {
                mistake: "No customer journey mapping — treating all leads the same",
                fix: "A homeowner researching 'best plumber in Brooklyn' is at a different stage than someone searching 'emergency pipe burst repair near me.' We map your customer journey from awareness to consideration to decision and build channel strategies and messaging for each stage. This increases conversion rates by meeting customers where they are.",
              },
              {
                mistake: "Paying agencies without holding them accountable to KPIs",
                fix: "If your marketing agency reports on impressions and clicks but not leads and revenue, they are hiding behind vanity metrics. We build KPI frameworks that tie every marketing activity to measurable outcomes — leads generated, cost per lead, conversion rate, and revenue attributed. If a channel or vendor is not delivering ROI, we know within 30 days.",
              },
              {
                mistake: "No follow-up system — losing leads after first contact",
                fix: "The average service business follows up with a new lead once and gives up. Studies show that 80% of sales require 5 or more follow-ups. We design and implement automated lead nurture workflows using our CRM platform, Full Loop CRM, that follow up with every lead via email, SMS, and phone until they convert or explicitly opt out.",
              },
              {
                mistake: "Ignoring reputation management and review generation",
                fix: "In NYC, reviews are your most powerful marketing asset. A business with 200 five-star Google reviews converts at 3x the rate of a competitor with 30 reviews. We build automated review generation systems that consistently produce new reviews from satisfied customers and implement response strategies that build trust with prospects reading those reviews.",
              },
              {
                mistake: "No marketing strategy document — running on gut feeling",
                fix: "Most service business owners make marketing decisions based on intuition, sales calls from vendors, or what their competitors appear to be doing. We replace gut feeling with data. Our consulting engagements produce a formal marketing strategy with channel priorities, budget allocations, KPI targets, and quarterly milestones. This document becomes the operating system for your marketing — every decision is measured against it.",
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
            <h2 className="text-3xl font-bold sm:text-4xl">Marketing Consulting Pricing for NYC Service Businesses</h2>
            <p className="mx-auto mt-4 max-w-3xl text-zinc-400">
              Transparent pricing. Every dollar goes into strategic analysis, actionable recommendations, and measurable results — not overhead. 20+ years of experience behind every engagement.
            </p>
          </div>

          {/* Hourly & Retainer */}
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-2xl font-bold">Hourly Consulting</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0080FE]">$350-$500</span>
                <span className="text-zinc-400">/hour</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">For focused strategy sessions, one-time audits, and specific marketing challenges.</p>
              <ul className="mt-6 space-y-3">
                {[
                  "One-time marketing audit & assessment",
                  "Focused strategy sessions (2-4 hours)",
                  "Channel-specific optimization review",
                  "Vendor evaluation & selection advisory",
                  "Marketing budget analysis & reallocation",
                  "Competitive analysis deep-dive",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/partnership-request-form"
                className="mt-8 block w-full rounded-lg border border-zinc-600 py-3 text-center text-sm font-semibold text-white hover:border-zinc-400 hover:bg-white/5"
              >
                Book a Session
              </Link>
            </div>
            <div className="rounded-2xl border border-[#0080FE] bg-[#0080FE]/5 p-8 ring-1 ring-[#0080FE]">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#0080FE]">Recommended</p>
              <h3 className="text-2xl font-bold">Monthly Retainer</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#0080FE]">$5,000-$10,000</span>
                <span className="text-zinc-400">/month</span>
              </div>
              <p className="mt-3 text-sm text-zinc-400">For ongoing strategic oversight, continuous optimization, and fractional CMO-level advisory.</p>
              <ul className="mt-6 space-y-3">
                {[
                  "Comprehensive marketing audit (first 30 days)",
                  "Full multi-channel strategy development",
                  "Monthly performance review & reporting",
                  "Quarterly strategy updates & roadmapping",
                  "On-demand advisory access (email & phone)",
                  "Vendor management & accountability oversight",
                  "KPI dashboard setup & maintenance",
                  "Implementation support & execution oversight",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="mt-0.5 text-green-400">&#10003;</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/partnership-request-form"
                className="mt-8 block w-full rounded-lg bg-[#0080FE] py-3 text-center text-sm font-semibold text-white hover:bg-[#0070E0]"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Full-Service Tiers */}
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold">Full-Service Marketing Consulting + Execution</h3>
            <p className="mx-auto mt-3 max-w-3xl text-zinc-400">
              Strategy plus execution in one engagement. For businesses that want a complete marketing partner — not just advice.
            </p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                tier: "Foundation",
                price: "$3,500",
                period: "/month",
                description: "For single-location service businesses ready to build a strategic marketing foundation.",
                features: [
                  "Complete marketing audit & strategy",
                  "SEO foundation (up to 50 pages)",
                  "Google Business Profile optimization",
                  "Review generation system setup",
                  "Basic KPI dashboard & monthly reporting",
                  "Monthly strategy call",
                  "Email support",
                  "Hosting included",
                ],
                cta: "Get Started",
              },
              {
                tier: "Growth",
                price: "$7,500",
                period: "/month",
                description: "For multi-service businesses targeting aggressive growth across the NYC metro area.",
                features: [
                  "Everything in Foundation, plus:",
                  "Fractional CMO-level strategic oversight",
                  "Programmatic SEO (up to 1,000 pages)",
                  "Content marketing (4 articles/month)",
                  "Paid advertising strategy & management",
                  "Marketing automation & lead nurturing",
                  "Bi-weekly strategy calls",
                  "Competitive monitoring dashboard",
                ],
                cta: "Get Started",
                featured: true,
              },
              {
                tier: "Domination",
                price: "$15,000+",
                period: "/month",
                description: "For businesses that want to own their market — every channel, every neighborhood, every keyword.",
                features: [
                  "Everything in Growth, plus:",
                  "Full CMO-level strategic partnership",
                  "Unlimited programmatic pages",
                  "Full Next.js website build or migration",
                  "AI search optimization (GEO)",
                  "AI agent development & integration",
                  "Full Loop CRM implementation",
                  "Weekly strategy calls & quarterly offsites",
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
            All engagements include a free initial strategy session. Custom plans available.{" "}
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
          <h2 className="text-3xl font-bold sm:text-4xl">Why NYC Businesses Choose The NYC SEO for Marketing Consulting</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">20+ Years of Experience</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Our parent company,{" "}
                <a href="https://www.consortiumnyc.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Consortium NYC</a>, has over two decades of experience in digital marketing, branding, web development, and strategic consulting for NYC businesses. We have guided service businesses through every major marketing shift — from the rise of Google to the social media explosion to the current AI revolution. When we build a marketing strategy, it is informed by 20+ years of data on what actually works for service businesses in this market. We do not guess. We do not follow trends. We apply proven frameworks refined across hundreds of client engagements.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Own the Technology</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                Most marketing consultants recommend technology solutions they do not control. We build on{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Next.js</Link>{" "}
                and deploy on Vercel for web development. We use Supabase for data infrastructure. We use Resend for email delivery. We use Telnyx for voice and SMS. No WordPress. No bloated martech stacks. No third-party dependencies that slow you down or limit your capabilities. When we recommend a technical solution in your marketing strategy, we can build it ourselves — faster, cheaper, and better than outsourcing to a vendor who does not understand the strategy behind it.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">We Built Our Own CRM</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                <a href="https://homeservicesbusinesscrm.com" target="_blank" rel="noopener noreferrer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</a>{" "}
                is our proprietary customer relationship management platform built specifically for service businesses. It handles lead capture, automated follow-up, appointment scheduling, review generation, and revenue attribution — all in one platform. When our marketing strategy calls for lead nurturing, CRM implementation, or automation, we do not recommend a third-party tool and hope it works. We deploy our own platform and configure it specifically for your business, your sales process, and your customer journey. This level of integration between strategy and technology is something no pure-play consulting firm can match.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#EFF70A]">Results-Driven to the Point of Obsession</h3>
              <p className="mt-3 text-zinc-300 leading-relaxed">
                We do not produce 50-page strategy decks that sit in a drawer. We do not report on impressions, reach, or engagement. We measure leads, revenue, and ROI — the metrics that actually determine whether your marketing is working. Every recommendation we make is tied to a projected outcome. Every outcome is measured. Every measurement informs the next iteration of strategy. If something is not producing results, we change it — quickly, decisively, and without ego. Our reputation is built on one thing: generating measurable revenue growth for NYC service businesses. That is the only metric we care about, and it should be the only metric you care about too.
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
            Marketing consulting works best when paired with execution. These services complement and amplify your strategic marketing plan.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { name: "SEO Services", href: "/services/seo", desc: "Full-service search engine optimization to dominate organic search." },
              { name: "SEO Strategy & Roadmapping", href: "/services/seo-strategy", desc: "The strategic SEO foundation that drives ranking decisions." },
              { name: "Web Design & Development", href: "/services/web-design-development", desc: "Next.js websites engineered to convert visitors into leads." },
              { name: "AI Search Optimization (GEO)", href: "/services/ai-search-optimization", desc: "Get recommended by ChatGPT, Perplexity, and other AI platforms." },
              { name: "Content Marketing", href: "/services/content-marketing", desc: "SEO-optimized content that ranks, educates, and converts." },
              { name: "Automation & Programmatic SEO", href: "/services/automation", desc: "Marketing automation and hundreds of optimized pages at scale." },
              { name: "Google Business Profile", href: "/services/google-business-profile", desc: "Dominate the local map pack and Google Maps results." },
              { name: "Analytics & Reporting", href: "/services/analytics-reporting", desc: "Track leads, revenue, and ROI across every marketing channel." },
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
          <h2 className="text-3xl font-bold sm:text-4xl">Marketing Consulting Service Areas</h2>
          <p className="mt-4 text-zinc-400">
            We provide marketing consulting services to service businesses across the entire NYC metropolitan area — every borough, every neighborhood, every suburb.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions About Marketing Consulting</h2>
          <p className="mt-4 text-zinc-400">
            Answers to the most common questions we hear from NYC service businesses about marketing consulting and strategic advisory.
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
