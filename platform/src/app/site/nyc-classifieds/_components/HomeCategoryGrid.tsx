// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { homepageColumns, mobileHomepageColumns, boroughs, slugify, findNeighborhood } from '@/app/site/nyc-classifieds/_lib/data'

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return mobile
}

interface HomeInfo {
  boroughSlug: string
  neighborhoodSlug: string
  neighborhoodName: string
  boroughName: string
}

export default function HomeCategoryGrid() {
  const [home, setHome] = useState<HomeInfo | null>(null)
  const mobile = useIsMobile()

  useEffect(() => {
    const saved = localStorage.getItem('home')
    if (saved) {
      const [bSlug, nSlug] = saved.split('/')
      if (bSlug && nSlug) {
        const nh = findNeighborhood(bSlug, nSlug)
        const b = boroughs.find(b => b.slug === bSlug)
        if (nh && b) {
          setHome({ boroughSlug: bSlug, neighborhoodSlug: nSlug, neighborhoodName: nh.name, boroughName: b.name })
        }
      }
    }
  }, [])

  const clearHome = () => {
    localStorage.removeItem('home')
    setHome(null)
  }

  // Build link prefix based on home neighborhood
  const prefix = home ? `/${home.boroughSlug}/${home.neighborhoodSlug}` : ''
  const porch = home ? `/porch/${home.boroughSlug}/${home.neighborhoodSlug}` : '/porch'

  function catHref(catSlug: string, isCommunity: boolean) {
    if (isCommunity) return porch
    if (home) return `${prefix}/${catSlug}`
    return `/listings/${catSlug}`
  }

  function subHref(catSlug: string, sub: string, isCommunity: boolean) {
    if (isCommunity) return porch
    if (home) return `${prefix}/${catSlug}/${slugify(sub)}`
    return `/listings/${catSlug}/${slugify(sub)}`
  }

  const locationLabel = home
    ? `Classifieds in ${home.neighborhoodName}, ${home.boroughName}`
    : 'Free Classifieds in New York City'

  return (
    <section aria-label="Browse classifieds by category" style={{ padding: '10px 0 0' }}>
      {/* Home indicator */}
      {home && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
          fontSize: '0.875rem',
          fontFamily: "'DM Sans', sans-serif",
          color: '#111827',
        }}>
          <span style={{ color: '#d97706', fontSize: '1rem' }}>&#9733;</span>
          <span>{home.neighborhoodName}, {home.boroughName}</span>
          <button
            onClick={clearHome}
            style={{
              color: '#1a56db',
              fontSize: '0.8125rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'underline',
            }}
          >
            Change
          </button>
        </div>
      )}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
        {locationLabel}
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#000000', marginBottom: '10px' }}>
        <strong>Free.</strong> Real. Local. Verified NYC classifieds.
      </p>
      <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif" }}>
        Looking for a specific business?{' '}
        <Link href="/business" style={{ color: '#111827', fontWeight: 700, textDecoration: 'underline' }}>
          Search our Business Directory
        </Link>
      </p>

      <div className="home-category-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0 20px',
        borderTop: '1px solid #e5e7eb', paddingTop: '12px',
      }}>
        {(mobile ? mobileHomepageColumns : homepageColumns).map((col, ci) => (
          <div key={ci}>
            {col.map(cat => {
              const isCommunity = cat.slug === 'community'
              return (
                <div key={cat.slug} style={{ marginBottom: '6px' }}>
                  <Link href={catHref(cat.slug, isCommunity)} style={{
                    fontSize: '0.9375rem', fontWeight: 600, color: '#111827',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    lineHeight: 1.8, textDecoration: 'none',
                  }}>
                    <span style={{
                      display: 'inline-block', width: '7px', height: '7px', borderRadius: '2px',
                      backgroundColor: cat.color, flexShrink: 0,
                    }} />
                    {cat.name}
                  </Link>
                  {cat.tagline && (
                    isCommunity ? (
                      <Link href={porch} style={{
                        display: 'block', fontSize: '0.75rem', fontWeight: 600,
                        color: cat.color, paddingLeft: '13px', lineHeight: 1.8,
                        textDecoration: 'none',
                      }}>
                        {cat.tagline}
                      </Link>
                    ) : (
                      <span style={{
                        display: 'block', fontSize: '0.75rem', fontWeight: 600,
                        color: cat.color, paddingLeft: '13px', lineHeight: 1.8,
                      }}>
                        {cat.tagline}
                      </span>
                    )
                  )}
                  {cat.subs.map(sub => (
                    <Link key={sub} href={subHref(cat.slug, sub, isCommunity)} style={{
                      display: 'block', color: '#1a56db', fontSize: '0.8125rem',
                      textDecoration: 'none', paddingLeft: '13px', lineHeight: 1.55,
                    }}>
                      {sub}
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
