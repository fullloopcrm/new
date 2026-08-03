'use client'

import { useCallback, useEffect, useState } from 'react'
import WebChatWidget, { WebChatWidgetMessage } from '@/components/comhub/WebChatWidget'

// Same key GlobalSiteChatWidget uses (not a per-tenant-name key like the
// bespoke sites) — origin-scoped is enough since every tenant lives on its
// own domain. Sharing the key means this hero-embedded instance and the
// sitewide floating launcher (mounted once in the root /site layout) stay on
// the same conversation thread if a visitor starts in one and replies in the
// other, exactly like the bespoke tenants' hero + floating pair already do.
const THREAD_STORAGE_KEY = 'fl_webchat_thread_id'

interface WebchatApiMessage {
  id: string
  author: WebChatWidgetMessage['author']
  body: string | null
  media_urls: string[] | null
  sent_at: string
}

interface TenantBranding {
  name: string
  agent_name: string | null
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
}

function toWidgetMessage(m: WebchatApiMessage): WebChatWidgetMessage {
  return { id: m.id, author: m.author, body: m.body || '', imageUrl: m.media_urls?.[0], sentAt: m.sent_at }
}

/**
 * Live human chat, embedded directly in the shared template's hero — the
 * tenant-agnostic counterpart to the bespoke tenants' own hero SiteChatWidget
 * (e.g. the-florida-maid). Branding resolved at runtime from
 * /api/tenant/public, same as GlobalSiteChatWidget, so every tenant gets this
 * automatically with zero per-tenant config. Mount once, inside the hero.
 */
export default function HeroChatEmbed() {
  const [tenant, setTenant] = useState<TenantBranding | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<WebChatWidgetMessage[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/tenant/public')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TenantBranding | null) => setTenant(data))
      .catch(() => setTenant(null))
  }, [])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(THREAD_STORAGE_KEY) : null
    if (!stored) { setReady(true); return }
    setThreadId(stored)
    fetch(`/api/public/webchat?threadId=${encodeURIComponent(stored)}`)
      .then((res) => res.json())
      .then((data: { messages?: WebchatApiMessage[] }) => setInitialMessages((data.messages || []).map(toWidgetMessage)))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const handleSend = useCallback(async ({ body, imageDataUrl, visitorName, visitorPhone }: { body: string; imageDataUrl?: string; visitorName?: string; visitorPhone?: string }) => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(THREAD_STORAGE_KEY) : threadId
    const res = await fetch('/api/public/webchat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: current, body, imageDataUrl, visitorName, visitorPhone }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send')
    if (data.threadId && data.threadId !== current) {
      setThreadId(data.threadId)
      localStorage.setItem(THREAD_STORAGE_KEY, data.threadId)
    }
  }, [threadId])

  const pollForReplies = useCallback(async (): Promise<WebChatWidgetMessage[] | void> => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(THREAD_STORAGE_KEY) : threadId
    if (!current) return
    if (current !== threadId) setThreadId(current)
    const res = await fetch(`/api/public/webchat?threadId=${encodeURIComponent(current)}`)
    if (!res.ok) return
    const data = (await res.json()) as { messages?: WebchatApiMessage[] }
    return (data.messages || []).filter((m) => m.author !== 'customer').map(toWidgetMessage)
  }, [threadId])

  if (!ready || !tenant) return null

  return (
    <WebChatWidget
      tenantName={tenant.name}
      accentColor={tenant.secondary_color || undefined}
      brandColor={tenant.primary_color || undefined}
      tenantLogoUrl={tenant.logo_url || undefined}
      statusLine="Real human, live"
      embedded
      requireIdentity
      initialMessages={initialMessages}
      onSend={handleSend}
      pollForReplies={pollForReplies}
    />
  )
}
