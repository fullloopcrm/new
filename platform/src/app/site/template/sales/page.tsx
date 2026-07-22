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

export default function SalesPartnerPortalPage() {
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_KEY) : null
    if (!stored) return
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
  }, [])

  async function loadPortal(t: string) {
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/sales-partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Login failed')
        setLoading(false)
        return
      }
      window.localStorage.setItem(TOKEN_KEY, json.token)
      setToken(json.token)
      await loadPortal(json.token)
    } catch {
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setData(null)
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const fmt = (cents: number) => '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

  if (!token || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Sales Partner Login</h1>
          <p className="text-sm text-gray-500 mb-6 text-center">Enter the email and PIN from your invite.</p>
          <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="w-full px-3 py-2 border rounded-lg tracking-widest" placeholder="000000" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 bg-gray-900 text-white rounded-lg font-medium disabled:opacity-50">
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const { partner, stats, share_url, referrer_signup_url, commissions, recruited_referrers, pendingDirectBookings, pendingOverrideBookings } = data
  const pendingBookings = [...(pendingDirectBookings || []), ...(pendingOverrideBookings || [])]

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {partner.name}</h1>
            <p className="text-sm text-gray-500">{partner.tier === 'standard' ? 'Standard' : partner.tier} tier &middot; {partner.commission_rate}% commission</p>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-900">Log out</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">Total Earned</p>
            <p className="text-xl font-bold text-gray-900">{fmt(stats.total_earned)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">Pending</p>
            <p className="text-xl font-bold text-gray-900">{fmt(stats.total_pending)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-400 uppercase">Referrers Recruited</p>
            <p className="text-xl font-bold text-gray-900">{stats.recruited_referrer_count}</p>
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

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Your Client Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 px-2 py-1.5 rounded truncate">{share_url || `code: ${partner.referral_code}`}</code>
              {share_url && (
                <button onClick={() => copy(share_url, 'client')} className="text-xs px-2 py-1.5 rounded bg-gray-100 hover:bg-gray-200">
                  {copied === 'client' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase mb-1">Recruit a Referrer</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-50 px-2 py-1.5 rounded truncate">{referrer_signup_url || '—'}</code>
              {referrer_signup_url && (
                <button onClick={() => copy(referrer_signup_url, 'referrer')} className="text-xs px-2 py-1.5 rounded bg-gray-100 hover:bg-gray-200">
                  {copied === 'referrer' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        </div>

        {pendingBookings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">Scheduled — Awaiting Completion</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.client_name || 'A client'}</p>
                    <p className="text-xs text-gray-400">
                      {b.referrer_name ? `Via ${b.referrer_name} · ` : ''}{new Date(b.start_time).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700">Scheduled</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Commission History</h3>
          </div>
          {commissions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No commissions yet</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.client_name || 'A client'}</p>
                    <p className="text-xs text-gray-400">{c.source === 'direct' ? 'Direct client' : 'Referrer override'} &middot; {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{fmt(c.amount)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Your Referrer Network</h3>
          </div>
          {recruited_referrers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">No referrers recruited yet — share your recruit link above</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recruited_referrers.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    <p className="text-xs text-gray-400">{r.referral_code}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
