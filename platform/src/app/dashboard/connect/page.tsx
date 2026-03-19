'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatBubble, DateDivider, NewMessagesDivider, ChatInput } from '@/components/chat-bubble'
import type { ChatMessage } from '@/components/chat-bubble'

type Channel = {
  id: string
  name: string
  type: string
  client_id: string | null
  last_message: { body: string; sender_name: string; created_at: string } | null
}

function formatPreviewTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function groupMessagesByDate(messages: ChatMessage[]): { date: string; messages: ChatMessage[] }[] {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  let currentDate = ''

  for (const msg of messages) {
    const d = new Date(msg.created_at).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    if (d !== currentDate) {
      currentDate = d
      groups.push({ date: d, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

export default function ConnectPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [newChannelName, setNewChannelName] = useState('')
  const [showNewChannel, setShowNewChannel] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastReadRef = useRef<string | null>(null)

  // Fetch channels
  const fetchChannels = useCallback(() => {
    fetch('/api/connect/channels')
      .then((r) => r.json())
      .then((data) => {
        if (data.channels) {
          setChannels(data.channels)
          // Auto-select general channel on first load
          if (!activeChannelId && data.channels.length > 0) {
            const general = data.channels.find((c: Channel) => c.type === 'general')
            setActiveChannelId(general?.id || data.channels[0].id)
          }
        }
      })
      .catch(() => {})
  }, [activeChannelId])

  // Fetch messages for active channel
  const fetchMessages = useCallback(() => {
    if (!activeChannelId) return
    fetch(`/api/connect/messages?channel_id=${activeChannelId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          const oldLen = messages.length
          setMessages(data.messages)
          // Track last read position for new messages divider
          if (oldLen > 0 && data.messages.length > oldLen) {
            lastReadRef.current = messages[messages.length - 1]?.created_at || null
          }
        }
      })
      .catch(() => {})
  }, [activeChannelId, messages.length])

  // Initial load
  useEffect(() => {
    fetchChannels()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll messages every 5s
  useEffect(() => {
    if (!activeChannelId) return
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [activeChannelId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll channels every 15s for last message updates
  useEffect(() => {
    const interval = setInterval(fetchChannels, 15000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const sendMessage = async () => {
    if (!draft.trim() || !activeChannelId || sending) return
    setSending(true)
    const body = draft
    setDraft('')
    try {
      await fetch('/api/connect/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: activeChannelId, body }),
      })
      fetchMessages()
    } catch {
      setDraft(body) // Restore on failure
    } finally {
      setSending(false)
    }
  }

  const createChannel = async () => {
    if (!newChannelName.trim()) return
    try {
      const res = await fetch('/api/connect/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName.trim(), type: 'custom' }),
      })
      const data = await res.json()
      if (data.channel) {
        setNewChannelName('')
        setShowNewChannel(false)
        fetchChannels()
        setActiveChannelId(data.channel.id)
      }
    } catch { /* ignore */ }
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId)
  const filteredChannels = search
    ? channels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : channels

  const generalChannels = filteredChannels.filter((c) => c.type === 'general')
  const clientChannels = filteredChannels.filter((c) => c.type === 'client')
  const customChannels = filteredChannels.filter((c) => c.type === 'custom')

  const grouped = groupMessagesByDate(messages)

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">Connect</h1>

      <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left panel — Channel list */}
        <div className="w-64 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full text-sm border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* General */}
            {generalChannels.map((ch) => (
              <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onClick={() => { setActiveChannelId(ch.id); lastReadRef.current = null }} />
            ))}

            {/* Client channels */}
            {clientChannels.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Clients</p>
              </div>
            )}
            {clientChannels.map((ch) => (
              <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onClick={() => { setActiveChannelId(ch.id); lastReadRef.current = null }} />
            ))}

            {/* Custom channels */}
            {customChannels.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Custom</p>
              </div>
            )}
            {customChannels.map((ch) => (
              <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onClick={() => { setActiveChannelId(ch.id); lastReadRef.current = null }} />
            ))}
          </div>

          {/* New channel button */}
          <div className="p-2 border-t border-slate-100">
            {showNewChannel ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createChannel()}
                  placeholder="Channel name"
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
                <button onClick={createChannel} className="text-xs bg-teal-600 text-white px-2 py-1 rounded">
                  Add
                </button>
                <button onClick={() => setShowNewChannel(false)} className="text-xs text-slate-400 px-1">
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewChannel(true)}
                className="w-full text-xs text-slate-400 hover:text-teal-600 py-1 text-left px-2"
              >
                + New channel
              </button>
            )}
          </div>
        </div>

        {/* Right panel — Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          {activeChannel && (
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">
                {activeChannel.type === 'general' ? '# ' : ''}{activeChannel.name}
              </span>
              <span className="text-xs text-slate-400">
                {activeChannel.type === 'client' ? 'Private channel' : activeChannel.type === 'general' ? 'Everyone' : ''}
              </span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No messages yet. Start the conversation!
              </div>
            )}
            {grouped.map((group) => (
              <div key={group.date}>
                <DateDivider date={group.date} />
                {group.messages.map((msg) => {
                  const showNewDivider =
                    lastReadRef.current && msg.created_at > lastReadRef.current && !group.messages.find((m) => m.created_at <= lastReadRef.current! && m.created_at > lastReadRef.current!)
                  return (
                    <div key={msg.id}>
                      {showNewDivider && <NewMessagesDivider />}
                      <ChatBubble msg={msg} variant="slack" />
                    </div>
                  )
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {activeChannel && (
            <div className="px-4 py-3 border-t border-slate-200">
              <ChatInput
                value={draft}
                onChange={setDraft}
                onSend={sendMessage}
                placeholder={`Message ${activeChannel.type === 'general' ? '#general' : activeChannel.name}...`}
                disabled={sending}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChannelItem({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors ${active ? 'bg-teal-50 border-r-2 border-teal-500' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm truncate ${active ? 'text-teal-700 font-semibold' : 'text-slate-700'}`}>
          {channel.type === 'general' ? '# ' : ''}{channel.name}
        </span>
        {channel.last_message && (
          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
            {formatPreviewTime(channel.last_message.created_at)}
          </span>
        )}
      </div>
      {channel.last_message && (
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {channel.last_message.sender_name}: {channel.last_message.body}
        </p>
      )}
    </button>
  )
}
