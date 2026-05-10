// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import ListingGrid from '@/app/site/nyc-classifieds/_components/ListingGrid'

interface Listing {
  id: number
  title: string
  price: number | null
  images: string[]
  location: string | null
  category_slug: string
  created_at: string
  users: { name: string; verified: boolean; selfie_url?: string | null }
}

export default function HomeListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/listings?page=1')
      .then(r => r.json())
      .then(d => setListings(d.listings || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ padding: 'var(--sp-12)', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>Loading...</div>
  }

  if (listings.length === 0) {
    return (
      <div style={{
        padding: 'var(--sp-12)',
        textAlign: 'center',
        color: 'var(--gray-400)',
        border: '1px dashed var(--gray-200)',
        borderRadius: '8px',
        fontSize: '0.875rem',
      }}>
        No listings yet. Be the first to post!
      </div>
    )
  }

  return <ListingGrid listings={listings} />
}
