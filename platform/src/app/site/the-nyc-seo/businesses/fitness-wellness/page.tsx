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

const CATEGORY = "Fitness & Wellness";
const SLUG = "fitness-wellness";

export const metadata: Metadata = {
  title: "SEO for Fitness & Wellness NYC",
  description:
    "SEO and AI search optimization for fitness and wellness businesses in NYC. Gyms, personal trainers, yoga studios, Pilates, and martial arts. Rank across 318+ neighborhoods.",
  alternates: { canonical: `${SITE_URL}/businesses/${SLUG}` },
  openGraph: {
    title: "SEO for Fitness & Wellness NYC",
    description:
      "SEO and AI search optimization for fitness and wellness businesses in NYC. Gyms, personal trainers, yoga studios, Pilates, and martial arts.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
};

export default function FitnessWellnessPage() {
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
    name: "SEO for Fitness & Wellness Businesses NYC",
    description:
      "Full-service SEO, AI search optimization, and digital marketing for fitness and wellness businesses in NYC, New Jersey, Long Island, and Westchester.",
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
      name: "Fitness & Wellness SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fitness Local SEO" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Gym Google Business Profile Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fitness Content Marketing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Wellness AI Search Optimization" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Fitness Programmatic SEO" } },
      ],
    },
  };

  const seoFaqs = [
    {
      q: "How much does SEO cost for a fitness or gym business in NYC?",
      a: "SEO retainers for fitness and wellness businesses start at $3,500/month, covering local SEO, Google Business Profile optimization, content marketing, on-page SEO, and AI search optimization. Project-based work like website builds or GBP optimization starts at $2,500. The investment depends on how many locations you operate and how many neighborhoods you want to dominate. A single-location yoga studio needs less than a multi-location gym chain.",
    },
    {
      q: "How long until my gym or studio ranks on Google in NYC?",
      a: "Most fitness businesses see measurable ranking improvements in 60-90 days, with significant gains in 4-6 months. Google Business Profile optimizations can impact your Maps ranking within weeks. Competitive neighborhoods like the Upper East Side, Williamsburg, and Park Slope take longer because more studios are fighting for the same spots. We provide monthly progress reports from day one.",
    },
    {
      q: "Do you work with personal trainers or just gyms?",
      a: "We work with every type of fitness and wellness business: personal trainers, yoga studios, Pilates studios, gyms, martial arts schools, boxing gyms, CrossFit boxes, dance studios, and wellness centers. Each business type gets a tailored keyword strategy because someone searching for a personal trainer has different intent than someone searching for a gym membership.",
    },
    {
      q: "Can you help my fitness business show up on ChatGPT and Perplexity?",
      a: "Yes. AI search optimization is one of our core services. When someone asks ChatGPT 'best yoga studio in Williamsburg' or 'find a personal trainer near me in Midtown,' we make sure your business is what gets recommended. We structure your content with entity relationships, authority signals, and citation patterns that AI platforms use to formulate answers.",
    },
    {
      q: "How do you handle SEO for fitness businesses with multiple locations?",
      a: "Each location gets its own Google Business Profile, dedicated landing pages for surrounding neighborhoods, and location-specific content. We build a separate local SEO strategy for each location while maintaining brand consistency across all of them. Multi-location gyms benefit from programmatic page generation that scales content across every service area.",
    },
    {
      q: "What makes your agency different for fitness SEO?",
      a: "Three things separate us. First, we build on Next.js, not WordPress, so your site scores 95+ on Core Web Vitals and loads faster than your competitors. Second, we use programmatic SEO to generate hundreds of neighborhood-specific pages at scale. Third, we optimize for AI search platforms like ChatGPT and Perplexity, which 95% of agencies still ignore. We also provide Full Loop CRM to convert traffic into booked sessions.",
    },
    {
      q: "Do you build location pages for fitness businesses?",
      a: `Yes. We generate optimized landing pages for every neighborhood you serve. A gym targeting the full NYC metro area gets ${totalNeighborhoods}+ unique pages, each targeting searches like "gym in Astoria" or "personal trainer Park Slope" with original content, schema markup, and internal linking.`,
    },
    {
      q: "How do you handle Google Business Profile for gyms and studios?",
      a: "We optimize every element: primary and secondary categories, business description, service areas covering every neighborhood you serve, class listings, weekly Google Posts featuring promotions and class schedules, Q&A seeding with common fitness questions, photo optimization, review generation strategy, and review response management. For multi-location businesses, we manage separate profiles for each gym or studio.",
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
                  Fitness &amp; Wellness
                </span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                NYC has over 3,500 gyms and studios competing for the same local searches. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that rank{" "}
                <Link href="/personal-trainer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal trainers</Link>,{" "}
                <Link href="/yoga-studio" className="text-[#5CB8FF] hover:text-[#8DD0FF]">yoga studios</Link>,{" "}
                <Link href="/gym" className="text-[#5CB8FF] hover:text-[#8DD0FF]">gyms</Link>,{" "}
                <Link href="/pilates" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Pilates studios</Link>, and{" "}
                <Link href="/martial-arts" className="text-[#5CB8FF] hover:text-[#8DD0FF]">martial arts schools</Link>{" "}
                across {totalNeighborhoods}+ neighborhoods in{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC, New Jersey, Long Island &amp; Westchester</Link>.
              </p>
              <CTAGroup variant="hero" />
            </div>

            {/* Stats Card */}
            <div className="rounded-2xl border border-zinc-800 bg-[#141414] p-8">
              <h2 className="text-lg font-semibold text-[#0080FE]">Fitness &amp; Wellness SEO at a Glance</h2>
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
          SECTION 2 — WHY FITNESS NEEDS SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">Why Fitness &amp; Wellness Businesses Need SEO in NYC</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every day, thousands of New Yorkers search Google for &ldquo;gym near me,&rdquo; &ldquo;yoga classes [neighborhood],&rdquo; and &ldquo;best personal trainer NYC.&rdquo; If your fitness business is not ranking in the{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Local Pack</Link>{" "}
            or showing up when someone asks ChatGPT for a recommendation, you are losing members to competitors who invested in{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>. The fitness industry in NYC is uniquely competitive because proximity drives membership decisions. A potential member will almost always choose a studio within walking distance over one across town. That means you need to rank in your specific neighborhood, not just &ldquo;NYC&rdquo; broadly.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#0080FE]">3,500+</p>
              <p className="mt-2 text-sm text-zinc-400">gyms and studios in NYC alone</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-[#EFF70A]">72%</p>
              <p className="mt-2 text-sm text-zinc-400">of gym seekers choose within 15 min of home</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 text-center">
              <p className="text-3xl font-extrabold text-white">46%</p>
              <p className="mt-2 text-sm text-zinc-400">of Google searches have local intent</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — WHAT WE BUILD
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">What We Build for Fitness &amp; Wellness Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every fitness client gets a complete{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO and digital marketing platform</Link>{" "}
            — not piecemeal tactics. Here is what your gym, studio, or training business gets.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                num: "01",
                title: "SEO Strategy & Competitive Audit",
                desc: "We audit your current rankings, analyze competing gyms and studios in your target neighborhoods, research high-intent keywords like 'yoga classes Williamsburg' and 'personal trainer Upper East Side,' and build a 90-day roadmap.",
                href: "/services/seo-strategy",
                link: "SEO strategy",
              },
              {
                num: "02",
                title: "Website Design & Development",
                desc: "Fast, mobile-first website on Next.js with class schedule integration, trainer bios, membership pricing, and conversion-optimized CTAs. Scores 95+ on Core Web Vitals. Built to scale to hundreds of pages.",
                href: "/services/web-design-development",
                link: "web design",
              },
              {
                num: "03",
                title: "On-Page & Technical SEO",
                desc: "Title tags, meta descriptions, schema markup for fitness businesses (LocalBusiness, SportsActivityLocation), internal linking, image optimization, Core Web Vitals, and crawlability management.",
                href: "/services/on-page-seo",
                link: "on-page SEO",
              },
              {
                num: "04",
                title: "Local SEO & Google Maps",
                desc: "Google Business Profile optimization with class categories, trainer listings, weekly Posts featuring promotions, citation building across 50+ fitness directories, review generation, and geo-grid rank tracking.",
                href: "/services/local-seo",
                link: "local SEO",
              },
              {
                num: "05",
                title: "Content Marketing",
                desc: "SEO-optimized service pages for every class type you offer, blog content targeting long-tail keywords like 'best reformer Pilates for back pain NYC,' FAQ pages, and fitness guides that build topical authority.",
                href: "/services/content-marketing",
                link: "content marketing",
              },
              {
                num: "06",
                title: "Programmatic Location Pages",
                desc: `Automated landing pages for every neighborhood — "personal trainer in Park Slope," "yoga studio Astoria," "gym Hoboken." ${totalNeighborhoods}+ pages, each with unique content and schema.`,
                href: "/services/automation",
                link: "programmatic SEO",
              },
              {
                num: "07",
                title: "AI Search Optimization",
                desc: "We make ChatGPT, Perplexity, Gemini, and Claude recommend your fitness business. Structured data, entity relationships, and content architecture built for AI crawlers that are reshaping how people find studios.",
                href: "/services/ai-search-optimization",
                link: "AI search optimization",
              },
              {
                num: "08",
                title: "Off-Page SEO & Link Building",
                desc: "Earned backlinks from fitness publications, wellness directories, local press coverage, ClassPass and Mindbody listings optimization, brand mentions, and a review management strategy.",
                href: "/services/off-page-seo",
                link: "off-page SEO",
              },
              {
                num: "09",
                title: "Google Business Profile",
                desc: "Complete GBP setup: fitness categories, class listings, trainer photos, weekly Posts with class schedules and promos, Q&A seeding, review responses, and ongoing management that drives local pack visibility.",
                href: "/services/google-business-profile",
                link: "GBP optimization",
              },
              {
                num: "10",
                title: "Analytics & Lead Tracking",
                desc: "Monthly reporting on keyword rankings, organic traffic, membership inquiries, call tracking, and ROI. Google Analytics, Search Console, and custom dashboards. You see exactly what SEO produces.",
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
          <h2 className="text-3xl font-bold sm:text-4xl">How We Rank Fitness &amp; Wellness Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Our process has ranked hundreds of{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local service businesses</Link>{" "}
            across the NYC metro area. Here is how it works for fitness and wellness businesses specifically.
          </p>
          <div className="mt-10 space-y-6">
            {[
              { step: "1. Audit Your Competitive Landscape", detail: "We crawl your current site, pull ranking data, analyze the top-ranking gyms and studios in your target neighborhoods, and identify keyword gaps. We map every competitor in your service radius so your strategy attacks the real opportunities." },
              { step: "2. Build a Fast, Conversion-Ready Website", detail: "We build (or rebuild) your site on Next.js with class schedules, trainer profiles, membership tiers, and CTAs designed to convert browsers into booked trial classes. Mobile-first. 95+ Core Web Vitals. No WordPress bloat." },
              { step: "3. Optimize Every Page for Search", detail: "On-page SEO across your entire site — title tags targeting 'yoga studio [neighborhood],' meta descriptions, heading hierarchy, image alt text, internal linking, and fitness-specific schema markup (SportsActivityLocation, ExerciseAction)." },
              { step: "4. Launch Neighborhood Landing Pages", detail: `Programmatic generation of ${totalNeighborhoods}+ neighborhood-specific pages. Each page targets "personal trainer in [neighborhood]" or "gym near [neighborhood]" with unique content, local schema, and internal links to your service pages.` },
              { step: "5. Dominate Google Maps", detail: "Full Google Business Profile optimization, citation building across 50+ directories (Yelp, ClassPass, Mindbody, local fitness directories), review generation strategy, and geo-grid rank tracking to monitor your local pack positions." },
              { step: "6. Build Authority with Content & Links", detail: "Ongoing content marketing (class type pages, workout guides, trainer spotlights) and off-page SEO (editorial backlinks, fitness publication features, local press) to build domain authority month over month." },
              { step: "7. Optimize for AI Search", detail: "We structure your content so ChatGPT, Perplexity, Gemini, and Claude recommend your fitness business. When someone asks an AI assistant 'best yoga studio in Brooklyn,' your business is the answer." },
              { step: "8. Measure, Report, Improve", detail: "Monthly reporting on keyword rankings, organic traffic, trial class bookings, and ROI. Quarterly strategy reviews to adjust targeting as you grow. You always know what your investment produces." },
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
            <h2 className="text-3xl font-bold sm:text-4xl">Understanding the Fitness &amp; Wellness Market in NYC</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              To build an effective{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              for your fitness business, we study your market inside and out — how members search, what makes them choose one studio over another, and which keywords drive the highest-value traffic.
            </p>

            <h3 className="mt-10 text-xl font-semibold">What Your Potential Members Are Looking For</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              We use these member decision factors to shape your{" "}
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

            <h3 className="mt-10 text-xl font-semibold">Why Local SEO Matters for Fitness Businesses</h3>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              These are the realities of the NYC fitness market — and exactly why{" "}
              <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
              is the most important investment your studio can make.
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
                <h3 className="mt-10 text-xl font-semibold">Fitness Pricing Context We Build Into Your Strategy</h3>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                  {catContent.investmentContext} Understanding your industry&apos;s pricing helps us craft{" "}
                  <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">keyword strategies</Link>{" "}
                  that target the searches with the highest lifetime-value members.
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
          <h2 className="text-3xl font-bold sm:text-4xl">Fitness &amp; Wellness Business Types We Serve</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every fitness business type gets a tailored{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
            because the keywords, competition, and customer intent differ for each.
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
          <h2 className="text-3xl font-bold sm:text-4xl">SEO Pricing for Fitness &amp; Wellness Businesses</h2>
          <p className="mt-6 text-zinc-300 leading-relaxed">
            Every dollar goes into strategy, content, optimization, and infrastructure that your fitness business owns. No fluff, no vanity metrics, no long-term lock-ins.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Monthly Retainer</h3>
              <p className="mt-2 text-2xl font-extrabold">From $3,500<span className="text-base font-normal text-zinc-500">/mo</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Full-service SEO: strategy, on-page, local SEO, content, link building, GBP, AI search, analytics. The complete platform for gyms and studios serious about ranking.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Project-Based</h3>
              <p className="mt-2 text-2xl font-extrabold">From $2,500</p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Website builds, SEO audits, GBP optimization, citation building, or programmatic page generation as standalone projects for your fitness business.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
              <h3 className="font-semibold text-[#0080FE]">Consulting</h3>
              <p className="mt-2 text-2xl font-extrabold">From $150<span className="text-base font-normal text-zinc-500">/hr</span></p>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Strategic advisory for fitness businesses that want to manage their own SEO. Get expert guidance on keyword targeting, GBP, and content without a retainer.
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
            <h2 className="text-3xl font-bold sm:text-4xl">Fitness SEO by Region</h2>
            <p className="mt-6 text-zinc-300 leading-relaxed">
              Each region has unique search patterns, competitive dynamics, and member demographics. We tailor your fitness SEO strategy to match the neighborhoods you serve.
            </p>
            <div className="mt-10 space-y-4">
              {regions.map((region) => {
                const regionNote = catContent.regionNotes[region];
                if (!regionNote) return null;
                const neighborhoods = neighborhoodsByRegion[region];
                const topNeighborhoods = neighborhoods ? neighborhoods.slice(0, 4) : [];
                return (
                  <div key={region} className="rounded-xl border border-zinc-700 bg-[#0A0A0A] p-6">
                    <h3 className="text-lg font-semibold text-white">Fitness SEO in {region}</h3>
                    <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{regionNote}</p>
                    {topNeighborhoods.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {topNeighborhoods.map((n) => (
                          <Link
                            key={n.slug}
                            href={`/gym/${n.slug}`}
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
          <h2 className="text-3xl font-bold sm:text-4xl">FAQ: SEO for Fitness &amp; Wellness Businesses</h2>
          <p className="mt-4 text-zinc-400">
            Common questions from gym owners, studio operators, and personal trainers about SEO and digital marketing in NYC.
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
            <Link href="/services/branding" className="text-sm text-[#0080FE] hover:text-white">Branding</Link>
            <span className="text-zinc-700">|</span>
            <Link href="/services/search-engine-optimization" className="text-sm text-[#0080FE] hover:text-white">Technical SEO</Link>
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
