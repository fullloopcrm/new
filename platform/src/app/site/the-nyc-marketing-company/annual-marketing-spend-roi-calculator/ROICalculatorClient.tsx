"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

export default function ROICalculator() {
  const [monthlyBudget, setMonthlyBudget] = useState(950);
  const [avgJobValue, setAvgJobValue] = useState(500);
  const [closeRate, setCloseRate] = useState(30);

  // Conservative estimates based on real client data
  const estimatedLeadsPerMonth = Math.round(monthlyBudget / 25); // ~1 lead per $25 spent (conservative)
  const closedDeals = Math.round(estimatedLeadsPerMonth * (closeRate / 100));
  const monthlyRevenue = closedDeals * avgJobValue;
  const annualRevenue = monthlyRevenue * 12;
  const annualCost = monthlyBudget * 12;
  const roi = annualCost > 0 ? Math.round(((annualRevenue - annualCost) / annualCost) * 100) : 0;

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing ROI Calculator
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            Calculate Your Marketing ROI for{" "}
            <span className="text-teal-400">Your NYC Business</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Plug in your real numbers and see what SEO and digital marketing can do for your bottom line. No email required. No sales pitch. Just math.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>Most businesses have <strong>no idea what a lead actually costs them</strong>. Once you know that number, every marketing decision gets easier. That&apos;s <strong>what this calculator is for</strong>.</>}
      />

      {/* Calculator */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Inputs */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-6 font-heading">Your Numbers</h2>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Monthly Marketing Budget</label>
                    <span className="text-teal-600 font-bold font-mono text-sm">${monthlyBudget.toLocaleString()}/mo</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={10000}
                    step={50}
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>$500</span>
                    <span>$10,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Average Job / Sale Value</label>
                    <span className="text-teal-600 font-bold font-mono text-sm">${avgJobValue.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={25000}
                    step={100}
                    value={avgJobValue}
                    onChange={(e) => setAvgJobValue(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>$100</span>
                    <span>$25,000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Lead-to-Customer Close Rate</label>
                    <span className="text-teal-600 font-bold font-mono text-sm">{closeRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    step={5}
                    value={closeRate}
                    onChange={(e) => setCloseRate(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>5%</span>
                    <span>80%</span>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-xs mt-6">
                * Estimates based on conservative averages from real client data. Actual results vary by industry, competition, and market. These are projections, not guarantees.
              </p>
            </div>

            {/* Results */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-6 font-heading">Projected Results</h2>

              <div className="space-y-4">
                <div className="rounded-xl bg-teal-50 border border-teal-100 p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Estimated Leads / Month</p>
                  <p className="text-slate-900 text-3xl font-extrabold font-mono">{estimatedLeadsPerMonth}</p>
                </div>

                <div className="rounded-xl bg-teal-50 border border-teal-100 p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Closed Deals / Month</p>
                  <p className="text-slate-900 text-3xl font-extrabold font-mono">{closedDeals}</p>
                </div>

                <div className="rounded-xl bg-teal-50 border border-teal-100 p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Monthly Revenue from Marketing</p>
                  <p className="text-teal-600 text-3xl font-extrabold font-mono">${monthlyRevenue.toLocaleString()}</p>
                </div>

                <div className="rounded-xl bg-teal-50 border border-teal-100 p-5">
                  <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Annual Revenue from Marketing</p>
                  <p className="text-teal-600 text-3xl font-extrabold font-mono">${annualRevenue.toLocaleString()}</p>
                </div>

                <motion.div
                  key={roi}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="rounded-xl bg-slate-900 border border-slate-700 p-5"
                >
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Estimated ROI</p>
                  <p className={`text-4xl font-extrabold font-mono ${roi > 0 ? "text-teal-400" : "text-red-400"}`}>
                    {roi > 0 ? "+" : ""}{roi}%
                  </p>
                  <p className="text-white/40 text-xs mt-2">
                    Investing ${annualCost.toLocaleString()}/year to generate ${annualRevenue.toLocaleString()} in revenue
                  </p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Industry benchmarks */}
          <div className="mt-16">
            <h3 className="text-lg font-bold text-slate-900 mb-6 font-heading text-center">Industry Benchmarks</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { industry: "Plumbers", avgJob: "$350", leadsPerMo: "30-60", typicalROI: "8-15x" },
                { industry: "Dentists", avgJob: "$800", leadsPerMo: "20-40", typicalROI: "10-20x" },
                { industry: "Law Firms", avgJob: "$3,500", leadsPerMo: "10-25", typicalROI: "15-30x" },
                { industry: "Restaurants", avgJob: "$45", leadsPerMo: "100-300", typicalROI: "5-10x" },
              ].map((b) => (
                <div key={b.industry} className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                  <p className="text-slate-900 text-sm font-bold mb-2">{b.industry}</p>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p>Avg Job: <span className="text-slate-900 font-semibold">{b.avgJob}</span></p>
                    <p>Leads/mo: <span className="text-slate-900 font-semibold">{b.leadsPerMo}</span></p>
                    <p>Typical ROI: <span className="text-teal-600 font-bold">{b.typicalROI}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <p className="text-slate-600 text-lg mb-6">
              Ready to turn these projections into real revenue?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://www.thenycmarketingcompany.com/contact"
                className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Schedule a Free Strategy Session
              </Link>
              <Link
                href="https://www.thenycmarketingcompany.com/nyc-marketing-pricing-guide"
                className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}