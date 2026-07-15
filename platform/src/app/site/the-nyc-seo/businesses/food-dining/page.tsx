import { safeJsonLd } from '@/lib/escape-html'
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

const CATEGORY = "Food & Dining";
const SLUG = "food-dining";

export const metadata: Metadata = {
  title: "SEO for Restaurants & Food NYC",
  description:
    "SEO and AI search optimization for restaurants, caterers, bakeries, and food trucks in NYC. Local SEO, Google Maps, and AI search across 318+ neighborhoods.",
  alternates: { canonical: `${SITE_URL}/businesses/${SLUG}` },
  openGraph: {
    title: "SEO for Restaurants & Food NYC",
    description:
      "SEO and AI search optimization for restaurants, caterers, bakeries, and food trucks in NYC. Rank across 318+ neighborhoods.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
};

export default function FoodDiningPage() {
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
    name: "SEO for Restaurants & Food Businesses NYC",
    description:
      "Full-service SEO, AI search optimization, and digital marketing for restaurants, caterers, bakeries, and food trucks in NYC, New Jersey, Long Island, and Westchester.",
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
      name: "Food & Dining SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Restaurant Local SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Restaurant Google Business Profile Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Food Business Content Marketing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Restaurant AI Search Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Food Business Programmatic SEO" } },
      ],
    },
  };

  const seoFaqs = [
    {
      q: "How much does SEO cost for a restaurant in NYC?",
      a: "SEO retainers for restaurants and food businesses start at $3,500/month, covering local SEO, Google Business Profile optimization, content marketing, on-page SEO, and AI search optimization. Project-based work like website builds or GBP optimization starts at $2,500. The investment depends on your competitive landscape, number of locations, and whether you're targeting delivery, dine-in, catering, or all three. A single-location bakery needs less than a multi-location restaurant group.",
    },
    {
      q: "How long until my restaurant ranks on Google in NYC?",
      a: "Most restaurants see measurable ranking improvements in 60-90 days, with significant gains in 4-6 months. Google Business Profile optimizations can impact your Maps ranking within weeks — critical for restaurants since Maps drives a massive share of dining decisions. Competitive neighborhoods like the West Village, Williamsburg, and the Lower East Side take longer. We provide monthly progress reports from day one.",
    },
    {
      q: "Do you work with caterers and food trucks or just restaurants?",
      a: "We work with every type of food and dining business: restaurants (all cuisine types), caterers, bakeries, food trucks, ghost kitchens, meal prep services, and specialty food shops. Each business type requires a different keyword strategy because someone searching for a caterer has completely different intent than someone looking for a restaurant nearby.",
    },
    {
      q: "Can you help my restaurant show up on ChatGPT and Perplexity?",
      a: "Yes. AI search optimization is one of our core services. When someone asks ChatGPT 'best Italian restaurant in Park Slope' or 'find a caterer for a corporate event in Midtown,' we structure your content so your business is the one that gets recommended. We build the entity relationships, authority signals, and structured data that AI platforms use to generate answers.",
    },
    {
      q: "How do you handle Google Business Profile for restaurants?",
      a: "We optimize every element: primary and secondary categories (Restaurant, Italian Restaurant, Catering Service, etc.), business description, menu items and pricing, service areas, weekly Google Posts featuring specials and events, Q&A seeding with common dining questions, photo optimization of your food and space, review generation strategy, and review response management. For multi-location restaurants, we manage separate profiles for each.",
    },
    {
      q: "What makes your SEO different from other agencies for restaurants?",
      a: "Three things. First, we build on Next.js, not WordPress, so your site loads fast and scores 95+ on Core Web Vitals — critical for diners searching on their phones. Second, we use programmatic SEO to generate hundreds of neighborhood-specific pages at scale. Third, we optimize for AI search platforms like ChatGPT and Perplexity, which are rapidly becoming how people discover restaurants. We also offer Full Loop CRM so catering inquiries actually get followed up on.",
    },
    {
      q: "Do you build location pages for food businesses?",
      a: `Yes. We generate optimized landing pages for every neighborhood you serve. A caterer targeting the full NYC metro area gets ${totalNeighborhoods}+ unique pages — each targeting searches like "caterer in Tribeca" or "wedding catering Brooklyn" with original content, schema markup, and internal linking.`,
    },
    {
      q: "Do you help with online ordering and delivery SEO?",
      a: "Yes. We optimize your presence for delivery-related searches, build landing pages targeting 'food delivery [neighborhood]' and '[cuisine] delivery near me' queries, and ensure your Google Business Profile reflects delivery options and service areas. For restaurants relying on third-party platforms, we also build direct-ordering SEO strategies to reduce commission fees.",
    },
  ];

  const faqSchema = getFAQPageSchema(seoFaqs);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

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
                  Restaurants &amp; Food
                </span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                NYC has 27,000+ restaurants and thousands more caterers, bakeries, and food trucks competing for diners. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that rank{" "}
                <Link href="/restaurant" className="text-[#5CB8FF] hover:text-[#8DD0FF]">restaurants</Link>,{" "}
                <Link href="/caterer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">caterers</Link>,{" "}
                <Link href="/bakery" className="text-[#5CB8FF] hover:text-[#8DD0FF]">bakeries</Link>, and{" "}
                <Link href="/food-truck" className="text-[#5CB8FF] hover:text-[#8DD0FF]">food trucks</Link>{" "}
                across {totalNeighborhoods}+ neighborhoods in{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC, New Jersey, Long Island &amp; Westchester</Link>.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Stats Card */}
            <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-8">
              <h2 className="text-lg font-semibold text-[#0080FE]">Food &amp; Dining SEO at a Glance</h2>
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
          SECTION 2 — WHY FOOD BUSINESSES NEED SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why Restaurants &amp; Food Businesses Need SEO in NYC</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            &ldquo;Restaurants near me&rdquo; is one of the most searched phrases in the country, and in NYC the competition for those clicks is brutal. With 27,000+ restaurants and a constant stream of new openings, your food business cannot rely on foot traffic and word of mouth alone. When someone searches &ldquo;best Thai food Astoria&rdquo; or asks ChatGPT &ldquo;where to eat in the West Village,&rdquo; your business needs to be the answer. Without{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            and a deliberate{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>, your restaurant is invisible to the diners actively searching right now.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#0080FE]">27,000+</p>
              <p className="mt-2 text-sm text-zinc-400">restaurants in NYC competing for diners</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#EFF70A]">1B+</p>
              <p className="mt-2 text-sm text-zinc-400">&ldquo;restaurants near me&rdquo; searches per year</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-white">76%</p>
              <p className="mt-2 text-sm text-zinc-400">of local searches lead to a visit within 24 hours</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHAT WE BUILD
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What We Build for Food &amp; Dining Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every food business client gets a complete{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO and digital marketing platform</Link>{" "}
            — not piecemeal tactics. Here is what your restaurant, caterer, bakery, or food truck gets.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                num: "01",
                title: "SEO Strategy & Competitive Audit",
                desc: "We audit your current rankings, analyze competing restaurants in your neighborhood, research high-intent keywords like 'best sushi Williamsburg' and 'caterer for corporate events NYC,' and build a 90-day roadmap tailored to your cuisine and market.",
                href: "/services/seo-strategy",
                link: "SEO strategy",
              },
              {
                num: "02",
                title: "Website Design & Development",
                desc: "Fast, mobile-first website on Next.js with menu integration, online ordering capability, reservation CTAs, event inquiry forms, and photo galleries that make diners hungry. Scores 95+ on Core Web Vitals.",
                href: "/services/web-design-development",
                link: "web design",
              },
              {
                num: "03",
                title: "On-Page & Technical SEO",
                desc: "Title tags targeting '[cuisine] restaurant [neighborhood],' meta descriptions, Restaurant and Menu schema markup, internal linking, image optimization for food photography, Core Web Vitals, and crawlability management.",
                href: "/services/on-page-seo",
                link: "on-page SEO",
              },
              {
                num: "04",
                title: "Local SEO & Google Maps",
                desc: "Google Business Profile optimization with cuisine categories, menu items, weekly Posts featuring specials and events, citation building across 50+ food directories (Yelp, OpenTable, Resy, The Infatuation), review generation, and geo-grid rank tracking.",
                href: "/services/local-seo",
                link: "local SEO",
              },
              {
                num: "05",
                title: "Content Marketing",
                desc: "SEO-optimized pages for every cuisine and service type you offer, blog content targeting long-tail keywords like 'best birthday dinner spots Brooklyn' and 'corporate lunch catering Midtown,' plus seasonal content and event guides.",
                href: "/services/content-marketing",
                link: "content marketing",
              },
              {
                num: "06",
                title: "Programmatic Location Pages",
                desc: `Automated landing pages for every neighborhood — "Italian restaurant in Tribeca," "caterer Hoboken," "bakery Park Slope." ${totalNeighborhoods}+ pages, each with unique content, menu highlights, and local schema.`,
                href: "/services/automation",
                link: "programmatic SEO",
              },
              {
                num: "07",
                title: "AI Search Optimization",
                desc: "We make ChatGPT, Perplexity, Gemini, and Claude recommend your restaurant or food business. When a tourist asks 'where should I eat in SoHo?' or a local asks for catering recommendations, your business is what gets surfaced.",
                href: "/services/ai-search-optimization",
                link: "AI search optimization",
              },
              {
                num: "08",
                title: "Off-Page SEO & Link Building",
                desc: "Earned backlinks from food publications (Eater, Infatuation, TimeOut), food blogger outreach, local press coverage, directory listings optimization, brand mentions, and review management across all major platforms.",
                href: "/services/off-page-seo",
                link: "off-page SEO",
              },
              {
                num: "09",
                title: "Google Business Profile",
                desc: "Complete GBP setup: cuisine categories, menu items with pricing, hours and holiday schedules, weekly Posts with specials and events, Q&A seeding, photo optimization of your dishes and space, review responses, and ongoing management.",
                href: "/services/google-business-profile",
                link: "GBP optimization",
              },
              {
                num: "10",
                title: "Analytics & Reservation Tracking",
                desc: "Monthly reporting on keyword rankings, organic traffic, reservation clicks, delivery orders, catering inquiries, and ROI. Google Analytics, Search Console, and custom dashboards. Every dollar accounted for.",
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
          <h2 className="text-3xl font-bold sm:text-4xl">How We Rank Restaurants &amp; Food Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Our process has ranked hundreds of{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
            across the NYC metro area. Here is how it works for food and dining businesses specifically.
          </p>
          <div className="mt-10 space-y-6">
            {[
              { step: "1. Audit Your Competitive Landscape", detail: "We crawl your current site, pull ranking data for every cuisine and service keyword, analyze the top-ranking restaurants in your target neighborhoods, and identify where you are losing diners to competitors. This becomes your strategy document." },
              { step: "2. Build a Conversion-Ready Website", detail: "We build (or rebuild) your site on Next.js with high-quality food photography, menu pages, online ordering integration, reservation CTAs, catering inquiry forms, and event booking. Mobile-first because 70%+ of restaurant searches happen on phones." },
              { step: "3. Optimize Every Page for Search", detail: "On-page SEO across your entire site — title tags targeting 'Thai restaurant Lower East Side,' Menu schema markup, Recipe schema for signature dishes, internal linking architecture, and image optimization that loads fast without sacrificing food photography quality." },
              { step: "4. Launch Neighborhood Landing Pages", detail: `Programmatic generation of ${totalNeighborhoods}+ neighborhood-specific pages. Each page targets "restaurant in [neighborhood]" or "caterer near [neighborhood]" with unique content, local schema, and internal links to your menu and services.` },
              { step: "5. Dominate Google Maps", detail: "Full Google Business Profile optimization, citation building across 50+ directories (Yelp, OpenTable, Resy, Google, Bing, TripAdvisor), review generation strategy with QR codes and follow-up emails, and geo-grid rank tracking for your neighborhoods." },
              { step: "6. Build Authority with Content & Links", detail: "Ongoing content marketing (cuisine guides, seasonal menus, event hosting pages, neighborhood dining guides) and off-page SEO (food blogger outreach, editorial backlinks from Eater, Infatuation, TimeOut, and local press) to build domain authority." },
              { step: "7. Optimize for AI Search", detail: "We structure your content so ChatGPT, Perplexity, Gemini, and Claude recommend your restaurant. Restaurant discovery via AI assistants is exploding in 2026 — when someone asks 'best date night restaurant in Brooklyn,' we make sure you are the answer." },
              { step: "8. Measure, Report, Improve", detail: "Monthly reporting on keyword rankings, organic traffic, reservation clicks, delivery orders, catering inquiries, and ROI. Quarterly strategy reviews. You always know what your investment produces and where to double down." },
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
            <h2 className="text-3xl font-bold sm:text-4xl">Understanding the Food &amp; Dining Market in NYC</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              To build an effective{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              for your food business, we study your market inside and out — how diners search, what makes them choose one restaurant over another, and which keywords drive the highest-value customers.
            </p>

            <h3 className="mt-10 text-xl font-semibold">What Your Potential Customers Are Looking For</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              We use these diner decision factors to shape your{" "}
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

            <h3 className="mt-10 text-xl font-semibold">Why Local SEO Matters for Food Businesses</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              These are the realities of the NYC food and dining market — and exactly why{" "}
              <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
              is the most important investment your restaurant can make.
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
                <h3 className="mt-10 text-xl font-semibold">Food &amp; Dining Pricing Context We Build Into Your Strategy</h3>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                  {catContent.investmentContext} Understanding your industry&apos;s pricing landscape helps us craft{" "}
                  <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">keyword strategies</Link>{" "}
                  that target the searches with the highest customer lifetime value — private dining, catering, and repeat diner keywords.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Food &amp; Dining Business Types We Serve</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every food business type gets a tailored{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
            because a restaurant, caterer, bakery, and food truck each face different competitive landscapes and search intent patterns.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-2">
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
          <h2 className="text-3xl font-bold sm:text-4xl">SEO Pricing for Restaurants &amp; Food Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every dollar goes into strategy, content, optimization, and infrastructure that your food business owns. No fluff, no vanity metrics, no long-term lock-ins.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Monthly Retainer</h3>
              <p className="mt-2 text-2xl font-extrabold">From $3,500<span className="text-base font-normal text-zinc-500">/mo</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Full-service SEO: strategy, on-page, local SEO, content, link building, GBP, AI search, analytics. The complete platform for restaurants and food businesses serious about filling seats.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Project-Based</h3>
              <p className="mt-2 text-2xl font-extrabold">From $2,500</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Website builds, SEO audits, GBP optimization, menu page optimization, or programmatic page generation as standalone projects for your food business.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Consulting</h3>
              <p className="mt-2 text-2xl font-extrabold">From $150<span className="text-base font-normal text-zinc-500">/hr</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Strategic advisory for restaurant owners who want to manage their own SEO. Get expert guidance on keyword targeting, GBP, and content without a retainer commitment.
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
            <h2 className="text-3xl font-bold sm:text-4xl">Restaurant &amp; Food SEO by Region</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              Each region has unique dining cultures, cuisine preferences, and competitive dynamics. We tailor your food business SEO strategy to match the neighborhoods you serve.
            </p>
            <div className="mt-10 space-y-4">
              {regions.map((region) => {
                const regionNote = catContent.regionNotes[region];
                if (!regionNote) return null;
                const neighborhoods = neighborhoodsByRegion[region];
                const topNeighborhoods = neighborhoods ? neighborhoods.slice(0, 4) : [];
                return (
                  <div key={region} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6">
                    <h3 className="text-lg font-semibold text-white">Food &amp; Dining SEO in {region}</h3>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{regionNote}</p>
                    {topNeighborhoods.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {topNeighborhoods.map((n) => (
                          <Link
                            key={n.slug}
                            href={`/restaurant/${n.slug}`}
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
          <h2 className="text-3xl font-bold sm:text-4xl">FAQ: SEO for Restaurants &amp; Food Businesses</h2>
          <p className="mt-4 text-zinc-400">
            Common questions from restaurant owners, caterers, and food business operators about SEO and digital marketing in NYC.
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
            <Link href="/services/automation" className="text-sm text-[#0080FE] hover:text-white">Automation</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/off-page-seo" className="text-sm text-[#0080FE] hover:text-white">Off-Page SEO</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/marketing-consulting" className="text-sm text-[#0080FE] hover:text-white">Marketing Consulting</Link>
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
