// @ts-nocheck
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface ServiceOption {
  id: string;
  name: string;
  minutes: number; // typical on-scene minutes for a trained tech
  category: "Emergency" | "Lockout" | "Recovery" | "Specialty";
}

// Typical on-scene service times for a trained roadside technician.
const ROADSIDE_OPTIONS: ServiceOption[] = [
  // Emergency
  { id: "jump", name: "Jump-Start (Dead Battery)", minutes: 25, category: "Emergency" },
  { id: "flat-tire", name: "Flat Tire — Spare Swap", minutes: 30, category: "Emergency" },
  { id: "tire-plug", name: "Tire Plug & Inflate", minutes: 30, category: "Emergency" },
  { id: "mobile-tire", name: "Mobile Tire Replacement (new tire)", minutes: 45, category: "Emergency" },
  { id: "battery-install", name: "On-Site Battery Replacement", minutes: 35, category: "Emergency" },
  { id: "ev-charge", name: "EV Charging Delivery", minutes: 30, category: "Emergency" },
  { id: "key-fob", name: "Key Fob Battery Replacement", minutes: 10, category: "Emergency" },
  // Lockout
  { id: "car-lockout", name: "Car Lockout", minutes: 20, category: "Lockout" },
  { id: "trunk-lockout", name: "Trunk Lockout", minutes: 25, category: "Lockout" },
  { id: "broken-key", name: "Broken Key Extraction", minutes: 20, category: "Lockout" },
  // Recovery
  { id: "fuel", name: "Fuel Delivery (2–5 gal)", minutes: 25, category: "Recovery" },
  { id: "local-tow", name: "Local Tow (≤5 mi)", minutes: 50, category: "Recovery" },
  { id: "accident-tow", name: "Accident / Collision Tow", minutes: 60, category: "Recovery" },
  { id: "winch-light", name: "Winch-Out — Soft Shoulder", minutes: 30, category: "Recovery" },
  { id: "winch-heavy", name: "Winch-Out — Snow/Mud/Ditch", minutes: 45, category: "Recovery" },
  // Specialty
  { id: "motorcycle-tow", name: "Motorcycle Tow", minutes: 60, category: "Specialty" },
  { id: "rv-roadside", name: "RV Roadside (any service)", minutes: 60, category: "Specialty" },
  { id: "diesel-service", name: "Diesel Roadside / DEF Delivery", minutes: 40, category: "Specialty" },
];

const CATEGORIES: ServiceOption["category"][] = ["Emergency", "Lockout", "Recovery", "Specialty"];

const RATE = 100;
const MIN_HOURS = 1;

function formatUSD(n: number): string {
  return `$${n.toFixed(0)}`;
}

export function PricingCalculator({ variant = "default" }: { variant?: "default" | "hero" }) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [activeCat, setActiveCat] = useState<ServiceOption["category"]>("Emergency");

  const items = useMemo(() => ROADSIDE_OPTIONS.filter((i) => i.category === activeCat), [activeCat]);

  const totals = useMemo(() => {
    let minutes = 0;
    let count = 0;
    for (const opt of ROADSIDE_OPTIONS) {
      if (!selectedIds[opt.id]) continue;
      minutes += opt.minutes;
      count += 1;
    }
    const rawHours = minutes / 60;
    const billedHours = count === 0 ? 0 : Math.max(MIN_HOURS, Math.ceil(rawHours * 2) / 2);
    const labor = billedHours * RATE;
    return { count, minutes, billedHours, labor };
  }, [selectedIds]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  function reset() {
    setSelectedIds({});
  }

  const isHero = variant === "hero";
  const wrapClass = isHero
    ? "rounded-2xl border border-white/20 bg-white/95 p-5 shadow-2xl backdrop-blur sm:p-6 text-slate-900"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6";

  return (
    <div className={wrapClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 font-cta">Quick Estimate</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900 font-heading sm:text-2xl">
            What does roadside help cost?
          </h3>
          <p className="mt-1 text-xs text-slate-500">Tap what you need. $149/hr flat, 1-hour minimum. Most jobs are done inside the minimum.</p>
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
          const selected = !!selectedIds[item.id];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-[11px] text-slate-500">~{item.minutes} min on scene</p>
                </div>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>
                  ✓
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Totals */}
      <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white">
        {totals.count === 0 ? (
          <p className="text-center text-sm text-white/70">Select what you need above to see your estimate.</p>
        ) : (
          <>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Estimated on-scene time</span>
                <span className="font-semibold tabular-nums">{totals.minutes} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Billed time (1-hr minimum)</span>
                <span className="font-semibold tabular-nums">
                  {totals.billedHours} hr{totals.billedHours === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Rate</span>
                <span className="font-semibold tabular-nums">$149/hr flat</span>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between border-t border-white/15 pt-3">
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70 font-cta">Estimated Total</span>
              <span className="text-3xl font-bold tabular-nums font-heading">{formatUSD(totals.labor)}</span>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-amber-300">
              Tow mileage past 5 miles, fuel-at-pump-price, and replacement battery hardware are billed separately at cost.
            </p>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-slate-500">
        Estimate only. Final cost is confirmed once a dispatcher reviews your location and situation. Tow mileage beyond 5 miles, fuel-at-pump-price, and replacement parts are billed at cost. No after-hours or holiday surcharges.
      </p>

      <Link
        href="/book-roadside-help-now"
        className="mt-4 block w-full rounded-lg bg-emerald-700 py-3 text-center text-base font-bold text-white transition-colors hover:bg-emerald-800 font-cta"
      >
        Book Roadside Help Now
      </Link>
    </div>
  );
}