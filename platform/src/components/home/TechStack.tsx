"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const tools = [
  { name: "Next.js & React", description: "Latest framework with server-side rendering and edge middleware" },
  { name: "Supabase (PostgreSQL)", description: "Enterprise-grade database with Row Level Security on every table" },
  { name: "Vercel Edge Network", description: "Global CDN deployment with auto-scaling and zero-downtime deploys" },
  { name: "Telnyx SMS", description: "Carrier-grade SMS delivery with retry logic and delivery tracking" },
  { name: "Resend Email", description: "Transactional email with Outlook-compatible templates" },
  { name: "Web Push (VAPID)", description: "Real-time push notifications across all platforms including iOS" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export default function TechStack() {
  return (
    <section className="relative py-24 px-6 bg-teal-50 overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Built on Modern, Battle-Tested Infrastructure
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4">
            Full Loop CRM is engineered for reliability, speed, and scale.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-slate-600 text-center max-w-3xl mx-auto mb-16 leading-relaxed"
        >
          Every layer of Full Loop CRM is built on production-grade technology trusted by companies at every scale. From edge-deployed front ends to carrier-grade messaging infrastructure, your <Link href="/full-loop-crm-service-features" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">CRM features</Link> run on the same stack that powers enterprise SaaS platforms — without the enterprise price tag. Learn more about <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">why Full Loop is different</Link>.
        </motion.p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        >
          {tools.map((tool) => (
            <motion.div
              key={tool.name}
              variants={badgeVariants}
              whileHover={{
                scale: 1.05,
              }}
              className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 text-center cursor-default transition-colors duration-300 hover:border-teal-300"
            >
              <p className="text-slate-900 font-semibold text-sm mb-1 font-cta">
                {tool.name}
              </p>
              <p className="text-teal-600 text-xs leading-relaxed">
                {tool.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-slate-600 text-center text-sm mt-10"
        >
          6 core technologies. Zero third-party middleware. One unified platform for <Link href="/full-loop-crm-service-business-industries" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">home service businesses</Link>.
        </motion.p>

        {/* Why It Matters */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 rounded-xl bg-slate-900 border border-slate-700 p-8 sm:p-10"
        >
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-3 font-cta">
                Why It Matters
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 font-heading">
                Your Business Runs on This Stack 24/7
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Full Loop CRM handles your lead generation, client communications, team operations, and financial reporting around the clock. Every SMS, every booking, every invoice flows through infrastructure designed for <span className="text-white font-bold">zero downtime and instant response times</span>. Explore our <Link href="/full-loop-crm-101-educational-tips" className="text-teal-400 underline underline-offset-2 hover:text-teal-300">CRM 101 guide</Link> to see how it all works together.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Row Level Security on Every Table</p>
                  <p className="text-white/50 text-xs">Every database query is scoped to the authenticated user. No data leaks, ever.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Edge-Deployed Globally</p>
                  <p className="text-white/50 text-xs">Pages load in milliseconds. Your team and clients get instant responses regardless of location.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Carrier-Grade SMS Delivery</p>
                  <p className="text-white/50 text-xs">Built-in retry logic and delivery receipts ensure every message reaches the client.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Three Notification Channels</p>
                  <p className="text-white/50 text-xs">SMS, email, and web push — so no appointment, update, or alert ever gets missed.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
