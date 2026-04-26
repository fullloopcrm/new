"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const neighborhoods = [
  {
    name: "Manhattan",
    tagline: "The Heart of NYC Business",
    description:
      "From Wall Street to Midtown, we help Manhattan businesses dominate search and stand out in the most competitive market in the world.",
    image: "/consortium-nyc-digital-marketing-agency-nyc.png",
    href: "/service-areas/nyc-digital-marketing-agency",
  },
  {
    name: "Queens",
    tagline: "NYC's Most Diverse Borough",
    description:
      "Over 800,000 small businesses call Queens home. We help them get found online and convert local customers every single day.",
    image: "/consortium-nyc-digital-marketing-agency-queens.png",
    href: "/service-areas/queens-digital-marketing-agency",
  },
  {
    name: "Brooklyn",
    tagline: "Where Culture Meets Commerce",
    description:
      "Brooklyn's small business scene is booming. We build brands and digital strategies that match the energy of this borough.",
    image: "/consortium-nyc-digital-marketing-agency-brooklyn.png",
    href: "/service-areas/brooklyn-digital-marketing-agency",
  },
  {
    name: "Long Island",
    tagline: "Suburban Growth, Digital Edge",
    description:
      "Long Island businesses need local visibility that drives foot traffic and phone calls. We deliver SEO and web design that works.",
    image: "/consortium-nyc-digital-marketing-agency-long-island.png",
    href: "/service-areas/long-island-digital-marketing-agency",
  },
  {
    name: "Hoboken",
    tagline: "Small City, Big Opportunity",
    description:
      "Hoboken's tight-knit business community thrives on local reputation. We help you own the search results in Hudson County.",
    image: "/consortium-nyc-digital-marketing-agency-hoboken.png",
    href: "/service-areas/hoboken-digital-marketing-agency",
  },
];

export default function NeighborhoodSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > current ? 1 : -1);
      setCurrent(index);
    },
    [current]
  );

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % neighborhoods.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent(
      (prev) => (prev - 1 + neighborhoods.length) % neighborhoods.length
    );
  }, []);

  // Auto-advance every 6 seconds
  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = neighborhoods[current];

  const ease = [0.32, 0.72, 0, 1] as const;
  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.6, ease },
    },
    exit: (d: number) => ({
      x: d > 0 ? "-100%" : "100%",
      opacity: 0,
      transition: { duration: 0.6, ease },
    }),
  };

  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 font-heading">
            Neighborhoods We <span className="gradient-text">Serve</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
            Local expertise across the NYC metro area. We know these streets,
            these businesses, and what it takes to win here.
          </p>
        </motion.div>

        {/* Slider */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          {/* Image container */}
          <div className="relative aspect-[21/9] sm:aspect-[21/8] w-full">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0"
              >
                <Image
                  src={slide.image}
                  alt={`Digital marketing in ${slide.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1280px"
                  priority={current === 0}
                />
                {/* Ink overlay */}
                <div className="absolute inset-0" style={{ backgroundColor: "rgba(28, 28, 28, 0.6)" }} />
              </motion.div>
            </AnimatePresence>

            {/* Content overlay */}
            <div className="absolute inset-0 z-10 flex items-end">
              <div className="p-6 sm:p-10 md:p-14 w-full max-w-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <p className="text-teal-400 font-semibold text-sm uppercase tracking-widest mb-2 font-cta">
                      {slide.tagline}
                    </p>
                    <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white font-heading mb-3">
                      {slide.name}
                    </h3>
                    <p className="text-slate-200 text-base sm:text-lg leading-relaxed mb-6 max-w-lg">
                      {slide.description}
                    </p>
                    <Link
                      href={slide.href}
                      className="inline-block rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors font-cta"
                    >
                      Explore {slide.name}
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Arrows */}
            <button
              onClick={prev}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Previous neighborhood"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Next neighborhood"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-4 sm:bottom-6 right-6 sm:right-10 z-20 flex items-center gap-2">
            {neighborhoods.map((n, i) => (
              <button
                key={n.name}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "w-8 bg-teal-400"
                    : "w-2 bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to ${n.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
