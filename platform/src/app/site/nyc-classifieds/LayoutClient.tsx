// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { boroughs, categories, neighborhoodSlug, findNeighborhood } from '@/app/site/nyc-classifieds/_lib/data'
import SearchAutocomplete from './components/SearchAutocomplete'
import HomepageAd from './components/HomepageAd'
import FeedbackWidget from './components/FeedbackWidget'
import PushPrompt from './components/PushPrompt'
import PageTracker from './components/PageTracker'

const IS_PRELAUNCH = false // disabled — site is open

function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return mobile
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const hideNav = pathname?.startsWith('/admin')
  const isHomepage = pathname === '/' || pathname === '/the-classifieds'
  const isSearchPage = pathname === '/search'
  const [user, setUser] = useState<{ name?: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [homeName, setHomeName] = useState<string | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [pickerBorough, setPickerBorough] = useState<string | null>(null)
  const [porchNudge, setPorchNudge] = useState(false)
  const mobile = useIsMobile()

  useEffect(() => {
    const visits = parseInt(localStorage.getItem('site_visits') || '0', 10) + 1
    localStorage.setItem('site_visits', String(visits))
    if (visits <= 10) setPorchNudge(true)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('home')
    if (saved) {
      const [bSlug, nSlug] = saved.split('/')
      if (bSlug && nSlug) {
        const nh = findNeighborhood(bSlug, nSlug)
        const b = boroughs.find(b => b.slug === bSlug)
        if (nh && b) setHomeName(`${nh.name}, ${b.name}`)
      }
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setUser(d.user)
          setUnreadCount(d.unreadMessages || 0)
          setUnreadNotifs(d.unreadNotifications || 0)
        }
      })
      .catch(() => setUser(null))
  }, [pathname])

  const isAppPage = pathname?.startsWith('/signup') || pathname?.startsWith('/login') || pathname?.startsWith('/account') || pathname?.startsWith('/messages') || pathname?.startsWith('/notifications') || pathname?.startsWith('/forgot-pin') || pathname === '/listings/new'
  const isClassifieds = pathname === '/the-classifieds' || pathname?.startsWith('/the-classifieds/') || pathname?.startsWith('/listings') || pathname?.startsWith('/manhattan') || pathname?.startsWith('/brooklyn') || pathname?.startsWith('/queens') || pathname?.startsWith('/bronx') || pathname?.startsWith('/staten-island')
  const isPorch = pathname?.startsWith('/porch')
  const isAlerts = pathname?.startsWith('/alerts')
  const isDirectory = pathname === '/business'

  // Parse URL context for ads
  const boroughSlugs = new Set(boroughs.map(b => b.slug))
  const categorySlugs = new Set(categories.map(c => c.slug))
  const segments = (pathname || '').split('/').filter(Boolean)
  let adCategory = ''
  let adBorough = ''
  let adNeighborhood = ''
  if (segments[0] === 'listings' && segments[1] && categorySlugs.has(segments[1])) {
    adCategory = segments[1]
  } else if (segments[0] && boroughSlugs.has(segments[0])) {
    adBorough = segments[0]
    if (segments[1] && !categorySlugs.has(segments[1])) {
      adNeighborhood = segments[1]
      if (segments[2] && categorySlugs.has(segments[2])) adCategory = segments[2]
    } else if (segments[1] && categorySlugs.has(segments[1])) {
      adCategory = segments[1]
    }
  }

  return (
    <>
      {!hideNav && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 1001,
          backgroundColor: '#2563eb',
          color: '#ffffff',
          textAlign: 'center',
          padding: mobile ? '8px 12px' : '10px 16px',
          fontSize: mobile ? '0.8rem' : '0.875rem',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          lineHeight: 1.4,
        }}>
          We&apos;re in <strong>Testing Mode</strong> — look around, it&apos;ll remind you of 2 awesome platforms from back in the day.{' '}
          <Link href="/signup" style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 700 }}>
            Sign up
          </Link>{' '}
          — you don&apos;t want to miss this launch.
        </div>
      )}
      {!hideNav && (
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          height: mobile ? '48px' : '56px',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1050px',
            width: '100%',
            margin: '0 auto',
            padding: mobile ? '0 12px' : '0 24px',
          }}>
            {/* Logo */}
            <Link href="/" style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: mobile ? '1.05rem' : '1.5rem',
              letterSpacing: '-0.02em',
              flexShrink: 0,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}>
              {!mobile && <span style={{ color: '#1f2937', fontWeight: 400 }}>The </span>}
              <span style={{ color: '#2563eb', fontWeight: 700 }}>NYC</span>
              <span style={{ color: '#1f2937', fontWeight: 400 }}> Classifieds</span>
            </Link>

            {/* Section tabs */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: mobile ? '0' : '4px', marginLeft: mobile ? '8px' : '32px' }}>
              <Link href="/the-classifieds" style={{
                padding: mobile ? '6px 8px' : '6px 14px',
                fontSize: mobile ? '0.75rem' : '0.8125rem',
                fontWeight: isClassifieds ? 600 : 500,
                color: isClassifieds ? '#111827' : '#6b7280',
                borderBottom: isClassifieds ? '2px solid #1a56db' : '2px solid transparent',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                Classifieds
              </Link>
              <Link href="/porch" className={porchNudge ? 'porch-nudge' : ''} style={{
                padding: mobile ? '6px 8px' : '6px 14px',
                fontSize: mobile ? '0.75rem' : '0.8125rem',
                fontWeight: isPorch ? 600 : 500,
                color: isPorch ? '#111827' : '#6b7280',
                borderBottom: isPorch ? '2px solid #059669' : '2px solid transparent',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                Porch
              </Link>
              <Link href="/alerts" style={{
                padding: mobile ? '6px 8px' : '6px 14px',
                fontSize: mobile ? '0.75rem' : '0.8125rem',
                fontWeight: isAlerts ? 600 : 500,
                color: isAlerts ? '#111827' : '#6b7280',
                borderBottom: isAlerts ? '2px solid #d97706' : '2px solid transparent',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                Alerts
              </Link>
            </nav>

            <div style={{ flex: 1 }} />

            {/* Right nav: Bell | Post | Account */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: mobile ? '8px' : '12px', flexShrink: 0 }}>
              {/* Notifications bell */}
              {user && (
                <Link href="/notifications" style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  flexShrink: 0,
                }}>
                  <svg width={mobile ? '18' : '20'} height={mobile ? '18' : '20'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadNotifs > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-6px',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}>
                      {unreadNotifs > 9 ? '9+' : unreadNotifs}
                    </span>
                  )}
                </Link>
              )}

              <Link href={user ? (IS_PRELAUNCH ? '/porch' : '/listings/new') : '/signup'} style={{
                backgroundColor: '#1a56db',
                color: '#ffffff',
                padding: mobile ? '5px 10px' : '7px 18px',
                borderRadius: '6px',
                fontSize: mobile ? '0.75rem' : '0.875rem',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}>
                {user ? (IS_PRELAUNCH ? 'Share' : 'Post') : 'Sign Up'}
              </Link>

              {/* Account */}
              {user ? (
                <Link href="/account" style={{
                  width: mobile ? '28px' : '32px',
                  height: mobile ? '28px' : '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1a56db',
                  border: '1px solid #1a56db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: mobile ? '11px' : '13px',
                  fontWeight: 600,
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {user.name ? user.name[0].toUpperCase() : '?'}
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      fontSize: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              ) : (
                <Link href="/login" style={{
                  width: mobile ? '28px' : '32px',
                  height: mobile ? '28px' : '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1a56db',
                  border: '1px solid #1a56db',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                }}>
                  <svg width={mobile ? '14' : '16'} height={mobile ? '14' : '16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </Link>
              )}
            </nav>
          </div>
        </header>
      )}

      {!hideNav && !isHomepage && !isSearchPage && !isAppPage && !isDirectory && (
        <div style={{
          maxWidth: '1050px',
          margin: '0 auto',
          padding: mobile ? '8px 12px' : '10px 24px',
        }}>
          {/* Mobile ad — classifieds pages only */}
          {isClassifieds && (
            <div className="mobile-only-ad">
              <HomepageAd categorySlug={adCategory || undefined} borough={adBorough || undefined} neighborhood={adNeighborhood || undefined} />
            </div>
          )}
          <div className="homepage-top" style={{ margin: 0 }}>
            <div className="homepage-top-left">
              <SearchAutocomplete
                onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
              />
              <div style={{ textAlign: 'right', padding: '4px 0 0' }}>
                <button
                  onClick={() => {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
                    setTimeout(() => {
                      const widget = document.querySelector('[data-feedback-widget]') as HTMLElement
                      if (widget) widget.click()
                    }, 600)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Feedback?
                </button>
              </div>
            </div>
            {/* Desktop ad — classifieds pages only */}
            {isClassifieds && (
              <div className="desktop-only-ad homepage-top-right">
                <HomepageAd categorySlug={adCategory || undefined} borough={adBorough || undefined} neighborhood={adNeighborhood || undefined} />
              </div>
            )}
          </div>
          <div style={{ padding: mobile ? '6px 0 0' : '8px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
            {homeName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', fontSize: '0.875rem', color: '#111827' }}>
                <span style={{ color: '#d97706', fontSize: '1rem' }}>&#9733;</span>
                <span>{homeName}</span>
              </div>
            )}
            {homeName && (
              <p style={{ fontSize: '0.8125rem', color: '#000000', margin: 0 }}>
                <strong>Free.</strong> Real. Local. Verified NYC classifieds.
              </p>
            )}
          </div>
        </div>
      )}

      {children}

      {!hideNav && <PageTracker />}
      {!hideNav && <FeedbackWidget />}
      {!hideNav && user && <PushPrompt />}

      {/* Tawk.to live chat */}
      <Script id="tawk-to" strategy="lazyOnload">{`
        var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        (function(){
          var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;
          s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
          s1.charset='UTF-8';
          s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);
        })();
      `}</Script>

      {!hideNav && !isAppPage && (
        <footer style={{
          backgroundColor: '#111827',
          marginTop: '48px',
        }}>
          <div style={{ maxWidth: '1050px', margin: '0 auto', padding: mobile ? '32px 16px 20px' : '48px 24px 24px' }}>
            {!mobile && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0 20px',
              }}>
              {/* Col 1: Categories + Bronx + Staten Island */}
              <div>
                <div className="footer-heading">Categories</div>
                {categories.map(c => (
                  <Link key={c.slug} href={`/listings/${c.slug}`} className="footer-link">{c.name}</Link>
                ))}
                {boroughs.filter(b => b.slug === 'bronx' || b.slug === 'staten-island').map(b => (
                  <div key={b.slug}>
                    <div className="footer-heading" style={{ marginTop: '12px' }}>{b.name}</div>
                    {b.neighborhoods.map(n => (
                      <Link key={n} href={`/${b.slug}/${neighborhoodSlug(n)}`} className="footer-link">{n}</Link>
                    ))}
                  </div>
                ))}
              </div>

              {/* Col 2-4: Manhattan, Brooklyn, Queens */}
              {boroughs.filter(b => ['manhattan', 'brooklyn', 'queens'].includes(b.slug)).map(b => (
                <div key={b.slug}>
                  <div className="footer-heading">{b.name}</div>
                  {b.neighborhoods.map(n => (
                    <Link key={n} href={`/${b.slug}/${neighborhoodSlug(n)}`} className="footer-link">{n}</Link>
                  ))}
                </div>
              ))}

              {/* Col 5: Company */}
              <div>
                <div className="footer-heading">Company</div>
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Business Directory', href: '/business' },
                  { label: 'Guidelines', href: '/guidelines' },
                  { label: 'Legal', href: '/legal' },
                  { label: 'Privacy', href: '/privacy' },
                  { label: 'Terms', href: '/terms' },
                ].map(l => (
                  <Link key={l.label} href={l.href} className="footer-link">{l.label}</Link>
                ))}
              </div>
              </div>
            )}

            {/* Mobile mini footer nav */}
            {mobile && (
              <nav style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
                paddingBottom: '12px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.8125rem',
              }}>
                {[
                  { label: 'Home', href: '/' },
                  { label: 'Directory', href: '/business' },
                  { label: 'About', href: '/about' },
                  { label: 'Blog', href: '/blog' },
                  { label: 'Legal', href: '/legal' },
                ].map((l, i) => (
                  <span key={l.label}>
                    {i > 0 && <span style={{ color: '#4b5563', margin: '0 2px' }}>|</span>}
                    <Link href={l.href} style={{ color: '#9ca3af' }}>{l.label}</Link>
                  </span>
                ))}
              </nav>
            )}

            {/* Copyright bar */}
            <div style={{
              borderTop: mobile ? 'none' : '1px solid #1f2937',
              marginTop: mobile ? '0' : '24px',
              paddingTop: mobile ? '0' : '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.875rem',
              }}>
                <span style={{ color: '#9ca3af' }}>The </span>
                <span style={{ color: '#6b7280', fontWeight: 700 }}>NYC</span>
                <span style={{ color: '#9ca3af' }}> Classifieds</span>
              </span>
              <span style={{ color: '#4b5563', fontSize: '0.6875rem' }}>
                Free. Real. Local. Verified. &copy; {new Date().getFullYear()}
              </span>
              <span style={{ color: '#4b5563', fontSize: '0.625rem' }}>
                Digital Marketing, SEO &amp; AI by{' '}
                <a href="https://www.consortiumnyc.com/" target="_blank" rel="noopener" style={{ color: '#6b7280', textDecoration: 'underline' }}>
                  Consortium NYC
                </a>
              </span>
              <span style={{ color: '#4b5563', fontSize: '0.5625rem', marginTop: '2px' }}>
                Built and managed by{' '}
                <a href="https://homeservicesbusinesscrm.com/" target="_blank" rel="noopener" style={{ color: '#6b7280', textDecoration: 'underline' }}>
                  Full Loop CRM
                </a>
              </span>
            </div>
          </div>
        </footer>
      )}
    </>
  )
}
