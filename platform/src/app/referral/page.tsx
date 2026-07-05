'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Referrer login. Two steps: email → we email a 6-digit code → code → session
// token. The earnings dashboard (with client names) is gated behind this so the
// referral code alone can no longer reveal a partner's earnings.
export default function ReferralLoginPage() {
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Referral Portal</h1>
          <p className="text-slate-400 text-sm mt-1">View your referral earnings</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {step === 'email' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && requestCode()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-800 text-sm"
                placeholder="Enter your email"
                autoFocus
              />
            </div>
            <button
              onClick={requestCode}
              disabled={loading || !email}
              className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Email Me a Login Code'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 text-center">
              We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Login Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-800 text-center text-2xl tracking-[0.4em] font-mono"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button
              onClick={verifyCode}
              disabled={loading || code.length < 6}
              className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'View My Earnings'}
            </button>
            <button
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="w-full text-sm text-slate-400 hover:text-slate-600"
            >
              Use a different email
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-slate-400">
            Not a referrer yet?{' '}
            <Link href="/referral/signup" className="text-teal-600 hover:underline font-medium">
              Join the program
            </Link>
          </p>
        </div>

        <p className="text-xs text-slate-300 mt-4 text-center">Questions? Contact the business directly.</p>
      </div>
    </div>
  )
}
