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
  itemListSchema,
} from "@/lib/schema";
import { locationPath } from "@/lib/marketing/combos";
import { groupMetrosByState, type StateGroup } from "@/lib/marketing/metroGroups";
import { getStateMeta } from "@/lib/marketing/stateMetadata";
import { stateHubMetro } from "@/lib/marketing/cityContext";
import { PageHero } from "@/components/marketing/PageHero";

export function generateStaticParams() {
  return [];
}

function findStateGroup(stateAbbr: string): StateGroup | null {
  const abbr = stateAbbr.toUpperCase();
  return groupMetrosByState().find((g) => g.stateAbbr === abbr) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const group = findStateGroup(state);
  if (!group) return {};

  const title = `Home Service CRM in ${group.state} | Full Loop CRM`;
  const description = `Full Loop CRM's exclusive home service CRM, available in ${group.state}. One operator per trade per city. Real ${group.state} licensing data.`;
  const url = `https://homeservicecrm.ai/locations/${state.toLowerCase()}`;

  return {
    title,
    description,
    keywords: [
      `home service CRM ${group.state}`,
      `${group.state} contractor software`,
      `CRM for home service businesses in ${group.state}`,
      `${group.state} field service software`,
    ],
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: url },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const group = findStateGroup(state);
  if (!group) notFound();

  const stateMeta = getStateMeta(group.stateAbbr);
  const hub = stateHubMetro(group.stateAbbr);
  const pageUrl = `https://homeservicecrm.ai/locations/${state.toLowerCase()}`;

  const breadcrumbs = [
    { name: "Home", url: "https://homeservicecrm.ai" },
    { name: "Locations", url: "https://homeservicecrm.ai/locations" },
    { name: group.state, url: pageUrl },
  ];

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Home Service CRM in ${group.state} | Full Loop CRM`,
          `Full Loop CRM's exclusive-territory home service CRM, available across ${group.metros.length} ${group.state} markets.`,
          pageUrl,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema(pageUrl, group.state, "State")} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd
        data={itemListSchema(
          `Home Service CRM Markets in ${group.state}`,
          group.metros.map((m) => ({
            name: `Home Service CRM in ${m.city}, ${m.stateAbbr}`,
            url: `https://homeservicecrm.ai${locationPath(m)}`,
          }))
        )}
      />

      <PageHero
        topbarRight={group.state}
        preHeadline="State Territory"
        h1={<>Home Service CRM in {group.state}</>}
        subhead={
          <>
            Full Loop CRM is licensed across {group.metros.length} {group.state} markets — one exclusive
            operator per trade per city, starting with {hub ? hub.city : group.metros[0]?.city}
            {group.metros.length > 1 ? " and expanding statewide" : ""}.
          </>
        }
        proofLine={<>Live-proven: <span style={{ color: "#1F4D2C" }}>The NYC Maid runs on this exact platform</span> — one person, under an hour a day.</>}
        ctaText="Join Waitlist"
        badges={[
          { label: `${group.state} Territory`, href: "/waitlist" },
          { label: "All States", href: "/locations" },
          { label: "All Industries", href: "/full-loop-crm-service-business-industries" },
        ]}
      />

      {/* Real state facts — licensing, climate, trade association. Not a
          generic overview: every field here is state-specific data. */}
      {stateMeta && (
        <section className="py-16 px-6 bg-white">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-slate-900 font-heading mb-8">
              {group.state} Operating Conditions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Licensing authority</p>
                <p className="text-slate-900 font-bold font-heading">{stateMeta.licensingAuthority}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Trade association</p>
                <p className="text-slate-900 font-bold font-heading">{stateMeta.tradeAssociation}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Climate zone</p>
                <p className="text-slate-900 font-bold font-heading capitalize">{stateMeta.climateZone.replace(/-/g, " ")}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <p className="text-xs font-cta uppercase tracking-wider text-teal-700 mb-1">Population rank</p>
                <p className="text-slate-900 font-bold font-heading">#{stateMeta.populationRank} of 50 states</p>
              </div>
            </div>
            <p className="text-slate-700 leading-relaxed mb-4">{stateMeta.seasonalNote}</p>
            <p className="text-slate-700 leading-relaxed mb-4">{stateMeta.permitNote}</p>
            <p className="text-slate-700 leading-relaxed">{stateMeta.taxNote}</p>
          </div>
        </section>
      )}

      {/* Every city in this state */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-slate-900 font-heading mb-4">
            {group.state} Markets ({group.metros.length})
          </h2>
          <p className="text-slate-600 mb-8 max-w-2xl">
            Full Loop licenses one exclusive operator per trade per city. Availability changes as
            territories are claimed.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.metros.map((m) => (
              <Link
                key={m.slug}
                href={locationPath(m)}
                className="block bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-teal-700 hover:border-teal-400 hover:text-teal-900 hover:shadow-sm transition-all font-medium"
              >
                {m.city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Claim Your {group.state} Territory
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            One partner per trade per city, across every {group.state} market Full Loop covers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Join Waitlist
            </Link>
            <Link href="/locations" className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta">
              Browse Every State
            </Link>
            <Link href="/full-loop-crm-service-business-industries" className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta">
              Browse Every Industry
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
