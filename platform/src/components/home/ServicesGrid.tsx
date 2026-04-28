"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { services } from "@/lib/siteData";

const iconMap: Record<string, React.ReactNode> = {
  search: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  layout: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  palette: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  target: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  "trending-up": (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  zap: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

export default function ServicesGrid() {
  return (
    <section className="py-20 sm:py-28 bg-[#F4F4F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Services
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Full-Service Marketing for{" "}
            <span className="text-[#1F4D2C]">New York City Businesses</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            From <Link href="/nyc-marketing-company-services-list" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">SEO and web design</Link> to branding, social media, and <Link href="/ai" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">AI automation</Link> — every service integrated into one strategy that drives leads, revenue, and compounding growth for your business.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex flex-col group hover:shadow-md transition-shadow"
            >
              <div className="text-[#1F4D2C] mb-5 group-hover:text-[#1F4D2C] transition-colors">
                {iconMap[service.icon] ?? iconMap.search}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 font-heading">
                {service.name}
              </h3>
              <p className="text-[#3A3A3A] text-sm mb-6 flex-1">
                {service.shortDesc}
              </p>
              <Link
                href={`/services/${service.slug}`}
                className="text-[#1F4D2C] text-sm font-semibold hover:text-[#1F4D2C] transition-colors font-cta"
              >
                Learn More &rarr;
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
