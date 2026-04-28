"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const otherAgencies = [
  "Lock you into 12-month contracts so you're stuck whether they deliver or not.",
  "Report vanity metrics — impressions, clicks, 'brand awareness' — that don't mean anything to your bottom line.",
  "Use cookie-cutter strategies recycled for every client regardless of industry, market, or competition.",
  "Outsource your work overseas to the lowest bidder, then mark it up 5x.",
  "Disappear after the contract is signed. Good luck getting your account manager on the phone.",
  "Charge you for 'strategy' that's really a template they pulled from a blog post.",
];

const consortiumDoes = [
  "Month-to-month. No contracts. We earn your business every single month. If we're not delivering, you walk. Simple.",
  "Transparent pricing: $4,600 for a custom website, $950/mo for SEO. No hidden fees, no surprise invoices.",
  "Custom strategies built for YOUR neighborhood, YOUR market, YOUR competitors. No two local businesses get the same playbook.",
  "Every project is handled by our NYC-based team. The people in your strategy call are the ones doing the work for your business.",
  "Dedicated account manager. Weekly updates. We're always available because that's what real partners do for local businesses.",
  "Real results for real small businesses — plumbers, dentists, restaurants, law firms. We know what works in the NYC city.",
];

export default function NotLikeOthers() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Company Comparison
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Why NYC Businesses Choose{" "}
            <span className="text-[#1F4D2C]">Consortium NYC Over Other Marketing Agencies</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            See why local businesses across Manhattan, Brooklyn, Queens, and Long Island choose a <Link href="/about-marketing-company-consortium-nyc" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">transparent marketing company</Link> with no contracts, no hidden fees, and <Link href="/nyc-marketing-pricing-guide" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">simple pricing</Link>.
          </p>
        </motion.div>

        {/* Two columns */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Left — Other agencies */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl bg-red-50 border border-slate-200 p-8"
          >
            <h3 className="text-xl font-bold text-red-500 mb-6 uppercase tracking-wider">
              What Most Agencies Do
            </h3>
            <ul className="space-y-5">
              {otherAgencies.map((item, i) => (
                <li key={i} className="flex gap-3 text-[#3A3A3A]">
                  <span className="text-red-500 mt-1 shrink-0">&#x2717;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right — Consortium */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl bg-[#F4F4F1] border border-slate-200 p-8"
          >
            <h3 className="text-xl font-bold text-[#1F4D2C] mb-6 uppercase tracking-wider">
              What Consortium Does
            </h3>
            <ul className="space-y-5">
              {consortiumDoes.map((item, i) => (
                <li key={i} className="flex gap-3 text-[#3A3A3A]">
                  <span className="text-[#1F4D2C] mt-1 shrink-0">&#x2713;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-[#3A3A3A] text-lg mb-8 leading-relaxed">
            You&apos;ve been burned by agencies before. We get it. That&apos;s
            exactly why we built Consortium for local businesses like yours
            &mdash; transparent pricing, no contracts, no excuses, no hiding
            behind jargon. $4,600 for a website. $950/mo for SEO. That&apos;s
            it. If you&apos;re tired of paying for promises and ready to see
            real leads from real customers in your area, let&apos;s talk.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-[#1C1C1C] rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg shadow-teal-600/25 font-cta"
          >
            See the Difference &mdash; Book a Free Call
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
