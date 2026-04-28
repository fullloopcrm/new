"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const credentials = [
  "20+ Years in Home Services",
  "Business Development",
  "Web Design & Development",
  "SEO & Organic Lead Gen",
  "Business Growth Consulting",
  "Operations Management",
];

const paragraphs = [
  {
    title: "Born from Frustration, Not a Pitch Deck",
    color: "#1F4D2C",
    content:
      "Full Loop CRM wasn't built in a Silicon Valley boardroom. It was built by a 20+ year veteran of home services, business development, web design, SEO, and organic lead generation — someone who's personally run crews, answered the phones, built the websites, ranked the domains, and scaled the operations.",
  },
  {
    title: "The Problem We Solved for Ourselves",
    color: "#3A3A3A",
    content:
      "After years of duct-taping together scheduling apps, CRM tools, payment platforms, lead trackers, email services, SMS tools, and spreadsheets — the frustration boiled over. None of these tools talked to each other. None of them generated a single lead. So we built the platform we always needed — and made it exclusive.",
  },
  {
    title: "A Partner, Not Just a Platform",
    color: "#1F4D2C",
    content:
      "When you partner with Full Loop CRM, you don't just get software. You get the consulting guidance and operational experience of someone who has been exactly where you are.",
  },
];

export default function WhyNYC() {
  return (
    <section className="py-20 sm:py-28 bg-[#F4F4F1] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[var(--color-loop-line-soft)] rounded-full blur-[128px] animate-blob opacity-40" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-[var(--color-loop-line-soft)] rounded-full blur-[128px] animate-blob opacity-40 animation-delay-2000" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            The Founder
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 font-heading">
            Built by Someone Who&apos;s Actually{" "}
            <span className="text-[#1F4D2C]">Done the Work</span>
          </h2>
          <p className="text-[#3A3A3A] text-lg max-w-3xl mx-auto leading-relaxed">
            Most home service CRM platforms are designed by people who&apos;ve
            never stepped foot on a job site. Full Loop CRM is different — it
            was built from real-world field service management experience, not
            theory. Learn more{" "}
            <Link
              href="/about-full-loop-crm"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              about us
            </Link>{" "}
            and{" "}
            <Link
              href="/why-you-should-choose-full-loop-crm-for-your-business"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              why Full Loop
            </Link>
            .
          </p>
        </motion.div>

        {/* Credential badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-20"
        >
          {credentials.map((cred, i) => (
            <motion.div
              key={cred}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm"
            >
              <p className="text-sm sm:text-base font-bold text-[#1F4D2C]">
                {cred}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Content sections */}
        <div className="space-y-12">
          {paragraphs.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 sm:p-10"
            >
              <div
                className="w-12 h-1 rounded-full mb-4"
                style={{ backgroundColor: section.color }}
              />
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 font-heading">
                {section.title}
              </h3>
              <p className="text-[#3A3A3A] leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-[#3A3A3A] text-lg mb-6 max-w-2xl mx-auto">
            Ready to work with an automated CRM built by someone who understands
            home service businesses from the inside out? Explore our{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              features
            </Link>{" "}
            or{" "}
            <Link
              href="/full-loop-crm-pricing"
              className="text-[#1F4D2C] underline underline-offset-2 hover:text-[#1F4D2C]"
            >
              pricing
            </Link>
            .
          </p>
          <Link
            href="/crm-partnership-request-form"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-[#1C1C1C] rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
          >
            Request a Partnership
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
