'use client'
import { useState } from 'react'

export default function FeedbackWidget({ source }: { source: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, source })
      })
      setSubmitted(true)
      setTimeout(() => { setOpen(false); setSubmitted(false); setMessage('') }, 2000)
    } catch {
      setError('Unable to reach the server. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="text-center py-6">
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 text-sm hover:text-[#1E2A4A] transition-colors"
        >
          Feedback?
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-[#1E2A4A]/50 flex items-center justify-center z-[100] p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1E2A4A] mb-1">Anonymous Feedback</h3>
            <p className="text-gray-500 text-sm mb-4">Your feedback is completely anonymous.</p>

            {submitted ? (
              <div className="text-center py-6">
                <p className="text-lg font-medium text-[#1E2A4A]">Thank you!</p>
                <p className="text-gray-500 text-sm">Your feedback has been submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Suggestions, concerns, compliments — anything helps..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm resize-none focus:outline-none focus:border-[#1E2A4A]"
                  rows={4}
                  required
                  autoFocus
                />
                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm">Cancel</button>
                  <button type="submit" disabled={sending || !message.trim()} className="flex-1 py-2 bg-[#1E2A4A] text-white rounded-lg text-sm font-medium disabled:bg-gray-300">
                    {sending ? '...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
