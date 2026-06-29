'use client'

// Master tenant-owner chat. Platform admin <-> each tenant's OWNER, threaded per
// tenant. Outbound sends via the tenant's own channel (Jefe's notifyTenantOwner).
// Inbound capture is phase 2 — for now Jeff initiates and sees replies once wired.
import { useCallback, useEffect, useRef, useState } from 'react'

interface Thread {
  tenant_id: string
  tenant_name: string
  slug: string | null
  owner_name: string | null
  has_contact: boolean
  last_message: string | null
  last_at: string | null
  unread: number
}

interface Message {
  id: string
  direction: 'in' | 'out'
  channel: string | null
  body: string
  sender: string | null
  created_at: string
}

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

export default function TenantChatsPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [active, setActive] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const loadThreads = useCallback(async () => {
    const res = await fetch('/api/admin/tenant-chats')
    if (res.ok) setThreads((await res.json()).threads || [])
  }, [])

  const openThread = useCallback(async (t: Thread) => {
    setActive(t)
    setError(null)
    const res = await fetch(`/api/admin/tenant-chats?tenant_id=${t.tenant_id}`)
    if (res.ok) setMessages((await res.json()).messages || [])
    setThreads((prev) => prev.map((p) => (p.tenant_id === t.tenant_id ? { ...p, unread: 0 } : p)))
  }, [])

  useEffect(() => { loadThreads() }, [loadThreads])
  // Live-ish refresh: poll threads + the open thread while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      loadThreads()
      if (active) openThread(active)
    }, 15000)
    return () => clearInterval(id)
  }, [loadThreads, openThread, active])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!active || !draft.trim() || sending) return
    setSending(true)
    setError(null)
    const res = await fetch('/api/admin/tenant-chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: active.tenant_id, body: draft.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setDraft('')
      await openThread(active)
      loadThreads()
    } else {
      setError(data.error || 'send failed')
    }
    setSending(false)
  }

  return (
    <div className="loop-scope" style={{ display: 'flex', height: 'calc(100vh - 0px)', color: 'var(--color-loop-ink)' }}>
      {/* Thread list */}
      <div style={{ width: 320, borderRight: '1px solid #E4E2DC', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 12px', borderBottom: '1px solid #E4E2DC' }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em' }}>Tenant Chats</h1>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>
            Owner ↔ you · {threads.length} tenants
          </p>
        </div>
        {threads.map((t) => (
          <button
            key={t.tenant_id}
            onClick={() => openThread(t)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '14px 18px',
              borderBottom: '1px solid #EEECE6', cursor: 'pointer',
              background: active?.tenant_id === t.tenant_id ? '#F4F2EC' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t.tenant_name}</span>
              {t.unread > 0 && (
                <span style={{ background: '#b91c1c', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 7px', fontWeight: 600 }}>{t.unread}</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.last_message || (t.has_contact ? 'No messages yet' : 'No owner contact on file')}
            </div>
            {t.last_at && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#aaa', marginTop: 3 }}>{fmtTime(t.last_at)}</div>}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!active ? (
          <div style={{ margin: 'auto', color: '#aaa', fontFamily: 'var(--mono)', fontSize: 12 }}>Select a tenant</div>
        ) : (
          <>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #E4E2DC' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 500 }}>{active.tenant_name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{active.owner_name || 'Owner'}{active.has_contact ? '' : ' · no contact on file'}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.length === 0 && <div style={{ color: '#aaa', fontSize: 13, margin: 'auto' }}>No messages yet — start the conversation below.</div>}
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                  <div style={{
                    background: m.direction === 'out' ? 'var(--color-loop-ink)' : '#F0EEE8',
                    color: m.direction === 'out' ? '#fff' : 'var(--color-loop-ink)',
                    padding: '9px 13px', borderRadius: 12, fontSize: 14, whiteSpace: 'pre-wrap',
                  }}>{m.body}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#aaa', marginTop: 3, textAlign: m.direction === 'out' ? 'right' : 'left' }}>
                    {m.channel || ''} · {fmtTime(m.created_at)}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {error && <div style={{ padding: '8px 22px', color: '#b91c1c', fontSize: 13 }}>{error}</div>}

            <div style={{ borderTop: '1px solid #E4E2DC', padding: '14px 22px', display: 'flex', gap: 10 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
                placeholder={active.has_contact ? 'Message the owner… (⌘+Enter to send)' : 'No owner contact on file — set one in the tenant settings'}
                disabled={!active.has_contact || sending}
                rows={2}
                style={{ flex: 1, resize: 'none', padding: '10px 12px', border: '1px solid #D8D6D0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
              />
              <button
                onClick={send}
                disabled={!active.has_contact || !draft.trim() || sending}
                style={{
                  alignSelf: 'flex-end', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: 'var(--color-loop-ink)', color: '#fff', cursor: 'pointer', opacity: !active.has_contact || !draft.trim() || sending ? 0.5 : 1,
                }}
              >{sending ? 'Sending…' : 'Send'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
