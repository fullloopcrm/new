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
  { label: "Features", href: "/full-loop-crm-service-features" },
  { label: "Why Full Loop", href: "/why-you-should-choose-full-loop-crm-for-your-business" },
  { label: "Industries", href: "/full-loop-crm-service-business-industries" },
];

const moreLinks = [
  { label: "About", href: "/about-full-loop-crm" },
  { label: "FAQ", href: "/full-loop-crm-frequently-asked-questions" },
  { label: "Partners", href: "/partner-with-full-loop-crm" },
  { label: "CRM 101", href: "/full-loop-crm-101-educational-tips" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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
    <div className="sticky top-0 left-0 right-0 z-50">
      <motion.nav
        className="transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(28, 28, 28, 0.97)" : "#1C1C1C",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 0 0 rgba(28, 28, 28, 0.15)" : "none",
        }}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center px-3 sm:px-4 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-[22px] tracking-tight text-white font-heading" style={{ letterSpacing: "-0.025em", fontWeight: 500 }}>
              Full Loop
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono" style={{ color: "#A8A8A4" }}>
              CRM
            </span>
          </Link>

          {/* Desktop Nav — centered */}
          <div className="hidden items-center justify-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10.5px] uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white font-mono whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}

            {/* More Dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center text-[10.5px] uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white font-mono"
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
                    className="absolute left-1/2 top-full mt-3 w-52 -translate-x-1/2 border bg-white p-1"
                    style={{ borderColor: "#1C1C1C", borderRadius: 4 }}
                  >
                    {moreLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className="block px-4 py-2.5 text-[13px] transition-colors hover:bg-[#FBFBF8]"
                        style={{ color: "#1C1C1C" }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right — CTA + phone */}
          <div className="hidden lg:flex items-center justify-end">
            <Link href="/waitlist">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block bg-white px-5 py-2 text-[10.5px] uppercase tracking-[0.18em] font-mono transition-colors hover:bg-[#F4F4F1]"
                style={{ color: "#1C1C1C", borderRadius: 4 }}
              >
                Request to Join Waitlist
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
                  ? { rotate: 45, y: 6, backgroundColor: "#1C1C1C" }
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
                  ? { rotate: -45, y: -6, backgroundColor: "#1C1C1C" }
                  : { rotate: 0, y: 0, backgroundColor: "#ffffff" }
              }
              className="block h-0.5 w-6 rounded-full bg-white"
              transition={{ duration: 0.25 }}
            />
          </button>
        </div>
      </motion.nav>

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

                <div className="my-2 h-px bg-slate-200" />

                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    {link.label}
                  </Link>
                ))}

                <Link
                  href="/waitlist"
                  onClick={() => setMobileOpen(false)}
                  className="mt-6"
                >
                  <span className="block rounded-lg bg-teal-600 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                    Request to Join Waitlist
                  </span>
                </Link>

                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                  <a href="sms:+12122029220" className="hover:text-teal-600 transition-colors">Text Us: (212) 202-9220</a>
                  <a href="tel:+12122029220" className="hover:text-teal-600 transition-colors">Call Us: (212) 202-9220</a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
