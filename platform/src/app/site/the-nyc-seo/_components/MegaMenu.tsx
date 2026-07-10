"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface MegaMenuProps {
  categories: string[];
  regions: string[];
  regionCounts: Record<string, number>;
  phone: string;
}

export default function MegaMenu({ categories, regions, regionCounts, phone }: MegaMenuProps) {
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
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Home
        </Link>
        <Link
          href="/about"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          About
        </Link>
        <Link
          href="/portfolio"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Portfolio
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
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            Services
            <Chevron open={activeMenu === "services"} />
          </button>

          {activeMenu === "services" && (
            <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
              <div className="flex gap-8">
                {/* SEO Column */}
                <div className="flex flex-col gap-1">
                  <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">SEO</p>
                  {[
                    { name: "SEO Services", href: "/services/seo" },
                    { name: "SEO Strategy", href: "/services/seo-strategy" },
                    { name: "On-Page SEO", href: "/services/on-page-seo" },
                    { name: "Off-Page SEO & Link Building", href: "/services/off-page-seo" },
                    { name: "Technical SEO", href: "/services/search-engine-optimization" },
                    { name: "Local SEO", href: "/services/local-seo" },
                    { name: "Google Business Profile", href: "/services/google-business-profile" },
                    { name: "Content Marketing", href: "/services/content-marketing" },
                  ].map((svc) => (
                    <Link
                      key={svc.href}
                      href={svc.href}
                      className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setActiveMenu(null)}
                    >
                      {svc.name}
                    </Link>
                  ))}
                </div>
                {/* AI Column */}
                <div className="flex flex-col gap-1">
                  <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">AI</p>
                  {[
                    { name: "AI Search Optimization", href: "/services/ai-search-optimization" },
                    { name: "AI Agent Development", href: "/services/ai-agent-development" },
                    { name: "AI Content Generation", href: "/services/ai-content-generation" },
                  ].map((svc) => (
                    <Link
                      key={svc.href}
                      href={svc.href}
                      className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setActiveMenu(null)}
                    >
                      {svc.name}
                    </Link>
                  ))}
                  <div className="mt-4 flex flex-col gap-1">
                    <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Marketing</p>
                    {[
                      { name: "Marketing Consulting", href: "/services/marketing-consulting" },
                      { name: "Marketing Manager", href: "/services/marketing-manager" },
                      { name: "Analytics & Reporting", href: "/services/analytics-reporting" },
                    ].map((svc) => (
                      <Link
                        key={svc.href}
                        href={svc.href}
                        className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => setActiveMenu(null)}
                      >
                        {svc.name}
                      </Link>
                    ))}
                  </div>
                </div>
                {/* Design & Build Column */}
                <div className="flex flex-col gap-1">
                  <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Design &amp; Build</p>
                  {[
                    { name: "Web Design & Development", href: "/services/web-design-development" },
                    { name: "Branding", href: "/services/branding" },
                    { name: "Automation", href: "/services/automation" },
                  ].map((svc) => (
                    <Link
                      key={svc.href}
                      href={svc.href}
                      className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setActiveMenu(null)}
                    >
                      {svc.name}
                    </Link>
                  ))}
                  <div className="mt-4 flex flex-col gap-1">
                    <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">CRM</p>
                    <Link
                      href="/services/fullloopcrm"
                      className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setActiveMenu(null)}
                    >
                      Full Loop CRM &rarr;
                    </Link>
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-zinc-100 pt-2">
                <Link
                  href="/services"
                  className="block rounded-lg px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  onClick={() => setActiveMenu(null)}
                >
                  All Services &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/pricing"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Pricing
        </Link>

        {/* Businesses */}
        <div
          className="relative"
          onMouseEnter={() => handleEnter("businesses")}
          onMouseLeave={handleLeave}
        >
          <button
            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeMenu === "businesses"
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            Businesses
            <Chevron open={activeMenu === "businesses"} />
          </button>

          {activeMenu === "businesses" && (
            <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
              <div className="flex gap-8">
                <div className="flex flex-col gap-1">
                  {categories.slice(0, 8).map((cat) => (
                    <Link
                      key={cat}
                      href={`/businesses/${cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                      className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setActiveMenu(null)}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  {categories.slice(8).map((cat) => (
                    <Link
                      key={cat}
                      href={`/businesses/${cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                      className="whitespace-nowrap rounded-lg px-4 py-1.5 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setActiveMenu(null)}
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex gap-4 border-t border-zinc-100 pt-2">
                <Link
                  href="/businesses"
                  className="block rounded-lg px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  onClick={() => setActiveMenu(null)}
                >
                  All {categories.length} Categories &rarr;
                </Link>
                <Link
                  href="/industries"
                  className="block rounded-lg px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  onClick={() => setActiveMenu(null)}
                >
                  All 172 Industries &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Areas */}
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
            Locations
            <Chevron open={activeMenu === "areas"} />
          </button>

          {activeMenu === "areas" && (
            <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
              <div className="flex flex-col gap-1">
                {regions.map((region) => (
                  <Link
                    key={region}
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center justify-between whitespace-nowrap rounded-lg px-4 py-2 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setActiveMenu(null)}
                  >
                    {region}
                    <span className="ml-3 text-xs text-zinc-400">{regionCounts[region] || 0}</span>
                  </Link>
                ))}
                <div className="mt-1 border-t border-zinc-100 pt-1">
                  <Link
                    href="/areas"
                    className="block rounded-lg px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                    onClick={() => setActiveMenu(null)}
                  >
                    All Areas &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/blog"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Blog
        </Link>
        <Link
          href="/contact"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Contact
        </Link>

        <Link
          href="/partnership-request-form"
          className="ml-3 rounded-lg bg-[#0080FE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0070E0]"
        >
          Get Better Leads
        </Link>
      </nav>

      {/* Mobile */}
      <div className="flex items-center gap-3 lg:hidden">
        <Link
          href="/partnership-request-form"
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Better Leads
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XIcon /> : <HamburgerIcon />}
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-[85vh] overflow-y-auto border-b border-zinc-200 bg-white shadow-lg lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            {/* Top-level links */}
            {[
              { name: "Home", href: "/" },
              { name: "About", href: "/about" },
              { name: "Portfolio", href: "/portfolio" },
              { name: "Pricing", href: "/pricing" },
              { name: "Blog", href: "/blog" },
              { name: "Contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded py-2.5 pl-2 text-sm font-medium text-zinc-900 hover:text-blue-600"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            <div className="my-2 border-t border-zinc-100" />

            {/* Services Accordion */}
            <button
              onClick={() => toggleMobileSection("services")}
              className="flex w-full items-center justify-between rounded py-2.5 pl-2 pr-2 text-sm font-medium text-zinc-900"
            >
              Services
              <Chevron open={mobileSection === "services"} />
            </button>
            {mobileSection === "services" && (
              <div className="pb-2">
                <Link
                  href="/services"
                  className="block rounded py-2 pl-4 text-sm font-medium text-blue-600 hover:bg-blue-50"
                  onClick={() => setMobileOpen(false)}
                >
                  All Services &rarr;
                </Link>

                {/* SEO group */}
                <p className="mt-3 mb-1 pl-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">SEO</p>
                {[
                  { name: "SEO Services", href: "/services/seo" },
                  { name: "SEO Strategy", href: "/services/seo-strategy" },
                  { name: "On-Page SEO", href: "/services/on-page-seo" },
                  { name: "Off-Page SEO", href: "/services/off-page-seo" },
                  { name: "Technical SEO", href: "/services/search-engine-optimization" },
                  { name: "Local SEO", href: "/services/local-seo" },
                  { name: "Google Business Profile", href: "/services/google-business-profile" },
                  { name: "Content Marketing", href: "/services/content-marketing" },
                ].map((svc) => (
                  <Link key={svc.href} href={svc.href} className="block rounded py-2 pl-8 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => setMobileOpen(false)}>
                    {svc.name}
                  </Link>
                ))}

                {/* AI group */}
                <p className="mt-3 mb-1 pl-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">AI</p>
                {[
                  { name: "AI Search Optimization", href: "/services/ai-search-optimization" },
                  { name: "AI Agent Development", href: "/services/ai-agent-development" },
                  { name: "AI Content Generation", href: "/services/ai-content-generation" },
                ].map((svc) => (
                  <Link key={svc.href} href={svc.href} className="block rounded py-2 pl-8 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => setMobileOpen(false)}>
                    {svc.name}
                  </Link>
                ))}

                {/* Marketing group */}
                <p className="mt-3 mb-1 pl-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Marketing</p>
                {[
                  { name: "Marketing Consulting", href: "/services/marketing-consulting" },
                  { name: "Marketing Manager", href: "/services/marketing-manager" },
                  { name: "Analytics & Reporting", href: "/services/analytics-reporting" },
                ].map((svc) => (
                  <Link key={svc.href} href={svc.href} className="block rounded py-2 pl-8 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => setMobileOpen(false)}>
                    {svc.name}
                  </Link>
                ))}

                {/* Design & Build group */}
                <p className="mt-3 mb-1 pl-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Design &amp; Build</p>
                {[
                  { name: "Web Design & Development", href: "/services/web-design-development" },
                  { name: "Branding", href: "/services/branding" },
                  { name: "Automation", href: "/services/automation" },
                ].map((svc) => (
                  <Link key={svc.href} href={svc.href} className="block rounded py-2 pl-8 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => setMobileOpen(false)}>
                    {svc.name}
                  </Link>
                ))}

                {/* CRM */}
                <p className="mt-3 mb-1 pl-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">CRM</p>
                <Link href="/services/fullloopcrm" className="block rounded py-2 pl-8 text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                  Full Loop CRM &rarr;
                </Link>
              </div>
            )}

            {/* Businesses Accordion */}
            <button
              onClick={() => toggleMobileSection("businesses")}
              className="flex w-full items-center justify-between rounded py-2.5 pl-2 pr-2 text-sm font-medium text-zinc-900"
            >
              Businesses
              <Chevron open={mobileSection === "businesses"} />
            </button>
            {mobileSection === "businesses" && (
              <div className="pb-2">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/businesses/${cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                    className="block rounded py-2 pl-8 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    {cat}
                  </Link>
                ))}
                <Link href="/businesses" className="block rounded py-2 pl-8 text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                  All {categories.length} Categories &rarr;
                </Link>
                <Link href="/industries" className="block rounded py-2 pl-8 text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                  All 172 Industries &rarr;
                </Link>
              </div>
            )}

            {/* Locations Accordion */}
            <button
              onClick={() => toggleMobileSection("locations")}
              className="flex w-full items-center justify-between rounded py-2.5 pl-2 pr-2 text-sm font-medium text-zinc-900"
            >
              Locations
              <Chevron open={mobileSection === "locations"} />
            </button>
            {mobileSection === "locations" && (
              <div className="pb-2">
                {regions.map((region) => (
                  <Link
                    key={region}
                    href={`/areas#${region.toLowerCase().replace(/\s+/g, "-")}`}
                    className="flex items-center justify-between rounded py-2 pl-8 pr-4 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    {region}
                    <span className="text-xs text-zinc-400">{regionCounts[region] || 0}</span>
                  </Link>
                ))}
                <Link href="/areas" className="block rounded py-2 pl-8 text-sm font-medium text-blue-600 hover:bg-blue-50" onClick={() => setMobileOpen(false)}>
                  All Areas &rarr;
                </Link>
              </div>
            )}

            <div className="my-2 border-t border-zinc-100" />

            {/* CTA buttons */}
            <Link
              href="/partnership-request-form"
              className="mt-1 block w-full rounded-lg bg-[#0080FE] py-3 text-center text-sm font-semibold text-white hover:bg-[#0070E0]"
              onClick={() => setMobileOpen(false)}
            >
              Get Better Leads
            </Link>
            <a
              href={`tel:${phonePlain}`}
              className="mt-2 block w-full text-center text-sm font-medium text-[#0080FE]"
            >
              or call {phone}
            </a>
          </div>
        </div>
      )}
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
