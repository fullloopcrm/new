"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface MegaMenuProps {
  categories: string[];
  phone: string;
}

const MORE_LINKS = [
  { name: "About", href: "/about" },
  { name: "FAQ", href: "/faq" },
  { name: "Careers", href: "/careers" },
];

export default function MegaMenu({ categories, phone }: MegaMenuProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggleMobileSection(section: string) {
    setMobileSection((prev) => (prev === section ? null : section));
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setMobileOpen(false);
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

  const phonePlain = phone.replace(/-/g, "");

  return (
    <div ref={menuRef}>
      {/* Desktop */}
      <nav className="hidden items-center gap-1 lg:flex">
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Home
        </Link>
        <Link
          href="/pricing"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Pricing
        </Link>
        <Link
          href="/reviews"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Reviews
        </Link>
        <Link
          href="/pest-control-tips"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Tips
        </Link>

        {/* Services */}
        <div
          className="relative"
          onMouseEnter={() => handleEnter("services")}
          onMouseLeave={handleLeave}
        >
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeMenu === "services"
                ? "bg-white/[0.06] text-white"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            Services
            <Chevron open={activeMenu === "services"} />
          </button>

          {activeMenu === "services" && (
            <div className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-white/[0.08] bg-zinc-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex flex-col gap-0.5">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/services#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                    className="whitespace-nowrap rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-green-400"
                    onClick={() => setActiveMenu(null)}
                  >
                    {cat}
                  </Link>
                ))}
                <div className="mt-1 border-t border-white/[0.06] pt-1">
                  <Link
                    href="/services"
                    className="block rounded-lg px-4 py-2 text-sm font-semibold text-green-400 hover:bg-white/[0.06]"
                    onClick={() => setActiveMenu(null)}
                  >
                    All Services &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* More */}
        <div
          className="relative"
          onMouseEnter={() => handleEnter("more")}
          onMouseLeave={handleLeave}
        >
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeMenu === "more"
                ? "bg-white/[0.06] text-white"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            More
            <Chevron open={activeMenu === "more"} />
          </button>

          {activeMenu === "more" && (
            <div className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-white/[0.08] bg-zinc-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex flex-col gap-0.5">
                {MORE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-green-400"
                    onClick={() => setActiveMenu(null)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link
          href="/book-exterminator-today"
          className="ml-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-500 hover:shadow-green-500/30 hover:-translate-y-px"
        >
          Book &middot; Save $10
        </Link>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-3 lg:hidden">
        <Link
          href="/book-exterminator-today"
          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-green-600/20 hover:bg-green-500"
        >
          Book &middot; Save $10
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XIcon /> : <HamburgerIcon />}
        </button>
      </div>

      {mobileOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0A0A0A] lg:hidden">
          {/* Mobile header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <Link
              href="/"
              className="text-xl font-bold text-white"
              onClick={() => setMobileOpen(false)}
            >
              The<span className="text-green-500">NYC</span>Exterminator
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close menu"
            >
              <XIcon />
            </button>
          </div>

          {/* Scrollable nav */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="space-y-1">
              {[
                { name: "Home", href: "/" },
                { name: "Pricing", href: "/pricing" },
                { name: "Reviews", href: "/reviews" },
                { name: "Tips & Guides", href: "/pest-control-tips" },
                { name: "Areas", href: "/areas" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="my-4 border-t border-white/[0.06]" />

            {/* Services Accordion */}
            <button
              onClick={() => toggleMobileSection("services")}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-zinc-300 transition-colors hover:bg-white/[0.04]"
            >
              Services
              <Chevron open={mobileSection === "services"} />
            </button>
            {mobileSection === "services" && (
              <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-green-500/30 pl-4">
                <Link
                  href="/services"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-green-400 hover:bg-white/[0.04]"
                  onClick={() => setMobileOpen(false)}
                >
                  All Services &rarr;
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/services#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                    className="block rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}

            {/* More Accordion */}
            <button
              onClick={() => toggleMobileSection("more")}
              className="mt-1 flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-medium text-zinc-300 transition-colors hover:bg-white/[0.04]"
            >
              More
              <Chevron open={mobileSection === "more"} />
            </button>
            {mobileSection === "more" && (
              <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-green-500/30 pl-4">
                {MORE_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Fixed bottom CTAs */}
          <div className="border-t border-white/[0.06] px-5 py-5 space-y-3">
            <Link
              href="/book-exterminator-today"
              className="block w-full rounded-xl bg-green-600 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-500"
              onClick={() => setMobileOpen(false)}
            >
              Self-Book Online &mdash; Save $10
            </Link>
            <a
              href={`sms:${phonePlain}`}
              className="flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] py-3.5 text-sm font-bold text-white hover:bg-white/[0.08]"
              onClick={() => setMobileOpen(false)}
            >
              Text Us With Questions
            </a>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
