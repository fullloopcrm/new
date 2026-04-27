import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";
import { industries as comboIndustries, metros, generateIndustrySlug, findIndustryByPageSlug } from "@/lib/marketing/combos";
import { industries as richIndustries } from "@/lib/marketing/industries";
import { getIndustryContent } from "@/lib/marketing/allIndustryContent";
import { getIndustryContentSlug } from "@/lib/marketing/industryMapping";
import { faqs as globalFaqs } from "@/lib/marketing/faqs";

// ---------------------------------------------------------------------------
// Static params — generates all 51 industry pages at build time
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return comboIndustries.map((i) => ({ slug: generateIndustrySlug(i) }));
}

// ---------------------------------------------------------------------------
// Find industry from slug
// ---------------------------------------------------------------------------
function findIndustry(slug: string) {
  return findIndustryByPageSlug(slug);
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = findIndustry(slug);
  if (!industry) return {};

  const trade = industry.name.toLowerCase();
  const title = `Best CRM for ${industry.name} Businesses | Full Loop CRM`;
  const description = `The best CRM built for ${trade} businesses. AI-powered lead generation, automated sales, smart scheduling, GPS dispatch, invoicing, review management & retargeting in one platform. Flat $1,000 per user / month.`;
  const url = `https://homeservicesbusinesscrm.com/industry/${slug}`;

  return {
    title,
    description,
    keywords: [
      `best ${trade} CRM`,
      `CRM for ${trade} businesses`,
      `${trade} business software`,
      `best CRM for ${trade}`,
      `${trade} management software`,
      `${trade} scheduling software`,
    ],
    openGraph: {
      title: `Best CRM for ${industry.name} Businesses`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Best CRM for ${industry.name} Businesses`,
      description,
    },
    alternates: { canonical: url },
  };
}

// ---------------------------------------------------------------------------
// Related industries (pick 6 others)
// ---------------------------------------------------------------------------
function getRelatedIndustries(currentSlug: string) {
  const currentIdx = comboIndustries.findIndex((i) => i.slug === currentSlug);
  const related: typeof comboIndustries = [];
  const total = comboIndustries.length;

  for (let offset = 1; related.length < 6 && offset < total; offset++) {
    const idx = (currentIdx + offset * 7) % total;
    const candidate = comboIndustries[idx];
    if (candidate.slug !== currentSlug && !related.find((r) => r.slug === candidate.slug)) {
      related.push(candidate);
    }
  }

  return related;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = findIndustry(slug);
  if (!industry) notFound();

  const pageUrl = `https://homeservicesbusinesscrm.com/industry/${slug}`;
  const trade = industry.name.toLowerCase();

  // Find deep page content via slug mapping
  const contentSlug = getIndustryContentSlug(industry.slug);
  const content = contentSlug ? getIndustryContent(contentSlug) : null;

  // Find rich data from industries.ts
  const richData = contentSlug
    ? richIndustries.find((ri) => ri.slug === contentSlug)
    : richIndustries.find(
        (ri) => ri.name.toLowerCase() === industry.name.toLowerCase()
      );

  const breadcrumbs = [
    { name: "Home", url: "https://homeservicesbusinesscrm.com" },
    { name: "Industries", url: "https://homeservicesbusinesscrm.com/full-loop-crm-service-business-industries" },
    {
      name: `Best CRM for ${industry.name} Businesses`,
      url: pageUrl,
    },
  ];

  const relatedIndustries = getRelatedIndustries(industry.slug);

  // Pick 8 top metros for the inline market grid (not 400)
  const topMetros = metros.slice(0, 20);

  return (
    <>
      {/* JSON-LD */}
      <JsonLd
        data={webPageSchema(
          `Best CRM for ${industry.name} Businesses | Full Loop CRM`,
          `The best CRM built for ${trade} businesses. AI-powered lead generation, automated sales, scheduling, GPS field ops, payments, reviews & retargeting.`,
          pageUrl,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={localBusinessSchema(industry.name, "AdministrativeArea")}
      />

      {/* FAQPage schema for SEO */}
      {content?.faqs && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }}
        />
      )}

      {/* ================================================================= */}
      {/* 1. HERO                                                           */}
      {/* ================================================================= */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-teal-400 font-cta text-sm uppercase tracking-wider mb-4">
            Exclusive Territory CRM
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            Best CRM for{" "}
            <span className="text-teal-400">{industry.name}</span>{" "}
            Businesses
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-4">
            {industry.description}
          </p>
          {richData && (
            <p className="text-base text-slate-400 max-w-2xl mx-auto mb-8">
              {richData.longDescription}
            </p>
          )}

          {/* Stat cards */}
          {content?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
              {content.stats.slice(0, 4).map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3"
                >
                  <p className="text-2xl font-bold text-teal-400 font-heading">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Lock Your Territory
            </Link>
            <a
              href="tel:+12122029220"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              Call (212) 202-9220
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 2. INDUSTRY OVERVIEW                                              */}
      {/* ================================================================= */}
      {content && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading mb-6">
              Why {industry.name} Businesses Need a Dedicated CRM
            </h2>
            <div className="prose prose-slate prose-lg max-w-none">
              {content.overview.split("\n\n").map((para, idx) => (
                <p key={idx} className="text-slate-700 leading-relaxed mb-6">
                  {para}
                </p>
              ))}
            </div>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              The {industry.name} Market Landscape
            </h3>
            <p className="text-slate-700 leading-relaxed">
              {content.marketLandscape}
            </p>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 3. DETAILED CHALLENGES                                            */}
      {/* ================================================================= */}
      {content?.detailedChallenges && (
        <section className="py-20 px-6 bg-slate-50">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
              The Biggest Challenges Facing {industry.name} Businesses
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Every {trade} business owner knows these pain points.
              Here&apos;s how they hold your company back — and why a
              purpose-built CRM is the only real fix.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {content.detailedChallenges.map((challenge, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-6"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mb-4 font-mono">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">
                    {challenge.title}
                  </h3>
                  <p className="text-slate-700 leading-relaxed">
                    {challenge.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 4. FEATURE DEEP DIVE — 7 LIFECYCLE STAGES                        */}
      {/* ================================================================= */}
      {content?.featureBreakdown && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
              How Full Loop CRM Works for {industry.name} Businesses
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-3xl mx-auto">
              Full Loop CRM manages every stage of the {trade} customer
              lifecycle — from the first Google search to the fifth rebooking.
              Here&apos;s exactly how each stage works for your business.
            </p>

            <div className="space-y-12">
              {content.featureBreakdown.map((feature, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col md:flex-row gap-8 ${
                    idx % 2 === 1 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  <div className="md:w-1/4 flex-shrink-0">
                    <div className="bg-teal-600 text-white rounded-lg p-4 text-center md:text-left">
                      <p className="text-sm font-cta uppercase tracking-wider opacity-80">
                        Stage {idx + 1}
                      </p>
                      <p className="text-xl font-bold font-heading">
                        {feature.title}
                      </p>
                    </div>
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-xl font-bold text-slate-900 font-heading mb-3">
                      {feature.subtitle}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {feature.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/full-loop-crm-service-features"
                className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              >
                See All Features in Detail
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 5. WHY GENERIC CRMs FAIL                                         */}
      {/* ================================================================= */}
      {content?.whyGenericCrmsFail && (
        <section className="py-20 px-6 bg-slate-900">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-white font-heading mb-6">
              Why Jobber, Housecall Pro, and ServiceTitan Don&apos;t Work for {industry.name} Businesses
            </h2>
            <div className="text-slate-300 leading-relaxed text-lg">
              {content.whyGenericCrmsFail.split("\n\n").map((para, idx) => (
                <p key={idx} className="mb-4">{para}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 6. ROI ANALYSIS                                                   */}
      {/* ================================================================= */}
      {content?.roiAnalysis && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading mb-6">
              What Full Loop CRM Is Worth to a {industry.name} Business
            </h2>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-8">
              <p className="text-slate-700 leading-relaxed text-lg">
                {content.roiAnalysis}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 7. PRICING                                                        */}
      {/* ================================================================= */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
            {industry.name} CRM Pricing — Every Seat Gets Everything
          </h2>
          <p className="text-5xl font-extrabold text-teal-600 font-heading mb-2">
            $1,000<span className="text-xl text-slate-500 font-normal">/user/mo</span>
          </p>
          <p className="text-slate-600 mb-4 text-lg">
            Exclusive {trade} territory. No other {trade} partner
            competes with you in your market.
          </p>
          <p className="text-slate-700 mb-6 max-w-xl mx-auto">
            Full Loop CRM replaces 9+ separate tools — lead generation,
            AI sales, scheduling, GPS operations, payments, reviews,
            referrals, retargeting, and analytics — with one integrated
            platform. Flat $1,000 per user / month. The license includes your
            exclusive territory, all 7 lifecycle stages, the Selena AI assistant,
            client and team portals, full bookkeeping with 1099-ready exports,
            and all core updates.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            $999 one-time setup. No contracts. Cancel anytime.
          </p>
          <Link
            href="/full-loop-crm-pricing"
            className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            View Full Pricing Details
          </Link>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 8. GETTING STARTED                                                */}
      {/* ================================================================= */}
      {content?.gettingStarted && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-12">
              How to Get Started with Full Loop CRM for Your {industry.name} Business
            </h2>

            <div className="space-y-8">
              {content.gettingStarted.map((step, idx) => (
                <div key={idx} className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-lg font-mono">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">
                      {step.step}
                    </h3>
                    <p className="text-slate-700 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 9. INDUSTRY-SPECIFIC FAQs                                         */}
      {/* ================================================================= */}
      {content?.faqs && (
        <section className="py-20 px-6 bg-slate-50">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-12">
              Frequently Asked Questions About CRM for {industry.name} Businesses
            </h2>

            <div className="space-y-6">
              {content.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg group"
                >
                  <summary className="px-6 py-4 cursor-pointer font-bold text-slate-900 font-heading hover:text-teal-700 transition-colors list-none flex items-center justify-between">
                    <span>{faq.q}</span>
                    <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-4">
                    <p className="text-slate-700 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>

            {/* Add a few global FAQs too */}
            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-16 mb-8 text-center">
              General Full Loop CRM Questions
            </h3>
            <div className="space-y-6">
              {globalFaqs.slice(0, 5).map((faq, idx) => (
                <details
                  key={`global-${idx}`}
                  className="bg-white border border-slate-200 rounded-lg group"
                >
                  <summary className="px-6 py-4 cursor-pointer font-bold text-slate-900 font-heading hover:text-teal-700 transition-colors list-none flex items-center justify-between">
                    <span>{faq.q}</span>
                    <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-4">
                    <p className="text-slate-700 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 10. OWNERSHIP TRANSPARENCY                                        */}
      {/* ================================================================= */}
      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-slate-900 font-heading text-center mb-10">
            Transparent Ownership — You Know Exactly What You Own
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-teal-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading mb-4">
                You Own
              </h3>
              <ul className="space-y-2 text-slate-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                  Your client list, contact info & full history
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                  Your Google reviews and reputation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                  Your Google Business Profile
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                  Revenue you earn from every job
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 font-bold mt-0.5">&#10003;</span>
                  Full data export if you ever leave
                </li>
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-700 font-heading mb-4">
                Full Loop Owns
              </h3>
              <ul className="space-y-2 text-slate-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold mt-0.5">&bull;</span>
                  The SEO lead-generation domains & content
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold mt-0.5">&bull;</span>
                  The CRM software platform & AI engine
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold mt-0.5">&bull;</span>
                  The phone numbers used for lead routing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold mt-0.5">&bull;</span>
                  Territory exclusivity rights
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 11. AVAILABLE MARKETS (compact — top 20 + "see all" link)         */}
      {/* ================================================================= */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-slate-900 font-heading text-center mb-4">
            Available {industry.name} Markets
          </h2>
          <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">
            Full Loop CRM is available for {trade} businesses in{" "}
            {metros.length}+ cities across the United States. One partner
            per trade per metro — claim yours before a competitor does.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {topMetros.map((metro) => (
              <Link
                key={metro.slug}
                href={`/${industry.slug}-crm-${metro.slug}`}
                className="text-sm text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded px-3 py-2 transition-colors border border-slate-200 bg-white text-center"
              >
                {metro.city}, {metro.stateAbbr}
              </Link>
            ))}
          </div>

          <div className="text-center mt-6">
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 font-cta text-sm"
            >
              View All {metros.length}+ Available Markets &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 12. FINAL CTA                                                     */}
      {/* ================================================================= */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Lock Your {industry.name} Territory
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Once a {trade} territory is
            claimed, it&apos;s off the table. Apply now to check
            availability in your market.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Request Partnership
            </Link>
            <a
              href="tel:+12122029220"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              Call (212) 202-9220
            </a>
            <a
              href="sms:+12122029220"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              Text Us
            </a>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 13. RELATED INDUSTRIES & INTERNAL LINKS                           */}
      {/* ================================================================= */}
      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-bold text-slate-900 font-heading mb-6">
            CRM for Other Industries
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {relatedIndustries.map((rel) => (
              <Link
                key={rel.slug}
                href={`/industry/${generateIndustrySlug(rel)}`}
                className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
              >
                Best CRM for {rel.name} Businesses
              </Link>
            ))}
          </div>

          <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">
            Learn More About Full Loop CRM
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              All Features
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              Pricing
            </Link>
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              Why Full Loop?
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              Industries We Serve
            </Link>
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              CRM 101
            </Link>
            <Link
              href="/full-loop-crm-frequently-asked-questions"
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
