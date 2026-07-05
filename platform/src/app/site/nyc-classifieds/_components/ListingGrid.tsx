'use client'

import ListingCard from './ListingCard'
import ListingRow from './ListingRow'

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

interface Props {
  listings: Listing[]
  mode?: 'grid' | 'list'
  hideCategoryPill?: boolean
}

// Categories that use list view (text-dense, no photos)
const listViewCategories = new Set(['jobs', 'services', 'gigs', 'resumes', 'barter', 'personals'])

export function getDisplayMode(categorySlug?: string): 'grid' | 'list' {
  if (categorySlug && listViewCategories.has(categorySlug)) return 'list'
  return 'grid'
}

export default function ListingGrid({ listings, mode = 'grid', hideCategoryPill = false }: Props) {
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
        No listings found
      </div>
    )
  }

  if (mode === 'list') {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      }}>
        {listings.map(listing => (
          <ListingRow key={listing.id} {...listing} />
        ))}
      </div>
    )
  }

  return (
    <div className="listing-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
      gap: 'var(--sp-4)',
    }}>
      {listings.map(listing => (
        <ListingCard key={listing.id} {...listing} hideCategoryPill={hideCategoryPill} />
      ))}
    </div>
  )
}
