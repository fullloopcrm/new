'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Browser softphone — Telnyx WebRTC. Lazy + SSR-disabled because the SDK
// touches `window` on import.
const Softphone = dynamic(() => import('@/components/comhub/Softphone'), {
  ssr: false,
  loading: () => null,
})
const ActiveCallBanner = dynamic(() => import('@/components/comhub/ActiveCallBanner'), {
  ssr: false,
  loading: () => null,
})

type Contact = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  client_id: string | null
  team_member_id: string | null
}

type Thread = {
  id: string
  contact_id: string | null
  channel: 'sms' | 'email' | 'voice' | 'web' | 'admin' | 'telegram' | 'internal'
  kind: 'contact' | 'channel'
  name: string | null
  slug: string | null
  description: string | null
  subject: string | null
  status: 'open' | 'snoozed' | 'closed'
  disposition: 'waiting_customer' | 'waiting_admin' | 'closed_booked' | 'closed_lost' | 'closed_spam' | null
  bot_paused_until: string | null
  snoozed_until: string | null
  created_at: string
  last_message_at: string
  last_message_preview: string | null
  unread_count: number
  comhub_contacts: Contact | null
}

type Message = {
  id: string
  direction: 'in' | 'out' | 'auto' | 'system'
  author: 'customer' | 'yinez' | 'admin' | 'system' | 'cleaner'
  author_id: string | null
  body: string | null
  subject: string | null
  from_address: string | null
  to_address: string | null
  sent_at: string
  read_at: string | null
  channel: string
  media_urls: string[] | null
  metadata: Record<string, unknown> | null
  flagged_for_review: boolean
  flagged_reason: string | null
}

type Template = {
  id: string
  name: string
  body: string
  channel: string | null
  hotkey: string | null
}

type AuthorMap = Record<string, { name: string | null; email: string | null }>

type Filter = 'all' | 'unread' | 'unresponded'

type Booking = {
  id: string
  start_time: string
  service_type: string | null
  status: string | null
  payment_status: string | null
  hourly_rate: number | null
  actual_hours: number | null
  price: number | null
  team_members: { name: string } | { name: string }[] | null
}
type ClientRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  address_line1: string | null
  status: string | null
  active: boolean | null
  do_not_service: boolean | null
  pet_name: string | null
  pet_type: string | null
  notes_private: string | null
  notes_public: string | null
}
type CleanerRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  active: boolean | null
  hourly_rate: number | null
  avg_rating: number | null
  rating_count: number | null
}
type ContactContext = {
  contact: Contact
  client: ClientRow | null
  cleaner: CleanerRow | null
  recent_bookings: Booking[]
  total_bookings: number
  total_spent_cents: number
  outstanding_cents: number
}

const fmtTime = (iso: string) => {
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    return sameDay
      ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch { return '' }
}

const contactDisplay = (c: Contact | null) => c ? (c.name || c.phone || c.email || 'Unknown') : 'Unknown'

// Highlight @handle / @here / @channel / @all in message bodies.
function renderWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@[a-zA-Z][a-zA-Z0-9_.-]{0,30})/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="bg-amber-900/40 text-amber-200 rounded px-1">{part}</span>
    }
    return <span key={i}>{part}</span>
  })
}
const threadTitle = (t: Thread) => t.kind === 'channel' ? (t.name || `#${t.slug || 'channel'}`) : contactDisplay(t.comhub_contacts)

