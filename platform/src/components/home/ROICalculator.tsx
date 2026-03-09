"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const features = [
  {
    title: "Organic Search Domination",
    description:
      "Every site built for Google, Yahoo, Bing, DuckDuckGo — engineered to rank for hyper-local service keywords in your territory.",
    icon: "🔍",
  },
  {
    title: "AI Search Optimized",
    description:
      "Structured for ChatGPT, Claude, Google AI Overviews, Perplexity. When AI recommends a service in your area, it recommends you.",
    icon: "🤖",
  },
  {
    title: "Multi-Domain Network",
    description:
      "Not one generic website. A network of neighborhood-specific domains that each rank independently — dominating your local market.",
    icon: "🌐",
  },
  {
    title: "Zero Ad Spend Required",
    description:
      "No Google Ads. No Thumbtack. No Yelp. Your domains generate organic traffic. Free leads, forever.",
    icon: "🚫",
  },
];

export default function ROICalculator() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Your Lead Engine
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Your Website Network.{" "}
            <span className="text-teal-600">Built to Dominate.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto mb-3">
            Websites are not included in the{" "}
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              platform license
            </Link>{" "}
            — they&apos;re built separately, because each one is a custom asset
            designed for your market.
          </p>
          <p className="text-teal-600 text-xl font-bold font-heading">
            $500 – $1,000 per site — Fully built, SEO-optimized, yours forever
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              initial={{ scale: 0.95 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="bg-teal-50 rounded-xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0">{feature.icon}</span>
                <div>
                  <h3 className="text-slate-900 font-bold text-lg mb-2 font-heading">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison Box */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="rounded-2xl bg-teal-50 border border-slate-200 shadow-sm p-8 md:p-12"
        >
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-8 font-heading">
            Traditional Lead Gen vs. Full Loop Website Network
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Traditional */}
            <div className="bg-white rounded-xl p-6 border border-red-200 shadow-sm">
              <div className="text-center mb-4">
                <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-1">
                  Traditional
                </p>
                <p className="text-slate-900 text-3xl font-bold font-mono">
                  $18,000 – $42,000
                  <span className="text-slate-400 text-base font-normal">
                    /yr
                  </span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✕</span>
                  <span>Recurring ad spend — Google Ads, Yelp, Thumbtack</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✕</span>
                  <span>Leads stop the moment you stop paying</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✕</span>
                  <span>You own nothing — renting visibility</span>
                </li>
              </ul>
            </div>

            {/* Full Loop */}
            <div className="bg-white rounded-xl p-6 border border-teal-300 shadow-sm ring-2 ring-teal-500/20">
              <div className="text-center mb-4">
                <p className="text-teal-600 text-sm font-semibold uppercase tracking-wider mb-1">
                  Full Loop Website Network
                </p>
                <p className="text-teal-600 text-3xl font-bold font-mono">
                  $5,000 – $10,000
                  <span className="text-slate-400 text-base font-normal">
                    {" "}
                    one-time
                  </span>
                </p>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5">✓</span>
                  <span>You own every domain and website forever</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5">✓</span>
                  <span>Organic leads never stop — no ad spend needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-500 mt-0.5">✓</span>
                  <span>
                    SEO + AI search optimized for your home service CRM
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-12"
        >
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block px-10 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Request Your Website Network
            </Link>
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="inline-block px-8 py-4 rounded-full border-2 border-teal-600 text-teal-600 font-bold text-lg hover:bg-teal-50 transition-colors font-cta"
            >
              Learn How It Works
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
