'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTeamAuth } from '../team-auth'
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

type PortalChannel = { id: string; name: string; type: string; last_message: { body: string; created_at: string } | null }

export default function TeamConnectPage() {
  const { auth, t } = useTeamAuth()
  const [channels, setChannels] = useState<PortalChannel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchChannels = useCallback(() => {
    if (!auth) return
    fetch('/api/team-portal/connect/channels', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (!data.channels) return
        setChannels(data.channels)
        setActiveChannelId((prev) => prev || data.channels[0]?.id || null)
      })
      .catch(() => {})
  }, [auth])

  const fetchMessages = useCallback(() => {
    if (!auth || !activeChannelId) return
    fetch(`/api/team-portal/connect?channel_id=${activeChannelId}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages)
      })
      .catch(() => {})
  }, [auth, activeChannelId])

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => {
    const id = setInterval(fetchChannels, 15000)
    return () => clearInterval(id)
  }, [fetchChannels])

  useEffect(() => {
    if (!auth || !activeChannelId) return
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [auth, activeChannelId, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMessage = async () => {
    if (!draft.trim() || !auth || !activeChannelId || sending) return
    setSending(true)
    const body = draft
    setDraft('')
    try {
      const res = await fetch('/api/team-portal/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ body, channel_id: activeChannelId }),
      })
      if (!res.ok) throw new Error('send failed')
      fetchMessages()
    } catch {
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  const sendPhoto = async (file: File) => {
    if (!auth || !activeChannelId || sending) return
    setSending(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('channel_id', activeChannelId)
      await fetch('/api/team-portal/connect/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: form,
      })
      fetchMessages()
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
  const activeChannel = channels.find((c) => c.id === activeChannelId)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <h1 className="text-lg font-bold text-slate-800 mb-3">
        {t('Message Admin', 'Mensaje al Administrador')}
      </h1>

      {channels.length > 1 && (
        <div className="flex gap-2 mb-2 overflow-x-auto">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChannelId(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${
                c.id === activeChannelId ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

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
          onAttach={sendPhoto}
          placeholder={activeChannel ? `${t('Message', 'Mensaje')} ${activeChannel.name}…` : t('Message #general...', 'Mensaje #general...')}
          disabled={sending}
        />
      </div>
    </div>
  )
}
