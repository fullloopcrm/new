'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {})
  }, [error])

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', maxWidth: 480, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>Something went wrong</h1>
      <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        We hit an unexpected error. Our team has been notified.
      </p>
      <button
        onClick={reset}
        style={{ background: '#2563eb', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        Try again
      </button>
      <p style={{ color: '#94a3b8', fontSize: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '1.5rem' }}>
        Need help? Call <a href="tel:2122029220" style={{ color: '#2563eb' }}>212.202.9220</a>
      </p>
    </div>
  )
}
