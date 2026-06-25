"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { type ReactNode } from "react";

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">{children}</Link>
);

interface StageFeature {
  name: string;
  description: string;
}

interface Stage {
  badge: string;
  title: string;
  headline: string;
  description: ReactNode;
  features: StageFeature[];
  emoji: string;
}

const stages: Stage[] = [
  {
    badge: "Stage 1",
    title: "Lead Generation",
    headline: "Own Every Neighborhood You Serve",
    emoji: "🌐",
    description: (
      <span>
        Your automated home service CRM starts with{" "}
        <L href="/full-loop-crm-service-features">organic lead generation</L> that eliminates ad
        spend entirely. Deploy a multi-domain SEO network that ranks in every
        zip code you serve &mdash; driving qualified leads directly into your{" "}
        <L href="/why-you-should-choose-full-loop-crm-for-your-business">Full Loop CRM pipeline</L>.
      </span>
    ),
    features: [
      {
        name: "Multi-Domain SEO Network",
        description:
          "Deploy neighborhood-specific websites that rank organically. 100+ domains, hyper-local keywords, zero ad spend.",
      },
      {
        name: "Domain Performance Analytics",
        description:
          "See which domains drive revenue, not just traffic. Revenue attribution per domain with confidence scoring.",
      },
      {
        name: "Traffic Source Intelligence",
        description:
          "Track Google, Bing, ChatGPT, Claude, DuckDuckGo, social, direct \u2014 with device-level detail.",
      },
      {
        name: "Smart Lead Attribution",
        description:
          "Connect website visits to booked appointments with time-decay confidence scoring.",
      },
    ],
  },
  {
    badge: "Stage 2",
    title: "AI Sales",
    headline: "Close Leads 24/7 Without Lifting a Finger",
    emoji: "🤖",
    description: (
      <span>
        The moment a lead comes in, your{" "}
        <L href="/full-loop-crm-service-features">AI sales assistant</L> engages via SMS &mdash;
        qualifying, handling objections, and booking jobs around the clock.
        Bilingual English/Spanish support means no lead gets lost. See how{" "}
        <L href="/why-you-should-choose-full-loop-crm-for-your-business">automated CRM</L> replaces your front desk.
      </span>
    ),
    features: [
      {
        name: "State Machine Booking Flow",
        description:
          "10-field checklist collected one at a time. Numbered SMS replies (1, 2, 3) for fast booking. Never re-asks for info already collected.",
      },
      {
        name: "SMS + Web Chat — Same AI",
        description:
          "Works on SMS and your website. New clients start fresh; returning clients enter their phone and Yinez loads their full profile instantly.",
      },
      {
        name: "Returning Client Recognition",
        description:
          "Knows name, address, past bookings, preferred team member, last rate. Greets by name, skips known fields, makes rebooking effortless.",
      },
      {
        name: "Smart Escalation & Recovery",
        description:
          "Detects frustration, damage reports, or unusual requests — escalates with full transcript. One-click conversation reset if anything gets stuck.",
      },
      {
        name: "AI Performance Dashboard",
        description:
          "Conversion rate, avg messages, checklist completion, channel breakdown. Filter by date. Every error logged with context.",
      },
      {
        name: "24/7 Bilingual Coverage",
        description:
          "English and Spanish. 11 PM Sunday or 10 AM Tuesday — same fast, warm response. Texts in Spanish? Responds entirely in Spanish.",
      },
    ],
  },
  {
    badge: "Stage 3",
    title: "Scheduling",
    headline: "Smart Booking That Runs Itself",
    emoji: "📅",
    description: (
      <span>
        A{" "}
        <L href="/full-loop-crm-service-features">field service management</L> scheduling engine
        built for recurring home service businesses. Real-time availability,
        automated reminders, and drag-and-drop rescheduling keep your calendar
        full and your no-show rate near zero. Learn more in{" "}
        <L href="/full-loop-crm-101-educational-tips">CRM 101</L>.
      </span>
    ),
    features: [
      {
        name: "Smart Booking Engine",
        description:
          "Real-time availability, 90-minute buffer between jobs, same-day booking controls.",
      },
      {
        name: "Recurring Booking Management",
        description:
          "7 recurring patterns. Edit single instance or entire series.",
      },
      {
        name: "Automated Reminders",
        description:
          "4-stage cascade: 7 days, 3 days, 1 day, 2 hours. Email + SMS + push.",
      },
      {
        name: "Visual Calendar",
        description:
          "Month, week, day views. Drag-and-drop rescheduling. Color-coded by team member.",
      },
    ],
  },
  {
    badge: "Stage 4",
    title: "Field Operations",
    headline: "Manage Your Team from Anywhere",
    emoji: "📍",
    description: (
      <span>
        GPS-verified check-in/out, a bilingual team portal, and real-time
        earnings visibility give your field team everything they need &mdash;
        and give you full operational control. See all{" "}
        <L href="/full-loop-crm-service-features">field service management features</L> or compare{" "}
        <L href="/waitlist">plans</L>.
      </span>
    ),
    features: [
      {
        name: "GPS Check-In/Out",
        description:
          "GPS verified with 528-foot threshold. Auto-calculates hours with 10-minute grace rounding.",
      },
      {
        name: "Video Walkthroughs",
        description:
          "Before and after video recordings from the job site. Stored 30 days. Proof of quality if disputes arise.",
      },
      {
        name: "15-Minute Heads Up",
        description:
          "One tap sends you SMS with client name, team member, amount to collect, and team pay. No math needed.",
      },
      {
        name: "Bilingual Team Portal",
        description:
          "PIN login, today\u2019s jobs, one-tap navigation. Full EN/ES. Saves to home screen like a native app.",
      },
      {
        name: "Earnings Dashboard",
        description:
          "Weekly, monthly, yearly totals. Per-job pay. All SMS notifications bilingual.",
      },
      {
        name: "Emergency Broadcasting",
        description:
          "One-click broadcast to all team via email, SMS, and push. Bilingual EN/ES.",
      },
    ],
  },
  {
    badge: "Stage 5",
    title: "Payments & Finance",
    headline: "Revenue, Payroll, and Taxes \u2014 Automated",
    emoji: "💰",
    description: (
      <span>
        Track every dollar from invoice to deposit. Automated payroll, expense
        categorization, and tax-ready 1099 reports mean your{" "}
        <L href="/full-loop-crm-service-features">home service CRM</L> doubles as your back office.
        See{" "}
        <L href="/waitlist">pricing</L> or learn{" "}
        <L href="/why-you-should-choose-full-loop-crm-for-your-business">why Full Loop</L> replaces 5+ tools.
      </span>
    ),
    features: [
      {
        name: "Revenue Tracking",
        description:
          "Today, weekly, monthly, YTD. 10-month forecast. Paid vs outstanding.",
      },
      {
        name: "Payroll Management",
        description:
          "Per-team pending pay. One-click Mark Paid via Zelle/Apple Cash.",
      },
      {
        name: "P&L and Margin Analysis",
        description:
          "Monthly and YTD with gross/net margin. 9 expense categories.",
      },
      {
        name: "Tax-Ready 1099 Reports",
        description:
          "Per-contractor totals, $600 threshold flagging, CSV export.",
      },
    ],
  },
  {
    badge: "Stage 6",
    title: "Reviews & Feedback",
    headline: "Turn Every Job Into a Five-Star Review",
    emoji: "⭐",
    description: (
      <span>
        Automated follow-ups, anonymous feedback collection, and AI-powered
        complaint escalation protect your reputation and drive repeat bookings.
        This is the{" "}
        <L href="/full-loop-crm-service-features">automated CRM</L> advantage &mdash; reviews on
        autopilot. Start with{" "}
        <L href="/full-loop-crm-101-educational-tips">CRM 101</L> to see the full loop.
      </span>
    ),
    features: [
      {
        name: "Automated Follow-Ups",
        description:
          "3-day post-service thank-you with 10% rebooking discount.",
      },
      {
        name: "Feedback Collection",
        description:
          "Floating widget on all client portal pages plus standalone form.",
      },
      {
        name: "AI Complaint Escalation",
        description:
          "Negative sentiment detection escalates to phone call immediately.",
      },
    ],
  },
  {
    badge: "Stage 7",
    title: "Retargeting",
    headline: "Keep Every Client Coming Back",
    emoji: "🔄",
    description: (
      <span>
        Client lifecycle analytics, referral programs, and multi-channel
        re-engagement turn one-time customers into lifelong revenue. The final
        stage of your{" "}
        <L href="/why-you-should-choose-full-loop-crm-for-your-business">Full Loop CRM</L> closes the loop and starts
        it again. See{" "}
        <L href="/full-loop-crm-service-features">all retargeting features</L> or check{" "}
        <L href="/waitlist">pricing</L>.
      </span>
    ),
    features: [
      {
        name: "Client Lifecycle Analytics",
        description:
          "Auto-categorized: New, Active, At-Risk, Churned.",
      },
      {
        name: "Referral Program Engine",
        description:
          "Self-service signup, unique codes, 10% auto-commission, payout management.",
      },
      {
        name: "Retention Intelligence",
        description:
          "Retention rate, churn rate, LTV, top 10 clients by revenue.",
      },
      {
        name: "Multi-Channel Communication",
        description:
          "15+ email templates, SMS via Telnyx, web push. Bilingual.",
      },
    ],
  },
];

