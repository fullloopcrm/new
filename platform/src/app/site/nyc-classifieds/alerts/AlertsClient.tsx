// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { categories, type Category } from '@/app/site/nyc-classifieds/_lib/data'

interface SavedSearch {
  id: number
  label: string
  keywords: string | null
  category: string | null
  subcategory: string | null
  min_price: number | null
  max_price: number | null
  created_at: string
}

// Categories where price filter doesn't apply
const hidePriceCategories = new Set(['jobs', 'services', 'gigs', 'resumes', 'personals', 'barter', 'community'])

export default function AlertsClient() {
  const router = useRouter()
  const [user, setUser] = useState<{ name?: string } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [alerts, setAlerts] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [keywords, setKeywords] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedCat = categories.find(c => c.slug === category)
  const showPrice = category ? !hidePriceCategories.has(category) : true

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setUser(d.user)
          // Fetch alerts
          fetch('/api/saved-searches')
            .then(r => r.json())
            .then(data => setAlerts(data.alerts || []))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => { setAuthChecked(true); setLoading(false) })
  }, [])

  const handleCreate = async () => {
    if (!user) {
      router.push(`/signup?redirect=/alerts`)
      return
    }

    setError('')
    setSuccess('')

    if (!keywords.trim() && !category) {
      setError('Please enter keywords or select a category.')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.trim() || undefined,
          category: category || undefined,
          subcategory: subcategory || undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create alert')
        return
      }
      setAlerts(prev => [data.alert, ...prev])
      setKeywords('')
      setCategory('')
      setSubcategory('')
      setMinPrice('')
      setMaxPrice('')
      setSuccess('Alert created! You\'ll be notified when matching listings are posted.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    const res = await fetch('/api/saved-searches', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setAlerts(prev => prev.filter(a => a.id !== id))
    }
  }

  return (
    <main style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>I'm Looking For...</h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Tell us what you want and we'll notify you when it's posted.
      </p>

      {/* Create Alert Form */}
      <section style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '2rem', backgroundColor: '#fafafa' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Create Alert</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Keywords */}
          <div>
            <label style={labelStyle}>Keywords</label>
            <input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. studio apartment, road bike, graphic designer..."
              style={inputStyle}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setSubcategory('') }}
              style={inputStyle}
            >
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          {selectedCat && selectedCat.subs.length > 0 && (
            <div>
              <label style={labelStyle}>Subcategory <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <select
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                style={inputStyle}
              >
                <option value="">All {selectedCat.name.toLowerCase()}</option>
                {selectedCat.subs.map(s => (
                  <option key={s} value={s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Price range */}
          {showPrice && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Min price <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="$0"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Max price <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="No limit"
                  min="0"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {error && <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#059669', fontSize: '0.8125rem', margin: 0 }}>{success}</p>}

          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating...' : user ? 'Create Alert' : 'Sign up to create alerts'}
          </button>
        </div>
      </section>

      {/* My Alerts */}
      <section>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>My Alerts</h2>

        {!authChecked || loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : !user ? (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: '0.75rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Log in to manage your alerts</p>
            <Link href="/login?redirect=/alerts" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.875rem' }}>Log in</Link>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '0.75rem' }}>
            No alerts yet. Tell us what you're looking for above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{alert.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    Created {new Date(alert.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(alert.id)}
                  style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', color: '#dc2626', flexShrink: 0 }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }
