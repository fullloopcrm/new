// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";

const navLinks = [
  { label: "What's Working", href: "/whats-working-in-marketing" },
  { label: "Portfolio", href: "/nyc-marketing-company-portfolio" },
  { label: "Pricing", href: "/nyc-marketing-pricing-guide" },
  { label: "Services", href: "/nyc-marketing-company-services-list" },
];

const moreLinks = [
  { label: "Industries", href: "/industries-we-offer-marketing-services-for" },
  { label: "Service Areas", href: "/services-areas-we-offer-marketing-services-in" },
  { label: "Free SEO Audit", href: "/the-free-human+ai-seo-marketing-review" },
  { label: "Marketing Checklist", href: "/master-marketing-checklist-last-updated-2026" },
  { label: "ROI Calculator", href: "/annual-marketing-spend-roi-calculator" },
  { label: "FAQ", href: "/nyc-marketing-company-faqs" },
  { label: "Marketing 101", href: "/nyc-marketing-101-guide" },
  { label: "Blog", href: "/the-marketing-blog" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const dropdownVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" as const },
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      transition: { duration: 0.15 },
    },
  };

  const mobileMenuVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: { type: "spring" as const, damping: 30, stiffness: 300 },
    },
    exit: {
      x: "100%",
      transition: { type: "spring" as const, damping: 30, stiffness: 300 },
    },
  };

  const chevron = (open: boolean) => (
    <svg
      className={`ml-1 h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Main Nav */}
      <motion.nav
        className="transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(15, 118, 110, 0.97)" : "#0f766e",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 3px 0 rgba(0, 0, 0, 0.15)" : "none",
        }}
      >
      <div className="grid grid-cols-[auto_1fr_auto] items-center px-3 sm:px-4 py-4">
        {/* Logo — left */}
        <Link href="/" className="flex items-center gap-0.5 shrink-0">
          <span className="text-lg font-bold tracking-widest text-white font-heading leading-tight">
            THE NYC<br />MARKETING CO
          </span>
        </Link>

        {/* Desktop Nav — dead center */}
        <div className="hidden items-center justify-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}

          {/* More Dropdown */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta"
            >
              More
              {chevron(moreOpen)}
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute left-1/2 top-full mt-3 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                >
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-teal-600"
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-white/30" />

          {/* AI — highlighted */}
          <Link
            href="/artificial-intelligence-marketing-services-offered"
            className="text-[15px] font-extrabold tracking-wide text-teal-200 transition-colors hover:text-white font-cta whitespace-nowrap"
          >
            AI
          </Link>
        </div>

        {/* Contact CTA — right */}
        <div className="hidden lg:flex justify-end">
          <Link href="/contact">
            <motion.span
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta"
            >
              Free Consultation
            </motion.span>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="relative z-60 flex h-10 w-10 flex-col items-center justify-center gap-1.5 justify-self-end lg:hidden"
          aria-label="Toggle menu"
        >
          <motion.span
            animate={
              mobileOpen
                ? { rotate: 45, y: 6, backgroundColor: "#0f766e" }
                : { rotate: 0, y: 0, backgroundColor: "#ffffff" }
            }
            className="block h-0.5 w-6 rounded-full bg-white"
            transition={{ duration: 0.25 }}
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0, x: 12 } : { opacity: 1, x: 0 }}
            className="block h-0.5 w-6 rounded-full bg-white"
            transition={{ duration: 0.2 }}
          />
          <motion.span
            animate={
              mobileOpen
                ? { rotate: -45, y: -6, backgroundColor: "#0f766e" }
                : { rotate: 0, y: 0, backgroundColor: "#ffffff" }
            }
            className="block h-0.5 w-6 rounded-full bg-white"
            transition={{ duration: 0.25 }}
          />
        </button>
      </div>

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
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 lg:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-5 right-5 h-10 w-10 flex items-center justify-center"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Brand name */}
              <p className="text-2xl font-extrabold tracking-widest uppercase text-white mb-10 font-heading text-center">
                THE NYC<br />MARKETING CO
              </p>

              <div className="flex flex-col items-center gap-2 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-xl font-medium text-white transition-colors hover:text-teal-400 font-cta"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* More Accordion */}
                <button
                  onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                  className="flex items-center gap-1 px-4 py-3 text-xl font-medium text-white transition-colors hover:text-teal-400 font-cta"
                >
                  More
                  {chevron(mobileMoreOpen)}
                </button>
                <AnimatePresence>
                  {mobileMoreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col items-center gap-1">
                        {moreLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className="px-3 py-2 text-base text-slate-400 transition-colors hover:text-teal-400"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI — highlighted */}
                <Link
                  href="/artificial-intelligence-marketing-services-offered"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-xl font-bold text-teal-400 transition-colors hover:text-teal-300 font-cta"
                >
                  AI
                </Link>

                {/* Contact CTA */}
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="mt-8"
                >
                  <span className="block rounded-lg bg-teal-600 px-10 py-4 text-center text-lg font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                    Free Consultation
                  </span>
                </Link>

                {/* Text & Call */}
                <div className="flex gap-4 mt-4">
                  <a
                    href="sms:+12122029220"
                    className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors font-cta text-sm font-medium"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Text Us
                  </a>
                  <a
                    href="tel:+12122029220"
                    className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors font-cta text-sm font-medium"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Us
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
    </div>
  );
}
