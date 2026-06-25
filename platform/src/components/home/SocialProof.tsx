"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const replacedTools = [
  {
    name: "Jobber",
    category: "Scheduling",
    icon: "📅",
    href: "https://getjobber.com",
  },
  {
    name: "Housecall Pro",
    category: "Field Management",
    icon: "🏠",
    href: "https://www.housecallpro.com",
  },
  {
    name: "ServiceTitan",
    category: "Operations",
    icon: "⚙️",
    href: "https://www.servicetitan.com",
  },
  {
    name: "Mailchimp",
    category: "Email Marketing",
    icon: "📧",
    href: "https://mailchimp.com",
  },
  {
    name: "SimpleTexting",
    category: "SMS",
    icon: "💬",
    href: "https://simpletexting.com",
  },
  {
    name: "Google Analytics",
    category: "Tracking",
    icon: "📊",
    href: "https://analytics.google.com",
  },
  {
    name: "QuickBooks",
    category: "Finance",
    icon: "💰",
    href: "https://quickbooks.intuit.com",
  },
  {
    name: "ReferralCandy",
    category: "Referrals",
    icon: "🎁",
    href: "https://www.referralcandy.com",
  },
  {
    name: "Thumbtack / Yelp Ads",
    category: "Paid Leads",
    icon: "📢",
    href: "https://www.thumbtack.com",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function SocialProof() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            All-in-One Home Service CRM
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            One Home Service CRM Replaces{" "}
            <span className="text-[#1F4D2C]">9+ Tools</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-3xl mx-auto">
            Stop duct-taping your business together. Full Loop CRM handles
            everything these tools do — and generates leads they can&apos;t. One{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              automated CRM platform
            </Link>{" "}
            for your entire field service operation.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
        >
          {replacedTools.map((tool) => (
            <motion.div
              key={tool.name}
              variants={cardVariants}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col items-center text-center"
            >
              <a href={tool.href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                <span className="text-4xl mb-3">{tool.icon}</span>
                <span className="text-slate-900 font-bold text-lg font-heading mb-1 hover:text-[#1F4D2C] transition-colors">
                  {tool.name}
                </span>
              </a>
              <span className="text-[#1F4D2C] text-sm font-semibold px-3 py-1 rounded-full border border-[#1F4D2C] bg-[#F4F4F1]">
                {tool.category}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-12 space-y-4"
        >
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            Full Loop is the all-in-one field service CRM built to replace your
            entire stack — scheduling, dispatch, invoicing, marketing, reviews,
            and lead generation — in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/full-loop-crm-service-features"
              className="inline-block px-8 py-3 rounded-full bg-[#1F4D2C] text-white font-bold text-lg hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
            >
              See All Features
            </Link>
            <Link
              href="/waitlist"
              className="inline-block px-8 py-3 rounded-full border-2 border-[#1F4D2C] text-[#1F4D2C] font-bold text-lg hover:bg-[#F4F4F1] transition-colors font-cta"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
