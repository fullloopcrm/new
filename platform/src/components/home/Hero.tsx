"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const trustBadges = [
  { label: "All-in-One Home Service CRM", href: "/full-loop-crm-service-features" },
  { label: "50+ Service Industries", href: "/full-loop-crm-service-business-industries" },
  { label: "Exclusive Territory Lock", href: "/full-loop-crm-pricing" },
  { label: "AI-Powered Automation", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
  { label: "300+ US Metros", href: "/full-loop-crm-service-business-industries" },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(13, 148, 136, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-900/80 z-[1]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-36 pb-20">
        {/* Pre-headline badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-[0.15em] uppercase px-5 py-2.5 font-cta">
            The Only Full-Service CRM Built for Home Service Businesses
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="font-extrabold text-white leading-[1.1] font-heading mb-6"
        >
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
            First click to
          </span>
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-teal-400 mt-2">
            <em className="not-italic">five-star review.</em>
          </span>
          <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-slate-300 mt-4">
            One platform. Full Loop.
          </span>
        </motion.h1>

        {/* Price block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center justify-center gap-4 mb-6"
        >
          <span className="text-2xl sm:text-3xl text-white/40 line-through font-mono">$178,800</span>
          <span className="text-4xl sm:text-5xl font-extrabold text-white font-mono">$2,500<span className="text-lg sm:text-xl text-white/60 font-normal">/mo</span></span>
          <span className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-wider uppercase px-3 py-1.5 rounded font-cta">
            SAVE 83%
          </span>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base sm:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed mb-4"
        >

          Full Loop is the first <Link href="/full-loop-crm-101-educational-tips" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">home service CRM</Link> that handles every stage of your business &mdash; from <Link href="/full-loop-crm-service-features" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">AI-powered lead generation</Link> and automated sales to scheduling, GPS field operations, payments, review management, and <Link href="/full-loop-crm-service-features" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">customer retargeting</Link>. One partner per trade per metro. Exclusively yours.
        </motion.p>

        {/* Autonomy line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-teal-400 text-sm sm:text-base font-semibold font-cta">
            Flip one switch &mdash; 100% autonomous. Your business runs itself.
          </span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <a
            href="sms:+12122029220"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta"
          >
            Text Us
          </a>
          <a
            href="tel:+12122029220"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors font-cta"
          >
            Call Us
          </a>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-slate-400 text-sm mb-10"
        >

          Currently accepting <Link href="/crm-partnership-request-form" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">CRM partnership requests</Link> for qualified home service business owners across <Link href="/full-loop-crm-service-business-industries" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">50+ industries</Link>.
        </motion.p>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {trustBadges.map((badge) => (
            <Link
              key={badge.label}
              href={badge.href}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white/90 border border-white/20 rounded-full bg-white/10 backdrop-blur-sm font-cta hover:bg-white/20 transition-colors"
            >
              {badge.label}
            </Link>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
