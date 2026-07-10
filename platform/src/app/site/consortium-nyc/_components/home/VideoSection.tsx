"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function VideoSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            Case Study
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            See How We Took a Brooklyn Plumber from{" "}
            <span className="text-teal-600">Page 5 to #1</span>
          </h2>
        </motion.div>

        {/* Video Placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative aspect-video rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center group cursor-pointer"
        >
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Play Button */}
          <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>

          {/* Coming soon label */}
          <div className="absolute bottom-4 right-4 text-slate-400 text-xs font-medium tracking-wide uppercase">
            Video Coming Soon
          </div>
        </motion.div>

        {/* Description & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-10"
        >
          <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
            When this Brooklyn plumbing company came to us, they were buried on
            page five of Google with zero inbound leads from search. Within six
            months, they ranked #1 for their top 12 keywords and tripled their
            monthly revenue. This is what a real digital strategy looks like.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-500 transition-colors font-cta"
          >
            Want This for Your Business?
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
