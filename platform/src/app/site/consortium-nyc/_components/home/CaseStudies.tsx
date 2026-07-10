"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const briefs = [
  {
    name: "Moodap\u2122",
    type: "Startup | Pre-Revenue",
    services: ["SEO", "Web Design", "AI", "Branding"],
    highlight: "2K+ Page 1 Rankings in 2 Months",
    status: "Active — Full case study coming soon",
  },
  {
    name: "The Boston Landscaping Company",
    type: "Startup | 9 Months",
    services: ["SEO", "Web Design", "Google Business"],
    highlight: "25+ Page 1 Rankings, $200K+ Revenue",
    status: "Active — Full case study coming soon",
  },
  {
    name: "The NYC Maid",
    type: "Startup | 6 Months",
    services: ["SEO", "Web Design", "Branding", "Google Business"],
    highlight: "500+ Page 1 Rankings, $68K Revenue",
    status: "Active — Full case study coming soon",
  },
  {
    name: "The NYC Classifieds",
    type: "Startup | Pre-Revenue",
    services: ["SEO", "Web Design", "AI"],
    highlight: "10+ Page 1 Rankings in Under 10 Days",
    status: "Active — Full case study coming soon",
  },
  {
    name: "Destin Digital",
    type: "Startup | 3 Months",
    services: ["SEO", "Web Design", "Branding"],
    highlight: "10+ Page 1 Rankings, $15K+ Revenue",
    status: "Active — Full case study coming soon",
  },
  {
    name: "Urban Clothing NYC",
    type: "Startup | Pre-Revenue",
    services: ["SEO", "Web Design", "Social Media"],
    highlight: "100+ Page 1 Rankings, 32K Traffic/mo",
    status: "Active — Full case study coming soon",
  },
  {
    name: "The NYC Mobile Salon",
    type: "Startup | Pre-Revenue",
    services: ["SEO", "Web Design", "Branding", "Google Business"],
    highlight: "500+ Page 1 Rankings in Under 15 Days",
    status: "Active — Full case study coming soon",
  },
  {
    name: "The NYC SEO",
    type: "Startup | Pre-Revenue",
    services: ["SEO", "Web Design", "AI"],
    highlight: "500+ Page 1 Rankings, 3K Traffic/mo in 15 Days",
    status: "Active — Full case study coming soon",
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
            Marketing Case Studies
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Case Study Briefs From{" "}
            <span className="text-teal-600">Real Businesses We Work With</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Real businesses. Real results. Full case studies with deep dives into strategy, execution, and ROI are coming soon. Read more about <Link href="/whats-working-in-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">what&apos;s working in marketing</Link> right now.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {briefs.map((b, i) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              className="rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
            >
              <h3 className="text-sm font-bold text-slate-900 font-heading">{b.name}</h3>
              <p className="text-teal-600 text-xs font-semibold font-cta mt-0.5 mb-3">{b.type}</p>

              {/* Services */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {b.services.map((s) => (
                  <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {s}
                  </span>
                ))}
              </div>

              {/* Highlight */}
              <p className="text-slate-900 text-sm font-bold font-mono flex-1">
                {b.highlight}
              </p>

              {/* Status */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-slate-400 text-xs italic">{b.status}</p>
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
              href="/nyc-marketing-company-portfolio"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              See Full Portfolio
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
