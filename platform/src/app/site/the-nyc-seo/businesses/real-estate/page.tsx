import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategorySlug, getRegions } from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL, PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

const CATEGORY = "Real Estate";
const SLUG = "real-estate";
const content = categoryContent[CATEGORY];
const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: "SEO for Real Estate Businesses NYC",
  description:
    "SEO and AI search optimization for real estate agents, property managers, home inspectors, appraisers, and real estate businesses across NYC. More listings, more closings.",
  openGraph: {
    title: "SEO for Real Estate Businesses NYC",
    description:
      "SEO and AI search optimization for real estate agents, property managers, home inspectors, and appraisers across NYC.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "Can SEO help real estate agents compete with Zillow and StreetEasy?",
    a: "Yes, and here is how. You will never outrank Zillow for 'apartments for sale NYC,' nor should you try. But Zillow cannot compete with you on hyperlocal expertise. We target searches like 'best real estate agent in Park Slope,' 'co-op specialist Upper West Side,' or 'property manager Astoria' -- terms where local expertise wins and Zillow is just an aggregator. That is where your listings and your reputation close deals.",
  },
  {
    q: "How long does SEO take for a real estate business?",
    a: "Real estate SEO typically delivers visible ranking improvements within 3-5 months, with meaningful lead generation by month 6-8. Hyperlocal terms like 'real estate agent [neighborhood]' rank faster than broader terms. We build neighborhood-specific pages, market report content, and local authority signals that compound over time -- each month stronger than the last.",
  },
  {
    q: "What SEO services matter most for real estate professionals?",
    a: "Local SEO and Google Business Profile optimization are the foundation. Over 90% of home buyers and sellers start online, and most search by neighborhood. We optimize your GBP, build neighborhood landing pages, create market report content, generate reviews, and ensure you dominate the local pack for every area you serve.",
  },
  {
    q: "How much does SEO cost for real estate businesses?",
    a: "Monthly retainers start at $3,500/month, covering local SEO, content marketing, GBP management, and AI search optimization. One-time projects like website redesigns start at $2,500. Consulting is available at $150/hour. Given that a single real estate commission in NYC can exceed $20,000, the ROI math on SEO is straightforward.",
  },
  {
    q: "Should property managers invest in SEO?",
    a: "Absolutely. Landlords and building owners search 'property management company [borough]' and 'best property manager NYC' when they need management services. Tenants search 'apartments for rent [neighborhood]' and often reach the managing company's site. SEO positions you to capture both sides of the market -- new management contracts and tenant leads for your existing portfolio.",
  },
  {
    q: "How does AI search optimization work for real estate?",
    a: "When a buyer asks ChatGPT 'best real estate agents in Brooklyn Heights' or a landlord asks Perplexity 'top property management companies NYC,' AI pulls from well-structured, authoritative web content. We optimize your site's entity signals, content structure, and authority markers so AI platforms cite your business in these high-value queries.",
  },
  {
    q: "Do you create neighborhood-specific pages for each area we serve?",
    a: "Yes. Each neighborhood you serve gets a dedicated, SEO-optimized page covering local market data, your expertise in that area, recent transactions, and neighborhood-specific content. A real estate agent serving 15 neighborhoods should have 15 neighborhood pages -- each targeting the exact searches buyers and sellers in that area perform.",
  },
  {
    q: "Can SEO help home inspectors and appraisers get more business?",
    a: "Home inspectors and appraisers rely heavily on referrals from agents, but SEO opens a direct channel to consumers. Buyers increasingly search 'home inspector near me' or 'property appraiser [borough]' independently. Ranking for these terms builds a pipeline that does not depend entirely on agent relationships.",
  },
];

