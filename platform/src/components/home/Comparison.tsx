"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type CellRating = "check" | "partial" | "x";

interface ComparisonRow {
  capability: string;
  fullLoop: CellRating;
  others: CellRating;
}

const rows: ComparisonRow[] = [
  { capability: "Organic lead generation (multi-domain SEO)", fullLoop: "check", others: "x" },
  { capability: "AI-powered SMS sales chatbot", fullLoop: "check", others: "x" },
  { capability: "Revenue attribution to specific domains", fullLoop: "check", others: "x" },
  { capability: "Client booking portal with real-time availability", fullLoop: "check", others: "check" },
  { capability: "Recurring booking management (7 types)", fullLoop: "check", others: "partial" },
  { capability: "GPS-verified field team check-in/out", fullLoop: "check", others: "x" },
  { capability: "Bilingual team portal (EN/ES)", fullLoop: "check", others: "x" },
  { capability: "Full P&L, payroll, 1099 reports", fullLoop: "check", others: "x" },
  { capability: "Built-in referral program with commission tracking", fullLoop: "check", others: "x" },
  { capability: "Client lifecycle analytics (LTV, churn, at-risk)", fullLoop: "check", others: "x" },
  { capability: "SMS + Email + Push notifications (all 3)", fullLoop: "check", others: "partial" },
  { capability: "Automated post-service follow-up + review gen", fullLoop: "check", others: "x" },
  { capability: "One login, one dashboard, zero integrations", fullLoop: "check", others: "x" },
];

function RatingIcon({ rating }: { rating: CellRating }) {
  if (rating === "check")
    return <span className="text-[#1F4D2C] text-xl font-bold">&#10003;</span>;
  if (rating === "partial")
    return <span className="text-[#1F4D2C] text-xl font-bold">~</span>;
  return <span className="text-red-500 text-xl font-bold">&#10005;</span>;
}

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Comparison() {
  return (
    <section className="relative py-24 px-6 bg-[#F4F4F1] overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            All-in-One CRM for Home Service Businesses
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Full Loop CRM vs.{" "}
            <span className="text-[#1F4D2C]">Duct-Taping 9 Tools Together</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            Most home service businesses use a different tool for each stage. Full Loop CRM replaces them all. See how our <Link href="/full-loop-crm-service-features" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">features</Link> compare to cobbling together separate platforms for scheduling, invoicing, marketing, and operations.
          </p>
        </motion.div>

        {/* Header row */}
        <div className="grid grid-cols-3 gap-4 mb-2">
          <div className="bg-white rounded-t-xl p-4 text-center border border-slate-200">
            <span className="text-slate-900 font-semibold font-heading">Capability</span>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-t-xl bg-[#1F4D2C] p-4 text-center"
          >
            <span className="text-[#1C1C1C] font-bold text-lg font-heading">
              Full Loop CRM
            </span>
          </motion.div>
          <div className="bg-white rounded-t-xl p-4 text-center border border-slate-200">
            <span className="text-[#6F6F6B] font-semibold font-heading">Others</span>
          </div>
        </div>

        {/* Data rows */}
        {rows.map((row, i) => (
          <motion.div
            key={row.capability}
            custom={i}
            variants={rowVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-3 gap-4 mb-2"
          >
            <div className="flex items-center p-4 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-900 font-semibold text-sm md:text-base">
                {row.capability}
              </span>
            </div>
            <div className="rounded-lg bg-[#F4F4F1] border border-teal-200 p-4 flex items-center justify-center">
              <RatingIcon rating={row.fullLoop} />
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 flex items-center justify-center">
              <RatingIcon rating={row.others} />
            </div>
          </motion.div>
        ))}

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-xl md:text-2xl text-[#3A3A3A] font-medium mb-8">
            Stop paying for 9 subscriptions.{" "}
            <span className="text-[#1F4D2C] font-bold">
              Run your entire business from one platform.
            </span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block px-10 py-4 rounded-full bg-[#1F4D2C] text-white font-bold text-lg hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
            >
              See Pricing
            </Link>
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="inline-block px-10 py-4 rounded-full bg-white text-[#1F4D2C] font-bold text-lg border-2 border-[#1F4D2C] hover:bg-[#F4F4F1] transition-colors shadow-lg font-cta"
            >
              Why Full Loop?
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
