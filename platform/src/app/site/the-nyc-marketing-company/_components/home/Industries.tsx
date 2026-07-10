"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { industries } from "@/app/site/the-nyc-marketing-company/_lib/siteData";

const top20 = industries.slice(0, 20);

export default function Industries() {
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
            Industry Marketing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Marketing for 100+ Industries Across{" "}
            <span className="text-teal-600">New York &amp; the Tri-State Area</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Industry-specific marketing strategies for law firms, restaurants, contractors, medical practices, and more across NYC, Brooklyn, Queens, Long Island, and Westchester. We&apos;ve served over 25 years of businesses across every vertical imaginable. Explore our <Link href="/services-areas-we-offer-marketing-services-in" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">service areas</Link> or see <Link href="/nyc-marketing-pricing-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">pricing</Link>.
          </p>
        </motion.div>

        {/* Grid — top 20 */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {top20.map((ind, i) => (
            <motion.div
              key={ind.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
            >
              <Link
                href={`/industries-we-offer-marketing-services-for/${ind.slug}`}
                className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-5 h-full transition-all shadow-sm hover:shadow-md"
              >
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">
                  {ind.badge}
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors mt-1 mb-2 font-heading">
                  {ind.name}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                  {ind.desc}
                </p>
                <span className="text-teal-600 text-xs font-semibold group-hover:underline font-cta mt-2 inline-block">
                  Learn more &rarr;
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-slate-600 text-lg mb-6">
            These are just 20 of the 100 industries we&apos;ve served over our 25 years in business. If people search for it, we can dominate it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/industries-we-offer-marketing-services-for"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              See All Industries We&apos;ve Served
            </Link>
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
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