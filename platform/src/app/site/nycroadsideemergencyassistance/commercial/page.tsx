// @ts-nocheck
import type { Metadata } from "next";
import { getPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/photos";
import Image from "next/image";
import Link from "next/link";
import { CtaButtons } from "@/app/site/nycroadsideemergencyassistance/_components/CtaButtons";
import { SERVICES } from "@/app/site/nycroadsideemergencyassistance/_data/services";
import { JsonLd, breadcrumbSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Fleet Towing — $149/hr Net-30, No Catches. 24/7 Heavy-Duty Dispatch.",
  description: "Dedicated commercial towing accounts for NYC fleets at one transparent rate: $149/hour, net-30 billing, no hidden fees. DSPs, rideshare, delivery, rental, contractor fleets, body shops, and property managers. Priority dispatch over retail calls, consistent drivers.",
  alternates: { canonical: "/commercial" },
};

const commercialServices = SERVICES.filter((s) => s.category === "commercial" || s.category === "heavy-duty");

export default function CommercialPage() {
  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Fleet & Commercial", url: "/commercial" },
        ])}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Fleet & Commercial Towing Accounts</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading"><span className="gradient-text">NYC Commercial Fleet Towing</span> — 24/7 Heavy-Duty Dispatch</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">DSPs, rideshare operators, delivery fleets, rental companies, contractor fleets, body shops, and property managers. Priority dispatch, consistent drivers, net-30 billing, and heavy-duty capability across all five boroughs.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Services for Commercial Clients</h2>
          <p className="mt-4 text-base text-slate-600 text-center mx-auto max-w-2xl">From <Link href="/services/fleet-towing" className="text-teal-700 underline hover:text-teal-900">fleet towing</Link> to <Link href="/services/heavy-duty-towing" className="text-teal-700 underline hover:text-teal-900">heavy-duty recovery</Link> and <Link href="/services/accident-recovery" className="text-teal-700 underline hover:text-teal-900">accident scene work</Link>. Browse <Link href="/services" className="text-teal-700 underline hover:text-teal-900">all {SERVICES.length} services</Link>.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {commercialServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600">{s.description}</p>
                <p className="mt-3 text-sm font-semibold text-teal-600 font-cta">Learn More →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative mx-auto mb-12 aspect-[16/6] max-w-4xl overflow-hidden rounded-2xl shadow-lg">
            {(() => { const _photo = getPhoto("_commercial"); return (<Image src={_photo.url} alt={_photo.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" priority={false} />); })()}
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Fleets Run With Us</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>A down fleet vehicle is a real revenue drain — lost route revenue, driver overtime to cover, and the administrative cost of coordinating a retail tow. Retail dispatch puts your truck behind a queue of one-off calls. National roadside networks add dispatch markup and route through subcontractors who may or may not actually know NYC. Fleet accounts with us eliminate both problems.</p>
            <p>Our fleet accounts get priority over walk-up retail calls. A dedicated dispatcher contact. Consistent drivers who learn your yards, vehicle types, and intake procedures. One account number for all dispatch across all five boroughs. Consolidated net-30 billing with a single monthly statement. COI on file for every property you operate at.</p>
            <p>We work with Amazon DSPs, FedEx/UPS contractor fleets, rideshare operators (Uber, Lyft, Via), food-delivery fleets, rental companies, medical-transport, corporate fleets, and contractor trucking. For body shops and dealers, preferred-partner arrangements deliver predictable arrival windows and drivers trained on AWD, EV, and luxury handling. For property managers, private-property tow accounts with full NYC DCWP regulatory compliance on signage, documentation, and rate caps.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Priority Dispatch", desc: "Your down vehicle jumps the retail queue. Typical arrival drops by 20–40 minutes versus retail dispatch." },
              { title: "Consistent Drivers", desc: "Same crew rotation learns your yards, vehicle types, and building clearances. Saves real time on every call." },
              { title: "Net-30 Billing", desc: "One monthly invoice, consolidated across all tows. Direct to corporate AP. No individual receipts to reconcile." },
              { title: "COI on File", desc: "Certificate of insurance for every property, renewed automatically. No scramble when you need service at a new site." },
              { title: "Heavy-Duty Capable", desc: "Heavy wreckers rated for Class 6–8 vehicles. Cross Bronx, Deegan, and bridge-corridor recovery." },
              { title: "Compliant Documentation", desc: "Timestamped photos, tow reports formatted for DOT / insurance / compliance files. Every job documented." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who Runs Fleet Accounts With Us</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { title: "Amazon DSPs & Delivery Fleets", body: "20–40 van fleets running tight routes. Priority tow dispatch recovers lost route revenue. We coordinate with your dispatcher on repair-shop drops." },
              { title: "Rideshare & Food Delivery Operators", body: "Fleet operators running Uber, Lyft, DoorDash, Grubhub vehicles. Fast roadside and light-duty dispatch keeps vehicles online. TLC-friendly shop drops." },
              { title: "Rental Companies", body: "Short-term and long-term rental fleets. Pickup-and-return logistics, post-rental condition tows, and replacement-vehicle swaps." },
              { title: "Contractor Fleets", body: "Plumbing, HVAC, electrical, GC trucks. Recovery from job sites across the five boroughs. Insured tie-down for tools and equipment left in the bed." },
              { title: "Body Shops & Dealers", body: "Preferred-partner arrangements with predictable arrival windows. Drivers trained on AWD, EV, luxury, and low-clearance vehicles. Monthly consolidated billing." },
              { title: "Property Managers & HOAs", body: "Private-property tow accounts with full NYC DCWP compliance — signage review, photo documentation, capped rates, legal release hours." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Set Up a Fleet Account</h2>
          <p className="mt-4 text-base text-white/80 mx-auto max-w-2xl">One phone call, account number issued same day. Paperwork, COIs, and AP contacts handled within 24–48 hours. No subscription, no monthly minimum — you pay only for the service you use.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}