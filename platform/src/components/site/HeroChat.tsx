'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PLACEHOLDERS = [
  'Need help? Tell us here...',
  'I need a deep cleaning this Saturday',
  'How much for a 2 bedroom?',
  'Do you serve Brooklyn?',
  'I need a move-out clean next week',
]

export default function HeroChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [quickReplies, setQuickReplies] = useState<string[]>(
    ['New client', 'Returning client']
  )
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [waitingForPhone, setWaitingForPhone] = useState(false)
  const [clientPhone, setClientPhone] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = messages.length > 0

  // Auto-scroll chat container
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, loading, quickReplies])

  // Rotate placeholders
  useEffect(() => {
    if (open) return
    const interval = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(interval)
  }, [open])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || loading) return

    // Handle "New client" vs "Returning client" selection
    if (msg === 'New client') {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: 'Welcome! Let\'s get you set up 😊 What kind of cleaning do you need?' },
      ])
      setInput('')
      setQuickReplies(['Regular cleaning', 'Deep cleaning', 'Move-in/move-out', 'Airbnb turnover'])
      return
    }

    if (msg === 'Returning client') {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: msg },
        { role: 'assistant', content: 'Welcome back! 😊 What\'s the phone number on your account? (10 digits)' },
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
          { role: 'assistant', content: 'Hmm, that doesn\'t look right — can you try your 10-digit phone number again?' },
        ])
        setInput('')
        return
      }
      setMessages(prev => [...prev, { role: 'user', content: msg }])
      setInput('')
      setLoading(true)
      setWaitingForPhone(false)
      setClientPhone(digits)

      // Look up the client via API
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Returning client checking in', sessionId, phone: digits }),
        })
        const data = await res.json()
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        setQuickReplies(data.quickReplies || [])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Text us at (212) 202-8400.' }])
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
        body: JSON.stringify({ message: msg, sessionId, ...(clientPhone ? { phone: clientPhone } : {}) }),
      })
      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)
      if (data.reply) setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setQuickReplies(data.quickReplies || [])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Text us at (212) 202-8400.' }])
      setQuickReplies([])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="w-full">
      {/* Chat messages */}
      {open && (
        <div ref={chatRef} className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl mb-3 h-[280px] md:h-[320px] overflow-y-auto">
          <div className="p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#A8F0DC] text-[#1E2A4A] rounded-br-md'
                    : 'bg-white/10 text-white rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white/60 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm">
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
                    className="bg-[#A8F0DC]/20 border border-[#A8F0DC]/40 text-[#A8F0DC] text-sm px-4 py-2 rounded-full hover:bg-[#A8F0DC]/30 hover:text-white transition-all">
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
              className="bg-white/10 border border-white/20 text-white/80 text-sm px-4 py-2 rounded-full hover:bg-white/20 hover:text-white transition-all">
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send() }} className="flex items-center gap-3">
        <div className="flex-1">
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={open ? 'Type a message...' : PLACEHOLDERS[placeholderIdx]}
            className="w-full bg-white border-2 border-yellow-400 rounded-xl px-5 py-4 text-[#1E2A4A] placeholder-gray-400 text-base font-medium focus:outline-none focus:border-yellow-300 focus:ring-2 focus:ring-yellow-400/50 transition-all shadow-lg shadow-yellow-400/20"
            disabled={loading} />
        </div>
        <button type="submit" disabled={loading || !input.trim()}
          className="bg-transparent px-10 py-4 rounded-xl font-black text-base tracking-widest uppercase hover:bg-yellow-400 hover:text-[#1E2A4A] transition-all disabled:text-white/50 disabled:border-yellow-400/50 disabled:cursor-not-allowed shrink-0 shadow-xl shadow-yellow-400/20 border-2 border-yellow-400 text-white">
          Chat
        </button>
      </form>

      {/* Feedback link — always visible when chat is open */}
      {open && (
        <div className="mt-3 text-center">
          <a href="/feedback" target="_blank" rel="noopener noreferrer" className="text-white/40 text-xs hover:text-white/70 transition-colors underline underline-offset-2">
            Anonymous Feedback
          </a>
        </div>
      )}
    </div>
  )
}
