import Link from "next/link";
import type { Metadata } from "next";
import {
  getNeighborhoodsByRegion,
  getAllNeighborhoods,
  getAllServices,
  getRegions,
} from "@/app/site/fla-dumpster-rentals/_lib/data";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import {
  getOrganizationSchema,
  getFAQPageSchema,
  getBreadcrumbSchema,
  PHONE,
  SITE_URL,
  SITE_NAME,
} from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title: "Dumpster Rental Service Areas | Florida Dumpster Rentals",
  description:
    "Dumpster rental delivery across every region in Florida. South Florida, Central Florida, Tampa Bay, North Florida & more. 10, 20 & 30 yard roll-off containers. Call 954-710-2332.",
  openGraph: {
    title: "Dumpster Rental Service Areas | Florida Dumpster Rentals",
    description:
      "Roll-off dumpster delivery across every region in Florida. 10, 20 & 30 yard containers with same-day delivery available.",
    url: `${SITE_URL}/areas`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/areas`,
  },
};

export default function AreasPage() {
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const totalNeighborhoods = getAllNeighborhoods().length;
  const regions = getRegions();

  const faqItems = [
    {
      q: "What areas do you deliver dumpsters to?",
      a: `We deliver roll-off dumpsters to ${totalNeighborhoods}+ cities, counties, and communities across all of Florida — from the Keys to the Panhandle.`,
    },
    {
      q: "Do you offer same-day dumpster delivery?",
      a: "Yes. Same-day delivery is available in most areas when you call before noon. Next-day delivery is guaranteed for all orders placed by 5 PM.",
    },
    {
      q: "What dumpster sizes are available in my area?",
      a: "We offer 10, 20, and 30 yard roll-off dumpsters in all service areas. The 10 yard is ideal for small cleanouts, the 20 yard handles most renovations, and the 30 yard is built for large construction projects.",
    },
    {
      q: "What if my area is not listed?",
      a: "We are constantly expanding our coverage. If you do not see your city or county listed, call us at 954-710-2332. We likely serve your area or can make arrangements for delivery.",
    },
  ];

  const organizationSchema = getOrganizationSchema();
  const faqSchema = getFAQPageSchema(faqItems);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Service Areas", url: "/areas" },
  ]);

  return (
    <div className="text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="bg-stone-950 pb-16 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Service Areas", url: "/areas" }]} />

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              Service Areas
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Dumpster Rental Across{" "}
              <span className="text-orange-500">All of Florida</span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              We deliver 10, 20 &amp; 30 yard roll-off dumpsters to every major
              city, county, and community in Florida. Same-day delivery available.
              Click any area below to see services and pricing for your location.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* All Areas by Region */}
      <section className="bg-stone-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {regions.map((region) => {
            const neighborhoods = neighborhoodsByRegion[region] || [];
            if (neighborhoods.length === 0) return null;
            const regionSlug = region.toLowerCase().replace(/\s+/g, "-");
            return (
              <div key={region} id={regionSlug} className="mt-12 first:mt-0">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-bold">{region}</h2>
                  <span className="text-sm text-stone-500">
                    {neighborhoods.length} areas
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {neighborhoods.map((n) => (
                    <Link
                      key={n.slug}
                      href={`/areas/${n.slug}`}
                      className="rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-2.5 text-sm text-stone-300 transition-colors hover:border-orange-600 hover:text-white"
                    >
                      {n.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-stone-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Service Area FAQ</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {faqItems.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-800 bg-stone-900/50 p-6"
              >
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Yes, We Really Serve All of Florida",
            body: "Every county, every city — from Key West to Pensacola and everywhere in between. If you have a Florida address, we can get a dumpster to you.",
          },
          {
            title: "Rural Delivery Takes a Day Longer",
            body: "If you're out in Glades County or deep in the Panhandle, delivery might take an extra business day compared to metro areas. Just give us a heads-up on access conditions.",
          },
          {
            title: "Know Your County's Dump Hours",
            body: "Some Florida landfills close at 4 PM, others at 6 PM. This affects pickup scheduling. Mention your preferred pickup day when you book and we'll work around it.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
