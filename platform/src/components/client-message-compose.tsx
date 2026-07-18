'use client'

import { useState } from 'react'

export function SmsComposeBox({
  clientId,
  onSent,
}: {
  clientId: string
  onSent?: () => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!message.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send message')
        return
      }
      setMessage('')
      onSent?.()
    } catch {
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-slate-200 pt-3 mt-3">
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a text message..."
          rows={2}
          maxLength={1600}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button
          onClick={send}
          disabled={sending || !message.trim()}
          className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium disabled:opacity-50 self-end"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export function EmailComposeBox({
  clientId,
  onSent,
}: {
  clientId: string
  onSent?: () => void
}) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!subject.trim() || !body.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send email')
        return
      }
      setSubject('')
      setBody('')
      onSent?.()
    } catch {
      setError('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        maxLength={200}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message..."
        rows={4}
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
      />
      <button
        onClick={send}
        disabled={sending || !subject.trim() || !body.trim()}
        className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium disabled:opacity-50"
      >
        {sending ? 'Sending...' : 'Send Email'}
      </button>
    </div>
  )
}
