'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { formatPhone } from '@/lib/format'

function FeedbackForm() {
  useEffect(() => { document.title = 'Leave Feedback | Your Business' }, [])
  const searchParams = useSearchParams()
  const source = searchParams.get('from') || 'Email Link'

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/client-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          source,
          name: anonymous ? null : name.trim() || null,
          phone: anonymous ? null : phone.trim() || null,
        })
      })
      if (!res.ok) {
        setError('Failed to submit. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[var(--brand)] mb-1">Leave Feedback</h1>
        <p className="text-gray-500 text-sm mb-6">
          What you loved, what we could&apos;ve done better, or anything you&apos;d like to see from us — all feedback is welcome.
        </p>

        {submitted ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">🙏</div>
            <p className="text-gray-700 font-medium mb-1">Thank you!</p>
            <p className="text-gray-500 text-sm">Your feedback has been submitted.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="flex items-center gap-2.5 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[var(--brand)] focus:ring-[var(--brand)]/30"
              />
              <span className="text-sm text-gray-600">Prefer to stay anonymous?</span>
            </label>

            {!anonymous && (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[var(--brand)] text-sm focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="Phone"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[var(--brand)] text-sm focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                />
              </div>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind? Suggestions, concerns, compliments — anything helps..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[var(--brand)] text-sm resize-none focus:outline-none focus:border-[var(--brand)]"
              rows={5}
              required
            />

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full mt-4 py-3 bg-[var(--brand)] text-white rounded-xl font-medium disabled:bg-gray-300"
            >
              {sending ? 'Sending...' : 'Submit Feedback'}
            </button>
            {anonymous && (
              <p className="text-xs text-gray-400 text-center mt-3">
                No personal information is collected or attached.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackForm />
    </Suspense>
  )
}
