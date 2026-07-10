"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    name: "NYC",
    pre: "Your Local NYC Marketing Company",
    line1: "NYC Marketing Company",
    line2: "For the Businesses That Run This City",
    sub: "The most competitive market in the country. We make sure you win it.",
    image: "/consortium-nyc-digital-marketing-agency-nyc.webp",
    href: "/services-areas-we-offer-marketing-services-in/manhattan-marketing-company",
  },
  {
    name: "Queens",
    pre: "Your Local Queens Marketing Company",
    line1: "Queens Marketing Company",
    line2: "For the Borough That Works Harder Than Anyone",
    sub: "The most diverse borough deserves marketing that actually gets it.",
    image: "/consortium-nyc-digital-marketing-agency-queens.webp",
    href: "/services-areas-we-offer-marketing-services-in/queens-marketing-company",
  },
  {
    name: "Brooklyn",
    pre: "Your Local Brooklyn Marketing Company",
    line1: "Brooklyn Marketing Company",
    line2: "For the Brands That Built This Borough",
    sub: "Brands as bold as the borough. Sites that rank and convert.",
    image: "/consortium-nyc-digital-marketing-agency-brooklyn.webp",
    href: "/services-areas-we-offer-marketing-services-in/brooklyn-marketing-company",
  },
  {
    name: "Long Island",
    pre: "Your Local Long Island Marketing Company",
    line1: "Long Island Marketing Company",
    line2: "For the Businesses Your Neighbors Trust",
    sub: "Local businesses that show up first win first. We get you there.",
    image: "/consortium-nyc-digital-marketing-agency-long-island.webp",
    href: "/services-areas-we-offer-marketing-services-in/long-island-marketing-company",
  },
  {
    name: "Hoboken",
    pre: "Your Local Hoboken Marketing Company",
    line1: "Hoboken Marketing Company",
    line2: "For the Mile Square City's Best Businesses",
    sub: "Small city reach with big city results. Right across the river.",
    image: "/consortium-nyc-digital-marketing-agency-hoboken.webp",
    href: "/services-areas-we-offer-marketing-services-in/hoboken-marketing-company",
  },
];

const trustBadges = [
  "25+ Years Experience",
  "10,000+ Clients",
  "No Contracts",
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image slider */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" as const }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={`Digital marketing in ${slide.name}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* 60% dark overlay */}
      <div className="absolute inset-0 bg-slate-900/80 z-[1]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-36 pb-20">
        {/* Pre-headline — solid teal bar */}
        <div className="relative h-10 flex items-center justify-center mb-4">
          <AnimatePresence>
            <motion.div
              key={`pre-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute"
            >
              <span className="inline-block bg-teal-600 text-white text-xs sm:text-sm font-bold tracking-[0.15em] uppercase px-5 py-2.5 font-cta">
                {slide.pre}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Main headline — crossfade */}
        <div className="relative h-[240px] sm:h-[260px] md:h-[300px] lg:h-[350px] flex items-center justify-center mb-4">
          <AnimatePresence>
            <motion.h1
              key={`h1-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute w-full font-extrabold text-white leading-[1.1] font-heading"
            >
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl">{slide.line1}</span>
              <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl text-teal-400 mt-4">{slide.line2}</span>
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Sub copy — crossfade */}
        <div className="relative h-[50px] sm:h-[45px] flex items-start justify-center mb-10">
          <AnimatePresence>
            <motion.p
              key={`sub-${current}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute w-full text-base sm:text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed"
            >
              {slide.sub}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <Link
            href="/contact"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25 font-cta"
          >
            Schedule a Strategy Session
          </Link>
          <Link
            href="/results"
            className="inline-block px-8 py-4 text-base sm:text-lg font-bold text-white rounded-lg border border-white/30 hover:bg-white/10 transition-colors font-cta"
          >
            See Our Results
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-slate-200 text-sm sm:text-base mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          <strong className="text-white">10,000+ businesses</strong> over <strong className="text-white">25 years</strong> &mdash;{" "}
          <Link href="/nyc-marketing-company-services-list" className="text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 decoration-teal-400/50">law firms</Link>,{" "}
          <Link href="/nyc-marketing-company-services-list" className="text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 decoration-teal-400/50">medical</Link>,{" "}
          <Link href="/nyc-marketing-company-services-list" className="text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 decoration-teal-400/50">real estate</Link>,{" "}
          <Link href="/nyc-marketing-company-services-list" className="text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 decoration-teal-400/50">tech</Link>,{" "}
          <Link href="/nyc-marketing-company-services-list" className="text-teal-400 hover:text-teal-300 transition-colors underline underline-offset-2 decoration-teal-400/50">e-commerce</Link> &amp; more. Strategies that lower your budget every year &mdash; no ads, just <strong className="text-teal-400">compounding growth</strong>.
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

      {/* Vertical neighborhood nav — right side */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-2"
      >
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-white mb-1 font-cta">Neighborhoods</span>
        {slides.map((s, i) => (
          <Link
            key={s.name}
            href={s.href}
            onClick={(e) => {
              if (i !== current) {
                e.preventDefault();
                setCurrent(i);
              }
            }}
            className={`px-4 py-3 text-sm font-semibold text-left transition-all duration-300 font-cta w-36 ${
              i === current
                ? "bg-teal-600 text-white"
                : "bg-white/10 backdrop-blur-sm text-white/60 hover:bg-white/20 hover:text-white"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </motion.div>

      {/* Mobile: horizontal tabs at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex md:hidden gap-1"
      >
        {slides.map((s, i) => (
          <Link
            key={s.name}
            href={s.href}
            onClick={(e) => {
              if (i !== current) {
                e.preventDefault();
                setCurrent(i);
              }
            }}
            className={`px-3 py-2 text-xs font-semibold transition-all duration-300 font-cta ${
              i === current
                ? "bg-teal-600 text-white"
                : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </motion.div>
    </section>
  );
}
