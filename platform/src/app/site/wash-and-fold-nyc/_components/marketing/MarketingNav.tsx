'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const serviceLinks = [
  { name: 'Wash & Fold', href: '/services/nyc-wash-and-fold' },
  { name: 'In-Unit Laundry', href: '/services/nyc-in-unit-laundry-service' },
  { name: 'In-Building Laundry', href: '/services/nyc-in-building-laundry-service' },
  { name: 'Pickup & Delivery', href: '/services/nyc-pickup-and-delivery' },
  { name: 'Dry Cleaning', href: '/services/nyc-dry-cleaning' },
  { name: 'Comforter Cleaning', href: '/services/nyc-comforter-cleaning' },
  { name: 'Commercial Laundry', href: '/services/nyc-commercial-laundry' },
  { name: 'All Services', href: '/services' },
]

const moreLinks = [
  { name: 'About', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Careers', href: '/careers' },
  { name: 'Locations', href: '/locations' },
  { name: 'Partners', href: '/partners' },
  { name: 'Reviews', href: '/reviews' },
  { name: 'Contact', href: '/contact' },
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
      <header className="bg-white/90 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        {/* Top bar */}
        <div className="bg-[#1a3a5c] text-gray-300 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center lg:justify-between h-9">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] tracking-widest uppercase">
              <span className="text-white/80 font-semibold hidden sm:inline">Wash & Fold:</span>
              <Link href="/locations" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Manhattan</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/locations" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Brooklyn</Link>
              <span className="text-white/20 hidden sm:inline">|</span>
              <Link href="/locations" className="hover:text-white transition-colors font-semibold text-white/80 hidden sm:inline">Queens</Link>
              <span className="text-white/20 hidden sm:inline">-</span>
              <span className="text-white/80 font-semibold hidden sm:inline">$3/lb</span>
              <span className="text-white/20 hidden sm:inline">&middot;</span>
              <a href="tel:9179706002" className="inline-flex items-center gap-1 text-[#7EC8E3] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.2 2.2z"/></svg>
                <span>(917) 970-6002</span>
              </a>
              <a href="sms:9179706002" className="inline-flex items-center gap-1 text-[#7EC8E3] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">
                <svg aria-hidden="true" className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>
                <span>(917) 970-6002</span>
              </a>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <a href="/book" className="text-[#7EC8E3] font-semibold tracking-widest uppercase text-[10px] hover:text-white transition-colors">Client Login</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">
            <Link href="/" className="flex-shrink-0 font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide">
              Wash<span className="text-[#4BA3D4]">&</span>Fold<span className="text-[#4BA3D4]">NYC</span>
            </Link>

            <nav className="hidden lg:flex items-center justify-center flex-1 gap-8 mx-8">
              <Link href="/" className="text-[#1a3a5c] hover:text-[#4BA3D4] font-medium text-[15px] tracking-wide">Home</Link>

              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[#1a3a5c] hover:text-[#4BA3D4] font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  Services
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-72">
                    {serviceLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[#E8F4FD] hover:text-[#1a3a5c] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <Link href="/pricing" className="text-[#1a3a5c] hover:text-[#4BA3D4] font-medium text-[15px] tracking-wide">Pricing</Link>
              <Link href="/contact" className="text-[#1a3a5c] hover:text-[#4BA3D4] font-medium text-[15px] tracking-wide">Contact</Link>

              <div className="relative group">
                <button aria-expanded="false" aria-haspopup="true" className="text-[#1a3a5c] hover:text-[#4BA3D4] font-medium text-[15px] tracking-wide flex items-center gap-1 py-2">
                  More
                  <svg aria-hidden="true" className="w-3.5 h-3.5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-3 w-60">
                    {moreLinks.map(link => (
                      <Link key={link.href} href={link.href} className="block px-5 py-2.5 text-sm text-gray-600 hover:bg-[#E8F4FD] hover:text-[#1a3a5c] transition-colors">
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            <a href="sms:9179706002" className="hidden lg:inline-block bg-[#4BA3D4] text-white px-6 py-2.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#2B7BB0] transition-colors whitespace-nowrap">
              Text (917) 970-6002
            </a>

            <div className="lg:hidden flex items-center gap-3">
              <a href="sms:9179706002" className="bg-[#4BA3D4] text-white px-4 py-2 rounded-md font-bold text-xs tracking-widest uppercase">
                Text Us
              </a>
              <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation menu" aria-expanded={mobileOpen} className="p-2 text-[#1a3a5c]">
                <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[100] lg:hidden transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={closeMenu} />
        <div className={`absolute top-0 left-0 h-full w-[85%] max-w-sm bg-[#1a3a5c] transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="bg-white flex items-center justify-between px-5 py-4">
            <Link href="/" onClick={closeMenu} className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide">
              Wash<span className="text-[#4BA3D4]">&</span>Fold<span className="text-[#4BA3D4]">NYC</span>
            </Link>
            <button onClick={closeMenu} aria-label="Close navigation menu" className="p-2 text-[#1a3a5c]">
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
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[#7EC8E3] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              <Link href="/pricing" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Pricing</Link>
              <Link href="/contact" onClick={closeMenu} className="block py-3 text-white font-medium text-lg">Contact</Link>

              <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen} className="w-full flex items-center justify-between py-3 text-white font-medium text-lg">
                More
                <svg aria-hidden="true" className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {moreOpen && (
                <div className="pl-4 pb-2 space-y-1">
                  {moreLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={closeMenu} className="block py-2 text-sm text-white/60 hover:text-[#7EC8E3] transition-colors">
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 mt-4 pt-4 space-y-1">
                <Link href="/book" onClick={closeMenu} className="block py-3 text-[#7EC8E3] font-medium">Client Login</Link>
              </div>

              <div className="border-t border-white/10 mt-4 pt-6 space-y-3 text-center">
                <a href="sms:9179706002" className="block bg-[#4BA3D4] text-white py-3 rounded-lg font-bold text-sm tracking-widest uppercase">Text (917) 970-6002</a>
                <a href="tel:9179706002" className="block text-white/50 font-medium text-sm">or Call Us</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
