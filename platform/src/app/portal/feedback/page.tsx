'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '../layout'

export default function FeedbackPage() {
  const { auth } = usePortalAuth()
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!auth) return
    setLoading(true)
    const res = await fetch('/api/portal/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ rating, comment }),
    })
    if (res.ok) {
      setSubmitted(true)
    }
    setLoading(false)
  }

  if (!mounted) return <p className="text-center pt-16 text-slate-400">Loading...</p>
  if (!auth) { router.push('/portal/login'); return null }

  if (submitted) {
    return (
      <div className="text-center pt-16">
        <p className="text-3xl mb-4">Thank you!</p>
        <p className="text-slate-400 mb-6">Your feedback helps us improve.</p>
        <button onClick={() => router.push('/portal')} className="text-sm text-blue-600 font-medium">
          Back to Portal
        </button>
      </div>
    )
  }

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold text-slate-800 mb-2">Leave Feedback</h1>
      <p className="text-sm text-slate-400 mb-6">Your feedback is anonymous and helps us improve.</p>

      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="text-sm text-slate-400 block mb-2">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`w-12 h-12 rounded-xl text-xl ${
                  n <= rating ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-slate-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-2">Comments (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Tell us about your experience..."
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!rating || loading}
          className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}
