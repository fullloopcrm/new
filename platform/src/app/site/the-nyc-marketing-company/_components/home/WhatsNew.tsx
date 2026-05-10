// @ts-nocheck
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const capabilities = [
  {
    label: "Sales — New Leads",
    items: [
      "Walks new leads through a 10-item booking checklist — service type, bedrooms, bathrooms, rate, day, time, name, phone, address, notes",
      "Checks real availability before confirming a time",
      "Does the full recap with arrival buffer (30 min weekday, 60 min weekend)",
      "Creates the client record and pending booking in the database",
      "Admin gets notified immediately",
      "Asks for a 1–5 chat rating at close",
      "Every message transcribed to the client account",
    ],
  },
  {
    label: "Sales — Returning Clients",
    items: [
      "Recognizes them by phone number instantly",
      "Pre-fills checklist with name, address, email, last rate",
      "Pulls full profile — preferred cleaner, booking history, past conversations, notes",
      "Skips questions she already has answers to",
      "4 messages to rebook instead of 10",
    ],
  },
  {
    label: "Customer Service",
    items: [
      "Answers common questions — pricing, supplies, cancellation policy, service area, insurance",
      "Handles rescheduling with real availability check",
      "Enforces cancellation policy (first-time = no cancel, recurring = 7 days notice)",
      "Escalates to admin with full conversation context when something\u2019s outside her scope",
      "Bilingual English/Spanish — auto-detects",
    ],
  },
];

const channels = [
  { name: "Website Chat", desc: "Homepage hero — right under the H1, not buried in a corner" },
  { name: "SMS", desc: "Dedicated number with numbered options for fast replies" },
  { name: "Dedicated Page", desc: "Full SEO + structured data on /chat-with-selena" },
];

const integrations = [
  "Creates and updates client records",
  "Creates pending bookings, prevents duplicates",
  "Tracks every conversation with booking checklist JSON",
  "Full transcript per conversation and per client account",
  "Admin alerts for new leads, bookings, escalations, errors",
  "Checks real cleaner schedules before confirming availability",
  "Every failure notifies admin with conversation ID + stack trace",
];

const dashboardStats = [
  "Total chats & bookings",
  "Conversion rate",
  "Average rating",
  "Average messages per booking",
  "Checklist completion rate",
  "Channel breakdown (SMS vs web)",
  "Most missed checklist fields",
  "Live feed — click any conversation for full transcript + checklist",
];

const comingSoon = [
  "Email channel",
  "Phone/voice calls (live agent)",
  "Post-job follow-up (rating → Google review or feedback link)",
  "30-day retention texts",
  "Waiting list when no availability",
  "Auto-assign cleaners",
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function WhatsNew() {
  return (
    <section className="relative bg-slate-950 border-b border-teal-500/20 overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Header */}
        <motion.div {...fadeUp} className="text-center mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-400 font-cta mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </span>
            What&apos;s New
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-heading leading-tight mb-5">
            Meet Selena — Your AI Employee
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            We just deployed our first AI chatbot — built from scratch, not a template — front-and-center in the hero of a live client site. Not buried in a corner widget. She handles sales and customer service across{" "}
            <span className="text-teal-300 font-semibold">SMS</span> and{" "}
            <span className="text-teal-300 font-semibold">website chat</span>, writes to the database in real time, and every action she takes is tracked. We&apos;ve never seen a chatbot positioned like this.
          </p>
        </motion.div>

        {/* Capabilities */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.label}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-teal-400 font-cta mb-4">
                {cap.label}
              </h3>
              <ul className="space-y-2.5">
                {cap.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
                    <span className="text-teal-500 mt-1 shrink-0">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Where She Lives */}
        <motion.div {...fadeUp} className="mb-14">
          <h3 className="text-xl sm:text-2xl font-bold text-white font-heading mb-6 text-center">
            Where She Lives
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {channels.map((ch) => (
              <div
                key={ch.name}
                className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-center"
              >
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-400 font-cta mb-2">
                  {ch.name}
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">{ch.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Integration + Dashboard — two columns */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          <motion.div
            {...fadeUp}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-teal-400 font-cta mb-4">
              Integration Depth
            </h3>
            <ul className="space-y-2.5">
              {integrations.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
                  <span className="text-teal-500 mt-1 shrink-0">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/[0.03] border border-white/10 rounded-xl p-6"
          >
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-teal-400 font-cta mb-4">
              Admin Dashboard
            </h3>
            <ul className="space-y-2.5">
              {dashboardStats.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-slate-300 leading-relaxed">
                  <span className="text-teal-500 mt-1 shrink-0">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Coming Soon */}
        <motion.div {...fadeUp} className="mb-14">
          <h3 className="text-xl sm:text-2xl font-bold text-white font-heading mb-6 text-center">
            Coming Soon
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {comingSoon.map((item) => (
              <span
                key={item}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 border border-white/10 rounded-full bg-white/[0.03] font-cta"
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...fadeUp} className="text-center">
          <p className="text-slate-400 text-sm mb-5">
            This is what we build. Not templates — real AI employees that run your business.
          </p>
          <p className="text-slate-500 text-xs mb-5 font-cta">
            Selena is a product of{" "}
            <a
              href="https://fullloopcrm.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 decoration-teal-400/50"
            >
              FullLoopCRM.com
            </a>
          </p>
          <Link
            href="/artificial-intelligence-marketing-services-offered"
            className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta"
          >
            See Our AI Services
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
