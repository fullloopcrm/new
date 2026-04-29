"use client";

import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

export default function ExitIntent() {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const { scrollYProgress } = useScroll();

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.6 && !shown && !dismissed) {
      setShown(true);
    }
  });

  const handleDismiss = () => {
    setShown(false);
    setDismissed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: "Info Request",
          contact_name: email,
          email,
          service_category: "Unknown",
          city: "Unknown",
          state: "NA",
          years_in_business: "N/A",
          team_size: "N/A",
          monthly_revenue: "N/A",
          pitch: "Exit intent info request from homepage",
        }),
      });
    } catch {
      // noop
    }
    setShown(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={{ opacity: 0, y: 80, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)]"
        >
          <div className="relative rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-[#6F6F6B] hover:text-[#3A3A3A] transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Accent glow */}
            <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-teal-500 to-transparent" />

            <p className="text-[#1F4D2C] text-xs font-semibold tracking-[0.15em] uppercase mb-2">
              Want to learn more?
            </p>
            <h3 className="text-slate-900 font-bold text-lg mb-2 leading-snug">
              Get a Personalized CRM Breakdown for Your Business
            </h3>
            <p className="text-[#3A3A3A] text-sm mb-4">
              Drop your email and we&rsquo;ll send you a detailed overview of how Full Loop CRM works for your specific trade and market.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-[#6F6F6B] focus:outline-none focus:border-[#1F4D2C] transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#1F4D2C] text-white text-sm font-bold hover:bg-[#1F4D2C] transition-colors whitespace-nowrap"
              >
                Send It
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
