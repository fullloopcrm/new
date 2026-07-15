import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategorySlug, getRegions } from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL, PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

const CATEGORY = "Business Services";
const SLUG = "business-services";
const content = categoryContent[CATEGORY];
const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: "SEO for B2B Service Companies NYC",
  description:
    "SEO and AI search optimization for B2B service companies in NYC. Web designers, marketing agencies, IT firms, consultants, and more. Win contracts, not just clicks.",
  openGraph: {
    title: "SEO for B2B Service Companies NYC",
    description:
      "SEO and AI search optimization for B2B service companies in NYC. Web designers, marketing agencies, IT firms, and consultants.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "Does SEO work for B2B service companies, not just B2C?",
    a: "Absolutely. B2B buyers search Google the same way consumers do -- they type 'IT support company NYC' or 'marketing agency for law firms.' The difference is longer sales cycles and higher contract values. SEO positions your firm as the answer to those searches, feeding your pipeline with qualified prospects who are actively looking for what you sell.",
  },
  {
    q: "How long before we see ROI from SEO as a B2B company?",
    a: "B2B SEO typically shows meaningful pipeline impact within 4-6 months. Because B2B contract values are higher ($5K-$50K+ annually), even a few new clients from organic search can deliver significant ROI. We track leads-to-close attribution so you see exactly which keywords and pages drive revenue, not just traffic.",
  },
  {
    q: "What makes SEO different for business service companies vs. consumer businesses?",
    a: "B2B search intent is different. Buyers are comparing vendors, reading case studies, and evaluating expertise before making contact. We build content strategies around the entire B2B buying journey -- awareness content, comparison pages, case studies, and service-specific landing pages that convert decision-makers, not tire-kickers.",
  },
  {
    q: "How much does SEO cost for a B2B service company?",
    a: "Our monthly retainer starts at $3,500/month, covering strategy, content marketing, local SEO, and AI search optimization. One-time projects like website redesigns start at $2,500. Strategy consulting is available at $150/hour for firms with internal teams that need expert guidance on SEO direction.",
  },
  {
    q: "Can you help us rank for industry-specific terms alongside location terms?",
    a: "That is exactly what we do. We build keyword maps that combine industry verticals with geographic targeting -- 'healthcare IT company Manhattan,' 'law firm marketing agency NYC,' or 'commercial cleaning service Midtown.' Each combination gets its own optimized page, maximizing the number of qualified searches you appear in.",
  },
  {
    q: "How does AI search optimization help B2B companies?",
    a: "Business buyers increasingly use ChatGPT, Perplexity, and Google AI Overviews to research vendors. When a procurement manager asks AI 'best IT support companies in NYC,' your firm needs to be in that answer. We optimize your content structure, authority signals, and entity presence so AI platforms cite your business in relevant queries.",
  },
  {
    q: "Should we invest in SEO if we already get referrals?",
    a: "Referrals are great but unpredictable. SEO creates a consistent, scalable pipeline that does not depend on who you know. More importantly, 70%+ of B2B buyers research a referred company online before making contact. If your website is invisible or unimpressive, you are losing referral-driven opportunities you never even knew about.",
  },
  {
    q: "Do you work with agencies and firms that compete with each other?",
    a: "We limit category exclusivity within specific geographic markets. If we are working with a marketing agency targeting Manhattan, we will not take on a directly competing agency targeting the same area. This ensures our strategy and competitive intelligence work exclusively in your favor.",
  },
];

