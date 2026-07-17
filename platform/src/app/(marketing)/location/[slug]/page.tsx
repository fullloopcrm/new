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
import { getCaseStudyStats } from "@/lib/caseStudyStats";
import LiveProofBand from "@/components/LiveProofBand";
import { getStateMeta } from "@/lib/marketing/stateMetadata";
import { buildLocationSections, type LocationSection } from "@/lib/marketing/locationContent";

// ---------------------------------------------------------------------------
// Section renderer: badge (short-tail keyword) + title (long-tail keyword) +
// description (mixed long/short-tail) + body. One consistent block for every
// data-driven section on the page.
// ---------------------------------------------------------------------------
function SectionBlock({ section, alt }: { section: LocationSection; alt: boolean }) {
  return (
    <section className={`py-16 px-6 ${alt ? "bg-slate-50" : "bg-white"}`}>
      <div className="mx-auto max-w-4xl">
        <span className="inline-block mb-4 font-mono text-xs uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
          {section.badge}
        </span>
        <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
          {section.title}
        </h2>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          {section.description}
        </p>
        {section.paragraphs.map((p, i) => (
          <p key={i} className="text-slate-700 leading-relaxed mb-4">
            {p}
          </p>
        ))}
        {section.bullets && (
          <ul className="mt-4 space-y-3">
            {section.bullets.map((b, i) => (
              <li key={i} className="flex gap-3 text-slate-700 leading-relaxed">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ISR — long-tail SEO content, doesn't change hour to hour. Explicit 30-day
// revalidate matches every sibling long-tail route ([combo]/page.tsx, etc.)
// instead of inheriting the 1h clock from getCaseStudyStats() below, which is
// tuned for the homepage's live-stats ticker, not 400 static metro pages.
// ---------------------------------------------------------------------------
export const revalidate = 2592000;

// ---------------------------------------------------------------------------
// Static params — generates all 400+ location pages at build time
// ---------------------------------------------------------------------------
export function generateStaticParams() { return [] }

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

  if (sameState.length >= 12) {
    return sameState.slice(0, 12);
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
    if (nearby.length >= 12) break;
    nearby.push(m);
  }

  return nearby.slice(0, 12);
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

  // Title deliberately leads with the city (not the bare head term "home
  // service CRM") so this local page stops cannibalizing the homepage for the
  // generic query. The homepage owns "home service CRM"; geo pages own
  // "{city} home service CRM".
  const title = `Home Service CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`;
  const description = `The full-cycle, AI-managed home service CRM in ${metro.city}, ${metro.stateAbbr} — runs an automated business. Live-proven by The NYC Maid: ~200 services/month, one person, under an hour a day. One partner per trade.`;
  const url = `https://homeservicesbusinesscrm.com/location/${slug}`;

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
      title: `Home Service CRM in ${metro.city}, ${metro.stateAbbr}`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `Home Service CRM in ${metro.city}, ${metro.stateAbbr}`,
      description,
    },
    alternates: { canonical: url },
  };
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

  const pageUrl = `https://homeservicesbusinesscrm.com/location/${slug}`;
  const live = await getCaseStudyStats();

  const breadcrumbs = [
    { name: "Home", url: "https://homeservicesbusinesscrm.com" },
    { name: "Locations", url: "https://homeservicesbusinesscrm.com/location" },
    {
      name: `Home Service CRM in ${metro.city}, ${metro.stateAbbr}`,
      url: pageUrl,
    },
  ];

  const stateMeta = getStateMeta(metro.stateAbbr);
  const sections = buildLocationSections(metro, stateMeta);
  const nearbyMarkets = getNearbyMarkets(metro);

  return (
    <>
      {/* JSON-LD */}
      <JsonLd
        data={webPageSchema(
          `Home Service CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`,
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
            Home Service CRM in{" "}
            <span className="text-teal-400">
              {metro.city}, {metro.stateAbbr}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-6">
            The only full-cycle, AI-managed{" "}
            <Link
              href="/"
              className="text-teal-300 underline underline-offset-2 hover:text-teal-200"
            >
              home service CRM
            </Link>{" "}
            for businesses in {metro.city}. One partner per trade — is your
            industry still available?
          </p>
          <p className="text-base text-teal-300 max-w-2xl mx-auto mb-6 font-cta">
            Live-proven: The NYC Maid runs ~200 services a month on Full Loop — one person, under an hour a day.
          </p>
          <p className="font-mono text-sm text-teal-400 mb-8 tracking-wide">
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Inquire about the platform
            </Link>
            
          </div>
        </div>
      </section>

      <LiveProofBand live={live} />

      {/* ----------------------------------------------------------------- */}
      {/* Data-driven, city-specific content sections:                      */}
      {/* badge (short-tail) + title (long-tail) + description + body       */}
      {/* ----------------------------------------------------------------- */}
      {sections.map((section, i) => (
        <SectionBlock key={section.title} section={section} alt={i % 2 === 1} />
      ))}

      {/* ----------------------------------------------------------------- */}
      {/* Waitlist callout */}
      {/* ----------------------------------------------------------------- */}
      <section className="py-16 px-6 bg-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            One Operator. The Whole {metro.city} Market.
          </h2>
          <p className="text-slate-300 mb-6 text-lg">
            Full Loop opens one slot per trade in {metro.city}, {metro.stateAbbr}.
            Joining the waitlist isn&apos;t a guarantee — but it&apos;s how {metro.city}{" "}
            operators lock their market before a competitor does.
          </p>
          <Link
            href="/waitlist"
            className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Inquire about {metro.city}
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
                href={`/${generateComboSlug(industry, metro)}`}
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
            Inquire about the platform in{" "}
            <span className="text-yellow-300">{metro.city}</span>
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Once your industry in{" "}
            {metro.city}, {metro.stateAbbr} is claimed, it&apos;s off the
            table.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Inquire
            </Link>
            
            
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
                Home Service CRM in {m.city}, {m.stateAbbr}
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