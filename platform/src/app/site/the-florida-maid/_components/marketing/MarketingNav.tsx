'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

const serviceLinks = [
  { name: 'Deep Cleaning', href: '/services/deep-cleaning-service-in-florida' },
  { name: 'House Cleaning', href: '/services/house-cleaning-service-in-florida' },
  { name: 'Weekly Service', href: '/services/weekly-maid-service-in-florida' },
  { name: 'Bi-Weekly Cleaning', href: '/services/bi-weekly-cleaning-service-in-florida' },
  { name: 'Move-In/Move-Out', href: '/services/move-in-move-out-cleaning-service-in-florida' },
  { name: 'Post-Construction', href: '/services/post-construction-cleanup-service-in-florida' },
  { name: 'Airbnb Cleaning', href: '/services/airbnb-cleaning-in-florida' },
  { name: 'Same-Day Cleaning', href: '/services/same-day-cleaning-service-in-florida' },
  { name: 'All Services', href: '/florida-maid-service-services-offered-by-the-florida-maid' },
]

const moreLinks = [
  { name: 'About', href: '/about-the-florida-maid-service-company' },
  { name: 'FAQ', href: '/florida-cleaning-service-frequently-asked-questions-in-2026' },
  { name: 'Careers — Cleaning Jobs', href: '/available-florida-maid-jobs' },
  { name: 'Locations', href: '/service-areas-served-by-the-florida-maid' },
  { name: 'Reviews', href: '/florida-customer-reviews-for-the-florida-maid' },
  { name: 'Referral Program', href: '/get-paid-for-cleaning-referrals-every-time-they-are-serviced' },
]

export default function MarketingNav() {
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
        <div className="bg-[#1E2A4A] text-gray-300 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center lg:justify-between h-9">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] tracking-widest uppercase">
              <span className="text-white/80 font-semibold hidden sm:inline">Florida Maid Service</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <Link href="/service-areas-served-by-the-florida-maid" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Service Areas</Link>
              <span className="text-white/20 hidden sm:inline">-</span>
              <span className="text-white/80 font-semibold hidden sm:inline">Open 24/7</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <a href="tel:9547103636" className="inline-flex items-center gap-1 text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z"/></svg>
                <span>(954) 710-3636</span>
              </a>
              <a href="sms:9547103636" className="inline-flex items-center gap-1 text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>(954) 710-3636</span>
              </a>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <a href="https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03" target="_blank" rel="noopener noreferrer" className="text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Pay Now</a>
              <span className="text-white/30">|</span>
              <a href="/portal/login" target="_blank" rel="noopener noreferrer" className="text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Client Login</a>
              <span className="text-white/30">|</span>
              <a href="/referral" className="text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Referrer Login</a>
              <span className="text-white/30">|</span>
              <a href="/team/login" className="text-[#A8F0DC] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Team Login</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link href="/" className="flex-shrink-0">
              <Image src="/sites/the-florida-maid/logo.png" alt="The Florida Maid" width={160} height={48} className="h-10 sm:h-12 w-auto" priority />
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

              <Link href="/updated-florida-maid-service-industry-pricing" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide">Pricing</Link>
              <Link href="/contact-the-florida-maid-service-today" className="text-[#1E2A4A] hover:text-[#1E2A4A]/70 font-medium text-[15px] tracking-wide">Contact</Link>

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

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/portal/collect" className="bg-[#1E2A4A] text-white px-6 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#2a3a5e] transition-colors whitespace-nowrap">
                Book Now
              </Link>
              <a href="sms:9547103636" className="bg-[#A8F0DC] text-[#1E2A4A] px-6 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors whitespace-nowrap">
                Text (954) 710-3636
              </a>
            </div>

            {/* Mobile hamburger */}
            <div className="lg:hidden flex items-center gap-3">
              <Link href="/portal/collect" className="bg-[#1E2A4A] text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                Book Now
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
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />

        {/* Panel — slides from left */}
        <div className={`absolute top-0 left-0 h-full w-[85%] max-w-sm bg-[#1E2A4A] transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* White header with logo + close */}
          <div className="bg-white flex items-center justify-between px-5 py-4">
            <Link href="/" onClick={closeMenu}>
              <Image src="/sites/the-florida-maid/logo.png" alt="The Florida Maid" width={140} height={42} className="h-9 w-auto" />
            </Link>
            <button onClick={closeMenu} aria-label="Close navigation menu" className="p-2 text-[#1E2A4A]">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
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

              <Link href="/updated-florida-maid-service-industry-pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Pricing</Link>
              <Link href="/contact-the-florida-maid-service-today" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Contact</Link>

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
                <Link href="/portal/login" onClick={closeMenu} className="block py-3 text-[#A8F0DC] font-medium">Client Login</Link>
                <a href="https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03" target="_blank" rel="noopener noreferrer" onClick={closeMenu} className="block py-3 text-[#A8F0DC] font-medium">Pay Now</a>
                <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" onClick={closeMenu} className="block py-3 text-[#A8F0DC] font-medium">Referral Program</Link>
              </div>

              <div className="border-t border-white/10 mt-4 pt-6 space-y-3 text-center">
                <Link href="/portal/collect" onClick={closeMenu} className="block bg-[#A8F0DC] text-[#1E2A4A] py-3 rounded-lg font-bold text-sm tracking-widest uppercase">Book Now</Link>
                <a href="sms:9547103636" className="block text-white/50 font-medium text-sm">or Text (954) 710-3636</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
