"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const liveMetrics = [
  {
    value: "$165 → $245",
    label: "Avg Ticket",
    sub: "+48% in under 6 months",
  },
  {
    value: "17",
    label: "Email Leads / 2 hr",
    sub: "auto-engaged by Selena",
  },
  {
    value: "$2,800+",
    label: "Zelle / 2 hr",
    sub: "IMAP-parsed, queued for match",
  },
  {
    value: "100%",
    label: "Attribution",
    sub: "Visit → text → book closed",
  },
  {
    value: "160+",
    label: "Recurring Bookings",
    sub: "moved in a single push",
  },
  {
    value: "9",
    label: "Team Members",
    sub: "GPS-validated, hands-off",
  },
  {
    value: "80+",
    label: "EMD Domains",
    sub: "feeding leads, $0 ad spend",
  },
  {
    value: "0",
    label: "Front Desk",
    sub: "Selena answers everything",
  },
];

const liveEvidence = [
  {
    icon: "📞",
    title: "Website → Sale",
    body: "Cymbre Colon (Rego Park) — 💬 texted from thenycmaid.com 6 hr ago → booked Deep Cleaning May 2 at 100% attribution.",
  },
  {
    icon: "💰",
    title: "Apple Pay $177 — auto-matched",
    body: "Mike Johnson · Standard Cleaning Apr 26 · paid via Apple Pay · auto-matched to booking · job closed by admin in one click.",
  },
  {
    icon: "📨",
    title: "New Email Lead — Selena engaging",
    body: "Catherine Miller · catherine.millernic@outlook.com · cold inbound email, auto-classified as new lead, Selena replied without human touch.",
  },
  {
    icon: "📅",
    title: "Series Updated — 87 bookings in one push",
    body: "Brian Klig · 87 forward bookings updated from Fri May 1 · recurring engine + Gabriela López notified push ✓ + SMS ✓ in seconds.",
  },
  {
    icon: "💵",
    title: "Zelle $260 — needs manual match",
    body: "Jonathan Epstein · auto-detected by IMAP email monitor · queued for one-click admin match · cleaner waiting on payout.",
  },
  {
    icon: "🚨",
    title: "Schedule conflict caught automatically",
    body: "Karina got double-booked May 1 — system flagged the overlap before either client got an SMS. Resolved in admin in 30 seconds.",
  },
];

export default function FocusPartner() {
  return (
    <section className="bg-slate-900 py-20 sm:py-28 px-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="font-mono text-xs tracking-[0.25em] uppercase text-teal-400 mb-4">
            Our Focus Partner
          </p>
          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
            <span className="text-teal-400">The NYC Maid</span> wasn&apos;t a customer.
            <br className="hidden sm:block" /> It was the test bed.
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Full Loop CRM was built by running a live home-cleaning company in
            New York City. Every feature you see — Selena AI, GPS field ops,
            Stripe Connect crew payouts, Zelle/Venmo IMAP parsing, multi-domain
            SEO, recurring engine — was built, broken, fixed, and shipped while
            running real bookings for real clients with real cleaners and real
            payments.
          </p>
          <p className="mt-6 text-base text-slate-400 max-w-2xl mx-auto">
            Today <strong className="text-white">The NYC Maid</strong> runs
            itself. The same engine you license is the one running this
            business <em>right now</em>.
          </p>
        </motion.div>

        {/* Big metric grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14"
        >
          {liveMetrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-center"
            >
              <p className="font-heading text-2xl sm:text-3xl font-extrabold text-teal-400 leading-tight">
                {m.value}
              </p>
              <p className="mt-2 font-cta text-xs uppercase tracking-widest text-slate-200">
                {m.label}
              </p>
              <p className="mt-1 text-xs text-slate-500">{m.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Live evidence feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl border border-teal-700/50 bg-slate-950/60 p-6 sm:p-10"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <p className="font-mono text-xs tracking-[0.2em] uppercase text-teal-400 mb-1">
                Live Notification Feed · captured 2026-04-27
              </p>
              <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white">
                What&apos;s actually firing right now.
              </h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/40 px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-mono text-xs tracking-wider uppercase text-teal-300">Production</span>
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveEvidence.map((e) => (
              <div
                key={e.title}
                className="rounded-lg border border-slate-700 bg-slate-900 p-4 flex gap-3"
              >
                <span className="text-2xl shrink-0">{e.icon}</span>
                <div>
                  <p className="font-heading text-sm font-bold text-white">{e.title}</p>
                  <p className="mt-1 text-sm text-slate-300 leading-snug">{e.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* The pitch line */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 text-center max-w-3xl mx-auto"
        >
          <p className="font-heading text-2xl sm:text-3xl font-extrabold text-white leading-snug">
            We don&apos;t sell you software we don&apos;t ship in our own business.
          </p>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            If a feature breaks for The NYC Maid, it breaks our cleaning
            company. If a feature pays for itself for The NYC Maid, it ships
            to every Focus Partner. The same engine, the same proof,
            the same loop — just with your trade and your metro.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/case-study/the-nyc-maid"
              className="inline-block rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-cta font-bold px-8 py-4 text-base transition-colors"
            >
              Read the full case study
            </Link>
            <Link
              href="/crm-partnership-request-form"
              className="inline-block rounded-lg border border-slate-600 hover:border-teal-400 text-slate-200 hover:text-teal-400 font-cta font-bold px-8 py-4 text-base transition-colors"
            >
              Become a Focus Partner in your trade
            </Link>
          </div>
          <p className="mt-6 text-xs font-mono text-slate-500 tracking-wide">
            One Focus Partner per trade per metro. Once claimed, off the board.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
