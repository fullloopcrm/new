'use client'

// Owner's side of the platform messaging thread with Full Loop (admin).
// In-platform only. direction 'out' = from Full Loop, 'in' = this owner.
import { useCallback, useEffect, useRef, useState } from 'react'

interface Message {
  id: string
  direction: 'in' | 'out'
  channel: string | null
  body: string
  sender: string | null
  sender_role: string | null
  created_at: string
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function OwnerMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/dashboard/messages')
    if (res.ok) setMessages((await res.json()).messages || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    setDraft('')
    try {
      const res = await fetch('/api/dashboard/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message])
      } else {
        setError(data.error || 'Failed to send')
        setDraft(body)
      }
    } catch {
      setError('Network error')
      setDraft(body)
    }
    setSending(false)
  }

  return (
    <div className="loop-scope">
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--display)', fontSize: '40px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Messages<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--color-loop-muted)' }}>.</em>
        </h1>
        <p className="mt-2" style={{ fontSize: '13px', color: 'var(--color-loop-muted)' }}>
          Direct line to the Full Loop team.
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white flex flex-col" style={{ height: 'calc(100vh - 230px)', minHeight: '420px' }}>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && <p className="text-sm text-slate-400">Loading…</p>}
          {!loading && messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-slate-500">No messages yet. Say hello to the Full Loop team.</p>
            </div>
          )}
          {messages.map((m) => {
            const fromOwner = m.direction === 'in'
            return (
              <div key={m.id} className={`flex ${fromOwner ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  fromOwner ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  <div className="text-[10px] uppercase tracking-wide mb-0.5 opacity-50">
                    {fromOwner ? 'You' : 'Full Loop'}
                  </div>
                  {m.body}
                  <div className={`text-[10px] mt-1 ${fromOwner ? 'text-white/40' : 'text-slate-400'}`}>{fmtTime(m.created_at)}</div>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {error && <div className="px-5 py-2 text-xs text-red-600 border-t border-slate-200">{error}</div>}

        <form
          onSubmit={(e) => { e.preventDefault(); send() }}
          className="border-t border-slate-200 p-3 flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the Full Loop team…"
            disabled={sending}
            className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
