'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ReferralLoginPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/referrers?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.referral_code) {
          router.push(`/referral/${data.referral_code}`)
        } else if (data.ref_code) {
          router.push(`/referral/${data.ref_code}`)
        } else {
          setError('Email not found.')
        }
      } else {
        setError('Email not found. Check your email or sign up.')
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-800 text-sm"
              placeholder="Enter your email"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading || !email}
            className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'View My Earnings'}
          </button>
        </div>

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
