"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

interface Stat {
  prefix: string;
  value: number;
  suffix: string;
  label: string;
  sublabel?: string;
}

const stats: Stat[] = [
  { prefix: "", value: 85, suffix: "%", label: "Less Admin Work", sublabel: "AI-powered CRM automation" },
  { prefix: "", value: 7, suffix: "", label: "Business Stages Covered", sublabel: "lead gen to rebooking — one CRM" },
  { prefix: "", value: 24, suffix: "/7", label: "AI Sales & Booking", sublabel: "your CRM closes jobs while you sleep" },
  { prefix: "", value: 0, suffix: "", label: "Software Integrations", sublabel: "all-in-one service business platform" },
  { prefix: "", value: 100, suffix: "%", label: "Autonomous CRM Mode", sublabel: "flip one switch — it runs itself" },
];

function CountUp({
  target,
  prefix,
  suffix,
  started,
}: {
  target: number;
  prefix: string;
  suffix: string;
  started: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;

    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(target % 1 !== 0 ? parseFloat(current.toFixed(1)) : Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [started, target]);

  const display = target % 1 !== 0 ? count.toFixed(1) : count.toLocaleString();

  return (
    <span>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default function ResultsTicker() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 bg-teal-600"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 text-center">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-1 font-mono ${stat.prefix === "$" ? "text-yellow-300" : "text-white"}`}>
                <CountUp
                  target={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  started={isInView}
                />
              </div>
              <div className="text-white/80 text-sm sm:text-base font-medium font-cta">
                {stat.label}
              </div>
              {stat.sublabel && (
                <div className="text-white text-[11px] mt-1 italic font-mono">
                  {stat.sublabel}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
