import type { Metadata } from "next";
import Link from "next/link";
import { CITY_COUNT, STATE_COUNT } from "@/app/site/we-pay-you-junk/_data/content";
import { CUSTOMER_TYPES } from "@/app/site/we-pay-you-junk/_data/customer-types";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";

export const metadata: Metadata = {
  title: "Who We Serve — Junk Removal for Homeowners, Businesses, Property Managers & More",
  description: `We serve 13 customer types across ${CITY_COUNT}+ cities. Homeowners, renters, property managers, realtors, businesses, estate managers, contractors, and more. Starting at $200/hr.`,
  alternates: { canonical: "/who-we-serve" },
};

export default function WhoWeServePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{CUSTOMER_TYPES.length} Customer Types Across {CITY_COUNT}+ Cities</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Who We Serve — <span className="gradient-text">Junk Removal for Everyone</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Whether you&apos;re a homeowner clearing a garage, a property manager turning units, or a business closing an office — our model saves you money and pays you for what&apos;s worth something.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">Junk Removal Services Tailored to Your Situation</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{CUSTOMER_TYPES.length} Customer Types We Serve</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Click your category to see how our <Link href="/pricing" className="text-teal-700 font-semibold hover:underline">pricing</Link> and 50% Resale Credit (when applicable) work for your specific situation. Every type gets the same rate, the same credits, and the same <Link href="/services" className="text-teal-700 font-semibold hover:underline">34 services</Link> across <Link href="/locations" className="text-teal-700 font-semibold hover:underline">{CITY_COUNT}+ cities</Link>.
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
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Same Rate for Every Customer Type</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-white sm:text-4xl font-heading">Your Stuff Has Value — No Matter Who You Are</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Starting at $200/hr. Dump fees included (an industry first). 50% Resale Credit (when applicable). Same-day available.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
