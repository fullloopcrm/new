'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTeamAuth } from '../layout'
import { ChatBubble, DateDivider, ChatInput } from '@/components/chat-bubble'
import type { ChatMessage } from '@/components/chat-bubble'

function groupMessagesByDate(messages: ChatMessage[]): { date: string; messages: ChatMessage[] }[] {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''
  for (const msg of messages) {
    const d = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    if (d !== currentDate) {
      currentDate = d
      groups.push({ date: d, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

export default function TeamConnectPage() {
  const { auth, t } = useTeamAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [channelId, setChannelId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(() => {
    if (!auth) return
    fetch('/api/team-portal/connect', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages)
        if (data.channel_id) setChannelId(data.channel_id)
      })
      .catch(() => {})
  }, [auth])

  useEffect(() => {
    if (!auth) return
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [auth, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMessage = async () => {
    if (!draft.trim() || !auth || sending) return
    setSending(true)
    const body = draft
    setDraft('')
    try {
      await fetch('/api/team-portal/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ body, channel_id: channelId }),
      })
      fetchMessages()
    } catch {
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  if (!auth) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        {t('Please log in to access Connect.', 'Inicia sesión para acceder a Connect.')}
      </div>
    )
  }

  const grouped = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <h1 className="text-lg font-bold text-slate-800 mb-3">
        {t('# General', '# General')}
      </h1>

      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200 px-3 py-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            {t('No messages yet', 'No hay mensajes aún')}
          </div>
        )}
        {grouped.map((group) => (
          <div key={group.date}>
            <DateDivider date={group.date} />
            {group.messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} variant="slack" />
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-3 pb-16">
        <ChatInput
          value={draft}
          onChange={setDraft}
          onSend={sendMessage}
          placeholder={t('Message #general...', 'Mensaje #general...')}
          disabled={sending}
        />
      </div>
    </div>
  )
}
