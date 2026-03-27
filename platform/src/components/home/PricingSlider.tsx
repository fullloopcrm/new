"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const included = [
  { label: "Full CRM Platform", href: "/full-loop-crm-service-features" },
  { label: "Selenas AI Assistant", href: "/full-loop-crm-service-features" },
  { label: "GMB Optimization", href: null },
  { label: "SEO Strategy & Structure", href: null },
  { label: "AI Sales & Booking", href: "/full-loop-crm-service-features" },
  { label: "Scheduling & Dispatch", href: null },
  { label: "GPS Field Operations", href: "/full-loop-crm-service-features" },
  { label: "Payments & Invoicing", href: null },
  { label: "Review Automation", href: "/full-loop-crm-service-features" },
  { label: "Retargeting & Rebooking", href: null },
  { label: "Command Center Dashboard", href: null },
  { label: "Team & Client Portals", href: null },
  { label: "Finance & P&L Tracking", href: null },
  { label: "Exclusive Territory Lock", href: "/full-loop-crm-pricing" },
  { label: "100% Autonomous Mode", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
];

const buyoutSchedule = [
  { year: "Buy Now", price: "$5,000" },
  { year: "Later Buyout", price: "$20,000+" },
];

export default function PricingSlider() {
  return (
    <section className="bg-white py-20 sm:py-28 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Home Service CRM Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
            Every Plan Gets Everything.{" "}
            <span className="text-teal-600">Full Loop.</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
            No upsells. No hidden fees. No feature gates. Every{" "}
            <Link href="/full-loop-crm-101-educational-tips" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">home service CRM</Link>{" "}
            tier gets the complete platform. The only difference is team size. View our full{" "}
            <Link href="/full-loop-crm-pricing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">pricing guide</Link>.
          </p>
        </motion.div>

        {/* Pricing Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8"
        >
          <p className="text-center text-sm text-slate-500 mb-6 font-cta">$999 one-time setup fee &mdash; same for every tier</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Starter", price: "$199", period: "/mo", desc: "Solo operator", team: "1 team member" },
              { name: "Growth", price: "$499", period: "/mo", desc: "$100K–$250K revenue", team: "Up to 5 members" },
              { name: "Pro", price: "$999", period: "/mo", desc: "$250K–$1M revenue", team: "Unlimited members", highlighted: true },
              { name: "Enterprise", price: "Get Pricing", period: "", desc: "$1M+ revenue", team: "Unlimited + multi-location" },
            ].map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border-2 p-6 text-center ${
                  tier.highlighted
                    ? "border-teal-600 bg-white shadow-lg scale-[1.02]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                {tier.highlighted && (
                  <span className="inline-block mb-2 rounded-full bg-teal-600 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                    Most Popular
                  </span>
                )}
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider font-cta">{tier.name}</p>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono mt-2">
                  {tier.price}
                  <span className="text-lg text-slate-400 font-medium">{tier.period}</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">{tier.desc}</p>
                <p className="text-teal-600 text-sm font-medium mt-3">{tier.team}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">No contracts. Month to month. Cancel anytime.</p>
        </motion.div>

        {/* Included features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-2xl border-2 border-teal-600 bg-white shadow-lg p-6 sm:p-10 mb-8"
        >
          <div className="text-center mb-6">
            <p className="text-slate-700 text-base leading-relaxed max-w-2xl mx-auto">
              The complete{" "}
              <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">autonomous field service CRM</Link>{" "}
              &mdash; AI-powered lead conversion, automated scheduling, GPS field ops, payments, review management, retargeting, and full business analytics.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <p className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase mb-5 font-cta">
              Every Tier Gets Everything
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {included.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2 text-sm text-teal-700 border border-teal-200 rounded-full bg-teal-50 font-medium hover:bg-teal-100 hover:border-teal-300 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    className="px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-full bg-slate-50 font-medium"
                  >
                    {item.label}
                  </span>
                )
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block px-10 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Get Started
            </Link>
          </div>
        </motion.div>

        {/* Add-Ons Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Microsites */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8"
          >
            <p className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase mb-2 font-cta">
              Microsite Network
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono leading-none mb-1">
              $500
              <span className="text-lg text-slate-400 font-medium">/site</span>
            </div>
            <p className="text-slate-500 text-sm mb-4">
              $500 build + $99/yr. You own the domain.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Neighborhood-specific EMD websites built for local SEO. We choose the domain, we build it our way, you own it outright. Each site targets hyper-local keywords in your service area.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">&#10003;</span>
                <span>EMD domain optimized for local search</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">&#10003;</span>
                <span>You own the domain &mdash; yours forever</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">&#10003;</span>
                <span>Tracked in your lead dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-0.5">&#10003;</span>
                <span>$99/yr hosting &amp; maintenance</span>
              </li>
            </ul>
          </motion.div>

          {/* Full SEO Site */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8"
          >
            <p className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase mb-2 font-cta">
              Full SEO Site Build
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono leading-none mb-1">
              Included
            </div>
            <p className="text-slate-500 text-sm mb-4">
              Full Loop owns the site. Optional buyout available.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Enterprise Next.js SEO site with thousands of indexable pages, full local SEO architecture, and automatic Google indexing. Included in your partnership &mdash; leads flow to you exclusively.
            </p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 font-cta">
              Site Buyout Schedule
            </p>
            <div className="space-y-1.5">
              {buyoutSchedule.map((row) => (
                <div
                  key={row.year}
                  className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-1.5"
                >
                  <span>{row.year}</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {row.price}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Buy now for $5,000 or buyout later at $20,000 + 10%/mo compound. You own the site &amp; domain upon buyout.
            </p>
          </motion.div>
        </div>

        {/* Ownership Transparency */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-10 rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8"
        >
          <p className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase mb-4 font-cta">
            Ownership &mdash; 100% Transparent
          </p>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-bold text-slate-900 mb-2">You Own</p>
              <ul className="space-y-1.5 text-slate-600">
                <li>&#10003; Your Telnyx phone number &amp; account</li>
                <li>&#10003; Your Resend email account</li>
                <li>&#10003; Your business name &amp; LLC</li>
                <li>&#10003; Any $500 microsites purchased</li>
                <li>&#10003; Full SEO site (if buyout completed)</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-2">Full Loop Owns</p>
              <ul className="space-y-1.5 text-slate-600">
                <li>&#10003; CRM platform &amp; Selenas AI</li>
                <li>&#10003; Full SEO site &amp; domain (until buyout)</li>
                <li>&#10003; Google Business Profiles we create</li>
                <li>&#10003; All website code &amp; templates</li>
                <li>&#10003; SEO architecture &amp; strategy IP</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            All terms detailed in the partnership agreement. No surprises. No fine print.
          </p>
        </motion.div>

        {/* Bottom link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-8"
        >
          <Link
            href="/full-loop-crm-pricing"
            className="text-teal-600 hover:text-teal-700 text-sm font-semibold underline underline-offset-2 decoration-teal-600/50 font-cta"
          >
            View Full Pricing &amp; Ownership Details
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