const serviceCards = [
  {
    title: "Local SEO & Google Maps",
    desc: "Rank in the local pack when decision-makers search 'IT company near me' or 'marketing agency [neighborhood].' Dominate Google Maps and local search where B2B buyers start their vendor search.",
    href: "/services/local-seo",
  },
  {
    title: "SEO Strategy",
    desc: "Competitive analysis, keyword mapping by service vertical and geography, and a 12-month content roadmap designed around B2B buying cycles and high-intent commercial keywords.",
    href: "/services/seo-strategy",
  },
  {
    title: "Content Marketing",
    desc: "Case studies, industry thought leadership, comparison pages, and long-form guides that establish authority and rank for the informational queries your prospects search before they buy.",
    href: "/services/content-marketing",
  },
  {
    title: "AI Search Optimization",
    desc: "Get your firm cited in ChatGPT, Perplexity, and Google AI Overviews when business buyers ask AI for vendor recommendations in your industry and market.",
    href: "/services/ai-search-optimization",
  },
  {
    title: "Google Business Profile",
    desc: "Optimized GBP listing with review generation, service descriptions, project photos, and weekly posting that builds trust and visibility in local search results.",
    href: "/services/google-business-profile",
  },
  {
    title: "Web Design & Development",
    desc: "Professional B2B websites built for lead generation. Case study templates, service pages, team bios, and contact flows designed to convert business buyers.",
    href: "/services/web-design-development",
  },
  {
    title: "On-Page SEO",
    desc: "Every service page, case study, and industry vertical page optimized with precise title tags, meta descriptions, schema markup, and internal linking architecture.",
    href: "/services/on-page-seo",
  },
  {
    title: "Off-Page SEO & Link Building",
    desc: "Earn backlinks from industry publications, business directories, trade associations, and news outlets that boost your domain authority and competitive positioning.",
    href: "/services/off-page-seo",
  },
  {
    title: "Branding & Positioning",
    desc: "Visual identity, messaging framework, and competitive positioning that makes your firm memorable and trustworthy across every digital touchpoint.",
    href: "/services/branding",
  },
  {
    title: "Full Loop CRM",
    desc: "Track leads from first click to signed contract. Attribution modeling, pipeline management, and automated follow-up that connects SEO performance to actual revenue.",
    href: "/services/fullloopcrm",
  },
];

const businessTypes = [
  { name: "Web Designers", slug: "web-designer", desc: "Website design, development, and redesign for businesses" },
  { name: "SEO Companies", slug: "seo-company", desc: "Search engine optimization and digital visibility services" },
  { name: "Marketing Agencies", slug: "marketing-agency", desc: "Digital marketing, social media, PPC, and brand strategy" },
  { name: "Graphic Designers", slug: "graphic-designer", desc: "Logo design, branding, print materials, and visual identity" },
  { name: "IT Support", slug: "it-support", desc: "Computer repair, network setup, cybersecurity, and managed IT" },
  { name: "Printing Services", slug: "printing-service", desc: "Business cards, flyers, banners, signage, and print solutions" },
  { name: "Notaries", slug: "notary", desc: "Mobile notary and notarization for legal documents" },
  { name: "Commercial Cleaners", slug: "commercial-cleaner", desc: "Office cleaning, janitorial, and commercial maintenance" },
  { name: "Security Guards", slug: "security-guard", desc: "Uniformed officers, event security, and property patrol" },
];

const processSteps = [
  { step: "Market & Competitor Analysis", detail: "We audit your current search presence, analyze your top 5-10 competitors, and identify the exact keywords and content gaps that represent the biggest revenue opportunities for your firm." },
  { step: "B2B Keyword Strategy", detail: "We map keywords to your specific services, target industries, and geographic markets -- focusing on high-intent commercial terms that attract decision-makers, not just browsers." },
  { step: "Technical & On-Page Foundation", detail: "Site speed, crawlability, schema markup, and on-page optimization across every service page, case study, and landing page. The technical foundation that makes everything else work." },
  { step: "Content & Authority Build", detail: "Case studies, thought leadership articles, industry guides, and service comparison pages that demonstrate expertise and rank for the terms your prospects search during their buying journey." },
  { step: "Local SEO & Reputation", detail: "Google Business Profile optimization, directory citations, and a systematic review generation program that builds the trust signals B2B buyers rely on when shortlisting vendors." },
  { step: "Pipeline Tracking & Optimization", detail: "Monthly reporting that tracks leads, pipeline value, and revenue attribution from SEO. We optimize based on what drives contracts, not vanity metrics like impressions." },
];

