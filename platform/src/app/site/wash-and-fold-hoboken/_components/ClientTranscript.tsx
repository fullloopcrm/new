'use client'
import { useEffect, useState, useRef } from 'react'

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  message: string
  created_at: string
}

export default function ClientTranscript({ clientId }: { clientId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/clients/${clientId}/transcript`)
        if (res.ok) setMessages(await res.json())
      } catch (e) {
        console.error('Failed to load transcript:', e)
      }
      setLoading(false)
    }
    load()
  }, [clientId])

  useEffect(() => {
    if (expanded && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [expanded, messages])

  if (loading) return <div className="text-sm text-gray-400 py-2">Loading transcript...</div>
  if (messages.length === 0) return <div className="text-sm text-gray-400 py-2">No SMS history</div>

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  // Group messages by date
  const grouped: Record<string, Message[]> = {}
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(msg)
  }

  const shown = expanded ? messages : messages.slice(-6)
  const shownGrouped: Record<string, Message[]> = {}
  for (const msg of shown) {
    const date = new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    if (!shownGrouped[date]) shownGrouped[date] = []
    shownGrouped[date].push(msg)
  }

  return (
    <div>
      {!expanded && messages.length > 6 && (
        <button onClick={() => setExpanded(true)} className="text-xs text-[#1E2A4A] hover:underline mb-2">
          Show all {messages.length} messages
        </button>
      )}
      {expanded && messages.length > 6 && (
        <button onClick={() => setExpanded(false)} className="text-xs text-[#1E2A4A] hover:underline mb-2">
          Show recent only
        </button>
      )}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {Object.entries(shownGrouped).map(([date, msgs]) => (
          <div key={date}>
            <p className="text-[10px] text-gray-400 text-center mb-1.5">{date}</p>
            <div className="space-y-1.5">
              {msgs.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    msg.direction === 'outbound'
                      ? 'bg-[#1E2A4A] text-white rounded-br-sm'
                      : 'bg-gray-100 text-[#1E2A4A] rounded-bl-sm'
                  }`}>
                    {msg.message}
                    <p className={`text-[10px] mt-0.5 ${msg.direction === 'outbound' ? 'text-gray-400' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
