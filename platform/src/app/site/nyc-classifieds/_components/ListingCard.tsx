'use client'

import Link from 'next/link'

interface ListingCardProps {
  id: number
  title: string
  price: number | null
  images: string[]
  location: string | null
  category_slug: string
  created_at: string
  users: { name: string; verified: boolean; selfie_url?: string | null }
  hideCategoryPill?: boolean
}

const categoryColors: Record<string, string> = {
  'for-sale': 'var(--cat-for-sale)',
  'housing': 'var(--cat-housing)',
  'jobs': 'var(--cat-jobs)',
  'services': 'var(--cat-services)',
  'gigs': 'var(--cat-gigs)',
  'community': 'var(--cat-community)',
  'personals': 'var(--cat-personals)',
  'pets': 'var(--cat-pets)',
  'barter': 'var(--cat-barter)',
  'rentals': 'var(--cat-rentals)',
  'resumes': 'var(--cat-resumes)',
  'tickets': 'var(--cat-community)',
}

const COLORS = ['#2563eb','#dc2626','#059669','#d97706','#7c3aed','#db2777','#0891b2','#ea580c']
function hashColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function ListingCard({ id, title, price, images, location, category_slug, created_at, users, hideCategoryPill = false }: ListingCardProps) {
  const timeAgo = getTimeAgo(created_at)
  const catColor = categoryColors[category_slug] || 'var(--gray-500)'

  return (
    <Link href={`/listings/${category_slug}/${id}`} style={{
      display: 'block',
      border: '1px solid var(--gray-200)',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: 'var(--white)',
      transition: 'box-shadow 150ms ease',
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '4/3',
        backgroundColor: 'var(--gray-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {images[0] ? (
          <img
            src={images[0]}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: 'var(--gray-400)', fontSize: '1.5rem' }}>&#128247;</span>
        )}
        {/* Category pill — hidden when already on that category page */}
        {!hideCategoryPill && (
          <span style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            fontSize: '0.6875rem',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--white)',
            color: catColor,
            border: `1px solid ${catColor}20`,
          }}>
            {category_slug.replace(/-/g, ' ')}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0.75rem' }}>
        <div style={{
          fontWeight: 600,
          fontSize: '1rem',
          color: price === 0 || price == null ? 'var(--green-600)' : 'var(--gray-900)',
          marginBottom: '0.125rem',
        }}>
          {price != null && price > 0 ? `$${(price / 100).toLocaleString()}` : 'Free'}
        </div>
        <div style={{
          fontSize: '0.875rem',
          color: 'var(--gray-700)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: '0.375rem',
          lineHeight: 1.4,
        }}>
          {title}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--gray-500)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {/* Avatar */}
            {users.selfie_url ? (
              <img src={users.selfie_url} alt="" style={{
                width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
              }} />
            ) : (
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                backgroundColor: hashColor(users.name),
                color: '#fff', fontSize: '10px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {users.name[0]?.toUpperCase()}
              </span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {users.name}
            </span>
            {users.verified && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="12" fill="#2563eb"/>
                <path d="M7.5 12.5l3 3 6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span style={{ flexShrink: 0, marginLeft: '8px' }}>{timeAgo}</span>
        </div>
      </div>
    </Link>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}
