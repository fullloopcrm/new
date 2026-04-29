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
    <section className="py-20 sm:py-28 bg-[#F4F4F1] px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-center font-cta"
        >
          Home Service CRM vs. Traditional Operating Costs
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1C1C1C] leading-[1.1] text-center font-heading"
        >
          They&rsquo;re Spending{" "}
          <span className="text-[#1C1C1C] line-through">$178,800</span>.
          You&rsquo;ll Spend{" "}
          <span className="text-[#1F4D2C]">$1,000/user/mo</span>.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg text-[#6F6F6B] text-center max-w-3xl mx-auto leading-relaxed"
        >

          Every dollar home service businesses burn on staff, software, and ad spend &mdash; our <Link href="/full-loop-crm-service-features" className="text-[#1F4D2C] underline underline-offset-2 hover:text-yellow-200">all-in-one CRM platform</Link> replaces with built-in automation. Here&rsquo;s how a <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-[#1F4D2C] underline underline-offset-2 hover:text-yellow-200">full-service field CRM</Link> compares line by line.
        </motion.p>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 rounded-2xl border border-[#C8C5BC] overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_140px_140px] bg-[#FAF9F5] px-4 sm:px-6 py-4 text-xs sm:text-sm font-bold tracking-wider uppercase font-cta">
            <span className="text-[#6F6F6B]">Expense</span>
            <span className="text-red-700 text-right sm:text-center">Traditional</span>
            <span className="text-[#1F4D2C] text-right sm:text-center">Full Loop</span>
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
                i % 2 === 0 ? "bg-[#EDEAE3]" : "bg-[#FAF9F5]"
              } border-t border-[#C8C5BC]`}
            >
              <div>
                <span className="text-sm sm:text-base font-semibold text-[#1C1C1C]">
                  {item.name}
                </span>
                <span className="block text-xs sm:text-sm text-[#6F6F6B] mt-0.5">
                  {item.desc}
                </span>
              </div>
              <span className="text-sm sm:text-base font-mono font-semibold text-red-700/80 text-right sm:text-center">
                {item.traditional}
              </span>
              <span className="text-sm sm:text-base font-semibold text-[#1F4D2C] text-right sm:text-center font-cta">
                {item.fullloop}
              </span>
            </motion.div>
          ))}

          {/* Total row */}
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_140px_140px] px-4 sm:px-6 py-5 items-center bg-[#FAF9F5] border-t-2 border-[#1F4D2C]">
            <span className="text-base sm:text-lg font-bold text-[#1C1C1C] font-heading">
              Total Annual Operating Cost
            </span>
            <span className="text-lg sm:text-xl font-mono font-bold text-red-700 text-right sm:text-center">
              $178,800
            </span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#1F4D2C] text-right sm:text-center">
              $12,000<span className="block text-[10px] font-normal text-[#1F4D2C] leading-tight">solo · per user</span>
            </span>
          </div>
        </motion.div>

        {/* Website note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 text-sm text-[#6F6F6B] text-center max-w-2xl mx-auto leading-relaxed"
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
          <div className="inline-block rounded-2xl border px-8 sm:px-12 py-6 sm:py-8" style={{ backgroundColor: "rgba(244, 244, 241, 0.06)", borderColor: "rgba(244, 244, 241, 0.2)" }}>
            <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.15em] uppercase mb-2 font-cta">
              Solo Operator Savings · Year 1
            </p>
            <p className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1C1C1C] font-mono">
              $166,800
              <span className="text-lg sm:text-xl text-[#1C1C1C] font-normal">/yr</span>
            </p>
            <p className="mt-3 text-base sm:text-lg text-[#3A3A3A] max-w-md mx-auto">
              That&rsquo;s <strong className="text-[#1F4D2C]">93% less</strong>{" "}
              than running the front office the old way &mdash; with the AI
              sales agent, GPS field ops, e-signature, books, and routes that
              the old stack doesn&rsquo;t even include. Add seats as you grow
              at the same flat $1,000/user/mo. See the full <Link href="/waitlist" className="text-[#1F4D2C] underline underline-offset-2 hover:text-yellow-200">CRM pricing</Link> breakdown.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
