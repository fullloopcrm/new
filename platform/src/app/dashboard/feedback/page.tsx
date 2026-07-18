'use client'

import { useState } from 'react'

const categories = [
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'praise', label: 'Praise' },
  { value: 'other', label: 'Other' },
]

export default function FeedbackPage() {
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, category }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Failed to submit. Please try again.')
        return
      }
      setSubmitted(true)
      setMessage('')
      setCategory('general')
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-heading font-bold text-slate-900">Feedback / Suggestions</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Tell us what&apos;s working, what&apos;s not, or what you&apos;d like to see. It goes straight to the Full Loop team.
      </p>

      {submitted ? (
        <div className="border border-teal-200 bg-teal-50 rounded-lg p-6 text-center">
          <p className="font-semibold text-slate-900">Thanks — got it!</p>
          <p className="text-sm text-slate-500 mt-1">We read every submission.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            Send another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-600"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Suggestions, bugs, praise, anything helps..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 resize-none focus:outline-none focus:border-teal-600"
              rows={6}
              maxLength={5000}
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:bg-slate-300"
          >
            {sending ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
      )}
    </div>
  )
}
