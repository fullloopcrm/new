'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFormTracking } from '@/lib/useFormTracking'

export default function ReferralSignupPage() {
  const { trackStart, trackSuccess } = useFormTracking('/referral/signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ ref_code: string } | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_payout: 'zelle',
    payout_dest: '',
  })
  const [honeypot, setHoneypot] = useState('')
  const [formLoadTime] = useState(Date.now())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/referrers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        preferred_payout: form.preferred_payout,
        zelle_email: form.preferred_payout === 'zelle' ? (form.payout_dest || form.email) : undefined,
        apple_cash_phone: form.preferred_payout === 'apple_cash' ? (form.payout_dest || form.phone) : undefined,
        website: honeypot || undefined,
        _t: formLoadTime,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
    } else {
      trackSuccess()
      setResult({ ref_code: data.referral?.referral_code || data.ref_code })
    }
    setLoading(false)
  }

  if (result) {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/referral/${result.ref_code}` : `/referral/${result.ref_code}`
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">You&apos;re In!</h1>
          <p className="text-slate-500 mb-6">Welcome to the referral program</p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-400 mb-2">Your referral code</p>
            <p className="text-2xl font-bold font-mono text-teal-600">{result.ref_code}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-slate-500 font-mono break-all mb-4">
            {link}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(link)}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium mb-3"
          >
            Copy My Referral Link
          </button>
          <Link href={`/referral/${result.ref_code}`} className="block text-sm text-blue-600 font-medium mb-4">
            Go to My Dashboard
          </Link>
          <p className="text-xs text-slate-400">Share your link and earn 10% of every booking!</p>
          <p className="text-xs text-slate-400 mt-2">Please check your spam/junk folder if you don&apos;t see our email in your inbox.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Get Paid for Referrals</h1>
        <p className="text-sm text-slate-400 text-center mb-8">
          Earn 10% commission every time someone you refer books a service
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-600">10%</p>
            <p className="text-[10px] text-slate-400">Commission</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-600">♻</p>
            <p className="text-[10px] text-slate-400">Recurring</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-600">⚡</p>
            <p className="text-[10px] text-slate-400">Fast Payout</p>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={submit} onFocusCapture={trackStart} className="space-y-4">
          {/* Honeypot - hidden from real users */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Smith"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="212-555-1234"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">How would you like to be paid? *</label>
            <select
              value={form.preferred_payout}
              onChange={(e) => setForm({ ...form, preferred_payout: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
            >
              <option value="zelle">Zelle</option>
              <option value="apple_cash">Apple Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {form.preferred_payout === 'zelle' ? 'Zelle Email or Phone' : 'Apple Cash Phone'}
            </label>
            <input
              type="text"
              value={form.payout_dest}
              onChange={(e) => setForm({ ...form, payout_dest: e.target.value })}
              placeholder={form.preferred_payout === 'zelle' ? 'Same as email if blank' : 'Your Apple Cash phone number'}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">We&apos;ll send your commissions here</p>
          </div>

          {/* SMS Consent */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs leading-relaxed text-slate-500">
              <input type="checkbox" name="sms_consent" required className="mt-0.5 min-w-[18px] min-h-[18px]" />
              <span>By checking this box, I consent to receive transactional text messages for appointment confirmations, reminders, and customer support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply. <Link href="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link> | <Link href="/terms" className="text-teal-600 hover:underline">Terms &amp; Conditions</Link></span>
            </label>
          </div>

          <button type="submit" disabled={loading || !form.name || !form.email}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium disabled:opacity-50">
            {loading ? 'Signing Up...' : 'Join Referral Program'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-slate-400">
            Already a referrer?{' '}
            <Link href="/referral" className="text-teal-600 hover:underline">
              Log in to your dashboard
            </Link>
          </p>
        </div>

        {/* How it works */}
        <div className="mt-10 space-y-4">
          <h2 className="font-semibold text-slate-800 text-center">How It Works</h2>
          <div className="space-y-3 text-sm">
            {[
              { n: '1', text: 'Sign up & get your unique link (30 seconds)' },
              { n: '2', text: 'Share with friends & family' },
              { n: '3', text: 'Earn 10% every time they book' },
            ].map((step) => (
              <div key={step.n} className="flex items-center gap-3">
                <span className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">{step.n}</span>
                <p className="text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
