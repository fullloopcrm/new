// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VerifiedBadge from '@/app/site/nyc-classifieds/_components/VerifiedBadge'
import PreLaunchGate from '@/app/site/nyc-classifieds/_components/PreLaunchGate'
import { categoryBySlug } from '@/app/site/nyc-classifieds/_lib/data'

interface Listing {
  id: number
  title: string
  description: string | null
  price: number | null
  images: string[]
  location: string | null
  category_slug: string
  subcategory_slug: string | null
  status: string
  created_at: string
  user_id: number
  users: { id: number; name: string; verified: boolean; created_at: string }
}

export default function ListingDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: number } | null>(null)

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setListing(null)
        else setListing(data)
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false))

    fetch('/api/auth')
      .then(r => r.json())
      .then(d => { if (d.authenticated) setCurrentUser({ id: d.user.id }) })
      .catch(() => {})
  }, [id])

  const sendMessage = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing!.id,
          recipient_id: listing!.user_id,
          content: message,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setSent(true)
      setMessage('')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>
  if (!listing) return <main style={{ padding: '3rem', textAlign: 'center' }}><h1>Listing not found</h1></main>

  const isOwner = currentUser && currentUser.id === listing.user_id
  const isActive = listing.status === 'active'
  const isSold = listing.status === 'sold'
  const isExpired = listing.status === 'expired'
  const catName = categoryBySlug[listing.category_slug]?.name || listing.category_slug

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <button onClick={() => router.back()} style={{
        background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer',
        fontSize: '0.875rem', marginBottom: '1rem', padding: 0,
      }}>
        &larr; Back
      </button>

      {(isSold || isExpired) && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: isSold ? '#fef3c7' : '#f3f4f6',
          border: `1px solid ${isSold ? '#fbbf24' : '#d1d5db'}`,
        }}>
          <p style={{ fontWeight: 600, margin: '0 0 4px 0', color: isSold ? '#92400e' : '#374151' }}>
            {isSold ? 'This listing has been sold.' : 'This listing has expired.'}
          </p>
          <Link href={`/listings/${listing.category_slug}`} style={{ fontSize: '0.875rem', color: '#2563eb' }}>
            Browse more {catName} listings &rarr;
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: listing.images.length ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        {/* Images */}
        {listing.images.length > 0 && (
          <div>
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              backgroundColor: '#f1f5f9',
              marginBottom: '0.75rem',
            }}>
              <img
                src={listing.images[currentImage]}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {listing.images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', overflow: 'auto' }}>
                {listing.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    style={{
                      width: '60px', height: '60px', borderRadius: '0.5rem',
                      overflow: 'hidden', border: i === currentImage ? '2px solid #2563eb' : '2px solid transparent',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{listing.title}</h1>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginBottom: '1rem' }}>
            {listing.price != null ? `$${(listing.price / 100).toLocaleString()}` : 'Free / Negotiable'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 600, color: '#475569',
            }}>
              {listing.users.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{listing.users.name || 'Anonymous'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {listing.users.verified && <VerifiedBadge />}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Member since {new Date(listing.users.created_at).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {listing.location && (
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
              Location: {listing.location}
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
            Posted {new Date(listing.created_at).toLocaleDateString()}
          </div>

          {listing.description && (
            <div style={{ lineHeight: 1.6, color: '#334155', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
              {listing.description}
            </div>
          )}

          {/* Actions */}
          {!isOwner && currentUser && isActive && (
            <div>
              {!showMessage && !sent && (
                <button onClick={() => { setShowMessage(true); window.__track?.('listing_contact_click', { listing_id: listing!.id }) }} style={{
                  width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                  border: 'none', backgroundColor: '#2563eb', color: '#fff',
                  fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                }}>
                  Message Seller
                </button>
              )}

              {showMessage && !sent && (
                <div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={`Hi, I'm interested in "${listing.title}"...`}
                    rows={3}
                    style={{
                      width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                      border: '1px solid #e2e8f0', fontSize: '0.875rem',
                      resize: 'vertical', outline: 'none', marginBottom: '0.75rem',
                    }}
                  />
                  <button onClick={sendMessage} disabled={sending || !message.trim()} style={{
                    width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                    border: 'none', backgroundColor: '#2563eb', color: '#fff',
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  }}>
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              )}

              {sent && (
                <div style={{
                  padding: '1rem', borderRadius: '0.5rem',
                  backgroundColor: '#f0fdf4', color: '#16a34a',
                  textAlign: 'center', fontWeight: 600,
                }}>
                  Message sent!
                </div>
              )}
            </div>
          )}

          {!currentUser && isActive && (
            <a href="/signup" style={{
              display: 'block', textAlign: 'center', padding: '0.75rem',
              borderRadius: '0.5rem', backgroundColor: '#2563eb', color: '#fff',
              fontWeight: 600,
            }}>
              Sign up to message seller
            </a>
          )}

          {isOwner && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => router.push(`/account`)} style={{
                flex: 1, padding: '0.75rem', borderRadius: '0.5rem',
                border: '1px solid #e2e8f0', backgroundColor: '#fff',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              }}>
                Edit Listing
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
    </PreLaunchGate>
  )
}
