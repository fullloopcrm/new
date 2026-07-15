'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const serviceLinks = [
  { name: 'Deep Cleaning', href: '/services/nyc-deep-cleaning-service' },
  { name: 'Apartment Cleaning', href: '/services/nyc-apartment-cleaning-service' },
  { name: 'House Cleaning', href: '/services/nyc-house-cleaning-service' },
  { name: 'Weekly / Bi-Weekly Service', href: '/services/nyc-maid-service' },
  { name: 'Move-In/Move-Out', href: '/services/nyc-moving-cleaning-service' },
  { name: 'Same-Day Cleaning', href: '/services/nyc-same-day-cleaning-service' },
  { name: 'Office Cleaning', href: '/services/nyc-office-cleaning-service' },
  { name: 'All Services', href: '/nyc-cleaning-services-offered' },
]

const moreLinks = [
  { name: 'About', href: '/about-nyc-cleaning-service-sunnyside-clean-nyc' },
  { name: 'FAQ', href: '/frequently-asked-cleaning-service-related-questions' },
  { name: 'Cleaning Tips', href: '/cleaning-tips-and-tricks' },
  { name: 'Service Areas', href: '/service-areas' },
  { name: 'Referral Program', href: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
]

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const closeMenu = () => setMobileOpen(false)

  return (
    <>
      <header className="bg-white sticky top-0 z-50 shadow-sm">
        {/* Top bar */}
        <div className="bg-[#1E2A4A] text-gray-300 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center lg:justify-between h-9">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] tracking-widest uppercase">
              <span className="text-white/80 font-semibold hidden sm:inline">Cleaning Service:</span>
              <Link href="/service-areas/manhattan-cleaning-services" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Manhattan</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/service-areas/brooklyn-cleaning-services" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Brooklyn</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/service-areas/queens-cleaning-services" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Queens</Link>
              <span className="text-white/20 hidden sm:inline">-</span>
              <span className="text-white/80 font-semibold hidden sm:inline">Open 24/7</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <a href="sms:2122028400" className="inline-flex items-center gap-1 text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>Sales &amp; Customer Service: (212) 202-8400</span>
              </a>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <a href="/book" target="_blank" rel="noopener noreferrer" className="text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Client Login</a>
              <span className="text-white/30">|</span>
              <a href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" className="text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Referrer Login</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link href="/" className="flex-shrink-0 leading-tight">
              <span className="block font-[family-name:var(--font-bebas)] text-2xl sm:text-3xl text-[#1E2A4A] tracking-wide">Sunnyside Clean NYC</span>
              <span className="block text-[9px] sm:text-[10px] font-semibold text-gray-400 tracking-[0.15em] uppercase">A NYC Maid Service Co.</span>
            </Link>

            <nav className="hidden lg:flex items-center justify-center flex-1 gap-8 mx-8">
              <Link href="/" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide">Home</Link>

              {/* Services Dropdown */}
              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  Services
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-72">
                    {serviceLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[#A8F0DC]/20 hover:text-[#1E2A4A] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link href="/nyc-cleaning-service-pricing" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide">Pricing</Link>
              <Link href="/#reviews" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide flex items-center gap-1.5">
                Reviews
                <span className="text-yellow-400 text-xs">&#9733; 5.0</span>
              </Link>
              <Link href="/contact-nyc-cleaning-service-sunnyside-clean-nyc" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide">Contact</Link>

              {/* More Dropdown */}
              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  More
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-60">
                    {moreLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[#A8F0DC]/20 hover:text-[#1E2A4A] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            <div className="hidden lg:flex items-center gap-2">
              <a href="sms:2122028400" className="inline-block bg-[#1E2A4A] text-white px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors whitespace-nowrap">
                Text 212.202.8400
              </a>
              <Link href="/book/new" className="inline-block bg-[#A8F0DC] text-[#1E2A4A] px-5 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors whitespace-nowrap">
                Self Booking $10 OFF
              </Link>
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center gap-2">
              <a href="sms:2122028400" className="bg-[#1E2A4A] text-white px-3 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                Text
              </a>
              <Link href="/book/new" className="bg-[#A8F0DC] text-[#1E2A4A] px-3 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                Self Booking $10 OFF
              </Link>
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation menu" aria-expanded={mobileOpen} className="p-2 text-[#1E2A4A]">
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

        <div className={`absolute top-0 left-0 h-full w-[85%] max-w-sm bg-[#1E2A4A] transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="bg-white flex items-center justify-between px-5 py-4">
            <Link href="/" onClick={closeMenu} className="leading-tight">
              <span className="block font-[family-name:var(--font-bebas)] text-xl text-[#1E2A4A] tracking-wide">Sunnyside Clean NYC</span>
              <span className="block text-[8px] font-semibold text-gray-400 tracking-[0.15em] uppercase">A NYC Maid Service Co.</span>
            </Link>
            <button onClick={closeMenu} aria-label="Close navigation menu" className="p-2 text-[#1E2A4A]">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto h-[calc(100%-72px)] px-5 py-6">
            <div className="space-y-1">
              <Link href="/" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Home</Link>

              <button onClick={() => setServicesOpen(!servicesOpen)} aria-expanded={servicesOpen} className="w-full flex items-center justify-between py-3 text-white font-medium text-lg">
                Services
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {servicesOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {serviceLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[#A8F0DC] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              <Link href="/nyc-cleaning-service-pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Pricing</Link>
              <Link href="/#reviews" onClick={closeMenu} className="flex items-center gap-2 py-3 text-white font-medium text-lg">
                Reviews <span className="text-yellow-400 text-sm">&#9733; 5.0</span>
              </Link>
              <Link href="/contact-nyc-cleaning-service-sunnyside-clean-nyc" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Contact</Link>

              <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className="w-full flex items-center justify-between py-3 text-white font-medium text-lg">
                More
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {moreOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {moreLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[#A8F0DC] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 mt-4 pt-4 space-y-1">
                <a href="/book" onClick={closeMenu} className="block py-3 text-[#A8F0DC] font-medium">Client Login</a>
                <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" onClick={closeMenu} className="block py-3 text-[#A8F0DC] font-medium">Referral Program</Link>
              </div>

              <div className="border-t border-white/10 mt-4 pt-6 space-y-3 text-center">
                <Link href="/book/new" onClick={closeMenu} className="block bg-[#A8F0DC] text-[#1E2A4A] py-3 rounded-lg font-bold text-sm tracking-widest uppercase">Self Booking $10 OFF</Link>
                <a href="sms:2122028400" className="block bg-[#1E2A4A] text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase border border-white/20">Text 212.202.8400</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
