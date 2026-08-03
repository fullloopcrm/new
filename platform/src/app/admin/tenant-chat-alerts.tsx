'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotificationChime, useDesktopNotificationPermission } from '@/lib/use-notification-chime'

const POLL_MS = 8000

interface Alert {
  message_id: string
  tenant_id: string
  tenant_name: string
  body: string
  sent_at: string
}

function notifyDesktop(alert: Alert) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const n = new Notification('Full Loop CRM', {
    body: `${alert.tenant_name} — ${alert.body}`,
    icon: '/logo.png',
    tag: alert.message_id,
  })
  n.onclick = () => { window.focus(); n.close() }
}

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const dismissedRef = useRef(false)
  const dismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    onDismiss(alert.message_id)
  }, [alert.message_id, onDismiss])

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
          Loop Connect
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate" style={{ color: 'var(--color-loop-ink)', fontSize: '13px', fontWeight: 500 }}>{alert.tenant_name}</span>
            <button type="button" onClick={dismiss} aria-label="Dismiss" style={{ color: 'var(--color-loop-muted)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          <div className="mt-1 line-clamp-2" style={{ color: 'var(--color-loop-graphite)', fontSize: '12.5px', lineHeight: 1.4 }}>{alert.body}</div>
        </div>
      </div>
      <a
        href={`/admin/tenant-chats?tenant_id=${alert.tenant_id}`}
        onClick={dismiss}
        className="block px-4 py-2 hover:text-black"
        style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--color-loop-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid #E4E4E0' }}
      >
        Open thread →
      </a>
    </motion.div>
  )
}

// Platform-admin-only counterpart to dashboard/comhub-alerts.tsx — same
// sound, same toast pattern, but for a tenant owner messaging Full Loop
// support via Loop Connect (tenant_owner_messages) instead of a tenant's own
// customer messaging ComHub. Mounted once in admin/layout.tsx so it fires
// across every /admin page, not just /admin/tenant-chats.
export default function TenantChatAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const sinceRef = useRef(new Date().toISOString())
  const seenRef = useRef(new Set<string>())
  const playChime = useNotificationChime()
  useDesktopNotificationPermission()

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/tenant-chats/alerts?since=${encodeURIComponent(sinceRef.current)}`)
        if (!res.ok) return
        const data = await res.json()
        sinceRef.current = data.server_time || sinceRef.current
        if (cancelled) return
        const fresh = ((data.alerts || []) as Alert[]).filter(a => !seenRef.current.has(a.message_id))
        if (fresh.length === 0) return
        fresh.forEach(a => seenRef.current.add(a.message_id))
        fresh.forEach(notifyDesktop)
        playChime()
        setAlerts(prev => [...fresh.reverse(), ...prev].slice(0, 4))
      } catch {
        // Transient network hiccup — next poll retries, nothing to surface.
      }
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    const onVisible = () => { if (!document.hidden) poll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [playChime])

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
