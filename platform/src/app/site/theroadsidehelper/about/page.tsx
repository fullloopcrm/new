// @ts-nocheck
import Link from "next/link";
import Image from "next/image";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { SERVICES } from "@/app/site/theroadsidehelper/_data/services";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { SECTION_PHOTOS } from "@/app/site/theroadsidehelper/_data/photos";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "About The Roadside Helper — Flat $149/hr 24/7 Roadside | (888) 944-3001",
  description:
    "About The Roadside Helper: nationwide pay-as-you-go roadside assistance at flat $149/hr, 1-hour minimum, no contracts. Call (888) 944-3001. 900+ cities, all 50 states, 12 services.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0">
          <Image
            src={SECTION_PHOTOS.technician.url}
            alt={SECTION_PHOTOS.technician.alt}
            fill
            sizes="100vw"
            className="object-cover opacity-30"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-emerald-900/80" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">The Pay-As-You-Go Alternative</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            About <span className="text-amber-300">The Roadside Helper</span> — Flat $149/hr Pay-As-You-Go Roadside
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            We built The Roadside Helper as the honest alternative to auto-club memberships. Pay only when you need us. Flat $149/hr. 24/7 dispatch. No contracts.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* OUR STORY */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">How We Got Here</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Why a Flat-Rate Roadside Service Exists</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Auto-club roadside memberships have been the default for decades. The pitch hasn't changed: pay a yearly fee, get unlimited (or near-unlimited) roadside calls. The math used to make sense when service was scarce and the average per-call price was high. It doesn't make sense anymore.</p>
            <p>Industry data suggests the average auto-club member uses their roadside benefit 0.4 times per year. More than half of all members pay for a year of service they don't touch. Many members go three or four years without ever calling. Meanwhile, the membership renews automatically and the dues accumulate.</p>
            <p>Even when members do call, they hit limits: 3 or 4 free calls before extras kick in, capped tow distances, and the well-documented 2–3 hour average wait time during peak demand. Auto-club roadside is contracted out to local tow operators paid a flat per-call rate by the club. The economics push contractors to prioritize their own retail calls over auto-club calls, and the result is the long waits.</p>
            <p>We built The Roadside Helper as the inverse: pay $0 unless you need us. Flat $149 per hour with a 1-hour minimum. 24/7 dispatch with a real human answering the first ring. Average response time in cities we serve is under 60 minutes. No contracts, no auto-renew, no call limits, no surcharges for overnights, weekends, or holidays.</p>
            <p>Today we operate in {CITY_COUNT} cities across all {STATE_COUNT} states. The model works because it removes the artificial cost layers — the annual dues, the per-call gates, the membership tiers — and charges only for the service actually delivered.</p>
          </div>
        </div>
      </section>

      {/* MISSION & VALUES */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">What Drives Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Mission &amp; Values</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>Mission:</strong> Run an honest, predictably-priced roadside service that drivers can call once or many times without paying for an annual membership they may never use.</p>
            <p><strong>Transparency:</strong> The dispatcher quotes the rate before the technician rolls. The technician confirms on arrival. The invoice itemizes everything. Nothing is added that wasn't agreed to first. Our <Link href="/pricing" className="text-emerald-700 font-semibold hover:underline">pricing page</Link> details the exact rate structure.</p>
            <p><strong>Speed:</strong> Average response time under 60 minutes in cities we serve. A real human dispatcher answers — no phone trees. The technician calls you back with an ETA before they start driving toward you.</p>
            <p><strong>Trained technicians:</strong> Every technician is background-checked, licensed, bonded, and insured. They use commercial-grade equipment — jump packs that protect modern vehicle electronics, calibrated torque wrenches, professional lockout tools. No slim jims.</p>
            <p><strong>Respect:</strong> Your vehicle is your property. We use floor protection, doorframe guards, and proper procedures. If anything is damaged during service, our liability insurance covers the repair at no cost to you.</p>
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Why Drivers Choose Us</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">How We're Different</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-heading">$149/hr</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Flat Rate</h3>
              <p className="mt-2 text-sm text-slate-600">Same overnight, weekends, holidays. No surcharges. 1-hour minimum. Most jobs finish inside the minimum.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-heading">$0/yr</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">No Membership</h3>
              <p className="mt-2 text-sm text-slate-600">Pay only when you need us. No annual dues, no contracts, no auto-renewals. If you never need help, you owe us nothing.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-heading">Under 60 min</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Average Response</h3>
              <p className="mt-2 text-sm text-slate-600">In the cities we serve. The dispatcher gives you a real ETA based on the nearest technician's current location.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-heading">{SERVICES.length}</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Specialized Services</h3>
              <p className="mt-2 text-sm text-slate-600">Emergency, lockout, fuel, recovery, and specialty vehicle service. <Link href="/services" className="text-emerald-700 font-semibold hover:underline">See all services</Link>.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-heading">24/7</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Always On</h3>
              <p className="mt-2 text-sm text-slate-600">Day, night, weekend, holiday — same flat rate. A real dispatcher answers every call.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-emerald-700 font-heading">5.0</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900 font-heading">Star Rating</h3>
              <p className="mt-2 text-sm text-slate-600">200+ verified reviews. Drivers consistently mention the fast response, the flat rate, and the no-pressure technicians.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">The People Behind Every Call</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">Our Technicians</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>Every technician on our network is background-checked before joining, certified in safe roadside procedures, and equipped with commercial-grade tools. We do not hire untrained day labor and we do not subcontract dispatch to whoever is nearest — every call goes to a qualified tech for that specific service type.</p>
            <p>Specialty work goes to specialty techs. Motorcycle calls go to motorcycle-trained technicians. Diesel calls go to diesel-trained technicians. RV calls go to RV-trained technicians. Standard auto techs handle standard passenger vehicle calls. You're never sent a generalist for a specialty job.</p>
            <p>We hire and train locally in every market we serve. Your technician lives in your city, knows the local roads, the safe shoulders, the nearby shops if a tow is needed. That local knowledge translates to faster on-scene arrival and better situational handling.</p>
          </div>
        </div>
      </section>

      {/* NATIONWIDE */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">Coast-to-Coast Coverage</p>
          <h2 className="mt-3 text-center text-3xl font-bold text-slate-900 font-heading">{CITY_COUNT} Cities, All {STATE_COUNT} States</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p>We operate across all {STATE_COUNT} U.S. states, serving {CITY_COUNT} cities. Whether you're in a major metro, a suburb, or a smaller market — the same flat $149/hr applies and the same dispatch model works.</p>
            <p>Need help in your area? <Link href="/locations" className="text-emerald-700 font-semibold hover:underline">Browse all locations</Link> to find your city, or call <a href={PHONE_HREF} className="text-emerald-700 font-semibold hover:underline">{PHONE}</a> and a dispatcher will route the nearest technician to you.</p>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Need Help Right Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Flat $149/hr. 24/7. No membership. Call <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a>.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}