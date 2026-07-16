// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import VerifiedBadge from '@/app/site/nyc-classifieds/_components/VerifiedBadge'
import { porchPostTypeBySlug, slugify, businessCategories, boroughs, businessProfileUrl } from '@/app/site/nyc-classifieds/_lib/data'
import { uploadViaSignedUrl } from '@/lib/client-upload'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface User {
  id: number
  email: string
  name: string
  verified: boolean
  role: string
  account_type: string | null
  business_name: string | null
  business_slug: string | null
  business_category: string | null
  website: string | null
  phone: string | null
  business_description: string | null
  hours: Record<string, { open: string; close: string; closed: boolean }> | null
  service_area: string[] | null
  selfie_url: string | null
  business_photo: string | null
  business_address: string | null
  address: string | null
  photo_gallery: string[] | null
  social_links: Record<string, string> | null
  seo_keywords: string[] | null
}

interface SavedSearch {
  id: number; label: string; keywords: string | null; category: string | null
  subcategory: string | null; min_price: number | null; max_price: number | null; created_at: string
}

interface Listing {
  id: number; title: string; price: number | null; images: string[]
  status: string; category_slug: string; created_at: string
}
interface PorchPost {
  id: number; post_type: string; title: string; body: string
  borough_slug: string; neighborhood_slug: string; created_at: string; reply_count: number
}
interface Review {
  id: number; rating: number; body: string | null; reply: string | null
  replied_at: string | null; reported: boolean; created_at: string
  reviewer: { name: string; selfie_url: string | null; verified: boolean } | null
}

