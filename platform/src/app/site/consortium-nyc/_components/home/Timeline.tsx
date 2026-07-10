"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const milestones = [
  {
    label: "Day 1",
    title: "Free Strategy Call",
    desc: "We analyze your business, competitors, and opportunities. You walk away with actionable insights whether you hire us or not. No pitch decks, no fluff — just a real conversation about what's working, what's broken, and what the path to revenue looks like.",
  },
  {
    label: "Week 1",
    title: "Full Audit & Roadmap",
    desc: "Comprehensive audit delivered. Custom strategy presented. You approve the roadmap. Every recommendation is prioritized by revenue impact so you know exactly where your money goes and why.",
  },
  {
    label: "Week 2-4",
    title: "Implementation Begins",
    desc: "Website updates, content creation, technical fixes — all happening in parallel. We move fast because momentum matters. Your site starts getting optimized while your content pipeline fires up.",
  },
  {
    label: "Month 2",
    title: "First Results",
    desc: "Rankings moving, traffic growing, leads starting to flow. You see real data in your dashboard — not vanity metrics, but actual phone calls, form submissions, and revenue indicators.",
  },
  {
    label: "Month 3",
    title: "Momentum",
    desc: "Consistent lead flow. ROI becomes measurable and reportable. The system is working and you can see it in your bank account. This is where most agencies are still 'warming up.' We're already delivering.",
  },
  {
    label: "Month 6",
    title: "Domination",
    desc: "Top rankings locked in. Predictable lead volume every month. Scaling conversations begin. You're not wondering if digital marketing works anymore — you're deciding how much more to invest.",
  },
];

export default function Timeline() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Company Timeline
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            What Happens When You Hire a{" "}
            <span className="text-teal-600">NYC Marketing Company</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Complete transparency from day one. Here&apos;s exactly what to expect when you partner with a marketing company in New York City — from your first <Link href="/contact-nyc-marketing-company-consortium-nyc" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">free strategy session</Link> to total market domination.
          </p>
        </motion.div>

        {/* Timeline items */}
        <div className="relative">
          {/* Connecting line — vertical on mobile, horizontal on lg */}
          <div className="hidden lg:block absolute top-6 left-0 right-0 h-px bg-teal-300" />
          <div className="lg:hidden absolute left-6 top-0 bottom-0 w-px bg-teal-300" />

          {/* Desktop: horizontal grid */}
          <div className="hidden lg:grid lg:grid-cols-6 gap-6">
            {milestones.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative pt-14"
              >
                {/* Dot */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center">
                  <span className="text-teal-600 font-bold text-xs font-mono">
                    {m.label}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2 font-heading">
                  {m.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {m.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Mobile: vertical list */}
          <div className="lg:hidden space-y-10">
            {milestones.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative pl-16"
              >
                {/* Dot */}
                <div className="absolute left-0 top-0 w-12 h-12 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center">
                  <span className="text-teal-600 font-bold text-[10px] font-mono">
                    {m.label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1 font-heading">
                  {m.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {m.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-20"
        >
          <p className="text-slate-600 text-lg mb-6">
            Day 1 starts with a free call. No commitment. No credit card. Just a
            real strategy conversation.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta"
          >
            Book Your Free Strategy Call
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
