'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Referrer { id: string; name: string; email: string; ref_code: string; total_earned: number; total_paid: number }
interface Commission { id: string; client_name: string; gross_amount: number; commission_amount: number; status: string; paid_via: string; paid_at: string; created_at: string }
interface LinkStats { clicks: number; uniqueVisitors: number; bookClicks: number; thisWeek: number; thisMonth: number }
interface Activity { action: string; device: string; page: string; time: string }

function ReferrerPortalContent() {
  const searchParams = useSearchParams()
  const [referrer, setReferrer] = useState<Referrer | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [linkStats, setLinkStats] = useState<LinkStats>({ clicks: 0, uniqueVisitors: 0, bookClicks: 0, thisWeek: 0, thisMonth: 0 })
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  // The referrer's shareable link must point at the tenant's real host, not a
  // placeholder. Resolved client-side (this whole portal is client-rendered).
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    const code = searchParams.get('code')
    if (code) fetchReferrer(code)
    else setLoading(false)
  }, [searchParams])

  const fetchReferrer = async (code: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/referrers?code=' + code + '&stats=true')
      if (res.ok) {
        const data = await res.json()
        setReferrer(data)
        if (data.linkStats) setLinkStats(data.linkStats)
        if (data.recentActivity) setRecentActivity(data.recentActivity)
        const commRes = await fetch('/api/referral-commissions?referrer_id=' + data.id)
        const commData = await commRes.json()
        setCommissions(Array.isArray(commData) ? commData : [])
      } else setError('Invalid referral code')
    } catch { setError('Failed to load') }
    setLoading(false)
  }

  const fetchByEmail = async () => {
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/referrers?email=' + encodeURIComponent(email))
      if (res.ok) {
        const data = await res.json()
        setReferrer(data)
        window.history.pushState({}, '', '/referral?code=' + data.ref_code)
        const statsRes = await fetch('/api/referrers?code=' + data.ref_code + '&stats=true')
        if (statsRes.ok) {
          const sd = await statsRes.json()
          if (sd.linkStats) setLinkStats(sd.linkStats)
          if (sd.recentActivity) setRecentActivity(sd.recentActivity)
        }
        const commRes = await fetch('/api/referral-commissions?referrer_id=' + data.id)
        const commData = await commRes.json()
        setCommissions(Array.isArray(commData) ? commData : [])
      } else setError('Email not found.')
    } catch { setError('Failed to load') }
    setLoading(false)
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' })
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
    return date.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })
  }
  const copyLink = () => { if (referrer) { navigator.clipboard.writeText(origin + '/book/new?ref=' + referrer.ref_code); alert('Copied!') } }
  const pendingAmount = referrer ? referrer.total_earned - referrer.total_paid : 0

  const actionLabels: Record<string, string> = {
    'visit': '👀 Visited page',
    'book': '📅 Clicked Book',
    'call': '📞 Clicked Call',
    'text': '💬 Clicked Text',
    'directions': '📍 Clicked Directions'
  }

  if (!referrer && !loading) {
    return (
      <div className="min-h-screen bg-[var(--color-loop-bg)] flex items-center justify-center p-4">
        <div className="bg-[var(--color-loop-canvas)] border border-[var(--color-loop-line)] p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl text-[var(--brand)]">Referrer Portal</h1>
            <p className="text-[var(--color-loop-muted)] mt-1">View your referral earnings</p>
          </div>
          {error && <div className="bg-[var(--color-loop-warn)]/10 text-[var(--color-loop-warn)] p-3 mb-4 text-sm border border-[var(--color-loop-warn)]/30">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-loop-graphite)] mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchByEmail()} className="w-full px-4 py-3 border border-[var(--color-loop-line)] bg-[var(--color-loop-canvas)] text-[var(--brand)]" placeholder="Enter your email" />
            </div>
            <button onClick={fetchByEmail} className="w-full py-3 bg-[var(--brand)] text-white font-medium hover:bg-[rgb(var(--brand-rgb)/0.9)]">View My Earnings</button>
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--color-loop-line-soft)] text-center">
            <p className="text-sm text-[var(--color-loop-muted)]">Not a referrer yet? <Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" className="text-[var(--brand)] hover:underline">Join the program</Link></p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div className="min-h-screen bg-[var(--color-loop-bg)] flex items-center justify-center"><p className="text-[var(--color-loop-muted)]">Loading...</p></div>

  return (
    <div className="min-h-screen bg-[var(--color-loop-bg)]">
      <header className="bg-[var(--brand)] text-white py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div><h1 className="font-display text-xl">Your Business</h1><p className="text-white/60 text-sm">Referral Portal</p></div>
          <div className="text-right"><p className="font-medium">{referrer?.name}</p><p className="text-white/60 text-sm font-mono">{referrer?.ref_code}</p></div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-px bg-[var(--color-loop-line)] border border-[var(--color-loop-line)] mb-6">
          <div className="bg-[var(--color-loop-canvas)] p-6 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">Total Earned</p><p className="font-display text-3xl mt-1 text-[var(--brand)]">{formatMoney(referrer?.total_earned || 0)}</p></div>
          <div className="bg-[var(--color-loop-canvas)] p-6 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">Paid Out</p><p className="font-display text-3xl mt-1 text-[var(--color-loop-good)]">{formatMoney(referrer?.total_paid || 0)}</p></div>
          <div className="bg-[var(--color-loop-canvas)] p-6 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">Pending</p><p className="font-display text-3xl mt-1 text-[var(--color-loop-warn)]">{formatMoney(pendingAmount)}</p></div>
        </div>
        <div className="bg-[var(--color-loop-canvas)] border border-[var(--color-loop-line)] p-6 mb-6">
          <h2 className="font-display text-lg text-[var(--brand)] mb-3">Your Referral Link</h2>
          <div className="flex gap-3">
            <input type="text" value={origin + '/book/new?ref=' + referrer?.ref_code} readOnly className="flex-1 px-4 py-2 bg-[var(--color-loop-bg)] border border-[var(--color-loop-line)] text-[var(--color-loop-graphite)] text-sm font-mono" />
            <button onClick={copyLink} className="px-4 py-2 bg-[var(--brand)] text-white hover:bg-[rgb(var(--brand-rgb)/0.9)]">Copy</button>
          </div>
          <p className="text-sm text-[var(--color-loop-muted)] mt-2">Share this link. You earn 10% of every cleaning!</p>
        </div>
        <div className="bg-[var(--color-loop-canvas)] border border-[var(--color-loop-line)] p-6 mb-6">
          <h2 className="font-display text-lg text-[var(--brand)] mb-4">Link Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--color-loop-line)] border border-[var(--color-loop-line)]">
            <div className="bg-[var(--color-loop-bg)] p-4 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">Total Clicks</p><p className="font-display text-2xl mt-1 text-[var(--brand)]">{linkStats.clicks}</p></div>
            <div className="bg-[var(--color-loop-bg)] p-4 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">Unique Visitors</p><p className="font-display text-2xl mt-1 text-[var(--brand)]">{linkStats.uniqueVisitors}</p></div>
            <div className="bg-[var(--color-loop-bg)] p-4 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">This Week</p><p className="font-display text-2xl mt-1 text-[var(--brand)]">{linkStats.thisWeek}</p></div>
            <div className="bg-[var(--color-loop-bg)] p-4 text-center"><p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-loop-muted)]">Book Clicks</p><p className="font-display text-2xl mt-1 text-[var(--brand)]">{linkStats.bookClicks}</p></div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-[var(--color-loop-canvas)] border border-[var(--color-loop-line)] mb-6">
          <div className="p-4 border-b border-[var(--color-loop-line-soft)]"><h2 className="font-display text-lg text-[var(--brand)]">Recent Activity</h2></div>
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-[var(--color-loop-muted)]"><p>No activity yet. Share your link!</p></div>
          ) : (
            <div className="divide-y divide-[var(--color-loop-line-soft)] max-h-64 overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={i} className="p-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span>{actionLabels[a.action] || a.action}</span>
                    <span className="text-[var(--color-loop-muted-2)] text-xs">{a.device}</span>
                  </div>
                  <span className="text-[var(--color-loop-muted-2)] text-xs font-mono">{formatTime(a.time)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--color-loop-canvas)] border border-[var(--color-loop-line)]">
          <div className="p-4 border-b border-[var(--color-loop-line-soft)]"><h2 className="font-display text-lg text-[var(--brand)]">Your Referrals ({commissions.length})</h2></div>
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-loop-muted)]"><p>No referrals yet</p><p className="text-sm mt-1">Share your link to start earning!</p></div>
          ) : (
            <div className="divide-y divide-[var(--color-loop-line-soft)]">
              {commissions.map(c => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div><p className="font-medium text-[var(--brand)]">{c.client_name}</p><p className="text-sm text-[var(--color-loop-muted)]">{formatDate(c.created_at)}</p></div>
                  <div className="text-right"><p className="font-bold text-[var(--color-loop-good)]">{formatMoney(c.commission_amount)}</p><p className={'text-xs ' + (c.status === 'paid' ? 'text-[var(--color-loop-good)]' : 'text-[var(--color-loop-warn)]')}>{c.status === 'paid' ? 'Paid via ' + c.paid_via : 'Pending'}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 text-center text-sm text-[var(--color-loop-muted)]"><p>Questions? Reach out through the contact page on the main site.</p></div>
      </main>
    </div>
  )
}

export default function ReferrerPortalPage() {
  useEffect(() => { document.title = 'Referral Program | Your Business' }, []);
  return <Suspense fallback={<div className="min-h-screen bg-[var(--color-loop-bg)] flex items-center justify-center"><p className="text-[var(--color-loop-muted)]">Loading...</p></div>}><ReferrerPortalContent /></Suspense>
}
