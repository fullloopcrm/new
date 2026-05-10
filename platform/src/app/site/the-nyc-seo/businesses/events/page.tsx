// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategorySlug,
  getNeighborhoodsByRegion,
  getRegions,
  categoryToSlug,
  getCategories,
} from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import { getFAQPageSchema, PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

const CATEGORY = "Events";
const SLUG = "events";

export const metadata: Metadata = {
  title: "SEO for Event Businesses NYC",
  description:
    "SEO and AI search optimization for event businesses in NYC. Wedding planners, photographers, DJs, videographers, florists, and party rentals. Rank across 318+ neighborhoods.",
  alternates: { canonical: `${SITE_URL}/businesses/${SLUG}` },
  openGraph: {
    title: "SEO for Event Businesses NYC",
    description:
      "SEO and AI search optimization for event businesses in NYC. Wedding planners, photographers, DJs, florists, and more.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
};

export default function EventsPage() {
  const services = getServicesByCategorySlug(SLUG);
  const catContent = categoryContent[CATEGORY];
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const categories = getCategories();
  const totalNeighborhoods = Object.values(neighborhoodsByRegion).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const breadcrumbItems = [
    { name: "Businesses", url: "/businesses" },
    { name: CATEGORY, url: `/businesses/${SLUG}` },
  ];

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
    sameAs: ["https://www.consortiumnyc.com", "https://www.fullloopcrm.com"],
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Event Businesses NYC",
    description:
      "Full-service SEO, AI search optimization, and digital marketing for wedding planners, event planners, photographers, DJs, videographers, florists, and party rental companies in NYC, New Jersey, Long Island, and Westchester.",
    url: `${SITE_URL}/businesses/${SLUG}`,
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
      name: "Event Business SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Wedding Planner Local SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Event Business Google Business Profile Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Photographer Content Marketing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Event Business AI Search Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Event Business Programmatic SEO" } },
      ],
    },
  };

  const seoFaqs = [
    {
      q: "How much does SEO cost for an event business in NYC?",
      a: "SEO retainers for event businesses start at $3,500/month, covering local SEO, Google Business Profile optimization, content marketing, on-page SEO, and AI search optimization. Project-based work like website builds or portfolio optimization starts at $2,500. The investment depends on your competitive landscape, the types of events you serve, and how many neighborhoods you want to rank in. A wedding photographer targeting all of Brooklyn needs more than one focusing on DUMBO.",
    },
    {
      q: "How long until my event business ranks on Google in NYC?",
      a: "Most event businesses see measurable ranking improvements in 60-90 days, with significant gains in 4-6 months. Google Business Profile optimizations can impact your Maps ranking within weeks. The event industry in NYC is highly competitive, especially for wedding-related keywords — top positions in neighborhoods like the West Village, Tribeca, and DUMBO take dedicated effort over 4-8 months. We provide monthly progress reports from day one.",
    },
    {
      q: "Do you work with all types of event businesses?",
      a: "Yes. We build SEO platforms for wedding planners, event planners, DJs, photographers, videographers, florists, and party rental companies. Each business type gets a tailored keyword strategy because someone searching for a wedding photographer has completely different intent and buying timeline than someone looking for a DJ for a corporate party.",
    },
    {
      q: "Can you help my event business show up on ChatGPT and Perplexity?",
      a: "Yes. AI search optimization is one of our core services. When a couple asks ChatGPT 'best wedding photographer in Brooklyn' or a corporate planner asks Perplexity 'event planners for product launches in NYC,' we structure your content so your business gets recommended. We build the entity relationships, portfolio signals, and structured data that AI platforms use to generate answers.",
    },
    {
      q: "How important is SEO for wedding businesses specifically?",
      a: "Extremely important. Couples typically start searching for wedding vendors 12-18 months before their date, and 97% of that research starts online. The NYC wedding market is worth over $3.5 billion annually. If your wedding planning, photography, or DJ business is not ranking for 'wedding photographer NYC' and neighborhood-specific variations, you are losing bookings to competitors who invested in SEO.",
    },
    {
      q: "What makes your agency different for event business SEO?",
      a: "Three things. First, we build on Next.js, not WordPress, so your portfolio loads instantly on any device — critical when brides and event planners are comparing dozens of vendors. Second, we use programmatic SEO to generate hundreds of neighborhood-specific pages at scale. Third, we optimize for AI search platforms like ChatGPT and Perplexity, which are rapidly becoming how couples and corporate planners discover vendors. Full Loop CRM ensures every inquiry gets followed up on.",
    },
    {
      q: "Do you build location pages for event businesses?",
      a: `Yes. We generate optimized landing pages for every neighborhood you serve. A wedding photographer targeting the full NYC metro area gets ${totalNeighborhoods}+ unique pages — each targeting searches like "wedding photographer DUMBO" or "DJ for hire Hoboken" with original content, portfolio samples, schema markup, and internal linking.`,
    },
    {
      q: "How do you handle portfolio and gallery SEO for photographers and videographers?",
      a: "We optimize every image and video with descriptive file names, alt text targeting venue and event-type keywords, lazy loading for fast page speeds, structured data markup (ImageObject, VideoObject), and gallery pages organized by event type and venue. This turns your portfolio into a search engine asset, not just a visual showcase. Each gallery page targets specific keywords like 'Brooklyn winery wedding photos' or 'rooftop event videography NYC.'",
    },
  ];

  const faqSchema = getFAQPageSchema(seoFaqs);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={breadcrumbItems} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Business Types &middot; {totalNeighborhoods}+ Neighborhoods
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                SEO for{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">
                  Event
                </span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                NYC hosts 55,000+ weddings a year and thousands of corporate events, galas, and celebrations. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that rank{" "}
                <Link href="/wedding-planner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">wedding planners</Link>,{" "}
                <Link href="/event-planner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">event planners</Link>,{" "}
                <Link href="/dj" className="text-[#5CB8FF] hover:text-[#8DD0FF]">DJs</Link>,{" "}
                <Link href="/photographer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">photographers</Link>,{" "}
                <Link href="/videographer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">videographers</Link>,{" "}
                <Link href="/florist" className="text-[#5CB8FF] hover:text-[#8DD0FF]">florists</Link>, and{" "}
                <Link href="/party-rental" className="text-[#5CB8FF] hover:text-[#8DD0FF]">party rental companies</Link>{" "}
                across {totalNeighborhoods}+ neighborhoods in{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC, New Jersey, Long Island &amp; Westchester</Link>.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Stats Card */}
            <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-8">
              <h2 className="text-lg font-semibold text-[#0080FE]">Event Business SEO at a Glance</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Business Types Covered</span>
                  <span className="font-semibold">{services.length}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Neighborhoods Targeted</span>
                  <span className="font-semibold">{totalNeighborhoods}+</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Regions Covered</span>
                  <span className="font-semibold">{regions.length}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Search Engines &amp; AI</span>
                  <span className="font-semibold">Google, Bing, ChatGPT, Perplexity, Gemini, Claude</span>
                </div>
                <div className="flex justify-between border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Retainers From</span>
                  <span className="font-semibold text-[#0080FE]">$3,500/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Platform</span>
                  <span className="font-semibold">Next.js (not WordPress)</span>
                </div>
              </div>
              {catContent && catContent.stats.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-6">
                  {catContent.stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-lg font-bold text-[#EFF70A]">{stat.value}</p>
                      <p className="mt-1 text-xs text-zinc-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — WHY EVENT BUSINESSES NEED SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why Event Businesses Need SEO in NYC</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            The NYC event industry is a multi-billion dollar market, and the vast majority of couples, corporate planners, and party hosts start their vendor search online. When someone searches &ldquo;wedding photographer Brooklyn&rdquo; or asks ChatGPT &ldquo;best event planner for corporate galas in Manhattan,&rdquo; your business needs to be the result. Referrals are great, but they are unpredictable. A{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            strategy gives you a consistent pipeline of high-intent leads — people actively looking to book an event vendor right now. Without deliberate{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>, you are leaving thousands of dollars in bookings to competitors who rank above you.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#0080FE]">55,000+</p>
              <p className="mt-2 text-sm text-zinc-400">weddings in NYC every year</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#EFF70A]">$65K+</p>
              <p className="mt-2 text-sm text-zinc-400">average NYC wedding spend</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-white">97%</p>
              <p className="mt-2 text-sm text-zinc-400">of couples research vendors online</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHAT WE BUILD
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What We Build for Event Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every event business client gets a complete{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO and digital marketing platform</Link>{" "}
            — not piecemeal tactics. Here is what your wedding planning, photography, DJ, or event production company gets.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                num: "01",
                title: "SEO Strategy & Competitive Audit",
                desc: "We audit your current rankings, analyze competing event vendors in your target market, research high-intent keywords like 'wedding photographer Brooklyn' and 'corporate event planner NYC,' and build a 90-day roadmap tailored to your event specialties.",
                href: "/services/seo-strategy",
                link: "SEO strategy",
              },
              {
                num: "02",
                title: "Website Design & Development",
                desc: "Fast, mobile-first website on Next.js with portfolio galleries that load instantly, inquiry forms, pricing guides, venue partnership pages, and testimonials. Scores 95+ on Core Web Vitals. Designed to convert browsers into booked clients.",
                href: "/services/web-design-development",
                link: "web design",
              },
              {
                num: "03",
                title: "On-Page & Technical SEO",
                desc: "Title tags targeting 'wedding photographer [neighborhood],' meta descriptions, Event and ImageObject schema markup, portfolio image optimization with keyword-rich alt text, internal linking, Core Web Vitals, and crawlability management.",
                href: "/services/on-page-seo",
                link: "on-page SEO",
              },
              {
                num: "04",
                title: "Local SEO & Google Maps",
                desc: "Google Business Profile optimization with event service categories, portfolio highlights, weekly Posts featuring recent events, citation building across 50+ wedding and event directories (The Knot, WeddingWire, Zola), review generation, and geo-grid tracking.",
                href: "/services/local-seo",
                link: "local SEO",
              },
              {
                num: "05",
                title: "Content Marketing",
                desc: "SEO-optimized pages for every event type you serve (weddings, corporate, mitzvahs, galas), venue-specific portfolio pages, blog content targeting long-tail keywords like 'outdoor wedding venues Brooklyn 2026,' and seasonal event planning guides.",
                href: "/services/content-marketing",
                link: "content marketing",
              },
              {
                num: "06",
                title: "Programmatic Location Pages",
                desc: `Automated landing pages for every neighborhood — "wedding planner in DUMBO," "DJ for hire Astoria," "event photographer Tribeca." ${totalNeighborhoods}+ pages, each with unique content, portfolio samples, and local schema.`,
                href: "/services/automation",
                link: "programmatic SEO",
              },
              {
                num: "07",
                title: "AI Search Optimization",
                desc: "We make ChatGPT, Perplexity, Gemini, and Claude recommend your event business. When a couple asks 'best wedding photographer in NYC' or a corporate planner asks for recommendations, your business is what gets surfaced.",
                href: "/services/ai-search-optimization",
                link: "AI search optimization",
              },
              {
                num: "08",
                title: "Off-Page SEO & Link Building",
                desc: "Earned backlinks from wedding publications (The Knot, Brides, Martha Stewart Weddings), event industry blogs, venue partnership pages, local press features, directory listings, and review management across all major platforms.",
                href: "/services/off-page-seo",
                link: "off-page SEO",
              },
              {
                num: "09",
                title: "Google Business Profile",
                desc: "Complete GBP setup: event service categories, portfolio photos from real events, weekly Posts featuring recent work, Q&A seeding with common booking questions, review generation with post-event follow-ups, and ongoing management.",
                href: "/services/google-business-profile",
                link: "GBP optimization",
              },
              {
                num: "10",
                title: "Analytics & Booking Tracking",
                desc: "Monthly reporting on keyword rankings, organic traffic, inquiry form submissions, phone calls, consultation bookings, and ROI. Google Analytics, Search Console, and custom dashboards tracking every lead from search to signed contract.",
                href: "/services/analytics-reporting",
                link: "analytics",
              },
            ].map((item) => (
              <div key={item.num} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0080FE] text-xs font-bold text-white">{item.num}</span>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
                <Link href={item.href} className="mt-3 inline-block text-sm text-[#5CB8FF] hover:text-[#8DD0FF]">
                  Learn about {item.link} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — OUR PROCESS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">How We Rank Event Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Our process has ranked hundreds of{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
            across the NYC metro area. Here is how it works for event industry professionals specifically.
          </p>
          <div className="mt-10 space-y-6">
            {[
              { step: "1. Audit Your Competitive Landscape", detail: "We crawl your current site, pull ranking data for every event type and service keyword, analyze the top-ranking vendors in your target market, and identify where you are losing bookings. A wedding photographer in Brooklyn faces different competition than a corporate event planner in Midtown — we map each landscape separately." },
              { step: "2. Build a Portfolio-Driven Website", detail: "We build (or rebuild) your site on Next.js with blazing-fast portfolio galleries, inquiry forms, pricing guides, venue pages, and testimonials. Mobile-first because couples and planners browse vendors on their phones. Scores 95+ on Core Web Vitals." },
              { step: "3. Optimize Every Page for Search", detail: "On-page SEO across your entire site — title tags targeting 'wedding planner Brooklyn,' ImageObject schema for portfolio galleries, venue-specific landing pages, internal linking architecture, and image optimization that loads fast without sacrificing visual quality." },
              { step: "4. Launch Neighborhood Landing Pages", detail: `Programmatic generation of ${totalNeighborhoods}+ neighborhood-specific pages. Each page targets "photographer in [neighborhood]" or "DJ near [neighborhood]" with unique content, portfolio samples from local events, and internal links to your services.` },
              { step: "5. Dominate Google Maps & Directories", detail: "Full Google Business Profile optimization, citation building across 50+ event directories (The Knot, WeddingWire, Zola, Yelp, Bark), review generation with post-event email sequences, and geo-grid rank tracking for your target neighborhoods." },
              { step: "6. Build Authority with Content & Links", detail: "Ongoing content marketing (venue guides, event planning checklists, seasonal trend posts, real wedding features) and off-page SEO (editorial backlinks from wedding publications, venue partnership links, local press features) to build domain authority." },
              { step: "7. Optimize for AI Search", detail: "We structure your content so ChatGPT, Perplexity, Gemini, and Claude recommend your event business. AI-assisted vendor discovery is the fastest-growing channel in the event industry. When a couple asks an AI 'best wedding photographer Brooklyn,' we make sure your name comes up." },
              { step: "8. Measure, Report, Improve", detail: "Monthly reporting on keyword rankings, organic traffic, inquiry form submissions, consultation bookings, and ROI. Quarterly strategy reviews aligned to booking seasons. You always know what your investment produces." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 rounded-xl border border-zinc-700 bg-[#141414] p-6">
                <div>
                  <h3 className="font-semibold text-[#0080FE]">{item.step}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
                </div>
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
          SECTION 6 — INDUSTRY DEEP-DIVE
          ============================================================ */}
      {catContent && (
        <section className="bg-[#141414] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">Understanding the NYC Event Market</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              To build an effective{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              for your event business, we study your market inside and out — how clients search for vendors, what makes them choose one over another, and which keywords drive the highest-value bookings.
            </p>

            <h3 className="mt-10 text-xl font-semibold">What Your Potential Clients Are Looking For</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              We use these client decision factors to shape your{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content strategy</Link>{" "}
              and{" "}
              <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page optimization</Link>.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {catContent.seoProcess.map((item, i) => (
                <div key={i} className="flex gap-3 rounded-lg border border-zinc-800 bg-[#0A0A0A] p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0080FE] text-xs font-bold">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{item.step}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mt-10 text-xl font-semibold">Why Local SEO Matters for Event Businesses</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              These are the realities of the NYC event market — and exactly why{" "}
              <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
              is the most important investment your event business can make.
            </p>
            <div className="mt-6 space-y-4">
              {catContent.whySEOMatters.map((reason, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0080FE] text-sm font-bold">{i + 1}</span>
                  <p className="text-sm text-zinc-300 leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>

            {catContent.investmentFactors.length > 0 && (
              <>
                <h3 className="mt-10 text-xl font-semibold">Event Industry Pricing Context We Build Into Your Strategy</h3>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                  {catContent.investmentContext} Understanding your industry&apos;s pricing helps us craft{" "}
                  <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">keyword strategies</Link>{" "}
                  that target the searches with the highest booking value — luxury weddings, corporate galas, and multi-day events.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* ============================================================
          SECTION 7 — BUSINESS TYPES
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Event Business Types We Serve</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every event business type gets a tailored{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
            because a wedding planner, photographer, DJ, and florist each compete in different keyword landscapes with different booking cycles.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-white group-hover:text-[#0080FE]">SEO for {s.name}s</h3>
                <p className="mt-2 text-sm text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — PRICING
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">SEO Pricing for Event Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every dollar goes into strategy, content, optimization, and infrastructure that your event business owns. No fluff, no vanity metrics, no long-term lock-ins.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Monthly Retainer</h3>
              <p className="mt-2 text-2xl font-extrabold">From $3,500<span className="text-base font-normal text-zinc-500">/mo</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Full-service SEO: strategy, on-page, local SEO, content, link building, GBP, AI search, analytics. The complete platform for event businesses serious about consistent bookings.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Project-Based</h3>
              <p className="mt-2 text-2xl font-extrabold">From $2,500</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Website builds, portfolio optimization, SEO audits, GBP setup, or programmatic page generation as standalone projects for your event business.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Consulting</h3>
              <p className="mt-2 text-2xl font-extrabold">From $150<span className="text-base font-normal text-zinc-500">/hr</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Strategic advisory for event professionals who want to manage their own SEO. Get expert guidance on portfolio optimization, GBP, and content without a retainer.
              </p>
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
          SECTION 9 — REGION COVERAGE
          ============================================================ */}
      {catContent && (
        <section className="bg-[#141414] py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl">Event Business SEO by Region</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              Each region has unique venue landscapes, event traditions, and competitive dynamics. We tailor your event business SEO strategy to match the areas where your clients celebrate.
            </p>
            <div className="mt-10 space-y-4">
              {regions.map((region) => {
                const regionNote = catContent.regionNotes[region];
                if (!regionNote) return null;
                const neighborhoods = neighborhoodsByRegion[region];
                const topNeighborhoods = neighborhoods ? neighborhoods.slice(0, 4) : [];
                return (
                  <div key={region} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6">
                    <h3 className="text-lg font-semibold text-white">Event SEO in {region}</h3>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{regionNote}</p>
                    {topNeighborhoods.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {topNeighborhoods.map((n) => (
                          <Link
                            key={n.slug}
                            href={`/wedding-planner/${n.slug}`}
                            className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-[#5CB8FF] hover:border-[#0080FE] hover:text-white"
                          >
                            {n.name}
                          </Link>
                        ))}
                        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-500">
                          +{(neighborhoods?.length ?? 0) - 4} more areas
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 11 — FAQ
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">FAQ: SEO for Event Businesses</h2>
          <p className="mt-4 text-zinc-400">
            Common questions from wedding planners, photographers, DJs, and event professionals about SEO and digital marketing in NYC.
          </p>
          <div className="mt-10 space-y-4">
            {seoFaqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12 — CROSS-LINKS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Other Industries We Help With SEO</h2>
          <p className="mt-2 text-zinc-500">
            We build SEO and AI search platforms for{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170+ business types</Link>{" "}
            across the NYC metro area.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {categories
              .filter((c) => c !== CATEGORY)
              .slice(0, 8)
              .map((cat) => (
                <Link
                  key={cat}
                  href={`/businesses/${categoryToSlug(cat)}`}
                  className="rounded-xl border border-zinc-800 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]/50"
                >
                  <h3 className="font-medium text-white">{cat}</h3>
                  <p className="mt-1 text-xs text-zinc-500">SEO &amp; AI Search</p>
                </Link>
              ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3 border-t border-zinc-800 pt-8">
            <Link href="/businesses" className="text-sm text-[#0080FE] hover:text-white">All Businesses</Link>
            <span className="text-zinc-700">|</span>
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
            <Link href="/services/content-marketing" className="text-sm text-[#0080FE] hover:text-white">Content Marketing</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/web-design-development" className="text-sm text-[#0080FE] hover:text-white">Web Design</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/ai-agent-development" className="text-sm text-[#0080FE] hover:text-white">AI Agent Development</Link>
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
