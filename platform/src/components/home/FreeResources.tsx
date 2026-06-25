"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const resources = [
  {
    title: "You Run a Home Service Business",
    description:
      "Cleaning, HVAC, plumbing, pest control, landscaping, painting, or any of 50+ trades that book appointments in a geographic area. If your business sends crews to customers' homes, Full Loop CRM was built for you.",
    cta: "See All Industries",
    href: "/full-loop-crm-service-business-industries",
    letter: "H",
  },
  {
    title: "You Want to Own Your Market",
    description:
      "You're ready for an exclusive territory lock — one partner per trade per metro. Your leads, your domains, your market. No shared leads, no bidding wars, no competition from within the platform.",
    cta: "View Pricing",
    href: "/waitlist",
    letter: "M",
  },
  {
    title: "You're Done Duct-Taping Tools",
    description:
      "You've tried Jobber, Housecall Pro, ServiceTitan, or a stack of disconnected software. You want one platform that handles lead generation, sales, scheduling, field ops, payments, reviews, and retargeting.",
    cta: "See Why We're Different",
    href: "/why-you-should-choose-full-loop-crm-for-your-business",
    letter: "D",
  },
  {
    title: "You Value Partnership Over Subscriptions",
    description:
      "Full Loop CRM comes with 20+ years of home service consulting experience. This isn't a SaaS subscription — it's a business partnership with hands-on onboarding, strategy, and ongoing support.",
    cta: "About Our Team",
    href: "/about-full-loop-crm",
    letter: "P",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function FreeResources() {
  return (
    <section className="relative py-24 px-6 bg-[#F4F4F1] overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
              Is Full Loop CRM Right for Your Business?
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            Full Loop CRM is built for home service businesses ready to dominate
            their market. Here&apos;s who we work with — and why the partnership model
            works.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {resources.map((resource) => (
            <motion.div
              key={resource.title}
              variants={cardVariants}
              whileHover={{
                y: -5,
              }}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex flex-col hover:border-[#1F4D2C] transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg mb-6 flex items-center justify-center bg-[#F4F4F1] border border-teal-200"
              >
                <span
                  className="text-2xl font-black text-[#1F4D2C]"
                >
                  {resource.letter}
                </span>
              </div>

              <h3 className="text-slate-900 text-xl font-bold mb-3 font-heading">
                {resource.title}
              </h3>
              <p className="text-[#3A3A3A] leading-relaxed text-sm flex-1 mb-8">
                {resource.description}
              </p>

              <Link
                href={resource.href}
                className="inline-block text-center px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 hover:bg-[#1F4D2C] bg-[#1F4D2C] text-white font-cta"
              >
                {resource.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-10"
        >
          <Link
            href="/waitlist"
            className="inline-block px-10 py-4 rounded-full bg-[#1F4D2C] text-white font-bold text-lg hover:bg-[#1F4D2C] transition-colors duration-300 font-cta"
          >
            Apply for Partnership
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
