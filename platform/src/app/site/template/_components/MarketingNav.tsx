'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { industryProfile } from '@/app/site/template/_lib/seo/industry'
import { slugifyService } from '@/app/site/template/_lib/seo/photography-services'
import CartWidget from '@/app/site/template/_components/CartWidget'

const serviceLinks = [
  { name: 'Deep Cleaning', href: '/services/deep-cleaning-service-in-nyc' },
  { name: 'Regular Apartment Cleaning', href: '/services/apartment-cleaning-service-in-nyc' },
  { name: 'Weekly Service', href: '/services/weekly-maid-service-in-nyc' },
  { name: 'Bi-Weekly Cleaning', href: '/services/bi-weekly-cleaning-service-in-nyc' },
  { name: 'Move-In/Move-Out', href: '/services/move-in-move-out-cleaning-service-in-nyc' },
  { name: 'Post-Construction', href: '/services/post-construction-cleanup-service-in-nyc' },
  { name: 'Airbnb Cleaning', href: '/services/airbnb-cleaning-in-nyc' },
  { name: 'Same-Day Cleaning', href: '/services/same-day-cleaning-service-in-nyc' },
  { name: 'All Services', href: '/services' },
]

const moreLinks = [
  { name: 'About', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Careers — Cleaning Jobs', href: '/careers' },
  { name: 'Careers — Operations Admin', href: '/careers/operations-coordinator' },
  { name: 'Locations', href: '/service-areas' },
  { name: 'Referral Program', href: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
  { name: 'Shop', href: '/shop' },
]

// Generic (non-cleaning, non-VA) tenants use the config-driven long-form routes
// (/about, /services, /pricing, /faq, /blog, /contact, /careers,
// /referral-program) instead of the NYC-Maid cleaning slugs. Cleaning tenants
// keep their live SEO nav above; this is additive.
const genericMoreLinks = [
  { name: 'About', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
  { name: 'Careers', href: '/careers' },
  { name: 'Referral Program', href: '/referral-program' },
]

export default function MarketingNav({ config }: { config: SiteConfig }) {
  // Cleaning-specific nav (services dropdown, area strip, pricing) links to
  // pages that are gated to the real nycmaid tenant only (see
  // _lib/gate.ts requireNycmaidTenant — those pages hardcode nycmaid's own
  // real neighborhood/pricing content). isCleaning alone is NOT enough here:
  // a different cleaning tenant would show this nav and then 404 on every
  // link. Only the real nycmaid tenant gets this nav; every other cleaning
  // tenant falls through to the generic, config-driven nav below.
  const profile = industryProfile(config.industry)
  const isNycmaid = config.identity.url.includes('thenycmaid.com')
  const isCleaning = profile.isCleaning && isNycmaid
  const isVa = profile.isVirtualAssistant
  // Trade-agnostic tenants: full generic menu pointing at the config-driven
  // long-form routes. Also covers non-nycmaid cleaning tenants (see above).
  const generic = !isCleaning && !isVa
  // Projects nav link (Phase 2C) — only for project/lead trades (remodeling,
  // roofing, painting, etc.), derived live from industryProfile() rather than
  // a new stored SiteConfig field (same PROJECT_LEAD_INDUSTRIES source
  // defaultFunnelMode() already uses). The /projects route + table exist for
  // EVERY tenant regardless — this only controls whether the link is shown.
  const genericLinks = profile.isProjectLed ? [...genericMoreLinks, { name: 'Projects', href: '/projects' }] : genericMoreLinks
  const cleaningMoreLinks = moreLinks.filter((l) => l.name !== 'Shop' || config.storefrontEnabled)
  // Book Now -> the self-book flow (book/new redirects internally to the
  // right form per industry: cleaning hourly form, remote plan intake for VA,
  // or the neutral standard form). Start a Project -> the generic lead-capture
  // form at /collect, which posts to /api/contact (public in middleware) and
  // lands the deal on the Sales pipeline at the Lead stage.
  const bookHref = '/book/new'
  const startProjectHref = '/collect'
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
              <Link href="/service-areas" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">NYC</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/long-island-maid-service" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">L.I.</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/westchester-maid-service" className="hover:text-white transition-colors font-semibold text-white/80 hidden md:inline">Westchester</Link>
              <span className="text-white/20 hidden md:inline">|</span>
              <Link href="/new-jersey-maid-service" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">NJ</Link>
              <span className="text-white/20 hidden sm:inline">-</span>
              <span className="text-white/80 font-semibold hidden sm:inline">Open 24/7</span>
              <span className="text-white/20 hidden sm:inline">·</span></>)}
              <a href={`sms:${config.contact.phoneDigits}`} className="inline-flex items-center gap-1 text-white/80 font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>Sales: {config.contact.phone}</span>
              </a>
              <a href={`sms:${config.contact.supportPhoneDigits}`} className="inline-flex items-center gap-1 text-white/80 font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>Support: {config.contact.supportPhone}</span>
              </a>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <a href="/book/new" target="_blank" rel="noopener noreferrer" className="text-white/80 font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Client Login</a>
              <span className="text-white/30">|</span>
              <a href="/referral" className="text-white/80 font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Referrer Login</a>
              <span className="text-white/30">|</span>
              <a href="/team" className="text-white/80 font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Team Login</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link
              href="/"
              className={config.identity.logo ? 'flex-shrink-0' : 'min-w-0 shrink'}
            >
              {config.identity.logo ? (
                <Image src={config.identity.logo} alt={config.identity.name} width={160} height={48} className="h-10 sm:h-12 w-auto" priority />
              ) : (
                <span
                  className={profile.isPhotography ? 'block truncate font-[family-name:var(--font-righteous)] text-xl sm:text-2xl text-[var(--brand)]' : 'block truncate text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--brand)]'}
                  style={profile.isPhotography ? { letterSpacing: '-0.015em' } : undefined}
                >
                  {config.identity.name}
                </span>
              )}
            </Link>

            <nav className={profile.isPhotography ? 'hidden' : 'hidden xl:flex items-center justify-center flex-1 gap-8 mx-8'}>
              <Link href="/" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Home</Link>

              {config.storefrontEnabled && (
              <Link href="/shop" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Store</Link>
              )}

              {isVa && (
              <Link href="/virtual-assistant-services" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Services</Link>
              )}

              {generic && (<>
              <Link href="/services" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Services</Link>
              <Link href="/pricing" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Pricing</Link>
              </>)}

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
              <Link href="/pricing" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Pricing</Link>
              )}
              <Link href="/reviews" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide flex items-center gap-1.5">
                Reviews
                {config.reviewCount && <span className="text-yellow-400 text-xs">&#9733; {config.rating.toFixed(1)}</span>}
              </Link>
              {!generic && (
              <Link href="/contact" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide">Contact</Link>
              )}

              {/* More Dropdown */}
              {isCleaning && (
              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  More
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-60">
                    {cleaningMoreLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[rgb(var(--accent-rgb)/0.2)] hover:text-[var(--brand)] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              )}

              {/* Generic More Dropdown */}
              {generic && (
              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[var(--brand)] hover:text-[rgb(var(--brand-rgb)/0.7)] font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  More
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-60">
                    {genericLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[rgb(var(--accent-rgb)/0.2)] hover:text-[var(--brand)] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </nav>

            <div className={profile.isPhotography ? "hidden" : "hidden xl:flex items-center gap-2"}>
              <a href={`sms:${config.contact.phoneDigits}`} className="inline-block bg-[var(--brand)] text-white px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors whitespace-nowrap">
                Text {config.contact.phone}
              </a>
              <Link href={startProjectHref} className="inline-block border-2 border-[var(--brand)] text-[var(--brand)] px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[var(--brand)] hover:text-white transition-colors whitespace-nowrap">
                Start a Project
              </Link>
              {!profile.isPhotography && (
                <Link href={bookHref} className="inline-block bg-[var(--accent)] text-[var(--accent-fg)] px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap">
                  Book Now
                </Link>
              )}
              {config.storefrontEnabled && <CartWidget />}
            </div>

            {/* Mobile hamburger */}
            <div className={profile.isPhotography ? "flex items-center gap-2" : "xl:hidden flex items-center gap-2"}>
              {profile.isPhotography ? (
                <>
                  <a href={`sms:${config.contact.phoneDigits}`} className="border border-[var(--brand)] text-[var(--brand)] px-3 py-2 font-bold text-xs tracking-widest uppercase whitespace-nowrap">
                    Text {config.contact.phone}
                  </a>
                  <Link href={bookHref} className="border border-[var(--accent)] text-[var(--accent)] px-3 py-2 font-bold text-xs tracking-widest uppercase whitespace-nowrap">
                    Book Now, Save 20
                  </Link>
                </>
              ) : (
                <>
                  <a href={`sms:${config.contact.phoneDigits}`} className="bg-[var(--brand)] text-white px-3 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                    Text
                  </a>
                  <Link href={bookHref} className="bg-[var(--accent)] text-[var(--accent-fg)] px-3 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                    Book Now
                  </Link>
                </>
              )}
              {config.storefrontEnabled && <CartWidget />}
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation menu" aria-expanded={mobileOpen} className="p-2 text-[var(--brand)]">
                {profile.isPhotography ? (
                  <>
                    <style dangerouslySetInnerHTML={{ __html: '@keyframes menuWiggle{0%,85%,100%{transform:rotate(0deg)}88%{transform:rotate(-12deg)}91%{transform:rotate(10deg)}94%{transform:rotate(-6deg)}97%{transform:rotate(4deg)}}.menu-wiggle{animation:menuWiggle 3.5s ease-in-out infinite}' }} />
                    <svg aria-hidden="true" className={`w-7 h-7 transition-transform duration-200 ${mobileOpen ? 'rotate-45' : 'menu-wiggle'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
                    </svg>
                  </>
                ) : (
                  <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Menu — the photography hamburger button stays visible
          at every width (see the `flex` vs `xl:hidden` split above), so its
          panel must not be forced hidden at lg+ either, or the button opens
          nothing on desktop-width viewports. */}
      <div className={`fixed inset-0 z-[100] ${profile.isPhotography ? '' : 'lg:hidden'} transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />

        {/* Panel — slides from left */}
        <div className={`absolute top-0 left-0 h-full w-[85%] max-w-sm bg-[var(--brand)] transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Header with logo + close. Photography gets a black backdrop with
              the wordmark in a small rotated Polaroid card — echoing the
              hero's big Polaroid photo instead of sitting on a flat
              corporate white bar. Every other tenant keeps the plain white
              header unchanged. */}
          <div className={profile.isPhotography ? 'bg-[var(--brand)] flex items-center justify-between px-5 pt-5 pb-4' : 'bg-white flex items-center justify-between px-5 py-4'}>
            <Link href="/" onClick={closeMenu}>
              {config.identity.logo ? (
                <Image src={config.identity.logo} alt={config.identity.name} width={140} height={42} className="h-9 w-auto" />
              ) : profile.isPhotography ? (
                <div className="inline-block bg-white px-3 pt-2 pb-4 shadow-[6px_6px_0_0_var(--accent)] rotate-[-2deg]">
                  <span className="font-[family-name:var(--font-righteous)] text-base text-[var(--brand)]" style={{ letterSpacing: '-0.015em' }}>
                    {config.identity.name}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-extrabold tracking-tight text-[var(--brand)]">
                  {config.identity.name}
                </span>
              )}
            </Link>
            <button onClick={closeMenu} aria-label="Close navigation menu" className={profile.isPhotography ? 'p-2 text-white' : 'p-2 text-[var(--brand)]'}>
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Film-strip sprocket edge — the same divider the homepage uses
              between every section, carried into the menu for continuity. */}
          {profile.isPhotography && (
            <div
              aria-hidden="true"
              className="h-3 w-full flex-shrink-0"
              style={{
                backgroundColor: 'var(--brand)',
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 2.5px, transparent 2.6px)',
                backgroundSize: '20px 100%',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* Nav links */}
          <div className={profile.isPhotography ? 'overflow-y-auto h-[calc(100%-84px)] px-5 py-6' : 'overflow-y-auto h-[calc(100%-72px)] px-5 py-6'}>
            {profile.isPhotography && (
              <span
                className="inline-flex items-center gap-2 font-bold text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 mb-5"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Navigate
              </span>
            )}
            <div className={profile.isPhotography ? 'space-y-0.5' : 'space-y-1'}>
              <Link href="/" onClick={closeMenu} className={profile.isPhotography ? 'block py-3.5 border-b border-white/10 text-white font-[family-name:var(--font-bebas)] text-2xl hover:text-[var(--accent)] transition-colors' : 'block py-3 text-white font-medium text-lg'}>Home</Link>

              {config.storefrontEnabled && (
              <Link href="/shop" onClick={closeMenu} className={profile.isPhotography ? 'block py-3.5 border-b border-white/10 text-white font-[family-name:var(--font-bebas)] text-2xl hover:text-[var(--accent)] transition-colors' : 'block py-3 text-white font-medium text-lg'}>Store</Link>
              )}

              {isVa && (
              <Link href="/virtual-assistant-services" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Services</Link>
              )}

              {generic && profile.isPhotography && (<>
              <button onClick={() => setServicesOpen(!servicesOpen)} aria-expanded={servicesOpen} className="w-full flex items-center justify-between py-3.5 border-b border-white/10 text-white font-[family-name:var(--font-bebas)] text-2xl">
                Services
                <svg aria-hidden="true" className={`w-5 h-5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {servicesOpen && (
                <div className="pl-4 pb-3 space-y-1 border-b border-white/10">
                  {config.services.filter((s) => !s.emergency).map((s) => (
                    <Link key={s.value} href={`/services/${slugifyService(s.value)}`} onClick={closeMenu} className="block py-2 text-sm text-white/60 tracking-wide hover:text-[var(--accent)] transition-colors">
                      {s.value}
                    </Link>
                  ))}
                </div>
              )}
              </>)}
              {generic && !profile.isPhotography && (<>
              <Link href="/services" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Services</Link>
              <Link href="/pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Pricing</Link>
              </>)}

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

              <Link href="/pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Pricing</Link>
              </>)}
              <Link href="/reviews" onClick={closeMenu} className={profile.isPhotography ? 'flex items-center gap-2 py-3.5 border-b border-white/10 text-white font-[family-name:var(--font-bebas)] text-2xl hover:text-[var(--accent)] transition-colors' : 'flex items-center gap-2 py-3 text-white font-medium text-lg'}>
                Reviews {config.reviewCount && <span className="text-yellow-400 text-sm">&#9733; {config.rating.toFixed(1)}</span>}
              </Link>
              {!generic && (
              <Link href="/contact" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Contact</Link>
              )}

              {isCleaning && (<>
              <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className="w-full flex items-center justify-between py-3 text-white font-medium text-lg">
                More
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {moreOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {cleaningMoreLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[var(--accent)] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}
              </>)}

              {generic && (<>
              <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className={profile.isPhotography ? 'w-full flex items-center justify-between py-3.5 border-b border-white/10 text-white font-[family-name:var(--font-bebas)] text-2xl' : 'w-full flex items-center justify-between py-3 text-white font-medium text-lg'}>
                More
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {moreOpen && (
                <div className={profile.isPhotography ? 'pl-4 pb-3 space-y-1 border-b border-white/10' : 'pl-4 pb-2 space-y-1'}>
                  {genericLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className={profile.isPhotography ? 'block py-2 text-sm text-white/60 tracking-wide uppercase hover:text-[var(--accent)] transition-colors' : 'block py-2 text-sm text-white/60 hover:text-[var(--accent)] transition-colors'}>
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}
              </>)}

              <div className={profile.isPhotography ? 'mt-5 space-y-1' : 'border-t border-white/10 mt-4 pt-4 space-y-1'}>
                <Link href="/book/new" onClick={closeMenu} className={profile.isPhotography ? 'block py-2 text-white/70 font-bold text-[11px] tracking-widest uppercase hover:text-[var(--accent)] transition-colors' : 'block py-3 text-[var(--accent)] font-medium'}>Client Login</Link>
                {isCleaning && <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" onClick={closeMenu} className="block py-3 text-[var(--accent)] font-medium">Referral Program</Link>}
              </div>

              <div className={profile.isPhotography ? 'border-t border-white/10 mt-4 pt-6 space-y-3 text-center' : 'border-t border-white/10 mt-4 pt-6 space-y-3 text-center'}>
                <Link href={bookHref} onClick={closeMenu} className={profile.isPhotography ? 'block bg-[var(--accent)] text-[var(--accent-fg)] py-4 font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all' : 'block bg-[var(--accent)] text-[var(--accent-fg)] py-3 rounded-lg font-bold text-sm tracking-widest uppercase'}>Book Now{profile.isPhotography ? ', Save 20' : ''}</Link>
                <Link href={startProjectHref} onClick={closeMenu} className={profile.isPhotography ? 'block border border-white/40 text-white py-4 font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-colors' : 'block bg-white/10 border border-white/30 text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase'}>Start a Project</Link>
                <a href={`sms:${config.contact.phoneDigits}`} className={profile.isPhotography ? 'block border border-white/40 text-white py-4 font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-colors' : 'block bg-[var(--brand)] text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase border border-white/20'}>Text {config.contact.phone}</a>
                {config.contact.supportPhone && (
                  <a href={`sms:${config.contact.supportPhoneDigits}`} className={profile.isPhotography ? 'block border border-white/40 text-white py-4 font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-colors' : 'block bg-white/10 text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase'}>Text Support: {config.contact.supportPhone}</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
