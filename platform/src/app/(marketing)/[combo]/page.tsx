import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";
import {
  getAllCombos,
  findCombo,
  industries,
  metros,
} from "@/lib/marketing/combos";

// ---------------------------------------------------------------------------
// Render combo pages on-demand and cache them (ISR). Pre-rendering 20K+
// pages at build time exceeds Vercel's output size limit.
// ---------------------------------------------------------------------------
export const dynamicParams = true;
export const revalidate = 86400; // re-generate cached pages once per day

export function generateStaticParams() {
  // Pre-render only a small seed set at build time; the rest are generated
  // on first request and cached via ISR.
  return [];
}

// ---------------------------------------------------------------------------
// Dynamic metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ combo: string }>;
}): Promise<Metadata> {
  const { combo: slug } = await params;
  const match = findCombo(slug);
  if (!match) return {};

  const { industry, metro } = match;
  const trade = industry.name.toLowerCase();
  const title = `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`;
  const description = `The best CRM for ${trade} businesses in ${metro.city}, ${metro.stateAbbr}. AI lead generation, sales automation, scheduling, GPS dispatch, invoicing, reviews & retargeting — one platform, exclusive territory. $2,500/mo.`;
  const url = `https://www.fullloopcrm.com/${slug}`;

  return {
    title,
    description,
    keywords: [
      `best ${trade} CRM ${metro.city}`,
      `CRM for ${trade} businesses in ${metro.city}`,
      `${trade} business software ${metro.city} ${metro.stateAbbr}`,
      `${metro.city} ${trade} CRM`,
      `best CRM for ${trade} in ${metro.stateAbbr}`,
      `${trade} scheduling software ${metro.city}`,
    ],
    openGraph: {
      title: `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr}`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr}`,
      description,
    },
    alternates: { canonical: url },
  };
}

// ---------------------------------------------------------------------------
// Helpers for related internal links
// ---------------------------------------------------------------------------
function getRelatedCombos(
  industrySlug: string,
  metroSlug: string
): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];

  // Same industry, different cities (pick up to 2)
  const sameTrade = metros
    .filter((m) => m.slug !== metroSlug)
    .slice(0, 2);
  const ind = industries.find((i) => i.slug === industrySlug);
  if (ind) {
    for (const m of sameTrade) {
      links.push({
        label: `CRM for ${ind.name} Business in ${m.city}, ${m.stateAbbr}`,
        href: `/${ind.slug}-crm-${m.slug}`,
      });
    }
  }

  // Same city, different industries (pick up to 2)
  const met = metros.find((m) => m.slug === metroSlug);
  const otherTrades = industries
    .filter((i) => i.slug !== industrySlug)
    .slice(0, 2);
  if (met) {
    for (const i of otherTrades) {
      links.push({
        label: `CRM for ${i.name} Business in ${met.city}, ${met.stateAbbr}`,
        href: `/${i.slug}-crm-${met.slug}`,
      });
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Pain points (deterministic per industry — same industry always gets same set)
// ---------------------------------------------------------------------------
function getPainPoints(industryName: string, cityName: string): string[] {
  return [
    `Most ${industryName.toLowerCase()} businesses in ${cityName} rely on word-of-mouth alone, leaving hundreds of online leads to competitors who show up first on Google.`,
    `Without a centralized system, ${industryName.toLowerCase()} operators juggle texts, voicemails, and spreadsheets — and leads slip through the cracks every single day.`,
    `Scheduling, dispatching, and following up manually costs ${cityName} ${industryName.toLowerCase()} owners 10+ hours a week that could be spent on revenue-generating work.`,
    `No visibility into which marketing channels actually drive paying customers means ${industryName.toLowerCase()} businesses waste money on ads that don't convert.`,
  ];
}

// ---------------------------------------------------------------------------
// Seven CRM stages with industry-flavored descriptions
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
// Page component
// ---------------------------------------------------------------------------
export default async function ComboPage({
  params,
}: {
  params: Promise<{ combo: string }>;
}) {
  const { combo: slug } = await params;
  const match = findCombo(slug);
  if (!match) notFound();

  const { industry, metro } = match;
  const pageUrl = `https://www.fullloopcrm.com/${slug}`;

  const breadcrumbs = [
    { name: "Home", url: "https://www.fullloopcrm.com" },
    { name: "Industries", url: "https://www.fullloopcrm.com/full-loop-crm-service-business-industries" },
    {
      name: `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr}`,
      url: pageUrl,
    },
  ];

  const trade = industry.name.toLowerCase();
  const painPoints = getPainPoints(industry.name, metro.city);
  const stages = getStages(industry.name);
  const relatedLinks = getRelatedCombos(industry.slug, metro.slug);

  return (
    <>
      {/* JSON-LD */}
      <JsonLd
        data={webPageSchema(
          `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`,
          `The best CRM for ${trade} businesses in ${metro.city}, ${metro.stateAbbr}.`,
          pageUrl,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd
        data={localBusinessSchema(
          `${metro.city}, ${metro.stateAbbr}`,
          "City"
        )}
      />

      {/* ----------------------------------------------------------------- */}
      {/* 1. Hero */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            Best CRM for{" "}
            <span className="text-teal-400">{industry.name}</span>{" "}
            Businesses in {metro.city}, {metro.stateAbbr}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            The only full-cycle CRM built for {trade}{" "}
            businesses in {metro.city}. AI-powered lead generation, automated
            sales, scheduling, GPS field ops, and more — one exclusive territory.
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
      {/* 2. Pain Points */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            Why {metro.city} {industry.name} Businesses Need Full Loop
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Running a {industry.name.toLowerCase()} operation in {metro.city},{" "}
            {metro.stateAbbr} means competing for every customer. Here&apos;s
            what holds most {industry.name.toLowerCase()} businesses back:
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
      {/* 3. What You Get — 7 Stages */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            What Your {industry.name} Business Gets with Full Loop
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Seven stages of the customer lifecycle — handled automatically so
            your {industry.name.toLowerCase()} team in {metro.city} can focus on
            the work, not the admin.
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
      {/* 4. Pricing Callout */}
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
            Exclusive {industry.name.toLowerCase()} territory in {metro.city},{" "}
            {metro.stateAbbr}. No other {industry.name.toLowerCase()} partner
            competes with you in this market.
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
      {/* 5. Ownership Transparency */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-16 px-6 bg-slate-50">
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
                  Your client list, contact info & history
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

      {/* ----------------------------------------------------------------- */}
      {/* 6. Final CTA */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Lock Your {industry.name} Territory in {metro.city}
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Once the{" "}
            {industry.name.toLowerCase()} territory in {metro.city},{" "}
            {metro.stateAbbr} is claimed, it&apos;s off the table.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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

      {/* ----------------------------------------------------------------- */}
      {/* 7. Internal Links */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-bold text-slate-900 font-heading mb-6">
            Learn More About Full Loop CRM
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

          {relatedLinks.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">
                Related Pages
              </h3>
              <ul className="space-y-2">
                {relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
