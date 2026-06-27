// @ts-nocheck
"use client";

import Link from "next/link";
import { JobApplicationForm } from "@/app/site/theroadsidehelper/_components/JobApplicationForm";

export default function ApplyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/40 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">Now Hiring — Roadside Technicians</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Apply: <span className="text-amber-300">Roadside Technician Jobs</span> — Hourly + Tips, Paid Training
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Hourly base pay plus tips, paid training, health insurance, and a real path from technician to shift lead to operations.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Left — info */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 font-cta">What You Get</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">Hourly Base + Tips + Benefits</h2>
              <p className="mt-4 text-base text-slate-600">
                No prior roadside experience required. We train every aspect of the job. Apply in 2 minutes — we call you within 48 hours. See all <Link href="/careers" className="text-emerald-700 font-semibold hover:underline">open positions</Link>.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-3xl font-bold text-emerald-700 font-heading">Competitive Hourly</p>
                  <p className="text-sm text-slate-600">Base pay every technician — day one, every shift</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-3xl font-bold text-emerald-700 font-heading">Tips 15–25%</p>
                  <p className="text-sm text-slate-600">Drivers tip well when you fix it fast and professionally</p>
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-3xl font-bold text-emerald-700 font-heading">Shift Lead Path</p>
                  <p className="text-sm text-slate-600">Promotion from within — technician to shift lead to operations</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">Requirements</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ Valid driver&apos;s license &amp; clean 3-year record</p>
                  <p>✓ Lift 50+ lbs repeatedly throughout the day</p>
                  <p>✓ Reliable transportation to and from dispatch base</p>
                  <p>✓ Smartphone with data for dispatch app</p>
                  <p>✓ Pass background check and drug screening</p>
                  <p>✓ 18+ years old, US work authorization</p>
                  <p>✓ Available for overnights or weekends (premium pay)</p>
                  <p>✓ Calm under pressure, mechanically inclined</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">What&apos;s Included</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ Full paid training program</p>
                  <p>✓ Health insurance (full-time)</p>
                  <p>✓ Paid time off (full-time)</p>
                  <p>✓ 401k with matching (full-time)</p>
                  <p>✓ Flexible scheduling — choose your shifts</p>
                  <p>✓ Service vehicle and tools provided</p>
                  <p>✓ Shift differential for overnight and weekend work</p>
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