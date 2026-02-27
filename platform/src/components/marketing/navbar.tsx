'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isActive = (path: string) => pathname === path

  return (
    <>
      <header>
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-logo">Full<span>Loop</span> CRM</Link>
          <div className="nav-links">
            <Link href="/" className={isActive('/') ? 'nav-active' : ''}>Home</Link>
            <Link href="/pricing" className={isActive('/pricing') ? 'nav-active' : ''}>Pricing</Link>
            <Link href="/features" className={isActive('/features') ? 'nav-active' : ''}>Features</Link>
            <Link href="/businesses" className={isActive('/businesses') ? 'nav-active' : ''}>Businesses</Link>
            <Link href="/locations" className={isActive('/locations') ? 'nav-active' : ''}>Locations</Link>
            <div className="nav-dropdown" ref={dropdownRef}>
              <button
                className={`nav-dropdown-trigger ${['/about', '/faq', '/contact'].includes(pathname) ? 'nav-active' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onMouseEnter={() => setDropdownOpen(true)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                More <span className="nav-dropdown-arrow">&#9662;</span>
              </button>
              <div
                className={`nav-dropdown-menu ${dropdownOpen ? 'open' : ''}`}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <Link href="/about" onClick={() => setDropdownOpen(false)}>About</Link>
                <Link href="/faq" onClick={() => setDropdownOpen(false)}>FAQ</Link>
                <Link href="/contact" onClick={() => setDropdownOpen(false)}>Contact</Link>
              </div>
            </div>
            <Link href="/sign-in" className="nav-signin">Sign In</Link>
            <Link href="/crm-partnership-request-form" className="nav-cta">Apply Now</Link>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <span></span><span></span><span></span>
          </button>
        </nav>
      </header>

      {/* MOBILE SLIDE-IN MENU */}
      <div className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">&times;</button>
        <Link href="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
        <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
        <Link href="/features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
        <Link href="/businesses" onClick={() => setMobileMenuOpen(false)}>Businesses</Link>
        <Link href="/locations" onClick={() => setMobileMenuOpen(false)}>Locations</Link>
        <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
        <Link href="/faq" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
        <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
        <Link href="/crm-partnership-request-form" className="mobile-cta" onClick={() => setMobileMenuOpen(false)}>Apply Now</Link>
        <div className="mobile-contact">
          <a href="sms:+12122029220">Text Us: (212) 202-9220</a>
          <a href="tel:+12122029220">Call Us: (212) 202-9220</a>
          <a href="mailto:hello@fullloopcrm.com">hello@fullloopcrm.com</a>
        </div>
      </div>
    </>
  )
}
