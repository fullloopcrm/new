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
          <span className="text-4xl font-bold text-zinc-900">{avgRating}</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`text-2xl ${i < Math.round(avgRating) ? 'text-yellow-400' : 'text-stone-200'}`}>{'★'}</span>
            ))}
          </div>
          <span className="text-stone-500 text-sm">({totalCount} reviews)</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-stone-400">Loading reviews...</div>
      ) : displayReviews.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-12 text-center text-stone-500">
          No reviews yet — be the first to leave one.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayReviews.map(review => (
            <div key={review.id} className="rounded-xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={`text-lg ${i < review.rating ? 'text-yellow-400' : 'text-stone-200'}`}>{'★'}</span>
                ))}
              </div>
              <p className="mt-3 text-sm text-zinc-600 leading-relaxed">&ldquo;{review.text}&rdquo;</p>
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-zinc-900">{review.name}</p>
                  {review.verified && (
                    <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                  )}
                </div>
                <p className="mt-1 text-xs text-stone-400">{timeAgo(review.created_at)}</p>
              </div>
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.images.map((url, j) => (
                    <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-zinc-200" />
                    </a>
                  ))}
                </div>
              )}
              {review.video_url && (
                <div className="mt-3">
                  <video src={review.video_url} controls preload="metadata" className="w-full rounded-lg border border-zinc-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
