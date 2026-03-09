'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const trustBadges = [
  '7 Stages, 1 Platform',
  '300+ US Metros',
  'Exclusive Territories',
]

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Grid background pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0, 191, 99, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 191, 99, 0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-transparent to-slate-900/80 z-[1]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-36 pb-20">
        {/* Pre-headline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-4"
        >
          <span className="inline-block bg-green-600 text-white text-xs sm:text-sm font-bold tracking-[0.15em] uppercase px-5 py-2.5 font-cta">
            The First Full-Cycle CRM for Home Services
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="font-extrabold text-white leading-[1.1] font-heading mb-4"
        >
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl">Full Loop CRM</span>
          <span className="block text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-green-400 mt-4">
            From Lead Gen to 5-Star Reviews in One Platform
          </span>
        </motion.h1>

        {/* Sub copy */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-base sm:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed mb-10"
        >
          Organic lead generation, AI sales chatbot, scheduling, GPS operations, payments, reviews, and retargeting. One partner per trade per metro — your territory is exclusively yours.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <Link
            href="/crm-partnership-request-form"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-green-600 hover:bg-green-700 transition-colors shadow-lg shadow-green-600/25 font-cta"
          >
            Apply for Your Territory
          </Link>
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors font-cta"
          >
            Book a Demo
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-slate-200 text-sm sm:text-base mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          <strong className="text-white">Replace 9+ tools</strong> with one platform &mdash;{' '}
          <Link href="/industry/house-cleaning-business-crm" className="text-green-400 hover:text-green-300 transition-colors underline underline-offset-2 decoration-green-400/50">cleaning</Link>,{' '}
          <Link href="/industry/landscaping-business-crm" className="text-green-400 hover:text-green-300 transition-colors underline underline-offset-2 decoration-green-400/50">landscaping</Link>,{' '}
          <Link href="/industry/plumbing-business-crm" className="text-green-400 hover:text-green-300 transition-colors underline underline-offset-2 decoration-green-400/50">plumbing</Link>,{' '}
          <Link href="/industry/hvac-business-crm" className="text-green-400 hover:text-green-300 transition-colors underline underline-offset-2 decoration-green-400/50">HVAC</Link>,{' '}
          <Link href="/industry/pest-control-business-crm" className="text-green-400 hover:text-green-300 transition-colors underline underline-offset-2 decoration-green-400/50">pest control</Link> &amp; more. Built by a 20+ year home service veteran &mdash; not a <strong className="text-green-400">product manager&apos;s guess</strong>.
        </motion.p>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4"
        >
          {trustBadges.map((badge) => (
            <span
              key={badge}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white/90 border border-white/20 rounded-full bg-white/10 backdrop-blur-sm font-cta"
            >
              {badge}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Stats bar at bottom of hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="absolute bottom-0 left-0 right-0 z-20"
      >
        <div className="bg-green-600 py-6">
          <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">7</div>
              <div className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider mt-1 font-cta">Stages in One Loop</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">300+</div>
              <div className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider mt-1 font-cta">US Metros Available</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">83%</div>
              <div className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider mt-1 font-cta">Cost Savings</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">50+</div>
              <div className="text-xs sm:text-sm text-white/80 font-medium uppercase tracking-wider mt-1 font-cta">Industries Supported</div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
