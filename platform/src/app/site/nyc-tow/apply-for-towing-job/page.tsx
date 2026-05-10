// @ts-nocheck
"use client";

import Link from "next/link";
import { JobApplicationForm } from "@/app/site/nyc-tow/_components/JobApplicationForm";
import { getOfficeByState } from "@/app/site//_data/offices";
import { JsonLd, breadcrumbSchema, jobPostingSchema } from "@/app/site/nyc-tow/_lib/schema";

export default function ApplyPage() {
  const office = getOfficeByState("manhattan");
  return (
    <>
      <JsonLd
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Careers", url: "/careers" },
            { name: "Apply", url: "/apply-for-towing-job" },
          ]),
          jobPostingSchema({
            title: "Tow Truck Driver — NYC (All Boroughs)",
            description:
              "Tow truck drivers, heavy-duty (CDL) operators, and dispatchers across all five NYC boroughs. W-2 employment, full benefits for full-time, paid training, competitive pay plus overtime at time-and-a-half.",
            url: "/apply-for-towing-job",
            stateSlug: "manhattan",
            cityName: "New York",
            employmentType: "FULL_TIME",
            baseSalaryMin: 22,
            baseSalaryMax: 45,
            baseSalaryUnit: "HOUR",
            office,
          }),
        ]}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">W-2 Employment — Full Benefits — NYC All Boroughs</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Apply for an <span className="gradient-text">NYC Tow Truck Driver Job</span> — Now Hiring W-2 Drivers
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Tow drivers, dispatchers, and heavy-duty operators. W-2 employment, not gig. Competitive pay, full benefits for full-time, paid training. CDL holders welcome. Applications reviewed within 48 hours.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Left — info */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What You Get</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Real Employment, Real Pay, Real Benefits</h2>
              <p className="mt-4 text-base text-slate-600">
                No 1099 games, no gig arrangements, no &quot;independent contractor&quot; workarounds. W-2 payroll with proper tax withholding, workers&apos; comp, and full benefits for full-time roles. See all <Link href="/careers" className="text-teal-700 font-semibold hover:underline">open positions</Link>.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-xl font-bold text-teal-700 font-heading">Light-Duty Driver</p>
                  <p className="text-sm text-slate-600">Wheel-lift and flatbed tow operator. Full training provided if you have a clean driving record. Competitive hourly + overtime + performance bonuses.</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-xl font-bold text-teal-700 font-heading">Heavy-Duty Operator</p>
                  <p className="text-sm text-slate-600">CDL required. Heavy wrecker work on Cross Bronx, Deegan, BQE, and bridge corridors. Premium pay, seasoned team.</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-xl font-bold text-teal-700 font-heading">Dispatcher</p>
                  <p className="text-sm text-slate-600">NYC dispatch — routing trucks in real time, quoting rates, coordinating with fleet accounts and insurance carriers. Requires NYC knowledge and sharp phone skills.</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">Requirements</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ Valid NY driver&apos;s license (CDL for heavy-duty)</p>
                  <p>✓ Clean driving record (no major violations in 3 years)</p>
                  <p>✓ Pass background check and pre-employment drug screen</p>
                  <p>✓ Eligible to work in the US (W-2 employment)</p>
                  <p>✓ 21+ years old</p>
                  <p>✓ Willing to work overnight / weekend / holiday shifts</p>
                  <p>✓ Physically able to handle tow equipment (tie-downs, lug nuts, etc.)</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">What&apos;s Included</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ W-2 employment (not 1099 or gig)</p>
                  <p>✓ Paid training program — every driver goes through it</p>
                  <p>✓ Health insurance (full-time)</p>
                  <p>✓ Paid time off (full-time)</p>
                  <p>✓ 401(k) with match (full-time)</p>
                  <p>✓ Branded truck and equipment provided</p>
                  <p>✓ Overtime at time-and-a-half</p>
                  <p>✓ Clear path to heavy-duty, senior driver, and dispatch roles</p>
                </div>
              </div>
            </div>

            {/* Right — form */}
            <div>
              <JobApplicationForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
