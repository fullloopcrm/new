'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePortalAuth } from './portal-auth'
import WebChatWidget, { WebChatWidgetMessage } from '@/components/comhub/WebChatWidget'

interface PortalApiMessage {
  id: string
  direction: 'in' | 'out' | 'auto' | 'system'
  author: WebChatWidgetMessage['author']
  body: string | null
  sent_at: string
}

function toWidgetMessage(m: PortalApiMessage): WebChatWidgetMessage {
  return { id: m.id, author: m.author, body: m.body || '', sentAt: m.sent_at }
}

// Authenticated client-portal chat. Unlike the anonymous public webchat, the
// visitor is already a known, logged-in client — /api/portal/messages
// resolves their comhub_contact via session (client_id), so every message
// shows up in ComHub tied to the real client, not an anonymous contact.
//
// embedded=true renders boxless, filling its container (used by the
// dedicated /portal/connect page). Default (floating) is the sitewide
// bottom-right launcher, mounted once in the portal layout.
export default function PortalChatWidget({ embedded = false }: { embedded?: boolean }) {
  const { auth } = usePortalAuth()
  const [initialMessages, setInitialMessages] = useState<WebChatWidgetMessage[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!auth) return
    fetch('/api/portal/messages', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(res => (res.ok ? res.json() : null))
      .then((data: { messages?: PortalApiMessage[] } | null) => {
        setInitialMessages((data?.messages || []).map(toWidgetMessage))
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [auth])

  const handleSend = useCallback(async ({ body }: { body: string }) => {
    if (!auth) throw new Error('Not logged in')
    const res = await fetch('/api/portal/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ body }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send')
  }, [auth])

  const pollForReplies = useCallback(async (): Promise<WebChatWidgetMessage[] | void> => {
    if (!auth) return
    const res = await fetch('/api/portal/messages', { headers: { Authorization: `Bearer ${auth.token}` } })
    if (!res.ok) return
    const data = await res.json() as { messages?: PortalApiMessage[] }
    return (data.messages || []).filter(m => m.author !== 'customer').map(toWidgetMessage)
  }, [auth])

  if (!auth || !ready) return null

  return (
    <WebChatWidget
      tenantName={auth.tenant.name}
      brandColor={auth.tenant.primary_color || undefined}
      logoUrl={embedded ? undefined : (auth.tenant.logo_url || undefined)}
      tenantLogoUrl={embedded ? (auth.tenant.logo_url || undefined) : undefined}
      statusLine="Live chat with a real person"
      greeting={`Hello ${auth.client.name}, how can we help you?`}
      agentIntro="Have a question? A real human's here, live."
      selfIntro={`Hi, I'm ${auth.client.name}.`}
      embedded={embedded}
      pulse={!embedded}
      initialMessages={initialMessages}
      onSend={handleSend}
      pollForReplies={pollForReplies}
    />
  )
}
