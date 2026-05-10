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

const CATEGORY = "Financial";
const SLUG = "financial";

export const metadata: Metadata = {
  title: "SEO for Financial Services NYC",
  description:
    "SEO, local search, and AI optimization for accountants, financial advisors, tax preparers, and bookkeepers in NYC. Rank where clients search.",
  openGraph: {
    title: "SEO for Financial Services NYC",
    description:
      "SEO, local search, and AI optimization for accountants, financial advisors, tax preparers, and bookkeepers in NYC. Rank where clients search.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "How long does it take for a financial services firm to rank on Google in NYC?",
    a: "Most financial services businesses begin seeing measurable ranking improvements within 3-4 months of sustained SEO work. Competitive terms like 'accountant NYC' or 'financial advisor Manhattan' can take 6-9 months to crack the top 5, depending on domain age, backlink profile, and how aggressively competitors are investing in SEO. Local pack results (Google Maps) often move faster, sometimes within 8-12 weeks.",
  },
  {
    q: "Why is SEO important for accountants and financial advisors specifically?",
    a: "Financial services are high-intent, high-value searches. Someone searching 'CPA near me' or 'tax preparer NYC' is ready to hire. Unlike referral-based growth that caps out, SEO compounds over time, bringing in new clients month after month without paying per click. In NYC's saturated financial market, firms that don't invest in organic visibility are leaving six figures in annual revenue to competitors who do.",
  },
  {
    q: "What does a financial services SEO strategy include?",
    a: "Our strategy covers technical SEO (site speed, indexation, schema markup), local SEO (Google Business Profile optimization, citation building, review management), content marketing (blog posts targeting financial questions your clients search), on-page optimization for service and location pages, and AI search optimization so your firm surfaces in ChatGPT, Perplexity, and Gemini responses.",
  },
  {
    q: "How much does SEO cost for a financial services business in NYC?",
    a: "Our monthly retainer starts at $3,500/month for ongoing SEO, which includes strategy, content, technical optimization, and reporting. Project-based work starts at $2,500, and consulting is available at $150/hour. The ROI for financial services SEO is among the highest of any industry because client lifetime values often exceed $5,000-$50,000+.",
  },
  {
    q: "Can you help our firm rank in AI search results like ChatGPT?",
    a: "Yes. AI search optimization is a core part of our approach. We structure your content, schema markup, and authority signals so that large language models like ChatGPT, Perplexity, and Google Gemini reference your firm when users ask questions like 'best accountant in Brooklyn' or 'financial advisor for small business NYC.' This is the next frontier of client acquisition.",
  },
  {
    q: "Do you work with solo practitioners or only large financial firms?",
    a: "We work with both. Solo CPAs and independent financial advisors benefit enormously from local SEO because they're competing with larger firms that have bigger budgets. Our programmatic approach builds hundreds of location-specific pages that a solo practitioner could never create manually, giving small firms enterprise-level visibility at a fraction of the cost.",
  },
  {
    q: "What's the difference between SEO and Google Ads for financial services?",
    a: "Google Ads deliver instant visibility but stop the moment you pause spend. SEO builds compounding organic traffic that grows over time without per-click costs. For financial services, where CPCs run $15-$50+ per click, SEO delivers dramatically better long-term ROI. We recommend SEO as the foundation and paid ads as a short-term supplement while organic rankings build.",
  },
  {
    q: "How do you track SEO results for our financial practice?",
    a: "We provide monthly reporting through our analytics dashboard that tracks keyword rankings, organic traffic, Google Business Profile views, phone calls, form submissions, and new client inquiries. Every metric is tied to real business outcomes, not vanity numbers. You'll see exactly how SEO translates to new client acquisition.",
  },
];

