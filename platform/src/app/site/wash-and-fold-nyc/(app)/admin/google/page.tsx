// @ts-nocheck
'use client'

import { useEffect, useState } from 'react'

interface Review {
  id: string
  reviewer: string
  rating: number
  comment: string
  reply: string | null
  created_at: string
}

interface Insights {
  searches: number
  views: number
  calls: number
  website_clicks: number
  direction_requests: number
  period: string
}

export default function GoogleProfilePage() {
  useEffect(() => { document.title = 'Google Profile | The NYC Wash and Fold Service Company' }, [])

  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})
  const [generatingReply, setGeneratingReply] = useState<string | null>(null)
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'reviews' | 'insights'>('overview')
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unreplied' | '1' | '2' | '3' | '4' | '5'>('all')

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/admin/google/status')
      if (res.ok) {
        const data = await res.json()
        setConnected(data.connected)
        if (data.connected) {
          setReviews(data.reviews || [])
          setInsights(data.insights || null)
          setAvgRating(data.avgRating || 0)
          setTotalReviews(data.totalReviews || 0)
        }
      }
    } catch {
      setConnected(false)
    }
    setLoading(false)
  }

  const handleConnect = () => {
    window.location.href = '/api/admin/google/auth'
  }

  const generateReply = async (reviewId: string, reviewerName: string, rating: number, comment: string) => {
    setGeneratingReply(reviewId)
    try {
      const res = await fetch('/api/admin/google/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName, rating, comment })
      })
      if (res.ok) {
        const data = await res.json()
        setReplyDraft(prev => ({ ...prev, [reviewId]: data.reply }))
      }
    } catch (err) {
      console.error('Failed to generate reply:', err)
    }
    setGeneratingReply(null)
  }

  const sendReply = async (reviewId: string) => {
    const text = replyDraft[reviewId]
    if (!text?.trim()) return
    setSendingReply(reviewId)
    try {
      const res = await fetch('/api/admin/google/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, reply: text })
      })
      if (res.ok) {
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, reply: text } : r))
        setReplyDraft(prev => { const n = { ...prev }; delete n[reviewId]; return n })
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
    }
    setSendingReply(null)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-200'}>&#9733;</span>
    ))
  }

  const filteredReviews = reviews.filter(r => {
    if (reviewFilter === 'unreplied') return !r.reply
    if (['1', '2', '3', '4', '5'].includes(reviewFilter)) return r.rating === parseInt(reviewFilter)
    return true
  })

  const unrepliedCount = reviews.filter(r => !r.reply).length

  if (loading) {
    return (
      <main className="p-3 md:p-6">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </main>
    )
  }

  // Not connected — show setup instructions
  if (!connected) {
    return (
      <main className="p-3 md:p-6 max-w-4xl">
        <h2 className="text-2xl font-bold text-[#1E2A4A] mb-1">Google Business Profile</h2>
        <p className="text-sm text-gray-400 mb-6">Connect your Google Business Profile to manage reviews, view insights, and more.</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#1E2A4A] mb-4">Setup Instructions</h3>

          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <p className="font-medium text-[#1E2A4A]">Create a Google Cloud Project</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.cloud.google.com</a> and create a new project (or use an existing one). It&apos;s free.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <p className="font-medium text-[#1E2A4A]">Enable the Business Profile APIs</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  In your project, go to APIs &amp; Services &gt; Library and enable:
                </p>
                <ul className="text-sm text-gray-500 mt-1 list-disc ml-4 space-y-0.5">
                  <li>My Business Account Management API</li>
                  <li>My Business Business Information API</li>
                  <li>Business Profile Performance API</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <p className="font-medium text-[#1E2A4A]">Create OAuth 2.0 Credentials</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Go to APIs &amp; Services &gt; Credentials &gt; Create Credentials &gt; OAuth client ID.
                  Choose &quot;Web application&quot;. Add authorized redirect URI:
                </p>
                <code className="block mt-1 text-sm bg-gray-100 rounded px-3 py-2 text-[#1E2A4A] break-all">
                  https://washandfoldnyc.com/api/admin/google/callback
                </code>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <div>
                <p className="font-medium text-[#1E2A4A]">Configure OAuth Consent Screen</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Set up the consent screen (External is fine — only you will use it). Add your email as a test user.
                  Required scopes:
                </p>
                <ul className="text-sm text-gray-500 mt-1 list-disc ml-4 space-y-0.5">
                  <li>https://www.googleapis.com/auth/business.manage</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#1E2A4A] text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <div>
                <p className="font-medium text-[#1E2A4A]">Add credentials to .env.local</p>
                <div className="mt-1 bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono text-[#1E2A4A] space-y-0.5">
                  <p>GOOGLE_CLIENT_ID=your_client_id</p>
                  <p>GOOGLE_CLIENT_SECRET=your_client_secret</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-[#A8F0DC] text-[#1E2A4A] rounded-full flex items-center justify-center text-sm font-bold">6</span>
              <div>
                <p className="font-medium text-[#1E2A4A]">Connect</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Once credentials are set, click the button below to authorize access.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleConnect}
          className="px-6 py-3 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-semibold text-sm shadow-sm transition-colors"
        >
          Connect Google Business Profile
        </button>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">What you get once connected:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>&#x2022; View all Google reviews with ratings and text</li>
            <li>&#x2022; AI-generated reply suggestions — approve with one click</li>
            <li>&#x2022; Search performance: what people search to find you</li>
            <li>&#x2022; Actions: calls, website clicks, direction requests</li>
            <li>&#x2022; Sync reviews to your 107 domain websites automatically</li>
          </ul>
        </div>
      </main>
    )
  }

  // Connected — show dashboard
  return (
    <main className="p-3 md:p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Google Business Profile</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalReviews} reviews &middot; {avgRating.toFixed(1)} avg rating &middot; {unrepliedCount} need replies
          </p>
        </div>
        <button
          onClick={checkConnection}
          className="px-4 py-2.5 bg-[#1E2A4A] text-white rounded-xl hover:bg-[#1E2A4A]/90 font-medium text-sm shadow-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['overview', 'reviews', 'insights'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">SNAPSHOT</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-yellow-600">Avg Rating</p>
              <p className="text-2xl font-bold text-yellow-800 mt-1">{avgRating.toFixed(1)}</p>
              <div className="text-lg mt-0.5">{renderStars(Math.round(avgRating))}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total Reviews</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{totalReviews}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-red-600">Need Reply</p>
              <p className="text-2xl font-bold text-red-800 mt-1">{unrepliedCount}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-green-600">Reply Rate</p>
              <p className="text-2xl font-bold text-green-800 mt-1">
                {totalReviews > 0 ? Math.round(((totalReviews - unrepliedCount) / totalReviews) * 100) : 0}%
              </p>
            </div>
          </div>

          {insights && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">PERFORMANCE ({insights.period})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Searches</p>
                  <p className="text-2xl font-bold text-purple-800 mt-1">{insights.searches.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Views</p>
                  <p className="text-2xl font-bold text-indigo-800 mt-1">{insights.views.toLocaleString()}</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Calls</p>
                  <p className="text-2xl font-bold text-teal-800 mt-1">{insights.calls.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Website Clicks</p>
                  <p className="text-2xl font-bold text-orange-800 mt-1">{insights.website_clicks.toLocaleString()}</p>
                </div>
              </div>
            </>
          )}

          {/* Recent reviews needing reply */}
          {unrepliedCount > 0 && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">NEEDS REPLY</h3>
              <div className="space-y-3 mb-8">
                {reviews.filter(r => !r.reply).slice(0, 3).map(review => (
                  <div key={review.id} className="bg-white border border-l-4 border-l-red-300 border-t-gray-100 border-r-gray-100 border-b-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-[#1E2A4A]">{review.reviewer}</span>
                          <span className="text-lg">{renderStars(review.rating)}</span>
                        </div>
                        {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                      </div>
                    </div>
                    <div className="mt-3">
                      {replyDraft[review.id] !== undefined ? (
                        <div className="space-y-2">
                          <textarea
                            value={replyDraft[review.id]}
                            onChange={e => setReplyDraft(prev => ({ ...prev, [review.id]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendReply(review.id)}
                              disabled={sendingReply === review.id}
                              className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
                            >
                              {sendingReply === review.id ? 'Sending...' : 'Send Reply'}
                            </button>
                            <button
                              onClick={() => setReplyDraft(prev => { const n = { ...prev }; delete n[review.id]; return n })}
                              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateReply(review.id, review.reviewer, review.rating, review.comment)}
                            disabled={generatingReply === review.id}
                            className="px-4 py-2 bg-[#A8F0DC]/20 text-[#1E2A4A] rounded-lg text-sm font-medium hover:bg-[#A8F0DC]/30 disabled:opacity-50 border border-[#A8F0DC]/30"
                          >
                            {generatingReply === review.id ? 'Generating...' : 'AI Reply'}
                          </button>
                          <button
                            onClick={() => setReplyDraft(prev => ({ ...prev, [review.id]: '' }))}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                          >
                            Write Reply
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {unrepliedCount > 3 && (
                  <button
                    onClick={() => { setTab('reviews'); setReviewFilter('unreplied') }}
                    className="text-sm text-[#1E2A4A] font-medium hover:underline"
                  >
                    View all {unrepliedCount} unreplied reviews
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Reviews Tab */}
      {tab === 'reviews' && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['all', 'unreplied', '5', '4', '3', '2', '1'] as const).map(f => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  reviewFilter === f ? 'bg-[#1E2A4A] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? `All (${reviews.length})` :
                 f === 'unreplied' ? `Unreplied (${unrepliedCount})` :
                 `${f} Star`}
              </button>
            ))}
          </div>

          {filteredReviews.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">No reviews found</h3>
              <p className="text-gray-400 text-sm">Try a different filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div key={review.id} className={`bg-white border rounded-xl p-5 shadow-sm ${!review.reply ? 'border-l-4 border-l-yellow-300 border-t-gray-100 border-r-gray-100 border-b-gray-100' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1E2A4A]">{review.reviewer}</span>
                        <span className="text-lg">{renderStars(review.rating)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {review.comment && <p className="text-sm text-gray-600 mb-3">{review.comment}</p>}

                  {review.reply ? (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs font-medium text-gray-400 mb-1">Your Reply</p>
                      <p className="text-sm text-gray-600">{review.reply}</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      {replyDraft[review.id] !== undefined ? (
                        <div className="space-y-2">
                          <textarea
                            value={replyDraft[review.id]}
                            onChange={e => setReplyDraft(prev => ({ ...prev, [review.id]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1E2A4A] focus:ring-2 focus:ring-[#1E2A4A] outline-none resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendReply(review.id)}
                              disabled={sendingReply === review.id}
                              className="px-4 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#1E2A4A]/90 disabled:opacity-50"
                            >
                              {sendingReply === review.id ? 'Sending...' : 'Send Reply'}
                            </button>
                            <button
                              onClick={() => setReplyDraft(prev => { const n = { ...prev }; delete n[review.id]; return n })}
                              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateReply(review.id, review.reviewer, review.rating, review.comment)}
                            disabled={generatingReply === review.id}
                            className="px-4 py-2 bg-[#A8F0DC]/20 text-[#1E2A4A] rounded-lg text-sm font-medium hover:bg-[#A8F0DC]/30 disabled:opacity-50 border border-[#A8F0DC]/30"
                          >
                            {generatingReply === review.id ? 'Generating...' : 'AI Reply'}
                          </button>
                          <button
                            onClick={() => setReplyDraft(prev => ({ ...prev, [review.id]: '' }))}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                          >
                            Write Reply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Insights Tab */}
      {tab === 'insights' && (
        <>
          {insights ? (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">SEARCH PERFORMANCE ({insights.period})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Searches</p>
                  <p className="text-2xl font-bold text-purple-800 mt-1">{insights.searches.toLocaleString()}</p>
                  <p className="text-xs text-purple-500">people found you</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Profile Views</p>
                  <p className="text-2xl font-bold text-indigo-800 mt-1">{insights.views.toLocaleString()}</p>
                  <p className="text-xs text-indigo-500">search + maps</p>
                </div>
                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Phone Calls</p>
                  <p className="text-2xl font-bold text-teal-800 mt-1">{insights.calls.toLocaleString()}</p>
                  <p className="text-xs text-teal-500">from listing</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Website Clicks</p>
                  <p className="text-2xl font-bold text-orange-800 mt-1">{insights.website_clicks.toLocaleString()}</p>
                  <p className="text-xs text-orange-500">to your site</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-100 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-pink-600">Direction Requests</p>
                  <p className="text-2xl font-bold text-pink-800 mt-1">{insights.direction_requests.toLocaleString()}</p>
                  <p className="text-xs text-pink-500">from Google Maps</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">No insights data yet</h3>
              <p className="text-gray-400 text-sm">Insights will appear after your profile has been connected for a few days.</p>
            </div>
          )}
        </>
      )}
    </main>
  )
}
