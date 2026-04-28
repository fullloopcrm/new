"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const autonomousItems = [
  "Website visitor tracking across all domains",
  "CTA click tracking (call, text, book, directions)",
  "Lead-to-domain attribution with confidence scoring",
  "AI engages new leads via SMS — 24/7",
  "AI qualifies leads: location, service, budget",
  "Online booking with real-time availability",
  "4-stage reminder cascade (7d, 3d, 1d, 2hr)",
  "Recurring booking auto-generation",
  "GPS check-in / check-out by team",
  "Actual hours & pay auto-calculation",
  "Post-service thank-you follow-up",
  "Client lifecycle status auto-categorization",
];

const humanItems = [
  "Booking approval for custom requests",
  "Team member assignment for new clients",
  "Payroll review and payout processing",
  "Complaint resolution and escalation calls",
  "New team member onboarding",
  "Domain portfolio management",
  "Service pricing changes",
  "Cancellation and refund decisions",
];

export default function Competitors() {
  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden">
      {/* Subtle accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-50 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Autonomous Field Service Management
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Run It Hands-Free — Or{" "}
            <span className="text-[#1F4D2C]">Stay in the Loop</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            Full Loop CRM is designed to run your entire operation autonomously.
            But you decide where humans stay in control. See all{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              features
            </Link>{" "}
            or learn{" "}
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              why Full Loop
            </Link>
            .
          </p>
        </motion.div>

        {/* Two columns */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Autonomous column */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0 }}
            className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center mb-6"
            >
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1F4D2C] mb-2 font-heading">
                Fully Autonomous
              </p>
              <p className="text-[#6F6F6B] text-sm">No Human Needed</p>
            </motion.div>
            <ul className="space-y-3">
              {autonomousItems.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-start gap-3 text-[#3A3A3A] text-sm leading-relaxed"
                >
                  <span className="text-[#1F4D2C] font-bold mt-0.5">&#10003;</span>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Human decision points column */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="text-center mb-6"
            >
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 font-heading">
                Human Decision Points
              </p>
              <p className="text-[#6F6F6B] text-sm">Optional</p>
            </motion.div>
            <ul className="space-y-3">
              {humanItems.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-start gap-3 text-[#3A3A3A] text-sm leading-relaxed"
                >
                  <span className="text-[#6F6F6B] font-bold mt-0.5">&#9679;</span>
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-slate-900 text-xl font-bold mb-4">
            Your Automated CRM. Your Rules.
          </p>
          <p className="text-[#3A3A3A] text-base mb-8 max-w-2xl mx-auto">
            Whether you want a fully hands-free home service CRM or prefer to
            approve every booking yourself, Full Loop CRM adapts to your
            workflow. New to CRM?{" "}
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              Start with CRM 101
            </Link>
            .
          </p>
          <Link
            href="/crm-partnership-request-form"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-[#1C1C1C] rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
          >
            Request a Partnership
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
