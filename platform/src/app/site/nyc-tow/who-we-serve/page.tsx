// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CUSTOMER_TYPES } from "@/app/site/nyc-tow/_data/customer-types";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { JsonLd, breadcrumbSchema, itemListSchema } from "@/app/site/nyc-tow/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck Customers We Serve — Drivers, Fleets, Body Shops & Property Managers",
  description: `NYC towing and roadside service for ${CUSTOMER_TYPES.length} customer types — stranded drivers, fleets, insurance, body shops, property managers, EV owners, commercial trucking, and more.`,
  alternates: { canonical: "/who-we-serve" },
};

export default function WhoWeServePage() {
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Who We Serve", url: "/who-we-serve" },
          ]),
          itemListSchema(
            CUSTOMER_TYPES.map((ct) => ({
              name: ct.name,
              url: `/who-we-serve/${ct.slug}`,
              description: ct.description,
            })),
            "NYC Towing Customers We Serve",
          ),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{CUSTOMER_TYPES.length} Customer Types — All 5 NYC Boroughs</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">NYC Tow Truck Customers</span> We Serve — Drivers, Fleets, Body Shops &amp; More
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            From stranded commuters to commercial fleet managers, body shops to property managers, EV owners to insurance adjusters — we dispatch the right truck for every type of customer.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{CUSTOMER_TYPES.length} Customer Types We Serve</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Click your category to see how our service adapts to your specific needs. Every type gets the same <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">flat-rate pricing</Link>, the same <Link href="/services" className="text-teal-700 font-semibold hover:underline">services</Link>, and 24/7 dispatch across all boroughs.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMER_TYPES.map((ct) => (
              <Link key={ct.slug} href={`/who-we-serve/${ct.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{ct.name}</h3>
                <p className="mt-3 text-sm text-slate-600 flex-1">{ct.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ct.services.slice(0, 3).map((sSlug) => (
                    <span key={sSlug} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{sSlug.replace(/-/g, " ")}</span>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Whatever Your Situation, We Dispatch The Right Truck</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">24/7 dispatch. Flat-rate pricing. 20–40 min typical arrival.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
