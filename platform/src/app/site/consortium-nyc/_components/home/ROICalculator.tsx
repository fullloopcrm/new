"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ROICalculator() {
  const [customerValue, setCustomerValue] = useState(300);
  const [newCustomers, setNewCustomers] = useState(10);

  const monthlyRevenue = customerValue * newCustomers;
  const annualRevenue = monthlyRevenue * 12;
  const monthlyInvestment = 950;
  const roi = Math.round(((monthlyRevenue - monthlyInvestment) / monthlyInvestment) * 100);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing ROI Calculator
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Calculate Your Marketing ROI for{" "}
            <span className="text-teal-600">Your NYC Business</span>
          </h2>
          <p className="text-slate-600 text-lg">
            See what <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">SEO and marketing</Link> could do for your business. Plug in your numbers and see why local businesses across New York City, Brooklyn, and Long Island invest in organic growth.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-2xl bg-teal-50 border border-slate-200 shadow-sm p-8 md:p-12"
        >
          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            <div>
              <label className="block text-slate-900 font-semibold mb-3 text-lg font-cta">
                What&apos;s your average customer value?
              </label>
              <div className="text-teal-600 text-3xl font-bold mb-4 font-mono">
                {formatCurrency(customerValue)}
              </div>
              <input
                type="range"
                min={100}
                max={10000}
                step={50}
                value={customerValue}
                onChange={(e) => setCustomerValue(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-slate-400 text-sm mt-2">
                <span>$100</span>
                <span>$10,000</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-900 font-semibold mb-3 text-lg font-cta">
                How many new customers per month would change your business?
              </label>
              <div className="text-teal-600 text-3xl font-bold mb-4 font-mono">
                {newCustomers}
              </div>
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={newCustomers}
                onChange={(e) => setNewCustomers(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-slate-400 text-sm mt-2">
                <span>1</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <motion.div
              key={monthlyRevenue}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm"
            >
              <p className="text-slate-400 text-sm mb-2 uppercase tracking-wider">
                Projected Monthly Revenue
              </p>
              <p className="text-teal-600 text-3xl md:text-4xl font-bold font-mono">
                {formatCurrency(monthlyRevenue)}
              </p>
            </motion.div>

            <motion.div
              key={annualRevenue}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm"
            >
              <p className="text-slate-400 text-sm mb-2 uppercase tracking-wider">
                Projected Annual Revenue
              </p>
              <p className="text-teal-600 text-3xl md:text-4xl font-bold font-mono">
                {formatCurrency(annualRevenue)}
              </p>
            </motion.div>

            <motion.div
              key={roi}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl p-6 text-center border border-slate-200 shadow-sm"
            >
              <p className="text-slate-400 text-sm mb-2 uppercase tracking-wider">
                ROI on {formatCurrency(monthlyInvestment)}/mo Investment
              </p>
              <p className="text-teal-600 text-3xl md:text-4xl font-bold font-mono">
                {roi.toLocaleString()}%
              </p>
            </motion.div>
          </div>

          <p className="text-slate-400 text-center text-sm mb-8">
            SEO investment: $950/mo — our standard local business SEO package.
            These projections are based on the numbers you provide. Real results
            depend on your market, competition, and commitment.
          </p>

          <div className="text-center">
            <Link
              href="/contact"
              className="inline-block px-10 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Let&apos;s Make These Numbers Real — Book a Free Call
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
