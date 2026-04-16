"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-teal-600" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-white/70 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            One Trade Per Metro &mdash; Forever
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 font-heading">
            Is Your City Still Open?
          </h2>

          <p className="text-white/80 text-lg sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
            Full Loop CRM licenses one operator per trade per metro. Once your city is claimed in your trade, every competitor in that trade is locked out of this platform &mdash; forever. Tell us your trade and your city and we&apos;ll check if the license is still on the board.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block px-10 py-5 text-lg font-bold text-teal-600 rounded-xl bg-white hover:bg-teal-50 transition-colors shadow-lg font-cta w-full sm:w-auto"
            >
              Check My Territory
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block px-10 py-5 text-lg font-bold text-white rounded-xl bg-teal-700 hover:bg-teal-800 border border-white/20 transition-colors shadow-lg font-cta w-full sm:w-auto"
            >
              Call (212) 202-9220
            </a>
            <a
              href="sms:+12122029220"
              className="inline-block px-10 py-5 text-lg font-bold text-white rounded-xl bg-teal-700 hover:bg-teal-800 border border-white/20 transition-colors shadow-lg font-cta w-full sm:w-auto"
            >
              Text Us
            </a>
          </div>

          {/* Footer note */}
          <p className="text-white/60 text-sm max-w-2xl mx-auto leading-relaxed">
            We&apos;re looking for business owners committed to organic local growth who value real consulting guidance built on 20+ years of home service experience. Learn more <Link href="/about-full-loop-crm" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">about our team</Link>, explore our <Link href="/full-loop-crm-pricing" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">pricing</Link>, or read our <Link href="/full-loop-crm-frequently-asked-questions" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">FAQ</Link>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
