"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const scaryStats = [
  {
    stat: "75%",
    text: "of users never scroll past page 1 of Google",
    subtext:
      "If you're not on page 1, you don't exist. Three-quarters of your potential customers will never see your business. They'll see your competitor instead — and they'll call them.",
  },
  {
    stat: "15%",
    text: "The average cost of a lead increases 15% every year you wait",
    subtext:
      "Every month you delay, your competitors are building domain authority, earning backlinks, and locking in rankings that will cost you 10x more to overcome later. SEO compounds — for whoever starts first.",
  },
  {
    stat: "?",
    text: "Your competitor just hired an SEO agency. Did you?",
    subtext:
      "Right now, someone in your market is investing in their digital presence. They're building the foundation that will make them the default choice in your industry. The gap between you and them widens every single day you do nothing.",
  },
];

export default function Competitors() {
  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
      {/* Subtle urgent accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-50 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-red-500 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Competitive Marketing Analysis
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Your NYC Competitors Are Investing in Marketing{" "}
            <span className="text-red-500">Right Now</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            While you&apos;re reading this, a business in your neighborhood is hiring a marketing company. Every day you wait, they&apos;re building domain authority and locking in rankings across Brooklyn, Queens, Manhattan, and Long Island.
          </p>
        </motion.div>

        {/* Scary stat cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {scaryStats.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 text-center"
            >
              <motion.p
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 + 0.3 }}
                className="text-5xl sm:text-6xl font-extrabold text-red-500 mb-4 font-mono"
              >
                {item.stat}
              </motion.p>
              <p className="text-slate-900 font-bold text-lg mb-3">{item.text}</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                {item.subtext}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-slate-900 text-xl font-bold mb-8">
            Stop Watching Your Competitors Win. Start Today.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
          >
            Claim Your Competitive Advantage Now
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
