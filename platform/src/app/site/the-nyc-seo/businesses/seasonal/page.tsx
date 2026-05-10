// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategorySlug, getRegions } from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL, PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

const CATEGORY = "Seasonal";
const SLUG = "seasonal";
const content = categoryContent[CATEGORY];
const services = getServicesByCategorySlug(SLUG);
const regions = getRegions();

export const metadata: Metadata = {
  title: "SEO for Seasonal Service Businesses NYC",
  description:
    "SEO and AI search optimization for seasonal service businesses in NYC. Snow removal, winter maintenance — rank on Google and AI search when demand spikes.",
  openGraph: {
    title: "SEO for Seasonal Service Businesses NYC",
    description:
      "SEO and AI search optimization for seasonal service businesses in NYC. Snow removal, winter maintenance — rank on Google and AI search when demand spikes.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "When should a snow removal business start investing in SEO?",
    a: "Start in summer. Seriously. Property managers and homeowners begin searching for snow removal contracts in September and October. If your SEO campaign launches in November, you've already missed the highest-intent searches. The businesses that rank when the first storm hits are the ones that invested months earlier. SEO is not instant — it takes 3-6 months to build authority.",
  },
  {
    q: "Can SEO work for a business that only operates part of the year?",
    a: "Absolutely — and seasonal businesses arguably need SEO more than year-round ones. Your revenue window is compressed, so every lead matters more. We build evergreen content and authority that keeps your site ranking year-round, so when the season hits, you're already at the top. We also use the off-season to create content about winter preparation, seasonal contracts, and property maintenance.",
  },
  {
    q: "What keywords should a snow removal business target?",
    a: "High-value keywords include 'snow removal [neighborhood],' 'snow plowing service NYC,' 'commercial snow removal Brooklyn,' and 'residential sidewalk clearing near me.' We also target pre-season terms like 'snow removal contract NYC' and 'winter property maintenance' that capture customers planning ahead. Long-tail queries like 'snow removal for co-op buildings Manhattan' signal serious commercial intent.",
  },
  {
    q: "How do you optimize for the seasonal search spike?",
    a: "We build the foundation during the off-season — site authority, content, backlinks, and technical SEO — so your pages are already ranking when search volume surges. During the season, we publish timely storm content, update Google Business Profile with real-time availability, and run targeted campaigns around major weather events. This combination means you capture traffic at the exact moment demand peaks.",
  },
  {
    q: "Does Google Business Profile matter for snow removal companies?",
    a: "It's critical. When someone searches 'snow removal near me' during a storm, Google Maps results dominate the page. Your GBP needs accurate service areas, winter hours, emergency contact info, and recent reviews. We optimize every element and build a review strategy that generates fresh testimonials each season — because a review from last winter is better than no review at all.",
  },
  {
    q: "What's included in the $3,500/month retainer for seasonal businesses?",
    a: "The retainer covers year-round SEO: keyword strategy, on-page optimization, Google Business Profile management, content creation, local citation building, link building, AI search optimization, and monthly reporting. For seasonal businesses we front-load intensive work before peak season and shift to maintenance and content building during the off-season.",
  },
  {
    q: "Can AI search optimization help a snow removal business?",
    a: "Yes. When property managers ask ChatGPT 'best snow removal company in Queens' or homeowners ask Perplexity 'reliable snow plowing service NYC,' your business needs to appear in those answers. AI search tools pull from authoritative, well-structured websites with strong local signals — exactly what we build. This channel is growing fast and early movers have a significant advantage.",
  },
  {
    q: "Do you build websites for seasonal service businesses?",
    a: "Yes. We build fast, conversion-focused websites with features seasonal businesses need: service area maps, seasonal contract request forms, emergency service callouts, real-time availability status, and prominent phone numbers. Every site is mobile-optimized because most emergency seasonal searches happen on phones during weather events.",
  },
];

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
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "SEO for Seasonal Service Businesses",
  description:
    "Comprehensive SEO and AI search optimization for seasonal service businesses including snow removal and winter property maintenance in the NYC metro area.",
  provider: organizationSchema,
  areaServed: {
    "@type": "City",
    name: "New York",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Seasonal Business SEO Packages",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Monthly SEO Retainer" },
        price: "3500",
        priceCurrency: "USD",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "SEO Project" },
        price: "2500",
        priceCurrency: "USD",
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "SEO Consulting" },
        price: "150",
        priceCurrency: "USD",
      },
    ],
  },
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

