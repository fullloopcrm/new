"use client";

import { motion } from "framer-motion";

interface TipBlurbProps {
  label?: string;
  tip: React.ReactNode;
  signature?: string;
}

export default function TipBlurb({
  label = "We think you should know:",
  tip,
  signature = "— Your local NYC marketing company. People helping people.",
}: TipBlurbProps) {
  return (
    <section className="py-12 sm:py-16 bg-teal-600">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-white text-base sm:text-lg leading-relaxed text-center"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          <span
            className="text-teal-100 text-sm font-bold uppercase tracking-widest block mb-3"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {label}
          </span>
          {tip}
          <span
            className="text-teal-200 text-sm italic block mt-5"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {signature}
          </span>
        </motion.p>
      </div>
    </section>
  );
}
