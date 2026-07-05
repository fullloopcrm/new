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
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "exit-intent-audit", email }),
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
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors"
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

            <p className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase mb-2">
              Before you go...
            </p>
            <h3 className="text-slate-900 font-bold text-lg mb-2 leading-snug">
              Get a Free SEO Audit of Your Website
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              See exactly where you stand in search — and what it will take to
              outrank your competitors.
            </p>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-500 transition-colors whitespace-nowrap"
              >
                Send My Audit
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
