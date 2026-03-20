'use client'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiAssistant() {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (expanded) inputRef.current?.focus()
  }, [expanded])

  // Hide Tawk.to widget on dashboard pages
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '#tawk-bubble-container, .tawk-min-container, iframe[title*="chat"] { display: none !important; }'
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    if (!expanded) setExpanded(true)

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to connect. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 md:left-44 right-0 z-50 flex flex-col bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      {/* Messages area — expandable */}
      {expanded && (
        <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-2 bg-slate-50">
          {messages.length === 0 && (
            <div className="text-center text-slate-400 text-xs py-2">
              Ask anything — &quot;who&apos;s working today?&quot;, &quot;show unpaid bookings&quot;, &quot;what&apos;s our revenue this month?&quot;
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-1.5 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-500">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar — always visible */}
      <div className="px-4 py-4 bg-white flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 shrink-0 p-1"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {expanded
              ? <path d="M6 9l6 6 6-6"/>
              : <path d="M18 15l-6-6-6 6"/>
            }
          </svg>
        </button>
        <div className="flex items-center gap-1.5 text-teal-600 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z"/>
          </svg>
          <span className="text-xs font-semibold hidden sm:inline">Selena</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask Selena anything... (bookings, clients, schedule, revenue)"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-slate-50"
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-lg px-3 py-3 shrink-0 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>
          </svg>
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setExpanded(false) }}
            className="text-slate-400 hover:text-slate-600 text-xs shrink-0 px-1"
            title="Clear chat"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
