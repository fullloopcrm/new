"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const assets = [
  {
    name: "Custom Website",
    description: "Next.js site with auto-generated service, area, and hiring pages. Full SEO.",
    buyNow: "Yours",
    buyNowNote: "Owned from day one — no fee",
    included: "We build & host it",
    includedNote: "You own it the whole time",
    buyout: "You keep it",
    buyoutNote: "Site, code & domain go with you",
  },
  {
    name: "Google Business Profile",
    description: "Setup, verification, optimization, and ongoing management.",
    buyNow: "$999",
    buyNowNote: "One-time setup — you own it",
    included: "We manage it",
    includedNote: "Always your profile",
    buyout: "You keep it",
    buyoutNote: "Yours if you leave — no buyout",
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
    <section className="py-20 sm:py-28 bg-[#F4F4F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            You Own It All
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1C1C1C] mb-4 font-heading">
            Everything We Build{" "}
            <span className="text-[#1F4D2C]">Is Yours to Keep</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            Everything we build for you is included in your monthly plan &mdash;
            and it&apos;s yours. Your website, its code, your domain: owned from
            day one, no buyout, no clawback. Cancel anytime and you keep all of it.
          </p>
        </motion.div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="border border-[#C8C5BC] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAF9F5] text-left">
                  <th className="px-6 py-4 text-[#6F6F6B] font-semibold font-cta text-xs uppercase tracking-wider">Asset</th>
                  <th className="px-6 py-4 text-[#1F4D2C] font-semibold font-cta text-xs uppercase tracking-wider">Buy Now</th>
                  <th className="px-6 py-4 text-[#6F6F6B] font-semibold font-cta text-xs uppercase tracking-wider">Included in Plan</th>
                  <th className="px-6 py-4 text-[#1F4D2C] font-semibold font-cta text-xs uppercase tracking-wider">If You Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E2DC]">
                {assets.map((asset) => (
                  <tr key={asset.name} className="hover:bg-[#FAF9F5]">
                    <td className="px-6 py-5">
                      <p className="text-[#1C1C1C] font-bold font-heading">{asset.name}</p>
                      <p className="text-[#6F6F6B] text-xs mt-1">{asset.description}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[#1F4D2C] font-bold">{asset.buyNow}</p>
                      <p className="text-[#6F6F6B] text-xs mt-1">{asset.buyNowNote}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[#1C1C1C] font-medium">{asset.included}</p>
                      <p className="text-[#6F6F6B] text-xs mt-1">{asset.includedNote}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[#1F4D2C] font-bold">{asset.buyout}</p>
                      <p className="text-[#6F6F6B] text-xs mt-1">{asset.buyoutNote}</p>
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
            <div key={asset.name} className="bg-[#FAF9F5] rounded-xl border border-[#C8C5BC] p-5">
              <h3 className="text-[#1C1C1C] font-bold font-heading text-lg mb-1">{asset.name}</h3>
              <p className="text-[#6F6F6B] text-sm mb-4">{asset.description}</p>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[#6F6F6B] text-xs uppercase tracking-wider">Buy Now</span>
                  <div className="text-right">
                    <p className="text-[#1F4D2C] font-bold">{asset.buyNow}</p>
                    <p className="text-[#6F6F6B] text-xs">{asset.buyNowNote}</p>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[#6F6F6B] text-xs uppercase tracking-wider">In Plan</span>
                  <div className="text-right">
                    <p className="text-[#1C1C1C] font-medium">{asset.included}</p>
                    <p className="text-[#6F6F6B] text-xs">{asset.includedNote}</p>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[#6F6F6B] text-xs uppercase tracking-wider">If You Leave</span>
                  <div className="text-right">
                    <p className="text-[#1F4D2C] font-bold">{asset.buyout}</p>
                    <p className="text-[#6F6F6B] text-xs">{asset.buyoutNote}</p>
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
          <p className="text-[#6F6F6B] mb-6">
            Read the full terms in our{" "}
            <Link href="/agreement" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">
              Partnership Agreement
            </Link>
            . Plain language, no legalese.
          </p>
          <Link
            href="/waitlist"
            className="inline-block px-8 py-4 text-base font-bold text-slate-900 rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors font-cta"
          >
            View All Plans
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
