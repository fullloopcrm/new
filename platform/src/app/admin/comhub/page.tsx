'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { formatPhone } from '@/lib/format'
import ComhubSettings from './comhub-settings'

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

type ContactTag = 'client' | 'team' | 'lead' | 'potential_lead' | 'spam' | 'vendor' | 'other'

type Contact = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  client_id: string | null
  team_member_id: string | null
  tag: ContactTag | null
}

const CONTACT_TAG_LABELS: Record<ContactTag, string> = {
  client: 'Client',
  team: 'Team',
  lead: 'Lead',
  potential_lead: 'Potential',
  spam: 'Spam',
  vendor: 'Vendor',
  other: 'Other',
}

// A manual tag is a standing correction — once set, it drives the badge
// everywhere this contact shows up (sidebar + panel) instead of the
// linkage-derived guess, for every future message from them too, since the
// tag lives on the comhub_contacts row (one row per phone/email) rather than
// per-message.
const CONTACT_TAG_BADGE_STYLE: Record<ContactTag, { background: string; color: string; border: string }> = {
  client: { background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.25)' },
  team: { background: 'rgba(4,120,87,0.08)', color: 'var(--color-loop-good)', border: '1px solid rgba(4,120,87,0.25)' },
  lead: { background: 'rgba(126,58,242,0.08)', color: '#6d28d9', border: '1px solid rgba(126,58,242,0.25)' },
  potential_lead: { background: 'rgba(126,58,242,0.08)', color: '#6d28d9', border: '1px solid rgba(126,58,242,0.25)' },
  spam: { background: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)' },
  vendor: { background: 'rgba(4,120,87,0.08)', color: 'var(--color-loop-good)', border: '1px solid rgba(4,120,87,0.25)' },
  other: { background: 'var(--color-loop-canvas)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)' },
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
  detected_language: string | null
  translated_body: string | null
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
  cleaners: { name: string } | { name: string }[] | null
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
  pin: string | null
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
  address: string | null
  pin: string | null
  active: boolean | null
  pay_rate: number | null
  avg_rating: number | null
  rating_count: number | null
}
type ApplicantRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  status: string | null
  experience: string | null
  created_at: string
}
type ContactContext = {
  contact: Contact
  client: ClientRow | null
  cleaner: CleanerRow | null
  applicant: ApplicantRow | null
  recent_bookings: Booking[]
  total_bookings: number
  total_spent_cents: number
  outstanding_cents: number
  cleaner_bookings: Booking[]
  cleaner_total_earnings_cents: number
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
// Full, unambiguous date + time for a single message — unlike fmtTime (which
// drops the date for today's messages and drops the time for older ones),
// this always shows both so a message's exact send time is never ambiguous.
const fmtExactTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })
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
  // This component renders under two different layouts: /dashboard/comhub
  // (dashboard-shell, which provides PageSettingsOpenProvider) and
  // /admin/comhub (platform-admin layout, which does not). ComhubSettings
  // depends on that provider, so it can only mount on the dashboard route.
  const pathname = usePathname()
  const settingsPanelAvailable = pathname?.startsWith('/dashboard') ?? false

  const [threads, setThreads] = useState<Thread[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const [channels, setChannels] = useState<Thread[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [mobileContextOpen, setMobileContextOpen] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [authors, setAuthors] = useState<AuthorMap>({})
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAway, setShowAway] = useState(false)
  const [explainOpen, setExplainOpen] = useState<Record<string, boolean>>({})
  const [composer, setComposer] = useState('')
  const [subject, setSubject] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [channel, setChannel] = useState<'all' | 'sms' | 'web' | 'email' | 'voice' | 'admin'>('all')
  const [q, setQ] = useState('')

  const comhubPrefs = useUserPrefs('comhub', { default_filter: 'all', default_channel: 'all' })
  useEffect(() => {
    if (!comhubPrefs.loaded) return
    setFilter(comhubPrefs.prefs.default_filter as Filter)
    setChannel(comhubPrefs.prefs.default_channel as 'all' | 'sms' | 'web' | 'email' | 'voice' | 'admin')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comhubPrefs.loaded])
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

  // Deep-link support: the top-drop live-alert popup's "Open in ComHub" link
  // lands here with ?thread=<id> so the operator sees the conversation they
  // clicked, not just the top of the inbox. Read once via window.location
  // (not useSearchParams) so this page doesn't need a Suspense boundary.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('thread')
    if (id) setSelected(id)
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

  const toggleSelected = (contactId: string) => {
    setSelectedContactIds(s => {
      const next = new Set(s)
      if (next.has(contactId)) next.delete(contactId)
      else next.add(contactId)
      return next
    })
  }

  const bulkDelete = async () => {
    if (selectedContactIds.size === 0 || bulkWorking) return
    if (!window.confirm(`Delete ${selectedContactIds.size} contact${selectedContactIds.size > 1 ? 's' : ''} from ComHub? This removes their conversation from the inbox.`)) return
    setBulkWorking(true)
    try {
      const contact_ids = Array.from(selectedContactIds)
      const res = await fetch('/api/admin/comhub/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', contact_ids }),
      })
      if (res.ok) {
        if (thread && thread.comhub_contacts && contact_ids.includes(thread.comhub_contacts.id)) {
          setSelected(null)
        }
        setSelectedContactIds(new Set())
        await fetchThreads()
      } else {
        const data = await res.json().catch(() => ({}))
        alert('Delete failed: ' + (data.error || res.status))
      }
    } finally {
      setBulkWorking(false)
    }
  }

  const bulkTag = async (tag: ContactTag | null) => {
    if (selectedContactIds.size === 0 || bulkWorking) return
    setBulkWorking(true)
    try {
      const res = await fetch('/api/admin/comhub/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tag', contact_ids: Array.from(selectedContactIds), tag }),
      })
      if (res.ok) {
        setSelectedContactIds(new Set())
        await fetchThreads()
      } else {
        const data = await res.json().catch(() => ({}))
        alert('Tag update failed: ' + (data.error || res.status))
      }
    } finally {
      setBulkWorking(false)
    }
  }

  const totalUnread = useMemo(() => threads.reduce((a, t) => a + (t.unread_count || 0), 0), [threads])
  // Away/off-hours presets are just templates tagged hotkey:'away' — kept out
  // of the regular Templates picker so the two lists don't blend together.
  const awayTemplates = useMemo(() => templates.filter(t => t.hotkey === 'away'), [templates])
  const regularTemplates = useMemo(() => templates.filter(t => t.hotkey !== 'away'), [templates])

  return (
    <div className="comhub-loop flex flex-col h-full bg-[var(--color-loop-bg)] text-[var(--color-loop-ink)]">
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
      <aside className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] md:shrink-0 border-r border-[var(--color-loop-line-soft)] flex-col bg-[var(--color-loop-bg)]`}>
        <div className="p-5 border-b border-[var(--color-loop-line-soft)]">
          {/* No repeated "Comhub." headline here — the dashboard shell already
              renders that masthead once above this column; a second one read
              as duplicated chrome. */}
          {totalUnread > 0 && (
            <div className="flex justify-end mb-3">
              <span className="text-xs rounded-full px-2 py-0.5" style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)', fontFamily: 'var(--mono)' }}>{totalUnread} unread</span>
            </div>
          )}
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('comhub:focus'))
              }}
              className="flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors"
              style={{ fontFamily: 'var(--mono)', letterSpacing: '0.04em', background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
            >
              Call
            </button>
            <button
              onClick={() => { setComposeChannel('sms'); setShowCompose(true) }}
              className="flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors hover:bg-[var(--color-loop-line-soft)]"
              style={{ fontFamily: 'var(--mono)', letterSpacing: '0.04em', background: 'var(--color-loop-canvas)', color: 'var(--color-loop-ink)', border: '1px solid var(--color-loop-line)' }}
            >
              Text
            </button>
            <button
              onClick={() => { setComposeChannel('email'); setShowCompose(true) }}
              className="flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors hover:bg-[var(--color-loop-line-soft)]"
              style={{ fontFamily: 'var(--mono)', letterSpacing: '0.04em', background: 'var(--color-loop-canvas)', color: 'var(--color-loop-ink)', border: '1px solid var(--color-loop-line)' }}
            >
              Email
            </button>
            <button
              onClick={() => setShowYinez(true)}
              className="hidden md:inline-flex items-center justify-center px-2.5 py-2 rounded-md text-sm transition-colors hover:bg-[var(--color-loop-line-soft)]"
              style={{ background: 'var(--color-loop-canvas)', color: 'var(--color-loop-ink)', border: '1px solid var(--color-loop-line)' }}
              title="Chat with Assistant"
            >
              ✦
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search threads…"
            className="w-full bg-[var(--color-loop-canvas)] border border-[var(--color-loop-line-soft)] rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-loop-line)]"
          />
          <div className="flex gap-1 mt-3 text-xs" style={{ fontFamily: 'var(--mono)' }}>
            {(['all', 'unread', 'unresponded'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-full transition-colors"
                style={filter === f
                  ? { background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }
                  : { background: 'var(--color-loop-canvas)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)' }}
              >
                {f === 'all' ? 'Open' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2.5 mt-3 text-[10px] flex-wrap" style={{ fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
            {(['all', 'sms', 'web', 'email', 'voice', 'admin'] as const).map(c => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className="pb-0.5 uppercase transition-colors"
                style={channel === c
                  ? { color: 'var(--color-loop-ink)', fontWeight: 600, borderBottom: '1px solid var(--color-loop-ink)' }
                  : { color: 'var(--color-loop-muted-2)', borderBottom: '1px solid transparent' }}
              >
                {c === 'admin' ? 'Auto-reply' : c}
              </button>
            ))}
          </div>
        </div>
        {/* Channels — collapsible dropdown. Collapsed by default so Messages list gets the height. */}
        <div className="border-b border-[var(--color-loop-line-soft)] shrink-0">
          <div className="flex justify-between items-center px-5 pt-3 pb-1">
            <button
              onClick={() => setChannelsOpen(v => !v)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--color-loop-muted)] hover:text-[var(--color-loop-ink)]"
              style={{ fontFamily: 'var(--mono)' }}
              aria-expanded={channelsOpen}
            >
              <span className="inline-block transition-transform" style={{ transform: channelsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▸</span>
              Channels {channels.length > 0 && <span className="text-[var(--color-loop-muted)]">({channels.length})</span>}
            </button>
            <button
              onClick={() => setShowNewChannel(true)}
              className="text-[11px] text-[var(--color-loop-muted)] hover:text-[var(--color-loop-ink)]"
              style={{ fontFamily: 'var(--mono)' }}
              title="Create channel"
            >+ New</button>
          </div>
          {channelsOpen && (
            <div className="max-h-56 overflow-y-auto pb-1">
              {channels.length === 0 && (
                <div className="px-5 pb-3 text-xs text-[var(--color-loop-muted)]">No channels.</div>
              )}
              {channels.map(t => {
                const isSel = selected === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t.id)}
                    className="w-full text-left px-5 py-2 hover:bg-[var(--color-loop-line-soft)]/40 transition"
                    style={isSel ? { background: 'var(--color-loop-canvas)' } : undefined}
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="font-medium truncate text-sm">{t.name || `#${t.slug}`}</div>
                      <div className="text-[10px] text-[var(--color-loop-muted)] shrink-0" style={{ fontFamily: 'var(--mono)' }}>{fmtTime(t.last_message_at)}</div>
                    </div>
                    {t.last_message_preview && (
                      <div className="text-[11px] text-[var(--color-loop-muted)] truncate mt-0.5">{t.last_message_preview}</div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Messages — inbound from clients/cleaners/referrers via SMS, email, portal */}
          <div className="px-5 pt-3 pb-1.5 flex items-center justify-between sticky top-0 bg-[var(--color-loop-bg)] z-10">
            {selectedContactIds.size === 0 ? (
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-loop-muted)]" style={{ fontFamily: 'var(--mono)', fontWeight: 600, letterSpacing: '0.14em' }}>Messages</div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap w-full" style={{ fontFamily: 'var(--mono)' }}>
                <span className="text-[11px]" style={{ color: 'var(--color-loop-muted)' }}>{selectedContactIds.size} selected</span>
                <select
                  disabled={bulkWorking}
                  defaultValue=""
                  onChange={(e) => { const v = e.target.value; if (v) bulkTag(v as ContactTag); e.target.value = '' }}
                  className="px-1.5 py-0.5 rounded text-[11px] border cursor-pointer"
                  style={{ background: 'var(--color-loop-canvas)', color: 'var(--color-loop-graphite)', borderColor: 'var(--color-loop-line-soft)' }}
                >
                  <option value="">Tag as…</option>
                  {Object.entries(CONTACT_TAG_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={bulkDelete}
                  disabled={bulkWorking}
                  className="px-2 py-0.5 rounded text-[11px] disabled:opacity-50"
                  style={{ background: 'rgba(220,38,38,0.08)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.25)' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedContactIds(new Set())}
                  className="text-[11px] hover:text-[var(--color-loop-ink)]"
                  style={{ color: 'var(--color-loop-muted)' }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          {loadingList && <div className="p-5 text-sm text-[var(--color-loop-muted)]">Loading…</div>}
          {!loadingList && threads.length === 0 && (
            <div className="p-5 text-sm text-[var(--color-loop-muted)]">No threads.</div>
          )}
          {threads.map(t => {
            const isSel = selected === t.id
            const c = t.comhub_contacts
            // Team-member linkage wins over client — see context/route.ts comment.
            const role: 'client' | 'cleaner' | 'unlinked' = c?.team_member_id ? 'cleaner' : c?.client_id ? 'client' : 'unlinked'
            const roleBadgeStyle = c?.tag
              ? CONTACT_TAG_BADGE_STYLE[c.tag]
              : role === 'client'
                ? { background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.25)' }
                : role === 'cleaner'
                  ? { background: 'rgba(4,120,87,0.08)', color: 'var(--color-loop-good)', border: '1px solid rgba(4,120,87,0.25)' }
                  : { background: 'var(--color-loop-canvas)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)' }
            // Left accent bar: red = needs a reply, ink = has unread, else quiet gray hairline.
            const accent = t.disposition === 'waiting_admin'
              ? 'var(--color-loop-warn)'
              : t.unread_count > 0
                ? 'var(--color-loop-ink)'
                : 'var(--color-loop-line-soft)'
            return (
              <div
                key={t.id}
                className="w-full flex gap-2 items-stretch border-b border-[var(--color-loop-line-soft)] hover:bg-[var(--color-loop-canvas)] transition"
                style={isSel ? { background: 'var(--color-loop-canvas)' } : undefined}
              >
                {c && (
                  <label className="flex items-center pl-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                      className="h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>
                )}
              <button
                onClick={() => setSelected(t.id)}
                className={`flex-1 text-left ${c ? 'pl-2' : 'pl-4'} pr-5 py-3 flex gap-3 min-w-0`}
              >
                <span style={{ width: 3, alignSelf: 'stretch', background: accent, borderRadius: 2, flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="font-medium truncate flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-sm shrink-0" style={{ ...roleBadgeStyle, fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        {c?.tag ? CONTACT_TAG_LABELS[c.tag] : role === 'unlinked' ? 'Potential Lead' : role === 'cleaner' ? 'team' : role}
                      </span>
                      <span className="truncate">{contactDisplay(c)}</span>
                    </div>
                    <div className="text-xs text-[var(--color-loop-muted)] shrink-0" style={{ fontFamily: 'var(--mono)' }}>{fmtTime(t.last_message_at)}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase text-[var(--color-loop-muted-2)]" style={{ fontFamily: 'var(--mono)', letterSpacing: '0.06em' }}>{t.channel}</span>
                    {t.unread_count > 0 && (
                      <span className="text-[10px] rounded-full px-1.5" style={{ background: 'var(--color-loop-warn)', color: 'var(--color-loop-canvas)', fontFamily: 'var(--mono)' }}>{t.unread_count}</span>
                    )}
                    <div className="text-xs text-[var(--color-loop-muted)] truncate">{t.last_message_preview || '—'}</div>
                  </div>
                </div>
              </button>
              </div>
            )
          })}

        </div>
      </aside>

      {/* Center: conversation — hidden on mobile when no thread is selected. */}
      <main className={`${selected ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 overflow-hidden bg-[var(--color-loop-canvas)]`}>
        {!thread && (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-2">
            <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontStyle: 'italic', color: 'var(--color-loop-muted-2)' }}>Select a conversation</div>
            <div className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Threads, channels &amp; calls live on the left</div>
          </div>
        )}
        {thread && (
          <>
            <header className="px-3 md:px-6 py-3 border-b border-[var(--color-loop-line-soft)] flex items-center justify-between gap-2">
              {/* Mobile back button — returns to thread list */}
              <button
                onClick={() => { setSelected(null); setMobileContextOpen(false) }}
                className="md:hidden shrink-0 px-2 py-1 text-[var(--color-loop-graphite)] hover:text-[var(--color-loop-ink)] text-lg leading-none"
                aria-label="Back to thread list"
              >
                ←
              </button>
              {/* Mobile info button — opens context panel as an overlay */}
              {thread.kind === 'contact' && (
                <button
                  onClick={() => setMobileContextOpen(true)}
                  className="md:hidden shrink-0 px-2 py-1 text-[var(--color-loop-graphite)] hover:text-[var(--color-loop-ink)] text-sm leading-none"
                  aria-label="Open client info"
                  title="Client info"
                >
                  ⓘ
                </button>
              )}
              <div className="min-w-[110px] flex-1 mr-1 md:mr-3">
                <div className="truncate text-sm md:text-base" style={{ fontFamily: 'var(--display)', fontWeight: 500 }}>{threadTitle(thread)}</div>
                <div className="text-xs truncate" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
                  {thread.kind === 'channel'
                    ? (thread.description || 'Internal channel')
                    : `${thread.channel.toUpperCase()} · ${thread.comhub_contacts?.phone || thread.comhub_contacts?.email || ''}`}
                </div>
              </div>
              <div className="flex flex-nowrap gap-1.5 text-sm shrink-0 items-center overflow-x-auto" style={{ fontFamily: 'var(--mono)' }}>
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
                      className="px-2.5 py-1 rounded text-xs whitespace-nowrap"
                      style={{ background: 'rgba(126,58,242,0.10)', color: '#6d28d9', border: '1px solid rgba(126,58,242,0.25)' }}
                      title="Resume auto-reply on this thread"
                    >
                      Hand back to auto-reply
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
                      className="px-2.5 py-1 rounded text-xs whitespace-nowrap"
                      style={{ background: 'rgba(139,69,19,0.10)', color: 'var(--color-loop-warn)', border: '1px solid rgba(139,69,19,0.25)' }}
                      title="Pause auto-reply on this thread until you hand it back"
                    >
                      Take over (auto-reply off)
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
                    className="px-2 py-1 rounded text-xs border cursor-pointer max-w-[110px] shrink"
                    style={{ background: 'var(--color-loop-bg)', color: 'var(--color-loop-graphite)', borderColor: 'var(--color-loop-line-soft)' }}
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
                    className="px-2.5 py-1 rounded text-xs whitespace-nowrap"
                    style={{ background: 'var(--color-loop-good)', color: 'var(--color-loop-canvas)' }}
                  >
                    Call
                  </button>
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
                  className="px-2.5 py-1 rounded text-xs whitespace-nowrap border"
                  style={{ background: 'var(--color-loop-bg)', color: 'var(--color-loop-graphite)', borderColor: 'var(--color-loop-line-soft)' }}
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
                  : (m.author === 'admin' ? 'Admin' : m.author === 'yinez' ? 'Auto-reply' : m.author)
                const hasMetadata = m.metadata && Object.keys(m.metadata).length > 0
                const explainShown = !!explainOpen[m.id]
                // Which of the tenant's own DIDs this SMS came in on / went out
                // from — the customer's own number is already shown via the
                // thread header, so only the business-side number is useful here.
                const tenantDid = m.channel === 'sms' ? (isOut ? m.from_address : m.to_address) : null
                return (
                  <div key={m.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'} group`}>
                    <div className="max-w-[85%] md:max-w-[70%] min-w-0">
                      <div
                        className={`rounded-2xl px-4 py-2 break-words overflow-hidden relative ${m.flagged_for_review ? 'ring-2 ring-[var(--color-loop-warn)]' : ''}`}
                        style={
                          isOut
                            ? (isAuto
                              ? { background: '#6d28d9', color: '#fff' }
                              : { background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' })
                            : { background: 'var(--color-loop-bg)', color: 'var(--color-loop-ink)', border: '1px solid var(--color-loop-line-soft)' }
                        }
                      >
                        {m.subject && <div className="font-medium text-sm mb-1 break-words">{m.subject}</div>}
                        <div className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{renderWithMentions(m.body || '')}</div>
                        {m.translated_body && (
                          <div
                            className="mt-1.5 pt-1.5 text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] italic"
                            style={{ borderTop: `1px solid ${isOut ? 'rgba(255,255,255,0.25)' : 'var(--color-loop-line-soft)'}`, opacity: 0.85 }}
                          >
                            <span className="not-italic text-[11px] uppercase tracking-wide opacity-70 mr-1.5">
                              {m.detected_language || 'Translated'} → English
                            </span>
                            {m.translated_body}
                          </div>
                        )}
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
                      <div className="text-[10px] mt-1 px-1 flex gap-2 items-center" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
                        <span>{authorName}{isAuto ? ' · auto' : ''}</span>
                        <span title={fmtExactTime(m.sent_at)}>{fmtExactTime(m.sent_at)}</span>
                        {tenantDid && <span title="Which of your numbers this text used">via {formatPhone(tenantDid)}</span>}
                        {isAuto && (
                          <button
                            onClick={() => setExplainOpen(s => ({ ...s, [m.id]: !s[m.id] }))}
                            className="hover:text-[var(--color-loop-ink)] underline-offset-2 hover:underline"
                            title="Why did auto-reply say that?"
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
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={m.flagged_for_review ? { color: 'var(--color-loop-warn)', opacity: 1 } : undefined}
                          title={m.flagged_for_review ? 'Unflag' : 'Flag for review'}
                        >
                          {m.flagged_for_review ? '🚩 flagged' : '🚩'}
                        </button>
                      </div>
                      {explainShown && isAuto && (
                        <div className="mt-1 ml-1 px-3 py-2 rounded space-y-0.5 text-[11px]" style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)', color: 'var(--color-loop-muted)' }}>
                          <div><span className="text-[var(--color-loop-muted)]">channel:</span> {m.channel}</div>
                          <div><span className="text-[var(--color-loop-muted)]">author:</span> {m.author}</div>
                          {hasMetadata
                            ? Object.entries(m.metadata as Record<string, unknown>).map(([k, v]) => (
                              <div key={k}><span className="text-[var(--color-loop-muted)]">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}</div>
                            ))
                            : <div className="italic">No structured trace recorded for this message — auto-reply state-capture lands in a future build.</div>}
                        </div>
                      )}
                      {m.flagged_for_review && m.flagged_reason && (
                        <div className="mt-1 ml-1 text-[11px]" style={{ color: 'var(--color-loop-warn)' }}>⚑ {m.flagged_reason}</div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-[var(--color-loop-line-soft)] p-3 md:p-4" style={{ background: 'var(--color-loop-bg)' }}>
              {/* Fixed-height header row — keeps composer same size across channels.
                  Templates lives inline here (not floated) so it can't overlap the
                  reply box or the thread meta text. */}
              <div className="h-9 mb-2 flex items-center gap-2">
                {thread.channel === 'email' && (
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={thread.subject ? `Re: ${thread.subject}` : 'Subject'}
                    className="flex-1 min-w-0 h-full rounded-md px-3 py-1.5 text-sm focus:outline-none"
                    style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
                  />
                )}
                {thread.channel !== 'email' && (
                  <div className="flex-1 min-w-0 h-full flex items-center text-[11px] px-1 truncate" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
                    {thread.kind === 'channel'
                      ? `${thread.name || '#' + thread.slug}${thread.description ? ' · ' + thread.description : ''}`
                      : thread.channel === 'sms'
                        ? `SMS to ${thread.comhub_contacts?.phone || ''}`
                        : thread.channel === 'voice'
                          ? `Voice · use the Call button to dial`
                          : ''}
                  </div>
                )}
                {/* Away/off-hours presets — separate from Templates so they don't blend in with regular replies */}
                {(thread.channel === 'sms' || thread.channel === 'email') && awayTemplates.length > 0 && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowAway(s => !s)}
                      className="h-full px-2.5 rounded-md text-[11px] whitespace-nowrap"
                      style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-warn)', background: 'rgba(139,69,19,0.06)', border: '1px solid rgba(139,69,19,0.25)' }}
                    >
                      Away ▾
                    </button>
                    {showAway && (
                      <div className="absolute right-0 bottom-[calc(100%+4px)] w-72 rounded-md shadow-xl z-10 max-h-72 overflow-y-auto" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}>
                        {awayTemplates.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => {
                              setComposer(c => (c ? c + '\n\n' : '') + tpl.body)
                              setShowAway(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--color-loop-bg)] border-b last:border-b-0"
                            style={{ borderColor: 'var(--color-loop-line-soft)' }}
                          >
                            <div className="text-xs font-medium">{tpl.name}</div>
                            <div className="text-[11px] truncate" style={{ color: 'var(--color-loop-muted)' }}>{tpl.body}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Templates picker — only meaningful for SMS / email composers */}
                {(thread.channel === 'sms' || thread.channel === 'email') && regularTemplates.length > 0 && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowTemplates(s => !s)}
                      className="h-full px-2.5 rounded-md text-[11px] whitespace-nowrap"
                      style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-ink)', background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
                    >
                      Templates ▾
                    </button>
                    {showTemplates && (
                      <div className="absolute right-0 bottom-[calc(100%+4px)] w-72 rounded-md shadow-xl z-10 max-h-72 overflow-y-auto" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}>
                        {regularTemplates.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => {
                              setComposer(c => (c ? c + '\n\n' : '') + tpl.body)
                              setShowTemplates(false)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--color-loop-bg)] border-b last:border-b-0"
                            style={{ borderColor: 'var(--color-loop-line-soft)' }}
                          >
                            <div className="text-xs font-medium">{tpl.name}</div>
                            <div className="text-[11px] truncate" style={{ color: 'var(--color-loop-muted)' }}>{tpl.body}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={
                    thread.kind === 'channel'
                      ? `Post to ${thread.name || '#' + thread.slug} (Enter to send, Shift+Enter for a new line)`
                      : thread.channel === 'voice'
                        ? `Add a note about this call (Enter to send, Shift+Enter for a new line)`
                        : `Reply via ${thread.channel.toUpperCase()} (Enter to send, Shift+Enter for a new line)`
                  }
                  rows={3}
                  className="flex-1 rounded-md px-3 py-2 text-sm resize-none focus:outline-none"
                  style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!composer.trim() || sending}
                  className="self-stretch px-4 rounded-md text-sm font-medium disabled:opacity-50"
                  style={{ fontFamily: 'var(--mono)', background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Right: context panel — 320px on md+. On mobile, slides in as a fullscreen overlay when ⓘ is tapped. */}
      <aside className={`${mobileContextOpen ? 'fixed inset-0 z-40 w-full' : 'hidden'} md:!relative md:!inset-auto md:!flex md:!w-80 md:shrink-0 md:!z-auto border-l border-[var(--color-loop-line-soft)] overflow-y-auto bg-[var(--color-loop-bg)] flex-col`}>
        {mobileContextOpen && (
          <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-[var(--color-loop-line-soft)] sticky top-0 bg-[var(--color-loop-bg)] z-10">
            <span className="text-sm font-semibold" style={{ fontFamily: 'var(--display)' }}>Client info</span>
            <button
              onClick={() => setMobileContextOpen(false)}
              className="px-3 py-1 text-[var(--color-loop-graphite)] hover:text-[var(--color-loop-ink)] text-lg leading-none"
              aria-label="Close client info"
            >
              ✕
            </button>
          </div>
        )}
        {!thread && (
          <div className="p-6 text-sm" style={{ fontFamily: 'var(--display)', fontStyle: 'italic', color: 'var(--color-loop-muted-2)' }}>Select a thread.</div>
        )}
        {thread?.kind === 'channel' && (
          <ChannelInfoPanel thread={thread} />
        )}
        {thread?.kind === 'contact' && context && (
          <ContextPanelInline context={context} onTagChanged={fetchThreads} />
        )}
        {thread?.kind === 'contact' && !context && (
          <div className="p-6 text-sm" style={{ color: 'var(--color-loop-muted)' }}>Loading contact details…</div>
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
      {settingsPanelAvailable && <ComhubSettings />}
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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(28,28,28,0.35)' }} onClick={props.onClose}>
      <div className="rounded-lg w-[400px] max-w-full p-4" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 500 }}>New conversation</h3>
          <button onClick={props.onClose} className="hover:text-[var(--color-loop-ink)]" style={{ color: 'var(--color-loop-muted)' }}>✕</button>
        </div>
        <div className="flex gap-2 mb-3" style={{ fontFamily: 'var(--mono)' }}>
          {(['sms', 'email', 'call'] as const).map(c => (
            <button
              key={c}
              onClick={() => props.setChannel(c)}
              className="px-3 py-1.5 rounded-md text-sm transition-colors"
              style={props.channel === c
                ? { background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }
                : { background: 'var(--color-loop-bg)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)' }}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Search by client/cleaner name to auto-fill phone/email */}
        <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Find by name</label>
        <div className="relative mb-2">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPicked(null) }}
            placeholder="Type a name to search clients + team…"
            className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
          />
          {!picked && search.trim().length >= 2 && (searching || searched) && (
            <div className="absolute left-0 right-0 top-11 rounded-md shadow-xl z-10 max-h-60 overflow-y-auto" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}>
              {searching && results.length === 0 && (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-loop-muted)' }}>Searching…</div>
              )}
              {!searching && searched && results.length === 0 && (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-loop-muted)' }}>No matches in clients or team. Type the phone/email below.</div>
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
                  className="w-full text-left px-3 py-2 hover:bg-[var(--color-loop-bg)] border-b last:border-b-0"
                  style={{ borderColor: 'var(--color-loop-line-soft)' }}
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="text-[9px] uppercase px-1 rounded-sm"
                      style={{ fontFamily: 'var(--mono)', fontWeight: 600, ...(r.role === 'client'
                        ? { background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.25)' }
                        : { background: 'rgba(4,120,87,0.08)', color: 'var(--color-loop-good)', border: '1px solid rgba(4,120,87,0.25)' }) }}
                    >{r.role}</span>
                    <span className="font-medium">{r.name || '(no name)'}</span>
                    {r.dns && <span className="text-[9px] uppercase px-1 rounded-sm" style={{ fontFamily: 'var(--mono)', fontWeight: 600, background: 'rgba(139,69,19,0.10)', color: 'var(--color-loop-warn)', border: '1px solid rgba(139,69,19,0.25)' }}>DNS</span>}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--color-loop-muted)' }}>{r.phone || ''} {r.phone && r.email ? '·' : ''} {r.email || ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        {props.channel !== 'call' && (
          <>
            <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
              {props.channel === 'email' ? 'Email' : 'Phone'}
            </label>
            <input
              value={props.recipient}
              onChange={(e) => props.setRecipient(e.target.value)}
              placeholder={props.channel === 'email' ? 'name@example.com' : '+1212...'}
              className="w-full rounded-md px-3 py-2 text-sm mb-2 focus:outline-none"
              style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
            />
            {props.channel === 'email' && (
              <input
                value={props.subject}
                onChange={(e) => props.setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full rounded-md px-3 py-2 text-sm mb-2 focus:outline-none"
                style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
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
            className="w-full rounded-md px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
          />
        )}
        <div className="flex justify-end gap-2 mt-4" style={{ fontFamily: 'var(--mono)' }}>
          <button onClick={props.onClose} className="px-3 py-1.5 rounded-md text-sm hover:bg-[var(--color-loop-bg)]" style={{ border: '1px solid var(--color-loop-line-soft)', color: 'var(--color-loop-graphite)' }}>Cancel</button>
          <button
            onClick={handleSend}
            disabled={
              !props.recipient.trim()
              || sending
              || (props.channel === 'call' ? !adminPhone.trim() : !props.body.trim())
            }
            className="px-4 py-1.5 rounded-md text-sm disabled:opacity-50"
            style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
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
    <div className="rounded-lg p-3" style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}>
      {/* Number display */}
      <div className="text-center mb-2">
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="(555) 555-5555"
          className="w-full bg-transparent text-center text-lg font-light tracking-wide focus:outline-none"
          style={{ fontFamily: 'var(--display)' }}
          aria-label="Phone number"
        />
        {recipient && (
          <div className="text-[10px] mt-0.5" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>{formatPhone(recipient)}</div>
        )}
      </div>

      {/* Keypad — compact 3 cols, fixed-height keys */}
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map(([digit, letters]) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(digit)}
            className="h-11 rounded-full flex flex-col items-center justify-center transition select-none hover:bg-[var(--color-loop-line-soft)]"
            style={{ background: 'var(--color-loop-canvas)' }}
          >
            <div className="text-base font-medium leading-none" style={{ fontFamily: 'var(--display)' }}>{digit}</div>
            {letters && <div className="text-[8px] tracking-widest mt-0.5" style={{ color: 'var(--color-loop-muted)' }}>{letters}</div>}
          </button>
        ))}
      </div>

      <div className="flex justify-center mt-2">
        <button
          type="button"
          onClick={backspace}
          disabled={!recipient}
          className="text-[11px] px-3 py-1 hover:text-[var(--color-loop-ink)] disabled:opacity-40"
          style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}
        >
          ⌫ Backspace
        </button>
      </div>

      {/* Admin's "ring me first" phone — saved to localStorage */}
      <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--color-loop-line-soft)' }}>
        <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Your phone (we ring you first)</label>
        <input
          value={adminPhone}
          onChange={(e) => setAdminPhone(e.target.value)}
          placeholder="+1212..."
          className="w-full rounded-md px-2.5 py-1.5 text-sm focus:outline-none"
          style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(28,28,28,0.35)' }} onClick={onClose}>
      <div className="rounded-lg w-[640px] max-w-full h-[80vh] flex flex-col" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-[var(--color-loop-line-soft)] flex justify-between items-center">
          <div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 500 }}>✦ Assistant</h3>
            <div className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Owner channel — terse, can teach via remember/create_skill</div>
          </div>
          <button onClick={onClose} className="hover:text-[var(--color-loop-ink)]" style={{ color: 'var(--color-loop-muted)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {history.length === 0 && <div className="text-sm" style={{ color: 'var(--color-loop-muted)' }}>Say something to the assistant…</div>}
          {history.map((m, i) => {
            const isAdmin = m.role === 'admin'
            return (
              <div key={i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2"
                  style={isAdmin ? { background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' } : { background: '#6d28d9', color: '#fff' }}
                >
                  <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <div className="border-t border-[var(--color-loop-line-soft)] p-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask the assistant (Enter to send, Shift+Enter for a new line)"
            rows={2}
            className="flex-1 rounded-md px-3 py-2 text-sm resize-none focus:outline-none"
            style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            style={{ background: '#6d28d9', color: '#fff' }}
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
function ContextPanelInline({ context, onTagChanged }: { context: ContactContext; onTagChanged?: () => void }) {
  const { contact, client, cleaner, applicant, recent_bookings, total_bookings, total_spent_cents, outstanding_cents, cleaner_bookings, cleaner_total_earnings_cents } = context
  const fmtMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const fmtDateTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    } catch { return iso }
  }
  const fmtPhone = (p: string | null | undefined) => {
    if (!p) return ''
    const d = p.replace(/\D/g, '').slice(-10)
    return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p
  }
  const cleanerName = (b: Booking): string => {
    if (!b.cleaners) return '—'
    const c = Array.isArray(b.cleaners) ? b.cleaners[0] : b.cleaners
    return c?.name || '—'
  }
  // An active team member linkage wins over a client linkage — a phantom
  // `clients` row can get auto-created for someone's phone before they're
  // recognized as an existing team member (legacy data), and when both are
  // linked it's almost always because of that, not a real dual role.
  const role: 'client' | 'cleaner' | 'applicant' | 'unlinked' = cleaner ? 'cleaner' : client ? 'client' : applicant ? 'applicant' : 'unlinked'

  const roleBadgeStyle = role === 'client'
    ? { background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.25)' }
    : role === 'cleaner'
      ? { background: 'rgba(4,120,87,0.08)', color: 'var(--color-loop-good)', border: '1px solid rgba(4,120,87,0.25)' }
      : role === 'applicant'
        ? { background: 'rgba(217,119,6,0.08)', color: '#b45309', border: '1px solid rgba(217,119,6,0.25)' }
        : { background: 'var(--color-loop-canvas)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)' }
  const pillFont = { fontFamily: 'var(--mono)', fontWeight: 600 as const }
  // A manual tag overrides the linkage-derived role badge — that's the whole
  // point of tagging (see 2026_08_01_comhub_contact_tags migration): once an
  // admin corrects the classification, it's a standing correction that
  // applies to every future message from this contact, not a one-time fix.
  const roleLabel = role === 'unlinked' ? 'Potential Lead' : role === 'cleaner' ? 'Team' : role === 'applicant' ? 'Applicant' : 'Client'
  const displayLabel = contact.tag ? CONTACT_TAG_LABELS[contact.tag] : roleLabel
  const displayBadgeStyle = contact.tag ? CONTACT_TAG_BADGE_STYLE[contact.tag] : roleBadgeStyle

  return (
    <div>
      <div className="p-4 border-b border-[var(--color-loop-line-soft)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ ...displayBadgeStyle, ...pillFont }}>{displayLabel}</span>
          {role === 'client' && client?.do_not_service && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ background: 'rgba(139,69,19,0.10)', color: 'var(--color-loop-warn)', border: '1px solid rgba(139,69,19,0.25)', ...pillFont }}>DNS</span>
          )}
          {((role === 'client' && client?.active === false) || (role === 'cleaner' && cleaner?.active === false)) && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-loop-canvas)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)', ...pillFont }}>Inactive</span>
          )}
        </div>
        <div className="text-xs mt-1 space-y-0.5" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
          {contact.phone && <div>{fmtPhone(contact.phone)}</div>}
          {contact.email && <div className="truncate">{contact.email}</div>}
          {role === 'client' && client?.pin && <div>Client portal PIN: <span style={{ color: 'var(--color-loop-ink)', fontWeight: 600 }}>{client.pin}</span></div>}
        </div>
        <ContactTagSelect contactId={contact.id} initialTag={contact.tag} onSaved={onTagChanged} />
      </div>

      <ContactDetailsEditor
        contactId={contact.id}
        initialName={contact.name || cleaner?.name || client?.name || ''}
        initialAddress={contact.address || cleaner?.address || client?.address || client?.address_line1 || ''}
      />

      {applicant && (
        <div className="p-4 border-b border-[var(--color-loop-line-soft)] space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Application status</span>
            <span className="capitalize">{applicant.status || 'pending'}</span>
          </div>
          {applicant.address && (
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Address</div>
              <div className="text-[var(--color-loop-graphite)]">{applicant.address}</div>
            </div>
          )}
          {applicant.experience && (
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Experience</div>
              <div className="text-[var(--color-loop-graphite)]">{applicant.experience}</div>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Applied</span>
            <span>{fmtDateTime(applicant.created_at)}</span>
          </div>
          <a
            href={`/admin/team-applications?id=${applicant.id}`}
            className="text-xs inline-block pt-1 hover:underline"
            style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-ink)' }}
          >
            View application →
          </a>
        </div>
      )}

      {role === 'client' && client && (
        <div className="p-4 border-b border-[var(--color-loop-line-soft)] space-y-2 text-sm">
          {(client.pet_name || client.pet_type) && (
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Pets</div>
              <div className="text-[var(--color-loop-graphite)]">{[client.pet_name, client.pet_type].filter(Boolean).join(' · ')}</div>
            </div>
          )}
          <a
            href={`/dashboard/bookings?new=1&client_id=${client.id}`}
            className="block text-center text-xs font-medium px-3 py-1.5 rounded"
            style={{ fontFamily: 'var(--mono)', background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
          >
            Book →
          </a>
          <div className="flex gap-3 pt-1">
            <a
              href={`/admin/clients?id=${client.id}`}
              className="text-xs hover:underline"
              style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-ink)' }}
            >
              View client →
            </a>
          </div>
        </div>
      )}

      {role === 'client' && client && (
        <NotesEditor
          contactId={contact.id}
          initialPrivate={client.notes_private || ''}
          initialPublic={client.notes_public || ''}
        />
      )}

      {role === 'cleaner' && cleaner && (
        <div className="p-4 border-b border-[var(--color-loop-line-soft)] space-y-2 text-sm">
          {cleaner.address && (
            <div>
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Address</div>
              <div className="text-[var(--color-loop-graphite)]">{cleaner.address}</div>
            </div>
          )}
          {cleaner.pin && (
            <div className="flex justify-between">
              <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Portal PIN</span>
              <span style={{ fontWeight: 600 }}>{cleaner.pin}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Hourly rate</span>
            <span>${cleaner.pay_rate ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Total earnings</span>
            <span style={{ fontFamily: 'var(--display)' }}>{fmtMoney(cleaner_total_earnings_cents)}</span>
          </div>
          {typeof cleaner.avg_rating === 'number' && cleaner.rating_count ? (
            <div className="flex justify-between">
              <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Rating</span>
              <span>★ {cleaner.avg_rating.toFixed(2)} ({cleaner.rating_count})</span>
            </div>
          ) : null}
          <a
            href={`/admin/cleaners?id=${cleaner.id}`}
            className="text-xs inline-block pt-1 hover:underline"
            style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-ink)' }}
          >
            View team member →
          </a>
        </div>
      )}

      {role === 'cleaner' && cleaner && cleaner_bookings.length > 0 && (
        <div className="p-4 space-y-2">
          <div className="text-[10px] uppercase mb-1" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Recent bookings</div>
          {cleaner_bookings.map(b => (
            <a
              key={b.id}
              href={`/admin/bookings?id=${b.id}`}
              className="block p-2 rounded text-sm transition-colors"
              style={{ border: '1px solid var(--color-loop-line-soft)', background: 'var(--color-loop-canvas)' }}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-medium">{fmtDateTime(b.start_time)}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>{b.status || '—'}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-loop-muted)' }}>
                {b.service_type || 'Cleaning'} · {b.price != null ? `$${(b.price / 100).toFixed(2)}` : '?'}
              </div>
            </a>
          ))}
        </div>
      )}

      {role === 'client' && client && (
        <div className="p-4 border-b border-[var(--color-loop-line-soft)] grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Total bookings</div>
            <div style={{ fontFamily: 'var(--display)' }}>{total_bookings}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Lifetime spent</div>
            <div style={{ fontFamily: 'var(--display)' }}>{fmtMoney(total_spent_cents)}</div>
          </div>
          {outstanding_cents > 0 && (
            <div className="col-span-2">
              <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-warn)' }}>Outstanding</div>
              <div className="font-medium" style={{ fontFamily: 'var(--display)', color: 'var(--color-loop-warn)' }}>{fmtMoney(outstanding_cents)}</div>
            </div>
          )}
        </div>
      )}

      {role === 'client' && recent_bookings.length > 0 && (
        <div className="p-4 space-y-2">
          <div className="text-[10px] uppercase mb-1" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Recent bookings</div>
          {recent_bookings.map(b => (
            <a
              key={b.id}
              href={`/admin/bookings?id=${b.id}`}
              className="block p-2 rounded text-sm transition-colors"
              style={{ border: '1px solid var(--color-loop-line-soft)', background: 'var(--color-loop-canvas)' }}
            >
              <div className="flex justify-between items-baseline">
                <span className="font-medium">{fmtDateTime(b.start_time)}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>{b.status || '—'}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-loop-muted)' }}>
                {b.service_type || 'Cleaning'} · {b.price != null ? `$${(b.price / 100).toFixed(2)}` : '?'}
                {b.payment_status && b.payment_status !== 'paid' && (
                  <span className="ml-1" style={{ color: 'var(--color-loop-warn)' }}>({b.payment_status})</span>
                )}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-loop-muted)' }}>{cleanerName(b)}</div>
            </a>
          ))}
        </div>
      )}

      {role === 'unlinked' && (
        <div className="p-4 text-sm" style={{ color: 'var(--color-loop-muted)' }}>
          Not yet linked to a client, team member, or application. Once they book, apply, or get hired, this panel will populate.
        </div>
      )}
    </div>
  )
}

// Right-panel content for an internal channel.
function ChannelInfoPanel({ thread }: { thread: Thread }) {
  return (
    <div>
      <div className="p-4 border-b border-[var(--color-loop-line-soft)]">
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ fontFamily: 'var(--mono)', fontWeight: 600, background: 'var(--color-loop-canvas)', color: 'var(--color-loop-muted)', border: '1px solid var(--color-loop-line-soft)' }}>
          Channel
        </span>
        <h3 className="mt-2" style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 500 }}>{thread.name || `#${thread.slug}`}</h3>
        {thread.description && (
          <div className="text-xs mt-1" style={{ color: 'var(--color-loop-muted)' }}>{thread.description}</div>
        )}
      </div>
      <div className="p-4 border-b border-[var(--color-loop-line-soft)] text-sm space-y-2">
        <div>
          <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Created</div>
          <div className="text-xs" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-graphite)' }}>
            {(() => { try { return new Date(thread.created_at).toLocaleString() } catch { return '' } })()}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Members</div>
          <div className="text-xs" style={{ color: 'var(--color-loop-muted)' }}>All admins (public channel)</div>
        </div>
      </div>
      <div className="p-4 text-xs" style={{ color: 'var(--color-loop-muted)' }}>
        Use this channel for team posts. <code style={{ color: 'var(--color-loop-graphite)' }}>@here</code> pings everyone, <code style={{ color: 'var(--color-loop-graphite)' }}>@firstname</code> pings one person.
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline editor for the contact's name + address. Works pre-client (leads
// that haven't booked yet) — saves onto comhub_contacts, mirrored onto the
// linked client record (if any) so the rest of the CRM stays in sync.
// ─────────────────────────────────────────────────────────────────────────────
function ContactDetailsEditor({ contactId, initialName, initialAddress }: {
  contactId: string
  initialName: string
  initialAddress: string
}) {
  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState(initialAddress)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setName(initialName); setAddress(initialAddress); setError(null) }, [initialName, initialAddress, contactId])

  const dirty = name !== initialName || address !== initialAddress

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/comhub/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || null, address: address || null }),
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
    <div className="p-4 border-b border-[var(--color-loop-line-soft)] space-y-2 text-sm">
      <div>
        <div className="text-[10px] uppercase mb-1" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Name</div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Unknown"
          className="w-full rounded-md px-2 py-1.5 text-sm focus:outline-none"
          style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)', fontFamily: 'var(--display)', fontSize: 16 }}
        />
      </div>
      <div>
        <div className="text-[10px] uppercase mb-1" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Address</div>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="No address on file"
          className="w-full rounded-md px-2 py-1.5 text-sm focus:outline-none"
          style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
        />
      </div>
      <div className="flex items-center justify-between pt-0.5">
        <div className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
          {error ? <span style={{ color: 'var(--color-loop-warn)' }}>{error}</span>
            : saving ? 'Saving…'
            : savedAt && !dirty ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : dirty ? 'Unsaved changes' : ''}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-3 py-1 rounded text-xs disabled:opacity-50"
          style={{ fontFamily: 'var(--mono)', background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual contact classification — quick dropdown, works whether or not the
// contact is linked to a client/team member (that's the point: it's for
// reclassifying the ones that AREN'T).
// ─────────────────────────────────────────────────────────────────────────────
function ContactTagSelect({ contactId, initialTag, onSaved }: {
  contactId: string
  initialTag: ContactTag | null
  onSaved?: () => void
}) {
  const [tag, setTag] = useState<ContactTag | null>(initialTag)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setTag(initialTag) }, [initialTag, contactId])

  const change = async (next: ContactTag | null) => {
    const prev = tag
    setTag(next) // optimistic
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/comhub/contacts/${contactId}/tag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: next }),
      })
      if (!res.ok) { setTag(prev); return }
      onSaved?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={tag || ''}
      disabled={saving}
      onChange={(e) => change((e.target.value || null) as ContactTag | null)}
      className="mt-2 px-2 py-1 rounded text-xs border cursor-pointer w-full"
      style={{ fontFamily: 'var(--mono)', background: 'var(--color-loop-bg)', color: 'var(--color-loop-graphite)', borderColor: 'var(--color-loop-line-soft)' }}
      title="Manually tag this contact"
    >
      <option value="">Tag contact…</option>
      {Object.entries(CONTACT_TAG_LABELS).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
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
    <div className="p-4 border-b border-[var(--color-loop-line-soft)] space-y-3 text-sm">
      <div>
        <div className="text-[10px] uppercase mb-1" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Private notes (admin only)</div>
        <textarea
          value={priv}
          onChange={(e) => setPriv(e.target.value)}
          placeholder="Internal notes — never shown to the client"
          rows={3}
          className="w-full rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none"
          style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
        />
      </div>
      <div>
        <div className="text-[10px] uppercase mb-1 flex items-center gap-1" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
          <span>Public notes</span>
          <span className="text-[9px] px-1 rounded-sm" style={{ background: 'rgba(4,120,87,0.08)', color: 'var(--color-loop-good)', border: '1px solid rgba(4,120,87,0.25)' }}>visible to client</span>
        </div>
        <textarea
          value={pub}
          onChange={(e) => setPub(e.target.value)}
          placeholder="Notes the client sees in their portal"
          rows={3}
          className="w-full rounded-md px-2 py-1.5 text-sm resize-none focus:outline-none"
          style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11px]" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>
          {error ? <span style={{ color: 'var(--color-loop-warn)' }}>{error}</span>
            : saving ? 'Saving…'
            : savedAt && !dirty ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : dirty ? 'Unsaved changes' : ''}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-3 py-1 rounded text-xs disabled:opacity-50"
          style={{ fontFamily: 'var(--mono)', background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(28,28,28,0.35)' }} onClick={onClose}>
      <div className="rounded-lg w-[480px] max-w-full p-5" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 500 }}>New channel</h3>
          <button onClick={onClose} className="hover:text-[var(--color-loop-ink)]" style={{ color: 'var(--color-loop-muted)' }}>✕</button>
        </div>
        <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Slug (no spaces)</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. dispatch, marketing, oncall"
          className="w-full rounded-md px-3 py-2 text-sm mb-3 focus:outline-none"
          style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
        />
        <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this channel for?"
          rows={3}
          className="w-full rounded-md px-3 py-2 text-sm resize-none focus:outline-none"
          style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
        />
        {error && <div className="text-xs mt-2" style={{ color: 'var(--color-loop-warn)' }}>{error}</div>}
        <div className="flex justify-end gap-2 mt-4" style={{ fontFamily: 'var(--mono)' }}>
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sm hover:bg-[var(--color-loop-bg)]" style={{ border: '1px solid var(--color-loop-line-soft)', color: 'var(--color-loop-graphite)' }}>Cancel</button>
          <button
            onClick={create}
            disabled={!slug.trim() || creating}
            className="px-4 py-1.5 rounded-md text-sm disabled:opacity-50"
            style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
