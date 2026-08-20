import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
  itemListSchema,
} from "@/lib/schema";
import { groupMetrosByState } from "@/lib/marketing/metroGroups";
import { stateHubMetro } from "@/lib/marketing/cityContext";

export const metadata: Metadata = {
  title: "Home Service CRM by State | 400+ Markets | Full Loop CRM",
  description:
    "Full Loop CRM's exclusive-territory home service CRM, available in 400+ markets across every US state. One operator per trade per city.",
  keywords: [
    "home service CRM locations",
    "CRM by state",
    "field service software by state",
    "home service CRM markets",
  ],
  openGraph: {
    title: "Home Service CRM by State | Full Loop CRM",
    description: "400+ markets across every US state. One operator per trade per city.",
    url: "https://homeservicecrm.ai/locations",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Service CRM by State | Full Loop CRM",
    description: "400+ markets across every US state. One operator per trade per city.",
  },
  alternates: { canonical: "https://homeservicecrm.ai/locations" },
};

const breadcrumbs = [
  { name: "Home", url: "https://homeservicecrm.ai" },
  { name: "Locations", url: "https://homeservicecrm.ai/locations" },
];

export default function LocationsIndexPage() {
  const groups = groupMetrosByState();
  const totalCities = groups.reduce((sum, g) => sum + g.metros.length, 0);

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Home Service CRM by State | Full Loop CRM",
          `Full Loop CRM's exclusive-territory home service CRM, available across ${totalCities}+ markets in every US state.`,
          "https://homeservicecrm.ai/locations",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("https://homeservicecrm.ai/locations", "United States", "Country")} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd
        data={itemListSchema(
          "Full Loop CRM Markets by State",
          groups.map((g) => ({
            name: `Home Service CRM in ${g.state}`,
            url: `https://homeservicecrm.ai/locations/${g.stateAbbr.toLowerCase()}`,
          }))
        )}
      />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            {totalCities}+ Markets.{" "}
            <span className="text-teal-400">Every US State.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            One partner per trade per city.{" "}
            <span className="text-yellow-300 font-cta">Exclusive territory.</span>{" "}
            Browse by state to see local markets and territory availability.
          </p>
        </div>
      </section>

      {/* State Grid */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            Browse by State
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Every state Full Loop CRM covers, with real licensing, climate, and seasonal-demand data —
            not a generic overview.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group) => {
              const hub = stateHubMetro(group.stateAbbr);
              return (
                <Link
                  key={group.stateAbbr}
                  href={`/locations/${group.stateAbbr.toLowerCase()}`}
                  className="block border border-slate-200 rounded-lg p-5 hover:border-teal-400 hover:shadow-md transition-all"
                >
                  <h3 className="text-base font-bold text-slate-900 font-heading mb-1">
                    {group.state}
                  </h3>
                  <p className="text-sm text-slate-500 leading-snug">
                    {group.metros.length} {group.metros.length === 1 ? "market" : "markets"}
                    {hub ? ` — anchored by ${hub.city}` : ""}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* Full city directory */}
          <div className="mt-12 text-center border-t border-slate-200 pt-12">
            <p className="text-lg text-slate-700 mb-4">
              Looking for a specific city?{" "}
              <span className="font-semibold text-slate-900">
                Browse the full directory.
              </span>
            </p>
            <Link
              href="/home-service-crm-locations"
              className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              See All {totalCities}+ Cities
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Claim Your Territory
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Lock in your exclusive city before a competitor does. One partner per trade per city.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Join Waitlist
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              Browse Every Industry
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
