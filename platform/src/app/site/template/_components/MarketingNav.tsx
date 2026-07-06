'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'

const serviceLinks = [
  { name: 'Deep Cleaning', href: '/services/deep-cleaning-service-in-nyc' },
  { name: 'Regular Apartment Cleaning', href: '/services/apartment-cleaning-service-in-nyc' },
  { name: 'Weekly Service', href: '/services/weekly-maid-service-in-nyc' },
  { name: 'Bi-Weekly Cleaning', href: '/services/bi-weekly-cleaning-service-in-nyc' },
  { name: 'Move-In/Move-Out', href: '/services/move-in-move-out-cleaning-service-in-nyc' },
  { name: 'Post-Construction', href: '/services/post-construction-cleanup-service-in-nyc' },
  { name: 'Airbnb Cleaning', href: '/services/airbnb-cleaning-in-nyc' },
  { name: 'Same-Day Cleaning', href: '/services/same-day-cleaning-service-in-nyc' },
  { name: 'All Services', href: '/nyc-maid-service-services-offered-by-the-nyc-maid' },
]

const moreLinks = [
  { name: 'About', href: '/about-the-nyc-maid-service-company' },
  { name: 'FAQ', href: '/nyc-cleaning-service-frequently-asked-questions-in-2025' },
  { name: 'Careers — Cleaning Jobs', href: '/available-nyc-maid-jobs' },
  { name: 'Careers — Operations Admin', href: '/careers/operations-coordinator' },
  { name: 'Locations', href: '/service-areas-served-by-the-nyc-maid' },
  { name: 'Referral Program', href: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
]

export default function MarketingNav({ config }: { config: SiteConfig }) {
  // Cleaning-specific nav (services dropdown, area strip, pricing) links to
  // pages that are gated for non-cleaning tenants — hide them to avoid dead nav.
  const profile = industryProfile(config.industry)
  const isCleaning = profile.isCleaning
  const isVa = profile.isVirtualAssistant
  // Primary CTA label is industry-aware: the "$10 OFF self booking" promo is
  // cleaning-specific and must not show on other trades.
  const primaryCta = isCleaning ? 'Self Booking $10 OFF' : isVa ? 'Get an Assistant' : 'Get Started'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const closeMenu = () => setMobileOpen(false)

  return (
    <>
      <header className="bg-white sticky top-0 z-50 shadow-sm">
        {/* Top bar */}
        <div className="bg-[var(--brand)] text-gray-300 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center lg:justify-between h-9">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] tracking-widest uppercase">
              {isCleaning && (<>
              <span className="text-white/80 font-semibold hidden sm:inline">Maid Service:</span>
              <Link href="/service-areas-served-by-the-nyc-maid" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">NYC</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/long-island-maid-service" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">L.I.</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/westchester-maid-service" className="hover:text-white transition-colors font-semibold text-white/80 hidden md:inline">Westchester</Link>
              <span className="text-white/20 hidden md:inline">|</span>
              <Link href="/new-jersey-maid-service" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">NJ</Link>
              <span className="text-white/20 hidden sm:inline">-</span>
              <span className="text-white/80 font-semibold hidden sm:inline">Open 24/7</span>
              <span className="text-white/20 hidden sm:inline">·</span></>)}
              <a href={`sms:${config.contact.phoneDigits}`} className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>Sales: {config.contact.phone}</span>
              </a>
              <a href={`sms:${config.contact.supportPhoneDigits}`} className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>Support: {config.contact.supportPhone}</span>
              </a>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              {isCleaning && (<>
              <a href="https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Pay Now</a>
              <span className="text-white/30">|</span></>)}
              <a href="/book" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Client Login</a>
              <span className="text-white/30">|</span>
              <a href="/referral" className="text-[var(--accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Referrer Login</a>
              <span className="text-white/30">|</span>
              <a href="/team" className="text-[var(--accent)] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Team Login</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link href="/" className="flex-shrink-0">
              <Image src={config.identity.logo ?? '/logo.png'} alt={config.identity.name} width={160} height={48} className="h-10 sm:h-12 w-auto" priority />
            </Link>

            <nav className="hidden lg:flex items-center justify-center flex-1 gap-8 mx-8">
              <Link href="/" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Home</Link>

              {isVa && (
              <Link href="/virtual-assistant-services" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Services</Link>
              )}

              {/* Services Dropdown */}
              {isCleaning && (
              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  Services
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-72">
                    {serviceLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[rgb(var(--accent-rgb)/0.2)] hover:text-[var(--brand)] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {isCleaning && (
              <Link href="/updated-nyc-maid-service-industry-pricing" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Pricing</Link>
              )}
              <Link href="/reviews" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide flex items-center gap-1.5">
                Reviews
                <span className="text-yellow-400 text-xs">&#9733; 5.0</span>
              </Link>
              <Link href="/contact-the-nyc-maid-service-today" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Contact</Link>

              {/* More Dropdown */}
              {isCleaning && (
              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  More
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-60">
                    {moreLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[rgb(var(--accent-rgb)/0.2)] hover:text-[var(--brand)] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              <a href={`sms:${config.contact.phoneDigits}`} className="inline-block bg-[var(--brand)] text-white px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors whitespace-nowrap">
                Text {config.contact.phone}
              </a>
              <Link href="/book/new" className="inline-block bg-[var(--accent)] text-[var(--brand)] px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap">
                {primaryCta}
              </Link>
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              <a href={`sms:${config.contact.phoneDigits}`} className="bg-[var(--brand)] text-white px-3 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                Text
              </a>
              <Link href="/book/new" className="bg-[var(--accent)] text-[var(--brand)] px-3 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                {primaryCta}
              </Link>
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation menu" aria-expanded={mobileOpen} className="p-2 text-[var(--brand)]">
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
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />

        {/* Panel — slides from left */}
        <div className={`absolute top-0 left-0 h-full w-[85%] max-w-sm bg-[var(--brand)] transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* White header with logo + close */}
          <div className="bg-white flex items-center justify-between px-5 py-4">
            <Link href="/" onClick={closeMenu}>
              <Image src={config.identity.logo ?? '/logo.png'} alt={config.identity.name} width={140} height={42} className="h-9 w-auto" />
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
              <Link href="/" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Home</Link>

              {isVa && (
              <Link href="/virtual-assistant-services" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Services</Link>
              )}

              {isCleaning && (<>
              <button onClick={() => setServicesOpen(!servicesOpen)} aria-expanded={servicesOpen} className="w-full flex items-center justify-between py-3 text-white font-medium text-lg">
                Services
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {servicesOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {serviceLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[var(--accent)] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              <Link href="/updated-nyc-maid-service-industry-pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Pricing</Link>
              </>)}
              <Link href="/reviews" onClick={closeMenu} className="flex items-center gap-2 py-3 text-white font-medium text-lg">
                Reviews <span className="text-yellow-400 text-sm">&#9733; 5.0</span>
              </Link>
              <Link href="/contact-the-nyc-maid-service-today" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Contact</Link>

              {isCleaning && (<>
              <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className="w-full flex items-center justify-between py-3 text-white font-medium text-lg">
                More
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {moreOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {moreLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[var(--accent)] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}
              </>)}

              <div className="border-t border-white/10 mt-4 pt-4 space-y-1">
                <Link href="/book" onClick={closeMenu} className="block py-3 text-[var(--accent)] font-medium">Client Login</Link>
                {isCleaning && <a href="https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03" target="_blank" rel="noopener noreferrer" onClick={closeMenu} className="block py-3 text-[var(--accent)] font-medium">Pay Now</a>}
                {isCleaning && <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" onClick={closeMenu} className="block py-3 text-[var(--accent)] font-medium">Referral Program</Link>}
              </div>

              <div className="border-t border-white/10 mt-4 pt-6 space-y-3 text-center">
                <Link href="/book/new" onClick={closeMenu} className="block bg-[var(--accent)] text-[var(--brand)] py-3 rounded-lg font-bold text-sm tracking-widest uppercase">{primaryCta}</Link>
                <a href={`sms:${config.contact.phoneDigits}`} className="block bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase border border-white/20">Text {config.contact.phone}</a>
                {config.contact.supportPhone && (
                  <a href={`sms:${config.contact.supportPhoneDigits}`} className="block bg-white/10 text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase">Text Support: {config.contact.supportPhone}</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
