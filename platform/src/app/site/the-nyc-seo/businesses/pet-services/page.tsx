// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategorySlug, getRegions } from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL, PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

const CATEGORY = "Pet Services";
const SLUG = "pet-services";
const content = categoryContent[CATEGORY];
const services = getServicesByCategorySlug(SLUG);
const regions = getRegions();

export const metadata: Metadata = {
  title: "SEO for Pet Service Businesses NYC",
  description:
    "SEO and AI search optimization for pet service businesses in NYC. Dog walkers, groomers, trainers, and veterinarians — rank on Google, Bing, and ChatGPT.",
  openGraph: {
    title: "SEO for Pet Service Businesses NYC",
    description:
      "SEO and AI search optimization for pet service businesses in NYC. Dog walkers, groomers, trainers, and veterinarians — rank on Google, Bing, and ChatGPT.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "How long does it take to rank a pet service business on Google?",
    a: "Most pet service businesses see measurable ranking improvements within 3-6 months. Dog walkers and groomers targeting neighborhood-level keywords can rank faster because the competition is hyper-local. Citywide rankings for terms like 'best dog trainer NYC' take longer — typically 6-12 months depending on your existing web presence.",
  },
  {
    q: "Is SEO worth it for a dog walking business?",
    a: "Absolutely. Dog walkers depend on trust and proximity — pet owners search for walkers near their home. Local SEO puts your business in front of owners in your exact neighborhood through Google Maps, organic results, and AI search tools. One new recurring client covers your monthly SEO investment multiple times over.",
  },
  {
    q: "What keywords do pet service businesses need to target?",
    a: "The highest-value keywords combine your service type with location: 'dog groomer Upper West Side,' 'dog trainer Brooklyn Heights,' 'pet sitter near me.' We also target long-tail queries like 'best dog walker for anxious dogs NYC' and 'affordable puppy training Manhattan' that signal high purchase intent.",
  },
  {
    q: "Do you optimize Google Business Profiles for pet businesses?",
    a: "Yes — Google Business Profile optimization is a core part of every pet service SEO engagement. We optimize your categories, service areas, business description, photos, and review strategy. For pet businesses, GBP drives more leads than organic search because pet owners rely heavily on Maps results and reviews.",
  },
  {
    q: "Can SEO help my pet business show up in AI search results?",
    a: "Yes. Our AI search optimization ensures your pet business appears in ChatGPT, Perplexity, Gemini, and other AI-powered search tools. As more pet owners ask AI assistants to recommend dog walkers and groomers, being cited in those answers becomes a significant competitive advantage.",
  },
  {
    q: "What's included in the $3,500/month retainer for pet service SEO?",
    a: "The retainer covers keyword strategy, on-page SEO, Google Business Profile management, content creation, local citation building, review strategy, monthly reporting, and AI search optimization. For pet businesses we also build neighborhood-level landing pages targeting the specific areas you serve.",
  },
  {
    q: "Do you build websites for pet service businesses?",
    a: "Yes. We build fast, SEO-optimized websites designed to convert pet owners into customers. Every site includes location pages for your service areas, service pages for each offering, a review showcase, online booking integration, and full mobile optimization — because most pet owners search on their phones.",
  },
  {
    q: "How do you measure SEO results for pet businesses?",
    a: "We track keyword rankings, organic traffic, Google Business Profile views and actions, phone calls, form submissions, and direction requests. You get a monthly report showing exactly how many new pet owners found your business through search. We also track AI search citations and referral traffic from ChatGPT and Perplexity.",
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
  name: "SEO for Pet Service Businesses",
  description:
    "Comprehensive SEO and AI search optimization for pet service businesses including dog walkers, groomers, trainers, and pet sitters in the NYC metro area.",
  provider: organizationSchema,
  areaServed: {
    "@type": "City",
    name: "New York",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Pet Service SEO Packages",
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

export default function PetServicesPage() {
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
              { name: "Pet Services", url: "/businesses/pet-services" },
            ]}
            dark
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                SEO for Pet Service Businesses
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Your Clients Search Before They
                <span className="text-[#EFF70A]"> Trust You With Their Pets</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Pet owners in NYC don&apos;t pick a{" "}
                <Link href="/dog-walker" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dog walker</Link>,{" "}
                <Link href="/dog-groomer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">groomer</Link>, or{" "}
                <Link href="/dog-trainer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">trainer</Link>{" "}
                at random. They search Google, read reviews, check Maps, and ask ChatGPT. If your
                pet service business isn&apos;t ranking, you&apos;re invisible to 1.1 million pet-owning
                households. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that put your pet business in front of the right owners, in the right neighborhood, at the exact moment they need you.
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

      {/* ── 2. Why Pet Services Need SEO ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Pet Service Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            NYC&apos;s pet industry is booming &mdash; and fiercely competitive. Dog walkers,
            groomers, trainers, and{" "}
            <Link href="/pet-sitter" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pet sitters</Link>{" "}
            who don&apos;t invest in{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            lose ground to competitors who do. Pet care is inherently local &mdash; owners want
            someone in their neighborhood they can trust with their keys and their animals.{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
            optimization and neighborhood-level content are what separate a fully booked calendar
            from an empty one.
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
            What We Build for Pet Service Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A full-stack SEO and digital presence platform, purpose-built for the
            pet care industry. Every service is designed to generate leads from pet
            owners actively searching for help.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Local SEO & Maps",
                desc: "Dominate the local pack for 'dog walker near me' and neighborhood-specific pet service searches.",
                href: "/services/local-seo",
              },
              {
                title: "Google Business Profile",
                desc: "Fully optimized GBP with review strategy, photos, posts, and Q&A management for your pet business.",
                href: "/services/google-business-profile",
              },
              {
                title: "AI Search Optimization",
                desc: "Get cited when pet owners ask ChatGPT, Perplexity, or Gemini for pet service recommendations.",
                href: "/services/ai-search-optimization",
              },
              {
                title: "Content Marketing",
                desc: "Pet care guides, neighborhood spotlights, and breed-specific content that builds authority and trust.",
                href: "/services/content-marketing",
              },
              {
                title: "On-Page SEO",
                desc: "Title tags, schema markup, internal linking, and page speed optimized for every pet service page.",
                href: "/services/on-page-seo",
              },
              {
                title: "Off-Page SEO",
                desc: "Local citations, pet directory listings, backlink building, and review acquisition across platforms.",
                href: "/services/off-page-seo",
              },
              {
                title: "Web Design & Development",
                desc: "Fast, mobile-first websites with online booking, service area pages, and review showcases.",
                href: "/services/web-design-development",
              },
              {
                title: "Analytics & Reporting",
                desc: "Monthly reports tracking rankings, traffic, calls, bookings, and AI search citations for your pet business.",
                href: "/services/analytics-reporting",
              },
              {
                title: "SEO Strategy",
                desc: "Keyword research, competitive analysis, and a custom roadmap for dominating pet service search in your market.",
                href: "/services/seo-strategy",
              },
              {
                title: "Automation & Programmatic Pages",
                desc: "Neighborhood landing pages at scale — target every block your dog walkers and groomers serve.",
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
            Our Process for Pet Service SEO
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            From audit to execution &mdash; here&apos;s how we take your pet business
            from invisible to fully booked.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Audit & Discovery",
                desc: "We analyze your current rankings, competitor landscape, review profile, and website performance. We identify every keyword your pet business should own.",
              },
              {
                step: "02",
                title: "Strategy & Roadmap",
                desc: "Custom keyword strategy targeting neighborhood-level and citywide pet service terms. We map your service areas, define content priorities, and set measurable goals.",
              },
              {
                step: "03",
                title: "Build & Optimize",
                desc: "Website overhaul or new build, GBP optimization, local citations, content creation, and on-page SEO. Every page built to rank and convert pet owners.",
              },
              {
                step: "04",
                title: "Scale & Report",
                desc: "Programmatic neighborhood pages, ongoing content, link building, review strategy, and monthly reporting. We scale what works and cut what doesn't.",
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
            The Pet Service Market in NYC
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Understanding the NYC pet care landscape is critical for effective SEO.
            Here&apos;s what we know from working in this market &mdash; and how it shapes
            the{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">strategy</Link>{" "}
            we build for pet businesses.
          </p>

          {/* How to Choose */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold">
              What Pet Owners Look For When Choosing a Provider
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
            <h3 className="text-2xl font-bold">Pet Service Costs in NYC</h3>
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
              Mistakes Pet Service Businesses Make Online
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
            Pet Service Business Types We Work With
          </h2>
          <p className="mt-4 text-zinc-400">
            Every pet service vertical has unique keyword opportunities and customer behavior patterns.
            We tailor{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine optimization</Link>{" "}
            to match.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      </section>

      {/* ── 8. Pricing ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pet Service SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Transparent pricing for pet service businesses. No hidden fees, no long-term
            lock-ins. See our full{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
            for details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[#0080FE] bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">Monthly Retainer</h3>
              <div className="mt-2 text-4xl font-extrabold">$3,500<span className="text-lg font-normal text-zinc-400">/mo</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                Full-service SEO including strategy, on-page optimization,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">GBP management</Link>,
                content, link building, and monthly reporting. Best for pet businesses ready to grow consistently.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#EFF70A]">Project-Based</h3>
              <div className="mt-2 text-4xl font-extrabold">$2,500<span className="text-lg font-normal text-zinc-400"> starting</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                One-time projects like website builds, SEO audits, or{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link>{" "}
                overhauls. Ideal for pet businesses that need a strong foundation before committing to ongoing SEO.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-white">Consulting</h3>
              <div className="mt-2 text-4xl font-extrabold">$150<span className="text-lg font-normal text-zinc-400">/hr</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                Hourly{" "}
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing consulting</Link>{" "}
                for pet business owners who want expert guidance without a full engagement.
                Strategy sessions, audits, and second opinions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Region Coverage ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pet Service SEO Across the NYC Metro
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We build location-specific SEO for pet businesses across every borough and
            the surrounding metro area. Browse our{" "}
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
            Pet Service SEO &mdash; Frequently Asked Questions
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
            Pet services are one of many industries we build SEO platforms for. See
            how we help businesses across NYC.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Home Services", slug: "home-services" },
              { name: "Health & Medical", slug: "health-medical" },
              { name: "Beauty & Personal Care", slug: "beauty-personal-care" },
              { name: "Legal", slug: "legal" },
              { name: "Food & Dining", slug: "food-dining" },
              { name: "Fitness & Wellness", slug: "fitness-wellness" },
              { name: "Lifestyle", slug: "lifestyle" },
              { name: "Seasonal", slug: "seasonal" },
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
            <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF] text-sm">Off-Page SEO</Link>
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
