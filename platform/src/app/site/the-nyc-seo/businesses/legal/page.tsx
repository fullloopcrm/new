import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import {
  getServicesByCategorySlug,
  getNeighborhoodsByRegion,
  getRegions,
  getCategories,
  categoryToSlug,
} from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";

export const metadata: Metadata = {
  title: "SEO for Law Firms NYC",
  description:
    "SEO for law firms in NYC. We rank personal injury lawyers, divorce attorneys, immigration firms, and 15+ practice areas across 318 neighborhoods.",
  keywords: [
    "SEO for law firms NYC",
    "lawyer SEO New York",
    "personal injury lawyer SEO",
    "law firm marketing NYC",
    "attorney SEO services",
    "legal SEO agency",
    "immigration lawyer SEO NYC",
    "divorce lawyer SEO",
    "law firm digital marketing NYC",
    "local SEO for attorneys",
  ],
  openGraph: {
    title: "SEO for Law Firms NYC",
    description:
      "SEO and AI search optimization for personal injury lawyers, divorce attorneys, immigration firms, and 15+ legal practice areas across NYC.",
    url: `${SITE_URL}/businesses/legal`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/businesses/legal` },
};

const faqs = [
  {
    q: "How does SEO work for law firms in NYC?",
    a: "Law firm SEO combines aggressive local search optimization with practice-area content strategy. We optimize your Google Business Profile for legal categories, build citations on legal directories like Avvo, FindLaw, Justia, Super Lawyers, and Martindale-Hubbell, create practice-area pages targeting high-value case types, and build neighborhood-targeted pages for every jurisdiction you serve. The goal is to rank in the Google Maps local pack and organic results when potential clients search 'personal injury lawyer near me,' 'divorce attorney Brooklyn,' or 'immigration lawyer Queens' — the exact moment they need legal help.",
  },
  {
    q: "How much does SEO cost for a law firm in New York City?",
    a: "Our law firm SEO retainers start at $3,500 per month. This includes Google Business Profile optimization, legal directory citations, practice-area content development, neighborhood-targeted landing pages, review generation systems, and monthly reporting with lead attribution. Project-based work like a full website rebuild with SEO architecture starts at $2,500. Consulting is available at $150 per hour for firms with in-house marketing teams. Given that a single personal injury case can be worth $50,000 to $500,000+ in fees, SEO delivers the highest ROI of any marketing channel for law firms.",
  },
  {
    q: "How long does SEO take for a law firm to see results?",
    a: "Law firms typically see Google Maps local pack improvement within 60 to 90 days. Organic rankings for practice-area keywords take 3 to 6 months depending on competition. Competitive practice areas like personal injury in Manhattan — where firms spend $200+ per click on Google Ads — take 6 to 9 months for consistent page-one positions. Less competitive practice areas and outer borough markets often see faster results. We provide monthly reporting so you see progress from the first month, and our programmatic pages begin indexing within 30 days.",
  },
  {
    q: "Which practice areas benefit most from SEO in NYC?",
    a: "Every practice area benefits, but the highest-ROI practice areas for SEO are personal injury (case values of $100K+), criminal defense (high urgency, immediate search), immigration (massive NYC demand), family law and divorce (high search volume), estate planning (high lifetime value), and real estate law (transaction-driven search patterns). The common thread is that potential clients search Google at the moment of need — after an accident, after an arrest, when facing deportation, or during a divorce. SEO puts your firm in front of them at that critical moment.",
  },
  {
    q: "How competitive is SEO for personal injury lawyers in NYC?",
    a: "Personal injury is the most competitive legal SEO market in the country, and NYC is the most competitive city. Google Ads for 'personal injury lawyer NYC' costs $200 to $400 per click. The firms ranking organically for these keywords get hundreds of free clicks per month that would cost $40,000 to $80,000+ monthly through paid ads. This is why the top personal injury firms invest heavily in SEO — the organic rankings are worth millions in annual lead generation. We have the experience and methodology to compete in this space, but we are transparent: it takes 6 to 12 months to build top-3 rankings for the most competitive PI keywords.",
  },
  {
    q: "Do you help law firms with Google Ads alongside SEO?",
    a: "We focus exclusively on organic search — SEO, local SEO, content marketing, and AI search optimization. We do not manage Google Ads campaigns. However, we frequently work alongside PPC agencies, and our SEO strategy complements paid advertising. Many of our law firm clients run Google Ads during the first 6 months while organic rankings build, then reduce ad spend as SEO takes over. The combination provides immediate visibility (ads) plus long-term asset building (SEO).",
  },
  {
    q: "How do client reviews impact law firm SEO rankings?",
    a: "Client reviews are one of the top three ranking factors for the Google Maps local pack. Law firms with more reviews, higher ratings, and recent review activity outrank competitors with fewer or older reviews. In NYC legal markets, the firms in the local pack typically have 75 to 200+ Google reviews with 4.7+ star averages. We implement ethical review generation systems — automated post-case emails and follow-up sequences — that grow your review count while complying with bar association advertising rules. Every review response is templated to reinforce practice area keywords and geographic relevance.",
  },
  {
    q: "Can you help a solo practitioner compete with large NYC law firms?",
    a: "Absolutely. Solo practitioners and small firms often outperform large firms in local SEO because they can be more agile, more responsive to reviews, and more focused on specific practice areas and neighborhoods. A solo immigration lawyer in Jackson Heights who dominates 'immigration lawyer Jackson Heights' and 'immigration attorney Queens' will generate more relevant leads than a large firm trying to rank citywide. We build hyper-targeted strategies for solo practitioners that maximize visibility in their specific practice area and geographic market.",
  },
];

export default function LegalPage() {
  const services = getServicesByCategorySlug("legal");
  const content = categoryContent["Legal"];
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const allCategories = getCategories().filter((c) => c !== "Legal");

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
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Law Firms NYC",
    description:
      "SEO and AI search optimization for law firms including personal injury lawyers, divorce attorneys, immigration lawyers, criminal defense attorneys, and 15+ legal practice areas across New York City, New Jersey, Long Island, and Westchester.",
    url: `${SITE_URL}/businesses/legal`,
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
      name: "Law Firm SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local SEO for Law Firms" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Business Profile Optimization for Attorneys" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Legal Content Marketing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Search Optimization for Law Firms" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Client Review Generation for Attorneys" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Law Firm Website Design" } },
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

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Legal", url: "/businesses/legal" },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Legal Practice Areas &middot; 318 Neighborhoods &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for Law Firms
                <br />
                <span className="text-[#EFF70A]">in New York City</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                When someone is arrested, injured, facing deportation, or going through a divorce, they search Google. The law firm that ranks at the top of the{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Maps local pack</Link>{" "}
                gets the call. The firm on page two does not exist. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
                that put law firms in front of clients at the exact moment of need — across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">every neighborhood</Link>{" "}
                and jurisdiction in the NYC metro area. Not generic legal marketing. Not pay-per-lead services that send you shared leads. Real SEO that makes your firm the one people find first.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "180K+", label: "Licensed Attorneys in NYC" },
                { value: "3.5M+", label: "Cases Filed Annually" },
                { value: "$200+", label: "Cost Per Click (PI Ads)" },
                { value: "90%+", label: "Firms Offer Free Consults" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                  <div className="text-3xl font-extrabold text-[#0080FE]">{stat.value}</div>
                  <div className="mt-1 text-xs text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: WHY LAW FIRMS NEED SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Law Firms in NYC Need SEO
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              New York City has over 180,000 licensed attorneys — more than any other city on earth. Every practice area, from{" "}
              <Link href="/personal-injury-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">personal injury</Link>{" "}
              to{" "}
              <Link href="/immigration-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">immigration</Link>{" "}
              to{" "}
              <Link href="/divorce-lawyer" className="text-[#5CB8FF] hover:text-[#8DD0FF]">family law</Link>, is saturated with competitors all fighting for the same clients. Referrals and word-of-mouth still matter, but the reality is that 96% of people seeking legal advice start with a search engine. The firms that dominate Google dominate their market.
            </p>
            <p>
              Legal keywords are among the most expensive in all of online advertising. &ldquo;Personal injury lawyer NYC&rdquo; costs $200 to $400 per click on Google Ads. &ldquo;Mesothelioma lawyer&rdquo; can exceed $900 per click. A firm spending $20,000 per month on ads gets maybe 100 clicks — and only a fraction convert to consultations. The firms ranking organically for these same keywords get those clicks for free, every month, indefinitely. That is the power of{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              — you stop renting visibility and start owning it.
            </p>
            <p>
              AI search is accelerating this shift. When a potential client asks ChatGPT &ldquo;who is the best personal injury lawyer in Brooklyn,&rdquo; the answer is drawn from the same signals that power Google rankings: authoritative content, consistent business data, client reviews, and structured data markup. Law firms that invest in{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
              and{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>{" "}
              now are building the client pipeline that will sustain their practice for the next decade. Firms that rely on ads and referrals alone are watching their market share erode with every AI search that does not mention them.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: WHAT WE BUILD — SERVICE CARDS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Law Firms
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Every deliverable is built for the legal industry — compliant with bar advertising rules, optimized for YMYL authority, and designed to convert searchers into signed clients.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Local SEO & Google Maps",
                desc: "Rank in the local pack for every practice area and jurisdiction you serve. Legal-specific citations on Avvo, FindLaw, Justia, Super Lawyers, and 80+ directories.",
                href: "/services/local-seo",
              },
              {
                num: "02",
                title: "Google Business Profile",
                desc: "Full GBP optimization with legal categories, practice area attributes, attorney photos, and bar-compliant review response strategies.",
                href: "/services/google-business-profile",
              },
              {
                num: "03",
                title: "Practice Area Pages",
                desc: "Authoritative content for every case type you handle. Personal injury, criminal defense, immigration, family law — each with proper legal schema and E-E-A-T signals.",
                href: "/services/content-marketing",
              },
              {
                num: "04",
                title: "AI Search Optimization",
                desc: "Get recommended when potential clients ask ChatGPT, Perplexity, or Gemini for the best attorney in their practice area and location.",
                href: "/services/ai-search-optimization",
              },
              {
                num: "05",
                title: "Programmatic Jurisdiction Pages",
                desc: "Unique landing pages for every practice area-neighborhood combination. 'Personal injury lawyer Brooklyn,' 'Immigration attorney Jackson Heights,' 'Divorce lawyer Manhattan' — at scale.",
                href: "/services/automation",
              },
              {
                num: "06",
                title: "On-Page & Technical SEO",
                desc: "Attorney and LegalService schema markup, site speed optimization, mobile-first design, and structured data that signals authority to search engines.",
                href: "/services/on-page-seo",
              },
              {
                num: "07",
                title: "Off-Page SEO & Authority Building",
                desc: "Backlinks from legal publications, bar associations, law school resources, legal aid organizations, and NYC media outlets covering legal topics.",
                href: "/services/off-page-seo",
              },
              {
                num: "08",
                title: "Web Design & Development",
                desc: "Professional, fast websites built on Next.js — not generic legal templates. ADA-accessible, conversion-optimized with consultation booking and intake forms.",
                href: "/services/web-design-development",
              },
              {
                num: "09",
                title: "Client Review Systems",
                desc: "Bar-compliant review generation via post-case emails and follow-ups. Response templates that build credibility without making improper claims.",
                href: "/services/fullloopcrm",
              },
              {
                num: "10",
                title: "Analytics & Lead Attribution",
                desc: "Track which practice areas, pages, and keywords drive client intake calls. Monthly reports with call tracking, form attribution, and cost-per-case analysis.",
                href: "/services/analytics-reporting",
              },
            ].map((card) => (
              <Link
                key={card.num}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <span className="text-sm font-bold text-[#0080FE]">{card.num}</span>
                <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: OUR PROCESS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank Law Firms
          </h2>
          <p className="mt-4 text-zinc-400">
            A methodology built for the legal industry — accounting for bar advertising rules, YMYL authority requirements, jurisdiction-specific competition, and the high-stakes nature of legal client acquisition.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Competitive & Jurisdiction Audit",
                body: "We analyze your firm against every competitor in your practice areas and service jurisdictions. This includes Google Business Profile health, citation presence across legal directories (Avvo, FindLaw, Justia, Super Lawyers, Martindale-Hubbell, Lawyers.com), client review benchmarking, current rankings on a geo-grid of your service area, and content authority assessment. For law firms, we also audit E-E-A-T signals — attorney credentials, bar admissions, published articles, speaking engagements, and case result content.",
              },
              {
                step: "02",
                title: "Practice Area Keyword Strategy",
                body: "Legal keywords follow high-intent, high-value patterns: [practice area] + [location], [case type] + [attorney], and [legal issue] + [near me]. 'Car accident lawyer Brooklyn,' 'H1B visa attorney Queens,' 'divorce attorney Manhattan.' We map every high-value keyword to a page on your site, building a content architecture that covers every case type you handle across every jurisdiction you serve — without cannibalization between pages targeting similar terms.",
              },
              {
                step: "03",
                title: "Website Build or Optimization",
                body: "We build professional, fast websites on Next.js or optimize your existing site. Every page gets Attorney and LegalService schema, proper author attribution linked to your bar profile, ADA-compliant design, and conversion-optimized intake forms. Attorney bio pages are built as standalone authority assets with credentials, bar admissions, case results, publications, and client testimonials — each a ranking page in its own right.",
              },
              {
                step: "04",
                title: "Practice Area & Case Type Content",
                body: "We create authoritative content for every practice area and case type your firm handles. Personal injury pages covering car accidents, slip and falls, medical malpractice, and construction accidents. Immigration pages covering family-based, employment-based, asylum, and deportation defense. Each page is written to Google's YMYL standards, includes proper legal disclaimers, and targets specific long-tail queries: 'can I sue my landlord in NYC,' 'how much is a car accident case worth in New York,' 'how long does a green card application take.'",
              },
              {
                step: "05",
                title: "GBP, Legal Citations & Review Engine",
                body: "Full Google Business Profile optimization with legal categories, practice area attributes, and office photos. Citation building across 80+ directories including legal-specific platforms like Avvo, FindLaw, Justia, Super Lawyers, Martindale-Hubbell, and Lawyers.com. Bar-compliant review generation via post-case emails that request feedback without soliciting testimonials in jurisdictions that restrict them. Every review response uses a template that reinforces practice area keywords and geographic relevance.",
              },
              {
                step: "06",
                title: "Ongoing Optimization & Case Attribution",
                body: "Monthly reporting with geo-grid rank tracking, call recording with intake attribution, form submission tracking, and cost-per-signed-case analysis. We track which practice areas, case types, and neighborhoods generate the highest-value cases, then optimize accordingly. Legal SEO requires continuous investment — competitors are always building, algorithms update, and new case types emerge (AI liability, cryptocurrency disputes, etc.).",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0080FE] text-lg font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{item.title}</h3>
                  <p className="mt-3 text-zinc-300 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 6: INDUSTRY DEEP-DIVE
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Legal Market in NYC
          </h2>
          <p className="mt-4 text-zinc-400">
            Understanding the competitive landscape your firm operates in — and why{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
            delivers the highest ROI of any client acquisition channel for law firms.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {content.stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800 bg-[#141414] p-4 text-center">
                <div className="text-xl font-extrabold text-[#EFF70A]">{stat.value}</div>
                <div className="mt-1 text-xs text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Why Local Matters */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Why Jurisdiction-Level Visibility Matters</h3>
            <ul className="mt-4 space-y-3">
              {content.whySEOMatters.map((point) => (
                <li key={point} className="flex gap-3 text-zinc-300">
                  <span className="mt-1 text-[#0080FE]">&#9654;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cost Factors */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Legal Fee Landscape in NYC</h3>
            <p className="mt-3 text-zinc-400">{content.investmentContext}</p>
            <ul className="mt-4 space-y-2">
              {content.investmentFactors.map((factor) => (
                <li key={factor} className="flex gap-3 text-sm text-zinc-300">
                  <span className="text-[#EFF70A]">&bull;</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Common Mistakes */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Mistakes That Cost Law Firms Clients</h3>
            <p className="mt-2 text-sm text-zinc-400">
              We see these patterns across firms that come to us after failed marketing efforts — understanding them helps us build strategies that actually work.
            </p>
            <div className="mt-4 space-y-4">
              {content.seoMistakes.map((item) => (
                <div key={item.mistake} className="rounded-lg border border-zinc-800 bg-[#141414] p-4">
                  <p className="font-medium text-white">{item.mistake}</p>
                  <p className="mt-1 text-sm text-zinc-400">{item.consequence}</p>
                </div>
              ))}
            </div>
          </div>

          {/* When to Hire */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">When Clients Search for Attorneys</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Understanding search triggers helps us target the right keywords at the right moment in the client journey.
            </p>
            <ul className="mt-4 space-y-3">
              {content.signsYouNeedSEO.map((trigger) => (
                <li key={trigger} className="flex gap-3 text-zinc-300">
                  <span className="mt-1 text-[#0080FE]">&#9654;</span>
                  <span>{trigger}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: ALL BUSINESS TYPES IN THIS CATEGORY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            All {services.length} Legal Practice Areas We Rank
          </h2>
          <p className="mt-4 text-zinc-400">
            Every type of law firm and legal practice we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>, and{" "}
            <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content strategies</Link>{" "}
            for. Click any practice area for the full SEO breakdown.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-medium text-white">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              SEO Pricing for Law Firms
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Transparent pricing. No long-term contracts. No hidden fees. Built for firms that understand the value of organic visibility.{" "}
              <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                name: "Monthly Retainer",
                price: "$3,500/mo",
                desc: "Ongoing SEO, content, and client acquisition",
                features: [
                  "Full SEO & local SEO management",
                  "Google Business Profile optimization",
                  "Practice area content development",
                  "Legal directory citations (80+ dirs)",
                  "Bar-compliant review generation",
                  "Programmatic jurisdiction pages",
                  "Monthly reporting & strategy calls",
                ],
              },
              {
                name: "Project-Based",
                price: "$2,500+",
                desc: "Website builds, audits, and one-time projects",
                features: [
                  "Law firm website build or redesign",
                  "Comprehensive legal SEO audit",
                  "Attorney & LegalService schema",
                  "Practice area content architecture",
                  "Competitor firm analysis",
                  "E-E-A-T authority optimization",
                  "Attorney bio page development",
                ],
              },
              {
                name: "Consulting",
                price: "$150/hr",
                desc: "Expert guidance for firm marketing teams",
                features: [
                  "Legal SEO strategy sessions",
                  "Practice area keyword research",
                  "Content review & E-E-A-T guidance",
                  "Technical SEO consulting",
                  "Bar advertising compliance review",
                  "Quarterly strategy reviews",
                  "On-call SEO support",
                ],
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-8"
              >
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="mt-2 text-3xl font-extrabold text-[#0080FE]">{tier.price}</div>
                <p className="mt-2 text-sm text-zinc-400">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className="mt-8 block rounded-lg bg-[#0080FE] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#0070E0]"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: REGION COVERAGE
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Jurisdictions We Cover for Law Firm SEO
          </h2>
          <p className="mt-4 text-zinc-400">
            We build{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            campaigns targeting potential clients in every jurisdiction and neighborhood your firm serves.
          </p>
          <div className="mt-10 space-y-10">
            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region] || [];
              const note = content.regionNotes[region];
              return (
                <div key={region}>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{region}</h3>
                  {note && <p className="mt-2 text-sm text-zinc-400">{note}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {neighborhoods.slice(0, 12).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {neighborhoods.length > 12 && (
                      <span className="rounded-full px-3 py-1 text-xs text-zinc-600">
                        +{neighborhoods.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 11: FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Law Firm SEO: Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-zinc-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: CROSS-LINKS & FINAL CTA
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Other Industries We Rank
          </h2>
          <p className="mt-4 text-zinc-400">
            Legal is one of {allCategories.length + 1} industries we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
            for. Explore our work across every industry.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allCategories.map((cat) => (
              <Link
                key={cat}
                href={`/businesses/${categoryToSlug(cat)}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 text-center font-medium text-white transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
              >
                {cat}
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Services</Link>
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Business Types</Link>
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Areas</Link>
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Pricing</Link>
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>
            <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Branding</Link>
            <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing Consulting</Link>
            <Link href="/services/marketing-manager" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing Manager</Link>
            <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Agent Development</Link>
            <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Content Generation</Link>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
