'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

interface ServiceType {
  id: string
  name: string
  slug: string
}

interface SiteNavProps {
  businessName: string
  logoUrl?: string | null
  phone?: string
  industry?: string
  areas?: string[]
  services?: ServiceType[]
  brandColor: string
  accentColor: string
}

function toSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function SiteNav({
  businessName,
  logoUrl,
  phone,
  industry,
  areas = [],
  services = [],
  brandColor,
  accentColor,
}: SiteNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const closeMenu = () => setMobileOpen(false)

  const phoneDigits = phone?.replace(/[^+\d]/g, '') || ''

  const moreLinks = [
    { name: 'About', href: '/about' },
    { name: 'Reviews', href: '/reviews' },
    { name: 'Careers', href: '/careers' },
    { name: 'Areas We Serve', href: '/areas' },
  ]

  return (
    <>
      <header className="bg-white sticky top-0 z-50 shadow-sm">
        {/* Top utility bar */}
        <div className="bg-[var(--brand)] text-gray-300 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden lg:flex items-center justify-between h-9">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] tracking-widest uppercase">
              {industry && (
                <span className="text-white/80 font-semibold">{industry}:</span>
              )}
              {areas.slice(0, 3).map((area, i) => (
                <span key={area} className="contents">
                  {i > 0 && <span className="text-white/20">|</span>}
                  <span className="text-white/80 font-semibold">{area}</span>
                </span>
              ))}
              {areas.length > 0 && <span className="text-white/20">&middot;</span>}
              <span className="text-white/80 font-semibold">Open 24/7</span>
              {phone && (
                <>
                  <span className="text-white/20">&middot;</span>
                  <a
                    href={`tel:${phoneDigits}`}
                    className="inline-flex items-center gap-1 text-[var(--brand-accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors"
                  >
                    <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z" />
                    </svg>
                    <span>{phone}</span>
                  </a>
                  <a
                    href={`sms:${phoneDigits}`}
                    className="inline-flex items-center gap-1 text-[var(--brand-accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors"
                  >
                    <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
                    </svg>
                    <span>{phone}</span>
                  </a>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/portal" className="text-[var(--brand-accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                Client Login
              </Link>
              <span className="text-white/30">|</span>
              <Link href="/team" className="text-[var(--brand-accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                Team Login
              </Link>
            </div>
          </div>
        </div>

        {/* Main navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link href="/" className="flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="h-10 sm:h-12 w-auto" />
              ) : (
                <span className="text-xl font-bold text-[var(--brand)]">{businessName}</span>
              )}
            </Link>

            <nav className="hidden lg:flex items-center justify-center flex-1 gap-8 mx-8">
              <Link href="/" className="text-[var(--brand)] hover:opacity-70 font-medium text-[15px] tracking-wide">
                Home
              </Link>

              {/* Services Dropdown */}
              <div className="relative group">
                <button
                  aria-expanded="false"
                  aria-haspopup="true"
                  className="text-[var(--brand)] hover:opacity-70 font-medium text-[15px] tracking-wide flex items-center gap-1 py-2"
                >
                  Services
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-72">
                    {services.map((svc) => (
                      <Link
                        key={svc.id}
                        href={`/services/${svc.slug || toSlug(svc.name)}`}
                        className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[var(--brand-accent)]/20 hover:text-[var(--brand)] transition-colors"
                      >
                        {svc.name}
                      </Link>
                    ))}
                    <Link
                      href="/services"
                      className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[var(--brand-accent)]/20 hover:text-[var(--brand)] transition-colors font-medium"
                    >
                      All Services
                    </Link>
                  </div>
                </div>
              </div>

              <Link href="/pricing" className="text-[var(--brand)] hover:opacity-70 font-medium text-[15px] tracking-wide">
                Pricing
              </Link>
              <Link href="/contact" className="text-[var(--brand)] hover:opacity-70 font-medium text-[15px] tracking-wide">
                Contact
              </Link>

              {/* More Dropdown */}
              <div className="relative group">
                <button
                  aria-expanded="false"
                  aria-haspopup="true"
                  className="text-[var(--brand)] hover:opacity-70 font-medium text-[15px] tracking-wide flex items-center gap-1 py-2"
                >
                  More
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-60">
                    {moreLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[var(--brand-accent)]/20 hover:text-[var(--brand)] transition-colors"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            <Link
              href="/chat"
              className="hidden lg:inline-block bg-[var(--brand-accent)] text-[var(--brand)] px-6 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[var(--brand-accent-hover)] transition-colors whitespace-nowrap"
            >
              Book Yourself in 30 Sec
            </Link>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center gap-3">
              <Link
                href="/chat"
                className="bg-[var(--brand-accent)] text-[var(--brand)] px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase"
              >
                Book in 30 Sec
              </Link>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
                className="p-2 text-[var(--brand)]"
              >
                <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Menu */}
      <div className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />

        <div className={`absolute top-0 left-0 h-full w-[85%] max-w-sm bg-[var(--brand)] transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* White header with logo/name + close */}
          <div className="bg-white flex items-center justify-between px-5 py-4">
            <Link href="/" onClick={closeMenu}>
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="h-9 w-auto" />
              ) : (
                <span className="text-lg font-bold text-[var(--brand)]">{businessName}</span>
              )}
            </Link>
            <button onClick={closeMenu} aria-label="Close navigation menu" className="p-2 text-[var(--brand)]">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <div className="overflow-y-auto h-[calc(100%-72px)] px-5 py-6">
            <div className="space-y-1">
              <Link href="/" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">
                Home
              </Link>

              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                aria-expanded={servicesOpen}
                className="w-full flex items-center justify-between py-3 text-white font-medium text-lg"
              >
                Services
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {servicesOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {services.map((svc) => (
                    <Link
                      key={svc.id}
                      href={`/services/${svc.slug || toSlug(svc.name)}`}
                      onClick={closeMenu}
                      className="block py-2 text-sm text-white/60 hover:text-[var(--brand-accent)] transition-colors"
                    >
                      {svc.name}
                    </Link>
                  ))}
                  <Link href="/services" onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[var(--brand-accent)] transition-colors font-medium">
                    All Services
                  </Link>
                </div>
              )}

              <Link href="/pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">
                Pricing
              </Link>
              <Link href="/contact" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">
                Contact
              </Link>

              <button
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                className="w-full flex items-center justify-between py-3 text-white font-medium text-lg"
              >
                More
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {moreOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="block py-2 text-sm text-white/60 hover:text-[var(--brand-accent)] transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 mt-4 pt-4 space-y-1">
                <Link href="/portal" onClick={closeMenu} className="block py-3 text-[var(--brand-accent)] font-medium">
                  Client Login
                </Link>
                <Link href="/chat" onClick={closeMenu} className="block py-3 text-[var(--brand-accent)] font-medium">
                  Book Online
                </Link>
                <Link href="/team" onClick={closeMenu} className="block py-3 text-[var(--brand-accent)] font-medium">
                  Team Login
                </Link>
              </div>

              {phone && (
                <div className="border-t border-white/10 mt-4 pt-6 space-y-3 text-center">
                  <a href={`sms:${phoneDigits}`} className="block bg-[var(--brand-accent)] text-[var(--brand)] py-3 rounded-lg font-bold text-sm tracking-widest uppercase">
                    Text {phone}
                  </a>
                  <a href={`tel:${phoneDigits}`} className="block text-white/50 font-medium text-sm">
                    or Call Us
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
