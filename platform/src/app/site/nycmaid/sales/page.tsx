'use client'

import { useEffect, useState } from 'react'
import PayoutSettings from './PayoutSettings'

interface Partner {
  id: string
  name: string
  email: string
  referral_code: string
  tier: string
  commission_rate: number
  total_earned: number
  total_paid: number
  preferred_payout: string | null
  zelle_email: string | null
  zelle_phone: string | null
  apple_cash_phone: string | null
  stripe_connect_account_id: string | null
  monthly_goal_cents: number | null
}

interface Commission {
  id: string
  source: 'direct' | 'override'
  client_name: string | null
  amount: number
  status: string
  paid_via: string | null
  created_at: string
}

interface PendingBooking {
  id: string
  start_time: string
  status: string
  client_name: string | null
  referrer_name?: string | null
}

interface PortalData {
  partner: Partner
  tenant: { name: string; primary_color: string }
  share_url: string | null
  referrer_signup_url: string | null
  stats: { total_earned: number; total_pending: number; recruited_referrer_count: number }
  commissions: Commission[]
  recruited_referrers: { id: string; name: string; referral_code: string; total_earned: number; status: string }[]
  pendingDirectBookings?: PendingBooking[]
  pendingOverrideBookings?: PendingBooking[]
}

const TOKEN_KEY = 'sales_partner_token'

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toFixed(2)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' })
}

const statusLabels: Record<string, string> = {
  pending: 'Scheduled',
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  rescheduled: 'Rescheduled',
}

