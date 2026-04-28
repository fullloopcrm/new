"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function AnimatedNumber({
  target,
  suffix,
}: {
  target: number;
  suffix: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 2000;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

const stats = [
  { target: 150, suffix: "+", label: "Clients" },
  { target: 3, suffix: "", label: "Top 3 Rankings" },
  { target: 25, suffix: "+", label: "Industries" },
  { target: 3, suffix: "", label: "Regions" },
];

export default function StatsBar() {
  return (
    <section className="relative overflow-hidden">
      {/* Solid teal background */}
      <div className="absolute inset-0 bg-[#1F4D2C]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1C1C1C] mb-2 font-mono">
                <AnimatedNumber
                  target={stat.target}
                  suffix={stat.suffix}
                />
              </p>
              <p className="text-[#1C1C1C] text-sm sm:text-base font-medium tracking-wide uppercase font-cta">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
