'use client'

import { useState, useEffect } from 'react'

const CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
  { value: 'other', label: 'Other' },
]

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/auth', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(d => { if (d.authenticated) setIsLoggedIn(true) })
      .catch(() => {})
  }, [])

  const handleSubmit = async () => {
    setError('')
    const trimmed = message.trim()
    if (trimmed.length < 10) {
      setError('Message must be at least 10 characters.')
      return
    }
    if (trimmed.length > 2000) {
      setError('Message must be under 2000 characters.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          category,
          message: trimmed,
          email: !isLoggedIn ? email.trim() : undefined,
          page_url: window.location.href,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to submit. Please try again.')
        return
      }

      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setCategory('general')
        setMessage('')
        setEmail('')
        setError('')
      }, 3000)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          data-feedback-widget
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            zIndex: 9999,
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Feedback card */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            width: '340px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            border: '1px solid #e2e8f0',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>Send Feedback</span>
            <button
              onClick={() => { setOpen(false); setError('') }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#94a3b8',
                lineHeight: 1,
                padding: '0 2px',
              }}
            >
              &times;
            </button>
          </div>

          {submitted ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>&#10003;</div>
              <p style={{ fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>Thanks for your feedback!</p>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>We&apos;ll review it soon.</p>
            </div>
          ) : (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Category */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.875rem',
                    backgroundColor: '#fff',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Message</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  rows={4}
                  maxLength={2000}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'right', marginTop: '2px' }}>
                  {message.length}/2000
                </div>
              </div>

              {/* Email (anonymous only) */}
              {!isLoggedIn && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Email <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional, for follow-up)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.875rem',
                      outline: 'none',
                      color: '#0f172a',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {error && (
                <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: 0 }}>{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: submitting ? '#93c5fd' : '#2563eb',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
