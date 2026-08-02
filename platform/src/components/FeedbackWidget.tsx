'use client'
import { useState } from 'react'
import { formatPhone } from '@/lib/format'

export default function FeedbackWidget({ source, token, variant = 'fixed' }: { source: string; token?: string; variant?: 'fixed' | 'inline' }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [anonymous, setAnonymous] = useState(false)
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
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          source,
          name: anonymous ? null : name.trim() || null,
          phone: anonymous ? null : phone.trim() || null,
          anonymous,
          ...(token ? { token } : {}),
        })
      })
      if (!res.ok) {
        setError('Failed to submit. Please try again.')
        return
      }
      setSubmitted(true)
      setTimeout(() => { setOpen(false); setSubmitted(false); setMessage(''); setName(''); setPhone(''); setAnonymous(false) }, 2000)
    } catch {
      setError('Failed to send feedback. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-yellow-300 shadow-md hover:bg-red-700 transition-colors flex-shrink-0 whitespace-nowrap ${variant === 'fixed' ? 'fixed top-3 right-3 z-[90]' : ''}`}
      >
        Feedback?
      </button>

      {open && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Feedback</h3>
            <p className="text-gray-500 text-sm mb-4">Tell us what&apos;s on your mind, or stay anonymous — your call.</p>

            {submitted ? (
              <div className="text-center py-6">
                <p className="text-lg font-medium text-slate-900">Thank you!</p>
                <p className="text-gray-500 text-sm">Your feedback has been submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label className="flex items-center gap-2.5 mb-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600/30"
                  />
                  <span className="text-sm text-gray-600">Prefer to stay anonymous?</span>
                </label>

                {!anonymous && (
                  <div className="space-y-2 mb-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-600"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="Phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-teal-600"
                    />
                  </div>
                )}

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Suggestions, concerns, compliments — anything helps..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm resize-none focus:outline-none focus:border-teal-600"
                  rows={4}
                  required
                />
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
                <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm">Cancel</button>
                  <button type="submit" disabled={sending || !message.trim()} className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-300">
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
