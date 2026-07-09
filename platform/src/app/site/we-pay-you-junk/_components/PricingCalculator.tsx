"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface Item {
  id: string;
  name: string;
  minutes: number; // time to load 1 unit
  resale: number; // fair market value (we credit 50%)
  category: "Furniture" | "Appliances" | "Electronics" | "Fitness" | "Outdoor" | "General";
}

// Conservative time/value estimates — final pricing set on-site by the crew.
const ITEMS: Item[] = [
  // Furniture
  { id: "couch", name: "Couch / Sofa", minutes: 15, resale: 200, category: "Furniture" },
  { id: "sectional", name: "Sectional", minutes: 25, resale: 300, category: "Furniture" },
  { id: "armchair", name: "Armchair / Recliner", minutes: 10, resale: 80, category: "Furniture" },
  { id: "mattress-q", name: "Mattress (Q/K)", minutes: 15, resale: 0, category: "Furniture" },
  { id: "mattress-t", name: "Mattress (Twin/Full)", minutes: 10, resale: 0, category: "Furniture" },
  { id: "boxspring", name: "Box Spring", minutes: 8, resale: 0, category: "Furniture" },
  { id: "dining-table", name: "Dining Table", minutes: 15, resale: 150, category: "Furniture" },
  { id: "dresser", name: "Dresser / Bookshelf", minutes: 10, resale: 80, category: "Furniture" },
  { id: "desk", name: "Office Desk", minutes: 12, resale: 80, category: "Furniture" },
  { id: "office-chair", name: "Office Chair", minutes: 5, resale: 40, category: "Furniture" },
  // Appliances
  { id: "fridge", name: "Refrigerator", minutes: 20, resale: 200, category: "Appliances" },
  { id: "washer-dryer", name: "Washer or Dryer", minutes: 15, resale: 150, category: "Appliances" },
  { id: "stove", name: "Stove / Oven", minutes: 15, resale: 100, category: "Appliances" },
  { id: "dishwasher", name: "Dishwasher", minutes: 12, resale: 80, category: "Appliances" },
  { id: "microwave", name: "Microwave", minutes: 5, resale: 40, category: "Appliances" },
  // Electronics
  { id: "tv", name: "TV (large)", minutes: 8, resale: 80, category: "Electronics" },
  { id: "computer", name: "Computer / Monitor", minutes: 5, resale: 60, category: "Electronics" },
  { id: "stereo", name: "Stereo / Speakers", minutes: 5, resale: 80, category: "Electronics" },
  // Fitness
  { id: "treadmill", name: "Treadmill", minutes: 25, resale: 200, category: "Fitness" },
  { id: "bowflex", name: "Bowflex / Weight Set", minutes: 25, resale: 150, category: "Fitness" },
  { id: "bike", name: "Bicycle", minutes: 5, resale: 80, category: "Fitness" },
  // Outdoor
  { id: "grill", name: "BBQ Grill", minutes: 10, resale: 80, category: "Outdoor" },
  { id: "hottub", name: "Hot Tub", minutes: 90, resale: 0, category: "Outdoor" },
  { id: "shed", name: "Shed (small)", minutes: 120, resale: 0, category: "Outdoor" },
  { id: "yard", name: "Yard Debris (pile)", minutes: 20, resale: 0, category: "Outdoor" },
  // General
  { id: "boxes", name: "Boxes / Bags", minutes: 3, resale: 0, category: "General" },
  { id: "tools", name: "Power Tools / Toolbox", minutes: 5, resale: 100, category: "General" },
  { id: "carpet", name: "Carpet / Rug Roll", minutes: 8, resale: 0, category: "General" },
  { id: "piano", name: "Upright Piano", minutes: 60, resale: 200, category: "General" },
];

const CATEGORIES: Item["category"][] = ["Furniture", "Appliances", "Electronics", "Fitness", "Outdoor", "General"];

type CrewKey = "solo" | "standard";
const CREW: Record<CrewKey, { label: string; rate: number; speed: number; subtitle: string }> = {
  solo: { label: "1 Person Crew", rate: 100, speed: 1, subtitle: "$100/hr • small jobs" },
  standard: { label: "2 Person Crew", rate: 250, speed: 1.6, subtitle: "$250/hr • most popular" },
};

function formatUSD(n: number): string {
  return `$${n.toFixed(0)}`;
}

