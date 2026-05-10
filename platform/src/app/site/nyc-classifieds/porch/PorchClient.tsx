// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  boroughs,
  boroughBySlug,
  findNeighborhood,
  neighborhoodSlug as toNeighborhoodSlug,
  porchPostTypes,
  porchPostTypeBySlug,
  slugify,
} from '@/app/site/nyc-classifieds/_lib/data'

// ─── Types ───

interface PorchUser {
  id: number
  name: string
  verified: boolean
  selfie_url: string | null
}

interface PorchPost {
  id: number
  user_id: number
  post_type: string
  title: string
  body: string
  borough_slug: string
  neighborhood_slug: string
  pinned: boolean
  expires_at: string
  created_at: string
  updated_at: string
  reply_count: number
  users: PorchUser
}

interface AuthUser {
  id: number
  name: string
  verified: boolean
}

interface PorchClientProps {
  boroughSlug?: string
  neighborhoodSlug?: string
  postTypeSlug?: string
}

// ─── Helpers ───

// ─── Verified badge ───

function VerifiedBadge({ size = 14 }: { size?: number }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!show) return
    const close = () => setShow(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [show])
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show) }}
      >
        <circle cx="12" cy="12" r="10" fill="#1a56db" />
        <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {show && (
        <span
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          style={{
            position: 'absolute',
            top: size + 4,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#111827',
            color: '#ffffff',
            fontSize: '0.6875rem',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            zIndex: 50,
            lineHeight: 1.3,
          }}
        >
          Identity verified via live photo with GPS at registered NYC address
        </span>
      )}
    </span>
  )
}

