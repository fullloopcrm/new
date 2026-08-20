import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
  faqSchema,
  serviceSchema,
  softwareApplicationSchema,
  itemListSchema,
} from "@/lib/schema";
import {
  industries,
  metros,
  citySlug,
  locationPath,
  comboPath,
  industryPath,
  type ComboMetro,
} from "@/lib/marketing/combos";
import { getCaseStudyStats } from "@/lib/caseStudyStats";
import LiveProofBand from "@/components/LiveProofBand";
import { getStateMeta } from "@/lib/marketing/stateMetadata";
import { buildLocationFaqs } from "@/lib/marketing/localFaqs";
import { groupMetrosByState } from "@/lib/marketing/metroGroups";
import { PageHero } from "@/components/marketing/PageHero";
import { buildCityContextSection } from "@/lib/marketing/cityContext";
import { SectionBlock } from "@/components/marketing/SeoSection";
import { climateAwareFeaturedIndustries } from "@/lib/marketing/climateIndustries";
import type { StateMetadata } from "@/lib/marketing/stateMetadata";

// ---------------------------------------------------------------------------
// Section format (every section on this page follows this exact shape):
//   1. badge — one word
//   2. heading — long-tail keyword
//   3. description — JSX, mixed long/short-tail keywords, exactly 5 interlinks
//   4. body paragraphs — real, city/state-specific content
// ---------------------------------------------------------------------------
function Section({
  badge,
  heading,
  description,
  children,
  alt,
}: {
  badge: string;
  heading: string;
  description: React.ReactNode;
  children?: React.ReactNode;
  alt: boolean;
}) {
  return (
    <section className={`py-16 px-6 ${alt ? "bg-slate-50" : "bg-white"}`}>
      <div className="mx-auto max-w-4xl">
        <span className="inline-block mb-4 font-mono text-xs uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
          {badge}
        </span>
        <h2 className="text-3xl font-bold text-slate-900 font-heading mb-4">{heading}</h2>
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">{description}</p>
        {children}
      </div>
    </section>
  );
}

const linkCls = "text-teal-700 underline underline-offset-2 hover:text-teal-900";

export function generateStaticParams() {
  return [];
}

function findMetro(state: string, city: string): ComboMetro | null {
  const stateAbbr = state.toUpperCase();
  return metros.find((m) => m.stateAbbr === stateAbbr && citySlug(m) === city.toLowerCase()) ?? null;
}

function getNearbyMarkets(metro: ComboMetro): ComboMetro[] {
  return metros.filter((m) => m.stateAbbr === metro.stateAbbr && m.slug !== metro.slug).slice(0, 12);
}