const serviceCards = [
  {
    title: "Local SEO & Google Maps",
    desc: "Dominate the local pack when buyers search 'real estate agent near me' or sellers search 'best listing agent [neighborhood].' Google Maps is where real estate searches start.",
    href: "/services/local-seo",
  },
  {
    title: "SEO Strategy",
    desc: "Market analysis, competitor positioning, and keyword mapping across every neighborhood, property type, and transaction type you serve. Strategy built for commissions, not clicks.",
    href: "/services/seo-strategy",
  },
  {
    title: "Content Marketing",
    desc: "Neighborhood guides, market reports, buyer and seller resources, and blog content that establishes you as the local market authority and ranks for informational searches.",
    href: "/services/content-marketing",
  },
  {
    title: "AI Search Optimization",
    desc: "Get cited in ChatGPT, Perplexity, and Google AI Overviews when buyers, sellers, and landlords ask AI for real estate recommendations in your market.",
    href: "/services/ai-search-optimization",
  },
  {
    title: "Google Business Profile",
    desc: "Complete GBP optimization with review generation, transaction photos, market area setup, and weekly posting that builds trust and dominates local search results.",
    href: "/services/google-business-profile",
  },
  {
    title: "Web Design & Development",
    desc: "Professional real estate websites with IDX integration capability, neighborhood pages, market data, agent bios, and lead capture designed to convert searchers into clients.",
    href: "/services/web-design-development",
  },
  {
    title: "On-Page SEO",
    desc: "Every neighborhood page, property type page, and service page optimized with precise title tags, meta descriptions, schema markup, and internal linking for maximum visibility.",
    href: "/services/on-page-seo",
  },
  {
    title: "Off-Page SEO & Link Building",
    desc: "Build authority through backlinks from real estate publications, neighborhood blogs, local news, and community organizations that establish your market expertise.",
    href: "/services/off-page-seo",
  },
  {
    title: "Analytics & Reporting",
    desc: "Monthly reports tracking lead volume, keyword rankings, and traffic by neighborhood. We measure what matters to your business -- inquiries and signed agreements, not vanity metrics.",
    href: "/services/analytics-reporting",
  },
  {
    title: "Programmatic SEO & Automation",
    desc: "Hundreds of neighborhood-specific and property-type pages generated at scale -- covering every combination of area and service your real estate business offers.",
    href: "/services/automation",
  },
];

const businessTypes = [
  { name: "Real Estate Agents", slug: "real-estate-agent", desc: "Buying, selling, and renting residential and commercial properties" },
  { name: "Property Managers", slug: "property-manager", desc: "Rental management, tenant screening, and building operations" },
  { name: "Home Inspectors", slug: "home-inspector", desc: "Pre-purchase inspections, property assessments, and reports" },
  { name: "Appraisers", slug: "appraiser", desc: "Property valuation for sales, refinancing, and estate purposes" },
  { name: "Interior Designers", slug: "interior-designer", desc: "Home and office design, space planning, and decor consulting" },
  { name: "Home Stagers", slug: "home-stager", desc: "Property staging for real estate sales to maximize appeal and price" },
];

const processSteps = [
  { step: "Market & Competitor Audit", detail: "We analyze your current search visibility, map your competitors' rankings by neighborhood, and identify the highest-value geographic and service-based keyword opportunities in your market." },
  { step: "Neighborhood Keyword Strategy", detail: "We build a keyword map targeting every neighborhood, property type, and transaction type you serve -- prioritizing terms with the strongest buyer and seller intent." },
  { step: "Technical & On-Page Optimization", detail: "Site speed, mobile optimization, schema markup for real estate, and on-page SEO across every listing page, neighborhood page, and service page on your site." },
  { step: "Content & Authority Build", detail: "Neighborhood guides, market reports, buyer and seller resources, and community content that positions you as the definitive local market expert in every area you serve." },
  { step: "Local SEO & Review Generation", detail: "Google Business Profile fully optimized, citations built across real estate directories, and a systematic review generation program that builds the trust signals buyers and sellers look for." },
  { step: "Ongoing Optimization & ROI Tracking", detail: "Monthly performance reviews tracking leads by neighborhood, keyword rankings, and closed-deal attribution. We optimize based on revenue impact, not just traffic numbers." },
];

