'use client'

import { useEffect, useState } from 'react'

interface Review {
  id: string
  name: string
  rating: number
  text: string
  verified: boolean
  images: string[] | null
  video_url: string | null
  created_at: string
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <svg key={i} className={`h-5 w-5 ${i < count ? 'text-amber-400' : 'text-purple-100'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.175 0l-3.366 2.446c-.784.57-1.838-.196-1.538-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.813 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.285-3.958z" />
        </svg>
      ))}
    </span>
  )
}

function timeAgo(date: string) {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays < 1) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 60) return '1 month ago'
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function ReviewsList() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reviews?limit=100')
      .then(res => res.json())
      .then(data => {
        setReviews(data.reviews || [])
        setTotalCount(data.totalReviews || 0)
        setAvgRating(data.avgRating ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const displayReviews = reviews.filter(r => r.text && r.text.length > 0)

  return (
    <div>
      {avgRating !== null && (
        <div className="mb-8 flex items-center gap-3">
          <span className="text-3xl font-black text-purple-600 font-display">{avgRating}</span>
          <Stars count={Math.round(avgRating)} />
          <span className="text-slate-500 text-sm">({totalCount} reviews)</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-slate-400">Loading reviews...</div>
      ) : displayReviews.length === 0 ? (
        <div className="rounded-xl border border-purple-100 bg-white py-12 text-center text-slate-500">
          No reviews yet — be the first to leave one.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayReviews.map(review => (
            <div key={review.id} className="rounded-xl border border-purple-100 bg-white p-6">
              <Stars count={review.rating} />
              <p className="mt-3 text-sm leading-relaxed text-slate-600">&ldquo;{review.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2 border-t border-purple-50 pt-4">
                <p className="font-semibold text-slate-900 text-sm">{review.name}</p>
                {review.verified && (
                  <svg className="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                )}
              </div>
              <p className="text-xs text-slate-400">{timeAgo(review.created_at)}</p>
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.images.map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-purple-100" />
                    </a>
                  ))}
                </div>
              )}
              {review.video_url && (
                <div className="mt-3">
                  <video src={review.video_url} controls preload="metadata" className="w-full rounded-lg border border-purple-100" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