export default function BusinessServicesPage() {
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
    name: "SEO for B2B Service Companies NYC",
    description:
      "Search engine optimization and AI search visibility for web design firms, marketing agencies, IT companies, consultants, and B2B service businesses in New York City.",
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
              { name: "Business Services", url: "/businesses/business-services" },
            ]}
            dark
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                SEO for B2B &middot; NYC &middot; All Boroughs
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO That Wins{" "}
                <span className="text-[#EFF70A]">Contracts, Not Just Clicks</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                When a business owner searches <em>&quot;IT support company Manhattan&quot;</em> or{" "}
                <em>&quot;marketing agency for small business NYC,&quot;</em>{" "}
                they are ready to hire. If your B2B firm is not on page one, a competitor
                is closing that deal instead. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>,{" "}
                <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content engines</Link>, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>{" "}
                for{" "}
                <Link href="/web-designer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">web design firms</Link>,{" "}
                <Link href="/marketing-agency" className="text-[#5CB8FF] hover:text-[#8DD0FF]">marketing agencies</Link>,{" "}
                <Link href="/it-support" className="text-[#5CB8FF] hover:text-[#8DD0FF]">IT companies</Link>, and every B2B service business across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC and the tri-state area</Link>.
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

      {/* ── 2. Why B2B Needs SEO ──────────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why B2B Service Companies Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            The days of winning B2B contracts through cold calls and networking events alone
            are over. Today, 71% of B2B buyers start their vendor search on Google. The firms
            that dominate search results dominate their market. The ones that do not are stuck
            competing on price with whoever is left.
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
            B2B search is different from consumer search. Buyers are comparing vendors,
            evaluating case studies, and shortlisting firms before they ever reach out.{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
            ensures your firm is in that consideration set from the start. Combined with{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile optimization</Link>{" "}
            and <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">off-page authority building</Link>,
            your service company becomes the obvious choice in your vertical and geography.
          </p>
        </div>
      </section>

      {/* ── 3. What We Build ─────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for B2B Service Companies
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Every B2B SEO engagement is structured around your firm&apos;s service offerings,
            target industries, and geographic markets. Here is the full scope of what we deliver.
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
            Our B2B SEO Process
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Built for firms that measure success in contracts signed, not pageviews.
            Twenty years of experience distilled into a repeatable system.
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
        title="Your Next Client Is Searching Google Right Now"
        subtitle="If they find your competitor instead, that's a contract you'll never know you lost. Let's make sure they find you."
      />

      {/* ── 6. Industry Deep-Dive ────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The B2B SEO Landscape in NYC
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">{content.investmentContext}</p>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">Mistakes B2B Companies Make With Their Online Presence</h3>
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
            <h3 className="text-2xl font-bold">When B2B Companies Should Invest in SEO</h3>
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
            <h3 className="text-2xl font-bold">What to Look for in an SEO Partner</h3>
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
            B2B Business Types We Serve
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We build SEO programs for every type of B2B service company in the NYC metro area.
            Click any business type to see how we approach their specific market.
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
            <Link href="/businesses/financial" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Financial Services</Link>,{" "}
            <Link href="/businesses/legal" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Legal</Link>, and{" "}
            <Link href="/businesses/education" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Education</Link>.
          </p>
        </div>
      </section>

      {/* ── 8. Pricing ───────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            B2B SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Straightforward pricing for B2B service companies. No hidden fees, no lock-in contracts.
            See our full{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
            for more detail.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Monthly Retainer
              </div>
              <div className="mt-4 text-4xl font-extrabold">$3,500</div>
              <div className="text-zinc-400">/month</div>
              <p className="mt-4 text-sm text-zinc-400">
                Full-service SEO covering{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local search</Link>,{" "}
                content marketing,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">GBP optimization</Link>,
                and AI search visibility. The complete growth engine for B2B firms
                that want a predictable pipeline.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Project-Based
              </div>
              <div className="mt-4 text-4xl font-extrabold">$2,500</div>
              <div className="text-zinc-400">starting</div>
              <p className="mt-4 text-sm text-zinc-400">
                One-time engagements like{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website builds</Link>,
                SEO audits, competitive analyses, or{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding projects</Link>.
                Defined scope and fixed pricing.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Consulting
              </div>
              <div className="mt-4 text-4xl font-extrabold">$150</div>
              <div className="text-zinc-400">/hour</div>
              <p className="mt-4 text-sm text-zinc-400">
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Expert consulting</Link>{" "}
                for firms with internal teams that need strategic direction on SEO,{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search</Link>, and
                digital growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Region Coverage ───────────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            B2B SEO Across NYC &amp; the Tri-State Area
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We build location-targeted SEO programs for B2B companies across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">all 318+ neighborhoods</Link>{" "}
            we serve. Each market has unique dynamics that shape our strategy.
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
        title="20 Years Ranking B2B Companies. Your Turn."
        subtitle="We've built SEO engines for firms just like yours. The ones who started early own their market. The ones who waited are still trying to catch up."
      />

      {/* ── 11. FAQ ──────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions about SEO for B2B service companies in the NYC metro area.
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
                  <Link href="/businesses/education" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Education SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/real-estate" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Real Estate SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/health-medical" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Health &amp; Medical SEO</Link>
                </li>
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
                  <Link href="/businesses/food-dining" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Food &amp; Dining SEO</Link>
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
                  <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO Strategy</Link>
                </li>
                <li>
                  <Link href="/services/automation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Automation &amp; Programmatic SEO</Link>
                </li>
                <li>
                  <Link href="/services/analytics-reporting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Analytics &amp; Reporting</Link>
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
