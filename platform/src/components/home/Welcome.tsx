"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Welcome() {
  return (
    <section className="bg-white py-20 sm:py-28 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta"
        >
          The All-in-One CRM for Home Service Businesses
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.1] font-heading"
        >
          The First <span className="underline decoration-teal-600 underline-offset-4">Full-Cycle</span> Field Service CRM &mdash; Lead Gen to Rebooking
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto"
        >

          Most <Link href="/full-loop-crm-101-educational-tips" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">home service CRMs</Link> handle scheduling. Some handle invoicing. A few do field management. None of them generate your leads, close them with AI, track your crew by GPS, collect payment, earn your reviews, and retarget for the next booking. Full Loop is the only <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">full-service CRM</Link> that covers all seven stages &mdash; in one platform, under one login, with zero integrations.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-5 text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto"
        >

          Built by someone who ran home service companies for 20+ years &mdash; not a product team that Googled &ldquo;cleaning business software.&rdquo; Every feature in this <Link href="/full-loop-crm-service-features" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">automated service business platform</Link> exists because of a <strong className="text-slate-700">real operational problem</strong>, and every <Link href="/full-loop-crm-pricing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">CRM partnership</Link> territory is exclusive: <strong className="text-slate-700">one partner per trade per metro, period.</strong>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-5 font-cta">
            Explore
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/full-loop-crm-service-features"
              className="px-7 py-3.5 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              See All 7 Stages
            </Link>
            <Link
              href="/full-loop-crm-service-business-industries"
              className="px-7 py-3.5 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              50+ Industries We Serve
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="px-7 py-3.5 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              Pricing & Partnership
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
