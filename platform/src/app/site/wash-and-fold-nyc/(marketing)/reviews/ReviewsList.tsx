'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const COLORS = [
  'bg-emerald-400', 'bg-indigo-500', 'bg-slate-500', 'bg-purple-500', 'bg-amber-400',
  'bg-violet-400', 'bg-cyan-400', 'bg-lime-500', 'bg-fuchsia-400', 'bg-yellow-500',
]

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

function Stars({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? 'text-yellow-400' : 'text-gray-200'}>&#9733;</span>
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
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-8">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a3a5c] rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">W</span>
          </div>
          <div>
            <span className="text-gray-900 font-semibold text-lg">Customer Reviews</span>
            <p className="text-gray-400 text-xs">Verified Client Reviews</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {avgRating !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-bold text-2xl">{avgRating}</span>
              <span className="text-yellow-400 text-lg">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-gray-400 text-sm">({totalCount})</span>
            </div>
          )}
          <Link href="sms:9179706002" className="hidden sm:inline-block bg-[#1a3a5c] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2B7BB0] transition-colors">
            Write a Review
          </Link>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading reviews...</div>
        ) : displayReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No reviews yet — be the first to leave one.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayReviews.map((review, i) => (
              <div key={review.id} className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 ${COLORS[i % COLORS.length]} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {review.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{review.name}</p>
                      {review.verified && (
                        <svg className="w-3.5 h-3.5 text-[#1a3a5c] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{timeAgo(review.created_at)}</p>
                  </div>
                </div>
                <Stars count={review.rating} />
                <p className="text-gray-700 text-sm leading-relaxed mt-2">{review.text}</p>

                {review.images && review.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {review.images.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      </a>
                    ))}
                  </div>
                )}

                {review.video_url && (
                  <div className="mt-3">
                    <video src={review.video_url} controls preload="metadata" className="w-full rounded-lg border border-gray-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
