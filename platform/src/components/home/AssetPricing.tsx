"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const assets = [
  {
    name: "Custom Website",
    description: "Next.js site with auto-generated service, area, and hiring pages. Full SEO.",
    buyNow: "$5,000",
    buyNowNote: "Own it from day one",
    included: "Included in your plan",
    includedNote: "We own it, you use it",
    buyout: "$20,000 + 10%/mo",
    buyoutNote: "Reflects SEO equity we build monthly",
  },
  {
    name: "Google Business Profile",
    description: "Setup, verification, optimization, and ongoing management.",
    buyNow: "$999",
    buyNowNote: "One-time — you own it",
    included: "N/A",
    includedNote: "Always a purchase",
    buyout: "$999 + 10%/mo",
    buyoutNote: "If we created it and you leave later",
  },
  {
    name: "EMD Micro Sites",
    description: "One-page exact match domain sites targeting specific neighborhoods.",
    buyNow: "$500 each",
    buyNowNote: "You own the domain",
    included: "$99/yr maintenance",
    includedNote: "Hosting + SEO management",
    buyout: "Already yours",
    buyoutNote: "You own the domain from day one",
  },
  {
    name: "Client Data",
    description: "Your clients, bookings, financial records, and conversation history.",
    buyNow: "Free",
    buyNowNote: "Always yours",
    included: "Free",
    includedNote: "Always yours",
    buyout: "Free CSV export",
    buyoutNote: "No questions asked, anytime",
  },
];

export default function AssetPricing() {
  return (
    <section className="py-20 sm:py-28 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Own It or Use It — Your Choice
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 font-heading">
            Buy Assets Upfront or{" "}
            <span className="text-teal-400">Pay Later If You Leave</span>
          </h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Everything is included in your monthly plan. But if you want to own
            your website or other assets outright, you can buy them anytime. If
            you leave without buying, the buyout reflects the value we&apos;ve built.
          </p>
        </motion.div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-left">
                  <th className="px-6 py-4 text-slate-400 font-semibold font-cta text-xs uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-4 text-teal-400 font-semibold font-cta text-xs uppercase tracking-wider">Buy Now</th>
                  <th className="px-6 py-4 text-slate-400 font-semibold font-cta text-xs uppercase tracking-wider">Included in Plan</th>
                  <th className="px-6 py-4 text-yellow-300 font-semibold font-cta text-xs uppercase tracking-wider">Buyout If You Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {assets.map((asset) => (
                  <tr key={asset.name} className="hover:bg-slate-800/50">
                    <td className="px-6 py-5">
                      <p className="text-white font-bold font-heading">{asset.name}</p>
                      <p className="text-slate-400 text-xs mt-1">{asset.description}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-teal-400 font-bold">{asset.buyNow}</p>
                      <p className="text-slate-500 text-xs mt-1">{asset.buyNowNote}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-white font-medium">{asset.included}</p>
                      <p className="text-slate-500 text-xs mt-1">{asset.includedNote}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-yellow-300 font-bold">{asset.buyout}</p>
                      <p className="text-slate-500 text-xs mt-1">{asset.buyoutNote}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-4">
          {assets.map((asset) => (
            <div key={asset.name} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <h3 className="text-white font-bold font-heading text-lg mb-1">{asset.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{asset.description}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Buy Now</span>
                  <div className="text-right">
                    <p className="text-teal-400 font-bold">{asset.buyNow}</p>
                    <p className="text-slate-500 text-xs">{asset.buyNowNote}</p>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">In Plan</span>
                  <div className="text-right">
                    <p className="text-white font-medium">{asset.included}</p>
                    <p className="text-slate-500 text-xs">{asset.includedNote}</p>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-400 text-xs uppercase tracking-wider">Buyout</span>
                  <div className="text-right">
                    <p className="text-yellow-300 font-bold">{asset.buyout}</p>
                    <p className="text-slate-500 text-xs">{asset.buyoutNote}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-slate-400 mb-6">
            Read the full terms in our{" "}
            <Link href="/agreement" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">
              Partnership Agreement
            </Link>
            . Plain language, no legalese.
          </p>
          <Link
            href="/full-loop-crm-pricing"
            className="inline-block px-8 py-4 text-base font-bold text-slate-900 rounded-lg bg-teal-400 hover:bg-teal-300 transition-colors font-cta"
          >
            View All Plans
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