export default function FinancialBusinessesPage() {
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
    name: "SEO for Financial Services NYC",
    description:
      "Search engine optimization, local SEO, and AI search optimization for financial services businesses including accountants, financial advisors, tax preparers, and bookkeepers in the NYC metro area.",
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
              { name: "Financial", url: "/businesses/financial" },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Business Types &middot; SEO &amp; AI Search
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for{" "}
                <span className="text-[#EFF70A]">Financial Services</span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                New York&rsquo;s financial services market is one of the most
                competitive on Earth. Whether you&rsquo;re a{" "}
                <Link
                  href="/accountant"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  CPA firm
                </Link>
                , a{" "}
                <Link
                  href="/financial-advisor"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  financial advisor
                </Link>
                , or a{" "}
                <Link
                  href="/tax-preparer"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  tax preparer
                </Link>
                , your next client is searching Google right now. We build the{" "}
                <Link
                  href="/services/seo"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  SEO
                </Link>{" "}
                and{" "}
                <Link
                  href="/services/ai-search-optimization"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  AI search platforms
                </Link>{" "}
                that make sure they find you first.
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

      {/* ── Why Financial Businesses Need SEO ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Financial Services Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Over 4.3 million NYC residents file taxes every year. When they need
            an accountant, financial advisor, or insurance agent, they search
            online first. Referrals still matter, but{" "}
            <Link
              href="/services/local-seo"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              local SEO
            </Link>{" "}
            is what turns a local practice into a dominant one. The firms that
            own page one for &ldquo;accountant near me&rdquo; or &ldquo;financial
            advisor NYC&rdquo; capture the highest-intent clients &mdash; people
            ready to hire today, not browse tomorrow.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                High Client Lifetime Value
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                A single tax client retained over 10 years can be worth $10,000+.
                Financial advisory clients under management generate recurring
                annual fees of $2,000-$15,000+. SEO brings in these clients at a
                fraction of paid ad costs.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                Trust Starts on Google
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Financial decisions require trust. Appearing on the first page of
                Google signals authority and credibility. A strong{" "}
                <Link
                  href="/services/google-business-profile"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  Google Business Profile
                </Link>{" "}
                with reviews accelerates that trust before a prospect ever calls.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                Tax Season Isn&rsquo;t the Only Season
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                SEO drives year-round client acquisition. Financial planning,
                insurance reviews, and bookkeeping needs don&rsquo;t stop in
                April. A well-optimized site captures searches 12 months a year
                through{" "}
                <Link
                  href="/services/content-marketing"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  content marketing
                </Link>{" "}
                and evergreen ranking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Build ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Financial Services Firms
          </h2>
          <p className="mt-4 text-zinc-400">
            A full-stack SEO and AI search platform tailored to how financial
            services clients actually search in New York City.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Local SEO & Google Maps",
                desc: "Dominate the local pack for '[service] near me' searches. We optimize your Google Business Profile, build citations, and manage reviews so you show up first in your borough.",
                href: "/services/local-seo",
              },
              {
                num: "02",
                title: "On-Page SEO",
                desc: "Every page on your site optimized with financial-industry keyword targeting, schema markup, internal linking, and conversion-focused content architecture.",
                href: "/services/on-page-seo",
              },
              {
                num: "03",
                title: "Content Marketing",
                desc: "Publish content your prospective clients actually search for: tax tips, financial planning guides, and seasonal content that builds authority and backlinks.",
                href: "/services/content-marketing",
              },
              {
                num: "04",
                title: "AI Search Optimization",
                desc: "Structure your content so ChatGPT, Perplexity, and Gemini recommend your firm when users ask about financial services in NYC.",
                href: "/services/ai-search-optimization",
              },
              {
                num: "05",
                title: "Technical SEO & Site Speed",
                desc: "Fast load times, clean indexation, proper canonical tags, and mobile optimization. The foundation that makes everything else work.",
                href: "/services/search-engine-optimization",
              },
              {
                num: "06",
                title: "Google Business Profile",
                desc: "Complete profile optimization, post scheduling, Q&A management, and review response strategy. Your GBP is your most important local asset.",
                href: "/services/google-business-profile",
              },
              {
                num: "07",
                title: "Off-Page SEO & Link Building",
                desc: "Earn backlinks from financial directories, industry publications, and local business networks that boost your domain authority.",
                href: "/services/off-page-seo",
              },
              {
                num: "08",
                title: "Programmatic Pages",
                desc: "We build hundreds of location-specific pages covering every NYC neighborhood. An accountant page for Astoria, a tax preparer page for Park Slope, and so on.",
                href: "/services/automation",
              },
              {
                num: "09",
                title: "Web Design & Development",
                desc: "Conversion-optimized websites built for financial services. Clean, trustworthy design that turns organic traffic into consultation requests.",
                href: "/services/web-design-development",
              },
              {
                num: "10",
                title: "Analytics & Reporting",
                desc: "Monthly reporting that ties rankings, traffic, and calls directly to new client acquisition. Every dollar accounted for.",
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
            How We Rank Financial Services Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A proven, repeatable process refined over 20 years of ranking
            businesses in the most competitive market in the country.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                step: "1. Audit & Discovery",
                detail:
                  "We audit your current site, Google Business Profile, backlink profile, and competitive landscape. For financial firms, we map every keyword opportunity by service type and geography — 'CPA Midtown,' 'bookkeeper Brooklyn,' 'financial advisor Upper East Side.'",
              },
              {
                step: "2. Strategy & Keyword Mapping",
                detail:
                  "We build a keyword strategy organized by intent: informational searches (tax tips, financial planning guides), transactional searches (hire accountant NYC), and navigational searches (your firm name + reviews). Each keyword maps to a specific page.",
              },
              {
                step: "3. Technical Foundation",
                detail:
                  "We fix crawl errors, optimize site speed, implement schema markup for financial services, and ensure your site is mobile-first. Financial clients often search from their phones during tax season crunch time.",
              },
              {
                step: "4. Content Production",
                detail:
                  "We create service pages, location pages, and blog content that targets the exact questions your prospective clients are searching. 'How much does a CPA cost in NYC?' 'Do I need a bookkeeper for my LLC?' — we answer them all.",
              },
              {
                step: "5. Local SEO & Citations",
                detail:
                  "We optimize your Google Business Profile, build consistent NAP citations across 50+ directories, and implement a review acquisition strategy that builds social proof.",
              },
              {
                step: "6. Link Building & Authority",
                detail:
                  "We earn backlinks from financial industry publications, NYC business directories, and local media. Domain authority is what separates page one from page two.",
              },
              {
                step: "7. AI Search Optimization",
                detail:
                  "We structure your content for AI crawlers and large language models. When someone asks ChatGPT 'best accountant in Brooklyn,' your firm should be in the response.",
              },
              {
                step: "8. Measure, Report, Iterate",
                detail:
                  "Monthly reports track rankings, traffic, calls, and form submissions. We adjust strategy based on real data, doubling down on what works and cutting what doesn't.",
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
            The NYC Financial Services Market
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Understanding the financial landscape your clients operate in is key
            to building SEO that converts. Here&rsquo;s what makes NYC unique.
          </p>

          <div className="mt-10">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              Why Local Matters for Financial Clients
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
              How Clients Choose Financial Professionals
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
              What Drives Costs in Financial Services
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
            Financial Business Types We Optimize
          </h2>
          <p className="mt-4 text-zinc-400">
            We build SEO platforms for every type of financial services business.
            Click any business type for its dedicated{" "}
            <Link
              href="/services/seo-strategy"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              SEO strategy
            </Link>{" "}
            page.
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
            Financial Services SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Transparent pricing for financial services firms. No hidden fees. No
            long-term contracts required. View our full{" "}
            <Link
              href="/pricing"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              pricing page
            </Link>{" "}
            for details.
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
                <li>Content production &amp; optimization</li>
                <li>Google Business Profile management</li>
                <li>Monthly reporting &amp; strategy calls</li>
                <li>AI search optimization</li>
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
                <li>One-time content overhaul</li>
                <li>GBP setup &amp; optimization</li>
                <li>Keyword research &amp; mapping</li>
                <li>Competitor analysis</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">Consulting</h3>
              <div className="mt-4 text-4xl font-extrabold">$150</div>
              <div className="text-sm text-zinc-500">per hour</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>SEO strategy sessions</li>
                <li>In-house team training</li>
                <li>Content audits &amp; recommendations</li>
                <li>Technical SEO guidance</li>
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
            Financial SEO Across the NYC Metro
          </h2>
          <p className="mt-4 text-zinc-400">
            We rank financial firms in every borough and surrounding region. Each
            market has unique search dynamics that our{" "}
            <Link
              href="/services/seo-strategy"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              strategy
            </Link>{" "}
            accounts for.
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
            Financial Services SEO &mdash; FAQ
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions from{" "}
            <Link
              href="/accountant"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              accountants
            </Link>
            ,{" "}
            <Link
              href="/financial-advisor"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              financial advisors
            </Link>
            , and other financial professionals considering SEO.
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
            across every industry.
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
