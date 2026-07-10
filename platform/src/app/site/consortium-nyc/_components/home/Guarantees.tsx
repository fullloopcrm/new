"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const guarantees = [
  {
    icon: "01",
    title: "100% Transparency",
    description:
      "Full access to every metric, every report, every decision. No black boxes. No smoke and mirrors. You see exactly what we do, why we do it, and what it produces.",
  },
  {
    icon: "02",
    title: "No Long-Term Contracts",
    description:
      "Month-to-month. We earn your business every 30 days. If we're not delivering, you walk. That's the kind of pressure that keeps us sharp — and keeps you in control.",
  },
  {
    icon: "03",
    title: "Monthly Reporting",
    description:
      "Detailed reports on traffic, leads, revenue, and ROI. In plain English. Not a 40-page PDF full of jargon. Real numbers tied to real business outcomes.",
  },
  {
    icon: "04",
    title: "Dedicated Team",
    description:
      "A real human who answers your calls. Your dedicated strategist, not a call center. Not a chatbot. Not an intern. A senior strategist who knows your business inside and out.",
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

export default function Guarantees() {
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
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Company Guarantees
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Our Guarantee to Every{" "}
            <span className="text-teal-600">New York City Business We Work With</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            No contracts, full transparency, and a dedicated team — commitments most <Link href="/whats-working-in-marketing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">marketing companies</Link> are too afraid to make. Here&apos;s what you get in writing.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
          {guarantees.map((item) => (
            <motion.div
              key={item.title}
              variants={cardVariants}
              whileHover={{
                y: -2,
              }}
              className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-8 transition-all duration-300 hover:border-teal-300"
            >
              <div className="flex items-start gap-6">
                <div className="shrink-0 w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center">
                  <span className="text-white text-xl font-black font-mono">
                    {item.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-slate-900 text-xl font-bold mb-3 font-heading">
                    {item.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-xl text-slate-600 mb-8">
            Work with an agency that puts{" "}
            <span className="text-teal-600 font-bold">YOU</span> first.
          </p>
          <Link
            href="/contact"
            className="inline-block px-10 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-500 transition-colors duration-300 font-cta"
          >
            Book Your Free Strategy Call
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
