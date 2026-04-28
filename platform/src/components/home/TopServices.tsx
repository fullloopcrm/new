"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const stages = [
  {
    badge: "Stage 1",
    title: "Lead Generation",
    desc: "Organic SEO across a multi-domain website network. Rank in every neighborhood you serve. Zero ad spend.",
    href: "/full-loop-crm-service-features",
    emoji: "🌐",
  },
  {
    badge: "Stage 2",
    title: "AI Sales",
    desc: "Selena AI books jobs via SMS and web chat using a state machine. Recognizes returning clients. Bilingual. 24/7.",
    href: "/full-loop-crm-service-features",
    emoji: "🤖",
  },
  {
    badge: "Stage 3",
    title: "Scheduling",
    desc: "Smart booking engine with recurring management, real-time availability, and automated reminders.",
    href: "/full-loop-crm-service-features",
    emoji: "📅",
  },
  {
    badge: "Stage 4",
    title: "Field Operations",
    desc: "GPS check-in, video walkthroughs, 30-min payment alert, hiring pages for every neighborhood. Bilingual team portal.",
    href: "/full-loop-crm-service-features",
    emoji: "📍",
  },
  {
    badge: "Stage 5",
    title: "Payments & Finance",
    desc: "Revenue tracking, automated payroll, expense management, P&L reporting, and tax-ready 1099s.",
    href: "/full-loop-crm-service-features",
    emoji: "💰",
  },
  {
    badge: "Stage 6",
    title: "Reviews & Feedback",
    desc: "Automated post-service follow-ups, anonymous feedback collection, and AI complaint escalation.",
    href: "/full-loop-crm-service-features",
    emoji: "⭐",
  },
  {
    badge: "Stage 7",
    title: "Retargeting",
    desc: "Client lifecycle analytics, at-risk detection, referral program engine, and multi-channel re-engagement.",
    href: "/full-loop-crm-service-features",
    emoji: "🔄",
  },
];

export default function TopServices() {
  return (
    <section className="bg-[#F4F4F1] py-20 sm:py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Home Service CRM Platform
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
            Seven Stages. One{" "}
            <span className="text-[#1F4D2C]">Home Service CRM Platform.</span>
          </h2>
          <p className="mt-4 text-[#3A3A3A] text-lg max-w-2xl mx-auto">
            From first click to five-star review &mdash; every stage of your business, automated and connected.
            Explore our{" "}
            <Link href="/full-loop-crm-service-features" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">
              full feature breakdown
            </Link>
            , see{" "}
            <Link href="/full-loop-crm-pricing" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">
              transparent pricing
            </Link>
            , learn{" "}
            <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">
              why Full Loop
            </Link>
            , or start with{" "}
            <Link href="/full-loop-crm-101-educational-tips" className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">
              CRM 101
            </Link>
            .
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
            >
              <Link
                href={s.href}
                className="group block rounded-xl bg-white border border-slate-200 hover:border-[#1F4D2C] p-5 h-full transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#1F4D2C] font-cta">
                    {s.badge}
                  </span>
                  <span className="text-2xl" role="img" aria-label={s.title}>
                    {s.emoji}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 font-heading group-hover:text-[#1F4D2C] transition-colors">
                  {s.title}
                </h3>
                <p className="text-[#6F6F6B] text-xs leading-relaxed line-clamp-3 mb-3">
                  {s.desc}
                </p>
                <span className="text-[#1F4D2C] text-xs font-semibold group-hover:underline font-cta">
                  Explore {s.title} &rarr;
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