export default function ComhubPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [channels, setChannels] = useState<Thread[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [mobileContextOpen, setMobileContextOpen] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [authors, setAuthors] = useState<AuthorMap>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [explainOpen, setExplainOpen] = useState<Record<string, boolean>>({})
  const [composer, setComposer] = useState('')
  const [subject, setSubject] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [channel, setChannel] = useState<'all' | 'sms' | 'web' | 'email' | 'voice' | 'admin'>('all')
  const [q, setQ] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [sending, setSending] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showYinez, setShowYinez] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)
  const [composeChannel, setComposeChannel] = useState<'sms' | 'email' | 'call'>('sms')
  const [composeRecipient, setComposeRecipient] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [context, setContext] = useState<ContactContext | null>(null)
  const [composeBody, setComposeBody] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchThreads = useCallback(async () => {
    const params = new URLSearchParams({
      kind: 'contact',
      status: 'open',
      channel,
      filter,
    })
    if (q.trim()) params.set('q', q.trim())
    const res = await fetch(`/api/admin/comhub/threads?${params.toString()}`)
    const data = await res.json()
    setThreads(data.threads || [])
    setLoadingList(false)
  }, [filter, channel, q])

  const fetchChannels = useCallback(async () => {
    const res = await fetch('/api/admin/comhub/threads?kind=channel&status=all&channel=all')
    const data = await res.json()
    setChannels(data.threads || [])
  }, [])

  const fetchThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/comhub/threads/${id}`)
    const data = await res.json()
    setThread(data.thread || null)
    setMessages(data.messages || [])
    setAuthors(data.authors || {})
    // Mark read.
    if (data.thread?.unread_count > 0) {
      await fetch(`/api/admin/comhub/threads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_read: true }),
      })
    }
  }, [])

  useEffect(() => { fetchThreads(); fetchChannels() }, [fetchThreads, fetchChannels])

  // Pickup ?dial=+1... from the URL and stash it so the softphone can
  // place the call as soon as it's registered. The SDK takes ~1-2s to
  // come up so we can't dispatch the event synchronously.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const dial = params.get('dial')
    if (!dial) return
    ;(window as Window & { __comhubPendingDial?: string }).__comhubPendingDial = dial
    // Also try a dispatched event in case the softphone is already up.
    window.dispatchEvent(new CustomEvent('comhub:dial', { detail: { phone: dial } }))
    // Strip the param so refresh doesn't re-dial.
    const url = new URL(window.location.href)
    url.searchParams.delete('dial')
    window.history.replaceState({}, '', url.toString())
  }, [])
  useEffect(() => {
    const t = setInterval(() => { fetchThreads(); fetchChannels() }, 5000)
    return () => clearInterval(t)
  }, [fetchThreads, fetchChannels])

  useEffect(() => {
    if (!selected) { setThread(null); setMessages([]); setContext(null); return }
    fetchThread(selected)
    const t = setInterval(() => fetchThread(selected), 5000)
    return () => clearInterval(t)
  }, [selected, fetchThread])

  // Load reply templates filtered by current channel.
  useEffect(() => {
    const ch = thread?.channel === 'sms' || thread?.channel === 'email' ? thread.channel : 'all'
    fetch(`/api/admin/comhub/templates?channel=${ch}`)
      .then(r => r.ok ? r.json() : { templates: [] })
      .then(d => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
  }, [thread?.channel])

  // Right-side context panel — re-fetches when the selected thread's contact changes.
  useEffect(() => {
    if (!thread?.contact_id) { setContext(null); return }
    let cancelled = false
    fetch(`/api/admin/comhub/contacts/${thread.contact_id}/context`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setContext(d) })
      .catch(() => { if (!cancelled) setContext(null) })
    return () => { cancelled = true }
  }, [thread?.contact_id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const handleSend = async () => {
    if (!thread || !composer.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/comhub/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: thread.id,
          channel: thread.channel,
          body: composer,
          subject: thread.channel === 'email' ? (subject || thread.subject || undefined) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert('Send failed: ' + (data.error || res.status))
      } else {
        setComposer('')
        setSubject('')
        await fetchThread(thread.id)
        await fetchThreads()
        await fetchChannels()
      }
    } finally {
      setSending(false)
    }
  }

  const totalUnread = useMemo(() => threads.reduce((a, t) => a + (t.unread_count || 0), 0), [threads])

  return (
    <div className="comhub-loop flex flex-col h-[100dvh] md:h-[calc(100vh-4rem)] bg-[#F4F4F1] text-[#1C1C1C]">
      <ActiveCallBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Floating softphone — Telnyx WebRTC browser dialer. Hidden on mobile so it doesn't cover the composer. */}
      <div
        className="hidden md:block"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 60,
        }}
      >
        <Softphone />
      </div>
      {/* Left: thread list — full-width on mobile, sidebar on md+. Hidden on mobile when a thread is selected. */}
      <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80 md:shrink-0 border-r border-[#E4E2DC] flex-col`}>
        <div className="p-4 border-b border-[#E4E2DC]">
          <div className="mb-3" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            01 · Comhub
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--ink)' }}>
              Comhub<em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--muted)' }}>.</em>
            </h2>
            {totalUnread > 0 && (
              <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--ink)', color: 'var(--canvas)', fontFamily: 'var(--mono)' }}>{totalUnread}</span>
            )}
          </div>
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('comhub:focus'))
              }}
              className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ background: 'var(--ink)', color: 'var(--canvas)' }}
            >
              📞 Call
            </button>
            <button
              onClick={() => { setComposeChannel('sms'); setShowCompose(true) }}
              className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ background: 'var(--canvas)', color: 'var(--ink)', border: '1px solid var(--line)' }}
            >
              💬 Text
            </button>
            <button
              onClick={() => { setComposeChannel('email'); setShowCompose(true) }}
              className="flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ background: 'var(--canvas)', color: 'var(--ink)', border: '1px solid var(--line)' }}
            >
              ✉ Email
            </button>
            <button
              onClick={() => setShowYinez(true)}
              className="hidden md:inline-block px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
              style={{ background: 'var(--canvas)', color: 'var(--ink)', border: '1px solid var(--line)' }}
              title="Chat with Yinez"
            >
              ✦
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search threads…"
            className="w-full bg-[#FFFFFF] border border-[#E4E2DC] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#C8C5BC]"
          />
          <div className="flex gap-1 mt-3 text-xs">
            {(['all', 'unread', 'unresponded'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full ${filter === f ? 'bg-blue-600 text-white' : 'bg-[#FFFFFF] text-[#7A7A78] hover:bg-[#EFEFEC]'}`}
              >
                {f === 'all' ? 'Open' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-2 text-xs flex-wrap">
            {(['all', 'sms', 'web', 'email', 'voice', 'admin'] as const).map(c => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`px-2 py-0.5 rounded ${channel === c ? 'bg-[#F4F4F1] text-white' : 'text-[#7A7A78] hover:text-[#1C1C1C]'}`}
              >
                {c === 'admin' ? 'YINEZ' : c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {/* Channels — collapsible dropdown. Collapsed by default so Messages list gets the height. */}
        <div className="border-b border-[#E4E2DC] shrink-0">
          <div className="flex justify-between items-center px-4 pt-3 pb-1">
            <button
              onClick={() => setChannelsOpen(v => !v)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#7A7A78] hover:text-[#1C1C1C]"
              aria-expanded={channelsOpen}
            >
              <span className="inline-block transition-transform" style={{ transform: channelsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
              Channels {channels.length > 0 && <span className="text-[#7A7A78]">({channels.length})</span>}
            </button>
            <button
              onClick={() => setShowNewChannel(true)}
              className="text-[11px] text-[#7A7A78] hover:text-[#1C1C1C]"
              title="Create channel"
            >+ New</button>
          </div>
          {channelsOpen && (
            <div className="max-h-56 overflow-y-auto pb-1">
              {channels.length === 0 && (
                <div className="px-4 pb-3 text-xs text-[#7A7A78]">No channels.</div>
              )}
              {channels.map(t => {
                const isSel = selected === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className={`w-full text-left px-4 py-2 hover:bg-[#F4F4F1] transition ${isSel ? 'bg-[#FFFFFF]' : ''}`}
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="font-medium truncate text-sm">{t.name || `#${t.slug}`}</div>
                      <div className="text-[10px] text-[#7A7A78] shrink-0">{fmtTime(t.last_message_at)}</div>
                    </div>
                    {t.last_message_preview && (
                      <div className="text-[11px] text-[#7A7A78] truncate mt-0.5">{t.last_message_preview}</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Messages — inbound from clients/cleaners/referrers via SMS, email, portal */}
          <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-[#7A7A78] sticky top-0 bg-[#F4F4F1]">Messages</div>
          {loadingList && <div className="p-4 text-sm text-[#7A7A78]">Loading…</div>}
          {!loadingList && threads.length === 0 && (
            <div className="p-4 text-sm text-[#7A7A78]">No threads.</div>
          )}
          {threads.map(t => {
            const isSel = selected === t.id
            const c = t.comhub_contacts
            const role: 'client' | 'cleaner' | 'unlinked' = c?.client_id ? 'client' : c?.team_member_id ? 'cleaner' : 'unlinked'
            const roleClass = role === 'client'
              ? 'bg-blue-500/15 text-blue-300'
              : role === 'cleaner'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-[#FFFFFF] text-[#7A7A78]'
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-[#E4E2DC] hover:bg-[#F4F4F1] transition ${isSel ? 'bg-[#FFFFFF]' : ''}`}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <div className="font-medium truncate flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] uppercase tracking-wider px-1 rounded shrink-0 ${roleClass}`}>
                      {role === 'unlinked' ? 'lead' : role}
                    </span>
                    <span className="truncate">{contactDisplay(c)}</span>
                  </div>
                  <div className="text-xs text-[#7A7A78] shrink-0">{fmtTime(t.last_message_at)}</div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase text-[#7A7A78]">{t.channel}</span>
                  {t.unread_count > 0 && (
                    <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5">{t.unread_count}</span>
                  )}
                  <div className="text-xs text-[#7A7A78] truncate">{t.last_message_preview || '—'}</div>
                </div>
              </button>
            )
          })}

        </div>
      </aside>

      {/* Center: conversation — hidden on mobile when no thread is selected. */}
      <main className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 overflow-hidden`}>
        {!thread && (
          <div className="flex-1 hidden md:flex items-center justify-center text-[#7A7A78]">
            Select a conversation
          </div>
        )}
        {thread && (
          <>
            <header className="px-3 md:px-6 py-3 border-b border-[#E4E2DC] flex items-center justify-between gap-2">
              {/* Mobile back button — returns to thread list */}
              <button
                onClick={() => { setSelected(null); setMobileContextOpen(false) }}
                className="md:hidden shrink-0 px-2 py-1 text-[#3A3A3A] hover:text-[#1C1C1C] text-lg leading-none"
                aria-label="Back to thread list"
              >
                ←
              </button>
              {/* Mobile info button — opens context panel as an overlay */}
              {thread.kind === 'contact' && (
                <button
                  onClick={() => setMobileContextOpen(true)}
                  className="md:hidden shrink-0 px-2 py-1 text-[#3A3A3A] hover:text-[#1C1C1C] text-sm leading-none"
                  aria-label="Open client info"
                  title="Client info"
                >
                  ⓘ
                </button>
              )}
              <div className="min-w-0 flex-1 mr-1 md:mr-3">
                <div className="font-semibold truncate text-sm md:text-base">{threadTitle(thread)}</div>
                <div className="text-xs text-[#7A7A78] truncate">
                  {thread.kind === 'channel'
                    ? (thread.description || 'Internal channel')
                    : `${thread.channel.toUpperCase()} · ${thread.comhub_contacts?.phone || thread.comhub_contacts?.email || ''}`}
                </div>
              </div>
              <div className="flex flex-nowrap gap-1.5 text-sm shrink-0 items-center overflow-x-auto">
                {thread.kind === 'contact' && thread.channel === 'sms' && (
                  thread.bot_paused_until && new Date(thread.bot_paused_until) > new Date() ? (
                    <button
                      onClick={async () => {
                        await fetch(`/api/admin/comhub/threads/${thread.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ handback: true }),
                        })
                        fetchThread(thread.id)
                      }}
                      className="px-2.5 py-1 rounded text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 whitespace-nowrap"
                      title="Resume Yinez on this thread"
                    >
                      Hand back to Yinez
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        // 1 year = effectively permanent until admin hands back.
                        await fetch(`/api/admin/comhub/threads/${thread.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ takeover_minutes: 525600 }),
                        })
                        fetchThread(thread.id)
                      }}
                      className="px-2.5 py-1 rounded text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 whitespace-nowrap"
                      title="Pause Yinez on this thread until you hand it back"
                    >
                      Take over (Yinez off)
                    </button>
                  )
                )}
                {thread.kind === 'contact' && (
                  <select
                    value={thread.disposition || ''}
                    onChange={async (e) => {
                      const v = e.target.value || null
                      await fetch(`/api/admin/comhub/threads/${thread.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ disposition: v }),
                      })
                      fetchThread(thread.id)
                      fetchThreads()
                    }}
                    className="px-2 py-1 rounded bg-[#FFFFFF]/60 hover:bg-[#EFEFEC] text-[#3A3A3A] text-xs border-0 cursor-pointer"
                  >
                    <option value="">No status</option>
                    <option value="waiting_customer">Waiting on customer</option>
                    <option value="waiting_admin">Waiting on me</option>
                    <option value="closed_booked">Closed — booked</option>
                    <option value="closed_lost">Closed — lost</option>
                    <option value="closed_spam">Closed — spam</option>
                  </select>
                )}
                {(thread.channel === 'sms' || thread.channel === 'voice') && thread.comhub_contacts?.phone && (
                  <button
                    onClick={() => {
                      const phone = thread.comhub_contacts?.phone
                      if (!phone) return
                      // Hand the call off to the floating softphone — it
                      // places the call directly through Telnyx WebRTC.
                      window.dispatchEvent(
                        new CustomEvent('comhub:dial', { detail: { phone } })
                      )
                    }}
                    className="px-2.5 py-1 rounded text-xs bg-emerald-700/80 hover:bg-emerald-600 text-white whitespace-nowrap"
                  >
                    📞 Call
                  </button>
                )}
                {thread.status === 'snoozed' ? (
                  <button
                    onClick={async () => {
                      await fetch(`/api/admin/comhub/threads/${thread.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'open' }),
                      })
                      fetchThread(thread.id)
                      fetchThreads()
                    }}
                    className="px-2.5 py-1 rounded text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 whitespace-nowrap"
                    title={thread.snoozed_until ? `Snoozed until ${new Date(thread.snoozed_until).toLocaleString()}` : 'Snoozed'}
                  >
                    😴 Wake now
                  </button>
                ) : (
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      const hours = parseInt(e.target.value, 10)
                      e.target.value = ''
                      if (!hours) return
                      const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
                      await fetch(`/api/admin/comhub/threads/${thread.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'snoozed', snoozed_until: snoozedUntil }),
                      })
                      setSelected(null)
                      fetchThreads()
                    }}
                    className="px-2 py-1 rounded bg-[#FFFFFF]/60 hover:bg-[#EFEFEC] text-[#3A3A3A] text-xs border-0 cursor-pointer"
                  >
                    <option value="">Snooze…</option>
                    <option value="1">1 hour</option>
                    <option value="4">4 hours</option>
                    <option value="24">Tomorrow</option>
                    <option value="168">Next week</option>
                  </select>
                )}
                <button
                  onClick={async () => {
                    await fetch(`/api/admin/comhub/threads/${thread.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'closed' }),
                    })
                    setSelected(null)
                    fetchThreads()
                  }}
                  className="px-2.5 py-1 rounded text-xs bg-[#FFFFFF]/60 hover:bg-[#EFEFEC] text-[#3A3A3A] whitespace-nowrap"
                >
                  Close
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-3">
              {messages.map(m => {
                const isOut = m.direction === 'out' || m.direction === 'auto'
                const isAuto = m.direction === 'auto'
                const authorName = m.author_id && authors[m.author_id]?.name
                  ? authors[m.author_id].name
                  : (m.author === 'admin' ? 'Admin' : m.author)
                const hasMetadata = m.metadata && Object.keys(m.metadata).length > 0
                const explainShown = !!explainOpen[m.id]
                return (
                  <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'} group`}>
                    <div className="max-w-[85%] md:max-w-[70%] min-w-0">
                      <div className={`rounded-2xl px-4 py-2 break-words overflow-hidden relative ${isOut ? (isAuto ? 'bg-purple-700' : 'bg-blue-600') : 'bg-[#FFFFFF]'} ${m.flagged_for_review ? 'ring-2 ring-amber-500' : ''}`}>
                        {m.subject && <div className="font-medium text-sm mb-1 break-words">{m.subject}</div>}
                        <div className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{renderWithMentions(m.body || '')}</div>
                        {m.media_urls && m.media_urls.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {m.media_urls.map((url, i) => (
                              <audio
                                key={`${m.id}-media-${i}`}
                                controls
                                preload="metadata"
                                src={url}
                                className="w-full max-w-[280px] h-9"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-[#7A7A78] mt-1 px-1 flex gap-2 items-center">
                        <span>{authorName}{isAuto ? ' · auto' : ''}</span>
                        <span>{fmtTime(m.sent_at)}</span>
                        {isAuto && (
                          <button
                            onClick={() => setExplainOpen(s => ({ ...s, [m.id]: !s[m.id] }))}
                            className="text-[#7A7A78] hover:text-[#1C1C1C] underline-offset-2 hover:underline"
                            title="Why did Yinez say that?"
                          >
                            {explainShown ? 'hide' : 'why?'}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (m.flagged_for_review) {
                              await fetch(`/api/admin/comhub/messages/${m.id}/flag`, { method: 'DELETE' })
                            } else {
                              const reason = window.prompt('Flag reason (optional):') || undefined
                              await fetch(`/api/admin/comhub/messages/${m.id}/flag`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reason }),
                              })
                            }
                            fetchThread(thread.id)
                          }}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${m.flagged_for_review ? 'text-amber-400 opacity-100' : 'text-[#7A7A78] hover:text-amber-400'}`}
                          title={m.flagged_for_review ? 'Unflag' : 'Flag for review'}
                        >
                          {m.flagged_for_review ? '🚩 flagged' : '🚩'}
                        </button>
                      </div>
                      {explainShown && isAuto && (
                        <div className="mt-1 ml-1 px-3 py-2 rounded bg-[#FFFFFF] border border-[#E4E2DC] text-[11px] text-[#7A7A78] space-y-0.5">
                          <div><span className="text-[#7A7A78]">channel:</span> {m.channel}</div>
                          <div><span className="text-[#7A7A78]">author:</span> {m.author}</div>
                          {hasMetadata
                            ? Object.entries(m.metadata as Record<string, unknown>).map(([k, v]) => (
                              <div key={k}><span className="text-[#7A7A78]">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>
                            ))
                            : <div className="text-[#7A7A78] italic">No structured trace recorded for this message — Yinez state-capture lands in a future build.</div>}
                        </div>
                      )}
                      {m.flagged_for_review && m.flagged_reason && (
                        <div className="mt-1 ml-1 text-[11px] text-amber-400">⚑ {m.flagged_reason}</div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-[#E4E2DC] p-3 md:p-4 min-h-[140px] relative">
              {/* Templates picker — only meaningful for SMS / email composers */}
              {(thread.channel === 'sms' || thread.channel === 'email') && templates.length > 0 && (
                <div className="absolute right-4 top-2">
                  <button
                    onClick={() => setShowTemplates(s => !s)}
                    className="text-[11px] text-[#7A7A78] hover:text-[#1C1C1C]"
                  >
                    Templates ▾
                  </button>
                  {showTemplates && (
                    <div className="absolute right-0 top-5 w-64 bg-[#FFFFFF] border border-[#E4E2DC] rounded-md shadow-xl z-10 max-h-72 overflow-y-auto">
                      {templates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => {
                            setComposer(c => (c ? c + '\n\n' : '') + tpl.body)
                            setShowTemplates(false)
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-[#EFEFEC] border-b border-[#E4E2DC] last:border-b-0"
                        >
                          <div className="text-xs font-medium">{tpl.name}</div>
                          <div className="text-[11px] text-[#7A7A78] truncate">{tpl.body}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Fixed-height header row — keeps composer same size across channels */}
              <div className="h-9 mb-2">
                {thread.channel === 'email' && (
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={thread.subject ? `Re: ${thread.subject}` : 'Subject'}
                    className="w-full h-full bg-[#FFFFFF] border border-[#E4E2DC] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[#C8C5BC]"
                  />
                )}
                {thread.channel !== 'email' && (
                  <div className="h-full flex items-center text-[11px] text-[#7A7A78] px-1">
                    {thread.kind === 'channel'
                      ? `${thread.name || '#' + thread.slug}${thread.description ? ' · ' + thread.description : ''}`
                      : thread.channel === 'sms'
                        ? `SMS to ${thread.comhub_contacts?.phone || ''}`
                        : thread.channel === 'voice'
                          ? `Voice · use the Call button to dial`
                          : ''}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
                  }}
                  placeholder={
                    thread.kind === 'channel'
                      ? `Post to ${thread.name || '#' + thread.slug} (⌘+Enter to send)`
                      : thread.channel === 'voice'
                        ? `Add a note about this call (⌘+Enter to send)`
                        : `Reply via ${thread.channel.toUpperCase()} (⌘+Enter to send)`
                  }
                  rows={3}
                  className="flex-1 bg-[#FFFFFF] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C8C5BC]"
                />
                <button
                  onClick={handleSend}
                  disabled={!composer.trim() || sending}
                  className="self-stretch px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-[#FFFFFF] disabled:text-[#7A7A78] rounded-md text-sm font-medium"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Right: context panel — 320px on md+. On mobile, slides in as a fullscreen overlay when ⓘ is tapped. */}
      <aside className={`${mobileContextOpen ? 'fixed inset-0 z-40 w-full' : 'hidden'} md:!relative md:!inset-auto md:!flex md:!w-80 md:shrink-0 md:!z-auto border-l border-[#E4E2DC] overflow-y-auto bg-[#F4F4F1] flex-col`}>
        {mobileContextOpen && (
          <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-[#E4E2DC] sticky top-0 bg-[#F4F4F1] z-10">
            <span className="text-sm font-semibold">Client info</span>
            <button
              onClick={() => setMobileContextOpen(false)}
              className="px-3 py-1 text-[#3A3A3A] hover:text-[#1C1C1C] text-lg leading-none"
              aria-label="Close client info"
            >
              ✕
            </button>
          </div>
        )}
        {!thread && (
          <div className="p-6 text-sm text-[#7A7A78]">Select a thread.</div>
        )}
        {thread?.kind === 'channel' && (
          <ChannelInfoPanel thread={thread} />
        )}
        {thread?.kind === 'contact' && context && (
          <ContextPanelInline context={context} />
        )}
        {thread?.kind === 'contact' && !context && (
          <div className="p-6 text-sm text-[#7A7A78]">Loading contact details…</div>
        )}
      </aside>

      {showCompose && (
        <ComposeModal
          channel={composeChannel}
          setChannel={setComposeChannel}
          recipient={composeRecipient}
          setRecipient={setComposeRecipient}
          subject={composeSubject}
          setSubject={setComposeSubject}
          body={composeBody}
          setBody={setComposeBody}
          onClose={() => setShowCompose(false)}
          onSent={(threadId) => {
            setShowCompose(false)
            setComposeRecipient('')
            setComposeSubject('')
            setComposeBody('')
            fetchThreads()
            setSelected(threadId)
          }}
        />
      )}
      {showNewChannel && (
        <NewChannelModal
          onClose={() => setShowNewChannel(false)}
          onCreated={(threadId) => {
            setShowNewChannel(false)
            fetchChannels()
            setSelected(threadId)
          }}
        />
      )}
      {showYinez && (
        <YinezModal onClose={() => setShowYinez(false)} />
      )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose new thread (SMS or email)
// ─────────────────────────────────────────────────────────────────────────────
type RecipientResult = {
  role: 'client' | 'cleaner'
  id: string
  name: string | null
  phone: string | null
  email: string | null
  dns?: boolean
}

function ComposeModal(props: {
  channel: 'sms' | 'email' | 'call'
  setChannel: (c: 'sms' | 'email' | 'call') => void
  recipient: string
  setRecipient: (s: string) => void
  subject: string
  setSubject: (s: string) => void
  body: string
  setBody: (s: string) => void
  onClose: () => void
  onSent: (threadId: string) => void
}) {
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<RecipientResult[]>([])
  const [picked, setPicked] = useState<RecipientResult | null>(null)
  const [adminPhone, setAdminPhone] = useState('')

  // Persist admin's "ring me first" phone so they don't re-type it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('comhub_admin_phone') || ''
    if (saved) setAdminPhone(saved)
  }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (adminPhone.trim()) localStorage.setItem('comhub_admin_phone', adminPhone.trim())
  }, [adminPhone])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  // Live search clients/cleaners as the admin types a name.
  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); setSearched(false); return }
    let cancelled = false
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/comhub/search-recipients?q=${encodeURIComponent(search)}`)
        const d = await r.json().catch(() => ({ results: [] }))
        if (!cancelled) { setResults(d.results || []); setSearched(true) }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [search])

  const handleSend = async () => {
    if (sending) return
    if (props.channel === 'call') {
      if (!props.recipient.trim() || !adminPhone.trim()) return
    } else if (!props.recipient.trim() || !props.body.trim()) return
    setSending(true)
    try {
      if (props.channel === 'call') {
        const res = await fetch('/api/admin/comhub/voice/dial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: props.recipient.trim(),
            admin_phone: adminPhone.trim(),
          }),
        })
        const data = await res.json()
        if (!res.ok) alert('Dial failed: ' + (data.error || data.detail || res.status))
        else props.onSent(data.thread_id)
        return
      }
      const payload: Record<string, string> = {
        channel: props.channel,
        body: props.body,
      }
      if (props.channel === 'sms') payload.phone = props.recipient.trim()
      else { payload.email = props.recipient.trim(); if (props.subject.trim()) payload.subject = props.subject.trim() }
      const res = await fetch('/api/admin/comhub/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) alert('Send failed: ' + (data.error || res.status))
      else props.onSent(data.thread_id)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/60 flex items-center justify-center z-50" onClick={props.onClose}>
      <div className="bg-[#FFFFFF] border border-[#E4E2DC] rounded-lg w-[400px] max-w-full p-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">New conversation</h3>
          <button onClick={props.onClose} className="text-[#7A7A78] hover:text-[#1C1C1C]">✕</button>
        </div>
        <div className="flex gap-2 mb-3">
          {(['sms', 'email', 'call'] as const).map(c => (
            <button
              key={c}
              onClick={() => props.setChannel(c)}
              className={`px-3 py-1.5 rounded-md text-sm ${props.channel === c ? 'bg-blue-600 text-white' : 'bg-[#FFFFFF] text-[#7A7A78] hover:bg-[#F4F4F1]'}`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Search by client/cleaner name to auto-fill phone/email */}
        <label className="text-[10px] uppercase text-[#7A7A78] mb-1 block">Find by name</label>
        <div className="relative mb-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPicked(null) }}
            placeholder="Type a name to search clients + team…"
            className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#C8C5BC]"
          />
          {!picked && search.trim().length >= 2 && (searching || searched) && (
            <div className="absolute left-0 right-0 top-11 bg-[#FFFFFF] border border-[#E4E2DC] rounded-md shadow-xl z-10 max-h-60 overflow-y-auto">
              {searching && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-[#7A7A78]">Searching…</div>
              )}
              {!searching && searched && results.length === 0 && (
                <div className="px-3 py-2 text-xs text-[#7A7A78]">No matches in clients or team. Type the phone/email below.</div>
              )}
              {results.map(r => (
                <button
                  key={`${r.role}-${r.id}`}
                  onClick={async () => {
                    setPicked(r)
                    setSearch(r.name || '')
                    if (props.channel === 'sms' && r.phone) props.setRecipient(r.phone)
                    if (props.channel === 'email' && r.email) props.setRecipient(r.email)
                    if (props.channel === 'call' && r.phone) {
                      props.setRecipient(r.phone)
                      // Auto-dial if admin phone is already saved — otherwise wait for user.
                      if (adminPhone.trim()) {
                        const res = await fetch('/api/admin/comhub/voice/dial', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ phone: r.phone, admin_phone: adminPhone.trim() }),
                        })
                        const data = await res.json()
                        if (!res.ok) alert('Dial failed: ' + (data.error || data.detail || res.status))
                        else props.onSent(data.thread_id)
                      }
                    }
                    setResults([])
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#EFEFEC] border-b border-[#E4E2DC] last:border-b-0"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`text-[9px] uppercase px-1 rounded ${r.role === 'client' ? 'bg-blue-900 text-blue-200' : 'bg-emerald-900 text-emerald-200'}`}>{r.role}</span>
                    <span className="font-medium">{r.name || '(no name)'}</span>
                    {r.dns && <span className="text-[9px] uppercase px-1 rounded bg-red-900 text-red-200">DNS</span>}
                  </div>
                  <div className="text-[11px] text-[#7A7A78] truncate">{r.phone || ''} {r.phone && r.email ? '·' : ''} {r.email || ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {props.channel !== 'call' && (
          <>
            <label className="text-[10px] uppercase text-[#7A7A78] mb-1 block">
              {props.channel === 'email' ? 'Email' : 'Phone'}
            </label>
            <input
              value={props.recipient}
              onChange={(e) => props.setRecipient(e.target.value)}
              placeholder={props.channel === 'email' ? 'name@example.com' : '+1212...'}
              className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#C8C5BC]"
            />
            {props.channel === 'email' && (
              <input
                value={props.subject}
                onChange={(e) => props.setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#C8C5BC]"
              />
            )}
          </>
        )}
        {props.channel === 'call' ? (
          <Dialer
            recipient={props.recipient}
            setRecipient={props.setRecipient}
            adminPhone={adminPhone}
            setAdminPhone={setAdminPhone}
          />
        ) : (
          <textarea
            value={props.body}
            onChange={(e) => props.setBody(e.target.value)}
            placeholder="Message"
            rows={6}
            className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C8C5BC]"
          />
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={props.onClose} className="px-3 py-1.5 rounded-md text-sm border border-[#E4E2DC] hover:bg-[#EFEFEC]">Cancel</button>
          <button
            onClick={handleSend}
            disabled={
              !props.recipient.trim()
              || sending
              || (props.channel === 'call' ? !adminPhone.trim() : !props.body.trim())
            }
            className="px-4 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-[#FFFFFF] disabled:text-[#7A7A78]"
          >
            {sending ? '…' : props.channel === 'call' ? 'Call' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialer — phone-style keypad for outbound click-to-call
// ─────────────────────────────────────────────────────────────────────────────
function Dialer({ recipient, setRecipient, adminPhone, setAdminPhone }: {
  recipient: string
  setRecipient: (s: string) => void
  adminPhone: string
  setAdminPhone: (s: string) => void
}) {
  const formatPhone = (raw: string) => {
    const d = raw.replace(/\D/g, '')
    if (d.length === 0) return ''
    if (d.length <= 3) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    if (d.length <= 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    return `+${d.slice(0, d.length - 10)} (${d.slice(-10, -7)}) ${d.slice(-7, -4)}-${d.slice(-4)}`
  }

  const press = (k: string) => {
    const digits = recipient.replace(/\D/g, '')
    if (digits.length >= 14) return
    setRecipient(`+1${digits + k}`.replace(/^\+1$/, ''))
  }
  const backspace = () => {
    const digits = recipient.replace(/\D/g, '')
    if (digits.length === 0) return
    setRecipient(`+1${digits.slice(0, -1)}`.replace(/^\+1$/, ''))
  }

  const keys: Array<[string, string]> = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', ''],
  ]

  return (
    <div className="bg-[#F4F4F1] border border-[#E4E2DC] rounded-lg p-3">
      {/* Number display */}
      <div className="text-center mb-2">
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="(555) 555-5555"
          className="w-full bg-transparent text-center text-lg font-light tracking-wide focus:outline-none"
          aria-label="Phone number"
        />
        {recipient && (
          <div className="text-[10px] text-[#7A7A78] mt-0.5">{formatPhone(recipient)}</div>
        )}
      </div>

      {/* Keypad — compact 3 cols, fixed-height keys */}
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map(([digit, letters]) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(digit)}
            className="h-11 bg-[#FFFFFF] hover:bg-[#EFEFEC] active:bg-[#F4F4F1] rounded-full flex flex-col items-center justify-center transition select-none"
          >
            <div className="text-base font-medium leading-none">{digit}</div>
            {letters && <div className="text-[8px] tracking-widest text-[#7A7A78] mt-0.5">{letters}</div>}
          </button>
        ))}
      </div>

      <div className="flex justify-center mt-2">
        <button
          type="button"
          onClick={backspace}
          disabled={!recipient}
          className="text-[11px] text-[#7A7A78] hover:text-[#1C1C1C] disabled:text-[#B5B2AC] px-3 py-1"
        >
          ⌫ Backspace
        </button>
      </div>

      {/* Admin's "ring me first" phone — saved to localStorage */}
      <div className="border-t border-[#E4E2DC] mt-2 pt-2">
        <label className="text-[10px] uppercase text-[#7A7A78] mb-1 block">Your phone (we ring you first)</label>
        <input
          value={adminPhone}
          onChange={(e) => setAdminPhone(e.target.value)}
          placeholder="+1212..."
          className="w-full bg-[#FFFFFF] border border-[#E4E2DC] rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-[#C8C5BC]"
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline chat with Yinez (replaces the Telegram owner channel)
// ─────────────────────────────────────────────────────────────────────────────
function YinezModal({ onClose }: { onClose: () => void }) {
  const [history, setHistory] = useState<Array<{ role: 'admin' | 'yinez'; body: string; at: string }>>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history.length])

  const send = async () => {
    if (!input.trim() || sending) return
    const prompt = input
    setHistory(h => [...h, { role: 'admin', body: prompt, at: new Date().toISOString() }])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/admin/comhub/yinez/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: prompt }),
      })
      const data = await res.json()
      if (!res.ok) {
        setHistory(h => [...h, { role: 'yinez', body: '[error: ' + (data.error || res.status) + ']', at: new Date().toISOString() }])
      } else {
        setHistory(h => [...h, { role: 'yinez', body: data.reply || '[empty]', at: new Date().toISOString() }])
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#FFFFFF] border border-[#E4E2DC] rounded-lg w-[640px] max-w-full h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-[#E4E2DC] flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">✦ Yinez</h3>
            <div className="text-xs text-[#7A7A78]">Owner channel — terse, can teach via remember/create_skill</div>
          </div>
          <button onClick={onClose} className="text-[#7A7A78] hover:text-[#1C1C1C]">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {history.length === 0 && <div className="text-[#7A7A78] text-sm">Say something to Yinez…</div>}
          {history.map((m, i) => {
            const isAdmin = m.role === 'admin'
            return (
              <div key={i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isAdmin ? 'bg-blue-600' : 'bg-purple-700'}`}>
                  <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <div className="border-t border-[#E4E2DC] p-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
            placeholder="Ask Yinez (⌘+Enter to send)"
            rows={2}
            className="flex-1 bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C8C5BC]"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:bg-[#FFFFFF] rounded-md text-sm font-medium"
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Right-side panel: contact + linked client/cleaner + recent bookings
// ─────────────────────────────────────────────────────────────────────────────
// Inline version — renders contents only (parent <aside> wraps).
function ContextPanelInline({ context }: { context: ContactContext }) {
  const { contact, client, cleaner, recent_bookings, total_bookings, total_spent_cents, outstanding_cents } = context
  const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
    } catch { return iso }
  }
  const fmtPhone = (p: string | null | undefined) => {
    if (!p) return ''
    const d = p.replace(/\D/g, '').slice(-10)
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p
  }
  const cleanerName = (b: Booking): string => {
    if (!b.team_members) return '—'
    const c = Array.isArray(b.team_members) ? b.team_members[0] : b.team_members
    return c?.name || '—'
  }
  const role: 'client' | 'cleaner' | 'unlinked' = client ? 'client' : cleaner ? 'cleaner' : 'unlinked'

  return (
    <div>
      <div className="p-4 border-b border-[#E4E2DC]">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
            role === 'client' ? 'bg-blue-900 text-blue-200'
            : role === 'cleaner' ? 'bg-emerald-900 text-emerald-200'
            : 'bg-[#FFFFFF] text-[#7A7A78]'
          }`}>{role}</span>
          {client?.do_not_service && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-900 text-red-200">DNS</span>
          )}
          {client?.active === false && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFFFFF] text-[#7A7A78]">Inactive</span>
          )}
          {cleaner?.active === false && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFFFFF] text-[#7A7A78]">Inactive</span>
          )}
        </div>
        <h3 className="font-semibold mt-2">{contact.name || client?.name || cleaner?.name || 'Unknown'}</h3>
        <div className="text-xs text-[#7A7A78] mt-1 space-y-0.5">
          {contact.phone && <div>{fmtPhone(contact.phone)}</div>}
          {contact.email && <div className="truncate">{contact.email}</div>}
        </div>
      </div>

      {client && (
        <div className="p-4 border-b border-[#E4E2DC] space-y-2 text-sm">
          {(client.address || client.address_line1) && (
            <div>
              <div className="text-[10px] uppercase text-[#7A7A78]">Address</div>
              <div className="text-[#3A3A3A]">{client.address || client.address_line1}</div>
            </div>
          )}
          {(client.pet_name || client.pet_type) && (
            <div>
              <div className="text-[10px] uppercase text-[#7A7A78]">Pets</div>
              <div className="text-[#3A3A3A]">{[client.pet_name, client.pet_type].filter(Boolean).join(' · ')}</div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <a
              href={`/admin/clients?id=${client.id}`}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View client →
            </a>
          </div>
        </div>
      )}

      {client && (
        <NotesEditor
          contactId={contact.id}
          initialPrivate={client.notes_private || ''}
          initialPublic={client.notes_public || ''}
        />
      )}

      {cleaner && (
        <div className="p-4 border-b border-[#E4E2DC] space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#7A7A78] text-xs">Hourly rate</span>
            <span>${cleaner.hourly_rate ?? '—'}</span>
          </div>
          {typeof cleaner.avg_rating === 'number' && cleaner.rating_count ? (
            <div className="flex justify-between">
              <span className="text-[#7A7A78] text-xs">Rating</span>
              <span>★ {cleaner.avg_rating.toFixed(2)} ({cleaner.rating_count})</span>
            </div>
          ) : null}
          <a
            href={`/admin/cleaners?id=${cleaner.id}`}
            className="text-xs text-blue-400 hover:text-blue-300 inline-block pt-1"
          >
            View team member →
          </a>
        </div>
      )}

      {client && (
        <div className="p-4 border-b border-[#E4E2DC] grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-[10px] uppercase text-[#7A7A78]">Total bookings</div>
            <div className="text-[#1C1C1C]">{total_bookings}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-[#7A7A78]">Lifetime spent</div>
            <div className="text-[#1C1C1C]">{fmtMoney(total_spent_cents)}</div>
          </div>
          {outstanding_cents > 0 && (
            <div className="col-span-2">
              <div className="text-[10px] uppercase text-amber-500">Outstanding</div>
              <div className="text-amber-300 font-medium">{fmtMoney(outstanding_cents)}</div>
            </div>
          )}
        </div>
      )}

      {recent_bookings.length > 0 && (
        <div className="p-4 space-y-2">
          <div className="text-[10px] uppercase text-[#7A7A78] mb-1">Recent bookings</div>
          {recent_bookings.map(b => (
            <a
              key={b.id}
              href={`/admin/bookings?id=${b.id}`}
              className="block p-2 rounded border border-[#E4E2DC] hover:border-[#C8C5BC] hover:bg-[#F4F4F1] text-sm"
            >
              <div className="flex justify-between items-baseline">
                <span className="font-medium">{fmtDate(b.start_time)}</span>
                <span className="text-xs text-[#7A7A78]">{b.status || '—'}</span>
              </div>
              <div className="text-xs text-[#7A7A78] mt-0.5">
                {b.service_type || 'Cleaning'} · {b.price != null ? `$${(b.price / 100).toFixed(2)}` : '?'}
                {b.payment_status && b.payment_status !== 'paid' && (
                  <span className="text-amber-400 ml-1">({b.payment_status})</span>
                )}
              </div>
              <div className="text-[11px] text-[#7A7A78] mt-0.5">{cleanerName(b)}</div>
            </a>
          ))}
        </div>
      )}

      {role === 'unlinked' && (
        <div className="p-4 text-sm text-[#7A7A78]">
          Not yet linked to a client or team member. Once they book or get hired, this panel will populate.
        </div>
      )}
    </div>
  )
}

// Right-panel content for an internal channel.
function ChannelInfoPanel({ thread }: { thread: Thread }) {
  return (
    <div>
      <div className="p-4 border-b border-[#E4E2DC]">
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFFFFF] text-[#7A7A78]">
          Channel
        </span>
        <h3 className="font-semibold mt-2">{thread.name || `#${thread.slug}`}</h3>
        {thread.description && (
          <div className="text-xs text-[#7A7A78] mt-1">{thread.description}</div>
        )}
      </div>
      <div className="p-4 border-b border-[#E4E2DC] text-sm space-y-2">
        <div>
          <div className="text-[10px] uppercase text-[#7A7A78]">Created</div>
          <div className="text-[#3A3A3A] text-xs">
            {(() => { try { return new Date(thread.created_at).toLocaleString() } catch { return '' } })()}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-[#7A7A78]">Members</div>
          <div className="text-[#7A7A78] text-xs">All admins (public channel)</div>
        </div>
      </div>
      <div className="p-4 text-xs text-[#7A7A78]">
        Use this channel for team posts. <code className="text-[#3A3A3A]">@here</code> pings everyone, <code className="text-[#3A3A3A]">@firstname</code> pings one person.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline editor for the linked client's private + public notes
// ─────────────────────────────────────────────────────────────────────────────
function NotesEditor({ contactId, initialPrivate, initialPublic }: {
  contactId: string
  initialPrivate: string
  initialPublic: string
}) {
  const [priv, setPriv] = useState(initialPrivate)
  const [pub, setPub] = useState(initialPublic)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If the panel is re-rendered with a new contact, reset.
  useEffect(() => { setPriv(initialPrivate); setPub(initialPublic); setError(null) }, [initialPrivate, initialPublic, contactId])

  const dirty = priv !== initialPrivate || pub !== initialPublic

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/comhub/contacts/${contactId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_private: priv || null, notes_public: pub || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `HTTP ${res.status}`)
      } else {
        setSavedAt(Date.now())
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 border-b border-[#E4E2DC] space-y-3 text-sm">
      <div>
        <div className="text-[10px] uppercase text-[#7A7A78] mb-1">Private notes (admin only)</div>
        <textarea
          value={priv}
          onChange={(e) => setPriv(e.target.value)}
          placeholder="Internal notes — never shown to the client"
          rows={3}
          className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-[#C8C5BC]"
        />
      </div>
      <div>
        <div className="text-[10px] uppercase text-[#7A7A78] mb-1 flex items-center gap-1">
          <span>Public notes</span>
          <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1 rounded">visible to client</span>
        </div>
        <textarea
          value={pub}
          onChange={(e) => setPub(e.target.value)}
          placeholder="Notes the client sees in their portal"
          rows={3}
          className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-[#C8C5BC]"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[#7A7A78]">
          {error ? <span className="text-red-400">{error}</span>
            : saving ? 'Saving…'
            : savedAt && !dirty ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : dirty ? 'Unsaved changes' : ''}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-3 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-[#FFFFFF] disabled:text-[#7A7A78]"
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Create-channel modal
// ─────────────────────────────────────────────────────────────────────────────
function NewChannelModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (threadId: string) => void
}) {
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    if (!slug.trim() || creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/comhub/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim(), description: description.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
      } else {
        onCreated(data.channel.id)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#F4F4F1]/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#FFFFFF] border border-[#E4E2DC] rounded-lg w-[480px] max-w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">New channel</h3>
          <button onClick={onClose} className="text-[#7A7A78] hover:text-[#1C1C1C]">✕</button>
        </div>
        <label className="text-[10px] uppercase text-[#7A7A78] mb-1 block">Slug (no spaces)</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. dispatch, marketing, oncall"
          className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#C8C5BC]"
        />
        <label className="text-[10px] uppercase text-[#7A7A78] mb-1 block">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this channel for?"
          rows={3}
          className="w-full bg-[#F4F4F1] border border-[#E4E2DC] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C8C5BC]"
        />
        {error && <div className="text-red-400 text-xs mt-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sm border border-[#E4E2DC] hover:bg-[#EFEFEC]">Cancel</button>
          <button
            onClick={create}
            disabled={!slug.trim() || creating}
            className="px-4 py-1.5 rounded-md text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-[#FFFFFF] disabled:text-[#7A7A78]"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
