'use client'

import {useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFormTracking } from '@/app/site/the-florida-maid/_lib/useFormTracking'

export default function ReferralSignupPage() {
  useEffect(() => { document.title = 'Become a Referrer | The Florida Maid' }, []);
  const router = useRouter()
  const { trackStart, trackSuccess } = useFormTracking('/referral/signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [refCode, setRefCode] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    zelle_email: '',
    preferred_payout: 'zelle'
  })
  const [honeypot, setHoneypot] = useState('')
  const [loadedAt] = useState(Date.now())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/referrers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          zelle_email: form.zelle_email || form.email,
          website: honeypot,
          _t: loadedAt
        })
      })

      const data = await res.json()

      if (res.ok) {
        trackSuccess()
        setSuccess(true)
        setRefCode(data.ref_code)
      } else {
        setError(data.error || 'Failed to sign up')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`https://www.thefloridamaid.com/clients?ref=${refCode}`)
    alert('Link copied!')
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1E2A4A] mb-2">You're In! 🎉</h1>
          <p className="text-gray-600 mb-6">Welcome to The Florida Maid referral program</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Your referral code</p>
            <p className="text-2xl font-bold text-[#1E2A4A]">{refCode}</p>
          </div>

          <p className="text-xs text-gray-400 mt-4">📧 Please check your spam/junk folder if you don't see our email in your inbox.</p>
          <div className="bg-[#A8F0DC]/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#1E2A4A] mb-2">Your referral link</p>
            <p className="text-sm font-mono text-[#1E2A4A] break-all">https://www.thefloridamaid.com/clients?ref={refCode}</p>
            <button
              onClick={copyLink}
              className="mt-3 px-4 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm hover:bg-[#1E2A4A]/90"
            >
              Copy Link
            </button>
          </div>

          <div className="space-y-3">
            <Link
              href={`/referral?code=${refCode}`}
              className="block w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90"
            >
              Go to My Dashboard
            </Link>
            <p className="text-sm text-gray-500">
              Share your link and earn 10% of every cleaning!
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Signup form
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1E2A4A] text-white py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Get Paid for Referrals</h1>
          <p className="text-gray-300">Earn 10% commission every time we clean for someone you refer</p>
        </div>
      </header>

      {/* Benefits */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl mb-2">💰</div>
              <p className="font-semibold">10% Commission</p>
              <p className="text-sm text-gray-500">On every cleaning</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🔄</div>
              <p className="font-semibold">Recurring Income</p>
              <p className="text-sm text-gray-500">Every time they book</p>
            </div>
            <div>
              <div className="text-3xl mb-2">⚡</div>
              <p className="font-semibold">Fast Payouts</p>
              <p className="text-sm text-gray-500">Via Zelle or Apple Cash</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-[#1E2A4A] mb-6">Sign Up to Start Earning</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} onFocusCapture={trackStart} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]"
                placeholder="john@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]"
                placeholder="954-555-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How would you like to be paid? *
              </label>
              <select
                value={form.preferred_payout}
                onChange={(e) => setForm({ ...form, preferred_payout: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]"
              >
                <option value="zelle">Zelle</option>
                <option value="apple_cash">Apple Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.preferred_payout === 'zelle' ? 'Zelle Email or Phone' : 'Apple Cash Phone'}
              </label>
              <input
                type="text"
                value={form.zelle_email}
                onChange={(e) => setForm({ ...form, zelle_email: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]"
                placeholder={form.preferred_payout === 'zelle' ? 'Same as email if blank' : 'Your Apple Cash phone number'}
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll send your commissions here
              </p>
            </div>

            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', lineHeight: '1.5', color: '#555' }}>
                <input type="checkbox" name="sms_consent" required style={{ marginTop: '3px', minWidth: '18px', minHeight: '18px' }} />
                <span>By checking this box, I consent to receive transactional text messages from <strong>The Florida Maid</strong> for appointment confirmations, reminders, and customer support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply. <a href="https://www.thefloridamaid.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline">Privacy Policy</a> | <a href="https://www.thefloridamaid.com/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline">Terms &amp; Conditions</a></span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
            >
              {loading ? 'Signing Up...' : 'Join Referral Program'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Already a referrer?{' '}
              <Link href="/referral" className="text-[#1E2A4A] hover:underline">
                Log in to your dashboard
              </Link>
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-[#1E2A4A] mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="font-medium">Sign up & get your link</p>
                <p className="text-sm text-gray-500">Takes 30 seconds</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="font-medium">Share with friends & family</p>
                <p className="text-sm text-gray-500">They book using your link</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <p className="font-medium">Earn 10% every time</p>
                <p className="text-sm text-gray-500">Paid after each cleaning</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-gray-500">
        <p>Questions? Email us at hi@thefloridamaid.com</p>
      </div>
    </div>
  )
}
