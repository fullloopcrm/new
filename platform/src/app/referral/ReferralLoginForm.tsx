'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
} from '@/components/auth/AuthShell'

interface ReferralLoginFormProps {
  businessName: string
}

// Referrer login. Two steps: email → we email a 6-digit code → code → session
// token. The earnings dashboard (with client names) is gated behind this so the
// referral code alone can no longer reveal a partner's earnings.
export default function ReferralLoginForm({ businessName }: ReferralLoginFormProps) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function requestCode() {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/referrers/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setStep('code')
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Failed to connect. Please try again.')
    }
    setLoading(false)
  }

  async function verifyCode() {
    if (!code) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/referrers/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.token && d.referral_code) {
        localStorage.setItem('referrer_auth', JSON.stringify({ token: d.token, code: d.referral_code }))
        router.push(`/referral/${d.referral_code}`)
      } else {
        setError(d.error || 'Invalid or expired code.')
      }
    } catch {
      setError('Failed to connect. Please try again.')
    }
    setLoading(false)
  }

  return (
    <AuthShell
      businessName={businessName}
      subtitle="Referral Portal"
      helpLinks={[{ label: 'Join the Program', href: '/referral/signup' }]}
    >
      {step === 'email' ? (
        <div className="mt-10">
          <label htmlFor="referral-email" className={authLabelClass}>
            Email
          </label>
          <input
            id="referral-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && requestCode()}
            className={authInputClass}
            placeholder="Enter your email"
            autoFocus
          />

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button
            type="button"
            onClick={requestCode}
            disabled={loading || !email}
            className={`mt-8 ${authButtonClass}`}
          >
            {loading ? 'Sending…' : 'Email me a login code →'}
          </button>
        </div>
      ) : (
        <div className="mt-10">
          <p className="font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
            We sent a 6-digit code to <span className="text-neutral-800">{email}</span>.
          </p>

          <div className="mt-6">
            <label htmlFor="referral-code" className={authLabelClass}>
              Login Code
            </label>
            <input
              id="referral-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
              className={`${authInputClass} text-center text-2xl tracking-[0.4em]`}
              placeholder="000000"
              autoFocus
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button
            type="button"
            onClick={verifyCode}
            disabled={loading || code.length < 6}
            className={`mt-8 ${authButtonClass}`}
          >
            {loading ? 'Verifying…' : 'View my earnings →'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError('') }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            ← Use a different email
          </button>
        </div>
      )}
    </AuthShell>
  )
}
