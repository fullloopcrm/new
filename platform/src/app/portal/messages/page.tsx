'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type PortalMessage = {
  id: string
  direction: 'in' | 'out' | 'auto' | 'system'
  author: 'customer' | 'yinez' | 'admin' | 'system' | 'cleaner'
  body: string | null
  sent_at: string
}

export default function ClientPortalMessages() {
  const router = useRouter()
  const [messages, setMessages] = useState<PortalMessage[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const res = await fetch('/api/portal/messages')
    if (res.status === 401) { setAuthed(false); router.push('/portal'); return }
    const data = await res.json()
    setMessages(data.messages || [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchMessages()
    const t = setInterval(fetchMessages, 5000)
    return () => clearInterval(t)
  }, [fetchMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const send = async () => {
    if (!composer.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: composer.trim() }),
      })
      const data = await res.json()
      if (!res.ok) alert('Send failed: ' + (data.error || res.status))
      else { setComposer(''); fetchMessages() }
    } finally {
      setSending(false)
    }
  }

  const logout = async () => {
    await fetch('/api/portal/auth', { method: 'DELETE' })
    router.push('/portal')
  }

  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch { return iso }
  }

  if (!authed) return null

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <header className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-lg">Messages with The NYC Maid</h1>
          <div className="text-xs text-neutral-500">We&apos;ll reply as soon as someone&apos;s available.</div>
        </div>
        <button onClick={logout} className="text-xs text-neutral-400 hover:text-neutral-200">Sign out</button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {loading && <div className="text-sm text-neutral-500">Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-sm text-neutral-500 text-center py-8">
            No messages yet. Send us a note below.
          </div>
        )}
        {messages.map(m => {
          const isCustomer = m.author === 'customer'
          return (
            <div key={m.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] min-w-0">
                <div className={`rounded-2xl px-4 py-2 break-words ${isCustomer ? 'bg-blue-600' : (m.author === 'yinez' || m.direction === 'auto' ? 'bg-purple-700' : 'bg-neutral-800')}`}>
                  <div className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body || ''}</div>
                </div>
                <div className="text-[10px] text-neutral-500 mt-1 px-1">
                  {isCustomer ? 'You' : (m.author === 'yinez' ? 'Yinez · auto' : 'Support')} · {fmtTime(m.sent_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-neutral-800 p-4 max-w-2xl mx-auto w-full">
        <div className="flex gap-2">
          <textarea
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
            placeholder="Message us (⌘+Enter to send)"
            rows={3}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-neutral-600"
          />
          <button
            onClick={send}
            disabled={!composer.trim() || sending}
            className="self-stretch px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-md text-sm font-medium"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
