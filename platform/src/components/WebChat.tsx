'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function WebChat({ tenantId, accentColor = '#0d9488' }: { tenantId: string; accentColor?: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [quickReplies, setQuickReplies] = useState<string[]>(['New client', 'Returning client'])
  const [waitingForPhone, setWaitingForPhone] = useState(false)
  const [clientPhone, setClientPhone] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = messages.length > 0

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, loading, quickReplies])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return

    // Handle "New client" vs "Returning client" selection
    if (msg === 'New client') {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: 'Welcome! What kind of service do you need?' },
      ])
      setInput('')
      setQuickReplies(['Get a quote', 'Check availability', 'Learn more'])
      return
    }

    if (msg === 'Returning client') {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: 'Welcome back! What\'s the phone number on your account? (10 digits)' },
      ])
      setInput('')
      setQuickReplies([])
      setWaitingForPhone(true)
      return
    }

    // Handle phone number input for returning clients
    if (waitingForPhone) {
      const digits = msg.replace(/\D/g, '')
      if (digits.length !== 10) {
        setMessages(prev => [
          ...prev,
          { role: 'user', content: msg },
          { role: 'assistant', content: 'Hmm, that doesn\'t look right -- can you try your 10-digit phone number again?' },
        ])
        setInput('')
        return
      }
      setMessages(prev => [...prev, { role: 'user', content: msg }])
      setInput('')
      setLoading(true)
      setWaitingForPhone(false)
      setClientPhone(digits)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Returning client checking in', sessionId, phone: digits, tenantId }),
        })
        const data = await res.json()
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setQuickReplies(data.quickReplies || [])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please call us directly.' }])
        setQuickReplies([])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
      return
    }

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setQuickReplies([])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, sessionId, tenantId, ...(clientPhone ? { phone: clientPhone } : {}) }),
      })
      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setQuickReplies(data.quickReplies || [])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
      setQuickReplies([])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Chat messages */}
      {open && (
        <div ref={chatRef} className="bg-slate-50 border border-slate-200 rounded-2xl mb-3 h-[300px] overflow-y-auto">
          <div className="p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: accentColor } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-400 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            {/* Quick replies inside chat */}
            {!loading && quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {quickReplies.map(qr => (
                  <button key={qr} onClick={() => send(qr)}
                    className="border text-sm px-4 py-2 rounded-full hover:opacity-80 transition-all"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pre-chat quick prompts */}
      {!open && quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickReplies.map(qr => (
            <button key={qr} onClick={() => send(qr)}
              className="bg-slate-100 border border-slate-200 text-slate-700 text-sm px-4 py-2 rounded-full hover:bg-slate-200 transition-all"
            >
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={open ? 'Type a message...' : 'Need help? Start a chat...'}
          className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 transition-all"
          style={{ ['--tw-ring-color' as string]: accentColor } as React.CSSProperties}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
