// @ts-nocheck
import type { Metadata } from "next";
import { getPhoto } from "@/app/site/nycroadsideemergencyassistance/_data/photos";
import Image from "next/image";
import Link from "next/link";
import { EMAIL } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { JsonLd, breadcrumbSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export const metadata: Metadata = {
  title: "NYC Tow Truck Franchise Opportunities — Owner-Operator Partnerships",
  description: "Experienced tow operators, owner-operators, and established shops: join NYC Roadside Emergency Assistance fleet. Dispatch, insurance, branding, and lead flow — you keep control of your trucks.",
  alternates: { canonical: "/franchise" },
};

export default function FranchisePage() {
  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Franchise", url: "/franchise" },
        ])}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Partnership Opportunities</p>
          <div className="mb-6 inline-flex flex-col items-center gap-1 rounded-2xl bg-yellow-400/15 px-6 py-4 ring-2 ring-yellow-300/50">
            <span className="text-3xl font-extrabold text-yellow-300 sm:text-4xl">$149 / hour</span>
            <span className="text-base font-bold text-yellow-200">No catches. Only hourly tow in NYC.</span>
            <span className="rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-slate-900">Book online · Save $25</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading"><span className="gradient-text">NYC Tow Truck Franchise Opportunities</span> — Owner-Operator Partnerships</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">For experienced tow operators, owner-operators, and established NYC shops. Plug into our dispatch, brand, and lead flow while keeping operational control of your trucks.</p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Partner With Us</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Our operation covers <Link href="/locations" className="text-teal-700 font-semibold hover:underline">all five NYC boroughs</Link> with a growing commercial book of business. Partner operators plug in to <Link href="/services" className="text-teal-700 font-semibold hover:underline">our full service stack</Link> without having to build dispatch, branding, or fleet sales infrastructure from scratch.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>NYC has a long tail of independent tow operators — solo drivers with one or two trucks, small family shops, and owner-operators who run good equipment but don&apos;t have the scale or administrative capacity to compete on commercial accounts. Our partnership model lets those operators plug into a larger operation without losing their independence.</p>
            <p>What you get: lead flow from our dispatch, commercial and fleet account access (DSPs, rideshare, body shops, property managers), brand recognition and marketing, COIs and insurance administration on accounts, and AP/billing infrastructure. What you keep: your trucks, your drivers, your schedule, and operational control of your business.</p>
            <p>Revenue split is negotiated based on what you bring — trucks, drivers, territory coverage, and account access. For operators who want to scale into a full franchise model with exclusive territory, we also support that path for the right partners.</p>
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative mx-auto mb-12 aspect-[16/6] max-w-4xl overflow-hidden rounded-2xl shadow-lg">
            {(() => { const _photo = getPhoto("_franchise"); return (<Image src={_photo.url} alt={_photo.alt} fill sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" priority={false} />); })()}
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What You Get</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Dispatch Infrastructure", desc: "Our NYC-based dispatchers handle call routing, rate quoting, and customer communication. You get clean dispatch tickets to your drivers." },
              { title: "Lead Flow", desc: "Inbound tow and roadside calls routed to your territory. Priority to partners with consistent capacity and clean service quality." },
              { title: "Commercial Accounts", desc: "Access to our fleet and commercial book — DSPs, rideshare, body shops, property managers. Net-30 billing handled centrally." },
              { title: "Brand & Marketing", desc: "NYC-focused brand recognition, web presence, and marketing spend. You don&apos;t have to compete on SEO and ads from scratch." },
              { title: "Insurance Administration", desc: "COI management on commercial accounts, property-manager paperwork, and compliance documentation." },
              { title: "Billing & AP", desc: "Centralized invoicing, payment processing, and net-30 collection on commercial work. You get paid on a regular cycle." },
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
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who We Partner With</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Our best partners share a few traits: NYC DCWP licensed, insured to current standards (commercial auto, garage liability, on-hook), running clean equipment, and committed to flat-rate pricing and honest service. Prior tow experience is required — this isn&apos;t an entry-level program.</p>
            <p>If you run a solo operation, a small family shop, or an owner-operator business with 1–5 trucks, we want to talk. Same if you run heavy-duty equipment or specialty (EV, luxury transport, enclosed long-haul). Bring what you have. We&apos;ll figure out the right fit.</p>
            <p>For operators interested in full franchise / exclusive territory rights, we support that path for the right partners — longer-term commitment, revenue model, and territory protection are negotiated individually.</p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Interested? Let&apos;s Talk.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-white/70">Email us to start a partnership conversation. We&apos;ll review your operation, discuss revenue terms, and walk through how the dispatch and lead flow work in practice.</p>
          <div className="mt-8">
            <a href={`mailto:${EMAIL}?subject=Fleet Partnership Inquiry`}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Email {EMAIL}</span></a>
          </div>
        </div>
      </section>
    </>
  );
}