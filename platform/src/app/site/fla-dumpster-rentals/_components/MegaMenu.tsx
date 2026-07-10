"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface MegaMenuProps {
  regions: string[];
  regionCounts: Record<string, number>;
  phone: string;
  services: { slug: string; name: string; category: string }[];
  onMobileToggle: () => void;
  mobileOpen: boolean;
}

export default function MegaMenu({
  regions,
  regionCounts,
  phone,
  services,
  onMobileToggle,
  mobileOpen,
}: MegaMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const phonePlain = phone.replace(/-/g, "");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleEnter(menu: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(menu);
  }

  function handleLeave() {
    timeoutRef.current = setTimeout(() => setActiveMenu(null), 150);
  }

  // Group services by category
  const byCategory: Record<string, typeof services> = {};
  for (const svc of services) {
    if (!byCategory[svc.category]) byCategory[svc.category] = [];
    byCategory[svc.category].push(svc);
  }
  const categoryOrder = ["Commercial", "Residential", "Specialty"];

  const moreLinks = [
    { name: "About", href: "/about" },
    { name: "FAQ", href: "/faq" },
    { name: "Complete Guide", href: "/guide" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "Blog", href: "/blog" },
    { name: "Broker Service", href: "/broker-service" },
    { name: "Reviews", href: "/reviews" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <div ref={menuRef}>
      {/* ===== DESKTOP NAV ===== */}
      <nav className="hidden items-center gap-0.5 lg:flex">
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Pricing
        </Link>
        <Link
          href="/dumpster-sizes"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Sizes
        </Link>

        {/* Services dropdown */}
        <div
          className="relative"
          onMouseEnter={() => handleEnter("services")}
          onMouseLeave={handleLeave}
        >
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeMenu === "services"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            Services
            <Chevron open={activeMenu === "services"} />
          </button>

          {activeMenu === "services" && (
            <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl ring-1 ring-black/5">
              <div className="flex gap-8">
                {categoryOrder.map((cat) => {
                  const catServices = byCategory[cat];
                  if (!catServices) return null;
                  return (
                    <div key={cat} className="flex flex-col gap-0.5">
                      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {cat}
                      </p>
                      {catServices.map((svc) => (
                        <Link
                          key={svc.slug}
                          href={`/${svc.slug}`}
                          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-700"
                          onClick={() => setActiveMenu(null)}
                        >
                          {svc.name.replace(" Dumpster Rental", "")}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2">
                <Link
                  href="/services"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                  onClick={() => setActiveMenu(null)}
                >
                  All Services &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Locations dropdown */}
        <div
          className="relative"
          onMouseEnter={() => handleEnter("areas")}
          onMouseLeave={handleLeave}
        >
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeMenu === "areas"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            Areas
            <Chevron open={activeMenu === "areas"} />
          </button>

          {activeMenu === "areas" && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-[420px] rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl ring-1 ring-black/5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {regions.map((region) => (
                  <Link
                    key={region}
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center justify-between whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => setActiveMenu(null)}
                  >
                    {region}
                    <span className="ml-4 text-xs text-zinc-400">
                      {regionCounts[region] || 0}
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-2 border-t border-zinc-100 pt-2">
                <Link
                  href="/areas"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                  onClick={() => setActiveMenu(null)}
                >
                  All {Object.values(regionCounts).reduce((a, b) => a + b, 0)}+ Areas &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* More dropdown */}
        <div
          className="relative"
          onMouseEnter={() => handleEnter("more")}
          onMouseLeave={handleLeave}
        >
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeMenu === "more"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            More
            <Chevron open={activeMenu === "more"} />
          </button>

          {activeMenu === "more" && (
            <div className="absolute right-0 top-full z-50 mt-2 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl ring-1 ring-black/5">
              <div className="flex flex-col gap-0.5">
                {moreLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-zinc-700 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => setActiveMenu(null)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="ml-3 flex items-center gap-2">
          <a
            href={`sms:${phonePlain}`}
            className="rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-orange-600/25 transition-all hover:shadow-lg hover:shadow-orange-600/30 hover:brightness-110"
          >
            Text Us
          </a>
          <a
            href={`tel:${phonePlain}`}
            className="rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-semibold text-zinc-700 transition-all hover:border-orange-600 hover:text-orange-600 hover:shadow-sm"
          >
            {phone}
          </a>
        </div>
      </nav>

      {/* ===== MOBILE TRIGGER ===== */}
      <div className="flex items-center gap-2 lg:hidden">
        <a
          href={`sms:${phonePlain}`}
          className="rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-orange-600/20"
        >
          Text
        </a>
        <a
          href={`tel:${phonePlain}`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700"
        >
          Call
        </a>
        <button
          onClick={onMobileToggle}
          className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XIcon /> : <HamburgerIcon />}
        </button>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
