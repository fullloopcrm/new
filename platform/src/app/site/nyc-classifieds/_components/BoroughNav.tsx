// @ts-nocheck
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { boroughs, neighborhoodSlug, findNeighborhood } from '@/app/site/nyc-classifieds/_lib/data'

interface PendingSelection {
  boroughSlug: string
  nhSlug: string
  nhName: string
  boroughName: string
}

export default function BoroughNav() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingSelection | null>(null)

  const handleNeighborhoodClick = (boroughSlug: string, nhSlug: string) => {
    const b = boroughs.find(b => b.slug === boroughSlug)
    const nh = findNeighborhood(boroughSlug, nhSlug)
    if (!b || !nh) return
    setPending({ boroughSlug, nhSlug, nhName: nh.name, boroughName: b.name })
  }

  const confirmSave = () => {
    if (!pending) return
    localStorage.setItem('home', `${pending.boroughSlug}/${pending.nhSlug}`)
    setPending(null)
    setExpanded(null)
    window.location.reload()
  }

  const cancelSave = () => {
    setPending(null)
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '0 0 6px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
          Pick your borough to set your neighborhood
        </p>
        <button
          onClick={() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
            setTimeout(() => {
              const widget = document.querySelector('[data-feedback-widget]') as HTMLElement
              if (widget) widget.click()
            }, 600)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#dc2626',
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Feedback?
        </button>
      </div>
      <nav aria-label="Browse by borough" className="home-borough-nav" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
        <button
          onClick={() => {
            localStorage.removeItem('home')
            window.location.href = '/'
          }}
          style={{
            color: expanded === null && !pending ? '#111827' : '#1a56db',
            fontSize: '1rem',
            fontWeight: expanded === null && !pending ? 700 : 500,
            textDecoration: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          NYC
        </button>
        {boroughs.map(b => (
          <button
            key={b.slug}
            onClick={() => {
              const willExpand = expanded !== b.slug
              setExpanded(willExpand ? b.slug : null)
            }}
            style={{
              color: expanded === b.slug ? '#111827' : '#1a56db',
              fontSize: '1rem',
              fontWeight: expanded === b.slug ? 700 : 500,
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {b.name}
          </button>
        ))}
      </nav>

      {/* Confirmation popup */}
      {pending && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          margin: '8px 0',
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          fontSize: '0.875rem',
          fontFamily: "'DM Sans', sans-serif",
          color: '#111827',
          flexWrap: 'wrap',
        }}>
          <span>Save <strong>{pending.nhName}, {pending.boroughName}</strong> as your neighborhood?</span>
          <button
            onClick={confirmSave}
            style={{
              backgroundColor: '#1a56db',
              color: '#ffffff',
              padding: '5px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
            }}
          >
            Yes
          </button>
          <button
            onClick={cancelSave}
            style={{
              color: '#6b7280',
              fontSize: '0.8125rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Not now
          </button>
        </div>
      )}

      {expanded && !pending && (() => {
        const borough = boroughs.find(b => b.slug === expanded)
        if (!borough) return null
        return (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 12px',
            padding: '8px 0 4px',
          }}>
            <Link
              href={`/${borough.slug}`}
              style={{
                fontSize: '0.8125rem',
                color: '#1a56db',
                fontWeight: 600,
                textDecoration: 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              All {borough.name}
            </Link>
            {borough.neighborhoods.map(n => (
              <button
                key={n}
                onClick={() => handleNeighborhoodClick(borough.slug, neighborhoodSlug(n))}
                style={{
                  fontSize: '0.8125rem',
                  color: '#1a56db',
                  textDecoration: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
