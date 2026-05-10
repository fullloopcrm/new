// @ts-nocheck
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

const PHONE = "212.202.9220";
const PHONE_HREF = "tel:+12122029220";

const L = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-teal-600 hover:text-teal-700 underline underline-offset-2 font-medium">{children}</Link>
);

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

/* ── Capabilities data ────────────────────────────────────────── */
const capabilities = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    title: "AI Text Bot (SMS)",
    desc: "Custom SMS-based AI that qualifies leads, answers questions, and books appointments via text message. Built on Telnyx + Claude AI. Responds in under 10 seconds.",
    tag: "Core Product",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
    title: "Instant Lead Follow-Up",
    desc: "When a lead fills out a form at 2am, the AI responds in seconds — qualifying, answering questions, and booking. No more lost leads from slow follow-up.",
    tag: "Revenue Driver",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
    title: "Review Request Automation",
    desc: "Automatically request reviews after service completion. Timed follow-ups get 3-5x more reviews than manual asks. Route happy customers to Google, unhappy ones to you.",
    tag: "Reputation",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    title: "Appointment Booking",
    desc: "AI checks your real-time calendar availability and books appointments directly. Google Calendar, Calendly, Acuity, or custom systems. Customers get instant SMS confirmation.",
    tag: "Conversion",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    title: "After-Hours Coverage",
    desc: "Your AI never sleeps. Nights, weekends, holidays — every inquiry gets an instant, intelligent response. Your competitors lose leads at 10pm. You convert them.",
    tag: "24/7",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "CRM & Lead Tracking",
    desc: "Every conversation, lead score, and appointment is tracked in your CRM. Full pipeline visibility. Know exactly where every lead stands and what the AI said.",
    tag: "Intelligence",
  },
];

/* ── How it works steps ───────────────────────────────────────── */
const steps = [
  { num: "01", title: "Lead Comes In", desc: "Form submission, phone call, text message, or website chat — any channel triggers the AI." },
  { num: "02", title: "AI Responds in Seconds", desc: "Personalized SMS sent within 10 seconds. The AI introduces itself, qualifies the lead, and asks the right questions." },
  { num: "03", title: "Qualification & Routing", desc: "AI determines if the lead is qualified based on your criteria. Hot leads get escalated. Tire-kickers get filtered." },
  { num: "04", title: "Appointment Booked", desc: "Qualified leads get booked directly on your calendar. Confirmation sent via text. No human intervention needed." },
  { num: "05", title: "Follow-Up & Nurture", desc: "If the lead doesn't convert immediately, the AI follows up on a schedule you set. 1 day, 3 days, 7 days — until they book or opt out." },
  { num: "06", title: "Review Request", desc: "After service completion, the AI automatically requests a Google review. Timed follow-ups maximize response rate." },
];

/* ── Use cases ────────────────────────────────────────────────── */
const useCases = [
  { industry: "Plumbing", example: "Customer texts about a leaking pipe at 11pm. AI qualifies the emergency, collects address, and books a morning appointment — all before the plumber wakes up.", href: "/industries-we-offer-marketing-services-for/plumber-marketing" },
  { industry: "Dental", example: "New patient fills out a form on Saturday. AI responds in 8 seconds, confirms insurance, and books a cleaning for Monday. By the time the office opens, the appointment is set.", href: "/industries-we-offer-marketing-services-for/dental-practice-marketing" },
  { industry: "HVAC", example: "AC breaks in July. Homeowner texts your number. AI confirms the issue, checks your schedule, and books a same-day service call. Lead captured while competitors are at voicemail.", href: "/industries-we-offer-marketing-services-for/hvac-company-marketing" },
  { industry: "Law Firm", example: "Accident victim searches for a lawyer at midnight. Fills out your form. AI responds, collects case details, and schedules a consultation. You wake up with a qualified lead and full context.", href: "/industries-we-offer-marketing-services-for/personal-injury-law-firm-marketing" },
  { industry: "Med Spa", example: "Patient interested in Botox fills out a form after seeing your Instagram ad. AI answers pricing questions, explains the process, and books a consultation — all via text.", href: "/industries-we-offer-marketing-services-for/plastic-surgery-med-spa-marketing" },
  { industry: "Real Estate", example: "Buyer inquires about a listing at 9pm. AI sends property details, asks about budget and timeline, qualifies the buyer, and schedules a showing. Your competition is still checking email Monday morning.", href: "/industries-we-offer-marketing-services-for/real-estate-agent-marketing" },
];

