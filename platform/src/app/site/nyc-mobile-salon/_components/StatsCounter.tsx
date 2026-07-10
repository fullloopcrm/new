"use client";

import { useEffect, useRef, useState } from "react";

type StatConfig = {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  star?: boolean;
};

const statConfigs: StatConfig[] = [
  { target: 5000, suffix: "+", label: "Happy Clients" },
  { target: 4.9, decimals: 1, label: "Average Rating", star: true },
  { target: 5, label: "Boroughs Covered" },
  { target: 49, prefix: "$", label: "Starting Price" },
];

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function CountValue({ config }: { config: StatConfig }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const duration = 2000;
    const startTime = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = eased * config.target;

      if (config.decimals) {
        setDisplay(current.toFixed(config.decimals));
      } else {
        setDisplay(Math.floor(current).toLocaleString());
      }

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, config.target, config.decimals]);

  return (
    <span ref={ref}>
      {config.prefix || ""}{display}{config.suffix || ""}
    </span>
  );
}

export default function StatsCounter() {
  return (
    <section className="bg-gray-50 px-4 py-14" data-reveal>
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
        {statConfigs.map((config) => (
          <div key={config.label} className="text-center">
            <p className="font-display text-4xl font-semibold text-gray-900 md:text-5xl">
              <CountValue config={config} />
              {config.star && (
                <span className="ml-1 text-amber-400">&#9733;</span>
              )}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {config.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
