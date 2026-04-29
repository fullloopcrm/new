"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactNode } from "react";
import Link from "next/link";

const L = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]">{children}</Link>
);

const faqs: { question: string; answer: ReactNode }[] = [
  {
    question: "What is Full Loop CRM and how is it different from other home service CRMs?",
    answer: <span>Full Loop CRM is the first and only CRM that handles every stage of a home service business — from organic lead generation and AI-powered sales through scheduling, GPS-verified field operations, payment collection, automated review generation, referral tracking, and client retargeting. Unlike traditional CRMs that cover one or two stages, Full Loop CRM replaces 9+ separate tools with one unified platform. It is exclusively available to one service provider per trade per city. See <L href="/full-loop-crm-service-features">all features</L> or learn <L href="/why-you-should-choose-full-loop-crm-for-your-business">why Full Loop is different</L>.</span>,
  },
  {
    question: "How does the AI sales chatbot convert leads into booked appointments?",
    answer: <span>Yinez is a bilingual AI SMS sales assistant that engages every inbound lead within seconds, 24 hours a day. She qualifies prospects by asking about their location, service needs, home size, and budget, then guides them to book online. She answers 12+ common questions about pricing, insurance, cancellation policy, eco-friendly products, and more. Learn how AI sales automation drives conversions on our <L href="/full-loop-crm-service-features">features page</L>.</span>,
  },
  {
    question: "What types of home service businesses can use Full Loop CRM?",
    answer: <span>Full Loop CRM is designed for any home service trade including cleaning services, carpet cleaning, window cleaning, pressure washing, landscaping, lawn care, handyman services, pest control, HVAC, plumbing, electrical, painting, junk removal, pool cleaning, and any field-service company that books recurring or one-time appointments. Explore supported <L href="/full-loop-crm-service-business-industries">industries</L>.</span>,
  },
  {
    question: "How does multi-domain organic SEO lead generation work?",
    answer: <span>Full Loop CRM deploys neighborhood-specific websites that rank organically in local search results. For example, a service company might have westsideservice.com, downtownpro.com, and northsideservice.com — each optimized for hyper-local long-tail keywords. The platform tracks every visitor, attributes leads to specific websites, and measures revenue per domain. Learn more about our <L href="/full-loop-crm-service-features">lead generation engine</L>.</span>,
  },
  {
    question: "Can Full Loop CRM track which website generated a paying client?",
    answer: <span>Yes. The attribution engine maps a client&apos;s address to their neighborhood, then matches that to the most relevant domain. It uses time-decay confidence scoring: 100% within 30 minutes, 75% within 1 hour, 50% within 2 hours.</span>,
  },
  {
    question: "What does the admin dashboard show?",
    answer: <span>11 purpose-built pages: Executive Dashboard, Client Management, Bookings &amp; Calendar, Team Management, Lead Tracking, Finance &amp; P&amp;L, Notification Center, AI Dashboard, Referral Program, Settings, and Technical Documentation. See the full <L href="/full-loop-crm-service-features">feature breakdown</L>.</span>,
  },
  {
    question: "How does GPS-verified check-in/out work?",
    answer: <span>Team members tap Check In on their mobile portal. GPS coordinates are captured and distance from the client&apos;s address is calculated. If distance exceeds 528 feet, a mismatch flag is raised. On checkout, hours are auto-calculated and pay is computed.</span>,
  },
  {
    question: "Does Full Loop CRM have a bilingual team portal?",
    answer: <span>Yes. Fully bilingual in English and Spanish. PIN-based login, today&apos;s job list, one-tap navigation, GPS check-in/out, earnings dashboard, availability management, and emergency job claiming.</span>,
  },
  {
    question: "How does recurring booking management work?",
    answer: <span>7 recurring patterns: daily, weekly, biweekly, triweekly, monthly by date, monthly by weekday, and custom interval. Edit a single instance or all future bookings in a series.</span>,
  },
  {
    question: "What payment methods does Full Loop CRM support?",
    answer: <span>Tracks payments via Zelle, Apple Pay, Venmo, Cash, Check, and credit card. The finance dashboard shows revenue, payroll with one-click Mark Paid, expense tracking, and auto-generated 1099 reports. See our <L href="/waitlist">pricing page</L> for platform costs.</span>,
  },
  {
    question: "How does the automated review system work?",
    answer: <span>Three days after a first-time service, clients get a personalized thank-you with a 10% rebooking discount. When negative sentiment is detected via text, AI escalates to a phone call rather than attempting resolution over text.</span>,
  },
  {
    question: "Is Full Loop CRM available in my city?",
    answer: <span>Exclusive territory model — one provider per trade per city. First-come-first-serve. Currently accepting <L href="/waitlist">partnership requests</L>.</span>,
  },
  {
    question: "Why one business per trade per city?",
    answer: <span>Exclusivity is core to the Full Loop CRM model. Our organic lead generation builds neighborhood-specific domains. If we gave the same domains to competing businesses, value would be diluted. Your leads are your leads. Read more about <L href="/why-you-should-choose-full-loop-crm-for-your-business">why Full Loop works</L>.</span>,
  },
  {
    question: "What does Full Loop CRM look for in a partner?",
    answer: <span>Business owners committed to organic, sustainable growth. Partners who appreciate consulting guidance and real-world experience from 20+ years in home services. Learn about our <L href="/partner-with-full-loop-crm">partner program</L>.</span>,
  },
  {
    question: "How much does Full Loop CRM cost?",
    answer: <span>Flat $1,000 per user per month. Every feature, every seat — no tiers, no upgrades, no caps. Solo at $1,000/mo, 5-person team at $5,000/mo, 25-person team at $25,000/mo. Every operator gets the complete platform — CRM, Yinez AI, custom website, SEO, GPS team portal, e-signature, route optimization, full bookkeeping with 1099-ready exports, hiring pages, reviews, referrals. $999 one-time setup. No contracts, cancel anytime. Full details on our <L href="/waitlist">pricing page</L>.</span>,
  },
  {
    question: "Who owns what in a Full Loop CRM partnership?",
    answer: <span>100% transparent from day one. You own: your Telnyx phone number, your Resend email account, your business name/LLC, and any $500 microsites you purchase. Full Loop owns: the CRM platform, Yinez AI, the full SEO site and domain (unless you complete the buyout), any Google Business Profiles we create, and all website code and templates. Everything is detailed in the partnership agreement before you sign. No surprises. No fine print.</span>,
  },
  {
    question: "What happens if I cancel my partnership?",
    answer: <span>You keep everything that&apos;s yours — your phone number (Telnyx), your email account (Resend), your business name, and any microsites you purchased for $500 each. Full Loop retains the CRM platform access, the full SEO site, the Google Business Profiles, and the lead generation network. If you want to take the full SEO site with you, the buyout price starts at $25,000 and increases $10,000 per year of accrued SEO value. The territory opens up for a new partner.</span>,
  },
  {
    question: "Can I buy the full SEO site that Full Loop builds for my business?",
    answer: <span>Yes. The full Next.js SEO site is included in your partnership — you get all the leads it generates exclusively. If you want to own the site and domain outright, the buyout starts at $25,000 in year one and increases $10,000 annually to reflect the SEO value we&apos;ve invested. Year 2: $35K. Year 3: $45K. Year 5: $65K. Once purchased, the site and domain are 100% yours.</span>,
  },
  {
    question: "Can Full Loop CRM replace Jobber, Housecall Pro, or ServiceTitan?",
    answer: <span>Yes. Full Loop CRM replaces Jobber (scheduling), Housecall Pro (field management), ServiceTitan (operations), Mailchimp (email), SimpleTexting (SMS), Google Analytics (tracking), QuickBooks (finance), and more. The key difference: those tools don&apos;t generate leads. See the full <L href="/why-you-should-choose-full-loop-crm-for-your-business">comparison</L>.</span>,
  },
  {
    question: "How does the client booking portal work?",
    answer: <span>Mobile-friendly with phone + email 2FA. 3-step wizard: client info, service type with pricing, date/time from live availability. Confirmation via email and SMS plus automated reminders.</span>,
  },
  {
    question: "Does Full Loop CRM offer a referral program?",
    answer: <span>Yes. Self-service signup, unique codes, trackable links, real-time analytics, automatic 10% commission on first booking, one-click payout processing.</span>,
  },
  {
    question: "What analytics and reporting does it provide?",
    answer: <span>Website tracking across 100+ domains, traffic source breakdown including AI search engines, domain health classification, revenue attribution, client lifecycle analytics, retention rates, LTV, forecasting, and full P&amp;L. Explore all <L href="/full-loop-crm-service-features">analytics features</L>.</span>,
  },
  {
    question: "How does it track leads from ChatGPT and AI search?",
    answer: <span>Every website visit tracks the referring source including ChatGPT, Claude, and Perplexity. Each visit captures domain, referrer, device, session, scroll depth, and time on page.</span>,
  },
  {
    question: "Can it run my business without me being involved daily?",
    answer: <span>Yes. Website tracking, lead attribution, AI sales, online booking, reminders, recurring generation, GPS check-in/out, pay calculation, follow-ups, lifecycle updates, and referral tracking all run without human intervention. Learn how on our <L href="/full-loop-crm-service-features">features page</L>.</span>,
  },
  {
    question: "What notifications does it send?",
    answer: <span>20+ types via email, SMS, and push: hot leads, bookings, check-ins, payments, cancellations, team applications, referrals, emergency broadcasts, daily summaries, and error alerts.</span>,
  },
  {
    question: "How secure is Full Loop CRM?",
    answer: <span>Enterprise-grade security: HMAC-SHA256 sessions, rate limiting, CSP headers, HSTS, XSS protection, Row Level Security on every table. Client 2FA, team PIN auth, all data encrypted.</span>,
  },
  {
    question: "Does it work for businesses in any US city?",
    answer: <span>Yes. Designed for any mid-to-large US city. Multi-domain SEO, AI sales, scheduling, GPS ops, and financial tools work identically regardless of geography. Check <L href="/waitlist">territory availability</L>.</span>,
  },
  {
    question: "How do I apply to become a partner?",
    answer: <span>Text us at (212) 202-9220, call us, or email hello@homeservicesbusinesscrm.com. Tell us your trade and city. We&apos;ll check territory availability. Or <L href="/waitlist">submit a partnership request</L> online.</span>,
  },
];