/* ── Tech stack ───────────────────────────────────────────────── */
const techStack = [
  { name: "Claude AI", role: "Intelligence", desc: "Anthropic's most capable model powers every conversation. Context-aware, nuanced, and business-trained." },
  { name: "Telnyx", role: "SMS & Voice", desc: "Enterprise-grade SMS and voice infrastructure. Real phone numbers. Real carrier connections. 99.999% uptime." },
  { name: "Supabase", role: "Database & Auth", desc: "PostgreSQL database with real-time subscriptions. Every conversation stored, searchable, and exportable." },
  { name: "Next.js", role: "Dashboard", desc: "Your AI management dashboard. Monitor conversations, adjust settings, and track performance in real-time." },
];

export default function AIPageClient({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(20,184,166,0.08),transparent_60%)]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.5 }}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold tracking-widest uppercase mb-6 font-cta">
              AI Automation for Local Businesses
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] mb-6 font-heading">
              Your AI Employee<br />
              <span className="text-teal-400">Works 24/7</span>
            </h1>
            <p className="text-white/70 text-lg sm:text-xl max-w-3xl mx-auto mb-4">
              Custom AI text bots that qualify leads, book appointments, request reviews, and handle customer service — all via SMS. Built on real infrastructure. Not a plugin. Not a widget.
            </p>
            <p className="text-white/50 text-sm mb-8">
              Setup from <span className="text-teal-400 font-bold">$25,000</span> &middot; Monthly from <span className="text-teal-400 font-bold">$1,000/mo</span> &middot; Responds in <span className="text-teal-400 font-bold">&lt;10 seconds</span> &middot; <span className="text-teal-400 font-bold">{PHONE}</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Link href="/contact-nyc-marketing-company-consortium-nyc" className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta">
                Get an AI Demo
              </Link>
              <a href={PHONE_HREF} className="inline-block px-8 py-4 text-base font-bold text-white/90 rounded-lg border border-white/20 hover:bg-white/10 transition-colors font-cta">
                Call {PHONE}
              </a>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["Built on Claude AI", "Telnyx SMS Infrastructure", "You Own Everything", "No Contracts"].map((b) => (
                <span key={b} className="px-4 py-2 text-xs font-medium text-white/80 border border-white/15 rounded-full bg-white/5 font-cta">{b}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <TipBlurb
        tip={<>Most businesses are <strong>sleeping on AI</strong> while their competitors automate follow-ups, booking, and reviews. The businesses using AI right now aren&apos;t replacing people — they&apos;re <strong>freeing them up</strong> to do the work that actually matters.</>}
      />

      {/* ── MEET SELENA ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-10">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Meet Selena</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 font-heading">
              Your AI Customer Service Agent
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4 max-w-2xl mx-auto">
              Selena is our flagship AI text bot — built in-house on <strong>Claude AI</strong>, <strong>Telnyx SMS</strong>, and <strong>Supabase</strong>. She handles lead qualification, appointment booking, customer questions, <L href="/services/review-request-automation-in-nyc">review requests</L>, and follow-up — all via text message.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4 max-w-2xl mx-auto">
              She&apos;s not a generic chatbot. She&apos;s trained on your business, your services, your pricing, and your industry. When a customer texts your number, Selena responds like a real team member who knows everything about your business.
            </p>
            <p className="text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto">
              Selena was built for our own <L href="/services/custom-crm-development-in-nyc">FullLoop CRM</L> and has been handling real customer conversations for real businesses. Every feature has been battle-tested.
            </p>
          </motion.div>

          {/* Featured screenshot */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="flex justify-center mb-10">
            <Image
              src="/images/selena-ai-chat-bot.png"
              alt="Selena AI booking concierge live on The NYC Maid — built by Full Loop CRM in partnership with The NYC Marketing Company"
              width={900}
              height={506}
              className="rounded-2xl shadow-2xl border border-slate-200"
            />
          </motion.div>

          <div className="text-center">
            <Link href="/contact-nyc-marketing-company-consortium-nyc" className="inline-block px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta">
              See Selena in Action
            </Link>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES GRID ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">What It Does</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              Six Ways AI Grows Your Business
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Every capability runs 24/7 on infrastructure we own. No third-party dependencies. No monthly SaaS fees beyond ours.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap, i) => (
              <motion.div key={cap.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <div className="group rounded-2xl bg-white border border-slate-200 hover:border-teal-400 p-6 transition-all shadow-sm hover:shadow-md h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100 transition-colors">
                      {cap.icon}
                    </div>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full font-cta">{cap.tag}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-heading">{cap.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">The Flow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              From Lead to Booked in Under 60 Seconds
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div key={step.num} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 h-full">
                  <span className="text-teal-600 text-2xl font-extrabold font-mono">{step.num}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-2 mb-2 font-heading">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Real Scenarios</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-heading mb-4">
              AI Automation by Industry
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              Every industry has unique automation opportunities. Here&apos;s how AI works for businesses like yours.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc, i) => (
              <motion.div key={uc.industry} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}>
                <Link href={uc.href} className="group block rounded-2xl bg-white/5 border border-white/10 hover:border-teal-500/40 p-6 transition-all h-full">
                  <span className="text-teal-400 text-xs font-bold tracking-widest uppercase font-cta">{uc.industry}</span>
                  <p className="text-white/80 text-sm leading-relaxed mt-3 group-hover:text-white transition-colors">{uc.example}</p>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/industries-we-offer-marketing-services-for" className="text-teal-400 hover:text-teal-300 text-sm font-semibold underline underline-offset-2 font-cta">
              View All 100+ Industries We Serve
            </Link>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Under the Hood</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              Real Infrastructure. Not a Plugin.
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              We don&apos;t resell other people&apos;s software. Every AI system is built on infrastructure we control.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-6">
            {techStack.map((tech, i) => (
              <motion.div key={tech.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg font-extrabold text-slate-900 font-heading">{tech.name}</span>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full font-cta">{tech.role}</span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{tech.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Pricing</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading mb-4">
              Transparent AI Pricing
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              No hidden fees. No surprise invoices. The setup pays for itself within months through leads you&apos;d otherwise lose.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Setup */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-lg p-8 h-full">
                <span className="text-slate-400 text-xs font-bold tracking-widest uppercase font-cta">One-Time Setup</span>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-slate-900 font-mono">$25,000</span>
                </div>
                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  {[
                    "Custom AI bot development",
                    "Business-specific training & tuning",
                    "CRM integration (existing or custom)",
                    "Workflow design & automation rules",
                    "SMS infrastructure setup (Telnyx)",
                    "Calendar/scheduling integration",
                    "Testing & QA across all flows",
                    "Launch & monitoring",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/contact-nyc-marketing-company-consortium-nyc" className="block w-full text-center px-6 py-3 text-sm font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors font-cta">
                  Get Started
                </Link>
              </div>
            </motion.div>

            {/* Monthly */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-lg p-8 h-full">
                <span className="text-teal-400 text-xs font-bold tracking-widest uppercase font-cta">Monthly</span>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-extrabold text-white font-mono">$1,000</span>
                  <span className="text-white/50 text-sm">/month</span>
                </div>
                <ul className="space-y-3 text-sm text-white/70 mb-8">
                  {[
                    "AI hosting & infrastructure",
                    "Claude AI usage & API costs",
                    "Telnyx SMS/voice costs",
                    "24/7 monitoring & uptime",
                    "Ongoing improvements & tuning",
                    "Conversation analytics & reporting",
                    "Priority support & escalation",
                    "No contracts — cancel anytime",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href={PHONE_HREF} className="block w-full text-center px-6 py-3 text-sm font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors font-cta">
                  Call {PHONE}
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SPEED-TO-LEAD STAT ── */}
      <section className="py-16 bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="text-white/80 text-lg mb-4">Businesses that respond to leads within <strong className="text-white">5 minutes</strong> are</p>
            <p className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white font-mono mb-4">100x</p>
            <p className="text-white/80 text-lg mb-2">more likely to make contact than those that wait 30 minutes.</p>
            <p className="text-white/50 text-sm">Source: Harvard Business Review &middot; Your AI responds in under 10 seconds.</p>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <span className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 block font-cta">Questions</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
              AI Automation FAQs
            </h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.3, delay: i * 0.04 }} className="rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex items-center justify-between w-full px-6 py-4 text-left">
                  <span className="text-sm font-bold text-slate-900 pr-4">{faq.question}</span>
                  <svg className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{faq.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CROSS-LINKS ── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[
              { label: "All Services", href: "/nyc-marketing-company-services-list" },
              { label: "AI Text Bots", href: "/services/ai-text-bot-development-in-nyc" },
              { label: "Lead Follow-Up", href: "/services/lead-follow-up-automation-in-nyc" },
              { label: "Review Automation", href: "/services/review-request-automation-in-nyc" },
              { label: "Custom CRM", href: "/services/custom-crm-development-in-nyc" },
              { label: "SEO Services", href: "/services/search-engine-optimization-seo-nyc" },
              { label: "Pricing Guide", href: "/nyc-marketing-pricing-guide" },
              { label: "Contact Us", href: "/contact-nyc-marketing-company-consortium-nyc" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/30 px-4 py-3 text-white/60 hover:text-white transition-all text-center">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-20 bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 font-heading">
              Stop Losing Leads to Slow Follow-Up
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              Every minute you wait costs you money. Get a live demo of Selena and see exactly how AI automation works for your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact-nyc-marketing-company-consortium-nyc" className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta">
                Get a Free AI Demo
              </Link>
              <a href={PHONE_HREF} className="inline-block px-8 py-4 text-base font-bold text-white/90 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors font-cta">
                {PHONE}
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
