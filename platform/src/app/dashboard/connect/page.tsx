'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatBubble, DateDivider, NewMessagesDivider, ChatInput } from '@/components/chat-bubble'
import type { ChatMessage } from '@/components/chat-bubble'
import './loop-connect.css'

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
    const d = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    if (d !== currentDate) {
      currentDate = d
      groups.push({ date: d, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
}

type Tab = 'chat' | 'announcements' | 'directory'
const TABS: Array<{ key: Tab; letter: string; label: string }> = [
  { key: 'chat', letter: 'A', label: 'Chat' },
  { key: 'announcements', letter: 'B', label: 'Announcements' },
  { key: 'directory', letter: 'C', label: 'Directory' },
]

export default function LoopConnectPage() {
  const [tab, setTab] = useState<Tab>('chat')
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

  const fetchChannels = useCallback(() => {
    fetch('/api/connect/channels')
      .then((r) => r.json())
      .then((data) => {
        if (data.channels) {
          setChannels(data.channels)
          if (!activeChannelId && data.channels.length > 0) {
            const general = data.channels.find((c: Channel) => c.type === 'general')
            setActiveChannelId(general?.id || data.channels[0].id)
          }
        }
      })
      .catch(() => {})
  }, [activeChannelId])

  const fetchMessages = useCallback(() => {
    if (!activeChannelId) return
    fetch(`/api/connect/messages?channel_id=${activeChannelId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          const oldLen = messages.length
          setMessages(data.messages)
          if (oldLen > 0 && data.messages.length > oldLen) {
            lastReadRef.current = messages[messages.length - 1]?.created_at || null
          }
        }
      })
      .catch(() => {})
  }, [activeChannelId, messages])

  useEffect(() => { fetchChannels() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeChannelId) return
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [activeChannelId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(fetchChannels, 15000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      setDraft(body)
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
    <div className="lc-scope">
      <div className="lc-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`lc-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)} type="button">
            <span className="lc-tab-letter">{t.letter}</span>
            {t.label}
            {t.key === 'chat' && channels.length > 0 && <span className="lc-tab-count">{channels.length}</span>}
          </button>
        ))}
      </div>

      {tab !== 'chat' && (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--lc-canvas)', border: '1px dashed var(--lc-line)', borderRadius: 4, color: 'var(--lc-muted)' }}>
          <div style={{ fontFamily: 'var(--lc-display)', fontSize: 24, color: 'var(--lc-ink)', fontWeight: 500, marginBottom: 8, letterSpacing: '-0.02em' }}>Coming soon.</div>
          <div>{TABS.find((t) => t.key === tab)?.label} view will land next pass.</div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="lc-shell">
          <aside className="lc-sidebar">
            <div className="lc-search-box">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search channels…"
                className="lc-search-input"
              />
            </div>
            <div className="lc-channel-list">
              {generalChannels.map((ch) => (
                <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onClick={() => { setActiveChannelId(ch.id); lastReadRef.current = null }} />
              ))}
              {clientChannels.length > 0 && <div className="lc-channel-section">Clients</div>}
              {clientChannels.map((ch) => (
                <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onClick={() => { setActiveChannelId(ch.id); lastReadRef.current = null }} />
              ))}
              {customChannels.length > 0 && <div className="lc-channel-section">Custom</div>}
              {customChannels.map((ch) => (
                <ChannelItem key={ch.id} channel={ch} active={ch.id === activeChannelId} onClick={() => { setActiveChannelId(ch.id); lastReadRef.current = null }} />
              ))}
            </div>
            <div className="lc-channel-foot">
              {showNewChannel ? (
                <div className="lc-new-row">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createChannel()}
                    placeholder="Channel name"
                    className="lc-new-input"
                    autoFocus
                  />
                  <button className="lc-new-add" type="button" onClick={createChannel}>Add</button>
                  <button className="lc-new-cancel" type="button" onClick={() => setShowNewChannel(false)}>×</button>
                </div>
              ) : (
                <button className="lc-new-btn" type="button" onClick={() => setShowNewChannel(true)}>+ New channel</button>
              )}
            </div>
          </aside>

          <div className="lc-main">
            {activeChannel && (
              <div className="lc-channel-head">
                <span className="lc-channel-head-name">
                  {activeChannel.type === 'general' && <span style={{ color: 'var(--lc-muted)', fontFamily: 'var(--lc-mono)', fontWeight: 400, marginRight: 4 }}>#</span>}
                  {activeChannel.name}
                </span>
                <span className="lc-channel-head-meta">
                  {activeChannel.type === 'client' ? 'Private channel' : activeChannel.type === 'general' ? 'Everyone' : 'Custom'}
                </span>
              </div>
            )}

            <div className="lc-messages">
              {messages.length === 0 && (
                <div className="lc-empty">No messages yet. Start the conversation.</div>
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

            {activeChannel && (
              <div className="lc-input-bar">
                <ChatInput
                  value={draft}
                  onChange={setDraft}
                  onSend={sendMessage}
                  placeholder={`Message ${activeChannel.type === 'general' ? '#' + activeChannel.name : activeChannel.name}…`}
                  disabled={sending}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChannelItem({ channel, active, onClick }: { channel: Channel; active: boolean; onClick: () => void }) {
  return (
    <button className={`lc-channel ${active ? 'active' : ''}`} onClick={onClick} type="button">
      <div className="lc-channel-row">
        <span className="lc-channel-name">
          {channel.type === 'general' && <span className="hash">#</span>}
          {channel.name}
        </span>
        {channel.last_message && (
          <span className="lc-channel-time">{formatPreviewTime(channel.last_message.created_at)}</span>
        )}
      </div>
      {channel.last_message && (
        <div className="lc-channel-preview">{channel.last_message.sender_name}: {channel.last_message.body}</div>
      )}
    </button>
  )
}
