"use client";

import Link from "next/link";
import { useState } from "react";
import { PHONE, PHONE_HREF, SMS_HREF, TOP_CITIES } from "@/app/site/nyc-tow/_data/content";

// Top 10 services for the header dropdown — slugs match src/data/services.ts
const TOP_SERVICES = [
  { title: "Emergency 24/7 Towing", slug: "emergency-247-towing" },
  { title: "Light-Duty Towing", slug: "light-duty-towing" },
  { title: "Flatbed Towing", slug: "flatbed-towing" },
  { title: "Heavy-Duty Towing", slug: "heavy-duty-towing" },
  { title: "Jump Start / Dead Battery", slug: "jump-start" },
  { title: "Flat Tire Change", slug: "flat-tire-change" },
  { title: "Lockout Service", slug: "lockout-service" },
  { title: "Gas Delivery", slug: "gas-delivery" },
  { title: "Accident Recovery", slug: "accident-recovery" },
  { title: "Motorcycle Towing", slug: "motorcycle-towing" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      {/* Top bar */}
      <div className="bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3 sm:hidden">
            <a href={PHONE_HREF} className="text-sm font-bold text-yellow-400 font-cta">📞 Call {PHONE}</a>
          </div>
          <div className="hidden items-center gap-1.5 overflow-x-auto sm:flex">
            <span className="shrink-0 text-xs font-semibold text-slate-500 font-cta">Neighborhoods:</span>
            {TOP_CITIES.slice(0, 7).map((city) => (
              <Link key={city} href="/locations" className="shrink-0 text-xs font-semibold text-slate-400 transition-colors hover:text-yellow-400 font-cta">
                {city}
              </Link>
            ))}
            <span className="text-slate-700">|</span>
            <Link href="/commercial" className="shrink-0 text-xs font-semibold text-yellow-400 transition-colors hover:text-yellow-300 font-cta">Fleet & Commercial</Link>
          </div>
          <div className="hidden items-center gap-3 shrink-0 sm:flex">
            <a href={PHONE_HREF} className="text-sm font-bold text-yellow-400 transition-colors hover:text-yellow-300 font-cta">24/7 Dispatch — {PHONE}</a>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="transition-all duration-300" style={{ backgroundColor: "#b91c1c" }}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-4">
          <Link href="/" className="flex items-center gap-1 shrink min-w-0">
            <span className="text-sm sm:text-lg lg:text-xl font-bold tracking-wider sm:tracking-widest text-white font-heading whitespace-nowrap">THE NYC</span>
            <span className="text-sm sm:text-lg lg:text-xl font-bold tracking-wider sm:tracking-widest text-yellow-200 font-heading whitespace-nowrap">TOWING SERVICE</span>
          </Link>

          <div className="hidden items-center justify-center gap-6 lg:flex flex-1">
            <Link href="/" className="text-[15px] font-medium tracking-wide text-white transition-colors hover:text-white font-cta whitespace-nowrap">Home</Link>

            {/* Services dropdown — desktop. Hover and click both toggle. */}
            <div className="relative" onMouseEnter={() => setServicesOpen(true)} onMouseLeave={() => setServicesOpen(false)}>
              <button
                type="button"
                onClick={() => setServicesOpen(!servicesOpen)}
                aria-haspopup="menu"
                aria-expanded={servicesOpen}
                className="flex items-center text-[15px] font-medium tracking-wide text-white transition-colors hover:text-white font-cta whitespace-nowrap"
              >
                Services
                <svg className={`ml-1 h-3.5 w-3.5 transition-transform duration-200 ${servicesOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {servicesOpen && (
                <>
                  {/* Bridge so hover doesn't break when moving cursor into the panel */}
                  <div className="absolute top-full left-0 h-2 w-full" />
                  <div
                    role="menu"
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-lg border border-slate-700/60 bg-slate-900 py-2 shadow-xl"
                  >
                    {TOP_SERVICES.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/services/${s.slug}`}
                        onClick={() => setServicesOpen(false)}
                        className="block px-4 py-2 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta"
                      >
                        {s.title}
                      </Link>
                    ))}
                    <div className="my-2 border-t border-slate-700/60" />
                    <Link
                      href="/services"
                      onClick={() => setServicesOpen(false)}
                      className="block px-4 py-2.5 text-[14px] font-semibold text-yellow-400 hover:bg-slate-800 hover:text-yellow-300 transition-colors font-cta"
                    >
                      All Services →
                    </Link>
                  </div>
                </>
              )}
            </div>

            <Link href="/pricing" className="text-[15px] font-medium tracking-wide text-white transition-colors hover:text-white font-cta whitespace-nowrap">Pricing</Link>
            <Link href="/faq" className="text-[15px] font-medium tracking-wide text-white transition-colors hover:text-white font-cta whitespace-nowrap">FAQ</Link>
            <Link href="/contact-nyc-towing-today" className="text-[15px] font-medium tracking-wide text-white transition-colors hover:text-white font-cta whitespace-nowrap">Contact</Link>

            <div className="h-5 w-px bg-white/30" />

            {/* More dropdown */}
            <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)}>
              <button onClick={() => setMoreOpen(!moreOpen)} className="flex items-center text-[15px] font-medium tracking-wide text-white transition-colors hover:text-white font-cta">
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
                    <Link href="/locations" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Coverage Areas</Link>
                    <Link href="/careers" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Drivers & Jobs</Link>
                    <Link href="/franchise" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Join Our Fleet</Link>
                    <Link href="/blog" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Towing Tips</Link>
                    <Link href="/blog" onClick={() => setMoreOpen(false)} className="block px-4 py-2.5 text-[14px] font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors font-cta">Blog</Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="hidden lg:flex justify-end">
            <Link href="/book-towing-service-today">
              <span className="inline-block rounded-lg bg-white px-4 py-2 text-[15px] font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
                Request a Tow
              </span>
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="relative z-[60] shrink-0 flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 sm:px-4 sm:py-2 lg:hidden">
            <span className="text-xs sm:text-sm font-medium text-white font-cta">{mobileOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-700/60 px-4 py-6 space-y-4">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-yellow-400 transition-colors font-cta">Home</Link>
          {/* Mobile services — tap to expand, so tap works where hover can't. */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none text-lg font-semibold text-white hover:text-yellow-400 transition-colors font-cta">
              <span>Services</span>
              <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-3 ml-3 space-y-2 border-l border-slate-700/60 pl-4">
              {TOP_SERVICES.map((s) => (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta"
                >
                  {s.title}
                </Link>
              ))}
              <Link
                href="/services"
                onClick={() => setMobileOpen(false)}
                className="block text-base font-semibold text-yellow-400 hover:text-yellow-300 transition-colors font-cta"
              >
                All Services →
              </Link>
            </div>
          </details>
          <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-yellow-400 transition-colors font-cta">Pricing</Link>
          <Link href="/faq" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-yellow-400 transition-colors font-cta">FAQ</Link>
          <Link href="/contact-nyc-towing-today" onClick={() => setMobileOpen(false)} className="block text-lg font-semibold text-white hover:text-yellow-400 transition-colors font-cta">Contact</Link>
          <div className="border-t border-slate-700/60 pt-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-cta">More</p>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta">About</Link>
            <Link href="/locations" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta">Coverage Areas</Link>
            <Link href="/careers" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta">Drivers & Jobs</Link>
            <Link href="/franchise" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta">Join Our Fleet</Link>
            <Link href="/blog" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta">Towing Tips</Link>
            <Link href="/blog" onClick={() => setMobileOpen(false)} className="block text-base font-medium text-slate-300 hover:text-yellow-400 transition-colors font-cta">Blog</Link>
          </div>
          <div className="mt-4 space-y-3">
            <a href={SMS_HREF} className="block">
              <span className="block w-full rounded-lg bg-white px-6 py-3 text-center text-base font-semibold text-teal-700 font-cta">Text {PHONE} — 24/7</span>
            </a>
            <a href={PHONE_HREF} className="block">
              <span className="block w-full rounded-lg border border-slate-600 px-6 py-3 text-center text-base font-semibold text-white font-cta">Call {PHONE}</span>
            </a>
            <Link href="/book-towing-service-today" onClick={() => setMobileOpen(false)} className="block">
              <span className="block w-full rounded-lg bg-accent px-6 py-3 text-center text-base font-semibold text-white font-cta">Request a Tow</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
