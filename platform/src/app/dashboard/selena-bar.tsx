'use client'

import { useEffect, useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

// Sticky AI bar mounted on every dashboard page (replaces the prior
// AiAssistant for the Loop redesign). Cmd-/ focuses the input. Talks to
// /api/ai/assistant — same backend the old assistant used.
export default function SelenaBar() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Cmd-/ shortcut to focus the input from anywhere on the dashboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Hide Tawk.to widget — we have Selena instead.
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '#tawk-bubble-container, .tawk-min-container, iframe[title*="chat"] { display: none !important; }'
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const newMessages: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setOpen(true)
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages([...newMessages, { role: 'assistant', content: data.reply || data.text || 'No reply.' }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'Selena could not respond. Try again in a moment.' }])
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Network hiccup. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  const suggestions = ["Today's revenue", "Who's overdue?", 'Next week']

  return (
    <>
      {/* Expanded transcript panel — only when there are messages */}
      {open && messages.length > 0 && (
        <div
          className="fixed z-40 max-h-[400px] overflow-y-auto rounded-lg backdrop-blur"
          style={{
            left: '256px',
            right: '32px',
            bottom: '76px',
            maxWidth: '920px',
            margin: '0 auto',
            background: 'rgba(255,255,255,0.96)',
            border: '1px solid var(--color-loop-ink)',
            boxShadow: '0 8px 24px -4px rgba(28,28,28,0.18), 0 2px 6px rgba(28,28,28,0.06)',
          }}
          ref={scrollRef}
        >
          <div className="p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: m.role === 'user' ? 'var(--color-loop-ink)' : 'var(--color-loop-bg)',
                    color: m.role === 'user' ? 'var(--color-loop-canvas)' : 'var(--color-loop-ink)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-loop-bg)', color: 'var(--color-loop-muted)', fontFamily: 'var(--font-body)' }}>
                  Thinking…
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sticky bar */}
      <form
        onSubmit={onSubmit}
        className="fixed z-50 backdrop-blur"
        style={{
          left: '256px',
          right: '32px',
          bottom: '16px',
          maxWidth: '920px',
          margin: '0 auto',
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid var(--color-loop-ink)',
          borderRadius: '8px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 24px -4px rgba(28,28,28,0.18), 0 2px 6px rgba(28,28,28,0.06)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="Toggle transcript"
          className="w-[22px] h-[22px] inline-flex items-center justify-center rounded-[3px] transition-colors hover:bg-[var(--color-loop-bg)]"
          style={{ color: 'var(--color-loop-muted)', fontSize: '11px' }}
        >
          {open ? '⌄' : '⌃'}
        </button>
        <span className="inline-flex items-center gap-1.5" style={{ fontFamily: 'var(--display)', fontSize: '14px', fontWeight: 500, color: 'var(--color-loop-ink)', letterSpacing: '-0.01em' }}>
          <span
            className="w-[7px] h-[7px] rounded-full"
            style={{ background: 'var(--color-loop-good)', animation: 'loop-pulse-dot 2s infinite' }}
          />
          Selena
        </span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent border-none outline-none py-1.5"
          style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-loop-ink)' }}
          placeholder="Ask anything — bookings, clients, schedule, revenue…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {!input && messages.length === 0 && (
          <div className="hidden md:flex gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-[3px] cursor-pointer transition-colors hover:bg-[var(--color-loop-canvas)] hover:text-[var(--color-loop-ink)] hover:border-[var(--color-loop-ink)]"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10.5px',
                  padding: '4px 8px',
                  border: '1px solid var(--color-loop-line)',
                  color: 'var(--color-loop-muted)',
                  letterSpacing: '0.02em',
                  background: 'var(--color-loop-bg)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <span
          className="hidden sm:inline-block"
          style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            background: 'var(--color-loop-bg)',
            padding: '2px 6px',
            borderRadius: '3px',
            color: 'var(--color-loop-graphite)',
            border: '1px solid var(--color-loop-line-soft)',
            letterSpacing: '0.04em',
          }}
        >
          ⌘/
        </span>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          title="Send"
          className="w-8 h-8 rounded-[4px] inline-flex items-center justify-center transition-colors hover:bg-[var(--color-loop-graphite)] disabled:opacity-50"
          style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)', border: 'none', fontSize: '13px' }}
        >
          ↑
        </button>
      </form>
    </>
  )
}
