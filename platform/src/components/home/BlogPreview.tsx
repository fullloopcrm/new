"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const reviews = [
  {
    name: "Keisha W.",
    service: "Deep Cleaning",
    location: "Chicago",
    quote:
      "I thought I needed to hire a receptionist. Turns out I needed Selenas. She handles 80% of what a front desk person would do. The ROI isn\u2019t even close.",
  },
  {
    name: "David H.",
    service: "Janitorial",
    location: "Denver",
    quote:
      "What impressed me most was the financial reporting. Real P&L \u2014 revenue, labor costs per team member, expenses by category, net margin. My accountant was thrilled with the 1099 export.",
  },
  {
    name: "Brenda F.",
    service: "Eco-Friendly Cleaning",
    location: "Portland",
    quote:
      "The referral program sold itself. Three clients signed up as referrers in the first week. Clicks, conversions, commissions \u2014 all tracked automatically.",
  },
  {
    name: "Mariana S.",
    service: "Apartment Cleaning",
    location: "Washington DC",
    quote:
      "I manage 200+ clients and Full Loop handles all of them without me touching anything most days. I went on vacation for a week and the business ran itself.",
  },
  {
    name: "Linda P.",
    service: "Window Cleaning",
    location: "Austin",
    quote:
      "I came in expecting another CRM. What I got was a business partner. Built by someone who lived it.",
  },
];

export default function BlogPreview() {
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
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            More Home Service CRM Reviews
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            More <span className="text-teal-600">Reviews</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            From cleaning companies to HVAC contractors &mdash; business owners
            across the country are switching to{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              Full Loop
            </Link>
            .
          </p>
        </motion.div>

        {/* Review Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <motion.article
              key={review.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-teal-300 p-6 sm:p-8 transition-all flex flex-col"
            >
              <p className="text-teal-600 text-xs font-bold tracking-wide uppercase mb-4 font-cta">
                {review.service} &middot; {review.location}
              </p>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors mb-3 leading-snug font-heading">
                {review.name}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                &ldquo;{review.quote}&rdquo;
              </p>
              <Link
                href="/full-loop-crm-pricing"
                className="inline-flex items-center gap-2 text-teal-600 text-sm font-semibold hover:underline font-cta"
              >
                See Pricing
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/why-you-should-choose-full-loop-crm-for-your-business"
            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:underline transition-all font-cta"
          >
            Why Full Loop CRM
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
