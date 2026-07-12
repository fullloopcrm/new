import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllServices,
  getAllNeighborhoods,
  getServicesByCategory,
  getCategories,
  categoryToSlug,
  getRegions,
} from "@/app/site/the-nyc-seo/_lib/data";
import {
  serviceToIndustrySlug,
  getOrganizationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  SITE_URL,
} from "@/app/site/the-nyc-seo/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

export const metadata: Metadata = {
  title: "SEO for 172 Business Types | Industry-Specific SEO NYC",
  description:
    "Industry-specific SEO and AI search optimization for 172 service business types across NYC, NJ, Long Island & Westchester. Plumbers to lawyers to med spas. Find your industry.",
  keywords: [
    "SEO for plumbers NYC",
    "SEO for lawyers NYC",
    "SEO for dentists NYC",
    "SEO for contractors NYC",
    "SEO for med spas NYC",
    "industry specific SEO NYC",
    "local business SEO NYC",
    "SEO agency for service businesses",
    "AI search optimization businesses",
  ],
  openGraph: {
    title: "SEO for 172 Business Types | Industry-Specific SEO NYC",
    description:
      "Industry-specific SEO for 172 service business types across 318+ neighborhoods.",
    url: `${SITE_URL}/industries`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/industries`,
  },
};

export default function IndustriesPage() {
  const servicesByCategory = getServicesByCategory();
  const categories = getCategories();
  const allServices = getAllServices();
  const totalServices = allServices.length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalPages = totalServices * totalNeighborhoods;
  const regions = getRegions();

  const faqItems = [
    {
      q: "How many industries do you serve?",
      a: `We build SEO and AI search platforms for ${totalServices} service business types across ${categories.length} industries — home services, healthcare, legal, financial, automotive, beauty, education, events, real estate, and more.`,
    },
    {
      q: "Is your SEO customized for each industry?",
      a: "Yes. Every industry has different competitive dynamics, keyword patterns, and customer behavior. Our campaigns are built specifically for your industry — a plumber gets a different strategy than a law firm or med spa.",
    },
    {
      q: "How much does industry-specific SEO cost?",
      a: "Monthly retainers start at $3,500/month for a full-service campaign. Cost depends on your industry, competitive landscape, and how many neighborhoods you target. Project-based work starts at $2,500.",
    },
    {
      q: "Do you work with multiple businesses in the same industry?",
      a: "We work with multiple clients in the same industry but limit territory overlap. Your neighborhood rankings are protected — we won't rank a competing business in the same area.",
    },
    {
      q: "What results can I expect?",
      a: "Typical outcomes: 3-5x organic traffic increase in 6 months, top-3 Maps ranking for primary keywords, 40-60% increase in phone calls, and measurable AI search presence on ChatGPT and Perplexity.",
    },
    {
      q: "Can you help with AI search (ChatGPT, Perplexity)?",
      a: "Yes. AI search optimization is built into every campaign. We structure your content so AI platforms recommend your business when people ask for local service recommendations.",
    },
  ];

  const organizationSchema = getOrganizationSchema();
  const faqSchema = getFAQPageSchema(faqItems);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Industries", url: "/industries" },
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Industries We Serve",
    numberOfItems: totalServices,
    itemListElement: allServices.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${s.name} SEO`,
      url: `${SITE_URL}/industries/${serviceToIndustrySlug(s)}`,
    })),
  };

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />

      {/* ============================================================
          SECTION 1 — HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Industries", url: "/industries" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {totalServices} Industries &middot; {categories.length} Categories &middot; 8 Regions &middot; {totalNeighborhoods}+ Neighborhoods
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Industry-Specific{" "}
                <span className="bg-gradient-to-r from-[#0080FE] to-[#A9A6FA] bg-clip-text text-transparent">SEO</span>{" "}
                for Every Business Type
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                We don&apos;t do generic SEO.{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Every campaign</Link>{" "}
                is built for your specific industry — from{" "}
                <Link href="/industries/plumber-business-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">plumbers</Link>{" "}
                to{" "}
                <Link href="/industries/personal-injury-lawyer-business-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">lawyers</Link>{" "}
                to{" "}
                <Link href="/industries/dentist-business-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dentists</Link>{" "}
                to{" "}
                <Link href="/industries/med-spa-business-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">med spas</Link>.{" "}
                {totalServices} industries across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">{totalNeighborhoods}+ neighborhoods</Link>.
              </p>

              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{totalServices}</div>
                <div className="mt-1 text-xs text-zinc-400">Business Types</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">{categories.length}</div>
                <div className="mt-1 text-xs text-zinc-400">Categories</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">{totalPages.toLocaleString()}+</div>
                <div className="mt-1 text-xs text-zinc-400">Pages Built</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
                <div className="text-3xl font-extrabold text-[#0080FE]">8</div>
                <div className="mt-1 text-xs text-zinc-400">Regions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — ALL INDUSTRIES BY CATEGORY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {totalServices} Industries. <span className="text-[#0080FE]">Your Industry Is Here.</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Find your business type below. Each links to a dedicated SEO page built for your industry
            with region breakdowns, service details, and everything we do to rank you.
          </p>

          {categories.map((category) => {
            const services = servicesByCategory[category] || [];
            if (services.length === 0) return null;
            return (
              <div key={category} className="mt-10" id={categoryToSlug(category)}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold text-white">
                    <Link href={`/businesses/${categoryToSlug(category)}`} className="hover:text-[#0080FE]">
                      {category}
                    </Link>
                  </h3>
                  <span className="text-sm text-zinc-500">{services.length} types</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {services.map((service) => (
                    <Link
                      key={service.slug}
                      href={`/industries/${serviceToIndustrySlug(service)}`}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-white"
                    >
                      {service.name} SEO
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 4 — BROWSE BY REGION
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Browse by <span className="text-[#0080FE]">Region</span>
          </h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Every industry page breaks down into 8 regions. Pick your industry above, then drill into your region.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <Link
                key={region}
                href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-[#0080FE]/50"
              >
                <h3 className="font-semibold text-white">{region}</h3>
                <p className="mt-1 text-xs text-zinc-500">{totalServices} industries available</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — CROSS-LINKS
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Explore More</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/services" className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50">
              <h3 className="font-semibold text-white">Our Services</h3>
              <p className="mt-1 text-xs text-zinc-500">18 SEO, AI, and marketing services</p>
            </Link>
            <Link href="/businesses" className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50">
              <h3 className="font-semibold text-white">Industries by Category</h3>
              <p className="mt-1 text-xs text-zinc-500">{categories.length} industry categories</p>
            </Link>
            <Link href="/areas" className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50">
              <h3 className="font-semibold text-white">Service Areas</h3>
              <p className="mt-1 text-xs text-zinc-500">{totalNeighborhoods}+ neighborhoods covered</p>
            </Link>
            <Link href="/pricing" className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 transition-colors hover:border-[#0080FE]/50">
              <h3 className="font-semibold text-white">Pricing</h3>
              <p className="mt-1 text-xs text-zinc-500">Transparent SEO pricing</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 7 — FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Industry SEO — Frequently Asked Questions
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — FINAL CTA
          ============================================================ */}
      <CTAGroup variant="final" />
    </div>
  );
}
