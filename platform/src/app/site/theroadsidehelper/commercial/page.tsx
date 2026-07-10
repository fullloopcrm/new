import Link from "next/link";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { PHONE, PHONE_HREF } from "@/app/site/theroadsidehelper/_data/content";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export const metadata = pageSeo({
  title:
    "Fleet Roadside Assistance — Flat $149/hr Predictable Billing 24/7 | (888) 944-3001",
  description:
    "Fleet roadside assistance: consolidated billing, dedicated dispatch, flat $149/hr per call, no per-vehicle fees. Delivery fleets, dealers, rental. Call (888) 944-3001.",
  path: "/commercial",
});

export default function CommercialPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Fleet &amp; Commercial Roadside</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Fleet Roadside Assistance — Flat $149/hr Predictable Billing
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Delivery vans, service trucks, sales fleets, dealership lots, rental cars. Consolidated monthly billing, dedicated dispatch lines, and a flat $149/hr rate that doesn&apos;t change overnight or on holidays.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta text-center">Who We Serve</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Fleet, Commercial &amp; B2B Roadside</h2>
          <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Delivery Fleets", body: "Last-mile delivery vans, courier vehicles, e-commerce fleets. Jump-starts, flat tires, fuel, towing — all flat-rate." },
              { title: "Service Trucks", body: "HVAC, plumbing, electrical, lawn care work trucks. Diesel-specific techs available. Jobsite delivery of fuel, batteries, tires." },
              { title: "Sales Fleets", body: "Dealer lot vehicles, salesperson fleet cars, demo units. Lot jump-starts in cold weather, key fob battery replacement, lockouts." },
              { title: "Dealerships", body: "Customer breakdowns, test-drive battery dies, lot vehicles won&apos;t start. Manufacturer warranty docs provided on request." },
              { title: "Rental & Carshare", body: "Hertz, Enterprise, Avis, Zipcar, Turo, Getaround. Direct rental company coordination, arrival-condition documentation." },
              { title: "Property Management", body: "Tenant vehicles in lots, building-staff fleet, commercial complex lockouts and roadside." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta text-center">Fleet Account Benefits</p>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Fleets Choose Us</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Consolidated Monthly Billing", desc: "One invoice per month, line-item per call. Clean documentation for accounting and insurance." },
              { title: "Dedicated Dispatch Line", desc: "Fleet customers get a direct line — no phone tree, no general queue, faster routing." },
              { title: "Flat-Rate, No Surprises", desc: "$149/hr same overnights, weekends, holidays. Predictable cost-per-call for budgeting." },
              { title: "Volume Service Summaries", desc: "Monthly reports for routing analysis, vehicle health planning, and breakdown patterns." },
              { title: "Multi-State Coverage", desc: "Same flat rate in all 50 states. Same billing across every market your fleet operates in." },
              { title: "Account Portal", desc: "View every call, every charge, every technician note. Real-time visibility for fleet managers." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Set Up a Fleet Account?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Call <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a> and ask for fleet accounts. Or <Link href="/contact-the-roadside-helper" className="text-amber-300 hover:underline">message us with your fleet size</Link> and we&apos;ll send pricing.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}