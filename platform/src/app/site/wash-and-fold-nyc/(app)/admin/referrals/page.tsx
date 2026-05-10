// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'

interface Referrer {
  id: string
  name: string
  email: string
  phone: string
  ref_code: string
  zelle_email: string
  zelle_phone: string
  apple_cash_phone: string
  preferred_payout: string
  total_earned: number
  total_paid: number
  active: boolean
  created_at: string
}

interface Commission {
  id: string
  booking_id: string
  referrer_id: string
  client_name: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  status: string
  paid_via: string
  paid_at: string
  created_at: string
  referrers: { name: string; email: string; ref_code: string }
  bookings: { start_time: string; price: number }
}

interface Analytics {
  overview: {
    totalClicks: number
    weekClicks: number
    monthClicks: number
    bookClicks: number
    callClicks: number
    uniqueVisitors: number
    totalReferredBookings: number
    completedReferredBookings: number
    referredRevenue: number
    conversionRate: string
  }
  topReferrers: Array<{
    name: string
    ref_code: string
    clicks: number
    bookClicks: number
    bookings: number
    earned: number
  }>
  recentActivity: Array<{
    ref_code: string
    action: string
    device: string
    page: string
    time: string
  }>
  dailyClicks: Array<{ date: string; clicks: number }>
}

