// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ListingGrid, { getDisplayMode } from './ListingGrid'
import PreLaunchGate from './PreLaunchGate'
import AlertButton from './AlertButton'
import { type Category, slugify } from '@/app/site/nyc-classifieds/_lib/data'

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

interface BrowsePageProps {
  title: string
  description?: React.ReactNode

  breadcrumbs: { label: string; href: string }[]
  category?: Category
  subcategorySlug?: string
  borough?: string
  neighborhood?: string
  subcategories?: string[]
  categorySlug?: string
  faqs?: { question: string; answer: string }[]
}

// Categories where price sort doesn't make sense
const hidePriceSortCategories = new Set(['jobs', 'services', 'gigs', 'resumes', 'personals', 'barter'])

export default function BrowsePage({
  title,
  description,
  breadcrumbs,
  category,
  subcategorySlug,
  borough,
  neighborhood,
  subcategories,
  categorySlug,
  faqs,
}: BrowsePageProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [activeSub, setActiveSub] = useState(subcategorySlug || '')
  const [page, setPage] = useState(1)

  const effectiveCategorySlug = categorySlug || category?.slug
  const subs = subcategories || category?.subs || []
  const displayMode = getDisplayMode(effectiveCategorySlug)
  const showPriceSort = !hidePriceSortCategories.has(effectiveCategorySlug || '')
  const useDropdown = subs.length > 10

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ sort, page: String(page) })
    if (effectiveCategorySlug) params.set('category', effectiveCategorySlug)
    if (activeSub) params.set('subcategory', activeSub)
    if (borough) params.set('borough', borough)
    if (neighborhood) params.set('neighborhood', neighborhood)

    fetch(`/api/listings?${params}`)
      .then(r => r.json())
      .then(data => {
        setListings(data.listings || [])
        setTotal(data.total || 0)
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }, [effectiveCategorySlug, activeSub, borough, neighborhood, sort, page])

  return (
    <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '24px 24px 32px' }}>
      {/* Breadcrumbs — always visible for SEO */}
      <nav style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: '#6b7280', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#1a56db', textDecoration: 'none' }}>Home</Link>
        {breadcrumbs.map((bc, i) => (
          <span key={i}>
            <span style={{ margin: '0 2px' }}>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: '#111827', fontWeight: 500 }}>{bc.label}</span>
            ) : (
              <Link href={bc.href} style={{ color: '#1a56db', textDecoration: 'none' }}>{bc.label}</Link>
            )}
          </span>
        ))}
      </nav>

      {/* H1 — always visible for SEO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: description ? '8px' : '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>{title}</h1>
          <p style={{ color: '#6b7280', fontSize: '0.8125rem', marginTop: '2px' }}>
            {total} listing{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertButton category={effectiveCategorySlug} subcategory={activeSub || undefined} />
          <Link href="/listings/new" style={{
            backgroundColor: '#1a56db',
            color: '#ffffff',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}>
            Post
          </Link>
        </div>
      </div>

      {/* Description — SEO content */}
      {description && description}

      <PreLaunchGate>
      {/* Subcategory filter + sort */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        {subs.length > 0 && !subcategorySlug && (
          useDropdown ? (
            <select
              value={activeSub}
              onChange={e => { setActiveSub(e.target.value); setPage(1) }}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.8125rem',
                backgroundColor: '#fff',
                color: '#374151',
                outline: 'none',
              }}
            >
              <option value="">All subcategories</option>
              {subs.map(s => (
                <option key={s} value={slugify(s)}>{s}</option>
              ))}
            </select>
          ) : (
            <>
              <button
                onClick={() => { setActiveSub(''); setPage(1) }}
                style={{
                  ...chipStyle,
                  backgroundColor: !activeSub ? '#1a56db' : 'transparent',
                  color: !activeSub ? '#fff' : '#374151',
                  border: !activeSub ? '1px solid #1a56db' : '1px solid #e5e7eb',
                }}
              >
                All
              </button>
              {subs.map(s => {
                const sSlug = slugify(s)
                const active = activeSub === sSlug
                return (
                  <button
                    key={s}
                    onClick={() => { setActiveSub(active ? '' : sSlug); setPage(1) }}
                    style={{
                      ...chipStyle,
                      backgroundColor: active ? '#1a56db' : 'transparent',
                      color: active ? '#fff' : '#374151',
                      border: active ? '1px solid #1a56db' : '1px solid #e5e7eb',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </>
          )
        )}
        <div style={{ marginLeft: 'auto' }}>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1) }}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              fontSize: '0.8125rem',
              backgroundColor: '#fff',
              color: '#374151',
              outline: 'none',
            }}
          >
            <option value="newest">Newest</option>
            {showPriceSort && <option value="price-low">Price: Low → High</option>}
            {showPriceSort && <option value="price-high">Price: High → Low</option>}
          </select>
        </div>
      </div>

      {/* Listings */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</div>
      ) : listings.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px dashed #e5e7eb',
          borderRadius: '8px',
        }}>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: '12px' }}>
            No listings yet in {title.toLowerCase()}.
          </p>
          <Link href="/listings/new" style={{
            color: '#1a56db',
            fontSize: '0.875rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}>
            Be the first to post →
          </Link>
        </div>
      ) : (
        <ListingGrid
          listings={listings}
          mode={displayMode}
          hideCategoryPill={!!effectiveCategorySlug}
        />
      )}

      {/* Pagination */}
      {total > 24 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ ...pageBtnStyle, opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          <span style={{ padding: '8px 12px', color: '#6b7280', fontSize: '0.8125rem' }}>
            Page {page}
          </span>
          <button
            disabled={listings.length < 24}
            onClick={() => setPage(p => p + 1)}
            style={{ ...pageBtnStyle, opacity: listings.length < 24 ? 0.4 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
      </PreLaunchGate>

      {/* Visible subcategory links for SEO — always rendered */}
      {subs.length > 0 && !subcategorySlug && (
        <section style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
            Browse {category?.name || 'All'} subcategories
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {subs.map(s => (
              <Link
                key={s}
                href={`/listings/${effectiveCategorySlug}/${slugify(s)}`}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.8125rem',
                  color: '#1a56db',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {s}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Visible FAQ section for SEO — always rendered */}
      {faqs && faqs.length > 0 && (
        <section style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, i) => (
              <div key={i}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                  {faq.question}
                </h3>
                <p data-speakable style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

const chipStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const pageBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  color: '#374151',
  fontWeight: 500,
}
