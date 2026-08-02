'use client'

import { useCallback, useEffect, useState } from 'react'
import WebChatWidget, { WebChatWidgetMessage } from '@/components/comhub/WebChatWidget'

const THREAD_STORAGE_KEY = 'fl_webchat_thread_id_the-florida-maid'

interface WebchatApiMessage {
  id: string
  author: WebChatWidgetMessage['author']
  body: string | null
  media_urls: string[] | null
  sent_at: string
}

function toWidgetMessage(m: WebchatApiMessage): WebChatWidgetMessage {
  return { id: m.id, author: m.author, body: m.body || '', imageUrl: m.media_urls?.[0], sentAt: m.sent_at }
}

export default function SiteChatWidget({ embedded = false }: { embedded?: boolean }) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<WebChatWidgetMessage[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(THREAD_STORAGE_KEY) : null
    if (!stored) { setReady(true); return }
    setThreadId(stored)
    fetch(`/api/public/webchat?threadId=${encodeURIComponent(stored)}`)
      .then(res => res.json())
      .then((data: { messages?: WebchatApiMessage[] }) => setInitialMessages((data.messages || []).map(toWidgetMessage)))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  // Reads localStorage fresh on every call (rather than closing over `threadId`)
  // so the hero's embedded widget and the sitewide floating widget — two
  // independent mounts of this component — stay on the same thread if a
  // visitor starts a conversation in one and later sends from the other.
  const handleSend = useCallback(async ({ body, imageDataUrl }: { body: string; imageDataUrl?: string }) => {
    const current = typeof window !== 'undefined' ? localStorage.getItem(THREAD_STORAGE_KEY) : threadId
    const res = await fetch('/api/public/webchat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: current, body, imageDataUrl }),
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
    const data = await res.json() as { messages?: WebchatApiMessage[] }
    return (data.messages || []).filter(m => m.author !== 'customer').map(toWidgetMessage)
  }, [threadId])

  if (!ready) return null

  return (
    <WebChatWidget
      tenantName="The Florida Maid"
      accentColor="#EA580C"
      brandColor="#1E2A4A"
      tenantLogoUrl={embedded ? '/sites/the-florida-maid/logo.png' : undefined}
      embedded={embedded}
      pulse={!embedded}
      initialMessages={initialMessages}
      onSend={handleSend}
      pollForReplies={pollForReplies}
    />
  )
}
