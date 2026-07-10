import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategory,
  getNeighborhoodsByRegion,
  getAllServices,
  getAllNeighborhoods,
} from "@/app/site/the-nyc-seo/_lib/data";
import { PHONE, SITE_URL, SITE_NAME } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title:
    "NYC SEO & AI Search Optimization for Service Businesses | The NYC SEO",
  description:
    "The NYC SEO builds organic lead generation platforms and AI search optimization for service businesses across NYC, New Jersey, Long Island & Westchester. SEO + GEO + AI agents. Custom Next.js — not WordPress. Plumbers, lawyers, electricians, contractors & more. 5-star rated, A+ BBB.",
  openGraph: {
    title: "NYC SEO & AI Search Optimization for Service Businesses",
    description:
      "Stop paying per click. We build SEO and AI search optimization platforms that generate organic leads for service businesses across the NYC metro area. 54,000+ optimized pages. GEO, AI agents, and 25+ years experience.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function HomePage() {
  const servicesByCategory = getServicesByCategory();
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalServices = getAllServices().length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalPages = totalServices * totalNeighborhoods;

  const featuredCategories = Object.entries(servicesByCategory).slice(0, 6);

  const faqItems = [
    {
      q: "How long does local SEO take to start generating leads?",
      a: "Most of our clients see pages indexed within 2–4 weeks. Real ranking improvements and inbound leads typically start within 60–90 days. Unlike paid ads, organic rankings are an asset — once you rank, you stay there at $0 per click.",
    },
    {
      q: "How much does SEO cost for a small business in NYC?",
      a: "Our SEO plans start at $1,000/month for single-location businesses. Most clients invest $2,500/month for multi-area coverage. The average cost for a custom Next.js SEO platform is $5,000 — and it pays for itself in organic leads within months.",
    },
    {
      q: "Do you do SEO on existing WordPress websites?",
      a: "No. We only do SEO on websites that we build. Our platforms are purpose-built for search performance from the ground up — not bolted onto WordPress or whatever your last agency set up. That's why they rank.",
    },
    {
      q: "Can SEO replace Google Ads for my service business?",
      a: "For most of our clients, yes. Our average client sees a 90% reduction in ad spend over 12 months once organic rankings kick in. Ads stop the second you stop paying. Organic SEO keeps generating leads month after month at $0 per click.",
    },
    {
      q: "What types of service businesses do you work with?",
      a: `Any service business that needs local customers — plumbers, electricians, lawyers, dentists, salons, contractors, movers, and more. We have ${totalServices} service types across ${totalNeighborhoods} neighborhoods in our platform.`,
    },
    {
      q: "Do you guarantee first page rankings on Google?",
      a: `Anyone who guarantees a #1 ranking is lying. What we guarantee is real, optimized, properly structured pages targeting the exact searches your customers make. This site has ${totalPages.toLocaleString()}+ pages — click around and see for yourself.`,
    },
    {
      q: "What is an EMD microsite and how does it help my business?",
      a: "An EMD (Exact Match Domain) microsite is a small, focused website built on a domain that matches what your customers search for — like 'brooklynplumber.com.' Search engines give weight to domain relevance, so these sites often rank faster than a generic business website. We build and manage them as part of our Starter and Domination plans.",
    },
    {
      q: "How is your SEO different from other agencies in New York?",
      a: "We build things. Not reports. Not slide decks. Real pages with real structured data that search engines index. Most agencies send you monthly reports for 6 months and hope you don't notice nothing changed. We build live, ranking pages you can see and click.",
    },
    {
      q: "Do I need SEO if I already get leads from word of mouth?",
      a: "Word of mouth is great but it doesn't scale. Every day, people in your area search for your exact service and find your competitors instead. Organic SEO captures that demand 24/7 — even while you sleep. It's the channel that grows alongside referrals, not instead of them.",
    },
    {
      q: "Do you offer SEO services in New Jersey and Long Island?",
      a: `Yes. We cover the entire NYC metro area — all five boroughs, New Jersey, Long Island, and Westchester. That's ${totalNeighborhoods} neighborhoods and growing. Every area gets dedicated optimized pages for every service type.`,
    },
    {
      q: "What is programmatic SEO and how does it work?",
      a: `Programmatic SEO means building hundreds or thousands of optimized pages at scale — each targeting a specific service + location keyword. Instead of writing one blog post and hoping it ranks, we build a page for every combination like plumber in Brooklyn Heights or electrician in Jersey City. This site has ${totalPages.toLocaleString()}+ of them.`,
    },
    {
      q: "How do I know if my current SEO company is actually working?",
      a: "Ask yourself: can you see the pages they built? Can you search your service + your city and find them? If all you're getting is monthly reports with traffic charts, you're probably paying for nothing. With us, you can see every page we build — they're live and indexable right now.",
    },
    {
      q: "Do you require long-term contracts for SEO services?",
      a: "No. We work month to month on SEO Platform plans. Microsites are a one-time build. If we're not delivering results, you shouldn't be paying us. Simple as that. No cancellation fees, no lock-in, no fine print.",
    },
    {
      q: "What is structured data and why does it matter for local SEO?",
      a: "Structured data (schema markup) tells search engines exactly what your business does, where you are, and what services you offer — in a language they understand. It's how you show up in rich results, local packs, and AI search answers. Every page we build includes 100% valid structured data. Most agencies skip this entirely.",
    },
    {
      q: "Can AI search engines like ChatGPT send leads to my business?",
      a: "Yes — and they already are. AI search converts at 4–5x the rate of traditional search. When someone asks ChatGPT or Perplexity for a plumber in Manhattan, the answer comes from pages with clean, parseable data. That's exactly how we build every page — optimized for both traditional search and AI platforms.",
    },
    {
      q: "Why should I optimize for Bing, Yahoo, and DuckDuckGo too?",
      a: "Most agencies completely ignore these engines — which is exactly why it's easier to rank on them. Bing powers every Windows device and Microsoft Edge. Yahoo has 700M+ monthly users with higher income demographics. DuckDuckGo is the fastest growing traditional search engine. We optimize for all of them at the same time.",
    },
    {
      q: "What is the best SEO strategy for plumbers in Brooklyn?",
      a: "The best strategy is building dedicated, optimized pages for every neighborhood you serve. Not one 'plumbing services' page — but individual pages for Brooklyn Heights, Williamsburg, Park Slope, and every other neighborhood. Each with structured data, proper schema, and content that matches what people actually search.",
    },
    {
      q: "How much can I save by switching from Google Ads to organic SEO?",
      a: "Our average client reduces ad spend by 90% over 12 months. If you're spending $3,000/month on Google Ads, that's $36,000/year in clicks that stop the second you pause the campaign. With a $2,500/month SEO plan, your organic leads keep coming at $0 per click — forever.",
    },
    {
      q: "Do you build websites or just do SEO optimization?",
      a: "We build the website and do the SEO — they're inseparable. Our platforms are custom Next.js builds designed from the ground up for search performance. That includes your website, your service pages, location pages, structured data, sitemaps, and everything else. It's one system that does it all.",
    },
    {
      q: "What areas in Queens do you cover for local SEO?",
      a: "We cover every neighborhood in Queens — Astoria, Flushing, Jamaica, Long Island City, Forest Hills, Jackson Heights, and dozens more. Each neighborhood gets its own optimized pages for every service type we support.",
    },
    {
      q: "How does SEO help lawyers get more clients in NYC?",
      a: "Legal keywords are some of the most expensive in Google Ads — $50–$200+ per click. When someone searches 'personal injury lawyer Queens' and finds your organically ranked page instead of an ad, that's a free lead that closes at 8–10x the rate of paid clicks. We build pages for every legal specialty in every borough.",
    },
    {
      q: "What is the difference between local SEO and regular SEO?",
      a: "Local SEO targets customers in specific geographic areas — like neighborhoods across the NYC metro. Regular SEO targets broad, national keywords. For service businesses, local SEO is everything. You don't need someone in California finding your plumbing company. You need someone in Hoboken finding you right now.",
    },
    {
      q: "Why is Next.js better than WordPress for SEO?",
      a: "Next.js generates static HTML that loads instantly — no database queries, no bloated plugins, no security vulnerabilities. Google's Core Web Vitals heavily favor fast sites. WordPress sites average 3–5 second load times. Our Next.js platforms load in under 1 second. Speed is a direct ranking factor.",
    },
    {
      q: "Can you help my HVAC company rank in Westchester?",
      a: "Absolutely. HVAC in Westchester is one of our strongest verticals. We build dedicated pages for every town — White Plains, Yonkers, New Rochelle, Scarsdale, and more. Each page targets the exact searches homeowners make when their AC breaks or they need a furnace install.",
    },
    {
      q: "How many pages does an SEO platform include?",
      a: `It depends on how many services you offer and areas you serve. A single-service business in one borough might have 50–100 pages. A multi-service business across the metro area can have thousands. This site alone has ${totalPages.toLocaleString()}+ pages — every one targeting a real search query.`,
    },
    {
      q: "What should I look for when hiring an SEO agency in New York?",
      a: "Ask to see live pages they've built. Not screenshots. Not case studies from 2019. Live URLs you can search and find in Google right now. If they can't show you that, they're not doing real SEO. We show you everything we build — it's all public, indexable, and verifiable.",
    },
    {
      q: "Do you help with Google My Business optimization?",
      a: "Yes. Your Google Business Profile is the first thing people see in local searches. Maps, reviews, photos, hours — if it's not optimized, you're invisible in the local pack. We make sure your GBP is dialed in and working alongside your organic SEO pages for maximum visibility.",
    },
    {
      q: "How do organic leads compare to paid leads for contractors?",
      a: "Organic leads close at 8–10x the rate of paid leads. When a homeowner searches 'general contractor Manhattan' and finds your page organically, they already trust you more than an ad. They're further along in their decision. And you paid $0 for that click.",
    },
    {
      q: "Is SEO worth it for a new business with no online presence?",
      a: "It's the best time to start. New businesses that invest in organic SEO from day one build an asset that compounds over time. While your competitors burn money on ads, you'll be building rankings across every neighborhood you serve. In 6–12 months, they're still paying per click. You're not.",
    },
    {
      q: "How do I get started with The NYC SEO?",
      a: "Fill out a partnership request and tell us about your business — what you do, where you serve, and where you want to be. We'll review everything and show you exactly what we'd build: the pages, the structured data, the full strategy. No cost to look. No commitment. Just an honest conversation.",
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    alternateName: "The NYC SEO",
    description:
      "NYC SEO and AI search optimization agency building organic lead generation platforms for service businesses across the New York metro area. SEO, GEO, AI agents, custom Next.js — not WordPress.",
    url: SITE_URL,
    telephone: PHONE,
    email: "info@thenycseo.com",
    priceRange: "$$$",
    image: `${SITE_URL}/og-image.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressRegion: "NY",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 40.7128,
      longitude: -74.006,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "AdministrativeArea", name: "Long Island" },
      { "@type": "AdministrativeArea", name: "Westchester" },
    ],
    serviceType: [
      "Search Engine Optimization",
      "Local SEO",
      "Programmatic SEO",
      "AI Search Optimization",
      "Generative Engine Optimization",
      "AI Agent Development",
      "Web Development",
      "EMD Microsite Development",
    ],
    knowsAbout: [
      "Local SEO",
      "Programmatic SEO",
      "AI Search Optimization",
      "Generative Engine Optimization (GEO)",
      "Answer Engine Optimization (AEO)",
      "ChatGPT Optimization",
      "AI Agent Development",
      "Next.js Development",
      "Structured Data",
      "Google My Business Optimization",
      "Multi-Engine Optimization",
    ],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      bestRating: "5",
      worstRating: "1",
      reviewCount: "4",
      ratingCount: "4",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Gabriel Gonzalez" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "We run a plumbing company in Brooklyn. Before Consortium we were spending $4K/month on Google Ads and barely breaking even. Jeff built us a site and within 90 days we were getting 15–20 organic calls a week. We cut our ad spend to zero. Wish we found them years ago.",
        datePublished: "2025-08-15",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "June Smith" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "I own a med spa in Manhattan and hired three different SEO agencies before finding Consortium. They're the first ones who actually built pages I can see ranking. Not reports. Not promises. Real pages showing up on Google when my clients search. Night and day difference.",
        datePublished: "2025-10-02",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Jenni Martinez" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "Our law firm needed leads in Queens and the Bronx. Consortium built us a full SEO platform with pages for every practice area in every neighborhood. We went from 2 organic leads a month to 30+. The ROI isn't even close to what we were getting with ads.",
        datePublished: "2025-11-20",
      },
      {
        "@type": "Review",
        author: { "@type": "Person", name: "William Snyder" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "HVAC company in Westchester. Jeff and his team built us microsites for every town we serve. We're showing up on Google, Bing, even DuckDuckGo. Customers tell us they found us searching 'AC repair near me.' That never happened before. These guys are the real deal.",
        datePublished: "2026-01-10",
      },
    ],
    sameAs: [
      "https://www.bbb.org/us/ny/new-york/profile/web-designer/consortium-nyc-0121-87177901",
      "https://www.consortiumnyc.com",
    ],
  };

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />

      {/* ── 1. Hero ── black */}
      <section className="relative overflow-hidden bg-[#0A0A0A] pb-20 pt-16 lg:pb-28 lg:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,128,254,0.08),_transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
            In partnership with Consortium NYC Digital Marketing Agency
          </p>
          {/* Trust factors */}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <a
              href="https://www.bbb.org/us/ny/new-york/profile/web-designer/consortium-nyc-0121-87177901"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            >
              <span className="text-lg font-bold text-white">A+</span>
              <span>BBB Rating</span>
            </a>
            <a
              href="https://share.google/nbwE7X3l2UqirIYkJ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
            >
              <span className="flex gap-0.5 text-yellow-400">
                &#9733;&#9733;&#9733;&#9733;&#9733;
              </span>
              <span>5-Star Google Rating</span>
            </a>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-lg font-bold text-white">25+</span>
              <span>Years of Digital Marketing</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="text-lg font-bold text-white">10K+</span>
              <span>Projects Completed</span>
            </div>
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            NYC SEO &amp; AI Search
            <br />
            <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
              Organic Lead Machines
            </span>
            <br />
            <span className="text-[#EFF70A]">for Service Businesses</span>
          </h1>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.15em] text-zinc-500">
            SEO + AI Search Optimization + AI Agents &middot; A Consortium NYC Partnership
          </p>
          <p className="mt-8 text-lg leading-8 text-white">
            Say goodbye to ads. No more ad dependency, no more paying per click
            just to exist online.{" "}
            <a href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Organic leads</a> close better, stay longer, and cost you nothing.
            The customers who find you through search &mdash; not ads
            &mdash; are the best customers your business will ever get.
            We build the <a href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO and AI search optimization infrastructure</a> that makes that happen across{" "}
            <a href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google, Yahoo, Bing, DuckDuckGo, ChatGPT, Perplexity, and Gemini</a>.
            No gimmicks. No monthly reports that mean nothing. Just real pages
            that rank on traditional search engines and get recommended by AI &mdash; and real customers that call. This site has{" "}
            <a href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">{totalPages.toLocaleString()}+ of them</a> &mdash; go ahead and look
            around.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center justify-center rounded-lg bg-[#0080FE] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#0070E0]"
            >
              Build My Organic Lead Machine
            </Link>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-white/5"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ── 2. Welcome / About ── medium grey */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                Welcome to The NYC SEO
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Your Customers Are Already Searching for You. We Make Sure They Find You.
              </h2>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Right now, someone in your neighborhood is typing your exact
                service into a search engine. &ldquo;<Link href="/plumber/brooklyn-heights" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Plumber near me</Link>.&rdquo;
                &ldquo;<Link href="/divorce-lawyer/brooklyn" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Divorce lawyer Brooklyn</Link>.&rdquo; &ldquo;<Link href="/electrician/jersey-city" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Emergency
                electrician Jersey City</Link>.&rdquo; If your business doesn&apos;t
                show up, someone else&apos;s does &mdash; and that customer is
                gone forever.
              </p>
              <p className="mt-4 text-lg leading-8 text-zinc-300">
                That&apos;s the problem we solve. We&apos;re{" "}
                <a
                  href="https://www.consortiumnyc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  Consortium NYC
                </a>
                , and for over 25 years we&apos;ve been helping{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service
                businesses</Link> across the{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC metro area</Link> stop burning money on ads
                and start building something that actually lasts &mdash; organic
                search visibility that brings in customers month after month
                without paying a dime per click.
              </p>
              <p className="mt-4 text-lg leading-8 text-zinc-300">
                That&apos;s why we built The NYC SEO. We don&apos;t use
                WordPress. We don&apos;t use page builders from 2010. We use
                AI and modern web technology to build{" "}
                <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link> that
                search engines and AI models genuinely prefer &mdash; fast, clean, structured
                pages that rank on{" "}
                <Link href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  Google, Yahoo, Bing, and DuckDuckGo
                </Link>{" "}
                and get recommended by{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  ChatGPT, Perplexity, Gemini, and Claude
                </Link>
                . Not just one engine. All of them. Because your next customer
                could come from anywhere &mdash; including an AI conversation.
              </p>
              <p className="mt-4 text-lg leading-8 text-zinc-300">
                The site you&apos;re on right now? It has{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  {totalPages.toLocaleString()}+ pages
                </Link>
                . Every single one targets a real service in a real neighborhood
                &mdash; from{" "}
                <Link href="/plumber/manhattan" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers in Manhattan</Link> to{" "}
                <Link href="/personal-injury-lawyer/queens" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury lawyers in Queens</Link> to{" "}
                <Link href="/hvac/westchester" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC in Westchester</Link>
                . That&apos;s not a pitch. Click around. They&apos;re all live. That&apos;s what
                we build for our clients, and it&apos;s the most cost-effective
                way to grow a service business in 2026. No ad budget. No
                bidding wars. Just your business showing up every time someone
                in <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">your area</Link> needs what you do.
              </p>
            </div>

            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Top Organic Lead Sources in 2026
              </p>

              <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-lg font-bold text-purple-400">
                      AI
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">AI Search</h3>
                      <p className="text-xs text-zinc-400">ChatGPT, Perplexity, Gemini, Claude</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#EFF70A]">#1 Growing</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  AI search converts at 4-5x the rate of traditional search.
                  By late 2027, AI is projected to drive equal conversions to
                  Google. We structure every page with clean, parseable data
                  that AI models can read and recommend &mdash; not just rank.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-lg font-bold text-red-400">
                      G
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Google My Business</h3>
                      <p className="text-xs text-zinc-400">Maps, Local Pack, Reviews</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#EFF70A]">Essential</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Your Google Business Profile is the first thing people see
                  when they search your name or your service in their area.
                  Maps, reviews, photos, hours &mdash; if this isn&apos;t
                  optimized, you&apos;re invisible in the local pack. We make
                  sure it&apos;s dialed in.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-lg font-bold text-blue-400">
                      G
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Google Search</h3>
                      <p className="text-xs text-zinc-400">90% of all search traffic</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-white">~90% Share</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Still the king, still where most of your customers start.
                  But Google is changing &mdash; AI Overviews are reducing
                  clicks by 58%. The businesses that win now are the ones with
                  pages structured so well that Google has no choice but to
                  show them. That&apos;s what we build.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/20 text-lg font-bold text-teal-400">
                      B
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Bing</h3>
                      <p className="text-xs text-zinc-400">Powers Windows, Edge, Copilot</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-zinc-400">~4% Share</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Most agencies completely ignore Bing &mdash; which is exactly
                  why it&apos;s easier to rank there. It powers every Windows
                  device, Microsoft Edge, and Copilot. Huge for B2B and older
                  demographics with higher spending power.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 text-lg font-bold text-orange-400">
                      D
                    </span>
                    <h3 className="text-lg font-semibold text-white">DuckDuckGo</h3>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-300">
                    Fastest growing traditional search engine.
                    Privacy-focused users who trust their own research
                    and convert at higher rates.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 text-lg font-bold text-violet-400">
                      Y
                    </span>
                    <h3 className="text-lg font-semibold text-white">Yahoo</h3>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-zinc-300">
                    700M+ monthly users. Older, higher-income
                    demographic. Almost zero competition for local
                    service searches.
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-zinc-300">
                Old school SEO only focused on Google. We optimize for traditional
                search engines <span className="text-white">and</span> AI search
                platforms at the same time &mdash; and we find success on both,
                every time. That&apos;s the difference in 2026.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Portfolio Proof ── black */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
              Live SEO Projects &middot; Built by Consortium NYC
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              SEO Websites We&apos;ve Built That Actually Rank
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-zinc-400">
              Every <Link href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO agency</Link> claims they get results. We show ours. These are live{" "}
              <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO websites</Link> and{" "}
              <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">EMD microsites</Link> we&apos;ve built for real businesses &mdash; from{" "}
              <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service companies in NYC</Link> to national brands. Visit them. Google them. See them ranking on Google, Bing, and DuckDuckGo right now. That&apos;s the difference between an{" "}
              <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO company that builds</Link> and one that sends reports.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "AI Agent Dev Team", domain: "aiagentdevteam.com" },
              { title: "Vacation Rentals in Destin FL", domain: "vacationrentalsindestinfl.com" },
              { title: "AI Agent NYC", domain: "aiagentnyc.com" },
              { title: "Visit Destin", domain: "visitdestin.com" },
              { title: "Crab Island Destin FL", domain: "crabislanddestinfl.com" },
              { title: "Rent a Boat in Destin", domain: "rentaboatindestin.com" },
              { title: "Jet Ski Rentals in Destin", domain: "jetskirentalsindestin.com" },
              { title: "Daytona Dumpster Company", domain: "daytonadumpstercompany.com" },
            ].map((project) => (
              <div
                key={project.domain}
                className="relative overflow-hidden rounded-xl border border-emerald-900/60 bg-emerald-950/40"
              >
                <div className="p-5 pb-3">
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5">
                      <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
                    </svg>
                    NEW
                  </span>
                  <h3 className="pr-16 text-sm font-bold uppercase tracking-wide text-white">
                    {project.title}
                  </h3>
                  <p className="mt-1.5 font-mono text-xs text-zinc-500">
                    {project.domain}
                  </p>
                </div>
                <div className="grid grid-cols-2 border-t border-emerald-900/60">
                  <a
                    href={`https://${project.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 border-r border-emerald-900/60 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.97-2.03a.75.75 0 0 1 .75-.22h4a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0V5.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06l5.47-5.47H12.5a.75.75 0 0 1-.53-.22Z" clipRule="evenodd" />
                    </svg>
                    Visit
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(project.domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-300"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
                      <path d="M5.84 14.09A6.68 6.68 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
                    </svg>
                    Google
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/portfolio"
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              Full Portfolio &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. Social Proof / We Get It ── blue */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              We Get It
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              You&apos;ve Wasted Money Before. We Know.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
              Here&apos;s what we hear from business owners every single week &mdash; and why they end up working with us.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-[#EFF70A]">
                &ldquo;I paid $5K for a website and I get zero calls from
                it&rdquo;
              </h3>
              <p className="mt-3 text-sm text-blue-100">
                Because a website without <Link href="/services" className="text-white underline hover:text-blue-200">SEO</Link> is a business card nobody asked
                for. It needs to be found by search engines, structured
                correctly, and targeting the right keywords in the right{" "}
                <Link href="/areas" className="text-white underline hover:text-blue-200">locations</Link>.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-[#EFF70A]">
                &ldquo;I&apos;m spending $3K/month on Google Ads and barely
                breaking even&rdquo;
              </h3>
              <p className="mt-3 text-sm text-blue-100">
                Ads can work as a short-term play &mdash; but only after your{" "}
                <Link href="/about" className="text-white underline hover:text-blue-200">organic foundation</Link> is solid. Most of our clients reduce or
                eliminate ad spend entirely once{" "}
                <Link href="/pricing" className="text-white underline hover:text-blue-200">organic SEO</Link> kicks in.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-[#EFF70A]">
                &ldquo;My last SEO guy just sent me reports for 6
                months&rdquo;
              </h3>
              <p className="mt-3 text-sm text-blue-100">
                We don&apos;t send reports. We build{" "}
                <Link href="/services" className="text-white underline hover:text-blue-200">pages</Link>. Live, ranking,
                findable pages that target the exact searches your customers
                are making in{" "}
                <Link href="/areas" className="text-white underline hover:text-blue-200">your area</Link>. You can see them. You can click them.
              </p>
            </div>
          </div>

          {/* Results that matter */}
          <div className="mt-14 rounded-xl bg-white/15 p-8 backdrop-blur-sm">
            <p className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
              What Our Clients Actually See
            </p>
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white lg:text-5xl">
                  8-10x
                </div>
                <div className="mt-2 text-sm text-blue-200">
                  Higher Close Rate vs Paid Ads
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white lg:text-5xl">
                  $0
                </div>
                <div className="mt-2 text-sm text-blue-200">
                  Per Click &middot; Forever
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-white lg:text-5xl">
                  60-90
                </div>
                <div className="mt-2 text-sm text-blue-200">
                  Days to Start Ranking
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extrabold text-[#EFF70A] lg:text-5xl">
                  90%
                </div>
                <div className="mt-2 text-sm text-blue-200">
                  Avg Ad Spend Reduction Over 12 Mo
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. Pricing ── black */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Simple, Transparent SEO Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-white">
              No hidden fees. No long-term contracts. We don&apos;t do SEO on
              WordPress websites &mdash; we only do SEO on{" "}
              <Link href="/partnership-request-form" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                websites that we build
              </Link>. That&apos;s why they rank. The average cost for a custom{" "}
              <Link href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                Next.js platform
              </Link>{" "}
              is $5,000 &mdash; and it&apos;s the best foundation for your
              business long term. It&apos;s not just a website. It&apos;s a
              system that supports{" "}
              <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                SEO
              </Link>, automation, CRM integration, lead capture, and
              everything else your{" "}
              <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                local business
              </Link>{" "}
              needs to grow &mdash; all from one platform.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0080FE]">
                Starter
              </h3>
              <p className="mt-4 text-4xl font-bold text-white">
                $1,000
                <span className="text-lg font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                Perfect for single-location businesses ready to stop paying
                per click and start owning their organic presence.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> EMD microsite(s) built &amp; managed</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> AI-generated clean HTML</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Structured data on every page</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Multi-engine optimization</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Contact form with lead capture</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Monthly reporting</li>
              </ul>
            </div>

            <div className="rounded-xl border-2 border-[#0080FE] bg-[#141414] p-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0080FE]">
                  Growth
                </h3>
                <span className="rounded-full bg-[#0080FE]/20 px-3 py-1 text-xs font-semibold text-[#0080FE]">
                  Most Popular
                </span>
              </div>
              <p className="mt-4 text-4xl font-bold text-white">
                $2,500
                <span className="text-lg font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                For businesses serving multiple areas or offering multiple
                services. This is where the real scale happens.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Custom Next.js SEO platform</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Hundreds of optimized pages</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Schema markup on every page</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Google + Yahoo + Bing + DuckDuckGo</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Dynamic sitemap generation</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Monthly content expansion</li>
              </ul>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#EFF70A]">
                Domination
              </h3>
              <p className="mt-4 text-4xl font-bold text-white">
                $5,000+
                <span className="text-lg font-normal text-zinc-500"> /month</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                The full organic lead machine. SEO platform plus microsites
                targeting every service you offer in every area you serve.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Everything in Growth</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Multiple EMD microsites</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> AI + traditional search optimization</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Ongoing content strategy</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Monthly strategy calls</li>
                <li className="flex gap-2"><span className="text-green-400">&#10003;</span> Priority support</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              Full Pricing Details &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Google Reviews ── medium grey */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
                <path d="M5.84 14.09A6.68 6.68 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
              </svg>
              <span className="flex text-lg text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-lg font-bold text-white">5.0</span>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              What NYC Business Owners Say About Our SEO
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-zinc-300">
              Real reviews from real <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service business owners</Link> across{" "}
              <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn, Manhattan, Queens, and Westchester</Link> who switched from paid ads to organic SEO &mdash; and never looked back. See for yourself on{" "}
              <a
                href="https://share.google/nbwE7X3l2UqirIYkJ"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5CB8FF] hover:text-[#8DD0FF]"
              >
                Google
              </a>.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  GG
                </div>
                <div>
                  <p className="font-semibold text-white">Gabriel Gonzalez</p>
                  <span className="flex text-sm text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                &ldquo;We run a <Link href="/plumber/brooklyn" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbing company in Brooklyn</Link>. Before Consortium we were
                spending $4K/month on Google Ads and barely breaking even. Jeff built us a
                site and within 90 days we were getting 15&ndash;20 organic calls a week. We
                cut our ad spend to zero. Wish we found them years ago.&rdquo;
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                  JS
                </div>
                <div>
                  <p className="font-semibold text-white">June Smith</p>
                  <span className="flex text-sm text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                &ldquo;I own a <Link href="/med-spa/manhattan" className="text-[#5CB8FF] hover:text-[#8DD0FF]">med spa in Manhattan</Link> and hired three different SEO agencies
                before finding Consortium. They&apos;re the first ones who actually built
                pages I can see ranking. Not reports. Not promises. Real pages showing up
                on Google when my clients search. Night and day difference.&rdquo;
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">
                  JM
                </div>
                <div>
                  <p className="font-semibold text-white">Jenni Martinez</p>
                  <span className="flex text-sm text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                &ldquo;Our <Link href="/personal-injury-lawyer/queens" className="text-[#5CB8FF] hover:text-[#8DD0FF]">law firm needed leads in Queens</Link> and the Bronx. Consortium built us
                a full <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platform</Link> with pages for every practice area in every neighborhood.
                We went from 2 organic leads a month to 30+. The ROI isn&apos;t even close
                to what we were getting with ads.&rdquo;
              </p>
            </div>

            <div className="rounded-xl border border-zinc-700 bg-[#363636] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 text-sm font-bold text-white">
                  WS
                </div>
                <div>
                  <p className="font-semibold text-white">William Snyder</p>
                  <span className="flex text-sm text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                &ldquo;<Link href="/hvac/westchester" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC company in Westchester</Link>. Jeff and his team built us microsites for
                every town we serve. We&apos;re showing up on Google, Bing, even DuckDuckGo.
                Customers tell us they found us searching &lsquo;AC repair near me.&rsquo;
                That never happened before. These guys are the real deal.&rdquo;
              </p>
            </div>
          </div>

          {/* AI-Generated Summary */}
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-zinc-700 bg-[#363636] p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
                AI
              </span>
              <p className="text-sm font-semibold text-zinc-400">AI-Generated Summary</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Consortium NYC&apos;s clients consistently report significant reductions in paid
              advertising spend after switching to organic SEO &mdash; with{" "}
              <Link href="/plumber/brooklyn" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>,{" "}
              <Link href="/personal-injury-lawyer/queens" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>,{" "}
              <Link href="/med-spa/manhattan" className="text-[#5CB8FF] hover:text-[#8DD0FF]">med spas</Link>, and{" "}
              <Link href="/hvac/westchester" className="text-[#5CB8FF] hover:text-[#8DD0FF]">HVAC companies</Link> across{" "}
              <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Brooklyn, Manhattan, Queens, and Westchester</Link>{" "}
              seeing 15&ndash;30+ organic leads per month within 60&ndash;90 days. Reviewers
              highlight the ability to see live, ranking pages rather than receiving vague
              monthly reports.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ── blue */}
      <section className="bg-[#0080FE] py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to Stop Paying Per Click and Start Owning AI Search?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-100">
            Tell us about your business. We&apos;ll show you exactly what we&apos;d build &mdash; the SEO pages, the AI search strategy, the whole plan. No cost. No commitment.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-[#0080FE] shadow-sm hover:bg-blue-50"
            >
              Get Better Leads
            </Link>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-white/10"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ── 6. Services ── black */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            SEO &amp; AI Search Optimization for Every Service Industry
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            We build SEO and AI search infrastructure for {totalServices} service types across{" "}
            {totalNeighborhoods} neighborhoods. Every page is optimized for Google, Bing, and AI platforms like ChatGPT and Perplexity. Find your industry below.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredCategories.map(([category, services]) => (
              <div
                key={category}
                className="rounded-xl border border-zinc-700 bg-[#363636] p-6 transition-all hover:border-zinc-600"
              >
                <h3 className="text-lg font-semibold text-white">{category}</h3>
                <ul className="mt-4 space-y-2">
                  {services.slice(0, 6).map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/${s.slug}`}
                        className="text-sm text-zinc-300 hover:text-[#0080FE]"
                      >
                        {s.name} SEO
                      </Link>
                    </li>
                  ))}
                </ul>
                {services.length > 6 && (
                  <Link
                    href={`/businesses#${category.toLowerCase().replace(/[\s&]+/g, "-")}`}
                    className="mt-3 inline-block text-sm font-medium text-[#5CB8FF] hover:text-[#8DD0FF]"
                  >
                    +{services.length - 6} more &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/businesses"
              className="inline-flex items-center rounded-lg border border-zinc-600 px-6 py-3 font-semibold text-white transition-colors hover:border-zinc-500 hover:bg-white/5"
            >
              All {totalServices} Service Industries &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 7. Locations ── medium grey */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Local SEO Across the Entire NYC Metro Area
          </h2>
          <p className="mt-2 text-lg text-zinc-300">
            {totalNeighborhoods} neighborhoods. 8 regions. Dedicated optimized
            pages for every service type in every area.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(neighborhoodsByRegion).map(
              ([region, neighborhoods]) => {
                const serviceRotation = ["plumber", "electrician", "personal-injury-lawyer", "hvac", "general-contractor"];
                return (
                <div
                  key={region}
                  className="rounded-xl border border-zinc-700 bg-[#363636] p-5"
                >
                  <h3 className="font-semibold text-white">{region}</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    {neighborhoods.length} areas
                  </p>
                  <ul className="mt-3 space-y-1">
                    {neighborhoods.slice(0, 5).map((n, i) => (
                      <li key={n.slug}>
                        <Link
                          href={`/${serviceRotation[i % serviceRotation.length]}/${n.slug}`}
                          className="text-sm text-zinc-300 hover:text-[#5CB8FF]"
                        >
                          {n.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="mt-3 inline-block text-sm font-medium text-[#5CB8FF] hover:text-[#8DD0FF]"
                  >
                    All {region} &rarr;
                  </Link>
                </div>
                );
              }
            )}
          </div>
        </div>
      </section>

      {/* ── 8. FAQ ── blue */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              SEO for Service Businesses: Everything You Need to Know
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-blue-100">
              You&apos;re a <Link href="/services" className="text-white underline hover:text-blue-200">service business owner</Link> in the <Link href="/areas" className="text-white underline hover:text-blue-200">NYC metro area</Link>. You&apos;ve probably been burned by an SEO agency before, or you&apos;re spending too much on Google Ads, or you&apos;re just tired of watching competitors show up where you should be. Here&apos;s everything you should know before making your next move &mdash; honest answers from a team with <a href="https://www.bbb.org/us/ny/new-york/profile/web-designer/consortium-nyc-0121-87177901" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-blue-200">25+ years</a> in digital marketing and an A+ BBB rating.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {/* Row 1 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How long does local SEO take to start generating leads?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Most of our clients see pages indexed within 2&ndash;4 weeks. Real ranking improvements and inbound leads typically start within 60&ndash;90 days. Unlike <Link href="/services" className="text-white underline hover:text-blue-200">paid ads</Link>, organic rankings are an asset &mdash; once you rank, you stay there at $0 per click.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How much does SEO cost for a small business in NYC?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Our <Link href="/pricing" className="text-white underline hover:text-blue-200">SEO plans</Link> start at $1,000/month for single-location businesses. Most clients invest $2,500/month for multi-area coverage. The average cost for a custom Next.js SEO platform is $5,000 &mdash; and it pays for itself in organic leads within months.
              </p>
            </div>

            {/* Row 2 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do you do SEO on existing WordPress websites?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                No. We only do SEO on <Link href="/partnership-request-form" className="text-white underline hover:text-blue-200">websites that we build</Link>. Our platforms are purpose-built for search performance from the ground up &mdash; not bolted onto WordPress or whatever your last agency set up. That&apos;s why they rank.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Can SEO replace Google Ads for my service business?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                For most of our clients, yes. Our average client sees a 90% reduction in ad spend over 12 months once organic rankings kick in. Ads stop the second you stop paying. <Link href="/about" className="text-white underline hover:text-blue-200">Organic SEO</Link> keeps generating leads month after month at $0 per click.
              </p>
            </div>

            {/* Row 3 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What types of service businesses do you work with?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Any service business that needs local customers &mdash; <Link href="/plumber/manhattan" className="text-white underline hover:text-blue-200">plumbers</Link>, <Link href="/electrician/brooklyn" className="text-white underline hover:text-blue-200">electricians</Link>, <Link href="/personal-injury-lawyer/queens" className="text-white underline hover:text-blue-200">lawyers</Link>, dentists, salons, contractors, movers, and more. We have {totalServices} service types across {totalNeighborhoods} neighborhoods in our platform.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do you guarantee first page rankings on Google?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Anyone who guarantees a #1 ranking is lying. What we guarantee is real, optimized, properly structured pages targeting the exact searches your customers make. This site has {totalPages.toLocaleString()}+ pages &mdash; <Link href="/services" className="text-white underline hover:text-blue-200">click around and see for yourself</Link>.
              </p>
            </div>

            {/* Row 4 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What is an EMD microsite and how does it help my business?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                An EMD (Exact Match Domain) microsite is a small, focused website built on a domain that matches what your customers search for &mdash; like &ldquo;brooklynplumber.com.&rdquo; Search engines give weight to domain relevance, so these sites often rank faster than a generic business website. We build and manage them as part of our <Link href="/pricing" className="text-white underline hover:text-blue-200">Starter and Domination plans</Link>.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How is your SEO different from other agencies in New York?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                We build things. Not reports. Not slide decks. Real pages with real structured data that search engines index. Most agencies send you monthly reports for 6 months and hope you don&apos;t notice nothing changed. We build <Link href="/services" className="text-white underline hover:text-blue-200">live, ranking pages</Link> you can see and click.
              </p>
            </div>

            {/* Row 5 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do I need SEO if I already get leads from word of mouth?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Word of mouth is great but it doesn&apos;t scale. Every day, people in <Link href="/areas" className="text-white underline hover:text-blue-200">your area</Link> search for your exact service and find your competitors instead. Organic SEO captures that demand 24/7 &mdash; even while you sleep. It&apos;s the channel that grows alongside referrals, not instead of them.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do you offer SEO services in New Jersey and Long Island?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Yes. We cover the entire NYC metro area &mdash; all five boroughs, <Link href="/areas#new-jersey" className="text-white underline hover:text-blue-200">New Jersey</Link>, <Link href="/areas#long-island" className="text-white underline hover:text-blue-200">Long Island</Link>, and <Link href="/areas#westchester" className="text-white underline hover:text-blue-200">Westchester</Link>. That&apos;s {totalNeighborhoods} neighborhoods and growing. Every area gets dedicated optimized pages for every service type.
              </p>
            </div>

            {/* Row 6 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What is programmatic SEO and how does it work?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Programmatic SEO means building hundreds or thousands of optimized pages at scale &mdash; each targeting a specific service + location keyword. Instead of writing one blog post and hoping it ranks, we build a page for every combination like <Link href="/plumber/brooklyn-heights" className="text-white underline hover:text-blue-200">plumber in Brooklyn Heights</Link> or <Link href="/electrician/jersey-city" className="text-white underline hover:text-blue-200">electrician in Jersey City</Link>. This site has {totalPages.toLocaleString()}+ of them.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How do I know if my current SEO company is actually working?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Ask yourself: can you see the pages they built? Can you search your service + your city and find them? If all you&apos;re getting is monthly reports with traffic charts, you&apos;re probably paying for nothing. With us, you can <Link href="/services" className="text-white underline hover:text-blue-200">see every page we build</Link> &mdash; they&apos;re live and indexable right now.
              </p>
            </div>

            {/* Row 7 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do you require long-term contracts for SEO services?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                No. We work month to month on <Link href="/pricing" className="text-white underline hover:text-blue-200">SEO Platform plans</Link>. Microsites are a one-time build. If we&apos;re not delivering results, you shouldn&apos;t be paying us. Simple as that. No cancellation fees, no lock-in, no fine print.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What is structured data and why does it matter for local SEO?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Structured data (schema markup) tells search engines exactly what your business does, where you are, and what services you offer &mdash; in a language they understand. It&apos;s how you show up in rich results, local packs, and AI search answers. Every page we build includes 100% valid structured data. Most agencies skip this entirely.
              </p>
            </div>

            {/* Row 8 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Can AI search engines like ChatGPT send leads to my business?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Yes &mdash; and they already are. AI search converts at 4&ndash;5x the rate of traditional search. When someone asks ChatGPT or Perplexity for a <Link href="/plumber/manhattan" className="text-white underline hover:text-blue-200">plumber in Manhattan</Link>, the answer comes from pages with clean, parseable data. That&apos;s exactly how we build every page &mdash; optimized for both traditional search and AI platforms.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Why should I optimize for Bing, Yahoo, and DuckDuckGo too?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Most agencies completely ignore these engines &mdash; which is exactly why it&apos;s easier to rank on them. Bing powers every Windows device and Microsoft Edge. Yahoo has 700M+ monthly users with higher income demographics. DuckDuckGo is the fastest growing traditional search engine. We optimize for <Link href="/about" className="text-white underline hover:text-blue-200">all of them at the same time</Link>.
              </p>
            </div>

            {/* Row 9 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What is the best SEO strategy for plumbers in Brooklyn?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                The best strategy is building dedicated, optimized pages for every neighborhood you serve. Not one &ldquo;plumbing services&rdquo; page &mdash; but individual pages for <Link href="/plumber/brooklyn-heights" className="text-white underline hover:text-blue-200">Brooklyn Heights</Link>, <Link href="/plumber/williamsburg" className="text-white underline hover:text-blue-200">Williamsburg</Link>, <Link href="/plumber/park-slope" className="text-white underline hover:text-blue-200">Park Slope</Link>, and every other neighborhood. Each with structured data, proper schema, and content that matches what people actually search.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How much can I save by switching from Google Ads to organic SEO?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Our average client reduces ad spend by 90% over 12 months. If you&apos;re spending $3,000/month on Google Ads, that&apos;s $36,000/year in clicks that stop the second you pause the campaign. With a <Link href="/pricing" className="text-white underline hover:text-blue-200">$2,500/month SEO plan</Link>, your organic leads keep coming at $0 per click &mdash; forever.
              </p>
            </div>

            {/* Row 10 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do you build websites or just do SEO optimization?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                We build the website and do the SEO &mdash; they&apos;re inseparable. Our platforms are custom Next.js builds designed from the ground up for search performance. That includes your website, your <Link href="/services" className="text-white underline hover:text-blue-200">service pages</Link>, location pages, structured data, sitemaps, and everything else. It&apos;s one system that does it all.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What areas in Queens do you cover for local SEO?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                We cover every neighborhood in Queens &mdash; <Link href="/plumber/astoria" className="text-white underline hover:text-blue-200">Astoria</Link>, <Link href="/plumber/flushing" className="text-white underline hover:text-blue-200">Flushing</Link>, <Link href="/plumber/jamaica" className="text-white underline hover:text-blue-200">Jamaica</Link>, Long Island City, Forest Hills, Jackson Heights, and dozens more. Each neighborhood gets its own optimized pages for every <Link href="/services" className="text-white underline hover:text-blue-200">service type</Link> we support.
              </p>
            </div>

            {/* Row 11 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How does SEO help lawyers get more clients in NYC?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Legal keywords are some of the most expensive in Google Ads &mdash; $50&ndash;$200+ per click. When someone searches &ldquo;<Link href="/personal-injury-lawyer/queens" className="text-white underline hover:text-blue-200">personal injury lawyer Queens</Link>&rdquo; and finds your organically ranked page instead of an ad, that&apos;s a free lead that closes at 8&ndash;10x the rate of paid clicks. We build pages for every legal specialty in every borough.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What is the difference between local SEO and regular SEO?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Local SEO targets customers in specific geographic areas &mdash; like <Link href="/areas" className="text-white underline hover:text-blue-200">neighborhoods across the NYC metro</Link>. Regular SEO targets broad, national keywords. For service businesses, local SEO is everything. You don&apos;t need someone in California finding your plumbing company. You need someone in <Link href="/plumber/hoboken" className="text-white underline hover:text-blue-200">Hoboken</Link> finding you right now.
              </p>
            </div>

            {/* Row 12 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Why is Next.js better than WordPress for SEO?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Next.js generates static HTML that loads instantly &mdash; no database queries, no bloated plugins, no security vulnerabilities. Google&apos;s Core Web Vitals heavily favor fast sites. WordPress sites average 3&ndash;5 second load times. Our Next.js platforms load in under 1 second. Speed is a direct ranking factor, and our <Link href="/pricing" className="text-white underline hover:text-blue-200">SEO platforms</Link> are built on it.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Can you help my HVAC company rank in Westchester?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Absolutely. <Link href="/hvac/westchester" className="text-white underline hover:text-blue-200">HVAC in Westchester</Link> is one of our strongest verticals. We build dedicated pages for every town &mdash; White Plains, Yonkers, New Rochelle, Scarsdale, and more. Each page targets the exact searches homeowners make when their AC breaks or they need a furnace install.
              </p>
            </div>

            {/* Row 13 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How many pages does an SEO platform include?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                It depends on how many services you offer and areas you serve. A single-service business in one borough might have 50&ndash;100 pages. A multi-service business across the metro area can have thousands. This site alone has <Link href="/services" className="text-white underline hover:text-blue-200">{totalPages.toLocaleString()}+ pages</Link> &mdash; every one targeting a real search query.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">What should I look for when hiring an SEO agency in New York?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Ask to see live pages they&apos;ve built. Not screenshots. Not case studies from 2019. Live URLs you can search and find in Google right now. If they can&apos;t show you that, they&apos;re not doing real SEO. We show you <Link href="/services" className="text-white underline hover:text-blue-200">everything we build</Link> &mdash; it&apos;s all public, indexable, and verifiable.
              </p>
            </div>

            {/* Row 14 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Do you help with Google My Business optimization?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Yes. Your Google Business Profile is the first thing people see in local searches. Maps, reviews, photos, hours &mdash; if it&apos;s not optimized, you&apos;re invisible in the local pack. We make sure your GBP is dialed in and working alongside your <Link href="/services" className="text-white underline hover:text-blue-200">organic SEO pages</Link> for maximum visibility.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How do organic leads compare to paid leads for contractors?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Organic leads close at 8&ndash;10x the rate of paid leads. When a homeowner searches &ldquo;<Link href="/general-contractor/manhattan" className="text-white underline hover:text-blue-200">general contractor Manhattan</Link>&rdquo; and finds your page organically, they already trust you more than an ad. They&apos;re further along in their decision. And you paid $0 for that click.
              </p>
            </div>

            {/* Row 15 */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">Is SEO worth it for a new business with no online presence?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                It&apos;s the best time to start. New businesses that invest in organic SEO from day one build an asset that compounds over time. While your competitors burn money on ads, you&apos;ll be building <Link href="/areas" className="text-white underline hover:text-blue-200">rankings across every neighborhood you serve</Link>. In 6&ndash;12 months, they&apos;re still paying per click. You&apos;re not.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">How do I get started with The NYC SEO?</h3>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                <Link href="/partnership-request-form" className="text-white underline hover:text-blue-200">Fill out a partnership request</Link> and tell us about your business &mdash; what you do, where you serve, and where you want to be. We&apos;ll review everything and show you exactly what we&apos;d build: the pages, the structured data, the full strategy. No cost to look. No commitment. Just an honest conversation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Thank You / Final CTA ── black */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Built by{" "}
            <a
              href="https://www.consortiumnyc.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Consortium NYC
            </a>
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Start Growing Your Service Business with SEO &amp; AI Search
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            If you made it this far, you&apos;re serious about growing your
            business the right way. We&apos;re not your typical{" "}
            <Link href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO agency</Link> &mdash; we&apos;re
            builders. Tell us what you do, where you are, and who your customers
            are. We&apos;ll show you exactly what we&apos;d build &mdash; the{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO pages, the AI search optimization, the GEO strategy</Link>, the full plan
            across every search engine and AI platform. No cost to look. No commitment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center rounded-lg bg-[#0080FE] px-7 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#0070E0]"
            >
              Let&apos;s Build Something Together
            </Link>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg border border-zinc-600 px-7 py-3.5 text-base font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
