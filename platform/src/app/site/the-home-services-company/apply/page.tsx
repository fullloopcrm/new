"use client";

import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF, EMAIL, HOURS } from "@/app/site/the-home-services-company/_data/content";
import { JobApplicationForm } from "@/app/site/the-home-services-company/_components/JobApplicationForm";

export default function ApplyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Licensed Technicians — Home Services Jobs Nationwide</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Apply for a <span className="gradient-text">Home Services Job</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Join Home Services Co — 40 trades under one roof. Competitive pay, benefits, and a clear growth path for HVAC, plumbing, electrical, painting, cleaning, handyman, and more.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Left — info */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">What You Get</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">$50/hr + Tips + Benefits</h2>
              <p className="mt-4 text-base text-slate-600">
                No experience required. Full paid training. Apply in 2 minutes — we call you within 48 hours. See all <Link href="/careers" className="text-teal-700 font-semibold hover:underline">open positions</Link> and <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations</Link>.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">$50/hr</p>
                  <p className="text-sm text-slate-600">Starting pay — every crew member, day one</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">$50–$150/day tips</p>
                  <p className="text-sm text-slate-600">Customers tip well when you save them money</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">$60/hr Team Lead</p>
                  <p className="text-sm text-slate-600">Promotion from within — clear growth path</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">Requirements</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ Valid driver&apos;s license &amp; clean record</p>
                  <p>✓ Lift 50+ lbs repeatedly throughout the day</p>
                  <p>✓ Reliable transportation to dispatch</p>
                  <p>✓ Smartphone with data plan</p>
                  <p>✓ Pass background check</p>
                  <p>✓ 18+ years old</p>
                  <p>✓ Available at least 1 weekend day</p>
                  <p>✓ Positive attitude — we train everything else</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">What&apos;s Included</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ Full paid training program</p>
                  <p>✓ Health insurance (full-time)</p>
                  <p>✓ Paid time off (full-time)</p>
                  <p>✓ 401k (full-time)</p>
                  <p>✓ Flexible scheduling — pick your days</p>
                  <p>✓ Branded truck and equipment provided</p>
                  <p>✓ Quarterly performance bonuses</p>
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
