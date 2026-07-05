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
          <Link href="/contact-nyc-marketing-company-consortium-nyc">
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
          className="relative z-60 flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
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
              className="fixed right-0 top-0 z-50 flex h-full w-[80vw] max-w-sm flex-col bg-white px-6 pt-24 pb-8 shadow-2xl lg:hidden"
            >
              <div className="flex flex-col gap-1 overflow-y-auto">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* More Accordion */}
                <button
                  onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
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
                      <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-teal-200 pl-3">
                        {moreLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-teal-600"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI — highlighted in mobile */}
                <div className="my-2 h-px bg-slate-200" />
                <Link
                  href="/artificial-intelligence-marketing-services-offered"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-bold text-teal-600 transition-colors hover:bg-teal-50 font-cta"
                >
                  AI
                </Link>

                {/* Contact CTA */}
                <Link
                  href="/contact-nyc-marketing-company-consortium-nyc"
                  onClick={() => setMobileOpen(false)}
                  className="mt-6"
                >
                  <span className="block rounded-lg bg-teal-600 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                    Free Consultation
                  </span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
    </div>
  );
}
