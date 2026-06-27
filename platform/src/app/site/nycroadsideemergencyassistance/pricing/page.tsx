// @ts-nocheck
import type { Metadata } from "next";
import { getPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/photos";
import Image from "next/image";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { PHONE, PHONE_HREF, PRICING } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { JsonLd, breadcrumbSchema, SITE_URL, BRAND_NAME } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck Prices — $149/Hour, No Hidden Costs. $25 Off Online.",
  description: "One rate for every NYC towing and roadside service: $149/hour, 1-hour minimum. Book online and your first hour is $124. No NYC surcharge, no after-hours markup, no storage fees on same-day drops.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const offerTiers = [PRICING.solo, PRICING.standard, PRICING.emergency];
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Pricing", url: "/pricing" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "OfferCatalog",
            name: "NYC Towing & Roadside Pricing",
            url: `${SITE_URL}/pricing`,
            provider: {
              "@type": "TowingService",
              "@id": `${SITE_URL}/#organization`,
              name: BRAND_NAME,
            },
            itemListElement: offerTiers.map((tier, i) => ({
              "@type": "Offer",
              position: i + 1,
              name: tier.label,
              price: tier.price.replace(/[^0-9.]/g, ""),
              priceCurrency: "USD",
              priceSpecification: {
                "@type": "UnitPriceSpecification",
                price: tier.price.replace(/[^0-9.]/g, ""),
                priceCurrency: "USD",
                unitText: tier.unit,
              },
              availability: "https://schema.org/InStock",
              url: `${SITE_URL}/pricing`,
              description: tier.features.join(". "),
            })),
          },
        ]}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">One Rate. No Hidden Costs. $25 Off When You Book Online.</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">$149 / Hour</span> — Every Service, No Surprises
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            One rate for towing, roadside, and recovery: $149 per hour, 1-hour minimum, billed in half-hour increments after that. Book online and save $25 — your first hour is $124. No NYC surcharge, no after-hours markup, no storage fees on same-day drops.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* THE RATES */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">One Rate. Every Service. Book Online To Save $25.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Towing, roadside, recovery — all $149 / hour with a 1-hour minimum. Book online and the first hour drops to $124. See every <Link href="/services" className="text-teal-700 font-semibold hover:underline">service</Link> this rate covers.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {Object.entries(PRICING).map(([key, tier]) => (
              <div key={key} className={`rounded-xl border bg-white p-6 text-center transition-all h-full ${"popular" in tier && tier.popular ? "border-accent shadow-lg relative" : "border-slate-200 hover:border-teal-400 hover:shadow-md"}`}>
                {"popular" in tier && tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-white">MOST COMMON</div>
                )}
                <h3 className="text-lg font-bold text-slate-900 font-heading">{tier.label}</h3>
                <p className="mt-2 text-5xl font-bold text-teal-700 font-heading">{tier.price}</p>
                <p className="mt-1 text-sm text-slate-500">{tier.unit}</p>
                <ul className="mt-6 space-y-2 text-sm text-left">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-teal-600 mt-0.5">✓</span>
                      <span className="text-slate-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/book-towing-service-today" className={`mt-6 inline-block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors font-cta ${"popular" in tier && tier.popular ? "bg-accent text-white hover:bg-accent-dark" : "bg-teal-700 text-white hover:bg-teal-800"}`}>
                  Request Service
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>The rate:</strong> $149 per hour, 1-hour minimum, billed in half-hour increments after that. Same number for towing, flatbed, AWD/EV transport, roadside (jump, tire, lockout, gas), winch-out, recovery, and mobile mechanic work.</p>
            <p><strong>The discount:</strong> Book online and save $25 — your first hour is $124 instead of $149. <Link href="/book-towing-service-today" className="text-teal-700 font-semibold hover:underline">It&apos;s the fastest way to dispatch a truck</Link>: form takes 60 seconds, lands directly on the dispatcher&apos;s screen, no hold time. Phone booking is the same rate without the $25 off.</p>
            <p><strong>What this means in practice:</strong> a 20-minute lockout in Tribeca, a 35-minute jump-start in Park Slope, a tire change on the BQE — all finish inside the 1-hour minimum and bill at $124 (online) or $149 (phone). A 90-minute flatbed run from Astoria to a dealer in NJ bills 1.5 hours: $124 + $124.50 = $348.50 online ($149 + $124.50 = $373.50 on the phone).</p>
            <p><strong>Heavy-duty and multi-hour recoveries</strong> (Class 6–8 trucks, box trucks, sprinters, ditch and rollover work) use the same $149 / hour rate, but dispatch quotes estimated total hours up front before we move so you know the total before we start.</p>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative mx-auto mb-12 aspect-[16/6] max-w-4xl overflow-hidden rounded-2xl shadow-lg">
            {(() => { const _photo = getPhoto("_pricing"); return (<Image src={_photo.url} alt={_photo.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" priority={false} />); })()}
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What&apos;s Included In Every Rate</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: "Correct truck & crew", body: "We don&apos;t show up in a wheel-lift for a job that needs flatbed. The right equipment for your vehicle is assumed." },
              { title: "Timestamped documentation", body: "Photos on scene and at drop for every tow. Protects both sides — for insurance, disputes, and your peace of mind." },
              { title: "Itemized receipt, emailed", body: "Hookup fee, mileage, any specialty equipment, taxes — all itemized. Receipt in your inbox within minutes of completion." },
              { title: "Direct insurance billing", body: "For accident and collision tows, we bill your carrier directly in most cases. You don&apos;t front the cost." },
              { title: "NYC DCWP licensed", body: "Fully licensed tow operator. Commercial auto, garage liability, and on-hook insurance on every truck and every load." },
              { title: "W-2 employee drivers", body: "Not gig workers. Trained, background-checked, accountable. Consistent execution every call." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: item.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT'S NOT CHARGED */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What You Will Never See On The Bill</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            If you see any of these on an NYC tow invoice, it&apos;s a scam operator. Dispute it. File a 311 complaint with DCWP.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: "NYC surcharge", body: "Doesn&apos;t exist in legitimate pricing. Pure padding." },
              { title: "After-hours markup", body: "Overnight, weekend, and holiday rates match daytime rates. No time-of-day premiums." },
              { title: "Storage fees on same-day drops", body: "Storage applies to overnight yard stays. Same-day drops from scene to destination — zero storage fee." },
              { title: "Cash-only demand", body: "We accept every major card, Apple Pay, Google Pay, and cash. Cash-only demands are a red flag." },
              { title: "Unlisted drop location", body: "Your vehicle goes where you direct — your home, your shop, your dealer. Never our yard without your explicit okay." },
              { title: "Padded mileage", body: "Mileage is calculated from pickup to drop on the efficient route. Not the scenic route. Not with inflated padding." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-red-200 bg-red-50/30 p-6">
                <h3 className="text-lg font-bold text-red-900 font-heading">✗ {item.title}</h3>
                <p className="mt-2 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: item.body }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXAMPLES */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Real NYC Pricing Examples</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { scenario: "Dead battery in Park Slope, jump-start works", total: "$124 online / $149 phone", detail: "1-hour minimum at our $149 / hour rate ($25 off online). Driver arrives, tests battery and alternator, jumps, confirms charging. 20 minutes on scene — well inside the hour." },
              { scenario: "Flat tire on the BQE, spare mounted", total: "$124 online / $149 phone", detail: "1-hour minimum. Chocked vehicle, proper jack, impact gun on lug nuts. Spare installed. 20 minutes on scene — inside the hour." },
              { scenario: "Light-duty tow from Astoria to a shop in Bay Ridge (~45 min total)", total: "$124 online / $149 phone", detail: "Pickup, wheel-lift, drive across the city, drop. Fits inside the 1-hour minimum. Standard wheel-lift truck." },
              { scenario: "Flatbed AWD tow from Midtown to a dealer in NJ (1.5 hrs estimated)", total: "$348.50 online / $373.50 phone", detail: "First hour: $124 (online) or $149 (phone). Additional half-hour: $124.50 (half of $149). Outside NYC but inside regular service radius." },
              { scenario: "Keys locked in a 2021 BMW X5 in Tribeca", total: "$124 online / $149 phone", detail: "Air wedge and long-reach entry. No slim jim (destroys airbag modules). Typical 15 minutes on scene — inside the 1-hour minimum." },
              { scenario: "Collision tow from the Cross Bronx to a body shop", total: "Billed to insurance", detail: "Estimated hours at $149 / hour plus scene cleanup time, billed directly to your carrier in most cases. You provide carrier name and claim number." },
            ].map((item) => (
              <div key={item.scenario} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold text-slate-900 font-heading">{item.scenario}</h3>
                  <span className="shrink-0 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">{item.total}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Fleet & Commercial Accounts</h2>
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8">
            <p className="text-base text-slate-700">Running a fleet in NYC — DSPs, rideshare, delivery, rental, contractor fleets, body shops? Set up a fleet account. Priority dispatch over retail calls, consistent drivers who learn your yards, one account number for all dispatch, and consolidated net-30 billing with a single monthly statement. No subscription, no monthly minimum. The rate structure matches retail but response time and administrative overhead drop significantly.</p>
            <p className="mt-4 text-base text-slate-700">Volume pricing kicks in at roughly 15 tows per month. COI on file for every property you operate at. Custom documentation requirements supported. <Link href="/commercial" className="text-teal-700 font-semibold hover:underline">Learn more about fleet accounts →</Link></p>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Book Online And Save $25 — Fastest Way To Dispatch</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            <Link href="/book-towing-service-today" className="text-white underline">Online form</Link> takes 60 seconds and your first hour is $124. Or call <a href={PHONE_HREF} className="text-white underline">{PHONE}</a> at the standard $149 / hour rate. 24/7, every borough, every hour.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}