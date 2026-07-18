'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Referrer { id: string; name: string; email: string; ref_code: string; commission_rate: number; total_earned: number; total_paid: number }
interface Commission { id: string; client_name: string; amount: number; status: string; paid_via: string | null; created_at: string }
interface LinkStats { clicks: number; uniqueVisitors: number; bookClicks: number; thisWeek: number; thisMonth: number }
interface Activity { action: string; device: string; page: string; time: string }

type Step = 'login' | 'otp' | 'dashboard'

// Session token is stored the same way the top-level /referral + /referral/[code]
// portal stores it, so a referrer who's already logged in there stays logged in
// here too (same origin, same key).
const AUTH_STORAGE_KEY = 'referrer_auth'

export default function ReferrerPortalPage() {
  useEffect(() => { document.title = 'Referral Program | The Florida Maid' }, [])

  const [step, setStep] = useState<Step>('login')
  const [referrer, setReferrer] = useState<Referrer | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [linkStats] = useState<LinkStats>({ clicks: 0, uniqueVisitors: 0, bookClicks: 0, thisWeek: 0, thisMonth: 0 })
  const [recentActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  // On first load, a previously verified session (email+code done, token
  // stored) skips straight to the dashboard instead of asking for the code
  // again every visit.
  useEffect(() => {
    let token = ''
    let storedCode = ''
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        token = parsed.token || ''
        storedCode = parsed.code || ''
      }
    } catch { /* ignore */ }

    if (token && storedCode) {
      loadDashboard(storedCode, token)
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboard = async (refCode: string, token: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/referrers/' + refCode, { headers: { Authorization: 'Bearer ' + token } })
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        setStep('login')
        setError('Your session expired. Please log in again.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        setStep('login')
        setError('Failed to load your dashboard.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setReferrer({
        id: data.referrer.id,
        name: data.referrer.name,
        email: data.referrer.email,
        ref_code: data.referrer.referral_code,
        commission_rate: data.referrer.commission_rate,
        total_earned: data.referrer.total_earned,
        total_paid: data.referrer.total_paid,
      })
      setCommissions(Array.isArray(data.commissions) ? data.commissions : [])
      setStep('dashboard')
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      setError('Failed to load')
      setStep('login')
    }
    setLoading(false)
  }

  const requestCode = async () => {
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
        setStep('otp')
        setLoading(false)
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Failed to connect. Please try again.')
      setLoading(false)
    }
  }

  const verifyCode = async () => {
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
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: d.token, code: d.referral_code }))
        await loadDashboard(d.referral_code, d.token)
      } else {
        setError(d.error || 'Invalid or expired code.')
        setLoading(false)
      }
    } catch {
      setError('Failed to connect. Please try again.')
      setLoading(false)
    }
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const formatTime = (d: string) => {
    const date = new Date(d)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    const days = Math.floor(hrs / 24)
    if (days < 7) return days + 'd ago'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const copyLink = () => { if (referrer) { navigator.clipboard.writeText('https://www.thefloridamaid.com/portal/book?ref=' + referrer.ref_code); alert('Copied!') } }
  const pendingAmount = referrer ? referrer.total_earned - referrer.total_paid : 0

  const actionLabels: Record<string, string> = {
    'visit': '👀 Visited page',
    'book': '📅 Clicked Book',
    'call': '📞 Clicked Call',
    'text': '💬 Clicked Text',
    'directions': '📍 Clicked Directions'
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Referrer Portal</h1>
            <p className="text-gray-500 mt-1">View your referral earnings</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && requestCode()} className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A]" placeholder="Enter your email" autoFocus />
            </div>
            <button onClick={requestCode} disabled={!email} className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50">Email Me a Login Code</button>
          </div>
          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-gray-500">Not a referrer yet? <Link href="/referral/signup" className="text-[#1E2A4A] hover:underline">Join the program</Link></p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Referrer Portal</h1>
            <p className="text-gray-500 mt-1">We sent a 6-digit code to <span className="font-medium text-[#1E2A4A]">{email}</span></p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Login Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                className="w-full px-4 py-3 border rounded-lg text-[#1E2A4A] text-center text-2xl tracking-[0.4em] font-mono"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button onClick={verifyCode} disabled={code.length < 6} className="w-full py-3 bg-[#1E2A4A] text-white rounded-lg font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50">View My Earnings</button>
            <button onClick={() => { setStep('login'); setCode(''); setError('') }} className="w-full text-sm text-gray-400 hover:text-gray-600">Use a different email</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1E2A4A] text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="text-xl font-bold">The Florida Maid</h1><p className="text-gray-400 text-sm">Referral Portal</p></div>
          <div className="text-right"><p className="font-medium">{referrer?.name}</p><p className="text-gray-400 text-sm">{referrer?.ref_code}</p></div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-sm text-gray-500">Total Earned</p><p className="text-3xl font-bold text-[#1E2A4A]">{formatMoney(referrer?.total_earned || 0)}</p></div>
          <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-sm text-gray-500">Paid Out</p><p className="text-3xl font-bold text-green-600">{formatMoney(referrer?.total_paid || 0)}</p></div>
          <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-sm text-gray-500">Pending</p><p className="text-3xl font-bold text-yellow-600">{formatMoney(pendingAmount)}</p></div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-[#1E2A4A] mb-3">Your Referral Link</h2>
          <div className="flex gap-3">
            <input type="text" value={'https://www.thefloridamaid.com/portal/book?ref=' + referrer?.ref_code} readOnly className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg text-gray-600 text-sm" />
            <button onClick={copyLink} className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90">Copy</button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Share this link. You earn {referrer?.commission_rate ?? 10}% of every cleaning!</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-[#1E2A4A] mb-4">📊 Link Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-sm text-gray-500">Total Clicks</p><p className="text-2xl font-bold text-[#1E2A4A]">{linkStats.clicks}</p></div>
            <div className="bg-gray-50 rounded-lg p-4 text-center"><p className="text-sm text-gray-500">Unique Visitors</p><p className="text-2xl font-bold text-[#1E2A4A]">{linkStats.uniqueVisitors}</p></div>
            <div className="bg-[#A8F0DC]/20 rounded-lg p-4 text-center"><p className="text-sm text-gray-500">This Week</p><p className="text-2xl font-bold text-[#1E2A4A]">{linkStats.thisWeek}</p></div>
            <div className="bg-purple-50 rounded-lg p-4 text-center"><p className="text-sm text-gray-500">Book Clicks</p><p className="text-2xl font-bold text-purple-600">{linkStats.bookClicks}</p></div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b"><h2 className="font-semibold text-[#1E2A4A]">📈 Recent Activity</h2></div>
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-gray-500"><p>No activity yet. Share your link!</p></div>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={i} className="p-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span>{actionLabels[a.action] || a.action}</span>
                    <span className="text-gray-400 text-xs">{a.device}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{formatTime(a.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b"><h2 className="font-semibold text-[#1E2A4A]">💰 Your Referrals ({commissions.length})</h2></div>
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><p>No referrals yet</p><p className="text-sm mt-1">Share your link to start earning!</p></div>
          ) : (
            <div className="divide-y">
              {commissions.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[#1E2A4A]">{c.client_name}</p><p className="text-sm text-gray-500">{formatDate(c.created_at)}</p></div>
                  <div className="text-right"><p className="font-bold text-green-600">{formatMoney(c.amount)}</p><p className={'text-xs ' + (c.status === 'paid' ? 'text-green-500' : 'text-yellow-500')}>{c.status === 'paid' ? 'Paid via ' + c.paid_via : 'Pending'}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500"><p>Questions? hi@thefloridamaid.com</p></div>
      </main>
    </div>
  )
}
