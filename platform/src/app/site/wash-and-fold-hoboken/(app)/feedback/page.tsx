'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function FeedbackForm() {
  useEffect(() => { document.title = 'Leave Feedback | The NYC Maid' }, [])
  const searchParams = useSearchParams()
  const source = searchParams.get('from') || 'Email Link'
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, source })
    })
    setSubmitted(true)
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-[#1E2A4A] mb-1">Anonymous Feedback</h1>
        <p className="text-gray-500 text-sm mb-6">Your feedback is completely anonymous and helps us improve.</p>

        {submitted ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">Thank you!</div>
            <p className="text-gray-600">Your feedback has been submitted anonymously.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind? Suggestions, concerns, compliments — anything helps..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[#1E2A4A] text-sm resize-none focus:outline-none focus:border-[#1E2A4A]"
              rows={5}
              required
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full mt-4 py-3 bg-[#1E2A4A] text-white rounded-xl font-medium disabled:bg-gray-300"
            >
              {sending ? 'Sending...' : 'Submit Feedback'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              No personal information is collected or attached.
            </p>
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