// Climate-relevant trades first (real regional demand signal — snow removal
// for cold zones, pool cleaning for hot zones, mold/water remediation for
// humid and marine zones), then deterministically filled out with the rest
// of the catalog so every city still gets variety.
function featuredIndustries(metro: ComboMetro, stateMeta: StateMetadata | null, count: number) {
  return climateAwareFeaturedIndustries(industries, stateMeta?.climateZone, metro.slug, count);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}): Promise<Metadata> {
  const { state, city } = await params;
  const metro = findMetro(state, city);
  if (!metro) return {};

  const title = `Home Service CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`;
  const description = `The full-cycle, AI-managed home service CRM in ${metro.city}, ${metro.stateAbbr}. Live-proven by The NYC Maid: real clients, one person, under an hour a day. One partner per trade.`;
  const url = `https://homeservicesbusinesscrm.com${locationPath(metro)}`;

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
    openGraph: { title: `Home Service CRM in ${metro.city}, ${metro.stateAbbr}`, description, url, type: "website" },
    twitter: { card: "summary_large_image", title: `Home Service CRM in ${metro.city}, ${metro.stateAbbr}`, description },
    alternates: { canonical: url },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ state: string; city: string }>;
}) {
  const { state, city } = await params;
  const metro = findMetro(state, city);
  if (!metro) notFound();

  const pageUrl = `https://homeservicesbusinesscrm.com${locationPath(metro)}`;
  const live = await getCaseStudyStats();
  const stateGroup = groupMetrosByState().find((g) => g.stateAbbr === metro.stateAbbr);
  const stateMeta = getStateMeta(metro.stateAbbr);
  const nearbyMarkets = getNearbyMarkets(metro);
  const localFaqs = buildLocationFaqs(metro, stateMeta);
  const citySection = buildCityContextSection(metro, stateMeta, "home service");
  const trades6 = featuredIndustries(metro, stateMeta, 6);
  const trades5 = featuredIndustries(metro, stateMeta, 5);
  const nearby5 = nearbyMarkets.slice(0, 5);

  const breadcrumbs = [
    { name: "Home", url: "https://homeservicesbusinesscrm.com" },
    { name: "Locations", url: "https://homeservicesbusinesscrm.com/home-service-crm-locations" },
    { name: metro.state, url: `https://homeservicesbusinesscrm.com/locations/${state.toLowerCase()}` },
    { name: `Home Service CRM in ${metro.city}, ${metro.stateAbbr}`, url: pageUrl },
  ];

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Home Service CRM in ${metro.city}, ${metro.stateAbbr} | Full Loop CRM`,
          `The best CRM for home service businesses in ${metro.city}, ${metro.stateAbbr}.`,
          pageUrl,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema(pageUrl, `${metro.city}, ${metro.stateAbbr}`, "City")} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={faqSchema(localFaqs.map((f) => ({ question: f.q, answer: f.a })))} />
      <JsonLd data={serviceSchema("Home Service CRM", `locations/${state.toLowerCase()}/${city.toLowerCase()}`, `Home service business CRM available in ${metro.city}, ${metro.stateAbbr}.`, `${metro.city}, ${metro.stateAbbr}`)} />
      <JsonLd data={softwareApplicationSchema("2500", "USD")} />
      <JsonLd
        data={itemListSchema(
          `Home Service Industries Available in ${metro.city}, ${metro.stateAbbr}`,
          industries.map((i) => ({
            name: `${i.name} CRM in ${metro.city}`,
            url: `https://homeservicesbusinesscrm.com${comboPath(i, metro)}`,
          }))
        )}
      />

      {/* Hero — same chrome as the homepage, city-specific content */}
      <PageHero
        topbarRight={`${metro.city}, ${metro.stateAbbr}`}
        preHeadline={`Serving ${metro.state}`}
        h1={<>Home Service CRM in {metro.city}, {metro.stateAbbr}</>}
        subhead={<>The only full-cycle, AI-managed <Link href="/" className="underline underline-offset-2">home service CRM</Link> for businesses in {metro.city}. One partner per trade — is your industry still available?</>}
        proofLine={<>Live-proven: <span style={{ color: "#1F4D2C" }}>The NYC Maid runs on this exact platform</span> — one person, under an hour a day.</>}
        ctaText="Join Waitlist"
        badges={[
          { label: `${metro.city} Territory`, href: "/waitlist" },
          { label: "All Locations", href: "/home-service-crm-locations" },
          { label: "All Industries", href: "/full-loop-crm-service-business-industries" },
          { label: "Case Study", href: "/case-study/the-nyc-maid" },
        ]}
      />

      <LiveProofBand live={live} />

      {/* 1. Overview */}
      <Section
        alt={false}
        badge="Overview"
        heading={`Home Service CRM Software for ${metro.city}, ${metro.stateAbbr} Businesses`}
        description={
          <>
            {metro.city} home service operators — from{" "}
            <Link href={comboPath(trades6[0], metro)} className={linkCls}>{trades6[0].name.toLowerCase()}</Link>{" "}
            to <Link href={comboPath(trades6[1], metro)} className={linkCls}>{trades6[1].name.toLowerCase()}</Link>{" "}
            — run their entire business on{" "}
            <Link href="/full-loop-crm-service-features" className={linkCls}>one platform</Link>{" "}
            instead of stitching together a scheduling app, a separate invoicing tool, and a review-request
            service. Full Loop CRM is a{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className={linkCls}>full-cycle home service CRM</Link>{" "}
            that runs the front office, the schedule, the payments, and the follow-up automatically, and it&apos;s
            licensed to <Link href="/waitlist" className={linkCls}>one exclusive operator per trade</Link> in {metro.city}.
          </>
        }
      >
        <p className="text-slate-700 leading-relaxed mb-4">
          Most home service software in {metro.city} solves one piece of the job — the calendar, or the
          invoice, or the review request — and leaves the owner to stitch the rest together by hand. Full
          Loop CRM was built the other way around: it starts from the moment a {metro.city} homeowner
          searches for help and doesn&apos;t stop until the job is paid, reviewed, and rebooked. The lead
          generation, the AI phone and text agent, the scheduling engine, the GPS-verified field operations,
          the Stripe payment collection, and the automated review requests are one connected system, not
          six separate tools glued together with spreadsheets.
        </p>
        <p className="text-slate-700 leading-relaxed">
          That matters more in a local, in-person trade than almost any other kind of business. A {metro.city}
          homeowner who calls about a job expects a fast, competent answer — not voicemail, not a callback in
          three hours. Full Loop&apos;s AI front office exists specifically to close that gap, in {metro.city}
          and everywhere else it operates, at any hour a homeowner happens to call.
        </p>
      </Section>

      {/* 2. Market */}
      <Section
        alt={false}
        badge="Market"
        heading={`Running a Home Service Business in ${metro.city}, ${metro.state}`}
        description={
          <>
            {stateMeta
              ? `${metro.state} is the #${stateMeta.populationRank} most populous state, and running a business
                 there`
              : `Running a home service business in ${metro.city}`}{" "}
            means competing for local visibility as much as for the job itself. See how Full Loop&apos;s{" "}
            <Link href="/full-loop-crm-service-features" className={linkCls}>lead generation engine</Link>{" "}
            works, browse{" "}
            <Link href="/full-loop-crm-service-business-industries" className={linkCls}>every industry we serve</Link>,
            read the{" "}
            <Link href="/case-study/the-nyc-maid" className={linkCls}>real business built on this platform</Link>,
            check <Link href="/full-loop-crm-pricing" className={linkCls}>pricing</Link>, or{" "}
            <Link href="/waitlist" className={linkCls}>apply for your {metro.city} territory</Link>.
          </>
        }
      >
        {stateMeta && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Trade association</p>
              <p className="text-slate-900 font-bold font-heading">{stateMeta.tradeAssociation}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Population rank</p>
              <p className="text-slate-900 font-bold font-heading">#{stateMeta.populationRank} of 50 states</p>
            </div>
          </div>
        )}
        <p className="text-slate-700 leading-relaxed mt-4">
          Whatever the trade, the underlying economics of running a home service business in {metro.city}
          are the same: acquisition cost per job, how fast a lead turns into a booked appointment, how much
          of the calendar goes to travel versus billable work, and how many one-time customers become repeat
          customers. Full Loop CRM is built to move all four numbers in the operator&apos;s favor at once,
          rather than optimizing one at the expense of the others — which is the usual tradeoff with
          single-purpose scheduling or invoicing software.
        </p>
      </Section>

      {/* 2b. City Context — real per-city data (county, population, geography,
          neighbors, climate zone) so this page reads as genuinely specific to
          {metro.city} rather than a template with the city name swapped in. */}
      <SectionBlock section={citySection} alt={true} />

      {/* 3. Licensing */}
      {stateMeta && (
        <Section
          alt={true}
          badge="Licensing"
          heading={`${metro.state} Licensing Rules for Home Service Contractors`}
          description={
            <>
              Before software, there&apos;s the paperwork: {stateMeta.licensingAuthority} governs contractor
              licensing in {metro.state}. Full Loop CRM doesn&apos;t replace that — it runs the business once
              an operator is properly licensed, the same way it does for every{" "}
              <Link href="/full-loop-crm-service-business-industries" className={linkCls}>industry on the platform</Link>{" "}
              in <Link href={locationPath(metro)} className={linkCls}>{metro.city}</Link>, across every
              state <Link href="/home-service-crm-locations" className={linkCls}>Full Loop covers</Link>, per
              the terms in the{" "}
              <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className={linkCls}>ownership model</Link>.
            </>
          }
        >
          <p className="text-slate-700 leading-relaxed">{stateMeta.permitNote}</p>
        </Section>
      )}

      {/* 4. Seasonal */}
      {stateMeta && (
        <Section
          alt={false}
          badge="Seasonal"
          heading={`Seasonal Demand for Home Services in ${metro.city}, ${metro.stateAbbr}`}
          description={
            <>
              {metro.state}&apos;s {stateMeta.climateZone.replace(/-/g, " ")} climate shapes when {metro.city}
              homeowners call for help, and Full Loop&apos;s{" "}
              <Link href="/full-loop-crm-service-features" className={linkCls}>scheduling engine</Link>{" "}
              is built to absorb the swings rather than get buried by them — the same automation that runs{" "}
              <Link href="/case-study/the-nyc-maid" className={linkCls}>The NYC Maid</Link>{" "}
              through its own seasonal peaks, available to{" "}
              <Link href="/waitlist" className={linkCls}>any operator</Link>{" "}
              who claims a{" "}
              <Link href="/full-loop-crm-service-business-industries" className={linkCls}>trade</Link>{" "}
              in {metro.city}.
            </>
          }
        >
          <p className="text-slate-700 leading-relaxed">{stateMeta.seasonalNote}</p>
        </Section>
      )}

      {/* 5. Trades */}
      <Section
        alt={true}
        badge="Trades"
        heading={`Home Service Trades Available in ${metro.city}, ${metro.stateAbbr}`}
        description={
          <>
            Full Loop licenses one exclusive operator per trade per city, so availability in {metro.city}
            changes as territories are claimed — including{" "}
            <Link href={comboPath(trades5[0], metro)} className={linkCls}>{trades5[0].name.toLowerCase()}</Link>,{" "}
            <Link href={comboPath(trades5[1], metro)} className={linkCls}>{trades5[1].name.toLowerCase()}</Link>,{" "}
            <Link href={comboPath(trades5[2], metro)} className={linkCls}>{trades5[2].name.toLowerCase()}</Link>,{" "}
            <Link href={comboPath(trades5[3], metro)} className={linkCls}>{trades5[3].name.toLowerCase()}</Link>, and{" "}
            <Link href={comboPath(trades5[4], metro)} className={linkCls}>{trades5[4].name.toLowerCase()}</Link>.
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
          {industries.map((industry) => (
            <Link
              key={industry.slug}
              href={comboPath(industry, metro)}
              className="block bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-teal-700 hover:border-teal-400 hover:text-teal-900 hover:shadow-sm transition-all font-medium"
            >
              {industry.name}
            </Link>
          ))}
        </div>
      </Section>

      {/* 6. Exclusive */}
      <Section
        alt={false}
        badge="Exclusive"
        heading={`One Exclusive Operator Per Trade in ${metro.city}`}
        description={
          <>
            Full Loop&apos;s licensing model is the opposite of a shared-lead marketplace: only one{" "}
            <Link href={industryPath(trades6[2])} className={linkCls}>{trades6[2].name.toLowerCase()}</Link>{" "}
            operator, one{" "}
            <Link href={industryPath(trades6[3])} className={linkCls}>{trades6[3].name.toLowerCase()}</Link>{" "}
            operator, and so on, per trade, in {metro.city}. Check{" "}
            <Link href="/full-loop-crm-pricing" className={linkCls}>pricing</Link>, read{" "}
            <Link href="/full-loop-crm-frequently-asked-questions" className={linkCls}>frequently asked questions</Link>,{" "}
            or <Link href="/waitlist" className={linkCls}>apply to lock your {metro.city} territory</Link>.
          </>
        }
      >
        <p className="text-slate-700 leading-relaxed">
          That exclusivity is deliberate, not a marketing line. Once an operator claims a trade in {metro.city},
          the next business in that same trade that wants Full Loop in {metro.city} is told the market is
          taken. The organic-lead network, the local SEO footprint, and the AI sales agent all work for the
          one operator holding the license — none of it is split or resold to a competitor down the street.
        </p>
      </Section>

      {/* 7. Proof */}
      <Section
        alt={true}
        badge="Proof"
        heading={`The Real Business This Platform Already Runs`}
        description={
          <>
            Full Loop CRM isn&apos;t a concept pitched at {metro.city} operators before it&apos;s proven — it&apos;s
            the exact system running{" "}
            <Link href="/case-study/the-nyc-maid" className={linkCls}>The NYC Maid</Link>, a real cleaning
            company, today.{" "}
            {live && live.clients
              ? `That business has served ${live.clients.toLocaleString()} clients `
              : "That business serves real clients "}
            run by one person, on the same{" "}
            <Link href="/full-loop-crm-service-features" className={linkCls}>booking, dispatch, and payment engine</Link>{" "}
            available to a {metro.city} operator, under the same{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className={linkCls}>ownership terms</Link>.{" "}
            <Link href="/waitlist" className={linkCls}>See if your trade is still open</Link>.
          </>
        }
      >
        <p className="text-slate-700 leading-relaxed">
          The distinction matters: most software vendors describe what their product could theoretically do
          for a business. Full Loop&apos;s core loop — lead capture, AI-answered calls and texts, booking,
          GPS-verified dispatch, Stripe payment collection, automated crew payouts, and review requests —
          isn&apos;t theoretical. It&apos;s the operating system of a business that runs today, and an operator
          in {metro.city} who joins the platform inherits that exact system rather than a earlier, unproven
          version of it.
        </p>
      </Section>

      {/* CTA */}
      <section className="py-16 px-6 bg-slate-900">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">One Operator. The Whole {metro.city} Market.</h2>
          <p className="text-slate-300 mb-6 text-lg">
            Full Loop opens one slot per trade in {metro.city}, {metro.stateAbbr}. Joining the waitlist isn&apos;t
            a guarantee — but it&apos;s how {metro.city} operators lock their market before a competitor does.
          </p>
          <Link href="/waitlist" className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors">
            Join Waitlist
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-12">{metro.city}, {metro.stateAbbr} Questions</h2>
          <div className="space-y-6">
            {localFaqs.map((faq, idx) => (
              <details key={idx} className="bg-slate-50 border border-slate-200 rounded-lg group">
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

      {/* Final CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Inquire about the platform in <span className="text-yellow-300">{metro.city}</span>
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per metro. Once your industry in {metro.city}, {metro.stateAbbr} is claimed,
            it&apos;s off the table.
          </p>
          <Link href="/waitlist" className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors">
            Join Waitlist
          </Link>
        </div>
      </section>

      {/* Nearby markets + hub links */}
      <section className="py-16 px-6 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-5xl">
          {stateGroup && stateGroup.metros.length > 1 && (
            <>
              <h2 className="text-xl font-bold text-slate-900 font-heading mb-6">Nearby Markets in {metro.state}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {nearby5.map((m) => (
                  <Link key={m.slug} href={locationPath(m)} className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">
                    Home Service CRM in {m.city}, {m.stateAbbr}
                  </Link>
                ))}
              </div>
            </>
          )}

          <h3 className="text-lg font-bold text-slate-800 font-heading mb-4">Learn More About Full Loop CRM</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/full-loop-crm-service-features" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">All Features</Link>
            <Link href="/full-loop-crm-pricing" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">Pricing</Link>
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">Why Full Loop?</Link>
            <Link href="/full-loop-crm-service-business-industries" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">Industries We Serve</Link>
            <Link href="/full-loop-crm-101-educational-tips" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">CRM 101</Link>
            <Link href="/full-loop-crm-frequently-asked-questions" className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-sm">FAQ</Link>
          </div>
        </div>
      </section>
    </>
  );
}
