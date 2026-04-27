"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const steps = [
  {
    stage: "Stage 1",
    title: "Lead Created",
    desc: "Organic SEO across a multi-domain network sends high-intent traffic to the site. Every visit is tagged with source domain, landing page, search query, and referrer — so you know exactly which property converted which lead.",
    reality: "Most CRMs start the moment a lead exists. Full Loop starts by creating them. No ad spend, no Thumbtack tax — just neighborhood-specific domains that rank organically and feed your CRM.",
    proof: "Cymbre Colon hit thenycmaid.com from a Rego Park search → texted in 6 hours later → booked Deep Cleaning May 2 → 100% attributed to source domain.",
    benefit: "Lower cost per lead that compounds over time.",
  },
  {
    stage: "Stage 2",
    title: "Sale Made",
    desc: "Selena AI engages every inbound lead — SMS, web chat, AND inbound email — within seconds. 17-intent state-machine collects 10 fields (service, bedrooms, day, time, name, phone, address, email, notes), recognizes returning clients, escalates to a human only when she should.",
    reality: "<60-second response times convert 7× higher than >5min (HBR study). Selena does it 24/7, bilingual EN/ES, while you sleep. Email leads that other CRMs ignore? She handles those too — no other product on the market does.",
    proof: "Live at nycmaid: Selena auto-engaging 10+ inbound email leads per hour right now. Allison Thacker booked Deep Cleaning May 29 via SMS — zero human touch.",
    benefit: "Faster response time. Higher close rate. No missed leads after-hours.",
  },
  {
    stage: "Stage 3",
    title: "Scheduled + Dispatched",
    desc: "Smart-schedule scores every available crew member against the new booking — zone match, travel time, job clustering, client history, preference, car requirement, home-by-time. The right person gets assigned automatically. Recurring schedules generate forward bookings on a cron.",
    reality: "Double-bookings and bad assignments kill margins. The scoring engine and 7 recurring patterns (daily, weekly, bi-weekly, tri-weekly, monthly-by-date, monthly-by-weekday, custom) keep the calendar tight without manual dispatching.",
    proof: "Live at nycmaid: 160+ recurring bookings updated in one push (Brian Klig 87 + Natalie Pita 46 + Elaine Krauss 10 + Joyce 7 + Svetlana Goubanova 10) — Gabriela López notified push ✓ + SMS ✓ in seconds.",
    benefit: "Fewer no-shows. Tighter routes. More jobs per day.",
  },
  {
    stage: "Stage 4",
    title: "Job Completed",
    desc: "Crew checks in via mobile portal — GPS coordinates validated within 528 feet of the address. Before-photo video, work, after-photo video. 15-minute heads-up button SMSes admin with amount due + crew take. Half-hour rounding with 10-min grace handles billing automatically.",
    reality: "GPS-verified means no time theft, no fake check-ins, no end-of-week disputes. Videos prove the job was done if a client ever pushes back. Bilingual SMS (EN/ES same message) keeps the whole crew aligned.",
    proof: "Live at nycmaid: late check-in cron catches a delayed crew within 5 minutes. Schedule conflict alert triggered when Karina got double-booked May 1 — caught before the customer noticed.",
    benefit: "Complete field visibility. Verifiable proof of service. No payroll arguments.",
  },
  {
    stage: "Stage 5",
    title: "Payment Collected",
    desc: "Stripe + Stripe Connect handles cards, Apple Pay, payment links — and auto-pays the crew the moment a job is marked complete. IMAP email monitor parses Zelle / Venmo / Cash App receipts every minute and matches them to bookings. Tips detected automatically.",
    reality: "Real clients pay however they want. Full Loop tracks every method in one place AND automates crew payouts on the same cycle. No other field-service CRM does the IMAP payment-parsing piece — it's a bespoke build.",
    proof: "Live at nycmaid: $177 Apple Pay from Mike Johnson auto-matched, job closed. $2,800+ in Zelle parsed in 2 hours from 11 different senders, queued for match — crew waiting on payouts.",
    benefit: "Real-time payment status. Crew paid automatically. No spreadsheet guessing.",
  },
  {
    stage: "Stage 6",
    title: "Review Captured",
    desc: "Post-job follow-up cron sends a review request via SMS + email 24 hours after every completed job. 10% rebooking discount baked into the message. Negative sentiment detected before the review goes public — Selena escalates the conversation to a phone call.",
    reality: "Reviews are local-search oxygen. Most operators chase them manually and forget. Full Loop automates the ask, catches angry clients before they 1-star you, and auto-replies to Google reviews via the synced GMB integration.",
    proof: "Live at nycmaid: post-job-followup cron firing every job complete. Auto-reply-reviews cron syncs Google reviews daily. Negative sentiment routed to private resolution flow before going public.",
    benefit: "More reviews. Better rankings. Bad reviews caught early.",
  },
  {
    stage: "Stage 7",
    title: "Retargeted",
    desc: "Lifecycle cron scores every client (active / at-risk / churned) based on booking frequency. Win-back campaigns target the at-risk segment automatically. Referral program tracks every referrer code, calculates 10% commission on first booking, and processes payouts.",
    reality: "Acquiring a new client costs 5× more than keeping one. The retargeting engine makes sure no client slips through. Referrers turn your best customers into your sales team.",
    proof: "Live at nycmaid: lifecycle cron flagging churn risk daily. Win-back SMS sent to at-risk clients with personalized offer. Referral commissions paid via Zelle with one-click admin approval.",
    benefit: "Higher retention. More referrals. Compounding growth.",
  },
];

