'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'

const PRELAUNCH = false // disabled — site is open
const TARGET = 10000

const categoryTeasers = [
  { name: 'Housing', icon: '🏠', desc: 'Apartments, rooms, sublets' },
  { name: 'Jobs', icon: '💼', desc: 'Full-time, part-time, remote' },
  { name: 'For Sale', icon: '🛋️', desc: 'Furniture, electronics, clothing' },
  { name: 'Services', icon: '🔧', desc: 'Plumbers, cleaners, movers' },
  { name: 'Gigs', icon: '⚡', desc: 'Quick jobs & freelance' },
  { name: 'Community', icon: '🏘️', desc: 'Events, alerts, neighbors' },
]

function GateUI() {
  const [count, setCount] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/prelaunch')
      .then(r => r.json())
      .then(d => setCount(d.count || 0))
      .catch(() => {})
  }, [])

  const pct = Math.min((count / TARGET) * 100, 100)
  const countStr = count.toLocaleString()
  const targetStr = TARGET.toLocaleString()

  const handleShare = async () => {
    const shareData = {
      title: 'NYC Classifieds',
      text: `NYC Classifieds is launching at ${targetStr} verified New Yorkers — free classifieds for NYC. Sign up and help us get there!`,
      url: 'https://thenycclassifieds.com/signup',
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '48px 24px 64px', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: '8px' }}>
        NYC Classifieds is launching at<br />
        <span style={{ color: '#1a56db' }}>{targetStr} verified New Yorkers</span>
      </h2>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '24px' }}>
        Free classifieds for all 5 boroughs — housing, jobs, services, for sale & more.
        Every user is geo-verified with a selfie + GPS.
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          backgroundColor: '#e5e7eb',
          borderRadius: '999px',
          height: '20px',
          overflow: 'hidden',
        }}>
          <div style={{
            backgroundColor: '#1a56db',
            height: '100%',
            borderRadius: '999px',
            width: `${Math.max(pct, 2)}%`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <p style={{ marginTop: '8px', fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
          {countStr} / {targetStr} signed up
        </p>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
        <Link href="/signup" style={{
          backgroundColor: '#1a56db',
          color: '#fff',
          padding: '12px 32px',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 700,
          textDecoration: 'none',
        }}>
          Sign Up Free
        </Link>
        <button onClick={handleShare} style={{
          backgroundColor: '#fff',
          color: '#1a56db',
          padding: '12px 32px',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 700,
          border: '2px solid #1a56db',
          cursor: 'pointer',
        }}>
          {copied ? 'Link Copied!' : 'Share'}
        </button>
      </div>

      {/* Porch callout */}
      <div style={{
        backgroundColor: '#ecfdf5',
        border: '1px solid #a7f3d0',
        borderRadius: '8px',
        padding: '16px 20px',
        marginBottom: '32px',
      }}>
        <p style={{ fontSize: '0.9375rem', color: '#065f46', margin: 0 }}>
          <strong>The Porch is open now!</strong>{' '}
          Chat with neighbors, share recommendations, post alerts.
        </p>
        <Link href="/porch" style={{
          display: 'inline-block',
          marginTop: '8px',
          color: '#059669',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}>
          Visit The Porch →
        </Link>
      </div>

      {/* Category teaser grid */}
      <div style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
          What you&apos;ll get at launch
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '10px',
        }}>
          {categoryTeasers.map(c => (
            <div key={c.name} style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{c.icon}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111827' }}>{c.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PreLaunchGate({ children }: { children: ReactNode }) {
  const [bypass, setBypass] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!PRELAUNCH) {
      setBypass(true)
      setLoaded(true)
      return
    }
    fetch('/api/auth', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => {
        if (d.authenticated && (d.user?.role === 'admin' || d.user?.role === 'moderator')) {
          setBypass(true)
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!PRELAUNCH) return <>{children}</>
  if (!loaded) return null
  if (bypass) return <>{children}</>

  return <GateUI />
}
