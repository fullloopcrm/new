'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotificationChime, useDesktopNotificationPermission } from '@/lib/use-notification-chime'

const POLL_MS = 8000
// A one-shot alert is easy to miss — this re-chimes/re-notifies for any
// alert card still on screen (not yet dismissed or opened), until it is.
const REMINDER_MS = 20000

interface Alert {
  message_id: string
  thread_id: string
  channel: 'sms' | 'email' | 'web' | 'voice'
  body: string
  subject: string | null
  sent_at: string
  contact_name: string
  contact_phone: string | null
  contact_email: string | null
}

const channelLabel: Record<Alert['channel'], string> = { sms: 'Text', email: 'Email', web: 'Web chat', voice: 'Call' }

// A browser tab cannot force itself in front of other native apps/windows —
// that's blocked by every modern browser as a security/annoyance guard.
// The closest real equivalent is an OS-level notification banner: it renders
// above every other window regardless of what's focused, and clicking it
// does reliably bring this tab back to the front.
function notifyDesktop(alert: Alert) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification('Full Loop CRM', {
    body: `${alert.contact_name} · ${channelLabel[alert.channel]} — ${alert.body}`,
    icon: '/logo.png',
    tag: alert.message_id,
  })
  n.onclick = () => { window.focus(); n.close() }
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dismissedRef = useRef(false)

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    onDismiss(alert.message_id)
  }, [alert.message_id, onDismiss])

  useEffect(() => {
    if (!sent) return
    const t = setTimeout(dismiss, 1400)
    return () => clearTimeout(t)
  }, [dismiss, sent])

  const send = async () => {
    const body = reply.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/comhub/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: alert.thread_id, channel: alert.channel, body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="pointer-events-auto w-[380px] rounded-lg shadow-2xl overflow-hidden"
      style={{ background: 'var(--color-loop-bg)', border: '1px solid #E4E4E0' }}
    >
      <div className="px-4 pt-3 pb-2.5 flex items-start gap-2.5">
        <span
          className="mt-0.5 flex-shrink-0"
          style={{ fontFamily: 'var(--mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#C22C31', background: 'rgba(229,72,77,0.1)', padding: '2px 6px', borderRadius: '3px' }}
        >
          {channelLabel[alert.channel]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate" style={{ color: 'var(--color-loop-ink)', fontSize: '13px', fontWeight: 500 }}>{alert.contact_name}</span>
            <button type="button" onClick={dismiss} aria-label="Dismiss" style={{ color: 'var(--color-loop-muted)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          {alert.subject && (
            <div className="truncate mt-0.5" style={{ color: 'var(--color-loop-muted)', fontSize: '11px' }}>{alert.subject}</div>
          )}
          <div className="mt-1 line-clamp-2" style={{ color: 'var(--color-loop-graphite)', fontSize: '12.5px', lineHeight: 1.4 }}>{alert.body}</div>
        </div>
      </div>

      {sent ? (
        <div className="px-4 pb-3" style={{ color: '#1B8A4A', fontSize: '12px', fontFamily: 'var(--mono)' }}>✓ Sent</div>
      ) : alert.channel === 'voice' ? (
        // Voice alerts have no reply-in-place channel (there's nothing to
        // send a "voice" message over) — open the full thread to text back.
        null
      ) : (
        <div className="px-3 pb-3 flex items-center gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Reply via ${channelLabel[alert.channel].toLowerCase()}…`}
            disabled={sending}
            className="flex-1 min-w-0 rounded-md"
            style={{ background: '#FFFFFF', border: '1px solid #DEDEDA', color: 'var(--color-loop-ink)', fontSize: '12.5px', padding: '7px 10px', outline: 'none' }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !reply.trim()}
            className="flex-shrink-0 rounded-md"
            style={{ background: reply.trim() ? 'var(--color-loop-ink)' : '#E4E4E0', color: reply.trim() ? '#F4F4F1' : '#999', fontSize: '11px', fontWeight: 600, padding: '7px 12px' }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      )}
      {error && <div className="px-4 pb-2.5 -mt-1.5" style={{ color: '#C22C31', fontSize: '11px' }}>{error}</div>}
      <a
        href={`/dashboard/comhub?thread=${alert.thread_id}`}
        onClick={dismiss}
        className="block px-4 py-2 hover:text-black"
        style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--color-loop-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid #E4E4E0' }}
      >
        Open in ComHub →
      </a>
    </motion.div>
  )
}

export default function ComhubAlerts() {
  const pathname = usePathname()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const alertsRef = useRef<Alert[]>([])
  useEffect(() => { alertsRef.current = alerts }, [alerts])
  const sinceRef = useRef(new Date().toISOString())
  const seenRef = useRef(new Set<string>())
  const playChime = useNotificationChime()
  useDesktopNotificationPermission()
  const onComhubPage = (pathname || '').startsWith('/dashboard/comhub')

  // A one-shot chime is easy to miss. As long as a card is still on screen
  // (not dismissed, not opened via "Open in ComHub" — both call dismiss()),
  // keep re-chiming/re-notifying every REMINDER_MS instead of going silent
  // after the first alert. Off the ComHub page only — the page below never
  // populates `alerts` there (see the poll effect), so this naturally only
  // reminds about messages you actually haven't seen. Each Notification call
  // needs a fresh tag; the same tag every cycle just silently replaces the
  // prior one on most OSes with no new alert sound.
  useEffect(() => {
    if (onComhubPage) return
    const t = setInterval(() => {
      const pending = alertsRef.current
      if (pending.length === 0) return
      playChime()
      pending.forEach(a => notifyDesktop({ ...a, message_id: `${a.message_id}-${Date.now()}` }))
    }, REMINDER_MS)
    return () => clearInterval(t)
  }, [onComhubPage, playChime])

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/comhub/alerts?since=${encodeURIComponent(sinceRef.current)}`)
        if (!res.ok) return
        const data = await res.json()
        sinceRef.current = data.server_time || sinceRef.current
        if (cancelled) return
        const fresh = ((data.alerts || []) as Alert[]).filter(a => !seenRef.current.has(a.message_id))
        if (fresh.length === 0) return
        fresh.forEach(a => seenRef.current.add(a.message_id))
        // Sound and desktop notification fire every time, no exceptions —
        // including while sitting inside ComHub itself, where a different
        // thread getting a new message wasn't audible before this.
        fresh.forEach(notifyDesktop)
        playChime()
        if (!onComhubPage) {
          setAlerts(prev => [...fresh.reverse(), ...prev].slice(0, 4))
        }
      } catch {
        // Transient network hiccup — next poll retries, nothing to surface.
      }
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    // Background tabs get their timers throttled by the browser (down to
    // roughly once a minute) — this catches the poll up the instant the
    // operator switches back instead of waiting out the throttled interval.
    const onVisible = () => { if (!document.hidden) poll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [onComhubPage, playChime])

  const dismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.message_id !== id))
  }, [])

  if (alerts.length === 0) return null

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none" aria-live="polite">
      <AnimatePresence initial={false}>
        {alerts.map(a => (
          <AlertCard key={a.message_id} alert={a} onDismiss={dismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}
