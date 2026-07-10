"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const stats = [
  { value: "93%", label: "of consumers research online before buying" },
  { value: "46%", label: "of all Google searches have local intent" },
  { value: "78%", label: "of local mobile searches result in a purchase within 24 hours" },
  { value: "0%", label: "of businesses on page 2 get meaningful traffic" },
];

const regions = [
  {
    title: "New York City",
    color: "#0f766e",
    content:
      "8.3 million people. Millions of daily searches. The most competitive local market in the country. In NYC, you're not just competing with the shop next door — you're competing with thousands of businesses fighting for the same eyeballs. If your website isn't optimized for local search, Google Maps, and mobile-first experiences, you're invisible to the exact customers walking past your door every day. The businesses dominating NYC search results didn't get there by accident. They invested in SEO and digital marketing while their competitors were still relying on word-of-mouth and hope.",
  },
  {
    title: "Long Island",
    color: "#0d9488",
    content:
      "Nassau and Suffolk County represent one of the most underserved digital marketing markets in the tri-state area. Suburban consumers search differently than urban ones — they plan ahead, they comparison shop, and they read reviews religiously. Most Long Island businesses are still running on outdated websites and zero SEO strategy, which means the opportunity is massive. The first businesses to dominate Long Island local search are going to lock in a competitive advantage that takes years to overcome. That window is closing fast as national franchises pour money into programmatic local SEO.",
  },
  {
    title: "Westchester County",
    color: "#0f766e",
    content:
      "Affluent buyers with high expectations. Westchester consumers don't just search — they vet. They check your website, your reviews, your social media, and your competitors before they ever pick up the phone. If your digital presence doesn't communicate authority, professionalism, and trust, you're losing to the competitor who invested in theirs. The average customer lifetime value in Westchester is significantly higher than the NYC metro average, which means every lead you lose to a competitor with a better website is worth thousands in lost revenue.",
  },
];

export default function WhyNYC() {
  return (
    <section className="py-20 sm:py-28 bg-teal-50 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-[128px] animate-blob" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-[128px] animate-blob animation-delay-2000" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Why Businesses Need Marketing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 font-heading">
            Why Every New York City Business Needs a{" "}
            <span className="text-teal-600">Marketing Company in 2026</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto leading-relaxed">
            The New York metro area is the most competitive local market in the
            United States. Consumer behavior in 2026 has shifted permanently —
            AI-powered search, voice assistants, and mobile-first browsing mean
            your business is being evaluated in seconds. If your digital
            presence isn&apos;t engineered for how people search today, you&apos;re
            hemorrhaging revenue to competitors who figured it out first.
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.value}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm"
            >
              <p className="text-3xl sm:text-4xl font-extrabold text-teal-600 mb-2 font-mono">
                {stat.value}
              </p>
              <p className="text-slate-600 text-xs sm:text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Regional sections */}
        <div className="space-y-12">
          {regions.map((region, i) => (
            <motion.div
              key={region.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 sm:p-10"
            >
              <div
                className="w-12 h-1 rounded-full mb-4"
                style={{ backgroundColor: region.color }}
              />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 font-heading">
                {region.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">{region.content}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-slate-600 text-lg mb-6 max-w-2xl mx-auto">
            The market isn&apos;t slowing down. Your competitors aren&apos;t
            waiting. The question isn&apos;t whether you need digital marketing —
            it&apos;s how much longer you can afford to go without it.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
          >
            Get Your Free Market Analysis
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
