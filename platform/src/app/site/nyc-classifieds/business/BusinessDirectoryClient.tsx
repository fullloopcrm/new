// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SearchAutocomplete from '@/app/site//_components/SearchAutocomplete'
import { businessCategories, boroughs, businessProfileUrl } from '@/app/site/nyc-classifieds/_lib/data'
import PreLaunchGate from '@/app/site//_components/PreLaunchGate'

interface Business {
  id: number
  business_name: string
  business_slug: string
  business_category: string | null
  business_description: string | null
  selfie_url: string | null
  verified: boolean
  service_area: string[] | null
  phone: string | null
  website: string | null
}

export default function BusinessDirectoryClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [borough, setBorough] = useState(searchParams.get('borough') || '')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'))

  const doSearch = useCallback((q: string, cat: string, bor: string, p: number) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (cat) params.set('category', cat)
    if (bor) params.set('borough', bor)
    if (p > 1) params.set('page', String(p))

    const qs = params.toString()
    router.replace(`/business${qs ? `?${qs}` : ''}`, { scroll: false })

    fetch(`/api/businesses${qs ? `?${qs}` : ''}`)
      .then(r => r.json())
      .then(data => {
        setBusinesses(data.businesses || [])
        setTotal(data.total || 0)
      })
      .catch(() => setBusinesses([]))
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => {
    doSearch(
      searchParams.get('q') || '',
      searchParams.get('category') || '',
      searchParams.get('borough') || '',
      parseInt(searchParams.get('page') || '1'),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    setPage(1)
    doSearch(q, category, borough, 1)
  }, [category, borough, doSearch])

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>NYC Business Directory</h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Find local businesses in New York City
      </p>

      <div className="homepage-top" style={{ margin: 0, marginBottom: '1rem' }}>
        <div className="homepage-top-left">
          <p style={{
            fontSize: '0.8125rem',
            color: '#475569',
            lineHeight: 1.6,
            marginBottom: '12px',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            We just launched this directory to help NYC small businesses get discovered — completely
            free. No fees, no catches. Every business that signs up gets a profile page, shows up in search,
            and is visible to New Yorkers browsing our classifieds every day. But it only works if you use
            it. <Link href="/signup" style={{ color: '#1a56db', fontWeight: 600 }}>Sign up as a business</Link>,
            claim your spot, and help us build something real for the neighborhood.
          </p>
          <SearchAutocomplete
            initialQuery={query}
            onSearch={handleSearch}
            placeholder="Search businesses..."
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); doSearch(query, e.target.value, borough, 1) }}
          style={selectStyle}
        >
          <option value="">All categories</option>
          {businessCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={borough}
          onChange={e => { setBorough(e.target.value); setPage(1); doSearch(query, category, e.target.value, 1) }}
          style={selectStyle}
        >
          <option value="">All boroughs</option>
          {boroughs.map(b => (
            <option key={b.slug} value={b.slug}>{b.name}</option>
          ))}
        </select>
      </div>

      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
        {total} business{total !== 1 ? 'es' : ''} found
      </p>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
      ) : businesses.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '0.5rem' }}>No businesses listed yet.</p>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
            Are you a local business?{' '}
            <Link href="/signup" style={{ color: '#1a56db', fontWeight: 600 }}>Sign up as a business</Link>
            {' '}to get listed for free.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          {businesses.map(biz => (
            <Link
              key={biz.id}
              href={businessProfileUrl(biz.business_slug, biz.business_category)}
              style={{
                display: 'block',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1rem',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {biz.selfie_url ? (
                  <Image
                    src={biz.selfie_url}
                    alt={biz.business_name}
                    width={48}
                    height={48}
                    style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    flexShrink: 0,
                  }}>
                    {biz.business_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{biz.business_name}</span>
                    {biz.verified && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#2563eb" style={{ flexShrink: 0 }}>
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )}
                  </div>
                  {biz.business_category && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '4px',
                      padding: '2px 8px',
                      fontSize: '0.75rem',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '9999px',
                      color: '#475569',
                    }}>
                      {biz.business_category}
                    </span>
                  )}
                </div>
              </div>
              {biz.business_description && (
                <p style={{
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  marginTop: '0.5rem',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {biz.business_description.length > 100
                    ? biz.business_description.slice(0, 100) + '...'
                    : biz.business_description}
                </p>
              )}
              {biz.service_area && biz.service_area.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {biz.service_area.slice(0, 3).map(area => (
                    <span key={area} style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      color: '#64748b',
                    }}>
                      {area}
                    </span>
                  ))}
                  {biz.service_area.length > 3 && (
                    <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                      +{biz.service_area.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {total > 24 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            disabled={page <= 1}
            onClick={() => { setPage(p => p - 1); doSearch(query, category, borough, page - 1) }}
            style={pageBtnStyle}
          >
            Previous
          </button>
          <span style={{ padding: '0.5rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
            Page {page}
          </span>
          <button
            disabled={businesses.length < 24}
            onClick={() => { setPage(p => p + 1); doSearch(query, category, borough, page + 1) }}
            style={pageBtnStyle}
          >
            Next
          </button>
        </div>
      )}
    </main>
    </PreLaunchGate>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  fontSize: '0.875rem',
  backgroundColor: '#fff',
  outline: 'none',
}

const pageBtnStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  border: '1px solid #e2e8f0',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '0.875rem',
}
