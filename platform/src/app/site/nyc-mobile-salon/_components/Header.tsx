"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav, moreNav, womensCategories, mensCategories, eventCategories, classCategories } from "@/app/site/nyc-mobile-salon/_lib/constants";

type DropdownKey = "services" | "events" | "classes" | "more" | null;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const navRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setActiveDropdown(null);
    setMenuOpen(false);
  }, [pathname]);

  function toggle(key: DropdownKey) {
    setActiveDropdown(activeDropdown === key ? null : key);
  }

  const chevron = (key: DropdownKey) => (
    <svg className={`h-3 w-3 transition-transform ${activeDropdown === key ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const simpleLinks = mainNav.filter((l) => !["Services", "Events", "Classes"].includes(l.label));

  const linkClass = (href: string) =>
    `text-xs font-semibold uppercase tracking-wider transition-colors hover:text-blush-dark ${pathname === href ? "text-blush-dark" : "text-black"}`;

  const dropdownBtnClass = (check: boolean) =>
    `flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-blush-dark ${check ? "text-blush-dark" : "text-black"}`;

  return (
    <>
    <header ref={navRef} className="sticky top-0 z-50 border-b border-pink-50 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold uppercase tracking-wider text-black">
          The NYC Mobile Salon
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          <Link href="/how-it-works" className={linkClass("/how-it-works")}>How It Works</Link>

          {/* Services dropdown */}
          <div className="relative">
            <button onClick={() => toggle("services")} className={dropdownBtnClass(pathname.startsWith("/services"))}>
              Services {chevron("services")}
            </button>
            {activeDropdown === "services" && (
              <div className="absolute left-1/2 top-full mt-3 w-[580px] -translate-x-1/2 rounded-xl border border-pink-50 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-4">
                  <Link href="/services" className="text-xs font-semibold uppercase tracking-widest text-black hover:text-blush-dark">All Services &rarr;</Link>
                  <Link href="/services/womens" className="text-xs font-semibold uppercase tracking-widest text-blush-dark hover:text-blush">Women&apos;s &rarr;</Link>
                  <Link href="/services/mens" className="text-xs font-semibold uppercase tracking-widest text-sky-500 hover:text-sky-600">Men&apos;s &rarr;</Link>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">Women&apos;s</p>
                    {womensCategories.map((cat) => (
                      <div key={cat.slug} className="mb-3">
                        <p className="text-xs font-semibold text-black mb-1">{cat.title}</p>
                        {cat.services.slice(0, 3).map((svc) => (
                          <Link key={svc.slug} href={`/services/${svc.slug}`} className="block py-0.5 text-xs text-gray-500 transition-colors hover:text-blush-dark">{svc.name}</Link>
                        ))}
                        {cat.services.length > 3 && (
                          <Link href="/services/womens" className="block py-0.5 text-xs text-blush-dark hover:underline">+{cat.services.length - 3} more</Link>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-sky-500">Men&apos;s</p>
                    {mensCategories.map((cat) => (
                      <div key={cat.slug} className="mb-3">
                        <p className="text-xs font-semibold text-black mb-1">{cat.title}</p>
                        {cat.services.slice(0, 3).map((svc) => (
                          <Link key={svc.slug} href={`/services/${svc.slug}`} className="block py-0.5 text-xs text-gray-500 transition-colors hover:text-sky-600">{svc.name}</Link>
                        ))}
                        {cat.services.length > 3 && (
                          <Link href="/services/mens" className="block py-0.5 text-xs text-sky-500 hover:underline">+{cat.services.length - 3} more</Link>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Events dropdown */}
          <div className="relative">
            <button onClick={() => toggle("events")} className={dropdownBtnClass(pathname.startsWith("/events"))}>
              Events {chevron("events")}
            </button>
            {activeDropdown === "events" && (
              <div className="absolute left-1/2 top-full mt-3 w-[520px] -translate-x-1/2 rounded-xl border border-pink-50 bg-white p-6 shadow-xl">
                <Link href="/events" className="mb-4 block text-xs font-semibold uppercase tracking-widest text-black hover:text-blush-dark">All Events &rarr;</Link>
                <div className="grid grid-cols-2 gap-6">
                  {eventCategories.map((cat) => (
                    <div key={cat.slug} className="mb-2">
                      <p className="text-xs font-semibold text-blush-dark mb-1">{cat.title}</p>
                      {cat.items.slice(0, 3).map((item) => (
                        <Link key={item.slug} href={`/events/${item.slug}`} className="block py-0.5 text-xs text-gray-500 transition-colors hover:text-blush-dark">{item.name}</Link>
                      ))}
                      {cat.items.length > 3 && (
                        <Link href="/events" className="block py-0.5 text-xs text-blush-dark hover:underline">+{cat.items.length - 3} more</Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Classes dropdown */}
          <div className="relative">
            <button onClick={() => toggle("classes")} className={dropdownBtnClass(pathname.startsWith("/classes"))}>
              Classes {chevron("classes")}
            </button>
            {activeDropdown === "classes" && (
              <div className="absolute left-1/2 top-full mt-3 w-[260px] -translate-x-1/2 rounded-xl border border-gray-100 bg-white p-5 shadow-lg">
                <Link href="/classes" className="mb-3 block text-xs font-semibold uppercase tracking-widest text-black hover:text-gray-600">View All Classes &rarr;</Link>
                {classCategories.flatMap((cat) => cat.items).map((cls) => (
                  <Link key={cls.slug} href={`/classes/${cls.slug}`} className="block py-1.5 text-sm font-medium text-black transition-colors hover:text-gray-600">{cls.name}</Link>
                ))}
              </div>
            )}
          </div>

          {/* More dropdown */}
          <div className="relative">
            <button onClick={() => toggle("more")} className={dropdownBtnClass(moreNav.some((l) => pathname === l.href))}>
              More {chevron("more")}
            </button>
            {activeDropdown === "more" && (
              <div className="absolute right-0 top-full mt-3 w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                {moreNav.map((link) => (
                  <Link key={link.href} href={link.href} className={`block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-gray-50 ${pathname === link.href ? "text-black" : "text-black"}`}>{link.label}</Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/book" className="btn-primary rounded-full px-6 py-2.5 text-sm font-semibold">Book Now</Link>
        </nav>

        {/* Mobile menu button */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden" aria-label="Toggle menu">
          <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />}
          </svg>
        </button>
      </div>

    </header>

    {/* Mobile nav — OUTSIDE header to escape backdrop-filter stacking context */}
    {menuOpen && (
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)", display: "flex", flexDirection: "column" }} className="lg:hidden">
        {/* Close */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "20px" }}>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Links */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: "16px", padding: "24px", overflowY: "auto" }}>
          {simpleLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block py-1 text-lg font-semibold uppercase tracking-wider text-white">{link.label}</Link>
          ))}
          <Link href="/services" onClick={() => setMenuOpen(false)} className="block py-1 text-lg font-semibold uppercase tracking-wider text-white">Services</Link>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/services/womens" className="text-sm text-white/70 hover:text-white">Women&apos;s</Link>
            <Link href="/services/mens" className="text-sm text-white/70 hover:text-white">Men&apos;s</Link>
          </div>
          <Link href="/events" onClick={() => setMenuOpen(false)} className="block py-1 text-lg font-semibold uppercase tracking-wider text-white">Events</Link>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {eventCategories.map((cat) => (
              <Link key={cat.slug} href="/events" className="text-sm text-white/70 hover:text-white">{cat.title}</Link>
            ))}
          </div>
          <Link href="/classes" onClick={() => setMenuOpen(false)} className="block py-1 text-lg font-semibold uppercase tracking-wider text-white">Classes</Link>
          {moreNav.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block py-1 text-lg font-semibold uppercase tracking-wider text-white">{link.label}</Link>
          ))}

          <Link href="/book" className="mt-6 rounded-full bg-white px-10 py-3 text-sm font-bold uppercase tracking-wider" style={{ color: "#D4749B" }}>Book Now</Link>
        </div>

        {/* Bottom: social proof + contact */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", padding: "20px 24px" }}>
          <p className="mb-4 text-center text-sm" style={{ color: "rgba(255,255,255,0.9)" }}>
            <span className="font-semibold text-white">5,000+</span> happy clients
            <span style={{ margin: "0 8px", color: "rgba(255,255,255,0.4)" }}>|</span>
            <span className="font-semibold text-white">100+</span> 5-star ratings
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="sms:+12122029075" className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              Text
            </a>
            <a href="tel:+12122029075" className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Call
            </a>
            <a href="https://instagram.com/thenycmobilesalon" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-semibold text-white">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              IG
            </a>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
