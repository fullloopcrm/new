// @ts-nocheck
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function RealTalk() {
  return (
    <section className="relative bg-slate-900 py-16 sm:py-24 overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-teal-500 to-cyan-500" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Label */}
          <p className="text-teal-400 text-sm font-bold tracking-[0.2em] uppercase mb-6 font-cta">
            Let&apos;s be real
          </p>

          {/* Main copy */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight font-heading mb-6">
            Most businesses have no idea what they actually need to grow online.
          </h2>

          <div className="space-y-5 text-base sm:text-lg text-slate-300 leading-relaxed">
            <p>
              They get sold ads, get sold social media posts, get sold whatever the agency is pushing that month. None of it compounds. None of it builds anything lasting. And every dollar spent disappears the second you stop paying.
            </p>

            <p>
              <strong className="text-white">We do the opposite.</strong> We&apos;re a fully devoted organic marketing company &mdash; strategy, design, development, SEO, and AI &mdash; all built around one goal: <strong className="text-teal-400">getting you the highest-quality leads that close higher, stay longer, and cost less over time.</strong>
            </p>

            <p>
              Organic lead generation isn&apos;t just cheaper. The leads are <em>better</em>. They found you because they were actively searching. They already trust you before they pick up the phone. And the numbers prove it:
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 my-8">
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 sm:p-5 text-center">
                <p className="text-2xl sm:text-4xl font-extrabold text-teal-400 font-heading">30%</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 font-cta">Our Conversion Rate</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Industry avg: 2-5%</p>
              </div>
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 sm:p-5 text-center">
                <p className="text-2xl sm:text-4xl font-extrabold text-teal-400 font-heading">70%</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 font-cta">Our Close Rate</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Industry avg: 30%</p>
              </div>
            </div>

            <p>
              That&apos;s not a typo. When leads come in organically, they already want what you sell. They close faster, they stay longer, and they refer more.
            </p>

            <p>
              In 2026, our work is split between two forces: <strong className="text-white">SEO that dominates traditional search</strong> and <strong className="text-white">AI-powered systems</strong> &mdash; AI search optimization, automations that run your follow-up, and intelligent websites and backends that help run the business itself. We&apos;re not just marketing your company. We&apos;re building the infrastructure that makes it run.
            </p>

            <p>
              25 years. 10,000+ businesses. A proven system that actually works. If you&apos;re ready to stop guessing and start compounding, we&apos;re ready to show you exactly how.
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/nyc-marketing-company-portfolio"
              className="inline-block px-6 py-3.5 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors text-center font-cta"
            >
              See the Proof
            </Link>
            <Link
              href="/contact"
              className="inline-block px-6 py-3.5 text-base font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors text-center font-cta"
            >
              Ask Us Anything
            </Link>
            <Link
              href="/whats-working-in-marketing"
              className="inline-block px-6 py-3.5 text-base font-bold text-teal-400 rounded-lg border border-teal-400/30 hover:bg-teal-400/10 transition-colors text-center font-cta"
            >
              What&apos;s Working Right Now
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
