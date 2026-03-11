import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";
import { industries, metros, generateIndustrySlug, generateComboSlug, findIndustryByPageSlug } from "@/lib/marketing/combos";

// ---------------------------------------------------------------------------
// Static params — generates all 51 industry pages at build time
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return industries.map((i) => ({ slug: generateIndustrySlug(i) }));
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
  const description = `The best CRM built for ${trade} businesses. AI-powered lead generation, automated sales, smart scheduling, GPS dispatch, invoicing, review management & retargeting in one platform. $2,500/mo.`;
  const url = `https://www.fullloopcrm.com/industry/${slug}`;

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
// Pain points for industry
// ---------------------------------------------------------------------------
function getPainPoints(industryName: string): string[] {
  const trade = industryName.toLowerCase();
  return [
    `Most ${trade} businesses rely on word-of-mouth alone, leaving hundreds of online leads to competitors who show up first on Google.`,
    `Without a centralized system, ${trade} operators juggle texts, voicemails, and spreadsheets — and leads slip through the cracks every single day.`,
    `Scheduling, dispatching, and following up manually costs ${trade} owners 10+ hours a week that could be spent on revenue-generating work.`,
    `No visibility into which marketing channels actually drive paying customers means ${trade} businesses waste money on ads that don't convert.`,
  ];
}

// ---------------------------------------------------------------------------
// Seven CRM stages
// ---------------------------------------------------------------------------
function getStages(industryName: string): { title: string; desc: string }[] {
  const trade = industryName.toLowerCase();
  return [
    {
      title: "1. Lead Generation",
      desc: `Multi-domain SEO network targets every neighborhood your ${trade} business serves — organic leads without ad spend.`,
    },
    {
      title: "2. AI Sales Automation",
      desc: `Selenas AI responds to ${trade} inquiries via SMS within seconds, 24/7 — qualifying leads and booking estimates while you sleep.`,
    },
    {
      title: "3. Smart Scheduling",
      desc: `Drag-and-drop calendar built for ${trade} workflows — recurring appointments, crew assignments, and real-time availability.`,
    },
    {
      title: "4. GPS Field Operations",
      desc: `Track your ${trade} crews in real time with GPS check-in/out, automatic drive-time logging, and route optimization.`,
    },
    {
      title: "5. Invoicing & Payments",
      desc: `Generate invoices on-site, accept cards and ACH, and automate payment reminders so your ${trade} cash flow stays healthy.`,
    },
    {
      title: "6. Reviews & Reputation",
      desc: `Automatically request Google reviews after every ${trade} job — build a 5-star reputation that attracts more clients.`,
    },
    {
      title: "7. Retargeting & Rebooking",
      desc: `Win-back campaigns and seasonal reminders keep your ${trade} clients coming back — recurring revenue on autopilot.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Related industries (pick 6 others)
// ---------------------------------------------------------------------------
function getRelatedIndustries(currentSlug: string) {
  const currentIdx = industries.findIndex((i) => i.slug === currentSlug);
  const related: typeof industries = [];
  const total = industries.length;

  // Pick 6 industries spread across the list
  for (let offset = 1; related.length < 6 && offset < total; offset++) {
    const idx = (currentIdx + offset * 7) % total;
    const candidate = industries[idx];
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

  const pageUrl = `https://www.fullloopcrm.com/industry/${slug}`;
  const trade = industry.name.toLowerCase();

  const breadcrumbs = [
    { name: "Home", url: "https://www.fullloopcrm.com" },
    { name: "Industries", url: "https://www.fullloopcrm.com/full-loop-crm-service-business-industries" },
    {
      name: `Best CRM for ${industry.name} Businesses`,
      url: pageUrl,
    },
  ];

  const painPoints = getPainPoints(industry.name);
  const stages = getStages(industry.name);
  const relatedIndustries = getRelatedIndustries(industry.slug);

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

      {/* ----------------------------------------------------------------- */}
      {/* 1. Hero */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            Best CRM for{" "}
            <span className="text-teal-400">{industry.name}</span>{" "}
            Businesses
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-4">
            {industry.description}
          </p>
          <p className="text-base text-slate-400 max-w-2xl mx-auto mb-8">
            Why {trade} businesses need Full Loop CRM — AI-powered lead
            generation, automated sales, scheduling, GPS field ops, and more.
          </p>
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

      {/* ----------------------------------------------------------------- */}
      {/* 2. The Problem */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            The Problem for {industry.name} Businesses
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Running a {trade} business means competing for every customer.
            Here&apos;s what holds most {trade} businesses back:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {painPoints.map((point, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-lg p-6"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mb-4 font-mono">
                  {idx + 1}
                </div>
                <p className="text-slate-700 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. How Full Loop Helps — 7 Stages */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            How Full Loop Helps {industry.name} Businesses
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Seven stages of the customer lifecycle — handled automatically so
            your {trade} team can focus on the work, not the admin.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {stages.map((stage) => (
              <div
                key={stage.title}
                className="bg-white border border-slate-200 rounded-lg p-6 hover:border-teal-400 hover:shadow-md transition-all"
              >
                <h3 className="text-base font-bold text-slate-900 font-heading mb-2">
                  {stage.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            ))}

            {/* Link card */}
            <Link
              href="/full-loop-crm-service-features"
              className="flex items-center justify-center bg-teal-600 text-white rounded-lg p-6 hover:bg-teal-700 transition-colors font-cta text-lg"
            >
              See All Features &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Pricing */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
            One Plan. Everything Included.
          </h2>
          <p className="text-5xl font-extrabold text-teal-600 font-heading mb-2">
            $2,500<span className="text-xl text-slate-500 font-normal">/mo</span>
          </p>
          <p className="text-slate-600 mb-6 text-lg">
            Exclusive {trade} territory. No other {trade} partner
            competes with you in your market.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            No setup fees. No long-term contracts. Cancel anytime.
          </p>
          <Link
            href="/full-loop-crm-pricing"
            className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            View Full Pricing Details
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Available Markets — all metro combo pages for this industry */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            Available {industry.name} Markets
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Full Loop CRM is available for {trade} businesses in{" "}
            {metros.length}+ cities across the United States. Click any city to
            learn more about your local market.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {metros.map((metro) => (
              <Link
                key={metro.slug}
                href={`/${industry.slug}-crm-${metro.slug}`}
                className="text-sm text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded px-3 py-2 transition-colors border border-slate-200 bg-white text-center"
              >
                {metro.city}, {metro.stateAbbr}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. CTA */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Lock Your {industry.name} Territory
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Once a {trade} territory is
            claimed, it&apos;s off the table.
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
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 text-sm font-cta"
            >
              Pricing
            </Link>
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 text-sm font-cta"
            >
              Features
            </Link>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 7. Related Industries */}
      {/* ----------------------------------------------------------------- */}
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
