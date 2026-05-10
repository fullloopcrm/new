// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageUploader from '@/app/site/nyc-classifieds/_components/ImageUploader'
import { categories, slugify, boroughs } from '@/app/site/nyc-classifieds/_lib/data'
import PreLaunchGate from '@/app/site/nyc-classifieds/_components/PreLaunchGate'

export default function EditListingClient({ id }: { id: string }) {
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth').then(r => r.json()),
      fetch(`/api/listings/${id}`).then(r => r.json()),
    ]).then(([authData, listing]) => {
      if (!authData.authenticated) {
        router.push('/login')
        return
      }
      if (listing.error || listing.user_id !== authData.user.id) {
        router.push('/account')
        return
      }
      setAuthed(true)
      setTitle(listing.title || '')
      setDescription(listing.description || '')
      setPriceStr(listing.price != null ? (listing.price / 100).toString() : '')
      setCategorySlug(listing.category_slug || '')
      setSubcategorySlug(listing.subcategory_slug || '')
      setImages(listing.images || [])

      // Parse location back into borough/neighborhood
      if (listing.location) {
        const parts = listing.location.split(',').map((s: string) => s.trim())
        if (parts.length === 2) {
          const b = boroughs.find(b => b.name === parts[1])
          if (b) {
            setBorough(b.slug)
            setNeighborhood(parts[0])
          }
        } else if (parts.length === 1) {
          const b = boroughs.find(b => b.name === parts[0])
          if (b) setBorough(b.slug)
        }
      }
    }).catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [id, router])

  const selectedCategory = categories.find(c => c.slug === categorySlug)

  const handleSave = async () => {
    setError('')
    if (!title.trim()) { setError('Title required'); return }

    setSaving(true)
    try {
      const price = priceStr ? Math.round(parseFloat(priceStr) * 100) : null
      const selectedBorough = boroughs.find(b => b.slug === borough)
      const location = neighborhood && selectedBorough
        ? `${neighborhood}, ${selectedBorough.name}`
        : selectedBorough?.name || null

      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price,
          subcategory_slug: subcategorySlug || null,
          images,
          location,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/listings/${categorySlug}/${id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</main>
  if (!authed) return null

  return (
    <PreLaunchGate>
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Edit Listing</h1>
        <Link href="/account" style={{ color: '#64748b', fontSize: '0.875rem' }}>Back to account</Link>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Title *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          maxLength={200} style={inputStyle} />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Category</label>
        <div style={{ ...inputStyle, backgroundColor: '#f8fafc', color: '#64748b' }}>
          {categories.find(c => c.slug === categorySlug)?.name || categorySlug}
        </div>
      </div>

      {selectedCategory && (
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

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Price ($)</label>
        <input type="number" min="0" step="0.01" value={priceStr}
          onChange={e => setPriceStr(e.target.value)}
          placeholder="Leave empty for free / negotiable" style={inputStyle} />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
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

      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
        backgroundColor: '#2563eb', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
      }}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
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
  boxSizing: 'border-box',
}
