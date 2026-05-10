// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { CtaButtons } from "@/app/site/we-pay-you-junk/_components/CtaButtons";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/we-pay-you-junk/_data/content";
import { SERVICES } from "@/app/site/we-pay-you-junk/_data/services";

export const metadata: Metadata = {
  title: "Commercial Junk Removal — Offices, Warehouses, Retail & More",
  description: "Commercial junk removal with 50% Resale Credit (when applicable). Office cleanouts, warehouse clearing, retail spaces, property management. Hourly rates, dump fees included.",
  alternates: { canonical: "/commercial" },
};

const commercialServices = SERVICES.filter((s) => s.category === "commercial");

export default function CommercialPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Commercial &amp; Business Services</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">Commercial Junk Removal<br /><span className="gradient-text">That Pays You Back</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Office furniture, electronics, and equipment have real resale value. Other companies pocket it — we split it with you 50/50. Hourly rates, dump fees included.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta text-center">Office &amp; Warehouse Junk Removal Services Near Me</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Commercial Services</h2>
          <p className="mt-4 text-base text-slate-600 text-center mx-auto max-w-2xl">From <Link href="/services/office-cleanouts" className="text-teal-700 underline hover:text-teal-900">office cleanouts</Link> to <Link href="/services/warehouse-cleanouts" className="text-teal-700 underline hover:text-teal-900">warehouse clearing</Link> and <Link href="/services/retail-cleanouts" className="text-teal-700 underline hover:text-teal-900">retail space teardowns</Link>, we handle every type of commercial removal. Browse all of our <Link href="/services" className="text-teal-700 underline hover:text-teal-900">commercial and residential services</Link> or <Link href="/book-junk-removal-service-today" className="text-teal-700 underline hover:text-teal-900">book your pickup today</Link>.</p>
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
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta text-center">Affordable Commercial Junk Hauling With Resale Credit</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Businesses Choose Us</h2>
          <p className="mt-4 text-base text-slate-600 text-center mx-auto max-w-2xl">We serve <Link href="/services/hotel-cleanouts" className="text-teal-700 underline hover:text-teal-900">hotels</Link>, <Link href="/services/property-management-cleanouts" className="text-teal-700 underline hover:text-teal-900">property managers</Link>, and offices across every borough. Check our <Link href="/pricing" className="text-teal-700 underline hover:text-teal-900">transparent pricing</Link> or find a <Link href="/locations" className="text-teal-700 underline hover:text-teal-900">service area near you</Link> to see why commercial clients keep coming back.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>Commercial junk removal is where our credit model delivers the biggest savings. Office furniture and electronics have some of the strongest resale markets in the country. Herman Miller chairs, Steelcase desks, commercial monitors, server equipment, industrial kitchen gear — these items hold significant value that traditional junk companies pocket for themselves. With us, you get 50% of that value credited to your bill.</p>
            <p>We've cleared offices of every size — from 5-person startups to 500-seat corporate floors. We've emptied retail stores, warehouses, hotels, schools, and churches. On nearly every commercial job, the resale credits from furniture and equipment cover a significant portion of the bill. Large office cleanouts with high-quality furniture regularly result in payouts to the business — where our credits exceed the removal cost and we cut a check.</p>
            <p>Commercial accounts get priority scheduling, after-hours service, certificates of insurance on request, and detailed disposal documentation for compliance purposes. We work around your business schedule to minimize disruption. Weekend and evening service is available at no extra charge. Recurring accounts get consistent crew assignments so your team works with the same familiar faces every time.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "50% Resale Credit (when applicable)", desc: "Commercial furniture and electronics have the highest resale values. Big cleanouts frequently cover the entire bill." },
              { title: "Priority Scheduling", desc: "Commercial accounts get same-day and next-day priority. Your timeline is our timeline." },
              { title: "After-Hours Service", desc: "Evenings and weekends at no extra charge. Minimize disruption to your operations." },
              { title: "Insurance Certificates", desc: "COIs provided on request. Full liability coverage for your peace of mind." },
              { title: "Recurring Service", desc: "Regular pickup schedules for ongoing needs. No long-term contracts required." },
              { title: "Transparent Invoicing", desc: "Detailed invoices showing hours, rates, and every item credit. Clean documentation for your records." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Sell Used Office Furniture During Your Cleanout</p>
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Your Office Equipment Has Value</h2>
          <p className="mt-4 text-base text-white/80 mx-auto max-w-2xl">Most businesses don't realize their old desks, chairs, and electronics can offset the entire removal cost. See how our <Link href="/services/office-cleanouts" className="text-teal-200 underline hover:text-white">office cleanout service</Link> works, review our <Link href="/pricing" className="text-teal-200 underline hover:text-white">hourly rates</Link>, or <Link href="/book-junk-removal-service-today" className="text-teal-200 underline hover:text-white">schedule a walkthrough</Link> today.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
