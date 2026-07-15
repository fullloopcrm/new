// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import ListingGrid from '@/app/site/nyc-classifieds/_components/ListingGrid'
import PreLaunchGate from '@/app/site/nyc-classifieds/_components/PreLaunchGate'
import { getCategorySeo, SITE_URL } from '@/app/site/nyc-classifieds/_lib/seo'

// ─── Types ───

interface Business {
  id: number
  name: string
  business_name: string
  business_slug: string
  business_category: string | null
  business_description: string | null
  website: string | null
  phone: string | null
  hours: Record<string, { open: string; close: string; closed: boolean }> | null
  service_area: string[]
  photo_gallery: string[]
  selfie_url: string | null
  business_photo: string | null
  business_address: string | null
  social_links: Record<string, string> | null
  seo_keywords: string[]
  verified: boolean
  created_at: string
}

interface Review {
  id: number
  rating: number
  body: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
  reported: boolean
  reviewer_user_id: number
  reviewer: { name: string; selfie_url: string | null; verified: boolean } | null
}

interface Listing {
  id: number
  title: string
  price: number | null
  images: string[]
  location: string | null
  category_slug: string
  created_at: string
  users: { name: string; verified: boolean }
}

interface BusinessUpdate {
  id: number
  title: string
  body: string | null
  photos: string[]
  created_at: string
}

// ─── Constants ───

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

const ALL_SECTIONS = ['about', 'updates', 'photos', 'reviews', 'listings'] as const

// ─── Helpers ───

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`
}

function getOpenStatus(hours: Business['hours']): { isOpen: boolean; label: string } {
  if (!hours) return { isOpen: false, label: '' }
  const now = new Date()
  const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1
  const today = DAYS[dayIdx]
  const h = hours[today]
  if (!h || h.closed) return { isOpen: false, label: 'Closed' }

  const nowMins = now.getHours() * 60 + now.getMinutes()
  const [openH, openM] = h.open.split(':').map(Number)
  const [closeH, closeM] = h.close.split(':').map(Number)
  const openMins = openH * 60 + openM
  const closeMins = closeH * 60 + closeM

  if (nowMins >= openMins && nowMins < closeMins) {
    return { isOpen: true, label: `Open · Closes ${formatTime(h.close)}` }
  }
  if (nowMins < openMins) {
    return { isOpen: false, label: `Closed · Opens ${formatTime(h.open)}` }
  }
  return { isOpen: false, label: 'Closed' }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

// ─── Social Icon SVGs ───

const socialIcons: Record<string, { icon: React.ReactNode; color: string; urlFn: (v: string) => string }> = {
  instagram: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>,
    color: '#E4405F',
    urlFn: v => `https://instagram.com/${v.replace(/^@/, '')}`,
  },
  tiktok: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.18 8.18 0 005.58 2.18v-3.45a4.85 4.85 0 01-3.72-1.52v-3.72h3.72z"/></svg>,
    color: '#000000',
    urlFn: v => `https://tiktok.com/@${v.replace(/^@/, '')}`,
  },
  facebook: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    color: '#1877F2',
    urlFn: v => v.startsWith('http') ? v : `https://facebook.com/${v}`,
  },
  yelp: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.16 12.594l-4.995 1.807c-.96.345-1.82-.527-1.49-1.512l1.83-5.447c.33-.98 1.69-.89 1.89.125l.765 5.027zm-8.49 4.59l-.3 5.3c-.03.546-.72.785-1.053.363l-3.66-4.655c-.57-.723.14-1.727 1.04-1.473l4.95 1.39c.53.15.57.84.023 1.075zm-2.7-7.287l-5.13-1.62c-.976-.31-.976-1.69 0-2l5.13-1.62c.74-.234 1.413.577 1.04 1.247l-2.04 3.996c-.23.412-.65.412-.88 0l-.12-.003zm3.15-5.8l2.73-4.39c.34-.542 1.15-.36 1.23.277l.88 6.68c.13.96-.98 1.53-1.65.85L12.6 4.87c-.41-.41-.32-1.04.12-1.363l-.59-.41zm-1.68 13.44l-4.66 3.08c-.83.55-1.87-.32-1.51-1.26l2.43-6.32c.38-.99 1.79-.89 2.04.15l.7 4.35z"/></svg>,
    color: '#D32323',
    urlFn: v => v.startsWith('http') ? v : `https://yelp.com/biz/${v}`,
  },
  google: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>,
    color: '#4285F4',
    urlFn: v => v,
  },
  linkedin: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    color: '#0A66C2',
    urlFn: v => v.startsWith('http') ? v : `https://linkedin.com/in/${v}`,
  },
}

