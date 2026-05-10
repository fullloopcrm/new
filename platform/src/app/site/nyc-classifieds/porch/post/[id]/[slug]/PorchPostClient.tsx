// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  boroughBySlug,
  findNeighborhood,
  porchPostTypeBySlug,
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
  users: PorchUser
}

interface PorchReply {
  id: number
  post_id: number
  user_id: number
  body: string
  helpful_count: number
  created_at: string
  users: PorchUser
  user_voted_helpful?: boolean
}

interface AuthUser {
  id: number
  name: string
  verified: boolean
}

interface PorchPostClientProps {
  postId: string
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

export default function PorchPostClient({ postId }: PorchPostClientProps) {
  const [post, setPost] = useState<PorchPost | null>(null)
  const [replies, setReplies] = useState<PorchReply[]>([])
  const [userVotes, setUserVotes] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [replyBody, setReplyBody] = useState('')
  const [replyError, setReplyError] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [helpfulLoading, setHelpfulLoading] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) setUser(data.user)
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  // Fetch post + replies from single-post endpoint
  const fetchPost = useCallback(() => {
    setLoading(true)
    fetch(`/api/porch/${postId}`)
      .then(r => r.json())
      .then(data => {
        setPost(data.post || null)
        setReplies(data.replies || [])
        setUserVotes(data.userVotes || [])
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [postId])

  useEffect(() => { fetchPost() }, [fetchPost])

  // Refresh replies only
  const refreshReplies = useCallback(() => {
    fetch(`/api/porch/${postId}`)
      .then(r => r.json())
      .then(data => {
        setReplies(data.replies || [])
        setUserVotes(data.userVotes || [])
      })
      .catch(() => {})
  }, [postId])

  const handleSubmitReply = async () => {
    setReplyError('')
    if (!user) { setReplyError('You must be logged in to reply.'); return }
    if (!replyBody.trim()) { setReplyError('Reply cannot be empty.'); return }
    if (replyBody.trim().length > 300) { setReplyError('Reply must be 300 characters or fewer.'); return }

    setReplySubmitting(true)
    try {
      const res = await fetch(`/api/porch/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setReplyError(data.error || 'Failed to post reply.'); setReplySubmitting(false); return }
      setReplyBody('')
      setReplyError('')
      refreshReplies()
    } catch {
      setReplyError('Network error. Please try again.')
    } finally {
      setReplySubmitting(false)
    }
  }

  const handleHelpful = async (replyId: number) => {
    if (!user || helpfulLoading[replyId]) return
    setHelpfulLoading(prev => ({ ...prev, [replyId]: true }))
    try {
      const res = await fetch(`/api/porch/${postId}/replies/${replyId}/helpful`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setReplies(prev => prev.map(r =>
          r.id === replyId ? { ...r, helpful_count: data.helpful_count ?? r.helpful_count } : r
        ))
        setUserVotes(prev =>
          data.voted ? [...prev, replyId] : prev.filter(id => id !== replyId)
        )
      }
    } catch { /* silent */ } finally {
      setHelpfulLoading(prev => ({ ...prev, [replyId]: false }))
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 32px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</div>
      </main>
    )
  }

  if (!post) {
    return (
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 32px', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', marginBottom: '12px' }}>Post not found or has expired.</p>
          <Link href="/porch" style={{ color: '#1a56db', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            Back to The Porch
          </Link>
        </div>
      </main>
    )
  }

  const pt = porchPostTypeBySlug[post.post_type]
  const nhDisplay = getNeighborhoodDisplayName(post.borough_slug, post.neighborhood_slug)
  const boroughDisplay = getBoroughDisplayName(post.borough_slug)
  const userObj = post.users

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 24px 32px', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Breadcrumbs */}
      <nav style={{ display: 'flex', gap: '6px', fontSize: '0.75rem', color: '#6b7280', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: '#1a56db', textDecoration: 'none' }}>Home</Link>
        <span style={{ margin: '0 2px' }}>/</span>
        <Link href="/porch" style={{ color: '#1a56db', textDecoration: 'none' }}>The Porch</Link>
        <span style={{ margin: '0 2px' }}>/</span>
        <Link href={`/porch/${post.borough_slug}`} style={{ color: '#1a56db', textDecoration: 'none' }}>{boroughDisplay}</Link>
        <span style={{ margin: '0 2px' }}>/</span>
        <Link href={`/porch/${post.borough_slug}/${post.neighborhood_slug}`} style={{ color: '#1a56db', textDecoration: 'none' }}>{nhDisplay}</Link>
        <span style={{ margin: '0 2px' }}>/</span>
        <span style={{ color: '#111827', fontWeight: 500 }}>{post.title.length > 40 ? post.title.slice(0, 40) + '...' : post.title}</span>
      </nav>

      {/* Post */}
      <article style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
      }}>
        {/* Post header — no emojis on type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: pt ? `${pt.color}15` : '#f3f4f6',
            color: pt?.color || '#6b7280',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '4px',
            fontSize: '0.8125rem',
          }}>
            {pt?.name || post.post_type}
          </span>
          <span style={{ color: '#d1d5db' }}>&middot;</span>
          <span style={{ color: '#6b7280' }}>{nhDisplay}, {boroughDisplay}</span>
          <span style={{ color: '#d1d5db' }}>&middot;</span>
          <span style={{ color: '#9ca3af' }}>{getTimeAgo(post.created_at)}</span>
          {post.pinned && (
            <>
              <span style={{ color: '#d1d5db' }}>&middot;</span>
              <span style={{
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                fontSize: '0.6875rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
              }}>
                Pinned
              </span>
            </>
          )}
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '12px', lineHeight: 1.3 }}>
          {post.title}
        </h1>

        <div style={{
          fontSize: '0.9375rem', color: '#374151', lineHeight: 1.6,
          whiteSpace: 'pre-wrap', marginBottom: '16px',
        }}>
          {post.body}
        </div>

        {/* Author bar — face avatar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          paddingTop: '14px', borderTop: '1px solid #f3f4f6',
        }}>
          <Avatar user={userObj || { name: 'Anonymous', selfie_url: null }} size={40} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Link href={`#`} style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
                {userObj?.name || 'Anonymous'}
              </Link>
              {userObj?.verified && <VerifiedBadge size={16} />}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1px' }}>Verified Neighbor</div>
          </div>
        </div>
      </article>

      {/* Replies */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
        </h2>

        {replies.length === 0 && (
          <div style={{
            padding: '24px', textAlign: 'center', backgroundColor: '#f9fafb',
            borderRadius: '8px', marginBottom: '16px',
          }}>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No replies yet. Be the first to chime in.</p>
          </div>
        )}

        {replies.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {replies.map((reply, idx) => {
              const replyUser = reply.users
              const voted = userVotes.includes(reply.id)
              const isLast = idx === replies.length - 1

              return (
                <div key={reply.id} style={{ display: 'flex', gap: '12px' }}>
                  {/* Thread line + avatar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <Avatar user={replyUser || { name: 'Anonymous', selfie_url: null }} size={32} />
                    {!isLast && (
                      <div style={{ width: '2px', flex: 1, backgroundColor: '#e5e7eb', marginTop: '4px' }} />
                    )}
                  </div>

                  {/* Reply content */}
                  <div style={{ flex: 1, paddingBottom: isLast ? '0' : '16px', minWidth: 0 }}>
                    {/* Name + time row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>
                        {replyUser?.name || 'Anonymous'}
                      </span>
                      {replyUser?.verified && <VerifiedBadge size={13} />}
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>&middot; {getTimeAgo(reply.created_at)}</span>
                    </div>

                    {/* Reply body */}
                    <div style={{
                      fontSize: '0.9375rem', color: '#374151', lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {reply.body}
                    </div>

                    {/* Actions row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                      <button
                        onClick={(e) => { e.preventDefault(); handleHelpful(reply.id) }}
                        disabled={!user || helpfulLoading[reply.id]}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: 'none', border: 'none',
                          cursor: user ? 'pointer' : 'default',
                          fontSize: '0.75rem', fontWeight: 500,
                          color: voted ? '#1a56db' : '#9ca3af',
                          padding: '2px 0',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={voted ? '#1a56db' : 'none'} stroke={voted ? '#1a56db' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                          <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                        </svg>
                        <span>{reply.helpful_count > 0 ? reply.helpful_count : ''} Helpful</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Reply form */}
        <div style={{ marginTop: '20px' }}>
          {!authChecked ? (
            <div style={{ color: '#9ca3af', fontSize: '0.875rem', padding: '12px' }}>Loading...</div>
          ) : !user ? (
            <div style={{
              textAlign: 'center', padding: '16px',
              backgroundColor: '#f9fafb', borderRadius: '8px',
            }}>
              <Link href="/login" style={{ color: '#1a56db', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                Log in to reply
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Avatar user={{ name: user.name, selfie_url: null }} size={32} />
              <div style={{ flex: 1 }}>
                <textarea
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value.slice(0, 300))}
                  placeholder="Write a reply..."
                  rows={2}
                  onFocus={e => { e.target.rows = 3 }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #e5e7eb', backgroundColor: '#f9fafb',
                    fontSize: '0.875rem', color: '#111827', outline: 'none', resize: 'none',
                    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}
                  onFocusCapture={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#1a56db'; (e.target as HTMLTextAreaElement).style.backgroundColor = '#fff' }}
                  onBlurCapture={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#e5e7eb'; (e.target as HTMLTextAreaElement).style.backgroundColor = '#f9fafb' }}
                />
                {(replyBody.trim() || replyError) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {replyBody.length}/300
                    </div>
                    <button
                      onClick={handleSubmitReply}
                      disabled={replySubmitting || !replyBody.trim()}
                      style={{
                        backgroundColor: replySubmitting || !replyBody.trim() ? '#93c5fd' : '#1a56db',
                        color: '#ffffff', padding: '6px 20px', borderRadius: '6px',
                        fontSize: '0.8125rem', fontWeight: 600, border: 'none',
                        cursor: replySubmitting || !replyBody.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {replySubmitting ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                )}

                {replyError && (
                  <div style={{
                    backgroundColor: '#fef2f2', borderRadius: '6px',
                    padding: '8px 12px', marginTop: '8px', fontSize: '0.8125rem', color: '#dc2626',
                  }}>
                    {replyError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
