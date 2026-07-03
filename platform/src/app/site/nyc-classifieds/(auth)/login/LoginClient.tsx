'use client'

import { useState } from 'react'
import AuthShell, {
  authLabelClass,
  authInputClass,
  authButtonClass,
  authErrorClass,
  authLinkClass,
} from '@/components/auth/AuthShell'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (loading || !email || pin.length < 4) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: email.trim().toLowerCase(), pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      window.location.href = '/account'
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell businessName="NYC Classifieds" subtitle="Member Login">
      <form
        className="mt-10"
        onSubmit={(e) => {
          e.preventDefault()
          handleLogin()
        }}
      >
        <div>
          <label htmlFor="classifieds-email" className={authLabelClass}>
            Email
          </label>
          <input
            id="classifieds-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </div>

        <div className="mt-6">
          <label htmlFor="classifieds-pin" className={authLabelClass}>
            PIN
          </label>
          <input
            id="classifieds-pin"
            type="password"
            inputMode="numeric"
            maxLength={10}
            placeholder="4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className={authInputClass}
          />
        </div>

        {error && <p className={`mt-3 ${authErrorClass}`}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !email || pin.length < 4}
          className={`mt-8 ${authButtonClass}`}
        >
          {loading ? 'Logging in…' : 'Log in →'}
        </button>
      </form>

      <div className="mt-6 space-y-1 text-center font-mono text-xs uppercase tracking-wide text-neutral-500">
        <p>
          No account?{' '}
          <a href="/signup" className={authLinkClass}>
            Sign up
          </a>
        </p>
        <p>
          Forgot your PIN?{' '}
          <a href="/forgot-pin" className={authLinkClass}>
            Reset via email
          </a>
        </p>
      </div>
    </AuthShell>
  )
}
