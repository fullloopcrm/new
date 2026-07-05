"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { interiorDesignFAQs } from "@/app/site/the-nyc-interior-designer/_lib/interiorDesignFAQs";

const categories = [...new Set(interiorDesignFAQs.map((f) => f.category))];

export default function FAQClient() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading"
          >
            NYC Interior Design FAQ —{" "}
            <span className="text-blue-200">{interiorDesignFAQs.length} Answers</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-white/80"
          >
            Everything NYC homeowners, property managers, and business owners ask about{" "}
            <Link href="/services" className="text-blue-200 underline underline-offset-2 hover:text-white">interior design services</Link>,{" "}
            pricing, and working with a professional designer.
          </motion.p>
        </div>
      </section>

      {/* Category Nav */}
      <section className="bg-white border-b border-slate-200 sticky top-16 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <a
              key={cat}
              href={`#${cat.toLowerCase().replace(/ /g, "-")}`}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              {cat} ({interiorDesignFAQs.filter((f) => f.category === cat).length})
            </a>
          ))}
        </div>
      </section>

      {/* FAQ Grid by Category */}
      {categories.map((cat) => {
        const catFaqs = interiorDesignFAQs.filter((f) => f.category === cat);
        return (
          <section
            key={cat}
            id={cat.toLowerCase().replace(/ /g, "-")}
            className="bg-white py-14 border-b border-slate-100"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading mb-8">
                {cat}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {catFaqs.map((faq) => {
                  const globalIdx = interiorDesignFAQs.indexOf(faq);
                  return (
                    <div
                      key={globalIdx}
                      className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-blue-300"
                    >
                      <button
                        onClick={() => toggle(globalIdx)}
                        className="flex w-full items-center justify-between px-6 py-5 text-left"
                      >
                        <span className="pr-4 text-base font-semibold text-slate-800 font-heading">
                          {faq.question}
                        </span>
                        <svg
                          className={`h-5 w-5 shrink-0 text-blue-500 transition-transform duration-200 ${
                            openItems.has(globalIdx) ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {openItems.has(globalIdx) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Internal Links Grid */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading mb-8">
            Explore More
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[
              { title: "All 18 Services", href: "/services" },
              { title: "Free Consultation", href: "/contact" },
              { title: "Our Story", href: "/about" },
              { title: "All Areas", href: "/areas" },
              { title: "Manhattan", href: "/areas/manhattan" },
              { title: "Brooklyn", href: "/areas/brooklyn" },
              { title: "Queens", href: "/areas/queens" },
              { title: "Bronx", href: "/areas/bronx" },
              { title: "Long Island", href: "/areas/long-island" },
              { title: "Westchester", href: "/areas/westchester" },
              { title: "New Jersey", href: "/areas/new-jersey" },
              { title: "Full-Home Design", href: "/services/full-home-interior-design" },
              { title: "Kitchen Design", href: "/services/kitchen-design" },
              { title: "Bathroom Design", href: "/services/bathroom-design" },
              { title: "Space Planning", href: "/services/space-planning" },
              { title: "Renovation Management", href: "/services/renovation-management" },
              { title: "Home Staging", href: "/services/staging-styling" },
              { title: "Lighting Design", href: "/services/lighting-design" },
              { title: "Commercial Design", href: "/services/commercial-interior-design" },
              { title: "Smart Home", href: "/services/smart-home-integration" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md text-center">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 font-heading">
                    {item.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-700 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl font-heading">
            Still Have Questions?
          </h2>
          <p className="mt-3 text-blue-100/80">
            Call, text, or email us. We respond within the hour during business hours.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={SMS_HREF}
              className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50 transition-colors font-cta"
            >
              Text Us
            </a>
            <a
              href={PHONE_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Call {PHONE}
            </a>
            <Link
              href="/contact"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
