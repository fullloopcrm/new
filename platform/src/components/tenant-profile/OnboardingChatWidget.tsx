'use client'

import { useCallback, useEffect, useState } from 'react'
import WebChatWidget, { WebChatWidgetMessage } from '@/components/comhub/WebChatWidget'

interface OnboardingApiMessage {
  id: string
  author: WebChatWidgetMessage['author']
  body: string
  sentAt: string
}

// Floating bottom-right chat for a business still on the onboarding
// link/wizard — talking directly to Full Loop, not to their own (nonexistent
// yet) customers. Every message ties to the real tenant via the same signed
// onboarding token /api/tenant-profile uses (see /api/onboarding/messages),
// so it shows up in /admin/tenant-chats tagged to this business, never as an
// anonymous "Unknown" contact.
export default function OnboardingChatWidget({ token, tenantName }: { token?: string; tenantName: string }) {
  const [initialMessages, setInitialMessages] = useState<WebChatWidgetMessage[]>([])
  const [ready, setReady] = useState(false)

  const apiUrl = useCallback(
    (base: string) => (token ? `${base}?token=${encodeURIComponent(token)}` : base),
    [token],
  )

  useEffect(() => {
    fetch(apiUrl('/api/onboarding/messages'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { messages?: OnboardingApiMessage[] } | null) => setInitialMessages(d?.messages || []))
      .catch(() => {})
      .finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleSend = useCallback(async ({ body }: { body: string }) => {
    const res = await fetch('/api/onboarding/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, body }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send')
  }, [token])

  const pollForReplies = useCallback(async (): Promise<WebChatWidgetMessage[] | void> => {
    const res = await fetch(apiUrl('/api/onboarding/messages'))
    if (!res.ok) return
    const data = await res.json() as { messages?: OnboardingApiMessage[] }
    return (data.messages || []).filter((m) => m.author !== 'customer')
  }, [apiUrl])

  if (!ready) return null

  return (
    <WebChatWidget
      tenantName="Full Loop"
      statusLine="Chat with the Full Loop team"
      greeting={`Hey${tenantName ? ` ${tenantName}` : ''} — questions about the profile, onboarding, or anything else? Message us directly, we're a real person on the other end.`}
      pulse
      initialMessages={initialMessages}
      onSend={handleSend}
      pollForReplies={pollForReplies}
    />
  )
}