export default function ReferralsPage() {
  useEffect(() => { document.title = 'Referrals | Wash and Fold NYC' }, []);
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'analytics' | 'payouts' | 'referrers'>('analytics')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newReferrer, setNewReferrer] = useState({
    name: '', email: '', phone: '', zelle_email: '', preferred_payout: 'zelle'
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    // Fetch independently so one failure doesn't break the others
    try {
      const refRes = await fetch('/api/referrers')
      if (refRes.ok) setReferrers(await refRes.json())
    } catch (err) { console.error('Failed to fetch referrers:', err) }

    try {
      const commRes = await fetch('/api/referral-commissions')
      if (commRes.ok) setCommissions(await commRes.json())
    } catch (err) { console.error('Failed to fetch commissions:', err) }

    try {
      const analyticsRes = await fetch('/api/referrers/analytics')
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData.overview ? analyticsData : null)
      }
    } catch (err) { console.error('Failed to fetch analytics:', err) }

    setLoading(false)
  }

  const addReferrer = async () => {
    try {
      const res = await fetch('/api/referrers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReferrer)
      })
      if (res.ok) {
        setShowAddForm(false)
        setNewReferrer({ name: '', email: '', phone: '', zelle_email: '', preferred_payout: 'zelle' })
        fetchData()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to add referrer')
      }
    } catch (err) {
      console.error('Failed to add referrer:', err)
    }
  }

  const markPaid = async (commissionId: string, paidVia: string) => {
    try {
      const res = await fetch('/api/referral-commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commissionId, status: 'paid', paid_via: paidVia })
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error('Failed to mark paid:', err)
    }
  }

  const [copiedRef, setCopiedRef] = useState<string | null>(null)
  const copyLink = (refCode: string) => {
    navigator.clipboard.writeText(`https://www.washandfoldnyc.com/book?ref=${refCode}`)
    setCopiedRef(refCode)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  const formatMoney = (cents: number) => '$' + (cents / 100).toFixed(2)
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const formatTimeAgo = (dateStr: string) => {
    // Supabase timestamps are UTC — append Z if not present
    const ts = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
    const diffMs = Date.now() - new Date(ts).getTime()
    if (diffMs < 0) return 'just now'
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffMins < 60) return diffMins + 'm ago'
    if (diffHours < 24) return diffHours + 'h ago'
    return Math.floor(diffHours / 24) + 'd ago'
  }

  const pendingCommissions = commissions.filter(c => c.status === 'pending')
  const paidCommissions = commissions.filter(c => c.status === 'paid')
  const totalPending = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0)

  // Mini bar chart
  const maxDailyClicks = analytics ? Math.max(...analytics.dailyClicks.map(d => d.clicks), 1) : 1

  return (
    <>
      <main className="p-3 md:p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-[#1E2A4A]">Referral Program</h2>
            <p className="text-sm text-gray-400 mt-0.5">{referrers.length} referrers &middot; {pendingCommissions.length} pending payouts</p>
          </div>
          <button onClick={() => setShowAddForm(true)} className="px-4 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-medium text-sm shadow-sm transition-colors">
            + Add Referrer
          </button>
        </div>
        <div className="text-sm text-gray-400 mb-6">
          Referral signup: <a href="https://www.washandfoldnyc.com/referral/signup" target="_blank" className="text-[#1E2A4A] hover:underline font-medium py-2 inline-block">washandfoldnyc.com/referral/signup</a> &middot;
          Referral portal: <a href="https://www.washandfoldnyc.com/referral" target="_blank" className="text-[#1E2A4A] hover:underline font-medium ml-1 py-2 inline-block">washandfoldnyc.com/referral</a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto flex-nowrap pb-1">
          <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'analytics' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Analytics
          </button>
          <button onClick={() => setActiveTab('payouts')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'payouts' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Payout Queue ({pendingCommissions.length})
          </button>
          <button onClick={() => setActiveTab('referrers')} className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'referrers' ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Referrers ({referrers.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : activeTab === 'analytics' ? (
          <>
            {/* OVERVIEW STATS */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">OVERVIEW</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Total Clicks</p>
                <p className="text-2xl font-bold text-teal-800 mt-1">{analytics?.overview.totalClicks || 0}</p>
                <p className="text-xs text-teal-500 mt-0.5">all time</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">This Week</p>
                <p className="text-2xl font-bold text-indigo-800 mt-1">{analytics?.overview.weekClicks || 0}</p>
                <p className="text-xs text-indigo-500 mt-0.5">clicks</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Book Clicks</p>
                <p className="text-2xl font-bold text-orange-800 mt-1">{analytics?.overview.bookClicks || 0}</p>
                <p className="text-xs text-orange-500 mt-0.5">hot leads</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Unique Visitors</p>
                <p className="text-2xl font-bold text-purple-800 mt-1">{analytics?.overview.uniqueVisitors || 0}</p>
                <p className="text-xs text-purple-500 mt-0.5">people</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600">Bookings</p>
                <p className="text-2xl font-bold text-green-800 mt-1">{analytics?.overview.totalReferredBookings || 0}</p>
                <p className="text-xs text-green-500 mt-0.5">from referrals</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Revenue</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">{formatMoney(analytics?.overview.referredRevenue || 0)}</p>
                <p className="text-xs text-emerald-500 mt-0.5">from referrals</p>
              </div>
            </div>

            {/* Click Chart */}
            {/* CLICK CHART */}
            {analytics && analytics.dailyClicks.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-5 mb-8 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">CLICKS &middot; LAST 14 DAYS</h3>
                <div className="flex items-end gap-1.5 h-[200px] md:h-[300px]">
                  {analytics.dailyClicks.map((d, i) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-[#A8F0DC] rounded-t-md transition-all hover:bg-[#1E2A4A] cursor-pointer"
                        style={{ height: `${(d.clicks / maxDailyClicks) * 100}%`, minHeight: d.clicks > 0 ? '6px' : '0' }}
                        title={`${d.date}: ${d.clicks} clicks`}
                      />
                      {i % 2 === 0 && (
                        <p className="text-xs text-gray-400 mt-1.5 font-medium">{new Date(d.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Referrers */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">LEADERBOARD</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {analytics?.topReferrers.length === 0 ? (
                    <p className="p-5 text-gray-500 text-sm">No referral clicks yet</p>
                  ) : (
                    analytics?.topReferrers.map((r, i) => (
                      <div key={r.ref_code} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'}`}>
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-[#1E2A4A]">{r.name}</p>
                            <p className="text-xs text-gray-400 font-mono">{r.ref_code}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#1E2A4A]">{r.clicks} <span className="text-xs font-normal text-gray-400">clicks</span></p>
                          <p className="text-xs text-gray-500">{r.bookings} bookings &middot; {formatMoney(r.earned)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">RECENT ACTIVITY</h3>
                </div>
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {analytics?.recentActivity.length === 0 ? (
                    <p className="p-5 text-gray-500 text-sm">No recent activity</p>
                  ) : (
                    analytics?.recentActivity.map((a, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${a.action === 'book' ? 'bg-orange-100' : a.action === 'call' ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {a.action === 'book' ? '🔥' : a.action === 'call' ? '📞' : '👀'}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-[#1E2A4A]">
                              {a.action === 'book' ? 'Book click' : a.action === 'call' ? 'Call click' : 'Page view'}
                            </p>
                            <p className="text-xs text-gray-400">{a.ref_code} &middot; {a.device} &middot; {a.page}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{formatTimeAgo(a.time)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : activeTab === 'payouts' ? (
          <>
            {/* PAYOUT STATS */}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">PAYOUT OVERVIEW</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Referrers</p>
                <p className="text-2xl font-bold text-[#1E2A4A] mt-1">{referrers.filter(r => r.active).length}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-yellow-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-yellow-800 mt-1">{formatMoney(totalPending)}</p>
                <p className="text-xs text-yellow-500 mt-0.5">{pendingCommissions.length} commissions</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-green-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-800 mt-1">{formatMoney(referrers.reduce((sum, r) => sum + r.total_paid, 0))}</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Total Earned</p>
                <p className="text-2xl font-bold text-teal-800 mt-1">{formatMoney(referrers.reduce((sum, r) => sum + r.total_earned, 0))}</p>
              </div>
            </div>

            {pendingCommissions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-gray-500 font-medium">No pending payouts</p>
                <p className="text-gray-400 text-sm mt-1">All commissions are up to date</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">PENDING PAYOUTS</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {pendingCommissions.map(comm => (
                    <div key={comm.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#1E2A4A]">{comm.referrers?.name}</span>
                          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{comm.referrers?.ref_code}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{comm.client_name}&apos;s cleaning &middot; {formatDate(comm.created_at)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Service: {formatMoney(comm.gross_amount)} &rarr; Commission: {formatMoney(comm.commission_amount)}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-xl font-bold text-green-600">{formatMoney(comm.commission_amount)}</span>
                        <div className="flex gap-2">
                          <button onClick={() => markPaid(comm.id, 'zelle')} className="px-3 py-2.5 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#1E2A4A]/90 transition-colors">Zelle</button>
                          <button onClick={() => markPaid(comm.id, 'apple_cash')} className="px-3 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors">Apple</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {paidCommissions.length > 0 && (
              <div className="mt-6 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">RECENTLY PAID</h3>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {paidCommissions.slice(0, 10).map(comm => (
                    <div key={comm.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2 hover:bg-gray-50/50 transition-colors">
                      <div className="min-w-0">
                        <span className="font-medium text-[#1E2A4A]">{comm.referrers?.name}</span>
                        <span className="text-gray-300 mx-2">&middot;</span>
                        <span className="text-gray-500">{comm.client_name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-green-600 font-semibold">{formatMoney(comm.commission_amount)}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{comm.paid_via}</span>
                        <span className="text-xs text-gray-400">{comm.paid_at ? formatDate(comm.paid_at) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Referrers Tab */
          <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">ALL REFERRERS</h3>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">Referrer</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Payout Method</th>
                  <th className="px-5 py-3.5">Earned</th>
                  <th className="px-5 py-3.5">Paid</th>
                  <th className="px-5 py-3.5">Pending</th>
                  <th className="px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referrers.map(ref => (
                  <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="font-medium text-[#1E2A4A]">{ref.name}</p>
                        <p className="text-xs text-gray-400">{ref.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><code className="bg-gray-100 px-2.5 py-1 rounded-full text-xs font-mono text-gray-600">{ref.ref_code}</code></td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {ref.preferred_payout === 'zelle' ? <span>Zelle: {ref.zelle_email || ref.zelle_phone}</span> : <span>Apple: {ref.apple_cash_phone}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[#1E2A4A] font-semibold">{formatMoney(ref.total_earned)}</td>
                    <td className="px-5 py-3.5 text-green-600 font-medium">{formatMoney(ref.total_paid)}</td>
                    <td className="px-5 py-3.5"><span className="text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full text-sm">{formatMoney(ref.total_earned - ref.total_paid)}</span></td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => copyLink(ref.ref_code)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${copiedRef === ref.ref_code ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#1E2A4A] hover:bg-gray-200'}`}>{copiedRef === ref.ref_code ? 'Copied!' : 'Copy Link'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          </>
        )}

        {/* Add Referrer Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-[#1E2A4A]/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddForm(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">Add New Referrer</h3>
              <p className="text-sm text-gray-400 mb-5">Create a new referral partner account</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Name *</label>
                  <input type="text" value={newReferrer.name} onChange={(e) => setNewReferrer({ ...newReferrer, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#A8F0DC] focus:border-[#A8F0DC] outline-none transition" placeholder="John Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Email *</label>
                  <input type="email" value={newReferrer.email} onChange={(e) => setNewReferrer({ ...newReferrer, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#A8F0DC] focus:border-[#A8F0DC] outline-none transition" placeholder="john@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Phone</label>
                  <input type="tel" value={newReferrer.phone} onChange={(e) => setNewReferrer({ ...newReferrer, phone: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#A8F0DC] focus:border-[#A8F0DC] outline-none transition" placeholder="212-555-1234" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Zelle Email/Phone</label>
                  <input type="text" value={newReferrer.zelle_email} onChange={(e) => setNewReferrer({ ...newReferrer, zelle_email: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#A8F0DC] focus:border-[#A8F0DC] outline-none transition" placeholder="Same as email if blank" />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1.5">Preferred Payout</label>
                  <select value={newReferrer.preferred_payout} onChange={(e) => setNewReferrer({ ...newReferrer, preferred_payout: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-[#1E2A4A] focus:ring-2 focus:ring-[#A8F0DC] focus:border-[#A8F0DC] outline-none transition">
                    <option value="zelle">Zelle</option>
                    <option value="apple_cash">Apple Cash</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2.5 text-gray-500 hover:text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={addReferrer} className="px-5 py-2.5 bg-[#1E2A4A] text-white rounded-lg hover:bg-[#1E2A4A]/90 font-medium transition-colors">Add Referrer</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </>
  )
}
