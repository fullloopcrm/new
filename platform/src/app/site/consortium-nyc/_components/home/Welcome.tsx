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
          Welcome to Consortium NYC
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.1] font-heading"
        >
          NYC&apos;s Full-Service <span className="underline decoration-teal-600 underline-offset-4">LOCAL</span> Marketing Company
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto"
        >
          For over 25 years, we&apos;ve helped more than 10,000 businesses across New York City, Long Island, and throughout the country grow through strategies that actually work. No fluff, no fads &mdash; just SEO, web design, branding, and marketing that compounds year after year.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-5 text-base sm:text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto"
        >
          Our organic, grassroots marketing strategy delivers <strong className="text-slate-700">5&ndash;8% compounding growth year after year</strong> &mdash; meaning by years 3&ndash;5, most clients spend under 10% of revenue on marketing while their competitors keep burning cash on ads. We build assets you own, and never lock you into contracts &mdash; <strong className="text-slate-700">because that only benefits the one trying to lock you in.</strong>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-5 font-cta">
            Popular Pages Visited
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/about-marketing-company-consortium-nyc"
              className="px-7 py-3.5 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              Learn More About Us
            </Link>
            <Link
              href="/whats-working-in-marketing"
              className="px-7 py-3.5 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              What&apos;s Working in Marketing
            </Link>
            <Link
              href="/nyc-marketing-101-guide"
              className="px-7 py-3.5 text-sm font-bold text-teal-600 rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors font-cta"
            >
              Marketing 101
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