const AVATAR_COLORS = ['#1a56db', '#059669', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#ea580c']

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ user, size = 36 }: { user: { name: string; selfie_url: string | null }; size?: number }) {
  if (user.selfie_url) {
    return (
      <img
        src={user.selfie_url}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }
  const color = getAvatarColor(user.name)
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.42,
      fontWeight: 600,
      color: '#ffffff',
      flexShrink: 0,
    }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function getNeighborhoodDisplayName(boroughSlug: string, nhSlug: string): string {
  const nh = findNeighborhood(boroughSlug, nhSlug)
  return nh ? nh.name : nhSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getBoroughDisplayName(bSlug: string): string {
  const b = boroughBySlug[bSlug]
  return b ? b.name : bSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Component ───

export default function PorchClient({ boroughSlug, neighborhoodSlug, postTypeSlug }: PorchClientProps) {
  const router = useRouter()

  const [posts, setPosts] = useState<PorchPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [activePostType, setActivePostType] = useState(postTypeSlug || '')
  const [showNewPost, setShowNewPost] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // New post form state
  const [formPostType, setFormPostType] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formBorough, setFormBorough] = useState(boroughSlug || '')
  const [formNeighborhood, setFormNeighborhood] = useState(neighborhoodSlug || '')
  const [formError, setFormError] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) setUser(data.user)
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  const fetchFeed = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (boroughSlug) params.set('borough', boroughSlug)
    if (neighborhoodSlug) params.set('neighborhood', neighborhoodSlug)
    if (activePostType) params.set('post_type', activePostType)

    fetch(`/api/porch?${params}`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [boroughSlug, neighborhoodSlug, activePostType, page])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  const handlePostTypeFilter = (slug: string) => {
    setActivePostType(slug === activePostType ? '' : slug)
    setPage(1)
  }

  const handleSubmitPost = async () => {
    setFormError('')
    if (!user) { setFormError('You must be logged in to post.'); return }
    if (!formPostType) { setFormError('Please select a post type.'); return }
    if (!formTitle.trim()) { setFormError('Title is required.'); return }
    if (formTitle.trim().length > 100) { setFormError('Title must be 100 characters or fewer.'); return }
    if (!formBody.trim()) { setFormError('Body is required.'); return }
    if (formBody.trim().length > 500) { setFormError('Body must be 500 characters or fewer.'); return }
    if (!formBorough) { setFormError('Please select a borough.'); return }
    if (!formNeighborhood) { setFormError('Please select a neighborhood.'); return }

    setFormSubmitting(true)
    try {
      const res = await fetch('/api/porch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_type: formPostType,
          title: formTitle.trim(),
          body: formBody.trim(),
          borough_slug: formBorough,
          neighborhood_slug: formNeighborhood,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to create post.'); setFormSubmitting(false); return }

      setFormPostType('')
      setFormTitle('')
      setFormBody('')
      setFormError('')
      setShowNewPost(false)
      setPage(1)
      fetchFeed()
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Breadcrumbs
  const breadcrumbs: { label: string; href: string }[] = [{ label: 'The Porch', href: '/porch' }]
  if (boroughSlug) breadcrumbs.push({ label: getBoroughDisplayName(boroughSlug), href: `/porch/${boroughSlug}` })
  if (boroughSlug && neighborhoodSlug) breadcrumbs.push({ label: getNeighborhoodDisplayName(boroughSlug, neighborhoodSlug), href: `/porch/${boroughSlug}/${neighborhoodSlug}` })
  if (postTypeSlug) {
    const pt = porchPostTypeBySlug[postTypeSlug]
    if (pt) breadcrumbs.push({ label: pt.name, href: `/porch/${boroughSlug}/${neighborhoodSlug}/${postTypeSlug}` })
  }

  const subtitle = neighborhoodSlug && boroughSlug
    ? `${getNeighborhoodDisplayName(boroughSlug, neighborhoodSlug)}, ${getBoroughDisplayName(boroughSlug)}`
    : boroughSlug ? getBoroughDisplayName(boroughSlug) : 'NYC-wide'

  const formBoroughData = boroughBySlug[formBorough]
  const formNeighborhoods = formBoroughData?.neighborhoods || []

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 32px', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Breadcrumbs */}
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

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669' }} />
            The Porch — NYC Neighborhood Community Board
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.8125rem', marginTop: '2px' }}>
            {subtitle} &middot; {total} post{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            if (!user) { router.push('/login'); return }
            setShowNewPost(!showNewPost)
          }}
          style={{
            backgroundColor: '#1a56db',
            color: '#ffffff',
            padding: '8px 20px',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          New Post
        </button>
      </div>

      {/* New Post Form */}
      {showNewPost && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '16px',
        }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Create a Post</h2>

          {/* Post type picker — no emojis */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
              Post Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
              {porchPostTypes.map(pt => {
                const isSelected = formPostType === pt.slug
                return (
                  <button
                    key={pt.slug}
                    onClick={() => setFormPostType(pt.slug)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: isSelected ? '2px solid #1a56db' : '1px solid #e5e7eb',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#1a56db' : '#374151',
                    }}
                  >
                    {pt.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }}>
              Title <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value.slice(0, 100))}
              placeholder="What's on your mind?"
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                fontSize: '0.875rem', color: '#111827', outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right', marginTop: '2px' }}>{formTitle.length}/100</div>
          </div>

          {/* Body */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }}>
              Details <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={formBody}
              onChange={e => setFormBody(e.target.value.slice(0, 500))}
              placeholder="Share more details..."
              rows={4}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                fontSize: '0.875rem', color: '#111827', outline: 'none', resize: 'vertical',
                fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textAlign: 'right', marginTop: '2px' }}>{formBody.length}/500</div>
          </div>

          {/* Porch Rules */}
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '0.75rem',
            color: '#374151',
            lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Porch Rules</div>
            <div style={{ color: '#059669' }}>&#10003; Be helpful to your neighbors</div>
            <div style={{ color: '#059669' }}>&#10003; Keep it local and relevant</div>
            <div style={{ color: '#dc2626' }}>&#10007; No politics or arguments</div>
            <div style={{ color: '#dc2626' }}>&#10007; No business promotion (use Services)</div>
            <div style={{ color: '#dc2626' }}>&#10007; No complaints about neighbors</div>
            <div style={{ color: '#dc2626' }}>&#10007; No cursing or bullying</div>
            <div style={{ fontWeight: 600, marginTop: '6px', color: '#111827' }}>Violations = permanent ban. No warnings.</div>
          </div>

          {/* Borough + Neighborhood */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }}>
                Borough <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={formBorough}
                onChange={e => { setFormBorough(e.target.value); setFormNeighborhood('') }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                  fontSize: '0.875rem', backgroundColor: '#fff', color: '#374151', outline: 'none',
                }}
              >
                <option value="">Select borough</option>
                {boroughs.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '4px', display: 'block' }}>
                Neighborhood <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={formNeighborhood}
                onChange={e => setFormNeighborhood(e.target.value)}
                disabled={!formBorough}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                  fontSize: '0.875rem', backgroundColor: !formBorough ? '#f9fafb' : '#fff', color: '#374151', outline: 'none',
                }}
              >
                <option value="">Select neighborhood</option>
                {formNeighborhoods.map(n => <option key={n} value={toNeighborhoodSlug(n)}>{n}</option>)}
              </select>
            </div>
          </div>

          {formError && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
              padding: '10px 14px', marginBottom: '12px', fontSize: '0.8125rem', color: '#dc2626',
            }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSubmitPost}
              disabled={formSubmitting}
              style={{
                backgroundColor: formSubmitting ? '#6b7280' : '#1a56db',
                color: '#ffffff', padding: '8px 24px', borderRadius: '6px',
                fontSize: '0.8125rem', fontWeight: 600, border: 'none',
                cursor: formSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {formSubmitting ? 'Posting...' : 'Post'}
            </button>
            <button
              onClick={() => { setShowNewPost(false); setFormError('') }}
              style={{
                backgroundColor: '#ffffff', color: '#374151', padding: '8px 24px', borderRadius: '6px',
                fontSize: '0.8125rem', fontWeight: 500, border: '1px solid #e5e7eb', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter chips — text only, no emojis, blue active */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button
          onClick={() => handlePostTypeFilter('')}
          style={{
            ...chipStyle,
            backgroundColor: !activePostType ? '#1a56db' : 'transparent',
            color: !activePostType ? '#fff' : '#374151',
            border: !activePostType ? '1px solid #1a56db' : '1px solid #e5e7eb',
          }}
        >
          All
        </button>
        {porchPostTypes.map(pt => {
          const active = activePostType === pt.slug
          return (
            <button
              key={pt.slug}
              onClick={() => handlePostTypeFilter(pt.slug)}
              style={{
                ...chipStyle,
                backgroundColor: active ? '#1a56db' : 'transparent',
                color: active ? '#fff' : '#374151',
                border: active ? '1px solid #1a56db' : '1px solid #e5e7eb',
              }}
            >
              {pt.name}
            </button>
          )
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</div>
      ) : posts.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: '8px' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: '12px' }}>
            No posts yet{neighborhoodSlug && boroughSlug ? ` in ${getNeighborhoodDisplayName(boroughSlug, neighborhoodSlug)}` : ''}.
          </p>
          <button
            onClick={() => setShowNewPost(true)}
            style={{ color: '#1a56db', fontSize: '0.875rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Be the first to post on The Porch
          </button>
        </div>
      ) : (
        <div>
          {posts.map(post => {
            const pt = porchPostTypeBySlug[post.post_type]
            const postSlug = slugify(post.title)
            const postUrl = `/porch/post/${post.id}/${postSlug}`
            const nhDisplay = getNeighborhoodDisplayName(post.borough_slug, post.neighborhood_slug)
            const userObj = post.users

            return (
              <Link
                key={post.id}
                href={postUrl}
                style={{
                  display: 'block',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '8px',
                  textDecoration: 'none',
                  position: 'relative',
                  transition: 'box-shadow 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Pinned — subtle gray */}
                {post.pinned && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                    Pinned
                  </span>
                )}

                {/* Top row: type, neighborhood, time — no emojis */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ color: pt?.color || '#6b7280', fontWeight: 600 }}>
                    {pt?.name || post.post_type}
                  </span>
                  <span style={{ color: '#d1d5db' }}>&middot;</span>
                  <span style={{ color: '#6b7280' }}>{nhDisplay}</span>
                  <span style={{ color: '#d1d5db' }}>&middot;</span>
                  <span style={{ color: '#9ca3af' }}>{getTimeAgo(post.created_at)}</span>
                </div>

                {/* Title */}
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '3px', lineHeight: 1.3 }}>
                  {post.title}
                </div>

                {/* Body preview — 2 line clamp for tighter cards */}
                <div style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  marginBottom: '8px',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {post.body}
                </div>

                {/* Bottom: avatar + name + verified + reply count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar user={userObj || { name: 'Anonymous', selfie_url: null }} size={32} />
                    <span
                      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                      style={{ fontSize: '0.8125rem', color: '#374151', fontWeight: 500, cursor: 'pointer' }}
                    >
                      {userObj?.name || 'Anonymous'}
                    </span>
                    {userObj?.verified && <VerifiedBadge size={14} />}
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                    {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && posts.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ ...pageBtnStyle, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ padding: '8px 12px', color: '#6b7280', fontSize: '0.8125rem', display: 'flex', alignItems: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ ...pageBtnStyle, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'default' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}

// ─── Shared styles ───

const chipStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  background: 'none',
}

const pageBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  fontSize: '0.8125rem',
  color: '#374151',
  fontWeight: 500,
}
