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
  { label: "Pricing", href: "/pricing" },
  { label: "Services", href: "/services" },
  { label: "Areas", href: "/areas" },
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const servicesLinks = [
  { label: "All Design Services", href: "/services" },
  { label: "Full Home Interior Design", href: "/services/full-home-interior-design" },
  { label: "Kitchen Design", href: "/services/kitchen-design" },
  { label: "Bathroom Design", href: "/services/bathroom-design" },
  { label: "Living Room Design", href: "/services/living-room-design" },
  { label: "Commercial Interior Design", href: "/services/commercial-interior-design" },
  { label: "Space Planning", href: "/services/space-planning" },
  { label: "Lighting Design", href: "/services/lighting-design" },
];

const constructionLinks = [
  { label: "All Construction Services", href: "/services#construction" },
  { label: "Kitchen Renovation", href: "/services/kitchen-renovation" },
  { label: "Bathroom Renovation", href: "/services/bathroom-renovation" },
  { label: "General Contracting", href: "/services/general-contracting" },
  { label: "Painting & Finishing", href: "/services/painting-services" },
  { label: "Flooring Installation", href: "/services/flooring-installation" },
  { label: "Electrical Services", href: "/services/electrical-services" },
];

const areasLinks = [
  { label: "Manhattan", href: "/areas/manhattan" },
  { label: "Brooklyn", href: "/areas/brooklyn" },
  { label: "Queens", href: "/areas/queens" },
  { label: "Bronx", href: "/areas/bronx" },
  { label: "Staten Island", href: "/areas/staten-island" },
  { label: "Long Island", href: "/areas/long-island" },
  { label: "Westchester", href: "/areas/westchester" },
  { label: "New Jersey", href: "/areas/new-jersey" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [constructionOpen, setConstructionOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileConstructionOpen, setMobileConstructionOpen] = useState(false);
  const [mobileAreasOpen, setMobileAreasOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  const constructionRef = useRef<HTMLDivElement>(null);
  const areasRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
      if (constructionRef.current && !constructionRef.current.contains(e.target as Node)) {
        setConstructionOpen(false);
      }
      if (areasRef.current && !areasRef.current.contains(e.target as Node)) {
        setAreasOpen(false);
      }
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
          {/* Mobile: phone only */}
          <div className="flex items-center gap-3 sm:hidden">
            <a href="tel:+19174732013" className="text-xs font-semibold text-blue-400 font-cta">
              (917) 473-2013 | Call
            </a>
          </div>
          {/* Desktop: full top bar */}
          <div className="hidden items-center gap-1.5 overflow-x-auto sm:flex">
            <span className="shrink-0 text-xs font-semibold text-slate-500 font-cta">Service Areas:</span>
            {areasLinks.map((area) => (
              <Link key={area.href} href={area.href} className="shrink-0 text-xs font-semibold text-slate-400 transition-colors hover:text-blue-400 font-cta">
                {area.label}
              </Link>
            ))}
            <span className="text-slate-700">|</span>
            <Link href="/pricing" className="shrink-0 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 font-cta">Pricing</Link>
            <Link href="/services" className="shrink-0 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 font-cta">Services</Link>
            <Link href="/careers" className="shrink-0 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 font-cta">Jobs</Link>
          </div>
          <div className="hidden items-center gap-3 shrink-0 sm:flex">
            <a href="tel:+19174732013" className="text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 font-cta">
              (917) 473-2013 | Call
            </a>
          </div>
        </div>
      </div>

      <motion.nav
        className="transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(55, 65, 81, 0.97)" : "#374151",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 3px 0 rgba(0, 0, 0, 0.15)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-3 sm:px-4 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="text-xl font-bold tracking-widest text-white font-heading">
              THE NYC
            </span>
            <span className="text-xl font-bold tracking-widest text-blue-200 font-heading">
              INTERIOR DESIGNER
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center justify-center gap-6 lg:flex flex-1">
            {/* Pricing -- FIRST */}
            <Link
              href="/pricing"
              className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap"
            >
              Pricing
            </Link>

            {/* Design Services Dropdown */}
            <div ref={servicesRef} className="relative">
              <button
                onClick={() => { setServicesOpen(!servicesOpen); setConstructionOpen(false); setAreasOpen(false); setMoreOpen(false); }}
                className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta"
              >
                Design Services
                {chevron(servicesOpen)}
              </button>
              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-1/2 top-full mt-3 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                  >
                    {servicesLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setServicesOpen(false)}
                        className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Construction Dropdown */}
            <div ref={constructionRef} className="relative">
              <button
                onClick={() => { setConstructionOpen(!constructionOpen); setServicesOpen(false); setAreasOpen(false); setMoreOpen(false); }}
                className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta"
              >
                Construction
                {chevron(constructionOpen)}
              </button>
              <AnimatePresence>
                {constructionOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-1/2 top-full mt-3 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                  >
                    {constructionLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setConstructionOpen(false)}
                        className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Areas Dropdown */}
            <div ref={areasRef} className="relative">
              <button
                onClick={() => { setAreasOpen(!areasOpen); setServicesOpen(false); setConstructionOpen(false); setMoreOpen(false); }}
                className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta"
              >
                Areas
                {chevron(areasOpen)}
              </button>
              <AnimatePresence>
                {areasOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute left-1/2 top-full mt-3 w-52 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
                  >
                    {areasLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setAreasOpen(false)}
                        className="block rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
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

            {/* More Dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => { setMoreOpen(!moreOpen); setServicesOpen(false); setConstructionOpen(false); setAreasOpen(false); }}
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
                    className="absolute left-1/2 top-full mt-3 -translate-x-1/2 w-44 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-xl backdrop-blur-md"
                  >
                    {[
                      { label: "About", href: "/about" },
                      { label: "Careers", href: "/careers" },
                      { label: "Contact", href: "/contact" },
                      { label: "FAQ", href: "/faq" },
                      { label: "Blog", href: "/blog" },
                      { label: "Interior Design 101", href: "/interior-design-101" },
                      { label: "Estimate Tool", href: "/estimate" },
                      { label: "Apply for a Job", href: "/apply" },
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMoreOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CTA -- right */}
          <div className="hidden lg:flex justify-end">
            <Link href="/contact">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 font-cta"
              >
                Free Consultation
              </motion.span>
            </Link>
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
                  {/* Design Services Accordion */}
                  <button
                    onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    Design Services
                    {chevron(mobileServicesOpen)}
                  </button>
                  <AnimatePresence>
                    {mobileServicesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-blue-200 pl-3">
                          {servicesLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-blue-600"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Construction Accordion */}
                  <button
                    onClick={() => setMobileConstructionOpen(!mobileConstructionOpen)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    Construction
                    {chevron(mobileConstructionOpen)}
                  </button>
                  <AnimatePresence>
                    {mobileConstructionOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-blue-200 pl-3">
                          {constructionLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-blue-600"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Areas Accordion */}
                  <button
                    onClick={() => setMobileAreasOpen(!mobileAreasOpen)}
                    className="flex items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    Areas
                    {chevron(mobileAreasOpen)}
                  </button>
                  <AnimatePresence>
                    {mobileAreasOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 flex flex-col gap-0.5 border-l-2 border-blue-200 pl-3">
                          {areasLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className="rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:text-blue-600"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Link
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    About
                  </Link>

                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-medium text-slate-800 transition-colors hover:bg-slate-50 font-cta"
                  >
                    Contact
                  </Link>

                  {/* Phone -- highlighted in mobile */}
                  <div className="my-2 h-px bg-slate-200" />
                  <a
                    href="tel:+19174732013"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-base font-bold text-blue-600 transition-colors hover:bg-blue-50 font-cta"
                  >
                    (917) 473-2013 | Call
                  </a>

                  {/* CTA */}
                  <Link
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    className="mt-6"
                  >
                    <span className="block rounded-lg bg-blue-600 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-gray-700 font-cta">
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