export default function SalesPartnerPortalPage() {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    document.title = 'Sales Partner Portal | The NYC Maid'
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null
    if (!stored) { setLoading(false); return }
    setToken(stored)
    loadPortal(stored).then(() => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      if (params.get('stripe') !== 'connected') return
      let partnerId: string | null = null
      try {
        const payload = JSON.parse(atob(stored.split('.')[0] || ''))
        partnerId = payload?.pid || null
      } catch { /* token shape not decodable client-side, skip refresh */ }
      if (!partnerId) return
      fetch(`/api/sales-partners/${partnerId}/stripe-status`, { method: 'POST', headers: { Authorization: `Bearer ${stored}` } })
        .then(() => loadPortal(stored))
        .catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadPortal = async (t: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sales-partners/me', { headers: { Authorization: `Bearer ${t}` } })
      if (res.ok) {
        setData(await res.json())
      } else {
        window.localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setError('Session expired — please log in again.')
      }
    } catch {
      setError('Failed to load your dashboard.')
    }
    setLoading(false)
  }

  const login = async () => {
    if (!email || !pin) return
    setLoggingIn(true)
    setError('')
    try {
      const res = await fetch('/api/sales-partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Login failed.')
        setLoggingIn(false)
        return
      }
      window.localStorage.setItem(TOKEN_KEY, json.token)
      setToken(json.token)
      await loadPortal(json.token)
    } catch {
      setError('Login failed.')
    }
    setLoggingIn(false)
  }

  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setData(null)
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied!')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>
  }

  if (!token || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Sales Partner Portal</h1>
            <p className="text-gray-500 mt-1">Log in with the email and PIN from your approval email</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && login()} className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A] tracking-widest" placeholder="6-digit PIN" />
            </div>
            <button onClick={login} disabled={loggingIn} className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50">
              {loggingIn ? 'Logging in...' : 'Log In'}
            </button>
          </div>
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">Not approved yet? <a href="/apply/commission-sales-partner" className="text-[#1E2A4A] hover:underline">Apply here</a></p>
          </div>
        </div>
      </div>
    )
  }

  const { partner, stats, share_url, referrer_signup_url, commissions, recruited_referrers, pendingDirectBookings, pendingOverrideBookings } = data
  const now = new Date()
  const earnedThisMonth = commissions
    .filter((c) => {
      const d = new Date(c.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, c) => sum + c.amount, 0)
  const directCommissions = commissions.filter((c) => c.source === 'direct')
  const overrideCommissions = commissions.filter((c) => c.source === 'override')
  const clientLink = share_url || `code: ${partner.referral_code}`
  const referrerSignupLink = referrer_signup_url || '—'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1E2A4A] text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <div><h1 className="text-xl font-bold">The NYC Maid</h1><p className="text-gray-400 text-sm">Sales Partner Portal</p></div>
          <div className="text-right">
            <p className="font-medium">{partner.name}</p>
            <p className="text-gray-400 text-sm">{partner.referral_code} &middot; {partner.tier} tier &middot; {partner.commission_rate}%</p>
            {partner.monthly_goal_cents && (
              <p className="text-[#A8F0DC] text-xs mt-0.5">{formatMoney(earnedThisMonth)} / {formatMoney(partner.monthly_goal_cents)} this month</p>
            )}
            <button onClick={logout} className="text-gray-400 text-xs hover:text-white underline mt-1">Log out</button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-3 sm:p-6 text-center"><p className="text-xs sm:text-sm text-gray-500">Total Earned</p><p className="text-lg sm:text-3xl font-bold text-[#1E2A4A]">{formatMoney(stats.total_earned)}</p></div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-6 text-center"><p className="text-xs sm:text-sm text-gray-500">Paid Out</p><p className="text-lg sm:text-3xl font-bold text-green-600">{formatMoney(partner.total_paid)}</p></div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-6 text-center"><p className="text-xs sm:text-sm text-gray-500">Pending</p><p className="text-lg sm:text-3xl font-bold text-yellow-600">{formatMoney(stats.total_pending)}</p></div>
        </div>

        {partner.monthly_goal_cents && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#1E2A4A]">Monthly Goal</p>
              <p className="text-sm text-gray-500">{formatMoney(earnedThisMonth)} / {formatMoney(partner.monthly_goal_cents)}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="bg-[#A8F0DC] h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((earnedThisMonth / partner.monthly_goal_cents) * 100))}%` }} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b"><h2 className="font-semibold text-[#1E2A4A]">Your Referrer Network ({recruited_referrers.length})</h2></div>
          {recruited_referrers.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><p>No referrers recruited yet.</p><p className="text-sm mt-1">Share your referrer signup link below.</p></div>
          ) : (
            <div className="divide-y">
              {recruited_referrers.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{r.name}</p><p className="text-sm text-gray-500">{r.referral_code}</p></div>
                  <p className={'text-xs ' + (r.status === 'active' ? 'text-green-600' : 'text-gray-400')}>{r.status === 'active' ? 'Active' : 'Inactive'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-[#1E2A4A]">Direct Clients ({directCommissions.length + (pendingDirectBookings?.length || 0)})</h2>
            <p className="text-xs text-gray-400 mt-1">Shows up here once the cleaning is completed — booked-but-not-yet-cleaned jobs won&apos;t appear yet.</p>
          </div>
          {(pendingDirectBookings?.length || 0) > 0 && (
            <div className="divide-y bg-yellow-50/50">
              {pendingDirectBookings!.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{b.client_name || 'Client'}</p><p className="text-sm text-gray-500">{formatDate(b.start_time)}</p></div>
                  <p className="text-xs font-medium text-yellow-600">{statusLabels[b.status] || b.status} — awaiting completion</p>
                </div>
              ))}
            </div>
          )}
          {directCommissions.length === 0 ? (
            (pendingDirectBookings?.length || 0) === 0 && (
              <div className="p-8 text-center text-gray-500"><p>No direct clients yet.</p></div>
            )
          ) : (
            <div className="divide-y">
              {directCommissions.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{c.client_name}</p><p className="text-sm text-gray-500">{formatDate(c.created_at)}</p></div>
                  <div className="text-right"><p className="font-bold text-green-600">{formatMoney(c.amount)}</p><p className={'text-xs ' + (c.status === 'paid' ? 'text-green-500' : 'text-yellow-500')}>{c.status === 'paid' ? 'Paid' : 'Pending'}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-[#1E2A4A]">Referrer Network Overrides ({overrideCommissions.length + (pendingOverrideBookings?.length || 0)})</h2>
            <p className="text-xs text-gray-400 mt-1">Shows up here once your referrer&apos;s client is completed — booked-but-not-yet-cleaned jobs won&apos;t appear yet.</p>
          </div>
          {(pendingOverrideBookings?.length || 0) > 0 && (
            <div className="divide-y bg-yellow-50/50">
              {pendingOverrideBookings!.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{b.client_name || 'Client'}</p><p className="text-sm text-gray-500">via {b.referrer_name || 'referrer'} &middot; {formatDate(b.start_time)}</p></div>
                  <p className="text-xs font-medium text-yellow-600">{statusLabels[b.status] || b.status} — awaiting completion</p>
                </div>
              ))}
            </div>
          )}
          {overrideCommissions.length === 0 ? (
            (pendingOverrideBookings?.length || 0) === 0 && (
              <div className="p-8 text-center text-gray-500"><p>No override commissions yet.</p></div>
            )
          ) : (
            <div className="divide-y">
              {overrideCommissions.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{c.client_name}</p><p className="text-sm text-gray-500">{formatDate(c.created_at)}</p></div>
                  <div className="text-right"><p className="font-bold text-green-600">{formatMoney(c.amount)}</p><p className={'text-xs ' + (c.status === 'paid' ? 'text-green-500' : 'text-yellow-500')}>{c.status === 'paid' ? 'Paid' : 'Pending'}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <h2 className="font-semibold text-[#1E2A4A] mb-3">Your Links</h2>
          <div className="mb-3">
            <p className="text-sm text-gray-500 mb-1">Client link — for people who book directly</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input type="text" value={clientLink} readOnly className="flex-1 min-w-0 px-4 py-2 bg-gray-50 border rounded-lg text-gray-600 text-sm" />
              <button onClick={() => copy(clientLink)} className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90 flex-shrink-0">Copy</button>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Referrer signup link — for partners you recruit</p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input type="text" value={referrerSignupLink} readOnly className="flex-1 min-w-0 px-4 py-2 bg-gray-50 border rounded-lg text-gray-600 text-sm" />
              <button onClick={() => copy(referrerSignupLink)} className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90 flex-shrink-0">Copy</button>
            </div>
          </div>
        </div>

        <PayoutSettings
          salesPartnerId={partner.id}
          token={token}
          preferredPayout={partner.preferred_payout}
          zelleEmail={partner.zelle_email}
          zellePhone={partner.zelle_phone}
          appleCashPhone={partner.apple_cash_phone}
          stripeConnectAccountId={partner.stripe_connect_account_id}
          monthlyGoalCents={partner.monthly_goal_cents}
          onSaved={(updates) => setData((cur) => cur ? { ...cur, partner: { ...cur.partner, ...updates } } : cur)}
        />

        <div className="mt-8 text-center text-sm text-gray-500"><p>Questions? hi@thenycmaid.com</p></div>
      </main>
    </div>
  )
}
