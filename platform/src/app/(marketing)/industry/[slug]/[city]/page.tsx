import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoOverride } from "@/lib/seo/overrides";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
  softwareApplicationSchema,
  itemListSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/schema";
import {
  industries,
  metros,
  citySlug,
  industryPath,
  locationPath,
  comboPath,
  type ComboIndustry,
  type ComboMetro,
} from "@/lib/marketing/combos";
import { buildCityContextSection } from "@/lib/marketing/cityContext";
import { SectionBlock, RelatedLinksHub } from "@/components/marketing/SeoSection";
import { industries as richIndustries } from "@/lib/marketing/industries";
import { getIndustryContent } from "@/lib/marketing/allIndustryContent";
import { getIndustryContentSlug } from "@/lib/marketing/industryMapping";
import { faqs as globalFaqs } from "@/lib/marketing/faqs";
import { getStateMeta } from "@/lib/marketing/stateMetadata";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { buildLocalFaqs } from "@/lib/marketing/localFaqs";
import { PageHero } from "@/components/marketing/PageHero";
import {
  getTerritoryStatus,
  territoryStatusLabel,
  territoryStatusColor,
} from "@/lib/marketing/territoryStatus";

export const dynamicParams = true;
export const revalidate = 2592000;

export function generateStaticParams() {
  return [];
}

