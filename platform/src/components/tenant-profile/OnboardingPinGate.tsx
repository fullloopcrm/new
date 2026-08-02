'use client'

/**
 * PIN gate shown before the public /onboard/[token] wizard — see
 * src/lib/onboarding-pin.ts for what the PIN is and why it exists (friction
 * on top of the signed link token, not a replacement for it). Fetches the
 * tenant name pre-PIN (GET /api/onboarding/pin), then verifies the entered
 * PIN (POST) and hands the caller the elevated token to use for the rest of
 * the wizard session.
 */
import { useEffect, useState } from 'react'

interface Props {
  token: string
  onVerified: (elevatedToken: string) => void
}

export function OnboardingPinGate({ token, onVerified }: Props) {
  const [name, setName] = useState('')
  const [loadingName, setLoadingName] = useState(true)
  const [linkError, setLinkError] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/onboarding/pin?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) throw new Error('invalid link')
        return res.json()
      })
      .then((data: { name?: string; pinRequired?: boolean }) => {
        if (cancelled) return
        if (!data.pinRequired) {
          onVerified(token)
          return
        }
        setName(data.name || '')
      })
      .catch(() => {
        if (!cancelled) setLinkError(true)
      })
      .finally(() => {
        if (!cancelled) setLoadingName(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, onVerified])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/onboarding/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin }),
      })
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
      if (!res.ok || !data.token) {
        setError(data.error || 'Incorrect PIN. Try again.')
        setPin('')
        return
      }
      onVerified(data.token)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingName) return null

  if (linkError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="font-heading text-xl font-bold text-slate-900">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-slate-500">It may have expired or been regenerated. Reach out for a fresh one.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full Loop CRM</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900">{name || 'Welcome'}</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your PIN to continue setup</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="onboarding-pin" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              PIN
            </label>
            <input
              id="onboarding-pin"
              type="tel"
              inputMode="numeric"
              autoFocus
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setError(null)
                setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.5em] focus:border-slate-500 focus:outline-none"
              placeholder="••••"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || pin.length !== 4}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Checking…' : 'Continue →'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          Your PIN is the last 4 digits of the phone number on file for your business.
        </p>
      </div>
    </div>
  )
}
