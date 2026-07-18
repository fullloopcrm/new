'use client'

// One team-to-team DM thread, reusing the Full Loop thread's ChatBubble/
// DateDivider/ChatInput pattern (same components as Loop Connect). "mine" is
// derived client-side by comparing sender_team_member_id to the thread's
// `me` id -- there is no fixed in/out like the Full Loop thread, since
// either side of a team DM can be the sender.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatBubble, ChatInput, DateDivider, groupMessagesByDate } from '@/components/chat-bubble'
import type { ChatMessage } from '@/components/chat-bubble'

interface TeamMessage {
  id: string
  sender_team_member_id: string
  recipient_team_member_id: string
  body: string
  created_at: string
  read_at: string | null
}

function toChatMessage(m: TeamMessage, meId: string | null, teamMemberName: string): ChatMessage {
  const fromMe = meId !== null && m.sender_team_member_id === meId
  return {
    id: m.id,
    sender_type: fromMe ? 'owner' : 'team',
    sender_id: fromMe ? 'me' : m.sender_team_member_id,
    sender_name: fromMe ? 'You' : teamMemberName,
    body: m.body,
    created_at: m.created_at,
  }
}

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

  const grouped = groupMessagesByDate(messages.map((m) => toChatMessage(m, meId, teamMemberName)))

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-5">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-500">No messages yet. Say hello to {teamMemberName}.</p>
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.date}>
            <DateDivider date={group.date} />
            {group.messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} variant={msg.sender_id === 'me' ? 'imessage-mine' : 'imessage-theirs'} />
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {error && <div className="px-5 py-2 text-xs text-red-600 border-t border-slate-200">{error}</div>}

      <div className="border-t border-slate-200 p-3">
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={send}
          placeholder={`Message ${teamMemberName}…`}
          disabled={sending}
        />
      </div>
    </div>
  )
}
