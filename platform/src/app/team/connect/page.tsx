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

type Channel = { id: string; name: string; type: string }
type Tab = 'general' | 'dm' | 'support'

export default function TeamConnectPage() {
  const { auth, t } = useTeamAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [tab, setTab] = useState<Tab>('general')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeChannelId = tab === 'general'
    ? channels.find((c) => c.type === 'general')?.id
    : tab === 'dm'
      ? channels.find((c) => c.type === 'dm')?.id
      : null // support uses its own endpoint, not connect_channels

  const fetchChannels = useCallback(() => {
    if (!auth) return
    fetch('/api/team-portal/connect/channels', { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => data.channels && setChannels(data.channels))
      .catch(() => {})
  }, [auth])

  const fetchMessages = useCallback(() => {
    if (!auth) return
    const url = tab === 'support' ? '/api/team-portal/support' : '/api/team-portal/connect'
    fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages)
      })
      .catch(() => {})
  }, [auth, tab])

  useEffect(() => {
    if (!auth) return
    fetchChannels()
  }, [auth, fetchChannels])

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
      if (tab === 'support') {
        await fetch('/api/team-portal/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ body }),
        })
      } else {
        await fetch('/api/team-portal/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
          body: JSON.stringify({ body, channel_id: activeChannelId }),
        })
      }
      fetchMessages()
    } catch {
      setDraft(body)
    } finally {
      setSending(false)
    }
  }

  const sendPhoto = async (file: File) => {
    if (!auth || tab === 'support' || !activeChannelId || sending) return
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
  const tabs: Array<{ key: Tab; label: string; placeholder: string }> = [
    { key: 'general', label: t('# General', '# General'), placeholder: t('Message #general...', 'Mensaje #general...') },
    { key: 'dm', label: t('Office', 'Oficina'), placeholder: t('Message the office...', 'Mensaje a la oficina...') },
    { key: 'support', label: t('Full Loop Support', 'Soporte Full Loop'), placeholder: t('Message Full Loop support...', 'Mensaje a soporte de Full Loop...') },
  ]
  const activeTab = tabs.find((tb) => tb.key === tab) || tabs[0]

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="flex gap-1 mb-3 bg-slate-100 rounded-lg p-1">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
              tab === tb.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

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
          onAttach={tab === 'support' ? undefined : sendPhoto}
          placeholder={activeTab.placeholder}
          disabled={sending}
        />
      </div>
    </div>
  )
}
