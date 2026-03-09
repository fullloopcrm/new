"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const features = [
  {
    name: "Executive Dashboard",
    category: "Analytics",
    capabilities: ["Revenue Tracking", "Job Forecasting", "Live Map"],
    highlight:
      "Revenue cards (today, week, month, YTD), scheduled job forecasting, today\u2019s job feed, interactive job location map.",
    link: "/full-loop-crm-service-features",
  },
  {
    name: "Real-Time Notifications",
    category: "Communication",
    capabilities: ["20+ Types", "Color-Coded", "Auto-Refresh"],
    highlight:
      "20+ notification types with color-coded icons. Bell icon with unread count, auto-refresh every 60 seconds.",
    link: "/full-loop-crm-service-features",
  },
  {
    name: "Automated Cron Jobs",
    category: "Automation",
    capabilities: ["Summaries", "Reminders", "Health Checks"],
    highlight:
      "Daily team summaries, multi-stage reminders, recurring series alerts, health checks, automatic database backups.",
    link: "/full-loop-crm-service-features",
  },
  {
    name: "Enterprise Security",
    category: "Infrastructure",
    capabilities: ["HMAC-SHA256", "Rate Limiting", "RLS"],
    highlight:
      "HMAC-SHA256 sessions, rate limiting, CSP headers, HSTS, XSS protection, Row Level Security on every table.",
    link: "/full-loop-crm-service-features",
  },
  {
    name: "Domain Portfolio Map",
    category: "Multi-Market",
    capabilities: ["Interactive Map", "Color Coding", "Region View"],
    highlight:
      "Visual interactive map of your entire website network across all markets with region-based color coding.",
    link: "/full-loop-crm-service-features",
  },
  {
    name: "Built-In Documentation",
    category: "Knowledge Base",
    capabilities: ["25 Sections", "API Docs", "DB Schema"],
    highlight:
      "25-section in-app technical documentation covering every page, API route, database table, and integration.",
    link: "/full-loop-crm-service-features",
  },
];

export default function CaseStudies() {
  return (
    <section className="py-20 sm:py-28 bg-white">
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
            Command Center
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            One Dashboard to Run Your{" "}
            <span className="text-teal-600">Entire Home Service Business</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            11 purpose-built admin pages covering every aspect of your
            operation. Real-time data, instant actions, zero switching between
            tools. See all{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              Full Loop CRM features
            </Link>{" "}
            in detail.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
              className="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
            >
              <h3 className="text-sm font-bold text-slate-900 font-heading">
                {f.name}
              </h3>
              <p className="text-teal-600 text-xs font-semibold font-cta mt-0.5 mb-3">
                {f.category}
              </p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {f.capabilities.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200"
                  >
                    {c}
                  </span>
                ))}
              </div>

              {/* Highlight */}
              <p className="text-slate-900 text-sm font-bold font-mono flex-1">
                {f.highlight}
              </p>

              {/* Link */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <Link
                  href={f.link}
                  className="text-teal-600 text-xs font-semibold hover:underline font-cta"
                >
                  Learn more about this feature &rarr;
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/full-loop-crm-service-features"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              See All Features
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Get Started Today
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
