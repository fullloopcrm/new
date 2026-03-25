'use client'

import { useEffect, useState } from 'react'
import { usePageSettings, PageSettingsGear, PageSettingsPanel } from '@/components/page-settings'

type Review = {
  id: string
  rating: number | null
  comment: string | null
  source: string
  status: string
  requested_at: string | null
  completed_at: string | null
  created_at: string
  clients: { name: string } | null
}

const statusTabs = [
  { value: '', label: 'All' },
  { value: 'collected', label: 'Collected' },
  { value: 'posted', label: 'Posted' },
  { value: 'pending', label: 'Pending' },
]

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [requestClient, setRequestClient] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const reviewsSettings = usePageSettings('reviews')

  useEffect(() => {
    fetch('/api/reviews').then((r) => r.json()).then((data) => setReviews(data.reviews || []))
    fetch('/api/clients').then((r) => r.json()).then((data) => setClients(data.clients || []))
  }, [])

  async function requestReview() {
    if (!requestClient) return
    setRequesting(true)
    await fetch('/api/reviews/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: requestClient }),
    })
    setRequesting(false)
    setRequestClient('')
    fetch('/api/reviews').then((r) => r.json()).then((data) => setReviews(data.reviews || []))
  }

  const withRating = reviews.filter((r) => r.rating)
  const avgRating = withRating.length > 0
    ? withRating.reduce((sum, r) => sum + (r.rating || 0), 0) / withRating.length
    : 0
  const fiveStars = withRating.filter(r => r.rating === 5).length
  const fourStars = withRating.filter(r => r.rating === 4).length
  const collected = reviews.filter(r => r.status === 'collected').length
  const posted = reviews.filter(r => r.status === 'posted').length

  const filtered = reviews.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const clientMatch = r.clients?.name?.toLowerCase().includes(q)
      const commentMatch = r.comment?.toLowerCase().includes(q)
      if (!clientMatch && !commentMatch) return false
    }
    return true
  })

  return (
    <div>
      {/* PORTAL LINK */}
      <div className="flex items-center justify-between border border-slate-200 rounded-lg px-5 py-3 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Client Feedback Portal:</span>
          <code className="text-blue-400 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded">{typeof window !== 'undefined' ? `${window.location.origin}/portal/feedback` : '/portal/feedback'}</code>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/portal/feedback`)} className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Copy Link</button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>
            <p className="text-sm text-slate-400">{reviews.length} total &middot; {avgRating.toFixed(1)} avg rating</p>
          </div>
          <PageSettingsGear open={reviewsSettings.open} setOpen={reviewsSettings.setOpen} title="Reviews" />
        </div>
      </div>

      <PageSettingsPanel
        {...reviewsSettings}
        title="Reviews"
        tips={[
          'Send review requests automatically after completed bookings',
          'Link your Google Place ID in Settings to direct clients to your Google listing',
          'Respond to reviews promptly to boost your online reputation',
        ]}
      >
        {({ config, updateConfig }) => (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Google Place ID</label>
              <input
                type="text"
                value={(config.google_place_id as string) ?? ''}
                onChange={(e) => updateConfig('google_place_id', e.target.value)}
                placeholder="e.g. ChIJ..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-md"
              />
              <p className="text-xs text-slate-500 mt-1">Find yours at Google&apos;s Place ID Finder</p>
            </div>
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Google Review Link</label>
              <input
                type="text"
                value={(config.google_review_link as string) ?? ''}
                onChange={(e) => updateConfig('google_review_link', e.target.value)}
                placeholder="https://g.page/r/..."
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-full max-w-md"
              />
              <p className="text-xs text-slate-500 mt-1">The direct URL clients are sent to leave a Google review</p>
            </div>
            <div className="border-t border-slate-200" />
            <div className="flex items-center justify-between max-w-sm">
              <label className="text-sm text-slate-700">Auto follow-up after job completion</label>
              <button
                onClick={() => updateConfig('auto_followup_enabled', !config.auto_followup_enabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.auto_followup_enabled ? 'bg-teal-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.auto_followup_enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {!!config.auto_followup_enabled && (
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Follow-Up Delay</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={(config.followup_delay_hours as number) || 24}
                    onChange={(e) => updateConfig('followup_delay_hours', parseInt(e.target.value) || 24)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-32"
                  />
                  <span className="text-xs text-slate-400">hours after job completion</span>
                </div>
              </div>
            )}
            <div className="border-t border-slate-200" />
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Low Rating Alert Threshold</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={(config.low_rating_threshold as number) ?? 3}
                  onChange={(e) => updateConfig('low_rating_threshold', parseInt(e.target.value) || 3)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm w-32"
                />
                <span className="text-xs text-slate-400">stars or below triggers admin alert</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Ratings at or below this value will notify you for follow-up</p>
            </div>
          </div>
        )}
      </PageSettingsPanel>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Avg Rating', value: avgRating > 0 ? avgRating.toFixed(1) : '—', color: 'border-l-yellow-500', sub: `${withRating.length} rated` },
          { label: '5 Stars', value: fiveStars, color: 'border-l-green-500', sub: withRating.length > 0 ? `${Math.round((fiveStars / withRating.length) * 100)}%` : '0%' },
          { label: 'Collected', value: collected, color: 'border-l-blue-500' },
          { label: 'Posted', value: posted, color: 'border-l-purple-500' },
        ].map((card) => (
          <div key={card.label} className={`border border-slate-200 rounded-lg border-l-4 ${card.color} p-5`}>
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
            {card.sub && <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* RATING BREAKDOWN */}
      {withRating.length > 0 && (
        <div className="border border-slate-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Rating Breakdown</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = withRating.filter(r => r.rating === star).length
              const pct = withRating.length > 0 ? (count / withRating.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm text-slate-400 w-12">{star} star{star !== 1 ? 's' : ''}</span>
                  <div className="flex-1 h-2 bg-slate-50 rounded-full">
                    <div className="h-2 bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* REQUEST REVIEW */}
      <div className="border border-slate-200 rounded-lg p-5 mb-6">
        <h3 className="font-semibold text-sm text-slate-900 mb-3">Request Review</h3>
        <div className="flex gap-2">
          <select value={requestClient} onChange={(e) => setRequestClient(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select client...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={requestReview} disabled={!requestClient || requesting}
            className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-cta font-semibold disabled:opacity-50 hover:bg-slate-100">
            {requesting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name or comment..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
        />
      </div>

      {/* STATUS TABS */}
      <div className="flex gap-1 mb-4">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === tab.value
                ? 'bg-teal-600 text-white'
                : 'text-slate-400 hover:bg-slate-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* REVIEW LIST */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="border border-slate-200 rounded-lg p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-sm font-bold text-slate-400">
                  {r.clients?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-sm text-slate-900">{r.clients?.name || 'Client'}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {r.source && ` · ${r.source}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.rating && (
                  <span className="text-yellow-500 text-sm">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  r.status === 'collected' ? 'bg-green-50 text-green-700' :
                  r.status === 'posted' ? 'bg-blue-50 text-blue-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{r.status}</span>
              </div>
            </div>
            {r.comment && <p className="text-sm text-slate-400 mt-2">{r.comment}</p>}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-sm">
            {statusFilter ? `No ${statusFilter} reviews` : 'No reviews yet — request your first one above'}
          </div>
        )}
      </div>
    </div>
  )
}
