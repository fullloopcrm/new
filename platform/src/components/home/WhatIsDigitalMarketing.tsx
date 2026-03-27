"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function WhatIsDigitalMarketing() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            CRM 101 for Home Service Businesses
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
              What Is a Home Service CRM — and Why Does Yours Need to{" "}
              <span className="text-teal-600">Close the Loop?</span>
          </h2>
          <p className="text-slate-600 text-lg">
            Everything you need to know about running your home service business from a single platform. Read our full <Link href="/full-loop-crm-101-educational-tips" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">CRM 101 guide</Link> or explore <Link href="/full-loop-crm-service-features" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">our features</Link> — built
            by a team with 20+ years in the home service industry.
          </p>
        </motion.div>

        <div className="space-y-12 text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              What Is a Home Service CRM?
            </h3>
            <p className="mb-4">
              A home service CRM (Customer Relationship Management) is software
              designed to help service businesses manage clients, bookings,
              payments, and communications. Traditional CRMs like Jobber,
              Housecall Pro, and ServiceTitan handle one or two stages of the
              business — usually scheduling and basic invoicing.
            </p>
            <p>
              But the home service industry has evolved. Your customers expect
              instant responses, online booking, digital payments, and
              follow-up communications — and they expect it all to feel seamless.
              A CRM that only handles part of the job forces you to duct-tape
              together a stack of disconnected tools to cover the rest.
            </p>
          </motion.div>

          {/* Section 2 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              What a Full-Service CRM Actually Does
            </h3>
            <p className="mb-4">
              A full-service CRM does more than schedule jobs and send invoices.
              It connects every stage of the customer lifecycle: from the moment
              a prospect finds you online, through the sales conversation, the
              scheduled appointment, the field operation, the payment, the
              review, and the retargeting campaign that brings them back for the
              next booking.
            </p>
            <p>
              <Link href="/full-loop-crm-service-features" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Full Loop CRM</Link> is
              the first platform built specifically for home service businesses
              that covers all seven stages — lead generation, AI-powered sales,
              intelligent scheduling, GPS-verified field operations, payment and
              financial management, automated review generation, and client
              retargeting. One login, one dashboard, zero integrations.
            </p>
          </motion.div>

          {/* Section 3 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              The Seven Stages of the Full Loop
            </h3>
            <p className="mb-4">
              <strong className="text-teal-600">
                Stage 1 — Lead Generation:
              </strong>{" "}
              Organic SEO, dedicated service websites, and Google Business
              Profile optimization that generate leads without ad spend. Your
              leads, your domains, your market.
            </p>
            <p className="mb-4">
              <strong className="text-teal-600">
                Stage 2 — AI-Powered Sales:
              </strong>{" "}
              Instant lead response, AI-driven qualification, and automated
              follow-up sequences that convert prospects into booked jobs —
              24 hours a day, 7 days a week.
            </p>
            <p className="mb-4">
              <strong className="text-teal-600">
                Stage 3 — Intelligent Scheduling:
              </strong>{" "}
              Smart route optimization, crew management, and real-time
              availability that eliminates double-bookings and wasted drive
              time.
            </p>
            <p className="mb-4">
              <strong className="text-teal-600">Stage 4 — Field Operations:</strong>{" "}
              GPS-verified clock-in/clock-out, digital checklists, before/after
              photo documentation, and real-time job tracking that keeps your
              field teams accountable and your clients informed.
            </p>
            <p className="mb-4">
              <strong className="text-slate-900">Stage 5 — Payments &amp; Financial Management:</strong>{" "}
              Instant invoicing, online payments, payroll integration, and
              real-time P&amp;L dashboards. Know exactly where your money is at
              every moment.
            </p>
            <p className="mb-4">
              <strong className="text-slate-900">Stage 6 — Review Generation:</strong>{" "}
              Automated review requests triggered after every completed job.
              Build a five-star reputation on Google, Yelp, and industry-specific
              platforms — on autopilot.
            </p>
            <p>
              <strong className="text-slate-900">Stage 7 — Client Retargeting:</strong>{" "}
              Automated rebooking campaigns, seasonal reminders, and loyalty
              sequences that turn one-time customers into lifetime clients.
              The loop closes here — and starts again.
            </p>
          </motion.div>

          {/* Section 4 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              Why Most Home Service Businesses Are Overpaying
            </h3>
            <p className="mb-4">
              Most home service business owners spend $178,800/year on separate
              tools, staff, and ad spend to cover these seven stages. A CRM
              subscription here, a scheduling tool there, a marketing agency on
              top, a bookkeeper on the side — it adds up fast, and none of it
              talks to each other.
            </p>
            <p>
              <Link href="/full-loop-crm-pricing" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">Full Loop CRM replaces all of it</Link> for
              starting at $199/month — with organic lead generation built in, so you never
              pay for ads again. That&apos;s not a cost. It&apos;s an investment that pays
              for itself within the first 90 days for most partners.
            </p>
          </motion.div>

          {/* Section 5 */}
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-heading">
              Why Full Loop CRM Is Different
            </h3>
            <p className="mb-4">
              Other CRMs give you software and wish you luck. Full Loop CRM is a
              business partnership. Every partner gets an exclusive territory lock —
              one partner per trade per metro area — so your leads are truly yours.
              No shared leads. No bidding wars. No competition from within the
              platform.
            </p>
            <p className="mb-4">
              You also get 20+ years of home service consulting experience baked
              into every feature, every workflow, and every automation. This
              platform wasn&apos;t built by software engineers guessing what field
              service businesses need. It was built by operators who&apos;ve scaled
              home service companies from startup to seven figures.
            </p>
            <p>
              That&apos;s <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">why Full Loop CRM exists</Link> — to
              give home service business owners a single platform that handles
              everything, so they can focus on what they do best: delivering
              exceptional service.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-16"
        >
          <Link
            href="/full-loop-crm-101-educational-tips"
            className="inline-block px-10 py-4 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-500 transition-colors duration-300 font-cta"
          >
            Learn More in Our CRM 101 Guide
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
