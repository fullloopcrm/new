'use client'

// One team-to-team DM thread, reusing the Full Loop thread's bubble/composer
// styling. direction is derived client-side by comparing sender_team_member_id
// to the thread's `me` id (there is no fixed in/out like the Full Loop thread,
// since either side of a team DM can be the sender).
import { useCallback, useEffect, useRef, useState } from 'react'

interface TeamMessage {
  id: string
  sender_team_member_id: string
  recipient_team_member_id: string
  body: string
  created_at: string
  read_at: string | null
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function TeamThread({ teamMemberId, teamMemberName, onSent }: {
  teamMemberId: string
  teamMemberName: string
  onSent?: () => void
}) {
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard/team-messages/${teamMemberId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages || [])
      setMeId(data.me ?? null)
    }
    setLoading(false)
  }, [teamMemberId])

  useEffect(() => { setLoading(true); load() }, [load])
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') load() }, 15000)
    return () => clearInterval(id)
  }, [load])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function send() {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    setDraft('')
    try {
      const res = await fetch(`/api/dashboard/team-messages/${teamMemberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message])
        onSent?.()
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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-500">No messages yet. Say hello to {teamMemberName}.</p>
          </div>
        )}
        {messages.map((m) => {
          const fromMe = meId !== null && m.sender_team_member_id === meId
          return (
            <div key={m.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                fromMe ? 'bg-slate-900 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              }`}>
                <div className="text-[10px] uppercase tracking-wide mb-0.5 opacity-50">
                  {fromMe ? 'You' : teamMemberName}
                </div>
                {m.body}
                <div className={`text-[10px] mt-1 ${fromMe ? 'text-white/40' : 'text-slate-400'}`}>{fmtTime(m.created_at)}</div>
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
          placeholder={`Message ${teamMemberName}…`}
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
  )
}
