"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Locations", href: "/locations" },
  { label: "Parks", href: "/parks" },
  { label: "Pricing", href: "/pricing" },
];

const moreLinks = [
  { label: "Assisted Stretching", href: "/services/assisted-stretch-service" },
  { label: "PNF Stretching", href: "/services/pnf-stretch-service" },
  { label: "Recovery Stretching", href: "/services/recovery-stretch-service" },
  { label: "Corporate Wellness", href: "/corporate-wellness" },
  { label: "Hotel Stretching", href: "/hotel-stretching" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const topCities = [
  { label: "New York", href: "/locations/new-york" },
  { label: "Los Angeles", href: "/locations/california" },
  { label: "Chicago", href: "/locations/illinois" },
  { label: "Houston", href: "/locations/texas" },
  { label: "Miami", href: "/locations/florida" },
  { label: "Seattle", href: "/locations/washington" },
  { label: "Denver", href: "/locations/colorado" },
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
    <div className="fixed top-0 left-0 right-0 z-40">
      {/* Top Bar */}
      <div className="bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          {/* Mobile: phone + parks only */}
          <div className="flex items-center gap-3 sm:hidden">
            <a href="sms:+18887347274" className="text-xs font-semibold text-teal-400 font-cta">
              Text (888) 734-7274
            </a>
            <span className="text-slate-700">|</span>
            <Link href="/parks" className="text-xs font-semibold text-teal-400 font-cta">
              Parks
            </Link>
          </div>
          {/* Desktop: full top bar */}
          <div className="hidden items-center gap-1.5 overflow-x-auto sm:flex">
            <span className="shrink-0 text-xs font-semibold text-slate-500 font-cta">Top Cities:</span>
            {topCities.map((b) => (
              <Link key={b.href} href={b.href} className="shrink-0 text-xs font-semibold text-slate-400 transition-colors hover:text-teal-400 font-cta">
                {b.label}
              </Link>
            ))}
            <span className="text-slate-700">|</span>
            <Link href="/hotel-stretching" className="shrink-0 text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300 font-cta">Tourists</Link>
            <Link href="/parks" className="shrink-0 text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300 font-cta">Parks</Link>
            <Link href="/corporate-wellness" className="shrink-0 text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300 font-cta">Corporate</Link>
          </div>
          <div className="hidden items-center gap-3 shrink-0 sm:flex">
            <a href="sms:+18887347274" className="text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300 font-cta">
              Text (888) 734-7274
            </a>
          </div>
        </div>
      </div>

      <motion.nav
        className="transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(37, 99, 235, 0.97)" : "#2563eb",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 3px 0 rgba(0, 0, 0, 0.15)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-3 sm:px-4 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="text-xl font-bold tracking-widest text-white font-heading">
              STRETCH
            </span>
            <span className="text-xl font-bold tracking-widest text-teal-200 font-heading">
              SERVICE
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center justify-center gap-6 lg:flex flex-1">
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

            {/* FAQ */}
            <Link
              href="/faq"
              className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
            >
              FAQ
            </Link>
          </div>

          {/* CTA — right */}
          <div className="hidden lg:flex justify-end">
            <a href="sms:+18887347274">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta"
              >
                Book Now — Text Us
              </motion.span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative z-[60] flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 lg:hidden"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.svg
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </motion.svg>
              )}
            </AnimatePresence>
            <span className="text-xs font-semibold text-white font-cta">
              {mobileOpen ? "Close" : "Menu"}
            </span>
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
                className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileOpen(false)}
              />

              <motion.div
                variants={mobileMenuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed right-0 top-0 z-[55] flex h-full w-[80vw] max-w-sm flex-col bg-white px-6 pt-24 pb-8 shadow-2xl lg:hidden"
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

                  {/* Phone — highlighted in mobile */}
                  <div className="my-2 h-px bg-slate-200" />
                  <a
                    href="sms:+18887347274"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-bold text-teal-600 transition-colors hover:bg-teal-50 font-cta"
                  >
                    Text (888) 734-7274
                  </a>
                  <a
                    href="sms:+18887347274"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-bold text-teal-600 transition-colors hover:bg-teal-50 font-cta"
                  >
                    Call (888) 734-7274
                  </a>

                  {/* CTA */}
                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="mt-6"
                  >
                    <span className="block rounded-lg bg-teal-600 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                      Book Your Stretch
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
