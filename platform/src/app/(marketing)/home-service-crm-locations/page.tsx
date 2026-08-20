import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
  itemListSchema,
} from "@/lib/schema";
import { metros, locationPath } from "@/lib/marketing/combos";
import { groupMetrosByState } from "@/lib/marketing/metroGroups";

const URL = "https://homeservicecrm.ai/home-service-crm-locations";

export const metadata: Metadata = {
  title: "Home Service CRM by City — 400+ U.S. Cities | Full Loop CRM",
  description:
    "Full Loop CRM in 400+ U.S. cities — the full-cycle, AI-managed home service business CRM that runs an automated business. Live-proven by The NYC Maid: ~200 services/month, one person, under an hour a day. One partner per trade per city.",
  keywords: [
    "home service crm by city",
    "home service business crm locations",
    "home service crm near me",
    "crm for home service business in my city",
    "local home service crm",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Home Service CRM by City — 400+ U.S. Cities | Full Loop CRM",
    description:
      "The full-cycle, AI-managed home service business CRM, available in 400+ U.S. cities. One partner per trade per city.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Service CRM by City — 400+ U.S. Cities | Full Loop CRM",
    description:
      "The full-cycle, AI-managed home service business CRM, available in 400+ U.S. cities.",
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://homeservicecrm.ai" },
  { name: "Locations", url: URL },
];

export default function LocationsHubPage() {
  const grouped = groupMetrosByState();

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Home Service CRM by City | Full Loop CRM",
          "The full-cycle, AI-managed home service business CRM, available in 400+ U.S. cities. One partner per trade per city.",
          URL,
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema(URL, "United States", "Country")} />
      <JsonLd
        data={itemListSchema(
          "Home Service CRM by City",
          metros.map((m) => ({
            name: `Home Service CRM in ${m.city}, ${m.stateAbbr}`,
            url: `https://homeservicecrm.ai${locationPath(m)}`,
          }))
        )}
      />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-teal-400 font-cta text-sm uppercase tracking-wider mb-4">
            Available in 400+ U.S. Cities
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            Home Service CRM <span className="text-teal-400">by City</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-4">
            The full-cycle, AI-managed home service business CRM that runs an
            automated business — now serving home service operators across 400+
            U.S. cities. One partner per trade per city.
          </p>
          <p className="text-base text-teal-300 max-w-2xl mx-auto font-cta">
            Live-proven: The NYC Maid runs ~200 services a month on Full Loop —
            one person, under an hour a day.
          </p>
        </div>
      </section>

      {/* City directory grouped by state */}
      <section className="bg-white py-16 px-6">
        <div className="mx-auto max-w-6xl">
          {grouped.map((group) => (
            <div key={group.stateAbbr} className="mb-10">
              <h2 className="text-lg font-bold font-heading text-slate-900 mb-3 border-b border-slate-200 pb-2">
                {group.state}
              </h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                {group.metros.map((m) => (
                  <li key={m.slug}>
                    <Link
                      href={locationPath(m)}
                      className="text-sm text-slate-600 hover:text-teal-600 transition-colors"
                    >
                      Home Service CRM in {m.city}, {m.stateAbbr}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 py-16 px-6 text-center">
        <h2 className="text-2xl font-extrabold font-heading text-slate-900 mb-4">
          Don&apos;t see your city, or want to browse by trade?
        </h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/full-loop-crm-service-business-industries"
            className="inline-block rounded-lg bg-teal-600 px-6 py-3 text-sm font-cta font-semibold text-white hover:bg-teal-700 transition-colors"
          >
            Browse 50+ Trades
          </Link>
          <Link
            href="/waitlist"
            className="inline-block rounded-lg border border-slate-300 px-6 py-3 text-sm font-cta font-semibold text-slate-700 hover:bg-white transition-colors"
          >
            Check Your Territory
          </Link>
        </div>
      </section>
    </>
  );
}
