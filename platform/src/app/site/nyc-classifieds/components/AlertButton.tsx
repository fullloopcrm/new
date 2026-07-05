'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AlertButtonProps {
  category?: string
  subcategory?: string
  keywords?: string
}

export default function AlertButton({ category, subcategory, keywords }: AlertButtonProps) {
  const [user, setUser] = useState<{ name?: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => { if (d.authenticated) setUser(d.user) })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords || undefined,
          category: category || undefined,
          subcategory: subcategory || undefined,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {}
    finally { setSaving(false) }
  }

  if (!user) {
    return (
      <Link href="/signup" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#2563eb',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        Get alerts
      </Link>
    )
  }

  if (saved) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        borderRadius: '6px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#059669',
        whiteSpace: 'nowrap',
      }}>
        Alert saved!
      </span>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 10px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#fff',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: '#2563eb',
        cursor: saving ? 'wait' : 'pointer',
        opacity: saving ? 0.6 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {saving ? 'Saving...' : 'Alert me'}
    </button>
  )
}
