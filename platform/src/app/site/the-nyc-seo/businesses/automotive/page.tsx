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
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/the-nyc-seo/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

const CATEGORY = "Automotive";
const SLUG = "automotive";

export const metadata: Metadata = {
  title: "SEO for Automotive Businesses NYC",
  description:
    "SEO and local search optimization for auto mechanics, body shops, towing companies, car detailing, and auto glass in NYC. Get found when drivers need you.",
  openGraph: {
    title: "SEO for Automotive Businesses NYC",
    description:
      "SEO and local search optimization for auto mechanics, body shops, towing companies, car detailing, and auto glass in NYC. Get found when drivers need you.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "How does SEO help an auto mechanic shop get more customers?",
    a: "When someone's car breaks down or they need routine maintenance, they search 'auto mechanic near me' or 'car repair [neighborhood].' SEO puts your shop at the top of those results. We optimize your Google Business Profile so you appear in the local map pack, build location-specific pages targeting every neighborhood you serve, and create content around common repair questions that drives organic traffic. The result: more phone calls, more walk-ins, and higher-value repair jobs.",
  },
  {
    q: "How long before our auto shop starts ranking on Google?",
    a: "Most automotive businesses see meaningful ranking improvements within 2-4 months. Local pack rankings (Google Maps) often move faster because automotive searches are heavily local. Competitive terms like 'auto body shop Brooklyn' or 'car detailing Manhattan' may take 4-6 months to crack the top positions. Emergency searches like 'towing near me' can rank quickly because Google heavily favors proximity and relevance for urgent queries.",
  },
  {
    q: "What keywords should automotive businesses target?",
    a: "We target three categories: emergency keywords ('towing near me,' 'flat tire help'), service keywords ('brake repair NYC,' 'oil change Brooklyn,' 'ceramic coating Queens'), and research keywords ('how much does a transmission repair cost in NYC'). Each keyword type maps to a different page type and conversion path. Emergency keywords need your phone number front and center. Service keywords need detailed pages. Research keywords need helpful content that builds trust.",
  },
  {
    q: "Do you manage Google reviews for auto shops?",
    a: "Review management is a core part of our local SEO service. We implement review acquisition systems that encourage satisfied customers to leave Google reviews, provide response templates for positive and negative reviews, and monitor your review profile for reputation threats. For auto shops, reviews are especially critical because trust is everything when someone is handing over their car and their credit card.",
  },
  {
    q: "How much does SEO cost for an automotive business?",
    a: "Our monthly retainer starts at $3,500/month for full-service SEO including strategy, content, technical optimization, GBP management, and reporting. Project-based work starts at $2,500, and hourly consulting is $150/hour. For automotive businesses, the ROI is strong: a single engine repair job can be worth $2,000-$5,000, meaning one new customer per month more than covers the investment.",
  },
  {
    q: "Can SEO help a towing company get emergency calls?",
    a: "Absolutely. Towing searches are almost entirely 'near me' and emergency-driven, which means Google Maps and local SEO dominate. We optimize your Google Business Profile for 24/7 availability, build pages targeting every neighborhood and highway corridor you serve, ensure your phone number is click-to-call on mobile, and get your site loading fast enough that someone stranded on the BQE doesn't bounce to a competitor.",
  },
  {
    q: "What about AI search — does it matter for auto shops?",
    a: "It's becoming increasingly important. When someone asks ChatGPT or Perplexity 'best auto mechanic in Astoria' or 'where to get a car detailed in NYC,' AI models pull from web content to generate recommendations. Our AI search optimization ensures your business is structured, cited, and authoritative enough to be included in those AI-generated responses. This is a competitive advantage most auto shops haven't even considered yet.",
  },
  {
    q: "Do you build websites for auto shops or just do SEO?",
    a: "We do both. Many auto shops have outdated websites that can't rank regardless of how much SEO work is done. Our web design and development service builds fast, mobile-first sites specifically designed for automotive businesses — prominent phone numbers, service menus, online scheduling, and photo galleries that showcase your work. A great site is the foundation that SEO builds on.",
  },
];

export default function AutomotiveBusinessesPage() {
  const services = getServicesByCategorySlug(SLUG);
  const content = categoryContent[CATEGORY];
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const allCategories = getCategories();

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
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Automotive Businesses NYC",
    description:
      "Search engine optimization, local SEO, and AI search optimization for automotive businesses including auto mechanics, body shops, towing services, car detailing, and auto glass repair in the NYC metro area.",
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "City",
      name: "New York",
    },
    serviceType: "Search Engine Optimization",
  };

  const faqSchema = getFAQPageSchema(faqs);

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      {/* ── Hero ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Automotive", url: "/businesses/automotive" },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Business Types &middot; SEO &amp; AI Search
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for{" "}
                <span className="text-[#EFF70A]">Automotive</span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Over 2 million registered vehicles in NYC. Every one of them
                needs an{" "}
                <Link
                  href="/auto-mechanic"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  auto mechanic
                </Link>
                , occasional{" "}
                <Link
                  href="/auto-body-shop"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  body work
                </Link>
                , and annual state inspection. When drivers search for
                automotive services, they go to Google first. We build the{" "}
                <Link
                  href="/services/seo"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  SEO
                </Link>{" "}
                and{" "}
                <Link
                  href="/services/local-seo"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  local search
                </Link>{" "}
                platforms that put your shop at the top.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {content.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center"
                >
                  <div className="text-3xl font-extrabold text-[#0080FE]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Automotive Businesses Need SEO ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Automotive Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Automotive searches are some of the most urgent on Google. A car
            owner with a check engine light or a flat tire on the BQE is not
            comparison-shopping &mdash; they&rsquo;re hiring the first shop they
            find. If your{" "}
            <Link
              href="/services/google-business-profile"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Google Business Profile
            </Link>{" "}
            isn&rsquo;t optimized and your website doesn&rsquo;t rank, that
            customer goes to your competitor down the block.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                Emergency = Instant Conversion
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Towing, lockout, and breakdown searches convert at extremely high
                rates. These users don&rsquo;t browse &mdash; they call the
                first result they see. Ranking #1 for &ldquo;towing near
                me&rdquo; in your coverage area is worth thousands per month in
                new business.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                High Repeat Customer Value
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                A car owner who trusts your shop for one repair comes back for
                oil changes, inspections, brake work, and more. SEO brings in
                the first visit;{" "}
                <Link
                  href="/services/fullloopcrm"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  CRM and follow-up
                </Link>{" "}
                turns it into a lifetime relationship worth $5,000-$20,000+.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                12,000+ Competitors
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                The NYC metro has over 12,000 auto shops. Most have terrible
                websites and no SEO strategy. That&rsquo;s an enormous
                opportunity for shops willing to invest in{" "}
                <Link
                  href="/services/on-page-seo"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  on-page SEO
                </Link>{" "}
                and{" "}
                <Link
                  href="/services/content-marketing"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  content
                </Link>{" "}
                to stand out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Build ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Automotive Businesses
          </h2>
          <p className="mt-4 text-zinc-400">
            SEO specifically engineered for how car owners search for automotive
            services in New York City.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Google Maps Dominance",
                desc: "Automotive searches are hyper-local. We optimize your Google Business Profile, build consistent citations, and manage reviews so you own the local map pack in your service area.",
                href: "/services/local-seo",
              },
              {
                num: "02",
                title: "Emergency Search Optimization",
                desc: "Towing, breakdowns, and flat tires are searched in panic. We build pages and GBP categories that capture these high-converting emergency queries instantly.",
                href: "/services/google-business-profile",
              },
              {
                num: "03",
                title: "Service-Specific Pages",
                desc: "Individual pages for brake repair, oil changes, transmission work, collision repair, and every service you offer. Each page targets specific search terms your customers use.",
                href: "/services/on-page-seo",
              },
              {
                num: "04",
                title: "Content That Builds Trust",
                desc: "Blog posts and guides answering common questions: 'How much does brake repair cost in NYC?' 'When to replace tires?' Content builds authority and captures research-phase traffic.",
                href: "/services/content-marketing",
              },
              {
                num: "05",
                title: "AI Search Optimization",
                desc: "When someone asks ChatGPT 'best auto mechanic in Queens,' your shop should be in the answer. We optimize your content structure and authority signals for AI recommendation.",
                href: "/services/ai-search-optimization",
              },
              {
                num: "06",
                title: "Technical SEO & Speed",
                desc: "A stranded driver on mobile won't wait for a slow site. We ensure sub-2-second load times, mobile-first design, and clean technical architecture that Google rewards.",
                href: "/services/search-engine-optimization",
              },
              {
                num: "07",
                title: "Off-Page SEO & Directories",
                desc: "We build citations and backlinks from automotive directories, local business listings, and community resources that boost your domain authority and local relevance.",
                href: "/services/off-page-seo",
              },
              {
                num: "08",
                title: "Programmatic Location Pages",
                desc: "Hundreds of pages targeting every neighborhood in your service area. 'Auto mechanic in Astoria,' 'body shop in Red Hook,' 'car detailing in Midtown' — all built and optimized at scale.",
                href: "/services/automation",
              },
              {
                num: "09",
                title: "Automotive Website Design",
                desc: "Fast, mobile-first websites built for auto shops: click-to-call buttons, service menus, online scheduling, photo galleries, and review showcases that convert visitors into customers.",
                href: "/services/web-design-development",
              },
              {
                num: "10",
                title: "Performance Reporting",
                desc: "Monthly reports showing keyword rankings, phone calls from search, direction requests, and website form submissions. See exactly how many new customers SEO is bringing in.",
                href: "/services/analytics-reporting",
              },
            ].map((card) => (
              <Link
                key={card.num}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <span className="text-sm font-bold text-[#0080FE]">
                  {card.num}
                </span>
                <h3 className="mt-2 text-lg font-bold group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Process ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank Automotive Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A step-by-step process built around how NYC drivers actually search
            for and choose automotive service providers.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                step: "1. Competitive Audit",
                detail:
                  "We analyze the top-ranking auto shops in your area, their backlink profiles, review counts, and content strategies. We identify the gaps — the keywords they rank for that you don't, and the opportunities they're missing entirely.",
              },
              {
                step: "2. Keyword & Service Mapping",
                detail:
                  "We map every service you offer to specific search terms: 'brake repair Brooklyn,' 'oil change near me,' 'collision repair Queens.' Emergency services, routine maintenance, and specialty work each get their own keyword clusters.",
              },
              {
                step: "3. Technical Overhaul",
                detail:
                  "We fix site speed, mobile usability, schema markup, and indexation issues. For auto shops, we implement LocalBusiness and AutoRepair schema, ensure click-to-call works on every page, and add structured data for your service menu.",
              },
              {
                step: "4. Content Build-Out",
                detail:
                  "We create dedicated pages for every service you offer, location pages for every neighborhood you serve, and blog content targeting the questions your customers search: 'How often should I change my oil?' 'Is it worth fixing a dented bumper?'",
              },
              {
                step: "5. Google Business Profile Optimization",
                detail:
                  "Complete GBP setup or overhaul: accurate categories, service descriptions, photos of your shop and work, business hours, Q&A management, and a systematic review collection strategy.",
              },
              {
                step: "6. Citation & Link Building",
                detail:
                  "We build consistent citations across 50+ directories (Yelp, YP, AutoMD, RepairPal, etc.) and earn backlinks from local business associations, automotive publications, and community sites.",
              },
              {
                step: "7. AI & Voice Search",
                detail:
                  "We optimize for the growing share of searches happening through voice assistants ('Hey Google, find a mechanic nearby') and AI chat platforms. Structured data and authoritative content are the keys.",
              },
              {
                step: "8. Monthly Optimization & Reporting",
                detail:
                  "We track rankings, calls, direction requests, and form fills. Strategy adjusts monthly based on what's driving the most valuable customers to your shop.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6"
              >
                <h3 className="text-lg font-bold text-[#EFF70A]">
                  {item.step}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mid CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── Industry Deep-Dive ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The NYC Automotive Market
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Understanding the automotive landscape helps us build SEO that
            targets the right customers at the right moment.
          </p>

          <div className="mt-10">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              Why Local Proximity Drives Automotive Decisions
            </h3>
            <ul className="mt-4 space-y-3">
              {content.whySEOMatters.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0080FE]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              How Customers Choose Auto Shops
            </h3>
            <div className="mt-4 space-y-4">
              {content.seoProcess.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-[#141414] p-4"
                >
                  <h4 className="font-semibold text-white">{item.step}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              What Drives Automotive Repair Costs in NYC
            </h3>
            <p className="mt-3 text-sm text-zinc-400">{content.investmentContext}</p>
            <ul className="mt-4 space-y-2">
              {content.investmentFactors.map((factor, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#EFF70A]" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── All Business Types in This Category ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Automotive Business Types We Optimize
          </h2>
          <p className="mt-4 text-zinc-400">
            We build{" "}
            <Link
              href="/services/seo-strategy"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              SEO strategies
            </Link>{" "}
            for every type of automotive business in NYC. Click any business
            type to see its dedicated page.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold group-hover:text-[#0080FE]">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Automotive SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Straightforward pricing for auto shops and automotive service
            businesses. See our full{" "}
            <Link
              href="/pricing"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              pricing page
            </Link>{" "}
            for complete details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">
                Monthly Retainer
              </h3>
              <div className="mt-4 text-4xl font-extrabold">$3,500</div>
              <div className="text-sm text-zinc-500">per month</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>Full SEO strategy &amp; execution</li>
                <li>Local pack &amp; Maps optimization</li>
                <li>Content production &amp; service pages</li>
                <li>Review management &amp; acquisition</li>
                <li>Monthly reporting &amp; strategy calls</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">
                Project-Based
              </h3>
              <div className="mt-4 text-4xl font-extrabold">$2,500</div>
              <div className="text-sm text-zinc-500">starting at</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>Site audit &amp; technical fixes</li>
                <li>GBP setup &amp; optimization</li>
                <li>Citation cleanup &amp; building</li>
                <li>Service page creation</li>
                <li>Keyword research &amp; mapping</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">Consulting</h3>
              <div className="mt-4 text-4xl font-extrabold">$150</div>
              <div className="text-sm text-zinc-500">per hour</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>SEO strategy sessions</li>
                <li>In-house team training</li>
                <li>Competitive analysis deep-dives</li>
                <li>Review response strategy</li>
                <li>AI search readiness assessment</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Region Coverage ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Automotive SEO Across the NYC Metro
          </h2>
          <p className="mt-4 text-zinc-400">
            Every borough and surrounding region has different automotive search
            patterns. Our{" "}
            <Link
              href="/services/seo-strategy"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              strategy
            </Link>{" "}
            adapts to each market.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <div
                key={region}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5"
              >
                <h3 className="font-bold text-white">{region}</h3>
                <p className="mt-2 text-xs text-zinc-400">
                  {content.regionNotes[region]}
                </p>
                {neighborhoodsByRegion[region] && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {neighborhoodsByRegion[region].slice(0, 4).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-zinc-400 hover:text-[#5CB8FF]"
                      >
                        {n.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PreFaq CTA ── */}
      <CTAGroup variant="preFaq" />

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Automotive SEO &mdash; FAQ
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions from{" "}
            <Link
              href="/auto-mechanic"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              auto mechanics
            </Link>
            ,{" "}
            <Link
              href="/auto-body-shop"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              body shops
            </Link>
            ,{" "}
            <Link
              href="/towing-service"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              towing companies
            </Link>
            , and other automotive businesses considering SEO.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-6"
              >
                <h3 className="font-bold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-Links ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Explore Other Industries We Serve
          </h2>
          <p className="mt-4 text-zinc-400">
            We build SEO platforms for{" "}
            <Link
              href="/businesses"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              170+ business types
            </Link>{" "}
            across every industry in New York City.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {allCategories
              .filter((c) => c !== CATEGORY)
              .map((c) => (
                <Link
                  key={c}
                  href={`/businesses/${categoryToSlug(c)}`}
                  className="rounded-full border border-zinc-700 bg-[#0A0A0A] px-4 py-2 text-sm text-zinc-300 hover:border-[#0080FE] hover:text-white"
                >
                  {c}
                </Link>
              ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/services"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              All Services
            </Link>
            <Link
              href="/services/branding"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Branding
            </Link>
            <Link
              href="/services/fullloopcrm"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Full Loop CRM
            </Link>
            <Link
              href="/services/marketing-consulting"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Marketing Consulting
            </Link>
            <Link
              href="/services/ai-agent-development"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              AI Agent Development
            </Link>
            <Link
              href="/areas"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              All Areas
            </Link>
            <Link
              href="/about"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
