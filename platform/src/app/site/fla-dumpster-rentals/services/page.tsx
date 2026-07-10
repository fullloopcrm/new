import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategory } from "@/app/site/fla-dumpster-rentals/_lib/data";
import Breadcrumbs from "@/app/site/fla-dumpster-rentals/_components/Breadcrumbs";
import CTAGroup from "@/app/site/fla-dumpster-rentals/_components/CTAGroup";
import ProTip from "@/app/site/fla-dumpster-rentals/_components/ProTip";
import { SITE_URL } from "@/app/site/fla-dumpster-rentals/_lib/seo";

export const metadata: Metadata = {
  title: "Dumpster Rental Services Florida | Florida Dumpster Rentals",
  description:
    "Browse all dumpster rental services by category. Construction, residential, commercial, roofing, junk removal & more. 10, 20 & 30 yard roll-off containers across Florida.",
  openGraph: {
    title: "Dumpster Rental Services Florida | Florida Dumpster Rentals",
    description:
      "All dumpster rental services across Florida by category. Fast delivery on 10, 20 & 30 yard roll-off containers.",
    url: `${SITE_URL}/services`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/services` },
};

export default function ServicesPage() {
  const servicesByCategory = getServicesByCategory();
  const categories = Object.keys(servicesByCategory).sort();
  const totalServices = Object.values(servicesByCategory).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-stone-950 pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Services", url: "/services" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              {totalServices} Services &middot; {categories.length} Categories
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Dumpster Rental Services
              <br />
              <span className="text-orange-500">for Every Project</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-stone-300">
              From construction debris and roofing tear-offs to junk removal and
              estate cleanouts, we have the right dumpster for your project. 10,
              20 &amp; 30 yard roll-off containers delivered anywhere in
              Florida.
            </p>
            <CTAGroup variant="hero" />
          </div>
        </div>
      </section>

      {/* Services by Category */}
      {categories.map((category, idx) => {
        const services = servicesByCategory[category];
        return (
          <section
            key={category}
            className={`py-20 ${idx % 2 === 0 ? "bg-stone-900" : "bg-stone-950"}`}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  {category}
                </h2>
                <span className="text-sm text-stone-500">
                  {services.length} service{services.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/${service.slug}`}
                    className="group rounded-xl border border-stone-800 bg-stone-950 p-6 transition-colors hover:border-orange-600/50"
                  >
                    <h3 className="text-lg font-semibold text-white group-hover:text-orange-400">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-sm text-stone-400 line-clamp-3">
                      {service.description}
                    </p>
                    {service.recommendedSize && (
                      <p className="mt-3 text-xs text-orange-500">
                        Recommended: {service.recommendedSize}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-500 group-hover:text-orange-400">
                      View details &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Mid CTA */}
      <CTAGroup variant="mid" />

      {/* Pricing Callout */}
      <section className="bg-stone-950 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-stone-800 bg-stone-950 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-stone-400 leading-relaxed">
              10 yard from $275. 20 yard from $350. 30 yard from $450. Every
              rental includes delivery, pickup, 7-day rental, and disposal.
            </p>
            <Link
              href="/pricing"
              className="mt-6 inline-flex items-center rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700"
            >
              View Full Pricing &rarr;
            </Link>
          </div>
        </div>
      </section>

      <ProTip
        tips={[
          {
            title: "Not Sure Which Service? Just Describe Your Project",
            body: "You don't need to know the exact service category — just tell us what you're working on. \"I'm gutting my kitchen\" or \"we're clearing a lot for new construction\" is all we need. We'll match you with the right dumpster size and service type.",
          },
          {
            title: "Combine Projects and Save",
            body: "Doing a roof tear-off AND a bathroom remodel? Cleaning out the garage AND the attic? Sometimes one dumpster can handle multiple projects if you time it right. Tell us everything you've got planned and we'll help you figure out the most cost-effective approach.",
          },
          {
            title: "Recurring Service Gets Better Pricing",
            body: "Contractors and property managers who rent dumpsters regularly save 15-25% with volume pricing. If you need dumpsters more than once a month, ask us about contractor rates — dedicated scheduling, priority delivery, and net-30 billing included.",
          },
        ]}
      />

      {/* Final CTA */}
      <CTAGroup variant="final" />
    </div>
  );
}
