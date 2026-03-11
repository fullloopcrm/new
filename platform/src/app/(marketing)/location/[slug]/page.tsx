import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";
import { industries, metros, generateLocationSlug, generateComboSlug, findMetroByPageSlug } from "@/lib/marketing/combos";
import type { ComboMetro } from "@/lib/marketing/combos";

// ---------------------------------------------------------------------------
// Static params — generates all 400+ location pages at build time
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return metros.map((m) => ({ slug: generateLocationSlug(m) }));
}

// ---------------------------------------------------------------------------
// Helper: find metro from page slug
// ---------------------------------------------------------------------------
function findMetroBySlug(slug: string): ComboMetro | null {
  return findMetroByPageSlug(slug);
}

// ---------------------------------------------------------------------------
// Helper: get nearby markets (same state first, then neighbors)
// ---------------------------------------------------------------------------
function getNearbyMarkets(metro: ComboMetro): ComboMetro[] {
  // Same state, different city
  const sameState = metros.filter(
    (m) => m.stateAbbr === metro.stateAbbr && m.slug !== metro.slug
  );

  if (sameState.length >= 6) {
    return sameState.slice(0, 6);
  }

  // If not enough in-state, grab some from adjacent entries in the array
  const currentIndex = metros.findIndex((m) => m.slug === metro.slug);
  const others = metros.filter(
    (m) =>
      m.slug !== metro.slug &&
      !sameState.some((s) => s.slug === m.slug)
  );

  const nearby = [...sameState];
  // Pick metros close by index (proxy for geographic proximity in the list)
  const start = Math.max(0, currentIndex - 10);
  for (const m of others.slice(start)) {
    if (nearby.length >= 6) break;
    nearby.push(m);
  }

  return nearby.slice(0, 6);
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
  const metro = findMetroBySlug(slug);
  if (!metro) return {};

  const title = `Best Home Service CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`;
  const description = `The best CRM for home service businesses in ${metro.city}, ${metro.stateAbbr}. AI-powered lead generation, sales automation, scheduling, GPS dispatch, invoicing, reviews & retargeting — one partner per trade. $2,500/mo.`;
  const url = `https://www.fullloopcrm.com/location/${slug}`;

  return {
    title,
    description,
    keywords: [
      `best home service CRM ${metro.city}`,
      `CRM for home service businesses ${metro.city}`,
      `field service software ${metro.city} ${metro.stateAbbr}`,
      `${metro.city} contractor CRM`,
      `best CRM for contractors in ${metro.city}`,
      `home service management software ${metro.city}`,
    ],
    openGraph: {
      title: `Best Home Service CRM in ${metro.city}, ${metro.stateAbbr}`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Best Home Service CRM in ${metro.city}, ${metro.stateAbbr}`,
      description,
    },
    alternates: { canonical: url },
  };
}

// ---------------------------------------------------------------------------
// Pain points for location pages
// ---------------------------------------------------------------------------
function getPainPoints(city: string): string[] {
  return [
    `Home service businesses in ${city} lose leads every day because they can't respond fast enough — competitors who answer first win the job.`,
    `Without a centralized CRM, ${city} contractors juggle texts, voicemails, and spreadsheets, and profitable leads slip through the cracks.`,
    `Manual scheduling, dispatching, and follow-ups cost ${city} service business owners 10+ hours a week that should be spent on billable work.`,
    `Most ${city} home service companies have no idea which marketing channels actually drive paying customers — so they waste money on ads that don't convert.`,
  ];
}

// ---------------------------------------------------------------------------
// Seven CRM stages
// ---------------------------------------------------------------------------
function getStages(): { title: string; desc: string }[] {
  return [
    {
      title: "1. Lead Generation",
      desc: "Multi-domain SEO network targets every neighborhood you serve — organic leads without ad spend.",
    },
    {
      title: "2. AI Sales Automation",
      desc: "Selenas AI responds to inquiries via SMS within seconds, 24/7 — qualifying leads and booking estimates while you sleep.",
    },
    {
      title: "3. Smart Scheduling",
      desc: "Drag-and-drop calendar built for field service workflows — recurring appointments, crew assignments, and real-time availability.",
    },
    {
      title: "4. GPS Field Operations",
      desc: "Track your crews in real time with GPS check-in/out, automatic drive-time logging, and route optimization.",
    },
    {
      title: "5. Invoicing & Payments",
      desc: "Generate invoices on-site, accept cards and ACH, and automate payment reminders so cash flow stays healthy.",
    },
    {
      title: "6. Reviews & Reputation",
      desc: "Automatically request Google reviews after every job — build a 5-star reputation that attracts more clients.",
    },
    {
      title: "7. Retargeting & Rebooking",
      desc: "Win-back campaigns and seasonal reminders keep your clients coming back — recurring revenue on autopilot.",
    },
  ];
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const metro = findMetroBySlug(slug);
  if (!metro) notFound();

  const pageUrl = `https://www.fullloopcrm.com/location/${slug}`;

  const breadcrumbs = [
    { name: "Home", url: "https://www.fullloopcrm.com" },
    { name: "Locations", url: "https://www.fullloopcrm.com/location" },
    {
      name: `Best Home Service CRM in ${metro.city}, ${metro.stateAbbr}`,
      url: pageUrl,
    },
  ];

  const painPoints = getPainPoints(metro.city);
  const stages = getStages();
  const nearbyMarkets = getNearbyMarkets(metro);

  return (
    <>
      {/* JSON-LD */}
      <JsonLd
        data={webPageSchema(
          `Best Home Service CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`,
          `The best CRM for home service businesses in ${metro.city}, ${metro.stateAbbr}.`,
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
            Best Home Service CRM in{" "}
            <span className="text-teal-400">
              {metro.city}, {metro.stateAbbr}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            The only full-cycle CRM for home service businesses in{" "}
            {metro.city}. One partner per trade — is your industry still
            available?
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
            Why {metro.city} Home Service Businesses Need Full Loop
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Running a home service business in {metro.city},{" "}
            {metro.stateAbbr} means competing for every customer. Here&apos;s
            what holds most service companies back:
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
      {/* 3. What's Included — 7 Stages */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            What&apos;s Included with Full Loop CRM
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Seven stages of the customer lifecycle — handled automatically so
            your team in {metro.city} can focus on the work, not the admin.
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
            $2,500
            <span className="text-xl text-slate-500 font-normal">/mo</span>
          </p>
          <p className="text-slate-600 mb-6 text-lg">
            Exclusive territory in {metro.city}, {metro.stateAbbr}. No other
            partner in your trade competes with you in this market.
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
      {/* 5. Available Industries in [City] */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            Available Industries in {metro.city}
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Each trade gets one exclusive partner in {metro.city},{" "}
            {metro.stateAbbr}. See which industries are still open and claim
            yours before a competitor does.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {industries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/${industry.slug}-crm-${metro.slug}`}
                className="block bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-teal-700 hover:border-teal-400 hover:text-teal-900 hover:shadow-sm transition-all font-medium"
              >
                {industry.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 6. Final CTA */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Lock Your Territory in{" "}
            <span className="text-yellow-300">{metro.city}</span>
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Once your industry in{" "}
            {metro.city}, {metro.stateAbbr} is claimed, it&apos;s off the
            table.
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
      {/* 7. Nearby Markets */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-xl font-bold text-slate-900 font-heading mb-6">
            Nearby Markets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {nearbyMarkets.map((m) => (
              <Link
                key={m.slug}
                href={`/location/${generateLocationSlug(m)}`}
                className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
              >
                Best Home Service CRM in {m.city}, {m.stateAbbr}
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
