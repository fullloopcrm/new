'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ListingGrid from '@/app/site/nyc-classifieds/_components/ListingGrid'
import SearchAutocomplete from '@/app/site/nyc-classifieds/_components/SearchAutocomplete'
import PreLaunchGate from '@/app/site/nyc-classifieds/_components/PreLaunchGate'
import AlertButton from '@/app/site/nyc-classifieds/_components/AlertButton'

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

const categories = [
  { slug: 'for-sale', name: 'For Sale' },
  { slug: 'housing', name: 'Housing' },
  { slug: 'services', name: 'Services' },
  { slug: 'jobs', name: 'Jobs' },
  { slug: 'community', name: 'Community' },
  { slug: 'gigs', name: 'Gigs' },
  { slug: 'personals', name: 'Personals' },
  { slug: 'pets', name: 'Pets' },
  { slug: 'barter', name: 'Barter' },
  { slug: 'rentals', name: 'Rentals' },
  { slug: 'resumes', name: 'Resumes' },
  { slug: 'tickets', name: 'Tickets' },
]

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance')
  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [searched, setSearched] = useState(false)

  const doSearch = (q: string, cat: string, s: string, p: number) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    const params = new URLSearchParams({ q: q.trim(), sort: s, page: String(p) })
    if (cat) params.set('category', cat)

    // Update URL
    router.replace(`/search?${params}`, { scroll: false })

    fetch(`/api/search?${params}`)
      .then(r => r.json())
      .then(data => {
        setListings(data.listings || [])
        setTotal(data.total || 0)
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      doSearch(q, searchParams.get('category') || '', searchParams.get('sort') || 'relevance', 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = useCallback((q: string) => {
    setQuery(q)
    setPage(1)
    window.__track?.('search', { query: q })
    doSearch(q, category, sort, 1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort])

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Search Free NYC Classifieds</h1>

      <div style={{ marginBottom: '1rem' }}>
        <SearchAutocomplete
          initialQuery={query}
          onSearch={handleSearch}
          placeholder="Search listings..."
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); doSearch(query, e.target.value, sort, 1) }}
          style={selectStyle}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); doSearch(query, category, e.target.value, 1) }}
          style={selectStyle}
        >
          <option value="relevance">Most relevant</option>
          <option value="newest">Newest first</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {searched && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{searchParams.get('q') || query}&rdquo;
          </p>
          <AlertButton keywords={query} category={category || undefined} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Searching...</div>
      ) : (
        <ListingGrid listings={listings} />
      )}

      {total > 24 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button disabled={page <= 1} onClick={() => { setPage(p => p - 1); doSearch(query, category, sort, page - 1) }} style={pageBtnStyle}>Previous</button>
          <span style={{ padding: '0.5rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>Page {page}</span>
          <button disabled={listings.length < 24} onClick={() => { setPage(p => p + 1); doSearch(query, category, sort, page + 1) }} style={pageBtnStyle}>Next</button>
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
