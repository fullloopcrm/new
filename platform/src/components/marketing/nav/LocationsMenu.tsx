"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { locationPath, metros } from "@/lib/marketing/combos";
import { groupMetrosByState } from "@/lib/marketing/metroGroups";

const HUB_URL = "/locations";
const STATE_GROUPS = groupMetrosByState();

function CitySearch({ query, onChange }: { query: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={query}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search 400 cities…"
      className="w-full rounded border px-3 py-2 text-[13px] outline-none"
      style={{ borderColor: "#EDEDE8", color: "#1C1C1C" }}
    />
  );
}

export function LocationsDesktopPanel() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.trim().toLowerCase();
    return metros.filter((m) => m.city.toLowerCase().includes(q) || m.stateAbbr.toLowerCase() === q).slice(0, 40);
  }, [query]);

  return (
    <div className="w-[880px] p-5">
      <div className="mb-4">
        <CitySearch query={query} onChange={setQuery} />
      </div>

      {filtered ? (
        <div className="grid grid-cols-4 gap-1 max-h-[420px] overflow-y-auto">
          {filtered.length === 0 && (
            <p className="col-span-4 text-[13px]" style={{ color: "#A8A8A4" }}>
              No cities match &ldquo;{query}&rdquo;.
            </p>
          )}
          {filtered.map((metro) => (
            <Link
              key={metro.slug}
              href={locationPath(metro)}
              className="rounded px-2 py-1.5 text-[13px] transition-colors hover:bg-[#FBFBF8]"
              style={{ color: "#1C1C1C" }}
            >
              {metro.city}, {metro.stateAbbr}
            </Link>
          ))}
        </div>
      ) : (
        <div className="columns-4 gap-x-6 max-h-[420px] overflow-y-auto">
          {STATE_GROUPS.map((group) => (
            <div key={group.stateAbbr} className="break-inside-avoid mb-4">
              <div
                className="mb-1 text-[10px] font-mono uppercase tracking-[0.14em] pb-1 border-b"
                style={{ color: "#A8A8A4", borderColor: "#EDEDE8" }}
              >
                {group.state}
              </div>
              <div className="flex flex-col">
                {group.metros.map((metro) => (
                  <Link
                    key={metro.slug}
                    href={locationPath(metro)}
                    className="rounded px-1 py-0.5 text-[13px] transition-colors hover:bg-[#FBFBF8]"
                    style={{ color: "#1C1C1C" }}
                  >
                    {metro.city}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t" style={{ borderColor: "#EDEDE8" }}>
        <Link
          href={HUB_URL}
          className="inline-block px-2 text-[13px] font-semibold transition-colors hover:opacity-70"
          style={{ color: "#1C1C1C" }}
        >
          All {metros.length} Locations &rarr;
        </Link>
      </div>
    </div>
  );
}

export function LocationsMobileList({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="ml-4 flex flex-col gap-3 border-l-2 pl-3 max-h-[50vh] overflow-y-auto" style={{ borderColor: "#EDEDE8" }}>
      {STATE_GROUPS.map((group) => (
        <div key={group.stateAbbr}>
          <div className="mb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-400">
            {group.state}
          </div>
          <div className="flex flex-col">
            {group.metros.map((metro) => (
              <Link
                key={metro.slug}
                href={locationPath(metro)}
                onClick={onNavigate}
                className="rounded-lg px-2 py-1 text-sm text-slate-600 transition-colors hover:text-teal-600"
              >
                {metro.city}
              </Link>
            ))}
          </div>
        </div>
      ))}
      <Link
        href={HUB_URL}
        onClick={onNavigate}
        className="rounded-lg px-2 py-2 text-sm font-semibold text-teal-600"
      >
        All {metros.length} Locations &rarr;
      </Link>
    </div>
  );
}
