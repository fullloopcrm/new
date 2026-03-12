'use client'

import { useEffect, useState, useRef } from 'react'

type Conversation = {
  id: string
  client_id: string
  status: string
  last_message_at: string
  clients: { name: string; phone: string } | null
}

type Message = {
  id: string
  direction: string
  message: string
  created_at: string
}

export default function SmsInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations list
  async function fetchConversations() {
    try {
      const res = await fetch('/api/sms')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch {
      // silent
    }
  }

  // Fetch messages for selected conversation
  async function fetchMessages(conversationId: string) {
    try {
      const res = await fetch(`/api/sms?conversation_id=${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch {
      // silent
    }
  }

  // Load conversations on mount + poll every 10s
  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 10000)
    return () => clearInterval(interval)
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    } else {
      setMessages([])
    }
  }, [selectedConversation])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!newMessage.trim() || !selectedConversation || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: selectedConversation.id,
          message: newMessage.trim(),
        }),
      })
      if (res.ok) {
        setNewMessage('')
        fetchMessages(selectedConversation.id)
        fetchConversations()
      }
    } catch {
      // silent
    } finally {
      setSending(false)
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function formatTimestamp(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.clients?.name?.toLowerCase().includes(q) ||
      c.clients?.phone?.includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SMS Inbox</h1>
          <p className="text-sm text-slate-400">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Left Panel - Conversation List */}
        <div className="w-80 shrink-0 border border-slate-200 rounded-lg bg-white flex flex-col">
          <div className="p-3 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                {search ? 'No matching conversations.' : 'No conversations yet.'}
              </div>
            ) : (
              filtered.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    selectedConversation?.id === convo.id ? 'bg-teal-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {convo.clients?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">
                      {formatTime(convo.last_message_at)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {convo.clients?.phone || '—'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Message Thread */}
        <div className="flex-1 border border-slate-200 rounded-lg bg-white flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="px-5 py-3 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                  {selectedConversation.clients?.name || 'Unknown'}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedConversation.clients?.phone || '—'}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-slate-400 mt-10">
                    No messages in this conversation.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound'
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[70%]">
                          <div
                            className={`px-4 py-2 rounded-2xl text-sm ${
                              isOutbound
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            {msg.message}
                          </div>
                          <p
                            className={`text-[11px] text-slate-400 mt-1 ${
                              isOutbound ? 'text-right' : 'text-left'
                            }`}
                          >
                            {formatTimestamp(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input */}
              <div className="px-4 py-3 border-t border-slate-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3 text-slate-300">
                  <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-400">
                  {conversations.length === 0
                    ? 'No conversations yet. SMS conversations will appear here when clients message you.'
                    : 'Select a conversation to view messages.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