export default function ServiceDeepDives() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Full Loop CRM Feature Breakdown
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Seven Stages of{" "}
            <span className="text-[#1F4D2C]">Automated Field Service Management</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-3xl mx-auto">
            Every stage feeds the next. <L href="/full-loop-crm-service-features">Lead generation</L>{" "}
            fills your pipeline. AI sales close the deal. Scheduling and field
            ops execute flawlessly. Payments flow automatically. Reviews build
            your reputation. Retargeting brings clients back. See{" "}
            <L href="/waitlist">transparent pricing</L> or start with{" "}
            <L href="/full-loop-crm-101-educational-tips">CRM 101</L>.
          </p>
        </motion.div>

        {/* Stage blocks */}
        <div className="space-y-24">
          {stages.map((stage, i) => {
            const isEven = i % 2 === 0;

            return (
              <motion.div
                key={stage.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-start ${
                  isEven ? "" : "lg:flex-row-reverse"
                }`}
              >
                {/* Text block */}
                <div className="flex-1">
                  <span className="text-[#1F4D2C] text-sm font-semibold tracking-[0.15em] uppercase mb-3 block">
                    {stage.badge} &mdash; {stage.title}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6 font-heading">
                    {stage.headline}
                  </h3>
                  <p className="text-[#3A3A3A] leading-relaxed mb-6">
                    {stage.description}
                  </p>
                  <Link
                    href="/full-loop-crm-service-features"
                    className="inline-block mt-2 px-6 py-3 text-sm font-bold text-white rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors font-cta"
                  >
                    Explore {stage.title} Features
                  </Link>
                </div>

                {/* Feature cards */}
                <div className="flex-1 w-full">
                  <div className={`grid ${stage.features.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"} gap-4`}>
                    {stage.features.map((feature) => (
                      <div
                        key={feature.name}
                        className="rounded-xl bg-slate-50 border border-slate-200 p-5"
                      >
                        <h4 className="text-sm font-bold text-slate-900 mb-2 font-heading">
                          {feature.name}
                        </h4>
                        <p className="text-[#6F6F6B] text-xs leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
