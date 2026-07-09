"use client";

import Link from "next/link";
import { JobApplicationForm } from "@/app/site/we-pay-you-junk/_components/JobApplicationForm";

export default function ApplyPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">$100/hr + $50/hr Per Extra + 60% Resale — Own Your Territory</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Become a <span className="gradient-text">We Pay You Junk Partner</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            This isn&apos;t a crew job. You run junk removal in your own territory under the We Pay You Junk Removal brand — with your own truck, your own schedule, and our support to grow it. A form of free franchising.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {/* Left — the model */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-teal-600 font-cta">The Opportunity</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 font-heading">$100/hr + 60% Resale</h2>
              <p className="mt-4 text-base text-slate-600">
                You&apos;re a partner, not an employee. Apply in 2 minutes — we review and follow up within 48 hours. See open <Link href="/careers" className="text-teal-700 font-semibold hover:underline">territories</Link> and <Link href="/locations" className="text-teal-700 font-semibold hover:underline">locations</Link>.
              </p>

              <div className="mt-8 space-y-3">
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">$100/hr</p>
                  <p className="text-sm text-slate-600">You, the lead with the truck — dump fees included in your rate</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">+$50/hr</p>
                  <p className="text-sm text-slate-600">For each additional laborer you bring on the job</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">+60% Resale</p>
                  <p className="text-sm text-slate-600">Keep 60% of the resale value of items you haul and resell</p>
                </div>
                <div className="rounded-lg bg-teal-50 border border-teal-200 p-4">
                  <p className="text-3xl font-bold text-teal-700 font-heading">Your Territory</p>
                  <p className="text-sm text-slate-600">Grow into the sole We Pay You Junk provider for your area — then your state</p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">How the resale model works</p>
                <p className="text-sm text-slate-600">
                  On every job you appraise items that still have value — furniture, appliances, tools, electronics. You credit the customer <strong>50% of the appraised value right off their bill</strong>, so they pay less (and on big jobs, we might pay them). You take those items, store them, and resell them — and you keep <strong>60% of what they sell for</strong>. That&apos;s why a <strong>dry, secure storage area is required</strong>: it&apos;s where your resale inventory lives until it sells.
                </p>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">What you bring</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ Your own truck — or a vehicle with a trailer</p>
                  <p>✓ Valid driver&apos;s license</p>
                  <p>✓ Vehicle insurance</p>
                  <p>✓ A dry, secure storage area for resale items</p>
                  <p>✓ Able to lift 50+ lbs repeatedly</p>
                  <p>✓ Smartphone with a data plan</p>
                  <p>✓ 18+ years old</p>
                  <p>✓ Help verify a service-area Google Business Profile under the We Pay You Junk Removal brand</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm font-bold text-slate-900 mb-3">How this works</p>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>✓ 1099 partner — you run your own operation</p>
                  <p>✓ We guide and assist your local branding and business growth under the brand — a form of free franchising</p>
                  <p>✓ Become the sole operator for your territory over time</p>
                  <p>✓ Hire your own helpers ($20–$30/hr) and keep the spread</p>
                  <p>✗ No drug test</p>
                  <p>✗ No benefits — you&apos;re a business owner, not staff</p>
                  <p>✗ No training program — this is for people ready to operate</p>
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
