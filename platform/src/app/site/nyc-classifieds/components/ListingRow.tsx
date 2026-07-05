'use client'

import Link from 'next/link'

interface ListingRowProps {
  id: number
  title: string
  price: number | null
  location: string | null
  category_slug: string
  created_at: string
  users: { name: string; verified: boolean; selfie_url?: string | null }
}

// Categories where price means salary/pay rate
const salaryCategories = new Set(['jobs', 'gigs'])
// Categories where price should be hidden entirely
const hidePriceCategories = new Set(['services', 'resumes', 'personals'])

function formatPrice(price: number | null, categorySlug: string): string | null {
  if (hidePriceCategories.has(categorySlug)) return null
  if (price == null || price === 0) {
    // Only show "Free" for sale-type categories
    if (categorySlug === 'barter') return null
    return null
  }
  if (salaryCategories.has(categorySlug)) {
    const dollars = price / 100
    return dollars >= 1000 ? `$${(dollars / 1000).toFixed(0)}k` : `$${dollars.toLocaleString()}/hr`
  }
  return `$${(price / 100).toLocaleString()}`
}

const COLORS = ['#2563eb','#dc2626','#059669','#d97706','#7c3aed','#db2777','#0891b2','#ea580c']
function hashColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
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

export default function ListingRow({ id, title, price, location, category_slug, created_at, users }: ListingRowProps) {
  const timeAgo = getTimeAgo(created_at)
  const priceStr = formatPrice(price, category_slug)

  return (
    <Link href={`/listings/${category_slug}/${id}`} style={{
      display: 'block',
      padding: '12px 14px',
      borderBottom: '1px solid #f3f4f6',
      textDecoration: 'none',
      transition: 'background-color 100ms ease',
    }}
    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Title */}
      <div style={{
        fontWeight: 600,
        fontSize: '0.9375rem',
        color: '#111827',
        marginBottom: '3px',
        lineHeight: 1.3,
      }}>
        {title}
      </div>

      {/* Location · Price · Type */}
      <div style={{
        fontSize: '0.8125rem',
        color: '#6b7280',
        marginBottom: '4px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0 6px',
      }}>
        {location && <span>{location}</span>}
        {location && priceStr && <span>·</span>}
        {priceStr && <span style={{ color: '#111827', fontWeight: 500 }}>{priceStr}</span>}
      </div>

      {/* User info + time */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        color: '#9ca3af',
      }}>
        {users.selfie_url ? (
          <img src={users.selfie_url} alt="" style={{
            width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
          }} />
        ) : (
          <span style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            backgroundColor: hashColor(users.name),
            color: '#fff', fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {users.name[0]?.toUpperCase()}
          </span>
        )}
        <span>{users.name}</span>
        {users.verified && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="12" fill="#2563eb"/>
            <path d="M7.5 12.5l3 3 6-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        <span>·</span>
        <span>{timeAgo}</span>
      </div>
    </Link>
  )
}
