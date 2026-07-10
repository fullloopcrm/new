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
            Schedule a Strategy Session
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 font-heading">
              NYC&apos;s Most Trusted Marketing Company Is Ready to Grow Your Business
          </h2>

          <p className="text-white/80 text-lg sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed">
            Over 10,000 businesses across New York City, Brooklyn, Queens, Long Island, and Westchester have trusted The NYC Marketing Company to grow their revenue through organic marketing. You&apos;re next.
          </p>

          {/* Primary CTA */}
          <Link
            href="/contact"
            className="inline-block px-10 py-5 text-lg font-bold text-teal-600 rounded-xl bg-white hover:bg-teal-50 transition-colors shadow-lg font-cta"
          >
            Book Your Free Strategy Session
          </Link>

          {/* Secondary - Phone */}
          <p className="text-white/70 text-base mt-8">
            Or call us:{" "}
            <a
              href="tel:+12122029220"
              className="text-white hover:text-teal-100 transition-colors font-semibold font-mono"
            >
              (212) 202-9220
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
