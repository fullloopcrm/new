"use client";

import { motion } from "framer-motion";

const items = [
  "SEO",
  "WEB DESIGN",
  "BRANDING",
  "STRATEGY",
  "AUTOMATION",
  "BUSINESS DEVELOPMENT",
];

const text = items.join(" / ") + " / ";

export default function Marquee() {
  return (
    <section className="py-8 overflow-hidden bg-white">
      <div className="relative">
        <motion.div
          className="flex whitespace-nowrap animate-marquee"
          aria-hidden="true"
        >
          <span className="text-6xl sm:text-7xl lg:text-8xl font-extrabold uppercase text-slate-900/[0.08] tracking-wider font-heading">
            {text}
          </span>
          <span className="text-6xl sm:text-7xl lg:text-8xl font-extrabold uppercase text-slate-900/[0.08] tracking-wider font-heading">
            {text}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
