"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const resources = [
  {
    title: "Free SEO Audit",
    description:
      "Get a complete analysis of your website's SEO health — technical issues, keyword gaps, backlink profile, and competitor benchmarks. No strings attached. No sales pitch required.",
    cta: "Get It Free",
    href: "/the-free-human+ai-seo-marketing-review",
  },
  {
    title: "2026 Digital Marketing Checklist",
    description:
      "The 45-point checklist our team uses for every single client. SEO, local search, content, website optimization, and AI automation — every box you need to check to dominate online this year.",
    cta: "Use the Checklist",
    href: "/master-marketing-checklist-last-updated-2026",
  },
  {
    title: "ROI Calculator",
    description:
      "See exactly what digital marketing can do for your bottom line. Plug in your numbers and get a clear projection of traffic, leads, and revenue. Know before you invest.",
    cta: "Calculate Your ROI",
    href: "/annual-marketing-spend-roi-calculator",
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
    <section className="relative py-24 px-6 bg-teal-50 overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
              Free Resources to Grow Your Business
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            No gimmicks. No bait-and-switch. Just genuinely useful resources that
            help you make smarter decisions about your marketing.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {resources.map((resource) => (
            <motion.div
              key={resource.title}
              variants={cardVariants}
              whileHover={{
                y: -5,
              }}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 flex flex-col hover:border-teal-300 transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg mb-6 flex items-center justify-center bg-teal-50 border border-teal-200"
              >
                <span
                  className="text-2xl font-black text-teal-600"
                >
                  {resource.title === "Free SEO Audit"
                    ? "S"
                    : resource.title === "2026 Digital Marketing Checklist"
                    ? "C"
                    : "R"}
                </span>
              </div>

              <h3 className="text-slate-900 text-xl font-bold mb-3 font-heading">
                {resource.title}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm flex-1 mb-8">
                {resource.description}
              </p>

              <Link
                href={resource.href}
                className="inline-block text-center px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 hover:bg-teal-500 bg-teal-600 text-white font-cta"
              >
                {resource.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-slate-600 text-center text-sm mt-10"
        >
          100% free. No credit card. No commitment. Just value.
        </motion.p>
      </div>
    </section>
  );
}
