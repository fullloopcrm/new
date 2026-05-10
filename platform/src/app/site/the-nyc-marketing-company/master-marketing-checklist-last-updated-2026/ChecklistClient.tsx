// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

const sections = [
  {
    title: "SEO Foundations",
    items: [
      "Google Search Console verified and monitored weekly",
      "Google Analytics 4 tracking all conversions (calls, forms, bookings)",
      "XML sitemap submitted and auto-updating",
      "Robots.txt reviewed — no accidental blocks",
      "Core Web Vitals all passing (LCP, FID, CLS)",
      "Mobile-first responsive design tested on 5+ devices",
      "Page load time under 2 seconds",
      "SSL certificate active (HTTPS everywhere)",
    ],
  },
  {
    title: "Local SEO",
    items: [
      "Google Business Profile 100% complete with all fields filled",
      "GBP categories match your actual services",
      "NAP (Name, Address, Phone) consistent across 80+ directories",
      "Google reviews actively managed — responses within 24 hours",
      "Local citations built on Yelp, BBB, industry directories",
      "Location pages for every neighborhood you serve",
      "Local schema markup on every page",
      "Geo-targeted content published monthly",
    ],
  },
  {
    title: "On-Page SEO",
    items: [
      "Unique title tags on every page (under 60 characters)",
      "Meta descriptions written for click-through (under 155 characters)",
      "H1 tag on every page — one per page, keyword-focused",
      "Internal linking strategy — every page links to 3+ related pages",
      "Image alt tags on every image (descriptive, not stuffed)",
      "URL structure clean and keyword-rich (no random strings)",
      "Schema markup for FAQ, reviews, local business, breadcrumbs",
      "Content updated quarterly — no stale pages",
    ],
  },
  {
    title: "Content Strategy",
    items: [
      "Blog publishing 2-4x per month minimum",
      "Service pages for every service you offer",
      "Industry pages for every vertical you target",
      "Location pages for every area you serve",
      "FAQ content targeting long-tail questions",
      "Case studies or results pages with real data",
      "Competitor content gaps identified and targeted",
    ],
  },
  {
    title: "Website & Conversion",
    items: [
      "Click-to-call button visible on every mobile page",
      "Contact form above the fold on key pages",
      "Clear CTA on every page (not just the homepage)",
      "Trust signals visible — reviews, years in business, certifications",
      "404 page custom-designed with navigation options",
      "Site search working (if applicable)",
      "Lead capture forms tested monthly",
    ],
  },
  {
    title: "AI & Automation",
    items: [
      "Automated lead follow-up within 5 minutes of form submission",
      "Review request automation after service completion",
      "Appointment scheduling integrated with your calendar",
      "Chatbot or AI agent handling after-hours inquiries",
      "CRM tracking every lead source and status",
      "Automated reporting delivered monthly",
    ],
  },
];

export default function MarketingChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const percentage = Math.round((checkedCount / totalItems) * 100);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Free Marketing Checklist
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            The 2026 Digital Marketing Checklist for{" "}
            <span className="text-teal-400">NYC Businesses</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            The same checklist our team uses for every client. SEO, local search, content, website optimization, and AI automation — every box you need to check to dominate online in 2026. Interactive. Free. No email required.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>Most businesses skip the basics and <strong>jump straight to the shiny stuff</strong>. The ones winning right now nailed the <strong>fundamentals first</strong> — then built on top. This checklist is the foundation.</>}
      />

      {/* Progress bar */}
      <section className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-900 font-mono">{checkedCount}/{totalItems} completed</span>
            <span className="text-sm font-bold text-teal-600 font-mono">{percentage}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-teal-600 rounded-full"
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-bold text-slate-900 mb-4 font-heading">{section.title}</h2>
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const key = `${section.title}-${item}`;
                    const isChecked = checked[key] || false;
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(key)}
                        className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${
                          isChecked
                            ? "bg-teal-50 border-teal-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isChecked ? "bg-teal-600 border-teal-600" : "border-slate-300"
                        }`}>
                          {isChecked && <span className="text-white text-xs font-bold">&#x2713;</span>}
                        </span>
                        <span className={`text-sm ${isChecked ? "text-slate-500 line-through" : "text-slate-700"}`}>
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Score */}
          <div className="mt-16 rounded-xl bg-slate-900 p-8 text-center">
            <p className="text-teal-400 text-sm font-semibold tracking-wider uppercase mb-2 font-cta">Your Score</p>
            <p className="text-white text-5xl font-extrabold font-mono mb-3">{percentage}%</p>
            <p className="text-white/60 text-sm mb-6">
              {percentage === 100
                ? "You're crushing it. But there's always room to grow."
                : percentage >= 70
                ? "Solid foundation. Let's close the gaps."
                : percentage >= 40
                ? "You're leaving leads on the table. Let's fix that."
                : "Your competitors are ahead. Let's catch up — fast."}
            </p>
            <Link
              href="/contact"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
            >
              Get Help Checking Every Box
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
