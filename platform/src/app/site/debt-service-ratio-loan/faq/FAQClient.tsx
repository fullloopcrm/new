// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { homeFAQs } from "@/app/site/debt-service-ratio-loan/_lib/siteData";

export default function FAQClient() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            DSCR Loan FAQ — <span className="text-teal-200">Answers for Real Estate Investors</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Everything investors ask about debt service coverage ratio loans.
          </motion.p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6 space-y-3">
          {homeFAQs.map((faq, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-teal-300">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                <svg className={`h-5 w-5 shrink-0 text-teal-500 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Learn More</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { title: "DSCR 101 Guide", href: "/dscr-101" },
              { title: "Requirements", href: "/dscr-loan-requirements" },
              { title: "DSCR Calculator", href: "/dscr-calculator" },
              { title: "Current Rates", href: "/dscr-loan-rates" },
              { title: "Tips", href: "/dscr-loan-tips" },
              { title: "Find Your City", href: "/cities" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md"><h3 className="font-bold text-slate-900 group-hover:text-teal-600 font-heading">{item.title}</h3></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
