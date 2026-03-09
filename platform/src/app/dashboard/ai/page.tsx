'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const quickActions = [
  { label: 'Write a promo email', prompt: 'Write a promotional email for a 15% off first booking discount. Keep it short and compelling.' },
  { label: 'SMS reminder template', prompt: 'Write a friendly SMS reminder template for upcoming appointments. Include {name} and {business} merge tags.' },
  { label: 'Review request', prompt: 'Write a message asking a client to leave a Google review after a great service experience.' },
  { label: 'Follow-up after no-show', prompt: 'Write a professional but warm follow-up message for a client who missed their appointment.' },
  { label: 'Win-back campaign', prompt: 'Write an email campaign to re-engage clients who haven\'t booked in 60+ days.' },
  { label: 'New service announcement', prompt: 'Write an announcement for a new service we just added. Make it exciting but professional.' },
]

export default function SelenaAIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function send(text?: string) {
    const prompt = text || input.trim()
    if (!prompt) return

    const userMsg: Message = { role: 'user', content: prompt }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages([...newMessages, { role: 'assistant', content: data.message }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.error || 'Something went wrong. Make sure your Anthropic API key is configured.' }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to connect to AI. Check your ANTHROPIC_API_KEY in .env.local.' }])
    }
    setLoading(false)
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Selenas AI</h2>
          <p className="text-sm text-slate-400">Your AI assistant for campaigns, copy, and business strategy</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            className="text-xs text-slate-400 hover:text-slate-400 px-3 py-1.5 border border-slate-700 rounded-lg">
            Clear Chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl mb-4">
        {messages.length === 0 ? (
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✧</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Hey! I&apos;m Selenas.</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                I can help you write campaigns, client messages, service descriptions, and more.
                Ask me anything about growing your business.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-w-2xl mx-auto">
              {quickActions.map((qa) => (
                <button key={qa.label} onClick={() => send(qa.prompt)}
                  className="text-left bg-slate-700/50 hover:bg-slate-700 border border-slate-700 rounded-xl p-3 transition-colors">
                  <p className="text-sm font-medium text-slate-300">{qa.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${
                  m.role === 'user'
                    ? 'bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                    : 'bg-slate-700/50 text-white rounded-2xl rounded-bl-md px-4 py-2.5 border border-slate-700'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="relative group">
                      <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: m.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br />')
                        }}
                      />
                      <button onClick={() => copyText(m.content)}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-slate-400 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded transition-opacity">
                        Copy
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700/50 text-slate-400 rounded-2xl rounded-bl-md px-4 py-2.5 border border-slate-700 text-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask Selenas anything — campaign copy, client messages, business advice..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
          disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="bg-teal-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Send
        </button>
      </div>
    </div>
  )
}