function findComboByPath(industrySlug: string, cityParam: string): { industry: ComboIndustry; metro: ComboMetro } | null {
  const industry = industries.find((i) => i.slug === industrySlug);
  if (!industry) return null;
  const metro = metros.find((m) => `${citySlug(m)}-${m.stateAbbr.toLowerCase()}` === cityParam.toLowerCase());
  if (!metro) return null;
  return { industry, metro };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; city: string }>;
}): Promise<Metadata> {
  const { slug, city } = await params;
  const match = findComboByPath(slug, city);
  if (!match) return {};

  const { industry, metro } = match;
  const trade = industry.name.toLowerCase();
  const { status } = await getTerritoryStatus(industry.slug, metro.slug);

  const statusTag =
    status === "claimed" ? "Territory Claimed" : status === "pending" ? "Application Pending" : "Territory Available";

  const title = `${industry.name} CRM — ${metro.city}, ${metro.stateAbbr} | Full Loop`;
  const description =
    status === "claimed"
      ? `The exclusive ${trade} CRM license for ${metro.city}, ${metro.stateAbbr} is claimed. One partner per city — see nearby open markets.`
      : status === "pending"
        ? `A ${trade} operator in ${metro.city}, ${metro.stateAbbr} has applied for this exclusive license. Join the waitlist if it falls through.`
        : `The only full-cycle CRM for ${trade} businesses in ${metro.city}, ${metro.stateAbbr}. AI leads, sales, scheduling & payments — one operator per city.`;
  const url = `https://homeservicesbusinesscrm.com${comboPath(industry, metro)}`;

  const override = await getSeoOverride(url);
  const finalTitle = override?.title || title;
  const finalDescription = override?.description || description;

  // 2026-08-19: every combo page is self-canonical again — restored
  // alongside the sitemap re-add (see src/lib/seo/main-sitemap.ts). Previously
  // non-hub cities canonicalized to their state hub to avoid duplicate
  // content across near-identical pages; that consolidation is off per
  // Jeff's "we need them all back."
  const canonicalUrl = url;

  return {
    title: finalTitle,
    description: finalDescription,
    keywords: [
      `${trade} CRM ${metro.city}`,
      `exclusive ${trade} CRM ${metro.city}`,
      `${metro.city} ${trade} software`,
      `${trade} CRM ${metro.stateAbbr}`,
      `${trade} business software ${metro.city} ${metro.stateAbbr}`,
      `${trade} scheduling software ${metro.city}`,
      `${metro.city} home services CRM`,
    ],
    openGraph: {
      title: `${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} — ${statusTag}`,
      description: finalDescription,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} — ${statusTag}`,
      description: finalDescription,
    },
    alternates: { canonical: canonicalUrl },
  };
}

function getRelatedCombos(industrySlug: string, metroSlug: string) {
  const links: { label: string; href: string }[] = [];
  const sameTrade = metros.filter((m) => m.slug !== metroSlug).slice(0, 3);
  const ind = industries.find((i) => i.slug === industrySlug);
  if (ind) {
    for (const m of sameTrade) {
      links.push({ label: `Best ${ind.name} CRM in ${m.city}, ${m.stateAbbr}`, href: comboPath(ind, m) });
    }
  }
  const met = metros.find((m) => m.slug === metroSlug);
  const otherTrades = industries.filter((i) => i.slug !== industrySlug).slice(0, 3);
  if (met) {
    for (const i of otherTrades) {
      links.push({ label: `Best ${i.name} CRM in ${met.city}, ${met.stateAbbr}`, href: comboPath(i, met) });
    }
  }
  return links;
}

export default async function ComboPage({
  params,
}: {
  params: Promise<{ slug: string; city: string }>;
}) {
  const { slug, city } = await params;
  const match = findComboByPath(slug, city);
  if (!match) notFound();

  const { industry, metro } = match;
  const pageUrl = `https://homeservicesbusinesscrm.com${comboPath(industry, metro)}`;
  const trade = industry.name.toLowerCase();

  const stateMeta = getStateMeta(metro.stateAbbr);
  const territory = await getTerritoryStatus(industry.slug, metro.slug);
  const statusColors = territoryStatusColor(territory.status);
  const isClaimed = territory.status === "claimed";
  const isPending = territory.status === "pending";
  const primaryCtaLabel = isClaimed ? "See Nearby Markets" : "Join Waitlist";
  const primaryCtaHref = isClaimed ? locationPath(metro) : "/contact";

  const contentSlug = getIndustryContentSlug(industry.slug);
  const content = contentSlug ? getIndustryContent(contentSlug) : null;
  const richData = contentSlug
    ? richIndustries.find((ri) => ri.slug === contentSlug)
    : richIndustries.find((ri) => ri.name.toLowerCase() === industry.name.toLowerCase());

  const breadcrumbs = [
    { name: "Home", url: "https://homeservicesbusinesscrm.com" },
    { name: `${industry.name} CRM`, url: `https://homeservicesbusinesscrm.com${industryPath(industry)}` },
    { name: `Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr}`, url: pageUrl },
  ];

  const relatedLinks = getRelatedCombos(industry.slug, metro.slug);
  const sameStateMetros = metros.filter((m) => m.stateAbbr === metro.stateAbbr && m.slug !== metro.slug).slice(0, 6);
  const citySection = buildCityContextSection(metro, stateMeta, trade);

  const nearbyComboItems = sameStateMetros.map((m) => ({
    name: `${industry.name} CRM in ${m.city}, ${m.stateAbbr}`,
    url: `https://homeservicesbusinesscrm.com${comboPath(industry, m)}`,
  }));

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${pageUrl}/#service`,
    name: `${industry.name} CRM Software in ${metro.city}, ${metro.stateAbbr}`,
    description: `Full-cycle ${trade} CRM for ${metro.city}, ${metro.stateAbbr} — AI lead generation, AI sales, scheduling, GPS dispatch, payments, and reviews. One exclusive operator per city.`,
    serviceType: `${industry.name} CRM`,
    url: pageUrl,
    provider: { "@id": "https://homeservicesbusinesscrm.com/#organization" },
    areaServed: {
      "@type": "City",
      name: `${metro.city}, ${metro.stateAbbr}`,
      containedInPlace: { "@type": "State", name: metro.state },
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "2500",
      availability: "https://schema.org/InStock",
      url: "https://homeservicesbusinesscrm.com/waitlist",
    },
  };

  return (
    <>
      <JsonLd data={webPageSchema(`Best ${industry.name} CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`, `The best CRM for ${trade} businesses in ${metro.city}, ${metro.stateAbbr}.`, pageUrl, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema(pageUrl, `${metro.city}, ${metro.stateAbbr}`, "City")} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={serviceLd} />
      <JsonLd data={softwareApplicationSchema("2500", "USD")} />
      <JsonLd data={itemListSchema(`${industry.name} CRM in nearby ${metro.stateAbbr} markets`, nearbyComboItems)} />
      {content?.faqs && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: content.faqs.slice(0, 5).map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: { "@type": "Answer", text: faq.a },
            })),
          }}
        />
      )}

      {/* Live territory status strip — unique to the combo page, sits above
          the shared hero chrome since it's real-time data, not static copy. */}
      <div className={`${statusColors.bg} border-b border-slate-700/60 py-2 px-6`}>
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColors.dot} animate-pulse`} />
          <span className={`${statusColors.text} font-cta text-xs uppercase tracking-wider`}>
            {territoryStatusLabel(territory.status)} — {industry.name} in {metro.city}, {metro.stateAbbr}
          </span>
        </div>
      </div>

      {/* Hero — same chrome as the homepage, industry+city-specific content */}
      <PageHero
        topbarRight={`${industry.name} · ${metro.city}, ${metro.stateAbbr}`}
        preHeadline={`${industry.name} CRM / ${metro.city}, ${metro.stateAbbr}`}
        h1={<>The {industry.name} CRM for {metro.city}, {metro.stateAbbr}</>}
        h2={<>Licensed to one operator</>}
        subhead={<>Full Loop CRM is the only full-cycle <Link href="/" className="underline underline-offset-2">home service CRM</Link> built for {trade} businesses, and we license a single exclusive partner per city.</>}
        proofLine={richData ? richData.longDescription : undefined}
        ctaText={primaryCtaLabel}
        ctaHref={primaryCtaHref}
        badges={[
          { label: `${industry.name} CRM`, href: industryPath(industry) },
          { label: `${metro.city} Locations`, href: locationPath(metro) },
          { label: "All Industries", href: "/full-loop-crm-service-business-industries" },
          { label: "Case Study", href: "/case-study/the-nyc-maid" },
        ]}
      />

      {content?.stats && (
        <section className="py-10 px-6 bg-white border-b border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {content.stats.slice(0, 4).map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-teal-700 font-heading">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <SectionBlock section={citySection} alt={false} />

      <section className="bg-slate-800 border-y border-slate-700 py-6 px-6">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className={`w-3 h-3 rounded-full ${statusColors.dot}`} />
            <div className="text-slate-200">
              <p className="font-cta text-sm uppercase tracking-wider text-slate-400">{industry.name} license — {metro.city}, {metro.stateAbbr}</p>
              <p className="text-lg font-bold text-white font-heading">
                {isClaimed ? `Taken${territory.claimedAt ? ` on ${new Date(territory.claimedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}` : ""}` : isPending ? "Application under review — not yet confirmed" : "Available right now — one operator gets it"}
              </p>
            </div>
          </div>
          <Link href={primaryCtaHref} className="inline-block bg-teal-500 text-slate-900 font-cta px-6 py-2.5 rounded-lg hover:bg-teal-400 transition-colors text-sm">
            {primaryCtaLabel}
          </Link>
        </div>
      </section>

      {stateMeta && (
        <section className="bg-white py-16 px-6 border-b border-slate-200">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-heading mb-2">
              What running a {trade} business in {metro.city}, {metro.stateAbbr} actually looks like
            </h2>
            <p className="text-slate-600 mb-8 max-w-3xl">
              Full Loop CRM is configured for the real rules, seasons, and economics of your market.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Licensing authority</p>
                <a href={stateMeta.licensingUrl} target="_blank" rel="noopener noreferrer" className="text-slate-900 font-bold font-heading hover:text-teal-700">{stateMeta.licensingAuthority}</a>
                <p className="text-sm text-slate-700 mt-2">{stateMeta.permitNote}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Seasonal pattern</p>
                <p className="text-slate-900 font-bold font-heading capitalize">{stateMeta.climateZone.replace(/-/g, " ")} climate</p>
                <p className="text-sm text-slate-700 mt-2">{stateMeta.seasonalNote}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Regional trade association</p>
                <p className="text-slate-900 font-bold font-heading">{stateMeta.tradeAssociation}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Tax + invoicing</p>
                <p className="text-slate-900 font-bold font-heading">State #{stateMeta.populationRank} by population</p>
                <p className="text-sm text-slate-700 mt-2">{stateMeta.taxNote}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Intersection narrative — deliberately NOT the industry page's card/  */}
      {/* grid/stage layout. One continuous editorial column, a compact loop  */}
      {/* strip instead of big stage cards, an inline list instead of a      */}
      {/* challenge grid, and a single split panel instead of two full-width  */}
      {/* sections — same underlying facts, a structurally different page.   */}
      {/* ================================================================= */}
      {content && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-widest text-teal-700 mb-3">
              The {metro.city} Intersection
            </p>
            <h2 className="text-3xl font-bold text-slate-900 font-heading mb-6">
              {industry.name} in {metro.city}, {metro.stateAbbr}: What Actually Runs the Business
            </h2>
            <div className="prose prose-slate prose-lg max-w-none">
              {content.overview.split("\n\n").map((para, idx) => (
                <p key={idx} className="text-slate-700 leading-relaxed mb-5">{para}</p>
              ))}
              <p className="text-slate-700 leading-relaxed mb-5">{content.marketLandscape}</p>
            </div>

            {content.detailedChallenges && (
              <>
                <h3 className="text-xl font-bold text-slate-900 font-heading mt-10 mb-3">
                  What holds a {metro.city} {trade} business back
                </h3>
                <ul className="space-y-2 mb-8">
                  {content.detailedChallenges.map((challenge, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-700 leading-relaxed border-l-2 border-red-200 pl-4 py-1">
                      <span className="font-bold text-slate-900">{challenge.title}.</span> {challenge.body}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {content.featureBreakdown && (
              <>
                <h3 className="text-xl font-bold text-slate-900 font-heading mb-4">
                  The loop, running in {metro.city}
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {content.featureBreakdown.map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-3 py-1.5 text-xs font-cta text-teal-800"
                    >
                      <span className="font-mono text-teal-500">{idx + 1}</span>
                      {feature.title}
                    </span>
                  ))}
                </div>
                <div className="space-y-3 mb-8">
                  {content.featureBreakdown.map((feature, idx) => (
                    <p key={idx} className="text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-900">{feature.subtitle}.</span> {feature.body}
                    </p>
                  ))}
                </div>
              </>
            )}

            {(content.whyGenericCrmsFail || content.roiAnalysis) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                {content.whyGenericCrmsFail && (
                  <div className="bg-slate-900 rounded-lg p-6">
                    <p className="text-xs font-cta uppercase tracking-wider text-teal-400 mb-2">Generic CRMs fall short</p>
                    <p className="text-slate-300 leading-relaxed text-sm">
                      {content.whyGenericCrmsFail.split("\n\n")[0]}
                    </p>
                  </div>
                )}
                {content.roiAnalysis && (
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
                    <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-2">What it&apos;s worth here</p>
                    <p className="text-slate-700 leading-relaxed text-sm">{content.roiAnalysis}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            Full Loop CRM vs. a Generic {industry.name} CRM in {metro.city}
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-2xl mx-auto">
            The difference isn&apos;t a feature list — it&apos;s what the software actually does
            without you touching it.
          </p>
          <ComparisonTable trade={industry.name} />
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-12">
            {metro.city}, {metro.stateAbbr} — {industry.name} Questions
          </h2>
          <div className="space-y-6">
            {buildLocalFaqs(industry, metro, stateMeta).map((faq, idx) => (
              <details key={idx} className="bg-white border border-slate-200 rounded-lg group">
                <summary className="px-6 py-4 cursor-pointer font-bold text-slate-900 font-heading hover:text-teal-700 transition-colors list-none flex items-center justify-between">
                  <span>{faq.q}</span>
                  <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-6 pb-4"><p className="text-slate-700 leading-relaxed">{faq.a}</p></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {content?.gettingStarted && (
        <section className="py-16 px-6 bg-slate-50 border-y border-slate-200">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-lg font-bold text-slate-900 font-heading mb-6 text-center">
              Getting started in {metro.city} — {content.gettingStarted.length} steps
            </h2>
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-2">
              {content.gettingStarted.map((step, idx) => (
                <div key={idx} className="flex-1 flex md:flex-col md:text-center gap-3 md:gap-2 relative">
                  <span className="font-mono text-xs text-teal-600 shrink-0">{String(idx + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 font-heading">{step.step}</p>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {content?.faqs && (
        <section className="py-20 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-12">{industry.name} CRM FAQ for {metro.city} Businesses</h2>
            <div className="space-y-6">
              {content.faqs.map((faq, idx) => (
                <details key={idx} className="bg-slate-50 border border-slate-200 rounded-lg group">
                  <summary className="px-6 py-4 cursor-pointer font-bold text-slate-900 font-heading hover:text-teal-700 transition-colors list-none flex items-center justify-between">
                    <span>{faq.q}</span>
                    <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-6 pb-4"><p className="text-slate-700 leading-relaxed">{faq.a}</p></div>
                </details>
              ))}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-16 mb-8 text-center">General Full Loop CRM Questions</h3>
            <div className="space-y-6">
              {globalFaqs.slice(0, 4).map((faq, idx) => (
                <details key={`global-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg group">
                  <summary className="px-6 py-4 cursor-pointer font-bold text-slate-900 font-heading hover:text-teal-700 transition-colors list-none flex items-center justify-between">
                    <span>{faq.q}</span>
                    <span className="text-teal-600 text-xl group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-6 pb-4"><p className="text-slate-700 leading-relaxed">{faq.a}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">One {industry.name} Operator. {metro.city}. Waitlist Only.</h2>
          <p className="text-slate-600 mb-4 text-lg">The exclusive {trade} CRM license for {metro.city}, {metro.stateAbbr}.</p>
          <Link href={primaryCtaHref} className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors">
            {primaryCtaLabel}
          </Link>
        </div>
      </section>

      <RelatedLinksHub excludeIndustrySlug={industry.slug} excludeLocationSlug={metro.slug} />

      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
          {sameStateMetros.length > 0 && (
            <>
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-4">{industry.name} CRM in Nearby {metro.stateAbbr} Markets</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {sameStateMetros.map((m) => (
                  <Link key={m.slug} href={comboPath(industry, m)} className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">
                    Best {industry.name} CRM in {m.city}, {m.stateAbbr}
                  </Link>
                ))}
              </div>
            </>
          )}
          {relatedLinks.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">Related Pages</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">
                    {link.label}
                  </Link>
                ))}
              </div>
            </>
          )}
          <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">Learn More About Full Loop CRM</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href={industryPath(industry)} className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">{industry.name} CRM Overview</Link>
            <Link href={locationPath(metro)} className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">CRM in {metro.city}</Link>
            <Link href="/full-loop-crm-service-features" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">All Features</Link>
            <Link href="/full-loop-crm-pricing" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">Pricing</Link>
            <Link href="/full-loop-crm-service-business-industries" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">Industries We Serve</Link>
            <Link href="/full-loop-crm-frequently-asked-questions" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">FAQ</Link>
          </div>
        </div>
      </section>
    </>
  );
}