export default function AccountClient() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [porchPosts, setPorchPosts] = useState<PorchPost[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'personal' | 'business'>('personal')

  // Business creation modal
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [bizPhotoFile, setBizPhotoFile] = useState<File | null>(null)
  const [bizPhotoPreview, setBizPhotoPreview] = useState<string | null>(null)
  const [upgradeForm, setUpgradeForm] = useState({
    business_name: '', business_category: '', business_description: '',
    website: '', phone: '', business_address: '',
  })

  // Business edit state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    business_name: '', business_category: '', business_description: '',
    website: '', phone: '', business_address: '',
  })
  const [saving, setSaving] = useState(false)
  const [bizPhotoUploading, setBizPhotoUploading] = useState(false)

  // Hours editor
  const [editingHours, setEditingHours] = useState(false)
  const [hoursForm, setHoursForm] = useState<Record<string, { open: string; close: string; closed: boolean }>>({})

  // Service area
  const [editingArea, setEditingArea] = useState(false)
  const [areaForm, setAreaForm] = useState<string[]>([])

  // Photo gallery
  const [galleryUploading, setGalleryUploading] = useState(false)

  // Social links
  const [editingSocials, setEditingSocials] = useState(false)
  const [socialsForm, setSocialsForm] = useState<Record<string, string>>({})

  // SEO Keywords
  const [keywordInput, setKeywordInput] = useState('')
  const [keywordsLocal, setKeywordsLocal] = useState<string[]>([])
  const [keywordsSaving, setKeywordsSaving] = useState(false)

  // Business Updates
  const [bizUpdates, setBizUpdates] = useState<{ id: number; title: string; body: string | null; photos: string[]; created_at: string }[]>([])
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateBody, setUpdateBody] = useState('')
  const [updatePhotos, setUpdatePhotos] = useState<string[]>([])
  const [updateSubmitting, setUpdateSubmitting] = useState(false)
  const [updatePhotoUploading, setUpdatePhotoUploading] = useState(false)

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewAvg, setReviewAvg] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')

  // Address autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const addressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchAddress = useCallback((q: string) => {
    if (addressTimerRef.current) clearTimeout(addressTimerRef.current)
    if (q.length < 3) { setAddressSuggestions([]); setShowSuggestions(false); return }
    addressTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          setAddressSuggestions(data.map((r: { display_name?: string }) => r.display_name || ''))
          setShowSuggestions(true)
        }
      } catch { /* ignore */ }
    }, 300)
  }, [])

  const refreshUser = useCallback(async () => {
    const res = await fetch('/api/auth')
    const d = await res.json()
    if (d.authenticated) setUser(d.user)
  }, [])

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) { router.push('/login'); return }
        setUser(d.user)
        setUnreadCount(d.unreadMessages || 0)
        if (d.user.account_type === 'business') setTab('business')
        return Promise.all([
          fetch(`/api/listings?user=${d.user.id}`).then(r => r.json()),
          fetch(`/api/porch?user=${d.user.id}`).then(r => r.json()),
          fetch('/api/saved-searches').then(r => r.json()),
        ]).then(([ld, pd, sd]) => {
          if (ld?.listings) setListings(ld.listings)
          if (pd?.posts) setPorchPosts(pd.posts)
          if (sd?.alerts) setSavedSearches(sd.alerts)
        })
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  // Sync keywords from user data
  useEffect(() => {
    if (user?.seo_keywords) setKeywordsLocal(user.seo_keywords)
  }, [user])

  // Load updates when user has business profile
  useEffect(() => {
    if (!user || user.account_type !== 'business') return
    fetch(`/api/business/updates?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => setBizUpdates(d.updates || []))
      .catch(() => {})
  }, [user])

  // Load reviews when user has business profile
  useEffect(() => {
    if (!user || user.account_type !== 'business') return
    fetch(`/api/reviews?business_user_id=${user.id}`)
      .then(r => r.json())
      .then(d => {
        setReviews(d.reviews || [])
        setReviewAvg(d.average || 0)
        setReviewCount(d.count || 0)
      })
      .catch(() => {})
  }, [user])

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
    router.push('/')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this listing?')) return
    await fetch(`/api/listings/${id}`, { method: 'DELETE' })
    setListings(prev => prev.filter(l => l.id !== id))
  }

  const handleMarkSold = async (id: number) => {
    await fetch(`/api/listings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'sold' }) })
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'sold' } : l))
  }

  const handleUpgrade = async () => {
    if (!upgradeForm.business_name.trim() || !upgradeForm.business_category) return
    setUpgrading(true)
    try {
      const res = await fetch('/api/account/upgrade-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upgradeForm) })
      const data = await res.json()
      if (data.ok) {
        if (bizPhotoFile) {
          try {
            const url = await uploadViaSignedUrl(bizPhotoFile, 'photo')
            await fetch('/api/account/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, type: 'business' }) })
          } catch {}
        }
        await refreshUser()
        setShowUpgrade(false)
        setBizPhotoFile(null); setBizPhotoPreview(null)
        setTab('business')
      } else { alert(data.error || 'Failed') }
    } catch { alert('Failed') }
    finally { setUpgrading(false) }
  }

  const startEditing = () => {
    if (!user) return
    setEditForm({
      business_name: user.business_name || '',
      business_category: user.business_category || '',
      business_description: user.business_description || '',
      website: user.website || '',
      phone: user.phone || '',
      business_address: user.business_address || '',
    })
    setEditing(true)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) })
      const data = await res.json()
      if (data.ok) { await refreshUser(); setEditing(false) }
      else alert(data.error || 'Failed')
    } catch { alert('Failed to save') }
    finally { setSaving(false) }
  }

  const handleBusinessPhotoUpload = async (file: File) => {
    setBizPhotoUploading(true)
    try {
      const url = await uploadViaSignedUrl(file, 'photo')
      const sr = await fetch('/api/account/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, type: 'business' }) })
      if (!sr.ok) throw new Error((await sr.json()).error)
      setUser(prev => prev ? { ...prev, business_photo: url } : prev)
    } catch (e) { alert(e instanceof Error ? e.message : 'Upload failed') }
    finally { setBizPhotoUploading(false) }
  }

  const startEditingHours = () => {
    const h = user?.hours || {}
    const form: Record<string, { open: string; close: string; closed: boolean }> = {}
    DAYS.forEach(d => { form[d] = h[d] || { open: '09:00', close: '17:00', closed: false } })
    setHoursForm(form)
    setEditingHours(true)
  }

  const saveHours = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: hoursForm }) })
      if ((await res.json()).ok) { await refreshUser(); setEditingHours(false) }
    } catch {}
    finally { setSaving(false) }
  }

  const startEditingArea = () => {
    setAreaForm(user?.service_area || [])
    setEditingArea(true)
  }

  const saveArea = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_area: areaForm }) })
      if ((await res.json()).ok) { await refreshUser(); setEditingArea(false) }
    } catch {}
    finally { setSaving(false) }
  }

  const handleGalleryUpload = async (file: File) => {
    if ((user?.photo_gallery?.length || 0) >= 8) { alert('Maximum 8 photos'); return }
    setGalleryUploading(true)
    try {
      const url = await uploadViaSignedUrl(file, 'photo')
      const newGallery = [...(user?.photo_gallery || []), url]
      const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo_gallery: newGallery }) })
      if ((await res.json()).ok) await refreshUser()
    } catch (e) { alert(e instanceof Error ? e.message : 'Upload failed') }
    finally { setGalleryUploading(false) }
  }

  const removeGalleryPhoto = async (url: string) => {
    const newGallery = (user?.photo_gallery || []).filter(u => u !== url)
    const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo_gallery: newGallery }) })
    if ((await res.json()).ok) await refreshUser()
  }

  const startEditingSocials = () => {
    setSocialsForm(user?.social_links || {})
    setEditingSocials(true)
  }

  const saveSocials = async () => {
    setSaving(true)
    try {
      const clean: Record<string, string> = {}
      Object.entries(socialsForm).forEach(([k, v]) => { if (v.trim()) clean[k] = v.trim() })
      const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ social_links: clean }) })
      if ((await res.json()).ok) { await refreshUser(); setEditingSocials(false) }
    } catch {}
    finally { setSaving(false) }
  }

  const addKeyword = () => {
    const kw = keywordInput.trim().slice(0, 30)
    if (!kw || keywordsLocal.length >= 10 || keywordsLocal.includes(kw)) return
    setKeywordsLocal(prev => [...prev, kw])
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    setKeywordsLocal(prev => prev.filter(k => k !== kw))
  }

  const saveKeywords = async () => {
    setKeywordsSaving(true)
    try {
      const res = await fetch('/api/account/edit-business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seo_keywords: keywordsLocal }) })
      if ((await res.json()).ok) await refreshUser()
    } catch {}
    finally { setKeywordsSaving(false) }
  }

  const submitUpdate = async () => {
    if (!updateTitle.trim()) return
    setUpdateSubmitting(true)
    try {
      const res = await fetch('/api/business/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: updateTitle, body: updateBody || null, photos: updatePhotos }),
      })
      const data = await res.json()
      if (data.update) {
        setBizUpdates(prev => [data.update, ...prev])
        setShowUpdateForm(false)
        setUpdateTitle('')
        setUpdateBody('')
        setUpdatePhotos([])
      }
    } catch {}
    finally { setUpdateSubmitting(false) }
  }

  const deleteUpdate = async (id: number) => {
    if (!confirm('Delete this update?')) return
    const res = await fetch(`/api/business/updates?id=${id}`, { method: 'DELETE' })
    if ((await res.json()).ok) {
      setBizUpdates(prev => prev.filter(u => u.id !== id))
    }
  }

  const handleUpdatePhotoUpload = async (file: File) => {
    if (updatePhotos.length >= 3) return
    setUpdatePhotoUploading(true)
    try {
      const url = await uploadViaSignedUrl(file, 'photo')
      setUpdatePhotos(prev => [...prev, url])
    } catch {}
    finally { setUpdatePhotoUploading(false) }
  }

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) return
    const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reply', review_id: reviewId, reply: replyText }) })
    if ((await res.json()).ok) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: replyText, replied_at: new Date().toISOString() } : r))
      setReplyingTo(null); setReplyText('')
    }
  }

  const handleReport = async (reviewId: number) => {
    const reason = prompt('Why are you reporting this review?')
    if (reason === null) return
    await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'report', review_id: reviewId, reason }) })
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reported: true } : r))
  }

  if (loading) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>
  if (!user) return null

  const neighborhood = user.address?.split(',')[0]?.trim() || null
  const isBusiness = user.account_type === 'business'
  const allNeighborhoods = boroughs.flatMap(b => b.neighborhoods)

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Profile Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
        {user.selfie_url ? (
          <img src={user.selfie_url} alt={user.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 700, color: '#475569', flexShrink: 0 }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{user.name}</h1>
            {user.verified && <VerifiedBadge size="md" />}
          </div>
          {neighborhood && <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>{neighborhood}</div>}
          <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>{user.email}</div>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0 }}>
          Log out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
        <button onClick={() => setTab('personal')} style={{
          padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          border: 'none', backgroundColor: 'transparent',
          borderBottom: tab === 'personal' ? '2px solid #2563eb' : '2px solid transparent',
          color: tab === 'personal' ? '#2563eb' : '#64748b',
          marginBottom: '-2px',
        }}>
          Personal
        </button>
        <button onClick={() => isBusiness ? setTab('business') : setShowUpgrade(true)} style={{
          padding: '0.75rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          border: 'none', backgroundColor: 'transparent',
          borderBottom: tab === 'business' ? '2px solid #2563eb' : '2px solid transparent',
          color: tab === 'business' ? '#2563eb' : '#64748b',
          marginBottom: '-2px',
        }}>
          Business {!isBusiness && '(Add Free)'}
        </button>
      </div>

      {/* ==================== PERSONAL TAB ==================== */}
      {tab === 'personal' && (
        <>
          {/* Messages */}
          <Link href="/messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>My Messages</span>
            </div>
            {unreadCount > 0 ? (
              <span style={{ backgroundColor: '#dc2626', color: '#fff', borderRadius: '9999px', padding: '0.125rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </Link>

          {/* Alerts */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>My Alerts</h2>
            <Link href="/alerts" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Create Alert</Link>
          </div>
          {savedSearches.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '0.75rem', marginBottom: '2rem' }}>
              No alerts yet. <Link href="/alerts" style={{ color: '#2563eb', fontWeight: 500 }}>Create one</Link> to get notified about new listings.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
              {savedSearches.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Created {new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  {s.category && (
                    <Link href={`/listings/${s.category}`} style={{ ...smallLinkStyle, fontSize: '0.7rem' }}>View listings</Link>
                  )}
                  <button onClick={async () => {
                    const res = await fetch('/api/saved-searches', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id }) })
                    if (res.ok) setSavedSearches(prev => prev.filter(x => x.id !== s.id))
                  }} style={{ ...smallLinkStyle, color: '#dc2626', fontSize: '0.7rem' }}>Delete</button>
                </div>
              ))}
            </div>
          )}

          {/* Listings */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>My Listings</h2>
            <Link href="/listings/new" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Post New</Link>
          </div>
          {listings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '0.75rem', marginBottom: '2rem' }}>No listings yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {listings.map(listing => (
                <div key={listing.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '0.5rem', backgroundColor: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {listing.images[0] ? <img src={listing.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#94a3b8' }}>&#128247;</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Link href={`/listings/${listing.category_slug}/${listing.id}`} style={{ fontWeight: 600, fontSize: '0.875rem' }}>{listing.title}</Link>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#16a34a' }}>{listing.price != null ? `$${(listing.price / 100).toLocaleString()}` : 'Free'}</span>
                      <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', backgroundColor: listing.status === 'active' ? '#f0fdf4' : '#fef3c7', color: listing.status === 'active' ? '#16a34a' : '#d97706', fontWeight: 600 }}>{listing.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <Link href={`/listings/${listing.category_slug}/${listing.id}`} style={smallLinkStyle}>View</Link>
                      <Link href={`/listings/edit/${listing.id}`} style={smallLinkStyle}>Edit</Link>
                      <button onClick={() => { const url = `${window.location.origin}/listings/${listing.category_slug}/${listing.id}`; navigator.share ? navigator.share({ title: listing.title, url }) : (navigator.clipboard.writeText(url), alert('Link copied!')) }} style={smallLinkStyle}>Share</button>
                      {listing.status === 'active' && <button onClick={() => handleMarkSold(listing.id)} style={smallLinkStyle}>Mark sold</button>}
                      <button onClick={() => handleDelete(listing.id)} style={{ ...smallLinkStyle, color: '#dc2626' }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Porch Posts */}
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>My Porch Posts</h2>
          {porchPosts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '0.75rem' }}>No porch posts yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {porchPosts.map(post => {
                const typeInfo = porchPostTypeBySlug[post.post_type]
                return (
                  <Link key={post.id} href={`/porch/post/${post.id}/${slugify(post.title)}`} style={{ display: 'block', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      {typeInfo && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}>{typeInfo.icon} {typeInfo.name}</span>}
                      {post.reply_count > 0 && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{post.title}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>{post.body.length > 120 ? post.body.slice(0, 120) + '...' : post.body}</div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ==================== BUSINESS TAB ==================== */}
      {tab === 'business' && isBusiness && user.business_name && (
        <>
          {/* Business Header */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', flexShrink: 0 }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleBusinessPhotoUpload(f); e.target.value = '' }} />
              {user.business_photo ? (
                <img src={user.business_photo} alt={user.business_name || ''} style={{ width: '80px', height: '80px', borderRadius: '0.75rem', objectFit: 'cover', opacity: bizPhotoUploading ? 0.5 : 1 }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '2px dashed #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  <span style={{ fontSize: '0.5rem', color: '#2563eb', fontWeight: 600 }}>Add photo</span>
                </div>
              )}
            </label>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{user.business_name}</h2>
              {user.business_category && <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{user.business_category}</div>}
              {reviewCount > 0 && <div style={{ fontSize: '0.8125rem', color: '#f59e0b', marginTop: '2px' }}>{'★'.repeat(Math.round(reviewAvg))}{'☆'.repeat(5 - Math.round(reviewAvg))} {reviewAvg} ({reviewCount})</div>}
            </div>
            <Link href={businessProfileUrl(user.business_slug!, user.business_category)} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #2563eb', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
              View Public Profile
            </Link>
          </div>

          {/* Profile Info — View/Edit */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Profile Info</h3>
              {!editing ? (
                <button onClick={startEditing} style={editBtnStyle}>Edit</button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditing(false)} style={editBtnStyle}>Cancel</button>
                  <button onClick={saveProfile} disabled={saving} style={{ ...editBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              )}
            </div>
            {!editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <Row label="Name" value={user.business_name} />
                <Row label="Category" value={user.business_category} />
                <Row label="Description" value={user.business_description} />
                <Row label="Website" value={user.website} link />
                <Row label="Phone" value={user.phone} />
                <Row label="Address" value={user.business_address} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Field label="Business Name" value={editForm.business_name} onChange={v => setEditForm(f => ({ ...f, business_name: v }))} />
                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={editForm.business_category} onChange={e => setEditForm(f => ({ ...f, business_category: e.target.value }))} style={inputStyle}>
                    <option value="">Select</option>
                    {businessCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={editForm.business_description} onChange={e => setEditForm(f => ({ ...f, business_description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <Field label="Website" value={editForm.website} onChange={v => setEditForm(f => ({ ...f, website: v }))} placeholder="https://yourbusiness.com" />
                <Field label="Phone" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: formatPhone(v) }))} placeholder="(212) 555-1234" type="tel" />
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Address</label>
                  <input value={editForm.business_address} onChange={e => { setEditForm(f => ({ ...f, business_address: e.target.value })); searchAddress(e.target.value) }} onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true) }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="123 Main St, Brooklyn, NY" style={inputStyle} />
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto' }}>
                      {addressSuggestions.map((addr, i) => (
                        <button key={i} onMouseDown={() => { setEditForm(f => ({ ...f, business_address: addr })); setShowSuggestions(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', border: 'none', backgroundColor: 'transparent', fontSize: '0.8125rem', cursor: 'pointer', color: '#334155' }}>{addr}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Hours */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Business Hours</h3>
              {!editingHours ? (
                <button onClick={startEditingHours} style={editBtnStyle}>{user.hours ? 'Edit' : 'Add'}</button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditingHours(false)} style={editBtnStyle}>Cancel</button>
                  <button onClick={saveHours} disabled={saving} style={{ ...editBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              )}
            </div>
            {!editingHours ? (
              user.hours ? (
                <div style={{ fontSize: '0.875rem' }}>
                  {DAYS.map(d => {
                    const h = user.hours?.[d]
                    if (!h) return null
                    return <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ color: '#64748b' }}>{d}</span><span style={{ color: h.closed ? '#dc2626' : '#334155' }}>{h.closed ? 'Closed' : `${h.open} – ${h.close}`}</span></div>
                  })}
                </div>
              ) : <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No hours set yet.</p>
            ) : (
              <div style={{ fontSize: '0.875rem' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 0' }}>
                    <span style={{ width: '36px', color: '#64748b', fontWeight: 500 }}>{d}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={hoursForm[d]?.closed || false} onChange={e => setHoursForm(h => ({ ...h, [d]: { ...h[d], closed: e.target.checked } }))} />
                      Closed
                    </label>
                    {!hoursForm[d]?.closed && (
                      <>
                        <input type="time" value={hoursForm[d]?.open || '09:00'} onChange={e => setHoursForm(h => ({ ...h, [d]: { ...h[d], open: e.target.value } }))} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '0.8125rem' }} />
                        <span>–</span>
                        <input type="time" value={hoursForm[d]?.close || '17:00'} onChange={e => setHoursForm(h => ({ ...h, [d]: { ...h[d], close: e.target.value } }))} style={{ ...inputStyle, width: 'auto', padding: '4px 8px', fontSize: '0.8125rem' }} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Service Area */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Service Area</h3>
              {!editingArea ? (
                <button onClick={startEditingArea} style={editBtnStyle}>{user.service_area?.length ? 'Edit' : 'Add'}</button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditingArea(false)} style={editBtnStyle}>Cancel</button>
                  <button onClick={saveArea} disabled={saving} style={{ ...editBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              )}
            </div>
            {!editingArea ? (
              user.service_area?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {user.service_area.map(n => <span key={n} style={{ padding: '3px 10px', borderRadius: '1rem', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 500 }}>{n}</span>)}
                </div>
              ) : <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No service areas set.</p>
            ) : (
              <div>
                {boroughs.map(boro => (
                  <div key={boro.slug} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>{boro.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {boro.neighborhoods.map(n => {
                        const sel = areaForm.includes(n)
                        return <button key={n} onClick={() => setAreaForm(prev => sel ? prev.filter(x => x !== n) : [...prev, n])} style={{ padding: '3px 10px', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 500, border: sel ? '1px solid #2563eb' : '1px solid #e2e8f0', backgroundColor: sel ? '#eff6ff' : '#fff', color: sel ? '#2563eb' : '#64748b', cursor: 'pointer' }}>{n}</button>
                      })}
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{areaForm.length} neighborhood{areaForm.length !== 1 ? 's' : ''} selected</div>
              </div>
            )}
          </section>

          {/* Photo Gallery */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
              Photos <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8125rem' }}>({user.photo_gallery?.length || 0}/8)</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
              {(user.photo_gallery || []).map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => removeGalleryPhoto(url)} style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                </div>
              ))}
              {(user.photo_gallery?.length || 0) < 8 && (
                <label style={{ aspectRatio: '1', borderRadius: '8px', border: '2px dashed #93c5fd', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: galleryUploading ? 'wait' : 'pointer', opacity: galleryUploading ? 0.5 : 1 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); e.target.value = '' }} disabled={galleryUploading} />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </label>
              )}
            </div>
          </section>

          {/* Social Links */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Social Links</h3>
              {!editingSocials ? (
                <button onClick={startEditingSocials} style={editBtnStyle}>{Object.keys(user.social_links || {}).length ? 'Edit' : 'Add'}</button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setEditingSocials(false)} style={editBtnStyle}>Cancel</button>
                  <button onClick={saveSocials} disabled={saving} style={{ ...editBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              )}
            </div>
            {!editingSocials ? (
              Object.keys(user.social_links || {}).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
                  {Object.entries(user.social_links || {}).map(([platform, url]) => (
                    <div key={platform}>
                      <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{platform}: </span>
                      <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{url}</a>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No social links added.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['instagram', 'tiktok', 'facebook', 'yelp', 'google', 'linkedin'].map(platform => (
                  <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '80px', fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', textTransform: 'capitalize' }}>{platform}</span>
                    <input value={socialsForm[platform] || ''} onChange={e => setSocialsForm(f => ({ ...f, [platform]: e.target.value }))} placeholder={`${platform}.com/yourbusiness`} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SEO Keywords */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              SEO Keywords <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8125rem' }}>({keywordsLocal.length}/10)</span>
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 0.75rem' }}>
              Add keywords customers might search for (e.g., &quot;emergency plumber&quot;, &quot;same-day delivery&quot;)
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: keywordsLocal.length > 0 ? '10px' : '0' }}>
              {keywordsLocal.map(kw => (
                <span key={kw} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '1rem', fontSize: '0.8125rem',
                  backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 500,
                }}>
                  {kw}
                  <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: '0.875rem', padding: 0, lineHeight: 1 }}>&times;</button>
                </span>
              ))}
            </div>
            {keywordsLocal.length < 10 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                  placeholder="Type keyword + Enter"
                  maxLength={30}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={addKeyword} style={editBtnStyle}>Add</button>
              </div>
            )}
            {(JSON.stringify(keywordsLocal) !== JSON.stringify(user.seo_keywords || [])) && (
              <button onClick={saveKeywords} disabled={keywordsSaving} style={{ marginTop: '10px', padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: keywordsSaving ? 'not-allowed' : 'pointer', opacity: keywordsSaving ? 0.6 : 1 }}>
                {keywordsSaving ? 'Saving...' : 'Save Keywords'}
              </button>
            )}
          </section>

          {/* Business Updates */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Updates {bizUpdates.length > 0 && <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8125rem' }}>({bizUpdates.length})</span>}
              </h3>
              {!showUpdateForm && (
                <button onClick={() => setShowUpdateForm(true)} style={editBtnStyle}>Post Update</button>
              )}
            </div>

            {showUpdateForm && (
              <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '12px', background: '#fafafa' }}>
                <input
                  value={updateTitle}
                  onChange={e => setUpdateTitle(e.target.value)}
                  placeholder="Update title"
                  style={{ ...inputStyle, marginBottom: '8px', fontWeight: 600 }}
                />
                <textarea
                  value={updateBody}
                  onChange={e => setUpdateBody(e.target.value)}
                  placeholder="Details (optional)"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', marginBottom: '8px', fontFamily: 'inherit' }}
                />
                {/* Photo uploads */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {updatePhotos.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden' }}>
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => setUpdatePhotos(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
                    </div>
                  ))}
                  {updatePhotos.length < 3 && (
                    <label style={{ width: '64px', height: '64px', borderRadius: '6px', border: '2px dashed #93c5fd', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: updatePhotoUploading ? 'wait' : 'pointer', opacity: updatePhotoUploading ? 0.5 : 1 }}>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpdatePhotoUpload(f); e.target.value = '' }} disabled={updatePhotoUploading} />
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </label>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={submitUpdate} disabled={updateSubmitting || !updateTitle.trim()} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: updateSubmitting ? 'not-allowed' : 'pointer', opacity: updateSubmitting || !updateTitle.trim() ? 0.6 : 1 }}>
                    {updateSubmitting ? 'Posting...' : 'Post'}
                  </button>
                  <button onClick={() => { setShowUpdateForm(false); setUpdateTitle(''); setUpdateBody(''); setUpdatePhotos([]) }} style={editBtnStyle}>Cancel</button>
                </div>
              </div>
            )}

            {bizUpdates.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No updates posted yet. Share news, promotions, or announcements with your customers.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {bizUpdates.map(u => (
                  <div key={u.id} style={{ padding: '12px', borderLeft: '3px solid #2563eb', borderRadius: '0 8px 8px 0', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{u.title}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '8px' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                      <button onClick={() => deleteUpdate(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', fontWeight: 500, padding: 0 }}>Delete</button>
                    </div>
                    {u.body && <p style={{ fontSize: '0.8125rem', color: '#334155', margin: '4px 0 0', lineHeight: 1.5 }}>{u.body}</p>}
                    {u.photos.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                        {u.photos.map((url, i) => (
                          <img key={i} src={url} alt="" style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
              Reviews {reviewCount > 0 && <span style={{ fontWeight: 400, color: '#64748b' }}>({reviewCount})</span>}
            </h3>
            {reviews.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>No reviews yet. Reviews will appear here when customers leave feedback.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                      {r.reviewer?.selfie_url && <img src={r.reviewer.selfie_url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.reviewer?.name || 'Anonymous'}</span>
                      <span style={{ color: '#f59e0b', fontSize: '0.8125rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: 'auto' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.body && <p style={{ fontSize: '0.875rem', color: '#334155', margin: '4px 0' }}>{r.body}</p>}
                    {r.reply && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #2563eb' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', marginBottom: '2px' }}>Your reply</div>
                        <p style={{ fontSize: '0.8125rem', color: '#334155', margin: 0 }}>{r.reply}</p>
                      </div>
                    )}
                    {replyingTo === r.id && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '0.5rem' }}>
                        <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write your reply..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => handleReply(r.id)} style={{ ...editBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}>Reply</button>
                        <button onClick={() => { setReplyingTo(null); setReplyText('') }} style={editBtnStyle}>Cancel</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '6px' }}>
                      {!r.reply && replyingTo !== r.id && <button onClick={() => { setReplyingTo(r.id); setReplyText('') }} style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 500, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: 0 }}>Reply</button>}
                      {!r.reported ? <button onClick={() => handleReport(r.id)} style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', padding: 0 }}>Report</button> : <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reported</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Links */}
          <section style={{ ...cardStyle }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link href="/listings/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#334155', fontSize: '0.875rem', fontWeight: 500 }}>
                Post a Listing
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
              <Link href="/messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#334155', fontSize: '0.875rem', fontWeight: 500 }}>
                Messages {unreadCount > 0 && `(${unreadCount} new)`}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
              <Link href={businessProfileUrl(user.business_slug!, user.business_category)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#334155', fontSize: '0.875rem', fontWeight: 500 }}>
                View Public Profile
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </Link>
            </div>
          </section>
        </>
      )}

      {/* ==================== UPGRADE MODAL ==================== */}
      {showUpgrade && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '2rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Add Business Profile</h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Free business profile. Your personal identity stays — you choose which to post as.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Photo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setBizPhotoFile(f); setBizPhotoPreview(URL.createObjectURL(f)) }; e.target.value = '' }} />
                  {bizPhotoPreview ? <img src={bizPhotoPreview} alt="" style={{ width: '64px', height: '64px', borderRadius: '0.75rem', objectFit: 'cover' }} /> : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '0.75rem', backgroundColor: '#eff6ff', border: '2px dashed #93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    </div>
                  )}
                </label>
                <div><div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Business Photo</div><div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Logo, storefront, or headshot</div></div>
              </div>
              <Field label="Business Name *" value={upgradeForm.business_name} onChange={v => setUpgradeForm(f => ({ ...f, business_name: v }))} placeholder="e.g. Maria's Cleaning Service" />
              <div>
                <label style={labelStyle}>Category *</label>
                <select value={upgradeForm.business_category} onChange={e => setUpgradeForm(f => ({ ...f, business_category: e.target.value }))} style={inputStyle}>
                  <option value="">Select a category</option>
                  {businessCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Description</label><textarea value={upgradeForm.business_description} onChange={e => setUpgradeForm(f => ({ ...f, business_description: e.target.value }))} placeholder="Tell NYC about your business" rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></div>
              <Field label="Website" value={upgradeForm.website} onChange={v => setUpgradeForm(f => ({ ...f, website: v }))} placeholder="https://yourbusiness.com" />
              <Field label="Phone" value={upgradeForm.phone} onChange={v => setUpgradeForm(f => ({ ...f, phone: formatPhone(v) }))} placeholder="(212) 555-1234" type="tel" />
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Business Address</label>
                <input value={upgradeForm.business_address} onChange={e => { setUpgradeForm(f => ({ ...f, business_address: e.target.value })); searchAddress(e.target.value) }} onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true) }} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} placeholder="123 Main St, Brooklyn, NY" style={inputStyle} />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto' }}>
                    {addressSuggestions.map((a, i) => <button key={i} onMouseDown={() => { setUpgradeForm(f => ({ ...f, business_address: a })); setShowSuggestions(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', border: 'none', backgroundColor: 'transparent', fontSize: '0.8125rem', cursor: 'pointer', color: '#334155' }}>{a}</button>)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowUpgrade(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#475569', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleUpgrade} disabled={upgrading || !upgradeForm.business_name.trim() || !upgradeForm.business_category} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: (upgrading || !upgradeForm.business_name.trim() || !upgradeForm.business_category) ? 0.5 : 1 }}>{upgrading ? 'Adding...' : 'Add Business Profile'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ==================== Helper Components ====================

function Row({ label, value, link }: { label: string; value: string | null | undefined; link?: boolean }) {
  if (!value) return <div><span style={{ color: '#94a3b8' }}>{label}: </span><span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Not set</span></div>
  return (
    <div>
      <span style={{ color: '#64748b' }}>{label}: </span>
      {link ? <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{value}</a> : <span style={{ fontWeight: 500 }}>{value}</span>}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} style={inputStyle} />
    </div>
  )
}

// ==================== Styles ====================

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }
const smallLinkStyle: React.CSSProperties = { padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.75rem', cursor: 'pointer', color: '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'inline-block' }
const cardStyle: React.CSSProperties = { padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }
const editBtnStyle: React.CSSProperties = { padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', color: '#2563eb' }
