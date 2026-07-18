'use client'

// Owner's side of the platform messaging thread with Full Loop (admin).
// In-platform only. direction 'out' = from Full Loop, 'in' = this owner.
// Rendered with the same ChatBubble/DateDivider/ChatInput pattern as Loop
// Connect (src/app/dashboard/connect/page.tsx), using the imessage-mine/
// imessage-theirs variants since this is a 2-party DM rather than a
// multi-party channel.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatBubble, ChatInput, DateDivider, groupMessagesByDate } from '@/components/chat-bubble'
import type { ChatMessage } from '@/components/chat-bubble'

interface Message {
  id: string
  direction: 'in' | 'out'
  channel: string | null
  body: string
  sender: string | null
  sender_role: string | null
  created_at: string
}

function toChatMessage(m: Message): ChatMessage {
  const fromOwner = m.direction === 'in'
  return {
    id: m.id,
    sender_type: fromOwner ? 'owner' : 'team',
    sender_id: fromOwner ? 'me' : 'fullloop',
    sender_name: fromOwner ? 'You' : 'Full Loop',
    body: m.body,
    created_at: m.created_at,
  }
}

export default function FullLoopThread() {
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

  const grouped = groupMessagesByDate(messages.map(toChatMessage))

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-5">
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-500">No messages yet. Say hello to the Full Loop team.</p>
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
          placeholder="Message the Full Loop team…"
          disabled={sending}
        />
      </div>
    </div>
  )
}