export function PricingCalculator({ variant = "default" }: { variant?: "default" | "hero" }) {
  const [crew, setCrew] = useState<CrewKey>("standard");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState<Item["category"]>("Furniture");

  const items = useMemo(() => ITEMS.filter((i) => i.category === activeCat), [activeCat]);

  const totals = useMemo(() => {
    let minutes = 0;
    let resale = 0;
    let count = 0;
    for (const item of ITEMS) {
      const q = qty[item.id] ?? 0;
      if (q <= 0) continue;
      minutes += item.minutes * q;
      resale += item.resale * q;
      count += q;
    }
    const adjMinutes = minutes / CREW[crew].speed;
    const rawHours = adjMinutes / 60;
    // Round up to nearest 0.5 hr, min 1 hr if anything selected.
    const billedHours = count === 0 ? 0 : Math.max(1, Math.ceil(rawHours * 2) / 2);
    const labor = billedHours * CREW[crew].rate;
    const credit = Math.round(resale * 0.5);
    const subtotal = labor - credit;
    const total = Math.max(0, subtotal - 10); // -$10 booking discount
    return { count, billedHours, labor, credit, total, hadCredit: credit > 0, hadDiscount: count > 0 };
  }, [qty, crew]);

  function bump(id: string, delta: number) {
    setQty((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  }

  function reset() {
    setQty({});
  }

  const isHero = variant === "hero";
  const wrapClass = isHero
    ? "rounded-2xl border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur sm:p-6 text-slate-900"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6";

  return (
    <div className={wrapClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 font-cta">Quick Estimate</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 font-heading sm:text-2xl">
            What&apos;s your junk removal cost?
          </h3>
          <p className="mt-1 text-xs text-slate-500">Tap items below. We&apos;ll estimate hours, labor, and resale credit.</p>
        </div>
        {totals.count > 0 && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 font-cta"
          >
            Reset
          </button>
        )}
      </div>

      {/* Crew selector */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {(Object.keys(CREW) as CrewKey[]).map((key) => {
          const c = CREW[key];
          const active = crew === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCrew(key)}
              className={`rounded-lg border-2 px-3 py-2 text-left transition-colors font-cta ${
                active
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-bold">{c.label}</p>
              <p className="text-[11px] opacity-80">{c.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Category tabs */}
      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const active = cat === activeCat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors font-cta ${
                active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Item grid */}
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const q = qty[item.id] ?? 0;
          const hasResale = item.resale > 0;
          return (
            <li
              key={item.id}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                q > 0 ? "border-teal-400 bg-teal-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                {hasResale && (
                  <p className="text-[10px] font-semibold text-emerald-700">Resale credit possible</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => bump(item.id, -1)}
                  disabled={q === 0}
                  aria-label={`Remove one ${item.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-900">{q}</span>
                <button
                  type="button"
                  onClick={() => bump(item.id, 1)}
                  aria-label={`Add one ${item.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white transition-colors hover:bg-teal-700"
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Totals */}
      <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white">
        {totals.count === 0 ? (
          <p className="text-center text-sm text-white/70">Add an item above to see your estimate.</p>
        ) : (
          <>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Estimated time</span>
                <span className="font-semibold tabular-nums">
                  {totals.billedHours} hr{totals.billedHours === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Labor ({CREW[crew].label})</span>
                <span className="font-semibold tabular-nums">{formatUSD(totals.labor)}</span>
              </div>
              {totals.hadCredit && (
                <div className="flex items-center justify-between text-emerald-300">
                  <span>50% Resale Credit</span>
                  <span className="font-semibold tabular-nums">−{formatUSD(totals.credit)}</span>
                </div>
              )}
              {totals.hadDiscount && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>Online booking discount</span>
                  <span className="font-semibold tabular-nums">−$10</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3">
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70 font-cta">Estimated Total</span>
              <span className="text-3xl font-bold tabular-nums font-heading">{formatUSD(totals.total)}</span>
            </div>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Estimate only. Final pricing is set on-site once our crew sees the items, access, and stairs. Resale credits depend on condition. 1-hour minimum, dump fees included.
      </p>

      <Link
        href="/book-junk-removal-service-today"
        className="mt-4 block w-full rounded-lg bg-accent py-3 text-center text-base font-bold text-white transition-colors hover:bg-accent-dark font-cta"
      >
        Book Now &amp; Save $10
      </Link>
    </div>
  );
}
