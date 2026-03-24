"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const replacements = [
  {
    before: {
      role: "Receptionist",
      cost: "$38K/yr",
      description: "Answers calls 9-5, misses after-hours leads, loses context between conversations",
    },
    after: {
      role: "Selenas Sales Agent",
      description:
        "Engages every inbound lead via SMS and web chat within seconds. 24/7, bilingual EN/ES. Follows a 10-field booking checklist — service type, size, rate, date, time, name, phone, address, email — collecting one at a time, never re-asking.",
    },
  },
  {
    before: {
      role: "Salesperson",
      cost: "$48K/yr",
      description: "Follows up manually, forgets leads, no after-hours coverage",
    },
    after: {
      role: "Selenas Lead Closer",
      description:
        "Closes at 80%+ from day one. Handles objections, offers pricing tiers, creates urgency, does the full recap, and books the job — all in one conversation. Returning clients are recognized by phone number with their full profile pre-loaded.",
    },
  },
  {
    before: {
      role: "Customer Service",
      cost: "$35K/yr",
      description: "Handles complaints, rescheduling, always starting from scratch",
    },
    after: {
      role: "Selenas Client Manager",
      description:
        "Every inbound text matched to client file instantly — past bookings, preferred team member, last rate, conversation history. Escalates complex issues to you with full transcript. One-click conversation reset if anything gets stuck.",
    },
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

export default function BeforeAfter() {
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
            AI-Powered Sales &amp; Client Management
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Selenas Replaces Your{" "}
            <span className="text-teal-600">Entire Front Office</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Three full-time salaries. One AI. Available 24/7, bilingual, with full client context and memory on every conversation. See all <Link href="/full-loop-crm-service-features" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">features</Link> or learn <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">why Full Loop is different</Link>.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {replacements.map((item, i) => (
            <motion.div
              key={item.before.role}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
            >
              {/* Before */}
              <div className="p-5 bg-red-50 border-b border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-red-600 text-xs font-semibold tracking-[0.15em] uppercase font-cta">
                    Before
                  </span>
                  <span className="text-red-500 text-xs font-bold font-mono">
                    {item.before.cost}
                  </span>
                </div>
                <h3 className="text-slate-900 font-bold text-base mb-1 font-heading">
                  {item.before.role}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {item.before.description}
                </p>
              </div>

              {/* Arrow divider */}
              <div className="flex items-center justify-center py-2 bg-white">
                <svg
                  className="w-6 h-6 text-teal-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>

              {/* After */}
              <div className="p-5 bg-teal-50 flex-1">
                <span className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase font-cta">
                  After
                </span>
                <h3 className="text-slate-900 font-bold text-base mb-1 mt-2 font-heading">
                  {item.after.role}
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {item.after.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/full-loop-crm-pricing"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              See Pricing
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              Browse Industries
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
