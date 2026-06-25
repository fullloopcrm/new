"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const included = [
  { label: "Full CRM Platform", href: "/full-loop-crm-service-features" },
  { label: "Yinez AI Assistant", href: "/full-loop-crm-service-features" },
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
  { label: "Exclusive Territory Lock", href: "/waitlist" },
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
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Home Service CRM Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
            $1,000 per user.{" "}
            <span className="text-[#1F4D2C]">Every feature.</span>
          </h2>
          <p className="mt-4 text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            No tiers. No feature gates. No revenue caps. Flat per-user pricing
            for the full{" "}
            <Link href="/full-loop-crm-101-educational-tips" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">home service CRM</Link>{" "}
            platform. Add a seat, your invoice goes up. Remove a seat, it goes
            down. View the full{" "}
            <Link href="/waitlist" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">pricing guide</Link>.
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
          <p className="text-center text-sm text-[#6F6F6B] mb-6 font-cta">$999 one-time setup &mdash; flat per-user thereafter</p>

          {/* Single price card */}
          <div className="mx-auto max-w-md rounded-2xl border-2 border-[#1F4D2C] bg-white shadow-lg p-8 text-center mb-8">
            <p className="text-sm font-semibold text-[#1F4D2C] uppercase tracking-wider font-cta mb-2">
              Per user / per month
            </p>
            <div className="text-5xl sm:text-6xl font-extrabold text-slate-900 font-mono">
              $1,000
              <span className="text-xl text-[#6F6F6B] font-medium">/user/mo</span>
            </div>
            <p className="text-[#6F6F6B] text-sm mt-3">
              Every feature. Every seat. No upgrades, no add-on shelf, no caps.
            </p>
          </div>

          {/* Seat math */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 font-semibold text-[#1C1C1C]">Team size</th>
                  <th className="px-4 py-2.5 font-semibold text-[#1C1C1C] text-right">Users</th>
                  <th className="px-4 py-2.5 font-semibold text-[#1C1C1C] text-right">Per month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { label: "Solo operator", users: 1 },
                  { label: "Small crew", users: 3 },
                  { label: "Standard team", users: 5 },
                  { label: "Mid-size", users: 10 },
                  { label: "Multi-crew", users: 25 },
                ].map(({ label, users }) => (
                  <tr key={users}>
                    <td className="px-4 py-2.5 text-[#1C1C1C]">{label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[#6F6F6B]">{users}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-900">${(users * 1000).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm text-[#6F6F6B] mt-4">No contracts. Month to month. Cancel anytime.</p>
        </motion.div>

        {/* Included features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="rounded-2xl border-2 border-[#1F4D2C] bg-white shadow-lg p-6 sm:p-10 mb-8"
        >
          <div className="text-center mb-6">
            <p className="text-[#1C1C1C] text-base leading-relaxed max-w-2xl mx-auto">
              The complete{" "}
              <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">autonomous field service CRM</Link>{" "}
              &mdash; AI-powered lead conversion, automated scheduling, GPS field ops, payments, review management, retargeting, and full business analytics.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <p className="text-[#1F4D2C] text-xs font-semibold tracking-[0.15em] uppercase mb-5 font-cta">
              Every Tier Gets Everything
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {included.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="px-4 py-2 text-sm text-[#1F4D2C] border border-teal-200 rounded-full bg-[#F4F4F1] font-medium hover:bg-teal-100 hover:border-[#1F4D2C] transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    className="px-4 py-2 text-sm text-[#1C1C1C] border border-slate-200 rounded-full bg-slate-50 font-medium"
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
              href="/waitlist"
              className="inline-block px-10 py-4 text-base font-bold text-white rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
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
            <p className="text-[#1F4D2C] text-xs font-semibold tracking-[0.15em] uppercase mb-2 font-cta">
              Microsite Network
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono leading-none mb-1">
              $500
              <span className="text-lg text-[#6F6F6B] font-medium">/site</span>
            </div>
            <p className="text-[#6F6F6B] text-sm mb-4">
              $500 build + $99/yr. You own the domain.
            </p>
            <p className="text-[#3A3A3A] text-sm leading-relaxed mb-4">
              Neighborhood-specific EMD websites built for local SEO. We choose the domain, we build it our way, you own it outright. Each site targets hyper-local keywords in your service area.
            </p>
            <ul className="space-y-2 text-sm text-[#3A3A3A]">
              <li className="flex items-start gap-2">
                <span className="text-[#1F4D2C] mt-0.5">&#10003;</span>
                <span>EMD domain optimized for local search</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1F4D2C] mt-0.5">&#10003;</span>
                <span>You own the domain &mdash; yours forever</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1F4D2C] mt-0.5">&#10003;</span>
                <span>Tracked in your lead dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1F4D2C] mt-0.5">&#10003;</span>
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
            <p className="text-[#1F4D2C] text-xs font-semibold tracking-[0.15em] uppercase mb-2 font-cta">
              Full SEO Site Build
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono leading-none mb-1">
              Included
            </div>
            <p className="text-[#6F6F6B] text-sm mb-4">
              Full Loop owns the site. Optional buyout available.
            </p>
            <p className="text-[#3A3A3A] text-sm leading-relaxed mb-4">
              Enterprise Next.js SEO site with thousands of indexable pages, full local SEO architecture, and automatic Google indexing. Included in your partnership &mdash; leads flow to you exclusively.
            </p>
            <p className="text-xs font-semibold text-[#6F6F6B] uppercase tracking-wider mb-2 font-cta">
              Site Buyout Schedule
            </p>
            <div className="space-y-1.5">
              {buyoutSchedule.map((row) => (
                <div
                  key={row.year}
                  className="flex justify-between text-sm text-[#3A3A3A] border-b border-slate-100 pb-1.5"
                >
                  <span>{row.year}</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {row.price}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#6F6F6B] mt-3">
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
          <p className="text-[#1F4D2C] text-xs font-semibold tracking-[0.15em] uppercase mb-4 font-cta">
            Ownership &mdash; 100% Transparent
          </p>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-bold text-slate-900 mb-2">You Own</p>
              <ul className="space-y-1.5 text-[#3A3A3A]">
                <li>&#10003; Your Telnyx phone number &amp; account</li>
                <li>&#10003; Your Resend email account</li>
                <li>&#10003; Your business name &amp; LLC</li>
                <li>&#10003; Any $500 microsites purchased</li>
                <li>&#10003; Full SEO site (if buyout completed)</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-slate-900 mb-2">Full Loop Owns</p>
              <ul className="space-y-1.5 text-[#3A3A3A]">
                <li>&#10003; CRM platform &amp; Yinez AI</li>
                <li>&#10003; Full SEO site &amp; domain (until buyout)</li>
                <li>&#10003; Google Business Profiles we create</li>
                <li>&#10003; All website code &amp; templates</li>
                <li>&#10003; SEO architecture &amp; strategy IP</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-[#6F6F6B] mt-4">
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
            href="/waitlist"
            className="text-[#1F4D2C] hover:text-[#1F4D2C] text-sm font-semibold underline underline-offset-2 decoration-teal-600/50 font-cta"
          >
            View Full Pricing &amp; Ownership Details
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
