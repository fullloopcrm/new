"use client";

import { motion } from "framer-motion";

const logos = Array.from({ length: 8 }, (_, i) => `Client Logo ${i + 1}`);

export default function TrustBar() {
  return (
    <section className="py-12 bg-[#F4F4F1] border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-[#6F6F6B] text-sm tracking-wider uppercase mb-8 font-heading"
        >
          Trusted by businesses across NYC, Long Island &amp; Westchester
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4"
        >
          {logos.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="flex items-center justify-center h-16 rounded-lg bg-white border border-slate-200"
            >
              <span className="text-[#6F6F6B] text-xs font-medium">
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
