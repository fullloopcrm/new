'use client'

import { useEffect, useState, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Tenant {
  id: string
  name: string
}

export default function AdminAIPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/businesses')
      if (res.ok) {
        const data = await res.json()
        const businesses = data.businesses || data.tenants || []
        setTenants(businesses.map((b: Record<string, unknown>) => ({
          id: b.id as string,
          name: b.name as string,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err)
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!input.trim() || sending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const res = await fetch('/api/admin/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          tenantId: selectedTenant || undefined,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response || data.message || 'No response.',
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, aiMessage])
      }
    } catch {
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error. Please check your network and try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, aiMessage])
    }

    setSending(false)
  }

  function clearConversation() {
    setMessages([])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <main className="p-3 md:p-6">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </main>
    )
  }

  return (
    <main className="p-3 md:p-6 max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Selena AI</h1>
        <p className="text-sm text-gray-500 mt-1">Admin AI assistant with tenant context</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tenant Context</label>
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none bg-white"
          >
            <option value="">All Tenants (Global)</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={clearConversation}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Chat input at top */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mb-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTenant
              ? `Ask Selena about ${tenants.find(t => t.id === selectedTenant)?.name || 'this tenant'}...`
              : 'Ask Selena anything about the platform...'
            }
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-teal-600 outline-none resize-none"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors self-end"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        {selectedTenant && (
          <p className="text-xs text-teal-600 mt-2">
            Context: {tenants.find(t => t.id === selectedTenant)?.name}
          </p>
        )}
      </div>

      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-200 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">&#129302;</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Selena AI</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Ask me anything about your tenants, bookings, revenue, reviews, or the platform. Select a tenant above to narrow the context.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Show platform health summary',
                'Which tenants need attention?',
                'Revenue overview this month',
                'Tenants with low review ratings',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-gray-200 text-slate-900'
                }`}>
                  {msg.role === 'assistant' && (
                    <p className="text-xs font-medium text-teal-600 mb-1">Selena</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-teal-200' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-medium text-teal-600 mb-1">Selena</p>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </main>
  )
}
