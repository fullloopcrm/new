"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MobileMenuOverlayProps {
  regions: string[];
  regionCounts: Record<string, number>;
  phone: string;
  services: { slug: string; name: string; category: string }[];
  onClose: () => void;
}

export default function MobileMenuOverlay({
  regions,
  regionCounts,
  phone,
  services,
  onClose,
}: MobileMenuOverlayProps) {
  const [section, setSection] = useState<string | null>(null);
  const phonePlain = phone.replace(/-/g, "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function toggleSection(s: string) {
    setSection((prev) => (prev === s ? null : s));
  }

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
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-stone-950 lg:hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
        <span className="text-xl font-bold text-white">
          FLA<span className="text-orange-400">Dumpster</span>Rentals
        </span>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-stone-400 hover:text-white"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="px-5 py-6 text-center">
        {[
          { name: "Home", href: "/" },
          { name: "Pricing", href: "/pricing" },
          { name: "Dumpster Sizes", href: "/dumpster-sizes" },
          { name: "How It Works", href: "/how-it-works" },
          { name: "Guide", href: "/guide" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-3 py-3 text-lg font-medium text-white hover:bg-stone-900"
            onClick={onClose}
          >
            {item.name}
          </Link>
        ))}

        <div className="my-4 border-t border-stone-800" />

        {/* Services */}
        <button
          onClick={() => toggleSection("services")}
          className="relative flex w-full items-center justify-center rounded-xl px-3 py-3 text-lg font-medium text-white hover:bg-stone-900"
        >
          Services
          <span className="absolute right-3">
            <Chevron open={section === "services"} />
          </span>
        </button>
        {section === "services" && (
          <div className="mx-3 mt-1 mb-2 rounded-xl border border-stone-800 bg-stone-900/50 p-3">
            {categoryOrder.map((cat) => {
              const catServices = byCategory[cat];
              if (!catServices) return null;
              return (
                <div key={cat} className="mt-3 first:mt-0">
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-widest text-orange-400/60">
                    {cat}
                  </p>
                  {catServices.map((svc) => (
                    <Link
                      key={svc.slug}
                      href={`/${svc.slug}`}
                      className="block rounded-lg px-2 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-orange-400"
                      onClick={onClose}
                    >
                      {svc.name.replace(" Dumpster Rental", "")}
                    </Link>
                  ))}
                </div>
              );
            })}
            <Link
              href="/services"
              className="mt-2 block rounded-lg px-2 py-2 text-sm font-semibold text-orange-400 hover:bg-stone-800"
              onClick={onClose}
            >
              All Services &rarr;
            </Link>
          </div>
        )}

        {/* Areas */}
        <button
          onClick={() => toggleSection("areas")}
          className="relative flex w-full items-center justify-center rounded-xl px-3 py-3 text-lg font-medium text-white hover:bg-stone-900"
        >
          Service Areas
          <span className="absolute right-3">
            <Chevron open={section === "areas"} />
          </span>
        </button>
        {section === "areas" && (
          <div className="mx-3 mt-1 mb-2 rounded-xl border border-stone-800 bg-stone-900/50 p-3">
            {regions.map((region) => (
              <Link
                key={region}
                href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-orange-400"
                onClick={onClose}
              >
                {region}
                <span className="text-xs text-stone-600">
                  {regionCounts[region] || 0}
                </span>
              </Link>
            ))}
            <Link
              href="/areas"
              className="mt-2 block rounded-lg px-2 py-2 text-sm font-semibold text-orange-400 hover:bg-stone-800"
              onClick={onClose}
            >
              All Areas &rarr;
            </Link>
          </div>
        )}

        {/* More */}
        <button
          onClick={() => toggleSection("more")}
          className="relative flex w-full items-center justify-center rounded-xl px-3 py-3 text-lg font-medium text-white hover:bg-stone-900"
        >
          More
          <span className="absolute right-3">
            <Chevron open={section === "more"} />
          </span>
        </button>
        {section === "more" && (
          <div className="mx-3 mt-1 mb-2 rounded-xl border border-stone-800 bg-stone-900/50 p-3">
            {moreLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-2 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-orange-400"
                onClick={onClose}
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}

        <div className="my-4 border-t border-stone-800" />

        {/* CTA buttons */}
        <div className="space-y-3">
          <a
            href={`sms:${phonePlain}`}
            className="block w-full rounded-md bg-orange-600 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white"
          >
            Text Us for a Quote
          </a>
          <a
            href={`tel:${phonePlain}`}
            className="block w-full rounded-md border-2 border-stone-600 py-3 text-center text-sm font-bold uppercase tracking-wide text-white"
          >
            Call {phone}
          </a>
          <Link
            href="/schedule-dumpster-rental-form"
            className="block w-full rounded-md border-2 border-orange-500/40 py-3 text-center text-sm font-bold uppercase tracking-wide text-orange-400"
            onClick={onClose}
          >
            Book Online
          </Link>
        </div>
      </nav>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
