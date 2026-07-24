'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '../layout'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
} from '@/components/auth/AuthShell'

type Step = 'pin' | 'forgot' | 'forgot-sent'

export default function PortalLoginPage() {
  const { setAuth } = usePortalAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>('pin')
  const [slug, setSlug] = useState('')
  const [pin, setPin] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateSlug(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', pin, tenant_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        setPin('')
        return
      }
      setAuth(data)
      router.push('/portal')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  async function requestPin(e: React.FormEvent) {
    e.preventDefault()
    if (!slug || !contact.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_pin', contact, tenant_slug: slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send a PIN')
        return
      }
      setStep('forgot-sent')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'forgot-sent') {
    return (
      <AuthShell businessName="Full Loop" subtitle="Client Portal">
        <p className="mt-8 font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
          A PIN was emailed to you. Check your inbox, then sign in.
        </p>
        <button
          type="button"
          onClick={() => {
            setStep('pin')
            setContact('')
            setError('')
          }}
          className={`mt-8 ${authButtonClass}`}
        >
          Back to sign in →
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell businessName="Full Loop" subtitle="Client Portal">
      {step === 'pin' ? (
        <form className="mt-10" onSubmit={login}>
          <div>
            <label htmlFor="portal-slug" className={authLabelClass}>
              Business code
            </label>
            <input
              id="portal-slug"
              value={slug}
              onChange={(e) => updateSlug(e.target.value)}
              required
              placeholder="nycmaid"
              className={authInputClass}
            />
          </div>

          <div className="mt-6">
            <label htmlFor="portal-pin" className={authLabelClass}>
              PIN
            </label>
            <input
              id="portal-pin"
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              placeholder="PIN"
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button type="submit" disabled={loading || pin.length < 4 || !slug} className={`mt-8 ${authButtonClass}`}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('forgot')
              setError('')
            }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            Don&apos;t have a PIN?
          </button>
        </form>
      ) : (
        <form className="mt-10" onSubmit={requestPin}>
          <div>
            <label htmlFor="forgot-slug" className={authLabelClass}>
              Business code
            </label>
            <input
              id="forgot-slug"
              value={slug}
              onChange={(e) => updateSlug(e.target.value)}
              required
              placeholder="nycmaid"
              className={authInputClass}
            />
          </div>

          <div className="mt-6">
            <label htmlFor="forgot-contact" className={authLabelClass}>
              Phone or email on file
            </label>
            <input
              id="forgot-contact"
              autoFocus
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder="Phone or email"
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button type="submit" disabled={loading} className={`mt-8 ${authButtonClass}`}>
            {loading ? 'Sending…' : 'Email me a PIN →'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('pin')
              setError('')
            }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            ← Back
          </button>
        </form>
      )}
    </AuthShell>
  )
}