export default function SeasonalPage() {
  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── 1. Hero ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Seasonal", url: "/businesses/seasonal" },
            ]}
            dark
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                SEO for Seasonal Service Businesses
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                When the Storm Hits, They Search.
                <span className="text-[#EFF70A]"> Will They Find You?</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Seasonal businesses have a narrow revenue window and zero room for missed
                leads.{" "}
                <Link href="/snow-removal" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Snow removal</Link>{" "}
                companies that aren&apos;t ranking when the first storm hits lose an entire
                season of contracts to competitors who are. Property owners search for{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local providers</Link>{" "}
                months before winter &mdash; and again in a panic when the forecast changes.
                We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that ensure your seasonal business owns both moments.
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

      {/* ── 2. Why Seasonal Businesses Need SEO ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Seasonal Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Seasonal businesses face a unique SEO challenge: you need to be ranking
            before the season starts, not scrambling when it arrives. NYC averages
            28 inches of snow per year, with sidewalk clearing fines starting at $100.
            Every property owner needs a provider &mdash; and the first place they look is
            Google.{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
            optimization and pre-season{" "}
            <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>{" "}
            are the difference between a fully booked season and scrambling for scraps.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.whySEOMatters.map((reason, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0080FE]/10 text-sm font-bold text-[#0080FE]">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. What We Build ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Seasonal Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A year-round SEO infrastructure that ensures your seasonal business
            dominates search when revenue is on the line. Built for the compressed
            timelines and urgent search behavior that define seasonal industries.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Local SEO & Maps",
                desc: "Rank in the Google Maps 3-pack for 'snow removal near me' and neighborhood-level seasonal service searches across NYC.",
                href: "/services/local-seo",
              },
              {
                title: "Google Business Profile",
                desc: "Fully optimized GBP with seasonal hours, emergency availability, service areas, review strategy, and storm-event posts.",
                href: "/services/google-business-profile",
              },
              {
                title: "AI Search Optimization",
                desc: "Get cited when property managers ask ChatGPT or Perplexity for snow removal recommendations in their borough.",
                href: "/services/ai-search-optimization",
              },
              {
                title: "Content Marketing",
                desc: "Pre-season guides, storm preparation content, compliance articles, and seasonal tips that build authority before peak demand.",
                href: "/services/content-marketing",
              },
              {
                title: "On-Page SEO",
                desc: "Title tags, schema markup, internal linking, and technical optimization for every service page and location page.",
                href: "/services/on-page-seo",
              },
              {
                title: "Off-Page SEO",
                desc: "Local citations, property management directory listings, backlinks from neighborhood associations and local media.",
                href: "/services/off-page-seo",
              },
              {
                title: "Web Design & Development",
                desc: "Fast, mobile-first websites with emergency contact buttons, service area maps, contract request forms, and real-time availability.",
                href: "/services/web-design-development",
              },
              {
                title: "Analytics & Reporting",
                desc: "Seasonal dashboards tracking pre-season rankings, in-season conversions, contract requests, and year-over-year growth.",
                href: "/services/analytics-reporting",
              },
              {
                title: "SEO Strategy",
                desc: "Pre-season keyword planning, competitive analysis, content calendars timed to search volume surges, and seasonal forecasting.",
                href: "/services/seo-strategy",
              },
              {
                title: "Automation",
                desc: "Programmatic neighborhood and borough pages that scale your geographic coverage without manual effort.",
                href: "/services/automation",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-bold text-white group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Our Process ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our Process for Seasonal Business SEO
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Seasonal SEO runs on a different clock. We front-load the heavy
            lifting so you&apos;re ranked and ready before the first flake falls.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Off-Season Audit",
                desc: "Spring and summer: we analyze your current rankings, audit your website, map competitor positions, and identify every keyword opportunity for the coming season.",
              },
              {
                step: "02",
                title: "Pre-Season Build",
                desc: "Summer through early fall: website optimization, content creation, GBP overhaul, citation building, and backlink campaigns. All timed to index before search volume spikes.",
              },
              {
                step: "03",
                title: "Peak-Season Execution",
                desc: "During the season: real-time GBP updates, storm-event content, review collection, and conversion optimization. Every lead is captured at the moment of maximum intent.",
              },
              {
                step: "04",
                title: "Post-Season Analysis",
                desc: "After the season: full performance review, contract renewal content, testimonial collection, and strategic planning for next year. Continuous improvement cycle.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6"
              >
                <div className="text-2xl font-extrabold text-[#0080FE]">
                  {item.step}
                </div>
                <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Mid CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── 6. Industry Deep-Dive ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Seasonal Services Market in NYC
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            NYC&apos;s seasonal service industry centers on snow removal &mdash; a market
            with strict legal requirements, high urgency, and compressed demand windows.
            Here&apos;s what drives the{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">strategy</Link>{" "}
            we build for seasonal businesses.
          </p>

          {/* How to Choose */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold">
              How Property Owners Choose Seasonal Service Providers
            </h3>
            <div className="mt-6 space-y-4">
              {content.seoProcess.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-[#141414] p-5"
                >
                  <h4 className="font-semibold text-[#EFF70A]">{item.step}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Context */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold">Seasonal Service Costs in NYC</h3>
            <p className="mt-4 text-zinc-300">{content.investmentContext}</p>
            <ul className="mt-6 space-y-2">
              {content.investmentFactors.map((factor, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0080FE]" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>

          {/* Common Mistakes */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold">
              Mistakes Seasonal Businesses Make with Their Online Presence
            </h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.seoMistakes.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-[#141414] p-5"
                >
                  <h4 className="font-semibold text-red-400">{item.mistake}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{item.consequence}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Business Types Grid ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Seasonal Business Types We Work With
          </h2>
          <p className="mt-4 text-zinc-400">
            Seasonal businesses require a fundamentally different SEO approach &mdash;
            one built around demand cycles, weather events, and pre-season positioning.
            Our{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine optimization</Link>{" "}
            is designed for it.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group rounded-xl border border-zinc-700 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[#0080FE]">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>

          {/* Additional seasonal verticals we can help with */}
          <div className="mt-10">
            <h3 className="text-xl font-bold">
              Other Seasonal Verticals We Support
            </h3>
            <p className="mt-3 text-sm text-zinc-400">
              Beyond snow removal, we work with seasonal businesses across the spectrum.
              If your revenue depends on weather, holidays, or calendar-driven demand,
              our SEO approach applies.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "Holiday lighting installation",
                "Gutter cleaning services",
                "Ice dam removal",
                "Winter property inspections",
                "Seasonal landscaping",
                "Holiday event planners",
                "Winter pest control",
                "Emergency weather services",
              ].map((vertical) => (
                <div
                  key={vertical}
                  className="rounded-lg border border-zinc-700 bg-[#141414] p-4 text-sm text-zinc-300"
                >
                  {vertical}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Pricing ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Seasonal Business SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Pricing designed for the seasonal business model. Year-round SEO that
            peaks when you need it most. See our full{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
            for details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[#0080FE] bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">Monthly Retainer</h3>
              <div className="mt-2 text-4xl font-extrabold">$3,500<span className="text-lg font-normal text-zinc-400">/mo</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                Year-round SEO with seasonal intensity scaling. Off-season foundation work,
                pre-season content blitz, and peak-season conversion optimization.
                Includes{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">GBP management</Link>,{" "}
                content, link building, and{" "}
                <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">reporting</Link>.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#EFF70A]">Project-Based</h3>
              <div className="mt-2 text-4xl font-extrabold">$2,500<span className="text-lg font-normal text-zinc-400"> starting</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                One-time projects: pre-season website builds, SEO audits, GBP setup, or{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link>{" "}
                overhauls. Get your digital foundation built before the season starts.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-white">Consulting</h3>
              <div className="mt-2 text-4xl font-extrabold">$150<span className="text-lg font-normal text-zinc-400">/hr</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing consulting</Link>{" "}
                for seasonal business owners. Pre-season strategy sessions, competitive analysis,
                and actionable plans you can implement yourself or hand off to your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Region Coverage ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Seasonal Business SEO Across the NYC Metro
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Snow removal requirements and enforcement vary by borough and municipality.
            We build location-specific SEO that accounts for these differences. See our{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">full area coverage</Link>.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <div
                key={region}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5"
              >
                <h3 className="font-bold text-white">{region}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {content.regionNotes[region]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Pre-FAQ CTA ── */}
      <CTAGroup variant="preFaq" />

      {/* ── 11. FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Seasonal Business SEO &mdash; Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <h3 className="text-lg font-semibold">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. Cross-Links & Final CTA ── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Explore More Industries We Serve
          </h2>
          <p className="mt-4 text-zinc-400">
            Seasonal services are one of many industries we build SEO platforms for.
            See how we help businesses in every sector across NYC.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Home Services", slug: "home-services" },
              { name: "Health & Medical", slug: "health-medical" },
              { name: "Beauty & Personal Care", slug: "beauty-personal-care" },
              { name: "Pet Services", slug: "pet-services" },
              { name: "Food & Dining", slug: "food-dining" },
              { name: "Legal", slug: "legal" },
              { name: "Lifestyle", slug: "lifestyle" },
              { name: "Automotive", slug: "automotive" },
            ].map((cat) => (
              <Link
                key={cat.slug}
                href={`/businesses/${cat.slug}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 text-center font-medium transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">SEO Services</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Local SEO</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">AI Search Optimization</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Content Marketing</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">On-Page SEO</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Off-Page SEO</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Automation</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Web Design</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Full Loop CRM</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">AI Agent Development</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Pricing</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">All Businesses</Link>
            <span className="text-zinc-600">|</span>
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Areas We Serve</Link>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