export default function RealEstatePage() {
  const services = getServicesByCategorySlug(SLUG);
  const regions = getRegions();

  const orgSchema = {
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
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Real Estate Businesses NYC",
    description:
      "Search engine optimization and AI search visibility for real estate agents, property managers, home inspectors, appraisers, and real estate businesses in New York City.",
    provider: orgSchema,
    areaServed: { "@type": "City", name: "New York" },
    serviceType: "Search Engine Optimization",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
      />

      {/* ── 1. Hero ──────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Real Estate", url: "/businesses/real-estate" },
            ]}
            dark
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                SEO for Real Estate &middot; NYC &middot; All Boroughs
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO That Turns Searches Into{" "}
                <span className="text-[#EFF70A]">Signed Listings &amp; Closings</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Every buyer, seller, and landlord starts on Google. When someone searches{" "}
                <em>&quot;real estate agent Brooklyn Heights&quot;</em> or{" "}
                <em>&quot;property manager Upper West Side,&quot;</em>{" "}
                your name needs to be at the top. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>,{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local search dominance</Link>, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>{" "}
                for{" "}
                <Link href="/real-estate-agent" className="text-[#5CB8FF] hover:text-[#8DD0FF]">real estate agents</Link>,{" "}
                <Link href="/property-manager" className="text-[#5CB8FF] hover:text-[#8DD0FF]">property managers</Link>,{" "}
                <Link href="/home-inspector" className="text-[#5CB8FF] hover:text-[#8DD0FF]">home inspectors</Link>, and every real estate professional across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC&apos;s 318+ neighborhoods</Link>.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {content.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center"
                >
                  <div className="text-3xl font-extrabold text-[#0080FE]">{s.value}</div>
                  <div className="mt-1 text-xs text-zinc-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Why Real Estate Needs SEO ──────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Real Estate Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            The NAR reports that 97% of home buyers use the internet during their home search.
            Zillow and StreetEasy dominate broad searches, but agents, property managers, and
            real estate service providers who own their local search presence capture the clients
            aggregators cannot reach -- the ones searching for a specific person they can trust
            in a specific neighborhood.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.whySEOMatters.map((reason, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0080FE] text-sm font-bold text-white">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            In a market where a single listing or closing can generate $15,000-$50,000+ in
            commission, the cost of being invisible online is staggering.{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Search engine optimization</Link>{" "}
            builds a pipeline of qualified leads that compounds month over month. Pair it with{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile optimization</Link>{" "}
            and <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">market report content</Link>,
            and you become the agent or firm that owns your neighborhoods online.
          </p>
        </div>
      </section>

      {/* ── 3. What We Build ─────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Real Estate Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Whether you are a solo agent building a brand or a property management company
            scaling operations, every engagement is tailored to your market, neighborhoods,
            and growth goals.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {card.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Our Process ───────────────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our SEO Process for Real Estate Professionals
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A proven six-step system refined over two decades of ranking local service
            businesses in the most competitive real estate market in the country.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#0080FE]">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-bold text-white">{step.step}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Mid CTA ───────────────────────────────────────── */}
      <CTAGroup
        variant="mid"
        title="Someone Is Searching for an Agent in Your Neighborhood Right Now"
        subtitle="If they find your competitor first, that's a listing you'll never see. Let's make sure they find you."
      />

      {/* ── 6. Industry Deep-Dive ────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Real Estate SEO Landscape in NYC
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">{content.investmentContext}</p>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">Mistakes Real Estate Professionals Make Online</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.seoMistakes.map((m, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                  <h4 className="font-bold text-[#EFF70A]">{m.mistake}</h4>
                  <p className="mt-2 text-sm text-zinc-400">{m.consequence}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">When Real Estate Businesses Should Invest in SEO</h3>
            <ul className="mt-6 space-y-3">
              {content.signsYouNeedSEO.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#0080FE]" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">Choosing the Right SEO Partner for Real Estate</h3>
            <div className="mt-6 space-y-4">
              {content.seoProcess.map((item, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-5">
                  <h4 className="font-bold text-white">
                    {i + 1}. {item.step}
                  </h4>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Business Types Grid ───────────────────────────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Real Estate Business Types We Serve
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We build SEO programs for every type of real estate professional in the NYC
            metro area. Click any business type to explore how we approach their market.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businessTypes.map((bt) => (
              <Link
                key={bt.slug}
                href={`/${bt.slug}`}
                className="group rounded-xl border border-zinc-700 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[#0080FE]">
                  {bt.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{bt.desc}</p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            See all{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170+ business types</Link>{" "}
            we provide SEO services for, or explore other industries like{" "}
            <Link href="/businesses/legal" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Legal</Link>,{" "}
            <Link href="/businesses/financial" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Financial Services</Link>, and{" "}
            <Link href="/businesses/home-services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Home Services</Link>.
          </p>
        </div>
      </section>

      {/* ── 8. Pricing ───────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Real Estate SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Clear pricing for real estate professionals. One closing in NYC can pay for a
            full year of SEO. See our full{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
            for details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Monthly Retainer
              </div>
              <div className="mt-4 text-4xl font-extrabold">$3,500</div>
              <div className="text-zinc-400">/month</div>
              <p className="mt-4 text-sm text-zinc-400">
                Full-service SEO including{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local search</Link>,
                neighborhood content,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">GBP management</Link>,
                and AI search optimization. The complete growth engine for agents and firms
                serious about owning their market online.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Project-Based
              </div>
              <div className="mt-4 text-4xl font-extrabold">$2,500</div>
              <div className="text-zinc-400">starting</div>
              <p className="mt-4 text-sm text-zinc-400">
                One-time projects like{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website redesigns</Link>,
                SEO audits, or{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal branding</Link>{" "}
                for agents. Defined scope, clear deliverables, fixed price.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Consulting
              </div>
              <div className="mt-4 text-4xl font-extrabold">$150</div>
              <div className="text-zinc-400">/hour</div>
              <p className="mt-4 text-sm text-zinc-400">
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Strategy consulting</Link>{" "}
                for teams and brokerages that have internal marketing but need expert SEO
                direction and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search guidance</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Region Coverage ───────────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Real Estate SEO Across Every Borough &amp; Region
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Real estate is the most hyperlocal industry there is. We build
            neighborhood-specific SEO programs across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">all 318+ neighborhoods</Link>{" "}
            we cover. Each region requires a different strategic approach.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <div
                key={region}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5"
              >
                <h3 className="font-bold text-white">{region}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {content.regionNotes[region]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. PreFaq CTA ───────────────────────────────────── */}
      <CTAGroup
        variant="preFaq"
        title="20 Years Ranking Real Estate Businesses. Your Turn."
        subtitle="From solo agents to multi-office brokerages, we know how to make real estate professionals the top search result in their market. Your competitors started last year."
      />

      {/* ── 11. FAQ ──────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions about SEO for real estate professionals in the NYC metro area.
          </p>
          <dl className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <dt className="text-lg font-bold text-white">{faq.q}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-zinc-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 12. Cross-Links & Final CTA ──────────────────────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Explore More Industries &amp; Services
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold text-white">Other Industries We Serve</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/businesses/legal" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Legal SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/financial" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Financial Services SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/home-services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Home Services SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/business-services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Business Services SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/education" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Education SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/health-medical" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Health &amp; Medical SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/beauty-personal-care" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Beauty &amp; Personal Care SEO</Link>
                </li>
                <li>
                  <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All 170+ Business Types &rarr;</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Our SEO Services</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO Services</Link>
                </li>
                <li>
                  <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Local SEO</Link>
                </li>
                <li>
                  <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Search Optimization</Link>
                </li>
                <li>
                  <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Content Marketing</Link>
                </li>
                <li>
                  <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">On-Page SEO</Link>
                </li>
                <li>
                  <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Off-Page SEO</Link>
                </li>
                <li>
                  <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link>
                </li>
                <li>
                  <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Agent Development</Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Pricing Guide &rarr;</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
