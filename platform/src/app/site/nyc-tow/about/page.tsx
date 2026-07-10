import type { Metadata } from "next";
import Link from "next/link";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/nyc-tow/_data/content";
import { SERVICES } from "@/app/site/nyc-tow/_data/services";
import { CtaButtons } from "@/app/site/nyc-tow/_components/CtaButtons";
import { JsonLd, breadcrumbSchema, SITE_URL, BRAND_NAME } from "@/app/site/nyc-tow/_lib/schema";

export const metadata: Metadata = {
  title: "About The NYC Towing Service — Licensed Local Operator, All 5 Boroughs",
  description: "Licensed NYC DCWP tow operator running 24/7 across all five boroughs. W-2 drivers, flat-rate pricing, full insurance including on-hook. The local operator national networks subcontract to.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "About", url: "/about" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            url: `${SITE_URL}/about`,
            name: `About ${BRAND_NAME}`,
            description:
              "Licensed NYC DCWP tow operator running 24/7 across all five boroughs. W-2 drivers, flat-rate pricing, full insurance including on-hook.",
            mainEntity: {
              "@type": "TowingService",
              "@id": `${SITE_URL}/#organization`,
              name: BRAND_NAME,
            },
          },
        ]}
      />
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">The Local Operator National Networks Call</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            About <span className="gradient-text">The NYC Towing Service</span> — Licensed 24/7 Tow Operator
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            A licensed NYC DCWP tow operator running 24/7 across all five boroughs. We&apos;re what national roadside networks subcontract to when they do the job right — and what NYC drivers call directly to skip the dispatch markup.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* OUR STORY */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">How We Operate</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Built for NYC, Not a National Template</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>NYC has its own rules. Parking enforcement rhythm, bridge and tunnel access patterns, narrow one-way streets, strict alternate-side-parking, NYC DCWP licensing requirements, and a regulatory environment designed to protect drivers from predatory operators. A national roadside network applying a suburban playbook to NYC ends up arriving 90 minutes late with the wrong truck for the job.</p>
            <p>We built this operation from the ground up for NYC. Five dispatch hubs — one in each borough. Trucks staged locally so arrival times stay short. Drivers who live in the neighborhoods they serve. Dispatchers who route traffic in real time, not from a call center in another state. And the licensing, insurance, and regulatory compliance that a real NYC operator has to carry.</p>
            <p>We operate across all {STATE_COUNT} NYC boroughs covering {CITY_COUNT}+ neighborhoods — from Tribeca to Throgs Neck, from Astoria to Tottenville. Every crew member is a W-2 employee (not a gig worker), background-checked, professionally trained, and covered by comprehensive insurance. <Link href="/services" className="text-teal-700 font-semibold hover:underline">{SERVICES.length} services</Link> run 24/7, every day of the year, at flat rates.</p>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What We Stand For</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p><strong>Transparency:</strong> Flat-rate pricing quoted on the phone before we dispatch. Timestamped photos on every job. Receipts emailed within minutes. No NYC surcharge, no storage fees on same-day drops, no after-hours markup. Ever.</p>
            <p><strong>Competence:</strong> Our drivers train on every common vehicle platform — conventional cars, AWD and 4WD, EVs with manufacturer-spec procedures, motorcycles with proper flatbed technique, low-clearance luxury cars, and heavy commercial vehicles. The right truck shows up the first time.</p>
            <p><strong>Speed:</strong> Typical arrival 20–40 minutes across all five boroughs. Trucks staged in every borough. NYC dispatchers routing in real time. Honest ETAs on the phone — if traffic is bad, you hear that.</p>
            <p><strong>Accountability:</strong> NYC DCWP licensed. Commercial auto, garage liability, and on-hook insurance on every truck and every load. W-2 employees, not gig workers. If something goes wrong, we own it.</p>
            <p><strong>Availability:</strong> 24 hours a day, 365 days a year. Overnight rates match daytime. Holiday rates match weekday. Snowstorm operations run as long as roads are safe.</p>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why NYC Drivers Choose Us</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">20–40</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Minute Arrival</h3>
              <p className="mt-2 text-sm text-slate-600">Typical response time across all five boroughs. Trucks staged locally, dispatchers routing in real time.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">24/7</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Dispatch</h3>
              <p className="mt-2 text-sm text-slate-600">Overnight, weekends, and holidays at the same flat rate. No after-hours markup, no surge pricing.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">$85</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Flat Roadside Rate</h3>
              <p className="mt-2 text-sm text-slate-600">Jump, tire change, lockout, gas delivery — one flat rate per call. Crediting toward a tow if the job escalates.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">{SERVICES.length}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Services</h3>
              <p className="mt-2 text-sm text-slate-600">Light-duty, heavy-duty, flatbed, motorcycle, roadside, accident recovery, commercial fleet — all dispatched from one number.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">5</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Borough Hubs</h3>
              <p className="mt-2 text-sm text-slate-600">Dispatch hubs in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. A truck close to you, always.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md text-center">
              <p className="text-3xl font-bold text-teal-700 font-heading">Licensed</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">NYC DCWP</h3>
              <p className="mt-2 text-sm text-slate-600">Fully licensed, bonded, and insured. Commercial auto, garage liability, on-hook insurance. COI in 24 hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The People Who Show Up</h2>
          <div className="relative mx-auto mt-8 aspect-[16/7] max-w-4xl overflow-hidden rounded-2xl shadow-lg">
            </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-base leading-relaxed text-slate-700">
            <p>Our drivers are W-2 employees — not gig workers, not 1099 contractors, not &quot;independent operators.&quot; That matters because it means consistent training, accountability, and service standards. When we say a driver is trained on EV procedures or AWD handling, it&apos;s because they completed our training program, not because a dispatch system randomly picked someone from a gig pool.</p>
            <p>Every driver is background-checked, trained on every common vehicle platform, and covered by our insurance. They carry identification and arrive in branded vehicles. They understand NYC-specific hazards — streetcar tracks, bike-lane concrete curbing, low-clearance parking garages, and narrow one-way streets that don&apos;t fit a full flatbed.</p>
            <p>We&apos;re hiring tow drivers, dispatchers, and heavy-duty operators across all five boroughs. Competitive pay, W-2 employment, full benefits for full-time, and a clear path from entry-level to heavy-duty and dispatch roles. CDL holders welcome. Visit our <Link href="/careers" className="text-teal-700 font-semibold hover:underline">careers page</Link> for open positions.</p>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Need a Tow or Roadside in NYC?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            24/7 dispatch. Flat-rate pricing. 20–40 minute typical arrival. Call <a href={PHONE_HREF} className="text-white underline">{PHONE}</a>.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
