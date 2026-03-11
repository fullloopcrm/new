'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type ReferralData = {
  referrer: {
    id: string
    name: string
    email: string
    referral_code: string
    commission_rate: number
    total_earned: number
    total_paid: number
  }
  tenant: {
    name: string
    slug: string
    primary_color: string
  }
  stats: {
    total_clicks: number
    total_referrals: number
    total_converted: number
    total_earned: number
    total_pending: number
  }
  commissions: {
    id: string
    client_name: string
    amount: number
    status: string
    paid_via: string | null
    created_at: string
  }[]
  linkStats?: {
    clicks: number
    uniqueVisitors: number
    bookClicks: number
    thisWeek: number
    thisMonth: number
  }
  recentActivity?: {
    action: string
    device: string
    time: string
  }[]
}

const actionLabels: Record<string, string> = {
  visit: '👀 Visited page',
  book: '📅 Clicked Book',
  call: '📞 Clicked Call',
  text: '💬 Clicked Text',
  directions: '📍 Clicked Directions',
}

function formatMoney(cents: number) {
  return '$' + (cents / 100).toFixed(2)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function ReferralDashboardPage() {
  const { code } = useParams<{ code: string }>()
  const [data, setData] = useState<ReferralData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'overview' | 'history'>('overview')

  useEffect(() => {
    fetch(`/api/referrers/${code}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [code])

  function copyLink() {
    const url = `${window.location.origin}/referral/${code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareLink() {
    const url = `${window.location.origin}/referral/${code}`
    if (navigator.share) {
      navigator.share({
        title: `Referral from ${data?.tenant.name}`,
        text: `Use my referral link to book with ${data?.tenant.name}!`,
        url,
      })
    } else {
      copyLink()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-slate-400">Loading...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-800 mb-2">Invalid Referral Code</p>
          <p className="text-slate-400 mb-4">{error || 'This referral link is not valid.'}</p>
          <Link href="/referral/signup" className="text-sm text-blue-600 hover:underline">
            Join the referral program
          </Link>
        </div>
      </div>
    )
  }

  const { referrer, tenant, stats, commissions, linkStats, recentActivity } = data
  const color = tenant.primary_color || '#0d9488'
  const pendingAmount = referrer.total_earned - referrer.total_paid

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 py-4" style={{ backgroundColor: color }}>
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div>
            <p className="text-white/70 text-xs font-medium">Referral Partner</p>
            <p className="text-white font-bold text-lg">{tenant.name}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-medium text-sm">{referrer.name}</p>
            <p className="text-white/70 text-xs">{referrer.referral_code}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Earnings Overview - 3 cards like nycmaid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Total Earned</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatMoney(referrer.total_earned)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Paid Out</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatMoney(referrer.total_paid)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">Pending</p>
            <p className="text-xl font-bold text-yellow-600 mt-1">{formatMoney(pendingAmount)}</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-slate-800 mb-2">Your Referral Link</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-slate-500 font-mono break-all mb-3">
            {typeof window !== 'undefined' ? `${window.location.origin}/referral/${code}` : `/referral/${code}`}
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className="flex-1 bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium">
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={shareLink} className="flex-1 border border-gray-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium">
              Share
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Share this link. You earn {referrer.commission_rate}% of every booking!</p>
        </div>

        {/* Link Performance Stats */}
        {linkStats && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="font-semibold text-slate-800 mb-3">Link Performance</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Total Clicks</p>
                <p className="text-2xl font-bold text-slate-800">{linkStats.clicks}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Unique Visitors</p>
                <p className="text-2xl font-bold text-slate-800">{linkStats.uniqueVisitors}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">This Week</p>
                <p className="text-2xl font-bold text-slate-800">{linkStats.thisWeek}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">This Month</p>
                <p className="text-2xl font-bold text-slate-800">{linkStats.thisMonth}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center col-span-2">
                <p className="text-xs text-slate-400">Book Clicks</p>
                <p className="text-2xl font-bold text-green-600">{linkStats.bookClicks}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total_clicks}</p>
            <p className="text-xs text-slate-400">Clicks</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total_referrals}</p>
            <p className="text-xs text-slate-400">Referred</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total_converted}</p>
            <p className="text-xs text-slate-400">Converted</p>
          </div>
        </div>

        {/* Commission Rate */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-green-800 font-medium">Your Commission Rate</p>
            <p className="text-xs text-green-600 mt-0.5">Earned on each completed booking</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{referrer.commission_rate}%</p>
        </div>

        {/* Recent Activity Feed */}
        {recentActivity && recentActivity.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="font-semibold text-slate-800">Recent Activity</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {recentActivity.map((a, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span>{actionLabels[a.action] || a.action}</span>
                    <span className="text-slate-400 text-xs">{a.device}</span>
                  </div>
                  <span className="text-slate-400 text-xs">{timeAgo(a.time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('overview')}
            className={`flex-1 py-2 text-sm rounded-md ${
              tab === 'overview' ? 'bg-white shadow-sm font-medium' : 'text-slate-400'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 text-sm rounded-md ${
              tab === 'history' ? 'bg-white shadow-sm font-medium' : 'text-slate-400'
            }`}
          >
            Commissions ({commissions.length})
          </button>
        </div>

        {tab === 'overview' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 mb-3">How It Works</h2>
            <div className="space-y-3 text-sm text-slate-500">
              <div className="flex gap-3">
                <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">1</span>
                <p>Share your unique referral link with friends and contacts</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">2</span>
                <p>When they book and complete a service, you earn a commission</p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-xs font-bold text-teal-700 shrink-0">3</span>
                <p>Track your earnings and commissions right here on this page</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {commissions.length === 0 ? (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
                <p className="text-slate-400">No commissions yet</p>
                <p className="text-sm text-slate-300 mt-1">Share your link to start earning!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commissions.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.client_name}</p>
                      <p className="text-xs text-slate-400">{formatDate(c.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{formatMoney(c.amount)}</p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          c.status === 'paid'
                            ? 'bg-green-50 text-green-700'
                            : c.status === 'pending'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {c.status === 'paid' && c.paid_via ? `Paid via ${c.paid_via}` : c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Questions footer */}
        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Questions? Contact the business directly.</p>
        </div>
      </div>
    </div>
  )
}