// ─── Component ───

export default function BusinessProfileClient({ slug, category }: { slug: string; category: string }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [updates, setUpdates] = useState<BusinessUpdate[]>([])
  const [reviewAverage, setReviewAverage] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Lightbox
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // Sticky nav
  const [activeSection, setActiveSection] = useState<string>('about')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // About expand
  const [descExpanded, setDescExpanded] = useState(false)

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newReviewBody, setNewReviewBody] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    fetch(`/api/business/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.business) {
          setBusiness(data.business)
          setListings(data.listings || [])
          setReviews(data.reviews || [])
          setUpdates(data.updates || [])
          setReviewAverage(data.reviewAverage || 0)
          setReviewCount(data.reviewCount || 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Check if viewer is the business owner
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setIsLoggedIn(true)
          if (d.user?.business_slug === slug) {
            setIsOwner(true)
          }
        }
      })
      .catch(() => {})
  }, [slug])

  // Dynamic sections (hide updates if none)
  const sections = ALL_SECTIONS.filter(s => s !== 'updates' || updates.length > 0)

  // Scroll spy for sticky nav
  useEffect(() => {
    const handleScroll = () => {
      for (const section of sections) {
        const el = sectionRefs.current[section]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 120 && rect.bottom > 120) {
            setActiveSection(section)
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  // Lightbox keyboard
  const allPhotos = business ? [
    ...(business.business_photo ? [business.business_photo] : []),
    ...business.photo_gallery,
  ] : []

  const handleLightboxKey = useCallback((e: KeyboardEvent) => {
    if (lightboxIdx === null) return
    if (e.key === 'Escape') setLightboxIdx(null)
    if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? (i + 1) % allPhotos.length : null)
    if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? (i - 1 + allPhotos.length) % allPhotos.length : null)
  }, [lightboxIdx, allPhotos.length])

  useEffect(() => {
    window.addEventListener('keydown', handleLightboxKey)
    return () => window.removeEventListener('keydown', handleLightboxKey)
  }, [handleLightboxKey])

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const submitReview = async () => {
    if (!business) return
    setSubmittingReview(true)
    setReviewError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', business_user_id: business.id, rating: newRating, body: newReviewBody }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReviewError(data.error || 'Failed to submit review')
        return
      }
      // Re-fetch reviews
      const r2 = await fetch(`/api/business/${slug}`)
      const d2 = await r2.json()
      setReviews(d2.reviews || [])
      setReviewAverage(d2.reviewAverage || 0)
      setReviewCount(d2.reviewCount || 0)
      setShowReviewForm(false)
      setNewRating(5)
      setNewReviewBody('')
    } catch {
      setReviewError('Something went wrong')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleShare = async () => {
    if (!business) return
    const url = `${window.location.origin}/business/${category}/${slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: business.business_name, url })
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>
  }

  if (!business) {
    return (
      <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Business not found</h1>
        <Link href="/" style={{ color: '#2563eb', fontSize: '0.875rem', marginTop: '1rem', display: 'inline-block' }}>
          Back to home
        </Link>
      </main>
    )
  }

  const bizAvatar = business.business_photo || business.selfie_url
  const openStatus = getOpenStatus(business.hours)
  const websiteUrl = business.website
    ? (business.website.startsWith('http') ? business.website : `https://${business.website}`)
    : null
  const directionsUrl = business.business_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.business_address + ', New York, NY')}`
    : null

  // Rating breakdown
  const ratingBreakdown = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }))

  // JSON-LD for SEO
  const categorySeo = getCategorySeo(business.business_category)
  const canonicalUrl = `${SITE_URL}/business/${category}/${slug}`

  // Build social URLs for sameAs
  const sameAsUrls: string[] = []
  if (business.social_links) {
    const urlFns: Record<string, (v: string) => string> = {
      instagram: v => `https://instagram.com/${v.replace(/^@/, '')}`,
      tiktok: v => `https://tiktok.com/@${v.replace(/^@/, '')}`,
      facebook: v => v.startsWith('http') ? v : `https://facebook.com/${v}`,
      yelp: v => v.startsWith('http') ? v : `https://yelp.com/biz/${v}`,
      google: v => v,
      linkedin: v => v.startsWith('http') ? v : `https://linkedin.com/in/${v}`,
    }
    Object.entries(business.social_links).forEach(([platform, value]) => {
      if (value && urlFns[platform]) sameAsUrls.push(urlFns[platform](value))
    })
  }

  // Build openingHoursSpecification
  const openingHours = business.hours ? DAYS.map(day => {
    const h = business.hours?.[day]
    if (!h || h.closed) return null
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_FULL[day],
      opens: h.open,
      closes: h.close,
    }
  }).filter(Boolean) : []

  // Build individual review items
  const reviewItems = reviews.slice(0, 20).map(r => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.reviewer?.name || 'Anonymous' },
    datePublished: r.created_at.split('T')[0],
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    ...(r.body && { reviewBody: r.body }),
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': categorySeo.schemaType,
    name: business.business_name,
    ...(business.business_description && { description: business.business_description }),
    url: canonicalUrl,
    address: {
      '@type': 'PostalAddress',
      ...(business.business_address && { streetAddress: business.business_address }),
      addressLocality: 'New York',
      addressRegion: 'NY',
      addressCountry: 'US',
    },
    ...(business.phone && { telephone: business.phone }),
    ...(bizAvatar && { image: bizAvatar }),
    ...(openingHours.length > 0 && { openingHoursSpecification: openingHours }),
    ...(sameAsUrls.length > 0 && { sameAs: sameAsUrls }),
    ...(business.service_area.length > 0 && {
      areaServed: business.service_area.map(n => ({ '@type': 'Place', name: `${n}, New York, NY` })),
    }),
    ...(reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: reviewAverage,
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(reviewItems.length > 0 && { review: reviewItems }),
    ...(business.seo_keywords?.length > 0 && { keywords: business.seo_keywords.join(', ') }),
    isPartOf: { '@type': 'WebSite', name: 'The NYC Classifieds', url: SITE_URL },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Business Directory', item: `${SITE_URL}/business` },
      ...(business.business_category ? [{
        '@type': 'ListItem', position: 3,
        name: business.business_category,
        item: `${SITE_URL}/business?category=${encodeURIComponent(business.business_category)}`,
      }] : []),
      {
        '@type': 'ListItem',
        position: business.business_category ? 4 : 3,
        name: business.business_name,
        item: canonicalUrl,
      },
    ],
  }

  return (
    <PreLaunchGate>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, '\\u003c') }} />
      <style>{`
        .bp-grid { display: grid; grid-template-columns: 1fr 340px; gap: 32px; }
        .bp-cta-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .bp-cta-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; text-decoration: none; cursor: pointer; border: 1.5px solid #d1d5db; background: #fff; color: #374151; transition: all 0.15s; }
        .bp-cta-btn:hover { border-color: #2563eb; color: #2563eb; }
        .bp-cta-primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .bp-cta-primary:hover { background: #1d4ed8; }
        .bp-sticky-nav { position: sticky; top: 0; z-index: 40; background: #fff; border-bottom: 1px solid #e5e7eb; margin: 0 -24px; padding: 0 24px; display: flex; gap: 0; }
        .bp-nav-item { padding: 12px 20px; font-size: 0.875rem; font-weight: 500; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; background: none; border-top: none; border-left: none; border-right: none; }
        .bp-nav-item:hover { color: #111827; }
        .bp-nav-active { color: #2563eb; border-bottom-color: #2563eb; }
        .bp-sidebar-card { padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; background: #fff; margin-bottom: 16px; }
        .bp-star-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 0.8125rem; }
        .bp-star-bar-fill { height: 8px; border-radius: 4px; background: #e5e7eb; flex: 1; overflow: hidden; }
        .bp-star-bar-inner { height: 100%; background: #f59e0b; border-radius: 4px; }
        @media (max-width: 768px) {
          .bp-grid { grid-template-columns: 1fr !important; }
          .bp-hero-info { padding: 0 16px !important; }
          .bp-cta-row { justify-content: center; }
          .bp-nav-item { padding: 10px 14px; font-size: 0.8125rem; }
        }
      `}</style>

      <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '0 24px 48px' }}>
        {/* ═══ OWNER BANNER ═══ */}
        {isOwner && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', marginBottom: '12px', borderRadius: '10px',
            background: '#fef9c3', border: '1px solid #fde047', fontSize: '0.8125rem', color: '#854d0e',
          }}>
            <span>You are viewing your public business profile.</span>
            <Link href="/account" style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              color: '#2563eb', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* ═══ MISSION BANNER ═══ */}
        <div style={{
          background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '12px', fontSize: '0.8125rem', color: '#0c4a6e', lineHeight: 1.5,
        }}>
          The NYC Classifieds helps small business owners connect with customers — completely free. No fees, no ads, no catches. Just genuine support for the people who make New York&apos;s neighborhoods great.
        </div>

        {/* ═══ HERO BANNER ═══ */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          height: '200px',
          borderRadius: '0 0 16px 16px',
          marginBottom: '-60px',
          position: 'relative',
        }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', marginBottom: '24px' }} className="bp-hero-info">
          {/* Avatar */}
          <div style={{
            width: '120px', height: '120px', borderRadius: '16px', overflow: 'hidden',
            border: '4px solid #fff', backgroundColor: '#f3f4f6', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}>
            {bizAvatar ? (
              <img src={bizAvatar} alt={business.business_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '2.5rem', fontWeight: 700, background: '#e0e7ff' }}>
                {business.business_name[0]}
              </div>
            )}
          </div>

          {/* Name + badges */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {business.business_name}
              </h1>
              {business.verified && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  backgroundColor: '#dcfce7', color: '#16a34a', padding: '3px 10px',
                  borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Verified
                </span>
              )}
              {business.business_category && (
                <span style={{
                  padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem',
                  fontWeight: 500, backgroundColor: '#eff6ff', color: '#2563eb',
                }}>
                  {business.business_category}
                </span>
              )}
            </div>

            {/* Rating + Open status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
              {reviewCount > 0 && (
                <button onClick={() => scrollToSection('reviews')} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: '0.9375rem', color: '#111827',
                }}>
                  <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(reviewAverage))}</span>
                  <span style={{ fontWeight: 600 }}>{reviewAverage}</span>
                  <span style={{ color: '#6b7280' }}>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
                </button>
              )}
              {openStatus.label && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: openStatus.isOpen ? '#22c55e' : '#ef4444',
                    display: 'inline-block',
                  }} />
                  <span style={{ color: openStatus.isOpen ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                    {openStatus.label}
                  </span>
                </span>
              )}
              {business.business_address && (
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {business.business_address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '16px' }}>
          <Link href="/" style={{ color: '#2563eb' }}>Home</Link>
          <span style={{ margin: '0 6px' }}>/</span>
          <Link href="/business" style={{ color: '#2563eb' }}>Business Directory</Link>
          {business.business_category && (
            <>
              <span style={{ margin: '0 6px' }}>/</span>
              <Link href={`/business?category=${encodeURIComponent(business.business_category)}`} style={{ color: '#2563eb' }}>
                {business.business_category}
              </Link>
            </>
          )}
          <span style={{ margin: '0 6px' }}>/</span>
          <span style={{ color: '#111827', fontWeight: 500 }}>{business.business_name}</span>
        </nav>

        {/* ═══ CTA ROW ═══ */}
        <div className="bp-cta-row" style={{ marginBottom: '20px' }}>
          {business.phone && (
            <a href={`tel:${business.phone}`} className="bp-cta-btn bp-cta-primary" onClick={() => window.__track?.('business_link_click', { slug: business.business_slug, linkType: 'phone' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
              Call
            </a>
          )}
          <Link href={`/messages?to=${business.id}`} className="bp-cta-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Message
          </Link>
          {websiteUrl && (
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="bp-cta-btn" onClick={() => window.__track?.('business_link_click', { slug: business.business_slug, linkType: 'website' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              Website
            </a>
          )}
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="bp-cta-btn" onClick={() => window.__track?.('business_link_click', { slug: business.business_slug, linkType: 'directions' })}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Directions
            </a>
          )}
          <button onClick={handleShare} className="bp-cta-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
        </div>

        {/* ═══ STICKY NAV ═══ */}
        <div className="bp-sticky-nav">
          {sections.map(s => (
            <button
              key={s}
              className={`bp-nav-item ${activeSection === s ? 'bp-nav-active' : ''}`}
              onClick={() => scrollToSection(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'updates' && updates.length > 0 ? ` (${updates.length})` : ''}
              {s === 'reviews' && reviewCount > 0 ? ` (${reviewCount})` : ''}
              {s === 'listings' && listings.length > 0 ? ` (${listings.length})` : ''}
            </button>
          ))}
        </div>

        {/* ═══ MAIN GRID ═══ */}
        <div className="bp-grid" style={{ marginTop: '24px' }}>

          {/* ── LEFT COLUMN ── */}
          <div>
            {/* About */}
            <section ref={el => { sectionRefs.current.about = el }} style={{ marginBottom: '32px', scrollMarginTop: '60px' }}>
              <h2 style={sectionHeading}>About</h2>
              {business.business_description ? (
                <>
                  <p style={{ color: '#374151', fontSize: '0.9375rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {descExpanded || business.business_description.length <= 300
                      ? business.business_description
                      : business.business_description.slice(0, 300) + '...'}
                  </p>
                  {business.business_description.length > 300 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: '4px' }}
                    >
                      {descExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No description provided.</p>
              )}

              {/* Service area pills */}
              {business.service_area.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Service Area</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {business.service_area.map(n => (
                      <span key={n} style={{
                        padding: '4px 12px', borderRadius: '1rem', fontSize: '0.8125rem',
                        backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 500,
                      }}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Updates */}
            {updates.length > 0 && (
              <section ref={el => { sectionRefs.current.updates = el }} style={{ marginBottom: '32px', scrollMarginTop: '60px' }}>
                <h2 style={sectionHeading}>Updates <span style={{ color: '#6b7280', fontWeight: 400 }}>({updates.length})</span></h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {updates.map(update => (
                    <div key={update.id} style={{ padding: '16px', borderLeft: '3px solid #2563eb', borderRadius: '0 10px 10px 0', backgroundColor: '#f8fafc' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>{update.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{timeAgo(update.created_at)}</span>
                      {update.body && (
                        <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.6, margin: '8px 0 0' }}>{update.body}</p>
                      )}
                      {update.photos.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(update.photos.length, 3)}, 1fr)`, gap: '6px', marginTop: '10px' }}>
                          {update.photos.map((url, i) => (
                            <div key={i} style={{ aspectRatio: '16/10', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Photos */}
            <section ref={el => { sectionRefs.current.photos = el }} style={{ marginBottom: '32px', scrollMarginTop: '60px' }}>
              <h2 style={sectionHeading}>Photos</h2>
              {allPhotos.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: allPhotos.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '8px',
                }}>
                  {allPhotos.map((url, i) => (
                    <div key={i} onClick={() => setLightboxIdx(i)} style={{
                      aspectRatio: i === 0 && allPhotos.length > 1 ? '16/10' : '1',
                      gridColumn: i === 0 && allPhotos.length > 2 ? 'span 2' : undefined,
                      gridRow: i === 0 && allPhotos.length > 2 ? 'span 2' : undefined,
                      borderRadius: '10px', overflow: 'hidden',
                      cursor: 'pointer', backgroundColor: '#f3f4f6',
                    }}>
                      <img src={url} alt={`${business.business_name} photo ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No photos yet.</p>
              )}
            </section>

            {/* Reviews */}
            <section ref={el => { sectionRefs.current.reviews = el }} style={{ marginBottom: '32px', scrollMarginTop: '60px' }}>
              <h2 style={sectionHeading}>
                Reviews {reviewCount > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({reviewCount})</span>}
              </h2>

              {/* Rating summary */}
              {reviewCount > 0 && (
                <div style={{ display: 'flex', gap: '32px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{reviewAverage}</div>
                    <div style={{ color: '#f59e0b', fontSize: '1.25rem', marginTop: '4px' }}>{'★'.repeat(Math.round(reviewAverage))}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.8125rem', marginTop: '4px' }}>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    {ratingBreakdown.map(({ star, count }) => (
                      <div key={star} className="bp-star-bar">
                        <span style={{ width: '12px', textAlign: 'right' }}>{star}</span>
                        <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>★</span>
                        <div className="bp-star-bar-fill">
                          <div className="bp-star-bar-inner" style={{ width: `${reviewCount > 0 ? (count / reviewCount) * 100 : 0}%` }} />
                        </div>
                        <span style={{ width: '24px', color: '#6b7280', fontSize: '0.75rem' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Write a Review button — logged-in non-owners only */}
              {!showReviewForm && isLoggedIn && !isOwner && (
                <button
                  onClick={() => setShowReviewForm(true)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #2563eb',
                    background: '#fff', color: '#2563eb', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', marginBottom: '20px',
                  }}
                >
                  Write a Review
                </button>
              )}

              {/* Review form */}
              {showReviewForm && isLoggedIn && !isOwner && (
                <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '20px', background: '#fafafa' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Write a Review</h3>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>Rating</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setNewRating(s)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem',
                          color: s <= newRating ? '#f59e0b' : '#d1d5db',
                        }}>★</button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={newReviewBody}
                    onChange={e => setNewReviewBody(e.target.value)}
                    placeholder="Share your experience..."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db',
                      fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit', marginBottom: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  {reviewError && <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginBottom: '8px' }}>{reviewError}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={submitReview}
                      disabled={submittingReview}
                      style={{
                        padding: '8px 20px', borderRadius: '8px', border: 'none',
                        background: '#2563eb', color: '#fff', fontSize: '0.875rem', fontWeight: 600,
                        cursor: submittingReview ? 'not-allowed' : 'pointer', opacity: submittingReview ? 0.6 : 1,
                      }}
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      onClick={() => { setShowReviewForm(false); setReviewError('') }}
                      style={{
                        padding: '8px 20px', borderRadius: '8px', border: '1px solid #d1d5db',
                        background: '#fff', color: '#374151', fontSize: '0.875rem', cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Individual reviews */}
              {reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reviews.map(review => (
                    <div key={review.id} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                        {/* Reviewer avatar */}
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
                          backgroundColor: '#e0e7ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {review.reviewer?.selfie_url ? (
                            <img src={review.reviewer.selfie_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ color: '#4338ca', fontWeight: 600, fontSize: '0.875rem' }}>
                              {review.reviewer?.name?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                              {review.reviewer?.name || 'Anonymous'}
                            </span>
                            {review.reviewer?.verified && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="#2563eb"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ color: '#f59e0b', fontSize: '0.8125rem' }}>{'★'.repeat(review.rating)}</span>
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{timeAgo(review.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      {review.body && (
                        <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{review.body}</p>
                      )}
                      {/* Owner reply */}
                      {review.reply && (
                        <div style={{
                          marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc',
                          borderRadius: '8px', borderLeft: '3px solid #2563eb',
                        }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', marginBottom: '4px' }}>
                            Response from {business.business_name}
                          </div>
                          <p style={{ color: '#374151', fontSize: '0.8125rem', lineHeight: 1.5, margin: 0 }}>
                            {review.reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !showReviewForm && (
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    No reviews yet.{' '}
                    {isLoggedIn && !isOwner ? 'Be the first to review!' : (
                      <Link href="/login" style={{ color: '#2563eb', fontWeight: 500 }}>Log in</Link>
                    )}
                    {!isLoggedIn && ' to leave a review.'}
                  </p>
                )
              )}
            </section>

            {/* Listings */}
            <section ref={el => { sectionRefs.current.listings = el }} style={{ scrollMarginTop: '60px' }}>
              <h2 style={sectionHeading}>
                Listings {listings.length > 0 && <span style={{ color: '#6b7280', fontWeight: 400 }}>({listings.length})</span>}
              </h2>
              {listings.length > 0 ? (
                <ListingGrid listings={listings.map(l => ({ ...l, users: { name: business.name, verified: business.verified } }))} />
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No active listings.</p>
              )}
            </section>
          </div>

          {/* ── RIGHT SIDEBAR (sticky) ── */}
          <div style={{ position: 'sticky', top: '60px', alignSelf: 'start' }}>
            {/* Hours card */}
            {business.hours && (
              <div className="bp-sidebar-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={cardHeading}>Hours</h3>
                  {openStatus.label && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '0.75rem', fontWeight: 600,
                      color: openStatus.isOpen ? '#16a34a' : '#dc2626',
                    }}>
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        backgroundColor: openStatus.isOpen ? '#22c55e' : '#ef4444',
                        display: 'inline-block',
                      }} />
                      {openStatus.isOpen ? 'Open Now' : 'Closed'}
                    </span>
                  )}
                </div>
                {DAYS.map(day => {
                  const h = business.hours?.[day]
                  if (!h) return null
                  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
                  const isToday = day === today
                  return (
                    <div key={day} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '5px 0', fontSize: '0.8125rem',
                      fontWeight: isToday ? 600 : 400,
                      color: isToday ? '#111827' : '#374151',
                    }}>
                      <span>{DAY_FULL[day]}</span>
                      <span style={{ color: h.closed ? '#dc2626' : undefined }}>
                        {h.closed ? 'Closed' : `${formatTime(h.open)} – ${formatTime(h.close)}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Contact card */}
            <div className="bp-sidebar-card">
              <h3 style={cardHeading}>Contact</h3>
              {business.phone && (
                <a href={`tel:${business.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontSize: '0.875rem', marginBottom: '10px', textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                  {business.phone}
                </a>
              )}
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2563eb', fontSize: '0.875rem', marginBottom: '10px', textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  {business.website!.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {business.business_address && (
                <a href={directionsUrl || '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#374151', fontSize: '0.875rem', textDecoration: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {business.business_address}
                </a>
              )}
            </div>

            {/* Social links */}
            {business.social_links && Object.values(business.social_links).some(v => v) && (
              <div className="bp-sidebar-card">
                <h3 style={cardHeading}>Follow</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.entries(business.social_links).map(([platform, value]) => {
                    if (!value) return null
                    const social = socialIcons[platform]
                    if (!social) return null
                    return (
                      <a
                        key={platform}
                        href={social.urlFn(value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '40px', height: '40px', borderRadius: '10px',
                          backgroundColor: `${social.color}10`, color: social.color,
                          transition: 'transform 0.15s',
                        }}
                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      >
                        {social.icon}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Member since */}
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '12px', textAlign: 'center' }}>
              Member since {new Date(business.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* ═══ LIGHTBOX ═══ */}
        {lightboxIdx !== null && allPhotos[lightboxIdx] && (
          <div
            onClick={() => setLightboxIdx(null)}
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
              zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Prev */}
            {allPhotos.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + allPhotos.length) % allPhotos.length) }}
                style={{
                  position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                  width: '48px', height: '48px', cursor: 'pointer', color: '#fff', fontSize: '1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ‹
              </button>
            )}
            <img
              src={allPhotos[lightboxIdx]}
              alt="Full size"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px' }}
            />
            {/* Next */}
            {allPhotos.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % allPhotos.length) }}
                style={{
                  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                  width: '48px', height: '48px', cursor: 'pointer', color: '#fff', fontSize: '1.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ›
              </button>
            )}
            {/* Close */}
            <button
              onClick={() => setLightboxIdx(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
                width: '40px', height: '40px', cursor: 'pointer', color: '#fff', fontSize: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
            {/* Counter */}
            <div style={{
              position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem',
            }}>
              {lightboxIdx + 1} / {allPhotos.length}
            </div>
          </div>
        )}
      </main>
    </PreLaunchGate>
  )
}

// ─── Shared Styles ───

const sectionHeading: React.CSSProperties = {
  fontSize: '1.25rem', fontWeight: 700, color: '#111827',
  marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb',
}

const cardHeading: React.CSSProperties = {
  fontSize: '0.9375rem', fontWeight: 700, color: '#111827', margin: '0 0 12px',
}
