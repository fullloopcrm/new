"use client";

import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

export default function StickyBar() {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 500);
  });

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: visible ? 0 : 100 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <p className="text-slate-900 text-sm sm:text-base font-medium hidden sm:block">
          Apply for Your Exclusive CRM Territory &mdash;{" "}
          <span className="text-[#1F4D2C]">Limited Spots This Month</span>
        </p>

        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
          <a
            href="tel:+12122029220"
            className="text-[#3A3A3A] hover:text-slate-900 text-sm sm:text-base font-medium transition-colors"
          >
            (212) 202-9220
          </a>
          <Link
            href="/crm-partnership-request-form"
            className="inline-block px-6 py-2.5 text-sm font-bold text-[#1C1C1C] rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors whitespace-nowrap font-cta"
          >
            Apply Now
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
