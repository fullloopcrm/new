"use client";

import { motion } from "framer-motion";
import Link from "next/link";

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
    <section className="relative py-24 px-6 bg-[#F4F4F1] overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            The Bottom Line
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-heading">
            <span className="text-[#1F4D2C]">$166,800</span> Saved on
            Operations.{" "}
            <span className="text-[#1F4D2C]">Zero Staff</span> to Manage.
          </h2>
          <p className="text-slate-900 text-2xl md:text-3xl font-bold font-heading mb-6">
            Your Business Runs on Autopilot.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-4xl mx-auto"
        >
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -2 }}
            className="group rounded-2xl bg-white border border-slate-200 shadow-sm p-8 md:p-12 transition-all duration-300 hover:border-[#1F4D2C]"
          >
            <div className="text-center">
              <p className="text-[#3A3A3A] text-lg md:text-xl leading-relaxed mb-8">
                Full Loop replaces your entire operational stack — sales,
                scheduling, customer service, payments, reviews, retargeting —
                in one invite-only platform. Add your website network once, and organic leads
                flow in forever. No ad spend. No staffing headaches. No gaps.
              </p>
              <p className="text-[#6F6F6B] text-base leading-relaxed mb-10">
                This is the only{" "}
                <Link
                  href="/why-you-should-choose-full-loop-crm-for-your-business"
                  className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
                >
                  all-in-one home service CRM
                </Link>{" "}
                that combines automated CRM operations with a built-to-own
                website network — so your field service business generates its
                own leads, manages its own operations, and scales without adding
                headcount.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/waitlist"
                  className="inline-block px-10 py-4 rounded-full bg-[#1F4D2C] text-white font-bold text-lg hover:bg-[#1F4D2C] transition-colors duration-300 font-cta"
                >
                  See Full Pricing Breakdown
                </Link>
                <Link
                  href="/full-loop-crm-service-features"
                  className="inline-block px-8 py-4 rounded-full border-2 border-[#1F4D2C] text-[#1F4D2C] font-bold text-lg hover:bg-[#F4F4F1] transition-colors duration-300 font-cta"
                >
                  Explore All Features
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-[#3A3A3A] text-base">
            Have questions?{" "}
            <Link
              href="/full-loop-crm-frequently-asked-questions"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C] font-semibold"
            >
              Check our FAQ
            </Link>{" "}
            or{" "}
            <Link
              href="/waitlist"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C] font-semibold"
            >
              request a partnership consultation
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
