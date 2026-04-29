"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const highlights = [
  {
    name: "Exclusive Territory",
    desc: "One operator per trade per metro. Every lead we generate in your city routes to you \u2014 and only you.",
  },
  {
    name: "Yinez AI",
    desc: "Your 24/7 AI receptionist that books appointments via SMS and web chat. Bilingual.",
  },
  {
    name: "Custom Website",
    desc: "Auto-generated pages for every service, every area, every hiring opportunity.",
  },
  {
    name: "Full CRM",
    desc: "Clients, bookings, calendar, finance, campaigns, referrals \u2014 one dashboard.",
  },
  {
    name: "Team Portal",
    desc: "GPS check-in, video walkthroughs, 30-min payment alert, earnings tracking. Bilingual.",
  },
  {
    name: "SEO That Compounds",
    desc: "Your site gets stronger every month. 20,000+ indexed pages route qualified local search to you alone.",
  },
];

export default function QuickTips() {
  return (
    <section className="py-16 sm:py-20 bg-[#1F4D2C]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="text-teal-100 text-sm font-bold uppercase tracking-widest block mb-3 font-cta">
            What Every Territory License Includes:
          </span>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {highlights.map((h, i) => (
            <motion.div
              key={h.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="border rounded-lg px-5 py-4"
              style={{ backgroundColor: "rgba(244, 244, 241, 0.06)", borderColor: "rgba(244, 244, 241, 0.18)" }}
            >
              <p className="text-[#1C1C1C] text-base leading-relaxed">
                <strong className="text-teal-100">{h.name}</strong>{" "}
                <span className="text-[#1C1C1C]">&mdash;</span>{" "}
                {h.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center"
        >
          <Link
            href="/full-loop-crm-service-features"
            className="inline-block px-8 py-3.5 text-base font-bold text-[#1F4D2C] bg-white rounded-lg hover:bg-[#F4F4F1] transition-colors shadow-lg font-cta"
          >
            See everything included &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