export default function Process() {
  return (
    <section className="py-20 sm:py-28 bg-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            What This Actually Does
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Lead → Sale → Schedule → Job → Pay → Review → Rebook.{" "}
            <span className="text-teal-600">All Of It. Automated.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto mb-6">
            This is the same loop that runs <strong className="text-slate-900">The NYC Maid</strong> — a live home-cleaning operation in NYC — right now, every day, hands-off. Below is exactly what happens at each stage, with the actual evidence from the live system.
          </p>
          <p className="text-xs font-mono uppercase tracking-widest text-teal-700 max-w-2xl mx-auto">
            Live proof from thenycmaid.com production · captured 2026-04-27
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: Timeline — 70% */}
          <div className="lg:w-[70%]">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-teal-300" />

              <div className="space-y-10">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.stage}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="relative pl-14"
                  >
                    {/* Dot */}
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xs font-mono">{i + 1}</span>
                    </div>

                    <div>
                      <span className="text-teal-600 text-xs font-bold tracking-[0.1em] uppercase font-cta">{step.stage}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 mb-2 font-heading">
                        {step.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed mb-3">{step.desc}</p>

                      {/* Reality check */}
                      <div className="rounded-lg bg-white border border-slate-200 p-4 mb-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 font-cta">Why It Matters</p>
                        <p className="text-slate-600 text-sm leading-relaxed">{step.reality}</p>
                      </div>

                      {/* Live proof from nycmaid */}
                      <div className="rounded-lg bg-slate-900 border border-teal-700 p-4 mb-2">
                        <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1 font-cta font-mono">Live at nycmaid</p>
                        <p className="text-slate-200 text-sm leading-relaxed">{step.proof}</p>
                      </div>

                      {/* Benefit */}
                      <p className="text-teal-600 text-xs font-semibold font-cta">
                        Result: {step.benefit}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Sidebar — 30% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-[30%]"
          >
            <div className="lg:sticky lg:top-32 space-y-6">
              {/* Why Full Loop */}
              <div className="rounded-xl bg-white border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-4 font-heading">Why Full Loop CRM</h4>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Built by operators with 20+ years in home services
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Exclusive territory protection</Link> — one partner per trade per metro
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    Organic lead gen included — no ad spend required
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    All 7 stages in one platform — no integrations needed
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-600 shrink-0">&#x2713;</span>
                    <Link href="/full-loop-crm-101-educational-tips" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Real consulting guidance</Link>, not just software
                  </li>
                </ul>
              </div>

              {/* What makes us different */}
              <div className="rounded-xl bg-slate-900 border border-slate-700 p-6">
                <h4 className="text-sm font-bold text-white mb-4 font-heading">What Other CRMs Don&apos;t Do</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Generate your leads for you
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Protect your territory from competitors
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Manage payroll and P&L in-platform
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Provide hands-on consulting from industry veterans
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Build your SEO and review reputation automatically
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 shrink-0">&#x2717;</span>
                    Close the loop from lead to retention
                  </li>
                </ul>
              </div>

              {/* Industries */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 font-heading">Built for Home Service Trades</h4>
                <p className="text-slate-600 text-sm leading-relaxed mb-3">
                  Full Loop CRM is purpose-built for the trades that run on reputation and repeat business:
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>&bull; Cleaning &amp; maid services</li>
                  <li>&bull; HVAC, plumbing &amp; electrical</li>
                  <li>&bull; Pest control &amp; extermination</li>
                  <li>&bull; Landscaping &amp; lawn care</li>
                  <li>&bull; Junk removal &amp; hauling</li>
                </ul>
                <p className="text-slate-700 text-sm font-semibold mt-3">
                  <Link href="/full-loop-crm-service-business-industries" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">See all industries we serve</Link>
                </p>
              </div>

              {/* CTA */}
              <Link
                href="/crm-partnership-request-form"
                className="block w-full text-center px-6 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
              >
                Check Territory Availability
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
