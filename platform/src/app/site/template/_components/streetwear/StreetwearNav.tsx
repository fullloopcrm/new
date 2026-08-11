'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import type { SiteConfig } from '@/app/site/template/_config/types'
import StreetwearCartWidget from './StreetwearCartWidget'
import { STREETWEAR_LINKS, STREETWEAR_MORE_LINKS } from '@/app/site/template/_lib/streetwear/nav-links'

// Minimal persistent bar — logo + cart only. The real navigation lives as
// its own bar at the bottom of the homepage hero (see HeroNav in
// StreetwearHome), not stacked in a conventional sticky header — mobile
// still gets the full link list via the hamburger drawer since it has no
// hero-bottom-nav equivalent.
export default function StreetwearNav({ config }: { config: SiteConfig }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* Placeholder copy — swap for real announcement text */}
      <div className="bg-white text-black text-center text-xs sm:text-sm font-bold tracking-[0.15em] uppercase py-2 px-4">
        Free Shipping On Orders $150+
      </div>

      <header className="bg-black sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex-shrink-0" onClick={() => setMobileOpen(false)}>
            {config.identity.logo ? (
              <Image src={config.identity.logo} alt={config.identity.name} width={48} height={48} className="h-10 w-10 sm:h-12 sm:w-12" priority />
            ) : (
              <span className="font-[family-name:var(--font-anton)] text-2xl text-white tracking-wide uppercase">{config.identity.name}</span>
            )}
          </Link>

          <div className="flex items-center gap-1">
            <StreetwearCartWidget />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              className="p-2 text-white ml-1"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu drawer — the only way to reach top-level nav outside the homepage hero */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-[80%] max-w-xs bg-black border-l border-white/10 transform transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-end px-5 py-6">
            <button onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="p-2 text-white">
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-8 space-y-2">
            {STREETWEAR_LINKS.filter((l) => l.href !== '/contact').map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-3 text-white font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide border-b border-white/10">
                {l.name}
              </Link>
            ))}

            <div className="border-b border-white/10">
              <Link href="/contact" onClick={() => setMobileOpen(false)} className="block py-3 text-white font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide">
                Contact
              </Link>
              <div className="pb-3">
                <a href={`tel:${config.contact.phoneDigits}`} className="block py-1 text-white font-normal text-base uppercase tracking-wide">Call</a>
                <a href={`sms:${config.contact.phoneDigits}`} className="block py-1 text-white font-normal text-base uppercase tracking-wide">Text</a>
                {config.contact.email && (
                  <a href={`mailto:${config.contact.email}`} className="block py-1 text-white font-normal text-base uppercase tracking-wide">Email</a>
                )}
              </div>
            </div>

            <div className="border-b border-white/10">
              <p className="py-3 text-white font-[family-name:var(--font-anton)] text-3xl uppercase tracking-wide">
                More
              </p>
              <div className="pb-3">
                {STREETWEAR_MORE_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="block py-1 text-white font-normal text-base uppercase tracking-wide">
                    {l.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  )
}
