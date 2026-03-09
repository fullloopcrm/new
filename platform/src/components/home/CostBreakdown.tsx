"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const expenses = [
  {
    name: "Receptionist / Office Manager",
    desc: "Answering calls, scheduling, confirmations",
    traditional: "$38,000",
    fullloop: "Included",
  },
  {
    name: "Salesperson / Lead Closer",
    desc: "Following up on leads, quoting, converting",
    traditional: "$48,000",
    fullloop: "Included",
  },
  {
    name: "Customer Service Rep",
    desc: "Rescheduling, complaints, retention",
    traditional: "$35,000",
    fullloop: "Included",
  },
  {
    name: "Website + SEO Agency",
    desc: "One generic website, monthly retainer, slow results",
    traditional: "$18,000",
    fullloop: "See below",
  },
  {
    name: "Google Ads / Paid Lead Gen",
    desc: "Pay-per-click, Thumbtack, Yelp Ads, Angi — leads stop when you stop paying",
    traditional: "$24,000",
    fullloop: "$0 — Organic",
  },
  {
    name: "CRM / Scheduling Software",
    desc: "Jobber, Housecall Pro, ServiceTitan, etc.",
    traditional: "$3,600",
    fullloop: "Included",
  },
  {
    name: "SMS / Phone System",
    desc: "Business line, texting platform, auto-responders",
    traditional: "$2,400",
    fullloop: "Included",
  },
  {
    name: "Review Management",
    desc: "Software to request & monitor reviews",
    traditional: "$1,800",
    fullloop: "Included",
  },
  {
    name: "Retargeting / Email Marketing",
    desc: "Win-back campaigns, re-engagement flows",
    traditional: "$3,600",
    fullloop: "Included",
  },
  {
    name: "Bookkeeping / Finance Tracking",
    desc: "P&L, payroll tracking, expense management",
    traditional: "$4,400",
    fullloop: "Included",
  },
];

export default function CostBreakdown() {
  return (
    <section className="py-20 sm:py-28 bg-slate-900 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-center font-cta"
        >
          Home Service CRM vs. Traditional Operating Costs
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.1] text-center font-heading"
        >
          They&rsquo;re Spending{" "}
          <span className="text-white/40 line-through">$178,800</span>.
          You&rsquo;ll Spend{" "}
          <span className="text-teal-400">$2,500/mo</span>.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg text-slate-400 text-center max-w-3xl mx-auto leading-relaxed"
        >

          Every dollar home service businesses burn on staff, software, and ad spend &mdash; our <Link href="/full-loop-crm-service-features" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">all-in-one CRM platform</Link> replaces with built-in automation. Here&rsquo;s how a <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">full-service field CRM</Link> compares line by line.
        </motion.p>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 rounded-2xl border border-slate-700/60 overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_140px_140px] bg-slate-800 px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold tracking-wider uppercase font-cta">
            <span className="text-slate-400">Expense</span>
            <span className="text-red-400 text-right sm:text-center">Traditional</span>
            <span className="text-teal-400 text-right sm:text-center">Full Loop</span>
          </div>

          {/* Rows */}
          {expenses.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className={`grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_140px_140px] px-4 sm:px-6 py-4 items-center ${
                i % 2 === 0 ? "bg-slate-800/40" : "bg-slate-800/20"
              } border-t border-slate-700/40`}
            >
              <div>
                <span className="text-sm sm:text-base font-semibold text-white">
                  {item.name}
                </span>
                <span className="block text-xs sm:text-sm text-slate-500 mt-0.5">
                  {item.desc}
                </span>
              </div>
              <span className="text-sm sm:text-base font-mono font-semibold text-red-400/80 text-right sm:text-center">
                {item.traditional}
              </span>
              <span className="text-sm sm:text-base font-semibold text-teal-400 text-right sm:text-center font-cta">
                {item.fullloop}
              </span>
            </motion.div>
          ))}

          {/* Total row */}
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_140px_140px] px-4 sm:px-6 py-5 items-center bg-slate-800 border-t-2 border-teal-600">
            <span className="text-base sm:text-lg font-bold text-white font-heading">
              Total Annual Operating Cost
            </span>
            <span className="text-lg sm:text-xl font-mono font-bold text-red-400 text-right sm:text-center">
              $178,800
            </span>
            <span className="text-lg sm:text-xl font-mono font-bold text-teal-400 text-right sm:text-center">
              $30,000
            </span>
          </div>
        </motion.div>

        {/* Website note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 text-sm text-slate-500 text-center max-w-2xl mx-auto leading-relaxed"
        >
          + Website network built separately &mdash; $500&ndash;$1,000 per
          site, one-time. A 10-site network runs $5K&ndash;$10K total. You own
          them forever. No recurring fees.
        </motion.p>

        {/* Save callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 text-center"
        >
          <div className="inline-block rounded-2xl bg-teal-600/20 border border-teal-500/30 px-8 sm:px-12 py-6 sm:py-8">
            <p className="text-teal-400 text-sm font-semibold tracking-[0.15em] uppercase mb-2 font-cta">
              Annual Savings
            </p>
            <p className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white font-mono">
              $148,800
              <span className="text-lg sm:text-xl text-white/50 font-normal">/yr</span>
            </p>
            <p className="mt-3 text-base sm:text-lg text-slate-300 max-w-md mx-auto">
              That&rsquo;s <strong className="text-teal-400">83% less</strong>{" "}
              &mdash; reinvested directly into growth and profit. See how our <Link href="/full-loop-crm-pricing" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">CRM pricing</Link> compares.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
