// @ts-nocheck
"use client";

import Link from "next/link";
import { useState } from "react";
import { PHONE, PHONE_HREF, SMS_HREF, TOP_CITIES } from "@/app/site//_data/content";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      {/* Top bar */}
      <div className="bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-3 sm:hidden">
            <a href={PHONE_HREF} className="text-xs font-semibold text-teal-400 font-cta">Call {PHONE}</a>
          </div>
          <div className="hidden items-center gap-1.5 overflow-x-auto sm:flex">
            <span className="shrink-0 text-xs font-semibold text-slate-500 font-cta">Top Cities:</span>
            {TOP_CITIES.slice(0, 7).map((city) => (
              <Link key={city} href="/locations" className="shrink-0 text-xs font-semibold text-slate-400 transition-colors hover:text-teal-400 font-cta">
                {city}
              </Link>
            ))}
            <span className="text-slate-700">|</span>
            <Link href="/commercial" className="shrink-0 text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300 font-cta">Commercial</Link>
          </div>
          <div className="hidden items-center gap-3 shrink-0 sm:flex">
            <a href={PHONE_HREF} className="text-xs font-semibold text-teal-400 transition-colors hover:text-teal-300 font-cta">Call {PHONE}</a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="transition-all duration-300" style={{ backgroundColor: "#2d6a4f" }}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-4">
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="text-xl font-bold tracking-widest text-white font-heading">HOME</span>
            <span className="text-xl font-bold tracking-widest text-teal-200 font-heading">SERVICES</span>
          </Link>

          <div className="hidden items-center justify-center gap-6 lg:flex flex-1">
            <Link href="/" className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap">Home</Link>
            <Link href="/services" className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap">Services</Link>
            <Link href="/pricing" className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap">Pricing</Link>
            <Link href="/faq" className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap">FAQ</Link>
            <Link href="/contact" className="text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta whitespace-nowrap">Contact</Link>

            <div className="h-5 w-px bg-white/30" />

            {/* More dropdown */}
            <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
              <button onClick={() => setMoreOpen(!moreOpen)} className="flex items-center text-[15px] font-medium tracking-wide text-white/90 transition-colors hover:text-white font-cta">
                More
                <svg className={`ml-1 h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {moreOpen && (
                <>
                  {/* Bridge — invisible area connecting button to dropdown so hover doesn't break */}
                  <div className="absolute top-full left-0 h-2 w-full" />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-lg border border-slate-700/60 bg-slate-900 py-2 shadow-xl">
                    <Link href="/about" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">About</Link>
                    <Link href="/locations" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Locations</Link>
                    <Link href="/careers" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Jobs</Link>
                    <Link href="/partnerships" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Contractor Partnerships</Link>
                    <Link href="/franchise" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Franchise</Link>
                    <Link href="/blog" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Home Services Tips</Link>
                    <Link href="/blog" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Blog</Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <Link href="/book">
              <span className="inline-block rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
                Book Now
              </span>
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="relative z-[60] flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 lg:hidden">
            <span className="text-sm font-medium text-white font-cta">{mobileOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-700/60 px-4 py-6 space-y-4">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-teal-400 transition-colors font-cta">Home</Link>
          <Link href="/services" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-teal-400 transition-colors font-cta">Services</Link>
          <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-teal-400 transition-colors font-cta">Pricing</Link>
          <Link href="/faq" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-teal-400 transition-colors font-cta">FAQ</Link>
          <Link href="/contact" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-teal-400 transition-colors font-cta">Contact</Link>
          <div className="border-t border-slate-700/60 pt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-cta">More</p>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">About</Link>
            <Link href="/locations" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">Locations</Link>
            <Link href="/careers" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">Jobs</Link>
            <Link href="/partnerships" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">Contractor Partnerships</Link>
            <Link href="/franchise" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">Franchise</Link>
            <Link href="/blog" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">Home Services Tips</Link>
            <Link href="/blog" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-teal-400 transition-colors font-cta">Blog</Link>
          </div>
          <div className="mt-4 space-y-3">
            <a href={SMS_HREF} className="block">
              <span className="block w-full rounded-lg bg-white px-6 py-3 text-center text-base font-semibold text-teal-700 font-cta">Text {PHONE} — Most Popular</span>
            </a>
            <a href={PHONE_HREF} className="block">
              <span className="block w-full rounded-lg border border-slate-600 px-6 py-3 text-center text-base font-semibold text-white font-cta">Call {PHONE}</span>
            </a>
            <Link href="/book" onClick={() => setMobileOpen(false)} className="block">
              <span className="block w-full rounded-lg bg-accent px-6 py-3 text-center text-base font-semibold text-white font-cta">Book Now</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
