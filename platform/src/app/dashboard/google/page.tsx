'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface Review {
  id: string
  google_review_id: string
  reviewer_name: string
  rating: number
  comment: string
  reply: string | null
  review_created_at: string
}

interface Post {
  id: string
  summary: string
  status: string
  created_at: string
}

export default function GoogleBusinessPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [locationTitle, setLocationTitle] = useState('')
  const [avgRating, setAvgRating] = useState(0)
  const [totalReviews, setTotalReviews] = useState(0)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'reviews' | 'posts'>('reviews')

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)

  // Post state
  const [newPost, setNewPost] = useState('')
  const [generatingPost, setGeneratingPost] = useState(false)
  const [postTopic, setPostTopic] = useState('')
  const [publishingPost, setPublishingPost] = useState(false)

  const justConnected = searchParams.get('connected') === 'true'

  useEffect(() => {
    fetchStatus()
    fetchReviews()
    fetchPosts()
  }, [])

  async function fetchStatus() {
    const res = await fetch('/api/google/status')
    if (res.ok) {
      const data = await res.json()
      setConnected(data.connected)
      setLocationTitle(data.locationTitle || '')
      setAvgRating(data.avgRating || 0)
      setTotalReviews(data.totalReviews || 0)
      setAutoReplyEnabled(data.autoReplyEnabled || false)
    }
    setLoading(false)
  }

  async function fetchReviews() {
    const res = await fetch('/api/google/reviews')
    if (res.ok) {
      const data = await res.json()
      setReviews(data.reviews || [])
    }
  }

  async function fetchPosts() {
    const res = await fetch('/api/google/posts')
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts || [])
    }
  }

  async function connectGoogle() {
    const res = await fetch('/api/google/auth')
    if (res.ok) {
      const data = await res.json()
      window.location.href = data.url
    }
  }

  async function toggleAutoReply() {
    const newValue = !autoReplyEnabled
    setAutoReplyEnabled(newValue)
    await fetch('/api/google/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoReply: newValue }),
    })
  }

  async function generateReply(reviewId: string) {
    setGenerating(true)
    setReplyingTo(reviewId)
    const res = await fetch('/api/google/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, generateAI: true }),
    })
    if (res.ok) {
      const data = await res.json()
      setReplyText(data.generatedReply || '')
    }
    setGenerating(false)
  }

  async function submitReply(reviewId: string) {
    if (!replyText.trim()) return
    setPosting(true)
    await fetch('/api/google/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewId, reply: replyText }),
    })
    setPosting(false)
    setReplyingTo(null)
    setReplyText('')
    fetchReviews()
  }

  async function generatePostContent() {
    setGeneratingPost(true)
    const res = await fetch('/api/google/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generateAI: true, topic: postTopic || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      setNewPost(data.generatedPost || '')
    }
    setGeneratingPost(false)
  }

  async function publishPost() {
    if (!newPost.trim()) return
    setPublishingPost(true)
    await fetch('/api/google/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: newPost }),
    })
    setPublishingPost(false)
    setNewPost('')
    setPostTopic('')
    fetchPosts()
  }

  const stars = (n: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < n ? 'text-yellow-400' : 'text-gray-300'}>&#9733;</span>
    ))
  }

  if (loading) return <p className="text-slate-500">Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading text-slate-900 mb-6">Google Business Profile</h1>

      {justConnected && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-700 font-medium">Google Business connected successfully!</p>
        </div>
      )}

      {!connected ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center max-w-lg">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Connect Your Google Business Profile</h2>
          <p className="text-slate-500 mb-6">
            Link your Google Business Profile to manage reviews, post updates, and enable auto-replies — all from your dashboard.
          </p>
          <button onClick={connectGoogle} className="bg-teal-600 hover:bg-teal-700 text-slate-900 px-6 py-3 rounded-lg font-semibold transition-colors">
            Connect Google Business
          </button>
        </div>
      ) : (
        <>
          {/* Status bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase">Location</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">{locationTitle}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase">Rating</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{avgRating} <span className="text-yellow-400">&#9733;</span></p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase">Reviews</p>
              <p className="text-lg font-bold text-slate-900 mt-1">{totalReviews}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-400 uppercase">Auto-Reply</p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  onClick={toggleAutoReply}
                  className={`w-10 h-6 rounded-full transition-colors ${autoReplyEnabled ? 'bg-teal-600' : 'bg-gray-300'} relative cursor-pointer`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${autoReplyEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm text-slate-600">{autoReplyEnabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200">
            <button onClick={() => setTab('reviews')}
              className={`px-4 py-2.5 text-sm font-semibold -mb-px transition-colors ${tab === 'reviews' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
              Reviews ({reviews.length})
            </button>
            <button onClick={() => setTab('posts')}
              className={`px-4 py-2.5 text-sm font-semibold -mb-px transition-colors ${tab === 'posts' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'}`}>
              Posts ({posts.length})
            </button>
          </div>

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-slate-400 py-8 text-center">No reviews synced yet. Reviews sync automatically every few hours.</p>
              ) : reviews.map((review) => (
                <div key={review.id} className="bg-white border border-slate-200 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{review.reviewer_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{stars(review.rating)}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(review.review_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {!review.reply && (
                      <button onClick={() => generateReply(review.id)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                        {generating && replyingTo === review.id ? 'Generating...' : 'AI Reply'}
                      </button>
                    )}
                  </div>
                  {review.comment && <p className="text-sm text-slate-600 mb-3">{review.comment}</p>}

                  {review.reply ? (
                    <div className="bg-slate-50 rounded-lg p-3 border-l-2 border-teal-600">
                      <p className="text-xs text-slate-400 mb-1">Your reply</p>
                      <p className="text-sm text-slate-700">{review.reply}</p>
                    </div>
                  ) : replyingTo === review.id ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-600"
                        placeholder="Write your reply..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => submitReply(review.id)} disabled={posting || !replyText.trim()}
                          className="bg-teal-600 hover:bg-teal-700 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                          {posting ? 'Posting...' : 'Post Reply'}
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyText('') }}
                          className="border border-slate-300 text-slate-500 px-4 py-2 rounded-lg text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Posts tab */}
          {tab === 'posts' && (
            <div>
              {/* Create post */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">Create Update</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    value={postTopic}
                    onChange={(e) => setPostTopic(e.target.value)}
                    placeholder="Topic (optional) — e.g., spring special, new service..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-600"
                  />
                  <button onClick={generatePostContent} disabled={generatingPost}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {generatingPost ? 'Writing...' : 'AI Write'}
                  </button>
                </div>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                  placeholder="Write your Google Business update..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-teal-600 mb-3"
                />
                <button onClick={publishPost} disabled={publishingPost || !newPost.trim()}
                  className="bg-teal-600 hover:bg-teal-700 text-slate-900 px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {publishingPost ? 'Publishing...' : 'Publish to Google'}
                </button>
              </div>

              {/* Post history */}
              <div className="space-y-3">
                {posts.length === 0 ? (
                  <p className="text-slate-400 py-8 text-center">No posts yet. Create your first update above.</p>
                ) : posts.map((post) => (
                  <div key={post.id} className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-sm text-slate-700">{post.summary}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-green-600 font-medium">{post.status}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
