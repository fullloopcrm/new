"use client";

import { motion } from "framer-motion";

const tools = [
  { name: "Google Analytics 4", category: "Analytics" },
  { name: "Google Search Console", category: "SEO" },
  { name: "SEMrush", category: "SEO" },
  { name: "Ahrefs", category: "SEO" },
  { name: "Screaming Frog", category: "Technical SEO" },
  { name: "Hotjar", category: "UX & Heatmaps" },
  { name: "HubSpot", category: "CRM & Automation" },
  { name: "Zapier", category: "Automation" },
  { name: "Next.js", category: "Web Development" },
  { name: "Vercel", category: "Hosting & Deploy" },
  { name: "Supabase", category: "Database & Auth" },
  { name: "Resend", category: "Email Infrastructure" },
  { name: "Telnyx", category: "Voice & SMS" },
  { name: "Figma", category: "Design" },
  { name: "Looker Studio", category: "Reporting" },
  { name: "ChatGPT / AI", category: "AI & Content" },
  { name: "Claude AI", category: "AI & Automation" },
  { name: "Twilio", category: "Communications" },
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
              Powered by the Best Tools in the Industry
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-4">
            We invest in professional-grade tools so you don&apos;t have to.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-slate-600 text-center max-w-3xl mx-auto mb-16 leading-relaxed"
        >
          Every decision we make is backed by data — not gut feelings, not
          guesswork. We run the same toolset that big agencies charge tens of
          thousands for, and we put it to work for local businesses like yours.
          The difference? You don&apos;t pay $50K+ per year in software
          licenses. That&apos;s our problem, not yours. When you work with
          The NYC Marketing Company, you get the full arsenal from day one: real-time
          analytics, competitive intelligence, technical auditing, conversion
          tracking, and AI-powered content strategy. Every tool, every insight,
          every advantage — working for your local business around the clock.
        </motion.p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
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
              <p className="text-teal-600 text-xs uppercase tracking-wider">
                {tool.category}
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
          18 professional-grade tools. Zero extra cost to you. That&apos;s how we help local businesses compete.
        </motion.p>

        {/* Communication & Experience */}
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
                Why We&apos;re Different
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4 font-heading">
                The Best Communication of Any Marketing Company in NYC
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                When you work with The NYC Marketing Company, you&apos;re not handed off to a junior account manager who&apos;s reading from a script. You work directly with someone who has <span className="text-white font-bold">25 years of experience</span> in the exact seat they sit in — strategy, execution, and results. No layers. No runaround. No waiting 3 days for an email back. We pick up the phone. We respond same-day. We treat your business like it&apos;s ours because that&apos;s the only way this works.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Direct Access to Senior Leadership</p>
                  <p className="text-white/50 text-xs">No account managers, no middlemen — you talk to the person doing the work.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Same-Day Response Guarantee</p>
                  <p className="text-white/50 text-xs">Email, call, or text — we get back to you the same business day. Every time.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">25 Years of Hands-On Experience</p>
                  <p className="text-white/50 text-xs">Not 25 years in &ldquo;business&rdquo; — 25 years in the exact discipline you&apos;re hiring us for.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-teal-400 text-lg mt-0.5">&#x2713;</span>
                <div>
                  <p className="text-white font-bold text-sm">Transparent Reporting & Honest Updates</p>
                  <p className="text-white/50 text-xs">You&apos;ll always know what we&apos;re doing, why we&apos;re doing it, and what&apos;s working.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
