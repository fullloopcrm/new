// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageUploader from '@/app/site//_components/ImageUploader'
import { categories, slugify, boroughs, businessCategories } from '@/app/site/nyc-classifieds/_lib/data'
import PreLaunchGate from '@/app/site//_components/PreLaunchGate'

export default function PostListingClient() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceStr, setPriceStr] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [subcategorySlug, setSubcategorySlug] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [borough, setBorough] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [accountType, setAccountType] = useState<string>('personal')
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userVerified, setUserVerified] = useState(false)
  const [postingAs, setPostingAs] = useState<'personal' | 'business'>('personal')
  const [showBizForm, setShowBizForm] = useState(false)
  const [bizLoading, setBizLoading] = useState(false)
  const [bizForm, setBizForm] = useState({ business_name: '', business_category: '', business_description: '' })
  const [bizPhotoFile, setBizPhotoFile] = useState<File | null>(null)
  const [bizPhotoPreview, setBizPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) {
          setAuthed(false)
        } else {
          setAuthed(true)
          setAccountType(d.user.account_type || 'personal')
          setBusinessName(d.user.business_name || null)
          setUserName(d.user.name || '')
          setUserEmail(d.user.email || '')
          setUserVerified(d.user.verified || false)
        }
      })
      .catch(() => setAuthed(false))
  }, [])

  const selectedCategory = categories.find(c => c.slug === categorySlug)
  const hasBusiness = accountType === 'business' && !!businessName
  const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'ymail.com', 'live.com']
  const hasBusinessEmail = userEmail ? !freeEmailDomains.includes(userEmail.split('@')[1]?.toLowerCase()) : false

  const businessCategories_slugs = ['services', 'jobs']
  const needsBusiness = businessCategories_slugs.includes(categorySlug) && !hasBusiness
  const isBlocked = needsBusiness

  const handleAddBusiness = async () => {
    if (!bizForm.business_name.trim() || !bizForm.business_category) return
    setBizLoading(true)
    try {
      const res = await fetch('/api/account/upgrade-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bizForm),
      })
      const data = await res.json()
      if (data.ok) {
        // Upload business photo if selected
        if (bizPhotoFile) {
          try {
            const formData = new FormData()
            formData.append('file', bizPhotoFile)
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
            const uploadData = await uploadRes.json()
            if (uploadRes.ok) {
              await fetch('/api/account/photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: uploadData.url, type: 'business' }),
              })
            }
          } catch { /* best-effort */ }
        }
        setAccountType('business')
        setBusinessName(bizForm.business_name.trim())
        setPostingAs('business')
        setShowBizForm(false)
      } else {
        setError(data.error || 'Failed to create business profile')
      }
    } catch {
      setError('Failed to create business profile')
    } finally {
      setBizLoading(false)
    }
  }

  const handleSubmit = async () => {
    setError('')
    if (!title.trim()) { setError('Title required'); return }
    if (!categorySlug) { setError('Category required'); return }
    if (isBlocked) { setError('Requirements not met for this category'); return }

    setLoading(true)
    try {
      const price = priceStr ? Math.round(parseFloat(priceStr) * 100) : null
      const selectedBorough = boroughs.find(b => b.slug === borough)
      const location = neighborhood && selectedBorough
        ? `${neighborhood}, ${selectedBorough.name}`
        : selectedBorough?.name || null
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price,
          category_slug: categorySlug,
          subcategory_slug: subcategorySlug || null,
          images,
          location,
          posting_as: hasBusiness ? postingAs : 'personal',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/listings/${categorySlug}/${data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to post listing')
    } finally {
      setLoading(false)
    }
  }

  if (authed === null) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>
  if (authed === false) {
    return (
      <main style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sign In Required</h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>You need an account to post listings.</p>
        <a href="/signup" style={{
          display: 'inline-block', padding: '0.75rem 1.5rem',
          backgroundColor: '#2563eb', color: '#fff', borderRadius: '0.5rem', fontWeight: 600,
          marginRight: '0.75rem',
        }}>
          Sign Up
        </a>
        <a href="/login" style={{
          display: 'inline-block', padding: '0.75rem 1.5rem',
          backgroundColor: '#fff', color: '#2563eb', borderRadius: '0.5rem', fontWeight: 600,
          border: '1px solid #2563eb',
        }}>
          Log In
        </a>
      </main>
    )
  }

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Post a Free Classified in NYC</h1>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Title *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What are you listing?" maxLength={200} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Category *</label>
        <select value={categorySlug}
          onChange={e => {
            setCategorySlug(e.target.value)
            setSubcategorySlug('')
            // Auto-set posting identity based on category
            if (['services', 'jobs'].includes(e.target.value) && hasBusiness) {
              setPostingAs('business')
            } else if (['personals', 'community', 'pets'].includes(e.target.value)) {
              setPostingAs('personal')
            }
          }}
          style={inputStyle}>
          <option value="">Select category</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Post as selector — only for users with business profile */}
      {hasBusiness && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Post as</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setPostingAs('personal')}
              style={{
                flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
                border: postingAs === 'personal' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                backgroundColor: postingAs === 'personal' ? '#f0fdf4' : '#fff',
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{userName || 'Personal'}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Your personal profile</div>
            </button>
            <button
              type="button"
              onClick={() => setPostingAs('business')}
              style={{
                flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
                border: postingAs === 'business' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: postingAs === 'business' ? '#eff6ff' : '#fff',
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{businessName}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Your business profile</div>
            </button>
          </div>
        </div>
      )}

      {/* Business profile gate — inline creation */}
      {needsBusiness && !showBizForm && (
        <div style={{
          padding: '16px', borderRadius: '8px', border: '1px solid #fbbf24',
          backgroundColor: '#fffbeb', marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#92400e', marginBottom: '6px' }}>
            Business profile needed
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#78350f', marginBottom: '10px' }}>
            {categorySlug === 'services'
              ? "To offer services, add a free business profile so customers can find you."
              : "To post jobs, add a free business profile so applicants can learn about your company."}
            {userVerified ? ' Since you\'re already verified, it\'s instant.' : ''}
          </p>
          {userVerified ? (
            <button
              onClick={() => setShowBizForm(true)}
              style={{
                padding: '6px 14px', borderRadius: '6px',
                backgroundColor: '#2563eb', color: '#fff', fontSize: '0.8125rem', fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              Add Business Profile
            </button>
          ) : (
            <Link href="/account" style={{
              display: 'inline-block', padding: '6px 14px', borderRadius: '6px',
              backgroundColor: '#2563eb', color: '#fff', fontSize: '0.8125rem', fontWeight: 600,
            }}>
              Get Verified First
            </Link>
          )}
        </div>
      )}

      {/* Inline business profile form */}
      {needsBusiness && showBizForm && (
        <div style={{
          padding: '16px', borderRadius: '12px', border: '1px solid #2563eb',
          backgroundColor: '#f8fafc', marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '4px' }}>
            Add Business Profile
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
            Your personal profile stays as your main identity. This just adds a business side.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Business Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setBizPhotoFile(file)
                      setBizPhotoPreview(URL.createObjectURL(file))
                    }
                    e.target.value = ''
                  }}
                />
                {bizPhotoPreview ? (
                  <img
                    src={bizPhotoPreview}
                    alt="Business photo"
                    style={{ width: '52px', height: '52px', borderRadius: '0.5rem', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '0.5rem',
                    backgroundColor: '#eff6ff', border: '2px dashed #93c5fd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: '1px',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                )}
              </label>
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Photo</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Logo or storefront</div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Business Name *</label>
              <input
                value={bizForm.business_name}
                onChange={e => setBizForm(f => ({ ...f, business_name: e.target.value }))}
                placeholder="e.g. Maria's Cleaning Service"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Category *</label>
              <select
                value={bizForm.business_category}
                onChange={e => setBizForm(f => ({ ...f, business_category: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select a category</option>
                {businessCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Quick Description</label>
              <input
                value={bizForm.business_description}
                onChange={e => setBizForm(f => ({ ...f, business_description: e.target.value }))}
                placeholder="What does your business do?"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowBizForm(false)}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0', backgroundColor: '#fff',
                  fontSize: '0.875rem', cursor: 'pointer', color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddBusiness}
                disabled={bizLoading || !bizForm.business_name.trim() || !bizForm.business_category}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '0.5rem',
                  border: 'none', backgroundColor: '#2563eb', color: '#fff',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  opacity: (bizLoading || !bizForm.business_name.trim() || !bizForm.business_category) ? 0.5 : 1,
                }}
              >
                {bizLoading ? 'Creating...' : 'Create & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCategory && !isBlocked && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Subcategory</label>
          <select value={subcategorySlug} onChange={e => setSubcategorySlug(e.target.value)} style={inputStyle}>
            <option value="">All</option>
            {selectedCategory.subs.map(s => (
              <option key={s} value={slugify(s)}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {!isBlocked && (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Price ($)</label>
            <input type="number" min="0" step="0.01" value={priceStr}
              onChange={e => setPriceStr(e.target.value)}
              placeholder="Leave empty for free / negotiable" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe your listing..." rows={5}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Borough</label>
            <select value={borough} onChange={e => { setBorough(e.target.value); setNeighborhood('') }} style={inputStyle}>
              <option value="">Select borough</option>
              {boroughs.map(b => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>

          {borough && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>Neighborhood</label>
              <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)} style={inputStyle}>
                <option value="">Select neighborhood</option>
                {boroughs.find(b => b.slug === borough)?.neighborhoods.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Photos</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
            backgroundColor: '#2563eb', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          }}>
            {loading ? 'Posting...' : 'Post Listing'}
          </button>
        </>
      )}
    </main>
    </PreLaunchGate>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.875rem', fontWeight: 600,
  color: '#334155', marginBottom: '0.375rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none',
}
