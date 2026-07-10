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
  { prefix: "$", value: 15.2, suffix: "M+", label: "Revenue Generated" },
  { prefix: "", value: 10, suffix: "K+", label: "First Page Rankings" },
  { prefix: "", value: 500, suffix: "%+", label: "Average Client ROI" },
  { prefix: "", value: 150, suffix: "+", label: "Local Businesses Served" },
  { prefix: "", value: 92, suffix: "%", label: "Client Retention", sublabel: "not everyone is meant to work together 😊" },
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
