'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFormTracking } from '@/lib/useFormTracking'

function ReferralSignupContent() {
  useEffect(() => { document.title = 'Become a Referrer | The NYC Towing Service' }, []);
  const router = useRouter()
  const searchParams = useSearchParams()
  // A sales partner's "recruit a referrer" link carries ?ref=<their code> --
  // captured here so the new referrer is linked to the recruiting partner
  // (referrers.recruited_by_sales_partner_id) and the partner earns an
  // override on this referrer's future commissions.
  const recruitedBy = searchParams.get('ref')
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
          _t: loadedAt,
          recruited_by_sales_partner_ref: recruitedBy || undefined,
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
    navigator.clipboard.writeText(`https://www.thenyctowingservice.com/book-towing-service-today?ref=${refCode}`)
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
          <h1 className="text-2xl font-bold text-[#b91c1c] mb-2">You&apos;re In! 🎉</h1>
          <p className="text-gray-600 mb-6">Welcome to the The NYC Towing Service referral program</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Your referral code</p>
            <p className="text-2xl font-bold text-[#b91c1c]">{refCode}</p>
          </div>

          <p className="text-xs text-gray-400 mt-4">📧 Please check your spam/junk folder if you don&apos;t see our email in your inbox.</p>
          <div className="bg-[#fdecec] rounded-lg p-4 mb-6">
            <p className="text-sm text-[#b91c1c] mb-2">Your referral link</p>
            <p className="text-sm font-mono text-[#b91c1c] break-all">https://www.thenyctowingservice.com/book-towing-service-today?ref={refCode}</p>
            <button
              onClick={copyLink}
              className="mt-3 px-4 py-2 bg-[#b91c1c] text-white rounded-lg text-sm hover:bg-[#b91c1c]/90"
            >
              Copy Link
            </button>
          </div>

          <div className="space-y-3">
            <Link
              href={`/referral?code=${refCode}`}
              className="block w-full py-3 bg-[#b91c1c] text-white rounded-lg font-medium hover:bg-[#b91c1c]/90"
            >
              Go to My Dashboard
            </Link>
            <p className="text-sm text-gray-500">
              Share your link and earn 10% of every job!
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
      <header className="bg-[#b91c1c] text-white py-6 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-2">Get Paid for Referrals</h1>
          <p className="text-gray-300">Earn 10% commission every time we serve someone you refer</p>
        </div>
      </header>

      {/* Benefits */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl mb-2">💰</div>
              <p className="font-semibold">10% Commission</p>
              <p className="text-sm text-gray-500">On every job</p>
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
          <h2 className="text-xl font-bold text-[#b91c1c] mb-6">Sign Up to Start Earning</h2>

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
                className="w-full px-4 py-3 border rounded-lg text-[#b91c1c]"
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
                className="w-full px-4 py-3 border rounded-lg text-[#b91c1c]"
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
                className="w-full px-4 py-3 border rounded-lg text-[#b91c1c]"
                placeholder="212-555-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How would you like to be paid? *
              </label>
              <select
                value={form.preferred_payout}
                onChange={(e) => setForm({ ...form, preferred_payout: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg text-[#b91c1c]"
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
                className="w-full px-4 py-3 border rounded-lg text-[#b91c1c]"
                placeholder={form.preferred_payout === 'zelle' ? 'Same as email if blank' : 'Your Apple Cash phone number'}
              />
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll send your commissions here
              </p>
            </div>

            <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '13px', lineHeight: '1.5', color: '#555' }}>
                <input type="checkbox" name="sms_consent" required style={{ marginTop: '3px', minWidth: '18px', minHeight: '18px' }} />
                <span>By checking this box, I consent to receive transactional text messages from <strong>The NYC Towing Service</strong> for appointment confirmations, reminders, and customer support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply.</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#b91c1c] text-white rounded-lg font-medium hover:bg-[#b91c1c]/90 disabled:opacity-50"
            >
              {loading ? 'Signing Up...' : 'Join Referral Program'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">
              Already a referrer?{' '}
              <Link href="/referral" className="text-[#b91c1c] hover:underline">
                Log in to your dashboard
              </Link>
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-[#b91c1c] mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-[#b91c1c] text-white rounded-full flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="font-medium">Sign up & get your link</p>
                <p className="text-sm text-gray-500">Takes 30 seconds</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-[#b91c1c] text-white rounded-full flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="font-medium">Share with friends & family</p>
                <p className="text-sm text-gray-500">They book using your link</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-[#b91c1c] text-white rounded-full flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <p className="font-medium">Earn 10% every time</p>
                <p className="text-sm text-gray-500">Paid after each job</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-sm text-gray-500">
        <p>Questions? Email us at hi@thenyctowingservice.com</p>
      </div>
    </div>
  )
}

export default function ReferralSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <ReferralSignupContent />
    </Suspense>
  )
}
