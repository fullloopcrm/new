"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const steps = [
  {
    stage: "Stage 1",
    title: "Lead Gen",
    desc: "Organic SEO across a multi-domain network drives high-intent local traffic to your business — no pay-per-click, no ad spend. Our home service CRM captures every lead from day one.",
    reality: "Most CRMs make you buy leads or run ads. Full Loop generates leads organically through SEO — the same strategy that built our founding company to 10,000+ clients.",
    benefit: "Lower cost per lead that compounds over time.",
  },
  {
    stage: "Stage 2",
    title: "Sales",
    desc: "An AI-powered chatbot qualifies and converts leads 24/7 — answering questions, collecting job details, and moving prospects through your pipeline without lifting a finger.",
    reality: "No more missed calls or slow follow-ups. The field service CRM handles first contact instantly so you never lose a lead to a faster competitor.",
    benefit: "Faster response time. Higher close rate.",
  },
  {
    stage: "Stage 3",
    title: "Scheduling",
    desc: "Automated booking with smart availability syncs your team's calendar, assigns jobs by zone, and sends confirmations and reminders to both your crew and your customer.",
    reality: "Double-bookings and no-shows kill margins. Our all-in-one CRM eliminates scheduling chaos so your field teams stay productive.",
    benefit: "Fewer no-shows. Tighter routes. More jobs per day.",
  },
  {
    stage: "Stage 4",
    title: "Operations",
    desc: "GPS-tracked field team management gives you real-time visibility into every technician, every job, and every route — from dispatch to completion.",
    reality: "You can't manage what you can't see. Full Loop's operations layer replaces guesswork with live data so you can scale confidently.",
    benefit: "Complete field visibility from your phone.",
  },
  {
    stage: "Stage 5",
    title: "Payment",
    desc: "Collection, payroll, and full P&L reporting in one place. Accept payments on-site, automate payroll splits, and see your real profitability per job, per tech, per month.",
    reality: "Most home service businesses don't know their true margins. Full Loop connects revenue to labor costs so every decision is data-driven.",
    benefit: "Real-time P&L. No more spreadsheet guessing.",
  },
  {
    stage: "Stage 6",
    title: "Reviews",
    desc: "Automated feedback and review generation triggers after every completed job — capturing 5-star reviews on Google, Yelp, and the platforms that matter for local SEO.",
    reality: "Reviews are the lifeblood of local search. Our CRM automates the ask so your review count grows on autopilot without awkward follow-ups.",
    benefit: "More reviews. Better rankings. Stronger reputation.",
  },
  {
    stage: "Stage 7",
    title: "Retarget",
    desc: "Re-engage at-risk clients, trigger seasonal reminders, and generate referrals — turning one-time customers into lifetime value and your best source of new business.",
    reality: "Acquiring a new customer costs 5x more than keeping one. Full Loop's retargeting engine makes sure no client falls through the cracks.",
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
            The Full Loop
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Seven Stages. Zero Gaps.{" "}
            <span className="text-teal-600">Every Stage Connected.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-3xl mx-auto">
            Every stage of your home service business — from <Link href="/full-loop-crm-service-features" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">lead generation to client retention</Link> — managed inside one all-in-one CRM built specifically for field service companies.
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
