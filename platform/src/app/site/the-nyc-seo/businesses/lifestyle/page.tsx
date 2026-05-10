// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategorySlug, getRegions } from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL, PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

const CATEGORY = "Lifestyle";
const SLUG = "lifestyle";
const content = categoryContent[CATEGORY];
const services = getServicesByCategorySlug(SLUG);
const regions = getRegions();

export const metadata: Metadata = {
  title: "SEO for Lifestyle Businesses NYC",
  description:
    "SEO and AI search optimization for lifestyle businesses in NYC. Dry cleaners, tailors, laundromats, personal shoppers, and interior designers — get found online.",
  openGraph: {
    title: "SEO for Lifestyle Businesses NYC",
    description:
      "SEO and AI search optimization for lifestyle businesses in NYC. Dry cleaners, tailors, laundromats, personal shoppers, and interior designers — get found online.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "How does SEO help a dry cleaning business get more customers?",
    a: "Dry cleaning is a hyper-local search — people want the closest option to their apartment or commute. Local SEO puts your business in the Google Maps 3-pack for searches like 'dry cleaner near me' and 'same day dry cleaning [neighborhood].' We also optimize your Google Business Profile, build local citations, and create content that targets the specific neighborhoods you serve.",
  },
  {
    q: "Is SEO worth it for a laundromat?",
    a: "Yes. Millions of NYC residents without in-unit laundry search for laundromats online. 'Laundromat near me' and 'wash and fold [neighborhood]' are high-intent queries that drive foot traffic directly. SEO ensures your laundromat appears in Maps, organic results, and increasingly in AI search tools like ChatGPT when residents ask for recommendations.",
  },
  {
    q: "What keywords should a tailor target for SEO?",
    a: "High-value tailor keywords include 'tailor near me,' 'suit alterations [neighborhood],' 'custom tailor NYC,' and 'wedding dress alterations [borough].' We also target long-tail queries like 'affordable suit tailoring Midtown' and 'same day hem repair NYC' that capture customers with immediate needs and high purchase intent.",
  },
  {
    q: "How long before a lifestyle business sees SEO results?",
    a: "Most lifestyle businesses see ranking improvements within 3-5 months for neighborhood-level keywords. Broader terms like 'best dry cleaner NYC' take 6-12 months depending on competition. The advantage of lifestyle SEO is that local intent keywords often have less competition than other industries, so results can come faster.",
  },
  {
    q: "Do you manage Google Business Profiles for lifestyle businesses?",
    a: "Yes — GBP management is included in every engagement. For lifestyle businesses, we optimize your business categories, service descriptions, photos, hours, and review response strategy. We also create Google Posts highlighting seasonal services, promotions, and new offerings to keep your profile active and visible.",
  },
  {
    q: "Can AI search optimization help my lifestyle business?",
    a: "Absolutely. When someone asks ChatGPT 'best dry cleaner in the West Village' or 'where should I get my suit altered in Brooklyn,' your business needs to be in that answer. Our AI search optimization ensures your website has the structured data, content authority, and citation profile that AI tools use to generate recommendations.",
  },
  {
    q: "What does the $3,500/month retainer include for lifestyle businesses?",
    a: "The retainer covers keyword strategy, on-page and technical SEO, Google Business Profile management, content creation, local citation building, off-page SEO, review strategy, AI search optimization, and detailed monthly reporting. For lifestyle businesses we focus heavily on neighborhood targeting and 'near me' optimization.",
  },
  {
    q: "Do you build websites for dry cleaners and laundromats?",
    a: "Yes. We design and develop fast, mobile-optimized websites for lifestyle businesses. Features include online scheduling, service area pages, pricing displays, pickup/delivery booking integration, and review showcases. Every site is built on a modern framework optimized for search performance and conversion.",
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
  name: "SEO for Lifestyle Businesses",
  description:
    "Comprehensive SEO and AI search optimization for lifestyle businesses including dry cleaners, tailors, laundromats, personal shoppers, and interior designers in the NYC metro area.",
  provider: organizationSchema,
  areaServed: {
    "@type": "City",
    name: "New York",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Lifestyle Business SEO Packages",
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

export default function LifestylePage() {
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
              { name: "Lifestyle", url: "/businesses/lifestyle" },
            ]}
            dark
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                SEO for Lifestyle Businesses
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Convenience Is the Product.
                <span className="text-[#EFF70A]"> Search Is How They Find You.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                NYC residents pick their{" "}
                <Link href="/dry-cleaner" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dry cleaner</Link>,{" "}
                <Link href="/tailor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">tailor</Link>, and{" "}
                <Link href="/laundromat" className="text-[#5CB8FF] hover:text-[#8DD0FF]">laundromat</Link>{" "}
                based on one thing: proximity. And they find nearby options by searching
                Google, checking Maps, and asking AI assistants. If your lifestyle business
                doesn&apos;t show up when someone searches &ldquo;near me,&rdquo; you&apos;re
                losing to the competitor on the next block. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link> and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search platforms</Link>{" "}
                that make your lifestyle business the first result for every neighborhood you serve.
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

      {/* ── 2. Why Lifestyle Businesses Need SEO ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Lifestyle Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            Lifestyle services &mdash; dry cleaning, tailoring, laundry, personal shopping, interior
            design &mdash; thrive on repeat customers who live or work nearby.{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Local SEO</Link>{" "}
            is the single most effective way to put your business on the radar of every potential
            customer within walking distance. Without it, you&apos;re relying on foot traffic and
            word of mouth alone &mdash; while competitors with optimized{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profiles</Link>{" "}
            capture every search.
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
            What We Build for Lifestyle Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A complete digital growth platform tailored for convenience-driven lifestyle
            businesses. Every deliverable is built to capture nearby customers at the
            moment they&apos;re searching.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Local SEO & Maps",
                desc: "Own the Google Maps 3-pack for 'dry cleaner near me,' 'laundromat near me,' and every other lifestyle search in your area.",
                href: "/services/local-seo",
              },
              {
                title: "Google Business Profile",
                desc: "Optimized GBP with accurate hours, services, photos, review management, and Google Posts that keep your listing active.",
                href: "/services/google-business-profile",
              },
              {
                title: "AI Search Optimization",
                desc: "Get recommended when residents ask ChatGPT, Perplexity, or Gemini for the best dry cleaner or tailor in their neighborhood.",
                href: "/services/ai-search-optimization",
              },
              {
                title: "Content Marketing",
                desc: "Neighborhood guides, garment care tips, and seasonal content that builds authority and drives organic traffic year-round.",
                href: "/services/content-marketing",
              },
              {
                title: "On-Page SEO",
                desc: "Title tags, meta descriptions, schema markup, and internal linking optimized for every service and location page.",
                href: "/services/on-page-seo",
              },
              {
                title: "Off-Page SEO",
                desc: "Local directory listings, industry citations, backlink building from neighborhood blogs and lifestyle publications.",
                href: "/services/off-page-seo",
              },
              {
                title: "Web Design & Development",
                desc: "Clean, fast websites with online scheduling, pickup/delivery booking, service area pages, and mobile-first design.",
                href: "/services/web-design-development",
              },
              {
                title: "Analytics & Reporting",
                desc: "Monthly dashboards tracking rankings, traffic, phone calls, directions requests, and new customer acquisition.",
                href: "/services/analytics-reporting",
              },
              {
                title: "Branding",
                desc: "Visual identity, logo design, and brand positioning that makes your lifestyle business stand out in a crowded market.",
                href: "/services/branding",
              },
              {
                title: "Full Loop CRM",
                desc: "Convert search traffic into repeat customers with automated follow-ups, loyalty programs, and review requests.",
                href: "/services/fullloopcrm",
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
            Our Process for Lifestyle Business SEO
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A proven system that takes lifestyle businesses from undiscoverable to
            the top of local search results.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Local Audit",
                desc: "We map your current search presence, analyze competitors on your block and in your neighborhood, and identify every ranking opportunity your business is missing.",
              },
              {
                step: "02",
                title: "Neighborhood Strategy",
                desc: "We build a keyword and content plan targeting the exact streets, subway stops, and neighborhoods your customers search from. Every page maps to real customer intent.",
              },
              {
                step: "03",
                title: "Build & Launch",
                desc: "Website optimization or new build, GBP overhaul, citation cleanup, on-page SEO, and initial content. Everything goes live with tracking in place from day one.",
              },
              {
                step: "04",
                title: "Grow & Scale",
                desc: "Ongoing content, new neighborhood pages, review generation, link building, and monthly performance reviews. We expand your footprint systematically.",
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
            The Lifestyle Services Market in NYC
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            NYC&apos;s lifestyle services sector is massive &mdash; over 6,000 dry cleaners, 3,500
            laundromats, and thousands of tailors serving 8.3 million residents. Understanding
            this market shapes every{" "}
            <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">strategy</Link>{" "}
            decision we make.
          </p>

          {/* How to Choose */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold">
              How Customers Choose Lifestyle Service Providers
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
            <h3 className="text-2xl font-bold">Lifestyle Service Costs in NYC</h3>
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
              Common Mistakes Lifestyle Businesses Make with Their Online Presence
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
            Lifestyle Business Types We Work With
          </h2>
          <p className="mt-4 text-zinc-400">
            From garment care to personal styling &mdash; every lifestyle vertical has distinct
            search patterns and customer expectations. We adapt{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine optimization</Link>{" "}
            to each one.
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
        </div>
      </section>

      {/* ── 8. Pricing ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Lifestyle Business SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Straightforward pricing that makes sense for neighborhood businesses. No
            contracts, no hidden fees. See our full{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
            for details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-[#0080FE] bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">Monthly Retainer</h3>
              <div className="mt-2 text-4xl font-extrabold">$3,500<span className="text-lg font-normal text-zinc-400">/mo</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                Full-service SEO covering strategy,{" "}
                <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">on-page optimization</Link>,
                GBP management, content, citations, reviews, and monthly reporting.
                Ideal for lifestyle businesses ready to dominate their neighborhood.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#EFF70A]">Project-Based</h3>
              <div className="mt-2 text-4xl font-extrabold">$2,500<span className="text-lg font-normal text-zinc-400"> starting</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                One-time engagements: website redesigns, SEO audits,{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link>{" "}
                packages, or GBP setup. Perfect for lifestyle businesses building a digital
                foundation.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-white">Consulting</h3>
              <div className="mt-2 text-4xl font-extrabold">$150<span className="text-lg font-normal text-zinc-400">/hr</span></div>
              <p className="mt-4 text-sm text-zinc-400">
                Expert{" "}
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing consulting</Link>{" "}
                for lifestyle business owners. Strategy sessions, competitive audits, and actionable
                recommendations without a full retainer commitment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Region Coverage ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Lifestyle Business SEO Across the NYC Metro
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We optimize lifestyle businesses for local search across every borough and
            the surrounding metro. Explore our{" "}
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
            Lifestyle Business SEO &mdash; Frequently Asked Questions
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
            Lifestyle services are one of many sectors we build SEO platforms for.
            See what we do for businesses across NYC.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Home Services", slug: "home-services" },
              { name: "Health & Medical", slug: "health-medical" },
              { name: "Beauty & Personal Care", slug: "beauty-personal-care" },
              { name: "Pet Services", slug: "pet-services" },
              { name: "Food & Dining", slug: "food-dining" },
              { name: "Legal", slug: "legal" },
              { name: "Seasonal", slug: "seasonal" },
              { name: "Real Estate", slug: "real-estate" },
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
