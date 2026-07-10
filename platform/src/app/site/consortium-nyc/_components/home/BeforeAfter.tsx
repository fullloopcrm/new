"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function AnimatedNumber({ value, prefix, suffix, inView }: { value: number; prefix?: string; suffix?: string; inView: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, count, rounded]);

  return <span>{prefix}{display}{suffix}</span>;
}

const caseStudies = [
  {
    industry: "Moodap\u2122",
    timeframe: "Startup | 2 Months | Pre-Revenue",
    stats: { rankings: 2000, traffic: 1000, leads: 0, revenue: 0, growth: 3490 },
    business: { visit: "https://www.moodap.com/", google: "https://www.google.com/search?q=joys+chinatown" },
  },
  {
    industry: "The Boston Landscaping Company",
    timeframe: "Startup | 9 Months",
    stats: { rankings: 25, traffic: 3000, leads: 45, revenue: 200000, growth: 1095 },
    business: { visit: "https://www.thebostonlandscapingcompany.com/", google: "https://www.google.com/search?q=boston+landscaping+company" },
  },
  {
    industry: "The NYC Maid",
    timeframe: "Startup | 6 Months",
    stats: { rankings: 500, traffic: 1000, leads: 60, revenue: 68000, growth: 725 },
    business: { visit: "https://www.thenycmaid.com/", google: "https://www.google.com/search?q=nyc+maid" },
  },
  {
    industry: "The NYC Classifieds",
    timeframe: "Startup | Under 10 Days | Pre-Revenue",
    stats: { rankings: 10, traffic: 100, leads: 0, revenue: 0, growth: 220 },
    business: { visit: "https://thenycclassifieds.com/", google: "https://www.google.com/search?q=nyc+classified" },
  },
  {
    industry: "Destin Digital",
    timeframe: "Startup | 3 Months",
    stats: { rankings: 10, traffic: 100, leads: 10, revenue: 15000, growth: 250 },
    business: { visit: "https://www.destindigitalmarketing.com/", google: "https://www.google.com/search?q=destin+digital+marketing" },
  },
  {
    industry: "Urban Clothing NYC",
    timeframe: "Startup | Pre-Revenue",
    stats: { rankings: 100, traffic: 32000, leads: 100, revenue: 0, growth: 600 },
    business: { visit: "https://www.urbanclothingusa.com/", google: "https://www.google.com/search?q=urban+clothing+nyc" },
  },
  {
    industry: "The NYC Mobile Salon",
    timeframe: "Startup | Under 15 Days | Pre-Revenue",
    stats: { rankings: 500, traffic: 500, leads: 0, revenue: 0, growth: 250 },
    business: { visit: "https://www.thenycmobilesalon.com/", google: "https://www.google.com/search?q=nyc+mobile+salon" },
  },
  {
    industry: "The NYC SEO",
    timeframe: "Startup | 15 Days | Pre-Revenue",
    stats: { rankings: 500, traffic: 3000, leads: 25, revenue: 0, growth: 1200 },
    business: { visit: "https://www.thenycseo.com/", google: "https://www.google.com/search?q=SEO+for+Electrician+Businesses+in+Forest+Hills" },
  },
];

function CaseCard({
  study,
  index,
}: {
  study: (typeof caseStudies)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats = [
    { label: "Pg 1 Rankings", value: study.stats.rankings, suffix: "" , bold: false },
    { label: "Traffic/mo", value: study.stats.traffic, suffix: "", bold: false },
    { label: "Leads/mo", value: study.stats.leads, suffix: "", bold: false },
    { label: "Revenue", value: study.stats.revenue, prefix: "$", bold: false },
    { label: "Growth", value: study.stats.growth, suffix: "%", bold: true },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.1 }}
      className="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
    >
      <h3 className="text-sm font-bold text-slate-900 mb-0.5 font-heading">{study.industry}</h3>
      <p className="text-teal-600 text-xs font-semibold mb-4 font-cta">
        {study.timeframe}
      </p>

      {/* Stats */}
      <div className="space-y-3 flex-1">
        {stats.map((s) => (
          <div key={s.label} className={`flex items-center justify-between ${s.bold ? "pt-2 border-t border-slate-100" : ""}`}>
            <span className={`text-sm ${s.bold ? "text-slate-900 font-bold" : "text-slate-900"}`}>{s.label}</span>
            <span className={`font-mono ${s.bold ? "text-teal-600 text-lg font-extrabold" : "text-slate-900 text-base font-bold"}`}>
              <AnimatedNumber value={s.value} prefix={s.prefix} suffix={s.suffix} inView={inView} />
            </span>
          </div>
        ))}
      </div>

      {/* Business footer */}
      <div className="mt-4 flex border-t border-slate-200">
        <a
          href={study.business.visit}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-teal-600 text-xs font-semibold hover:text-teal-700 transition-colors border-r border-slate-200"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Visit
        </a>
        <a
          href={study.business.google}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-rose-500 text-xs font-semibold hover:text-rose-600 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </a>
      </div>
    </motion.div>
  );
}

export default function BeforeAfter() {
  return (
    <section className="py-20 sm:py-28 bg-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Results
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Before &amp; After Results for{" "}
            <span className="text-teal-600">NYC &amp; Long Island Businesses</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Real before and after marketing results from local businesses in Brooklyn, Manhattan, Queens, Westchester, and Long Island. See our full <Link href="/nyc-marketing-company-portfolio" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">portfolio</Link> for more.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {caseStudies.map((study, i) => (
            <CaseCard key={study.industry} study={study} index={i} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/nyc-marketing-company-portfolio"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              See More Results
            </Link>
            <Link
              href="/contact-nyc-marketing-company-consortium-nyc"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              I&apos;m Ready to Talk
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