export default function ExpandedFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const midpoint = Math.ceil(faqs.length / 2);
  const leftColumn = faqs.slice(0, midpoint);
  const rightColumn = faqs.slice(midpoint);

  const renderFAQ = (faq: typeof faqs[0], i: number, globalIndex: number) => {
    const isOpen = openIndex === globalIndex;
    return (
      <motion.div
        key={globalIndex}
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: (i % 5) * 0.05 }}
        className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
      >
        <button
          onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-slate-900 font-semibold text-sm pr-4 font-heading">
            {faq.question}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-[#1F4D2C] text-xl flex-shrink-0"
          >
            +
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="px-5 pb-4">
                <p className="text-[#3A3A3A] text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <section className="py-20 sm:py-28 bg-[#F4F4F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Frequently Asked Questions About Full Loop CRM
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Everything Home Service Business Owners{" "}
            <span className="text-[#1F4D2C]">Want to Know</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-3xl mx-auto">
            25 answers about Full Loop CRM, organic lead generation, AI sales, exclusive territories, and running a home service business on autopilot.
          </p>
        </motion.div>

        {/* Two-column accordion */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="space-y-3">
            {leftColumn.map((faq, i) => renderFAQ(faq, i, i))}
          </div>
          <div className="space-y-3">
            {rightColumn.map((faq, i) => renderFAQ(faq, i, i + midpoint))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mt-14"
        >
          <p className="text-[#3A3A3A] text-lg mb-6">
            Still have questions? We pick up the phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
            >
              Apply for a Partnership
            </Link>
            <a
              href="tel:+12122029220"
              className="inline-block px-8 py-4 text-base font-bold text-[#1F4D2C] rounded-lg bg-white border-2 border-[#1F4D2C] hover:bg-[#F4F4F1] transition-colors shadow-lg font-cta"
            >
              Call (212) 202-9220
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
