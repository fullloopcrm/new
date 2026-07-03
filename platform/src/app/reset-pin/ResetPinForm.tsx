'use client'

import { useState } from 'react'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
} from '@/components/auth/AuthShell'

interface ResetPinFormProps {
  businessName: string
}

type Step = 'contact' | 'code' | 'done'

export default function ResetPinForm({ businessName }: ResetPinFormProps) {
  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!contact.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pin-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_code', contact }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send a code.')
        return
      }
      setStep('code')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  async function verifyAndSet(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6 || newPin.length < 4 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pin-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_and_set', contact, code, new_pin: newPin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not reset your PIN.')
        return
      }
      setStep('done')
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <AuthShell businessName={businessName} subtitle="PIN Reset">
        <p className="mt-8 font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-500">
          Your PIN has been updated. Use it to sign in.
        </p>
        <a href="/fullloop" className={`mt-8 inline-block text-center ${authButtonClass}`}>
          Sign in →
        </a>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      businessName={businessName}
      subtitle="Reset your PIN"
      helpLinks={[{ label: '← Back to sign in', href: '/fullloop' }]}
    >
      {step === 'contact' ? (
        <form className="mt-10" onSubmit={sendCode}>
          <label htmlFor="reset-contact" className={authLabelClass}>
            Phone or email
          </label>
          <input
            id="reset-contact"
            autoFocus
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Your on-file phone or email"
            className={authInputClass}
          />
          <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-wide text-neutral-400">
            We&apos;ll text or email a reset code from {businessName}.
          </p>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button type="submit" disabled={!contact.trim() || loading} className={`mt-8 ${authButtonClass}`}>
            {loading ? 'Sending…' : 'Send code →'}
          </button>
        </form>
      ) : (
        <form className="mt-10" onSubmit={verifyAndSet}>
          <label htmlFor="reset-code" className={authLabelClass}>
            Reset code
          </label>
          <input
            id="reset-code"
            autoFocus
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            placeholder="6-digit code"
            className={authInputClass}
          />

          <div className="mt-6">
            <label htmlFor="reset-newpin" className={authLabelClass}>
              New PIN
            </label>
            <input
              id="reset-newpin"
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
              placeholder="4–8 digits"
              className={authInputClass}
            />
          </div>

          {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

          <button
            type="submit"
            disabled={code.length !== 6 || newPin.length < 4 || loading}
            className={`mt-8 ${authButtonClass}`}
          >
            {loading ? 'Setting PIN…' : 'Set new PIN →'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('contact')
              setError('')
            }}
            className="mt-4 w-full font-mono text-xs uppercase tracking-wide text-neutral-500"
          >
            ← Use a different phone/email
          </button>
        </form>
      )}
    </AuthShell>
  )
}
