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
  findCombo,
  industries,
  metros,
  generateIndustrySlug,
} from "@/lib/marketing/combos";
import { industries as richIndustries } from "@/lib/marketing/industries";
import { getIndustryContent } from "@/lib/marketing/allIndustryContent";
import { getIndustryContentSlug } from "@/lib/marketing/industryMapping";
import { faqs as globalFaqs } from "@/lib/marketing/faqs";
import { getStateMeta } from "@/lib/marketing/stateMetadata";
import {
  getTerritoryStatus,
  territoryStatusLabel,
  territoryStatusColor,
} from "@/lib/marketing/territoryStatus";

// ---------------------------------------------------------------------------
// ISR — status drives freshness, content is dynamic per-URL, revalidate hourly
// so claimed/available flips propagate without a deploy.
// ---------------------------------------------------------------------------
export const dynamicParams = true;
export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

// ---------------------------------------------------------------------------
// Dynamic metadata — status-aware so search results mirror live availability
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
  const { status } = await getTerritoryStatus(industry.slug, metro.slug);

  const statusTag =
    status === "claimed"
      ? "Territory Claimed"
      : status === "pending"
        ? "Application Pending"
        : "Territory Available";

  const title = `${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} — One Exclusive License | Full Loop CRM`;
  const description =
    status === "claimed"
      ? `The exclusive ${trade} CRM license for ${metro.city}, ${metro.stateAbbr} has been claimed. Full Loop CRM licenses only one ${trade} partner per metro — see nearby markets still available.`
      : status === "pending"
        ? `A ${trade} operator in ${metro.city}, ${metro.stateAbbr} has applied for the exclusive Full Loop CRM license. Only one per metro — get on the waitlist if the application falls through.`
        : `The only full-cycle CRM built for ${trade} businesses in ${metro.city}, ${metro.stateAbbr} — and it's licensed to one operator per metro. AI lead generation, sales, scheduling, GPS dispatch, invoicing, reviews, and retargeting on one platform. Claim the ${metro.city} territory from $199/mo.`;
  const url = `https://homeservicesbusinesscrm.com/${slug}`;

  return {
    title,
    description,
    keywords: [
      `${trade} CRM ${metro.city}`,
      `exclusive ${trade} CRM ${metro.city}`,
      `${metro.city} ${trade} software`,
      `${trade} CRM ${metro.stateAbbr}`,
      `${trade} business software ${metro.city} ${metro.stateAbbr}`,
      `${trade} scheduling software ${metro.city}`,
      `one trade per city CRM`,
      `${metro.city} home services CRM`,
    ],
    openGraph: {
      title: `${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} — ${statusTag}`,
      description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} — ${statusTag}`,
      description,
    },
    alternates: { canonical: url },
  };
}

// ---------------------------------------------------------------------------
// Related combo links
// ---------------------------------------------------------------------------
function getRelatedCombos(
  industrySlug: string,
  metroSlug: string
): { label: string; href: string }[] {
  const links: { label: string; href: string }[] = [];

  const sameTrade = metros
    .filter((m) => m.slug !== metroSlug)
    .slice(0, 3);
  const ind = industries.find((i) => i.slug === industrySlug);
  if (ind) {
    for (const m of sameTrade) {
      links.push({
        label: `Best ${ind.name} CRM in ${m.city}, ${m.stateAbbr}`,
        href: `/${ind.slug}-crm-${m.slug}`,
      });
    }
  }

  const met = metros.find((m) => m.slug === metroSlug);
  const otherTrades = industries
    .filter((i) => i.slug !== industrySlug)
    .slice(0, 3);
  if (met) {
    for (const i of otherTrades) {
      links.push({
        label: `Best ${i.name} CRM in ${met.city}, ${met.stateAbbr}`,
        href: `/${i.slug}-crm-${met.slug}`,
      });
    }
  }

  return links;
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
  const pageUrl = `https://homeservicesbusinesscrm.com/${slug}`;
  const trade = industry.name.toLowerCase();

  // State-specific intel and live territory status — real per-URL variability
  const stateMeta = getStateMeta(metro.stateAbbr);
  const territory = await getTerritoryStatus(industry.slug, metro.slug);
  const statusColors = territoryStatusColor(territory.status);
  const isClaimed = territory.status === "claimed";
  const isPending = territory.status === "pending";
  const primaryCtaLabel = isClaimed
    ? "See Nearby Markets"
    : isPending
      ? "Join the Waitlist"
      : "Claim This Territory";
  const primaryCtaHref = isClaimed
    ? `/location/home-service-crm-in-${metro.shortSlug}`
    : "/crm-partnership-request-form";

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
    {
      name: `${industry.name} CRM`,
      url: `https://homeservicesbusinesscrm.com/industry/${generateIndustrySlug(industry)}`,
    },
    {
      name: `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr}`,
      url: pageUrl,
    },
  ];

  const relatedLinks = getRelatedCombos(industry.slug, metro.slug);

  // Nearby markets in same state
  const sameStateMetros = metros.filter(
    (m) => m.stateAbbr === metro.stateAbbr && m.slug !== metro.slug
  ).slice(0, 6);

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

      {content?.faqs && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.slice(0, 5).map((faq) => ({
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
      {/* 1. HERO — status-aware territory claim                            */}
      {/* ================================================================= */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div
            className={`inline-flex items-center gap-2 ${statusColors.bg} border border-slate-700/60 rounded-full px-4 py-1.5 mb-6`}
          >
            <span className={`w-2 h-2 rounded-full ${statusColors.dot} animate-pulse`} />
            <span className={`${statusColors.text} font-cta text-xs uppercase tracking-wider`}>
              {territoryStatusLabel(territory.status)} — {metro.city}, {metro.stateAbbr}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            The{" "}
            <span className="text-teal-400">{industry.name}</span>{" "}
            CRM for {metro.city}, {metro.stateAbbr} — Licensed to One Operator
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-4">
            Full Loop CRM is the only full-cycle CRM built for {trade} businesses,
            and we license a single exclusive partner per metro. In {metro.city},
            that means one {trade} company gets every AI-generated lead, every
            local SEO asset, and the entire platform — and nobody else.
          </p>
          {richData && (
            <p className="text-base text-slate-400 max-w-2xl mx-auto mb-8">
              {richData.longDescription}
            </p>
          )}

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
              href={primaryCtaHref}
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              {primaryCtaLabel}
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
      {/* 1b. TERRITORY STATUS BAND — live availability                     */}
      {/* ================================================================= */}
      <section className="bg-slate-800 border-y border-slate-700 py-6 px-6">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`w-3 h-3 rounded-full ${statusColors.dot}`} />
            <div className="text-slate-200">
              <p className="font-cta text-sm uppercase tracking-wider text-slate-400">
                {industry.name} license — {metro.city}, {metro.stateAbbr}
              </p>
              <p className="text-lg font-bold text-white font-heading">
                {isClaimed
                  ? `Taken${territory.claimedAt ? ` on ${new Date(territory.claimedAt).toLocaleDateString()}` : ""}`
                  : isPending
                    ? "Application under review — not yet confirmed"
                    : "Available right now — one operator gets it"}
              </p>
            </div>
          </div>
          <Link
            href={primaryCtaHref}
            className="inline-block bg-teal-500 text-slate-900 font-cta px-6 py-2.5 rounded-lg hover:bg-teal-400 transition-colors text-sm"
          >
            {primaryCtaLabel}
          </Link>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 1c. LOCAL INTEL — state-specific facts, unique per page           */}
      {/* ================================================================= */}
      {stateMeta && (
        <section className="bg-white py-16 px-6 border-b border-slate-200">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading mb-2">
              What running a {trade} business in {metro.city},{" "}
              {metro.stateAbbr} actually looks like
            </h2>
            <p className="text-slate-600 mb-8 max-w-3xl">
              Full Loop CRM is configured for the real rules, seasons, and
              economics of your market — not a generic national template.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">
                  Licensing authority
                </p>
                <a
                  href={stateMeta.licensingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 font-bold font-heading hover:text-teal-700"
                >
                  {stateMeta.licensingAuthority}
                </a>
                <p className="text-sm text-slate-700 mt-2">
                  {stateMeta.permitNote}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">
                  Seasonal pattern
                </p>
                <p className="text-slate-900 font-bold font-heading capitalize">
                  {stateMeta.climateZone.replace(/-/g, " ")} climate
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  {stateMeta.seasonalNote}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">
                  Regional trade association
                </p>
                <p className="text-slate-900 font-bold font-heading">
                  {stateMeta.tradeAssociation}
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  Full Loop CRM tracks association membership, CEU credits, and
                  referral partnerships inside every tenant workspace.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">
                  Tax + invoicing
                </p>
                <p className="text-slate-900 font-bold font-heading">
                  State #{stateMeta.populationRank} by population
                </p>
                <p className="text-sm text-slate-700 mt-2">
                  {stateMeta.taxNote} Full Loop CRM auto-applies the right tax
                  rules on every invoice you send from {metro.city}.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 2. INDUSTRY OVERVIEW (localized)                                  */}
      {/* ================================================================= */}
      {content && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading mb-6">
              Why {industry.name} Businesses in {metro.city} Need Full Loop CRM
            </h2>
            <div className="prose prose-slate prose-lg max-w-none">
              {content.overview.split("\n\n").map((para, idx) => (
                <p key={idx} className="text-slate-700 leading-relaxed mb-6">
                  {para}
                </p>
              ))}
              <p className="text-slate-700 leading-relaxed mb-6">
                In {metro.city}, {metro.stateAbbr}, {trade} businesses face
                the same core challenges — but with local competitive
                dynamics that make speed, visibility, and operational
                efficiency even more critical. The {metro.city} market
                rewards businesses that respond first, show up on time, and
                build a reputation that new customers trust. Full Loop CRM
                gives {trade} operators in {metro.city} the infrastructure
                to win on all three fronts.
              </p>
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
              Challenges {metro.city} {industry.name} Businesses Face Every Day
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Every {trade} business owner in {metro.city} knows these pain
              points. Here&apos;s how they hold your company back — and why
              a purpose-built CRM is the only real fix.
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
              How Full Loop CRM Works for {industry.name} Businesses in {metro.city}
            </h2>
            <p className="text-slate-600 text-center mb-12 max-w-3xl mx-auto">
              Full Loop CRM manages every stage of the {trade} customer
              lifecycle — from the first Google search in {metro.city} to
              the fifth rebooking. Here&apos;s how each stage works for your business.
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
              Why Jobber, Housecall Pro, and ServiceTitan Don&apos;t Work for {metro.city} {industry.name} Businesses
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
              What Full Loop CRM Is Worth to a {industry.name} Business in {metro.city}
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
      {/* 7. PRICING — one license, one metro                               */}
      {/* ================================================================= */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">
            One {industry.name} License for {metro.city}. $199/mo.
          </h2>
          <p className="text-5xl font-extrabold text-teal-600 font-heading mb-2">
            $199<span className="text-xl text-slate-500 font-normal">/mo</span>
          </p>
          <p className="text-slate-600 mb-4 text-lg">
            The exclusive {trade} CRM license for {metro.city},{" "}
            {metro.stateAbbr}. When it&apos;s yours, no other {trade}{" "}
            business in the metro can sign up — ever.
          </p>
          <p className="text-slate-700 mb-6 max-w-xl mx-auto">
            Full Loop CRM replaces 9+ separate tools — lead generation,
            AI sales, scheduling, GPS operations, payments, reviews,
            referrals, retargeting, and analytics — with one integrated
            platform. The $199/mo license includes your exclusive{" "}
            {metro.city} territory, all 7 lifecycle stages, the Selena AI
            assistant, client and team portals, and all core updates.
          </p>
          <p className="text-sm text-slate-500 mb-8">
            $999 one-time setup. No contracts. Cancel anytime — but the next
            applicant inherits the {metro.city} license.
          </p>
          <Link
            href={primaryCtaHref}
            className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {primaryCtaLabel}
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
              How to Get Started in {metro.city}
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
      {/* 9. OWNERSHIP TRANSPARENCY                                         */}
      {/* ================================================================= */}
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
      {/* 10. FAQs                                                          */}
      {/* ================================================================= */}
      {content?.faqs && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-12">
              {industry.name} CRM FAQ for {metro.city} Businesses
            </h2>

            <div className="space-y-6">
              {content.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-lg group"
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

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-16 mb-8 text-center">
              General Full Loop CRM Questions
            </h3>
            <div className="space-y-6">
              {globalFaqs.slice(0, 4).map((faq, idx) => (
                <details
                  key={`global-${idx}`}
                  className="bg-slate-50 border border-slate-200 rounded-lg group"
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
      {/* 11. FINAL CTA — status-aware                                      */}
      {/* ================================================================= */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div
            className={`inline-flex items-center gap-2 ${statusColors.bg} border border-slate-700/60 rounded-full px-4 py-1.5 mb-6`}
          >
            <span className={`w-2 h-2 rounded-full ${statusColors.dot}`} />
            <span className={`${statusColors.text} font-cta text-xs uppercase tracking-wider`}>
              {territoryStatusLabel(territory.status)}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            {isClaimed
              ? `The ${industry.name} License for ${metro.city} Is Taken`
              : isPending
                ? `Application Pending for ${metro.city} ${industry.name} License`
                : `Claim the ${industry.name} License for ${metro.city}`}
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            {isClaimed
              ? `Full Loop CRM licenses one ${trade} operator per metro. The ${metro.city}, ${metro.stateAbbr} license is active. Check nearby markets or waitlist in case it opens back up.`
              : isPending
                ? `Another ${trade} operator has applied for the ${metro.city}, ${metro.stateAbbr} license. Get on the waitlist — if the application doesn't close, the next in line gets it.`
                : `One partner per trade per metro. Once the ${trade} license in ${metro.city}, ${metro.stateAbbr} is claimed, it's off the table — forever.`}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={primaryCtaHref}
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              {primaryCtaLabel}
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
      {/* 12. NEARBY MARKETS & RELATED PAGES                                */}
      {/* ================================================================= */}
      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
          {sameStateMetros.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-4">
                {industry.name} CRM in Nearby {metro.stateAbbr} Markets
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {sameStateMetros.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/${industry.slug}-crm-${m.slug}`}
                    className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
                  >
                    Best {industry.name} CRM in {m.city}, {m.stateAbbr}
                  </Link>
                ))}
              </div>
            </>
          )}

          {relatedLinks.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">
                Related Pages
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {relatedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </>
          )}

          <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">
            Learn More About Full Loop CRM
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href={`/industry/${generateIndustrySlug(industry)}`}
              className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm"
            >
              {industry.name} CRM Overview
            </Link>
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
