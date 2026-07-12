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

export default function PortalLoginPage() {
  const { setAuth } = usePortalAuth()
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [slug, setSlug] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_code', phone, tenant_slug: slug }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setStep('code')
    }
    setLoading(false)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_code', phone, code, tenant_slug: slug }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setAuth(data)
      router.push('/portal')
    }
    setLoading(false)
  }

  return (
    <AuthShell businessName="Full Loop" subtitle="Client Portal">
      {step === 'phone' ? (
        <form className="mt-10" onSubmit={sendCode}>
          <div>
            <label htmlFor="portal-slug" className={authLabelClass}>
              Business code
            </label>
            <input
              id="portal-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              placeholder="nyc-maid"
              className={authInputClass}
            />
          </div>

          <div className="mt-6">
            <label htmlFor="portal-phone" className={authLabelClass}>
              Phone
            </label>
            <input
              id="portal-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="Phone number"
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button type="submit" disabled={loading} className={`mt-8 ${authButtonClass}`}>
            {loading ? 'Sending…' : 'Send code →'}
          </button>
        </form>
      ) : (
        <form className="mt-10" onSubmit={verifyCode}>
          <div>
            <label htmlFor="portal-code" className={authLabelClass}>
              Verification code
            </label>
            <input
              id="portal-code"
              autoFocus
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              placeholder="6-digit code"
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className={`mt-8 ${authButtonClass}`}
          >
            {loading ? 'Verifying…' : 'Verify →'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            ← Back
          </button>
        </form>
      )}
    </AuthShell>
  )
}
