'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'

type PanelKey = 'platform' | 'solutions' | 'resources' | null

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, scale: 0.96, transition: { duration: 0.15 } },
}

const mobileMenuVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { x: '100%', transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<PanelKey>(null)
  const [mobileExpanded, setMobileExpanded] = useState<PanelKey>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }, [])

  const startCloseTimer = useCallback(() => {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setActivePanel(null), 200)
  }, [clearCloseTimer])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActivePanel(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setActivePanel(null)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const chevron = (open: boolean) => (
    <svg
      className={`ml-1 h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )

  return (
    <div className="fixed top-0 left-0 right-0 z-50" ref={navRef}>
      {/* Top Bar */}
      <div className="hidden lg:block text-white" style={{ backgroundColor: '#009049' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-1.5">
          <div className="flex items-center gap-4 text-xs text-white/70">
            <a href="tel:+12122029220" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              (212) 202-9220
            </a>
            <span className="text-white/30">|</span>
            <a href="sms:+12122029220" className="flex items-center gap-1.5 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Text Us
            </a>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              150 W 47th St, NY, NY 10036
            </span>
          </div>
          <div className="text-xs text-white/90 font-medium font-cta tracking-wide">
            The First Full-Cycle CRM for Home Services
          </div>
          <div className="flex items-center gap-4 text-xs text-white/70">
            <Link href="/sign-in" className="hover:text-white transition-colors font-medium">Client Access</Link>
            <span className="text-white/30">|</span>
            <Link href="/waitlist" className="hover:text-white transition-colors font-medium">Apply Now</Link>
            <span className="text-white/30">|</span>
            <Link href="/feedback" className="hover:text-white transition-colors font-medium">Feedback</Link>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <motion.nav
        className="transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(0, 168, 86, 0.97)' : '#00a856',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          boxShadow: scrolled ? '0 1px 3px 0 rgba(0, 0, 0, 0.15)' : 'none',
        }}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center px-3 sm:px-4 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0.5 shrink-0">
            <span className="text-xl font-bold tracking-widest text-white font-heading">
              FULL LOOP
            </span>
            <span className="text-xl font-bold tracking-widest text-green-200 font-heading">
              CRM
            </span>
          </Link>

          {/* Desktop Nav — centered */}
          <div className="hidden items-center justify-center gap-6 lg:flex">
            {/* Platform */}
            <div
              className="relative"
              onMouseEnter={() => { clearCloseTimer(); setActivePanel('platform') }}
              onMouseLeave={startCloseTimer}
            >
              <button
                onClick={() => setActivePanel(activePanel === 'platform' ? null : 'platform')}
                className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
              >
                Platform {chevron(activePanel === 'platform')}
              </button>
            </div>

            {/* Solutions */}
            <div
              className="relative"
              onMouseEnter={() => { clearCloseTimer(); setActivePanel('solutions') }}
              onMouseLeave={startCloseTimer}
            >
              <button
                onClick={() => setActivePanel(activePanel === 'solutions' ? null : 'solutions')}
                className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
              >
                Solutions {chevron(activePanel === 'solutions')}
              </button>
            </div>

            {/* Resources */}
            <div
              className="relative"
              onMouseEnter={() => { clearCloseTimer(); setActivePanel('resources') }}
              onMouseLeave={startCloseTimer}
            >
              <button
                onClick={() => setActivePanel(activePanel === 'resources' ? null : 'resources')}
                className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
              >
                Resources {chevron(activePanel === 'resources')}
              </button>
            </div>

            <Link
              href="/waitlist"
              className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
            >
              Pricing
            </Link>

            {/* Separator */}
            <div className="h-5 w-px bg-white/30" />

            {/* Industries — highlighted */}
            <Link
              href="/full-loop-crm-service-business-industries"
              className="text-[15px] font-extrabold tracking-wide text-green-200 transition-colors hover:text-white font-cta whitespace-nowrap"
            >
              Industries
            </Link>
          </div>

          {/* CTA — right */}
          <div className="hidden lg:flex justify-end">
            <Link href="/waitlist">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-green-700 transition-colors hover:bg-green-50 font-cta"
              >
                Apply Now
              </motion.span>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative z-60 flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={mobileOpen ? { rotate: 45, y: 6, backgroundColor: '#00a856' } : { rotate: 0, y: 0, backgroundColor: '#ffffff' }}
              className="block h-0.5 w-6 rounded-full bg-white"
              transition={{ duration: 0.25 }}
            />
            <motion.span
              animate={mobileOpen ? { opacity: 0, x: 12 } : { opacity: 1, x: 0 }}
              className="block h-0.5 w-6 rounded-full bg-white"
              transition={{ duration: 0.2 }}
            />
            <motion.span
              animate={mobileOpen ? { rotate: -45, y: -6, backgroundColor: '#00a856' } : { rotate: 0, y: 0, backgroundColor: '#ffffff' }}
              className="block h-0.5 w-6 rounded-full bg-white"
              transition={{ duration: 0.25 }}
            />
          </button>
        </div>
      </motion.nav>

      {/* Mega Menu Dropdown */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-0 right-0 z-40 border-b border-slate-200 bg-white shadow-lg"
            style={{ top: 'auto' }}
            onMouseEnter={() => clearCloseTimer()}
            onMouseLeave={startCloseTimer}
          >
            <div className="mx-auto max-w-7xl px-6 py-8">
              {activePanel === 'platform' && <PlatformPanel />}
              {activePanel === 'solutions' && <SolutionsPanel />}
              {activePanel === 'resources' && <ResourcesPanel />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 z-50 flex h-full w-[80vw] max-w-sm flex-col bg-white px-6 pt-24 pb-8 shadow-2xl lg:hidden"
            >
              <div className="flex flex-col gap-1 overflow-y-auto">
                {/* Platform Accordion */}
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === 'platform' ? null : 'platform')}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                >
                  Platform {chevron(mobileExpanded === 'platform')}
                </button>
                <AnimatePresence>
                  {mobileExpanded === 'platform' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-green-200 pl-3">
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">The Full Loop</Link>
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Lead Generation</Link>
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">AI Sales Chatbot</Link>
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Scheduling</Link>
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">GPS Operations</Link>
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Payments</Link>
                        <Link href="/full-loop-crm-service-features" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Reviews & Retargeting</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Solutions Accordion */}
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === 'solutions' ? null : 'solutions')}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                >
                  Solutions {chevron(mobileExpanded === 'solutions')}
                </button>
                <AnimatePresence>
                  {mobileExpanded === 'solutions' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-green-200 pl-3">
                        <Link href="/full-loop-crm-service-business-industries" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">All Industries</Link>
                        <Link href="/industry/crm-for-house-cleaning-businesses" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">House Cleaning</Link>
                        <Link href="/industry/crm-for-landscaping-businesses" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Landscaping</Link>
                        <Link href="/industry/crm-for-plumbing-businesses" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Plumbing</Link>
                        <Link href="/full-loop-crm-service-business-industries" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">All Locations</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Resources Accordion */}
                <button
                  onClick={() => setMobileExpanded(mobileExpanded === 'resources' ? null : 'resources')}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                >
                  Resources {chevron(mobileExpanded === 'resources')}
                </button>
                <AnimatePresence>
                  {mobileExpanded === 'resources' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-green-200 pl-3">
                        <Link href="/about-full-loop-crm" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">About</Link>
                        <Link href="/full-loop-crm-frequently-asked-questions" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">FAQ</Link>
                        <Link href="/contact" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Contact</Link>
                        <Link href="/feedback" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-green-600">Feedback</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Link
                  href="/waitlist"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                >
                  Pricing
                </Link>

                <div className="my-2 h-px bg-slate-200" />
                <Link
                  href="/full-loop-crm-service-business-industries"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-bold text-green-600 transition-colors hover:bg-green-50 font-cta"
                >
                  Industries
                </Link>

                <Link
                  href="/waitlist"
                  onClick={() => setMobileOpen(false)}
                  className="mt-6"
                >
                  <span className="block rounded-lg bg-green-600 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-green-700 font-cta">
                    Apply Now
                  </span>
                </Link>

                <div className="mt-6 flex flex-col gap-2 text-sm text-slate-500">
                  <a href="sms:+12122029220" className="hover:text-green-600 transition-colors">Text Us: (212) 202-9220</a>
                  <a href="tel:+12122029220" className="hover:text-green-600 transition-colors">Call Us: (212) 202-9220</a>
                  <a href="mailto:hello@homeservicesbusinesscrm.com" className="hover:text-green-600 transition-colors">hello@homeservicesbusinesscrm.com</a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- MEGA PANEL CONTENT ---------- */

function MegaItem({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
      <span className="mt-0.5 text-base text-slate-400">{icon}</span>
      <div>
        <strong className="block text-sm font-semibold text-slate-900 font-cta">{title}</strong>
        <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>
      </div>
    </Link>
  )
}

function PlatformPanel() {
  return (
    <div className="grid grid-cols-[1fr_380px] gap-12">
      <div>
        <div className="inline-block text-[11px] font-bold uppercase tracking-[2px] text-green-600 border-b-2 border-green-600 pb-2 mb-4 font-cta">
          THE FULL LOOP PLATFORM
        </div>
        <div className="flex flex-col gap-0.5">
          <MegaItem href="/full-loop-crm-service-features" icon="&#9672;" title="The Full Loop" desc="7-stage CRM that closes the entire business loop" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#9673;" title="Lead Generation" desc="Organic SEO network targets every neighborhood" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#9673;" title="AI Sales Chatbot" desc="Selenas AI converts leads 24/7 via SMS" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#9673;" title="Scheduling & Booking" desc="Recurring and one-time booking engine" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#9673;" title="GPS Field Operations" desc="Real-time tracking, check-in/out, auto payroll" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#9673;" title="Payments & Invoicing" desc="Stripe-powered, auto-charge on job completion" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#9673;" title="Reviews & Retargeting" desc="5-star review automation and win-back campaigns" />
        </div>
        <div className="my-4 h-px bg-slate-200" />
        <div className="inline-block text-[11px] font-bold uppercase tracking-[2px] text-green-600 border-b-2 border-green-600 pb-2 mb-4 font-cta">
          PORTALS
        </div>
        <div className="flex flex-col gap-0.5">
          <MegaItem href="/full-loop-crm-service-features" icon="&#8862;" title="Admin Dashboard" desc="Full business intelligence at a glance" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#8862;" title="Team Portal" desc="Bilingual EN/ES portal for field teams" />
          <MegaItem href="/full-loop-crm-service-features" icon="&#8862;" title="Client Portal" desc="Self-service booking, payments, and history" />
        </div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-8 flex flex-col justify-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-green-600 mb-3 font-cta">Why Full Loop?</span>
        <h3 className="text-xl font-extrabold text-slate-900 mb-3 font-heading">One platform. Zero gaps.</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">Replace 7+ tools with a single CRM built from inside a home service business. From the first Google search to the 5-star review — every stage is connected.</p>
        <Link href="/full-loop-crm-service-features" className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors font-cta">
          Explore the platform &rarr;
        </Link>
      </div>
    </div>
  )
}

function SolutionsPanel() {
  return (
    <div className="grid grid-cols-[1fr_380px] gap-12">
      <div>
        <div className="inline-block text-[11px] font-bold uppercase tracking-[2px] text-green-600 border-b-2 border-green-600 pb-2 mb-4 font-cta">
          BY INDUSTRY
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {[
            { href: '/industry/crm-for-house-cleaning-businesses', title: 'House Cleaning', desc: 'Recurring schedules, team management' },
            { href: '/industry/crm-for-landscaping-businesses', title: 'Landscaping', desc: 'Seasonal crews, route optimization' },
            { href: '/industry/crm-for-plumbing-businesses', title: 'Plumbing', desc: 'Emergency dispatch, estimates' },
            { href: '/industry/crm-for-electrical-businesses', title: 'Electrical', desc: 'Permit tracking, compliance' },
            { href: '/industry/crm-for-hvac-businesses', title: 'HVAC', desc: 'Maintenance contracts' },
            { href: '/industry/crm-for-pest-control-businesses', title: 'Pest Control', desc: 'Recurring treatments' },
            { href: '/industry/crm-for-painting-businesses', title: 'Painting', desc: 'Estimate builder' },
            { href: '/industry/crm-for-pressure-washing-businesses', title: 'Pressure Washing', desc: 'Quote by sqft' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 transition-colors hover:bg-slate-50 border-b border-slate-100">
              <strong className="text-sm font-semibold text-slate-900 font-cta">{item.title}</strong>
              <span className="ml-2 text-xs text-slate-500">{item.desc}</span>
            </Link>
          ))}
        </div>
        <Link href="/full-loop-crm-service-business-industries" className="mt-2 inline-block text-sm font-semibold text-green-600 hover:text-green-700 px-3 font-cta">
          See all 50 industries &rarr;
        </Link>

        <div className="my-4 h-px bg-slate-200" />
        <div className="inline-block text-[11px] font-bold uppercase tracking-[2px] text-green-600 border-b-2 border-green-600 pb-2 mb-4 font-cta">
          BY LOCATION
        </div>
        <div className="flex flex-wrap gap-2 px-3">
          {[
            { label: 'New York', href: '/location/home-service-crm-in-nyc' },
            { label: 'Los Angeles', href: '/location/home-service-crm-in-la' },
            { label: 'Chicago', href: '/location/home-service-crm-in-chicago' },
            { label: 'Houston', href: '/location/home-service-crm-in-houston' },
            { label: 'Miami', href: '/location/home-service-crm-in-miami' },
          ].map((city) => (
            <Link key={city.href} href={city.href} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors font-cta">
              {city.label}
            </Link>
          ))}
        </div>
        <Link href="/full-loop-crm-service-business-industries" className="mt-2 inline-block text-sm font-semibold text-green-600 hover:text-green-700 px-3 font-cta">
          See all 400 locations &rarr;
        </Link>
      </div>
      <div className="rounded-2xl bg-slate-900 p-8 flex flex-col justify-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-green-400 mb-3 font-cta">Exclusive Territories</span>
        <h3 className="text-xl font-extrabold text-white mb-3 font-heading">One partner per trade, per metro.</h3>
        <p className="text-sm text-white/70 leading-relaxed mb-4">Full Loop CRM only accepts one business per industry per metro area. Your leads are yours alone — no shared leads, no bidding wars.</p>
        <Link href="/waitlist" className="text-sm font-semibold text-green-400 hover:text-green-300 transition-colors font-cta">
          Check availability &rarr;
        </Link>
      </div>
    </div>
  )
}

function ResourcesPanel() {
  return (
    <div className="grid grid-cols-[1fr_380px] gap-12">
      <div>
        <div className="inline-block text-[11px] font-bold uppercase tracking-[2px] text-green-600 border-b-2 border-green-600 pb-2 mb-4 font-cta">
          COMPANY
        </div>
        <div className="flex flex-col gap-0.5">
          <MegaItem href="/about-full-loop-crm" icon="&#9673;" title="About" desc="25 years of marketing meets home services" />
          <MegaItem href="/contact" icon="&#9673;" title="Contact" desc="Book a demo or get in touch" />
        </div>
        <div className="my-4 h-px bg-slate-200" />
        <div className="inline-block text-[11px] font-bold uppercase tracking-[2px] text-green-600 border-b-2 border-green-600 pb-2 mb-4 font-cta">
          SUPPORT
        </div>
        <div className="flex flex-col gap-0.5">
          <MegaItem href="/full-loop-crm-frequently-asked-questions" icon="&#9673;" title="FAQ" desc="Common questions answered" />
          <MegaItem href="/agreement" icon="&#9673;" title="Agreement" desc="Plain language partnership terms" />
          <MegaItem href="/feedback" icon="&#9673;" title="Feedback" desc="Help us improve Full Loop CRM" />
        </div>
      </div>
      <div className="rounded-2xl bg-slate-50 p-8 flex flex-col justify-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-green-600 mb-3 font-cta">From the Founder</span>
        <h3 className="text-xl font-extrabold text-slate-900 mb-3 font-heading">Built from inside the business.</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">Full Loop CRM was built by someone who ran a home service company for 10+ years. Every feature exists because of a real operational problem.</p>
        <Link href="/about-full-loop-crm" className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors font-cta">
          Read our story &rarr;
        </Link>
      </div>
    </div>
  )
}
