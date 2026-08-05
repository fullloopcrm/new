'use client'

import { useEffect, useRef, useState } from 'react'

export interface WebChatWidgetMessage {
  id: string
  author: 'customer' | 'admin' | 'system' | 'yinez' | 'cleaner'
  body: string
  imageUrl?: string
  sentAt: string
}

interface WebChatWidgetProps {
  tenantName: string
  accentColor?: string
  brandColor?: string
  logoUrl?: string
  /** Embedded-only: the tenant's own logo, shown standalone above the bubbles (not inside one). */
  tenantLogoUrl?: string
  greeting?: string
  initialMessages?: WebChatWidgetMessage[]
  onSend?: (message: { body: string; imageDataUrl?: string; visitorName?: string; visitorPhone?: string }) => Promise<WebChatWidgetMessage[] | void>
  /** Anonymous public widgets only (not the authenticated portal chat, which
   *  already knows who the visitor is). Blocks the composer behind a short
   *  name + optional phone form so every conversation reaching ComHub is
   *  tied to a real name instead of showing up as "Unknown". Captured once
   *  per browser (localStorage) and re-sent with every message so the
   *  backend can attach it to the comhub_contacts row. */
  requireIdentity?: boolean
  /** Polled every 10s while the panel is open. Return only NEW non-customer
   *  messages (e.g. an admin reply from ComHub) — the widget already renders
   *  the visitor's own messages optimistically, so echoing them back here
   *  would duplicate them. */
  pollForReplies?: () => Promise<WebChatWidgetMessage[] | void>
  /** Renders boxless — no card, no header bar, no bordered composer — just two
   *  intro bubbles and a free-floating input sitting directly on the page.
   *  For embedding inside a page layout (e.g. a hero's side column) instead of
   *  the usual floating bottom-right panel. */
  embedded?: boolean
  /** Adds a pulsating glow ring around the floating launcher orb. No effect when embedded. */
  pulse?: boolean
  /** Embedded-only: the "other side" intro bubble (left, brand-icon avatar). */
  agentIntro?: string
  /** Embedded-only: the "us" intro bubble (right, photo/orb avatar). */
  selfIntro?: string
  /** Non-embedded header subtitle, next to the live-status dot. */
  statusLine?: string
  /** Embedded-only: placeholder for the free-floating input. */
  composerPlaceholder?: string
  /** Embedded-only: tappable starter prompts shown until the visitor sends their first message. */
  quickReplies?: string[]
}

const DEFAULT_GREETING = "Hey — questions about pricing, availability, or your booking? Send a message, or a photo, and we'll get right back to you."
const DEFAULT_AGENT_INTRO = "Have a question? A real human's here, live. No AI, Crazy Concept..."
const DEFAULT_SELF_INTRO = "We'd love to help you."
const DEFAULT_COMPOSER_PLACEHOLDER = "Ask us anything..."
const DEFAULT_STATUS_LINE = "Real human, live"
const DEFAULT_QUICK_REPLIES = ['I have a question', 'I need help']
// Origin-scoped (localStorage is already per-domain, and every tenant lives
// on its own domain), so one fixed key is enough — no cross-tenant leakage.
const VISITOR_IDENTITY_KEY = 'fl_webchat_visitor_identity'
// Shown as actual message bubbles (not just composer placeholder text, which
// is easy to miss once the marketing greeting bubble above it invites
// visitors to just type their question) — asked one at a time, name first
// then phone, so a dropped connection mid-chat still leaves us a way to
// follow up. The first thing a visitor sees when requireIdentity is on and
// we don't know who they are yet.
const NAME_PROMPT = "What's your name?"
const PHONE_PROMPT = "What's your phone number?"

// Pure, no side effects — pulled out of the component so they're
// unit-testable without rendering. A visitor who ignores the prompt and
// just asks their question should never have that question mistaken for
// their name or phone number (captureIdentityStep below is what used to
// accept anything as the whole name+phone reply in one shot).
export function isPlausibleName(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const wordCount = t.split(/\s+/).filter(Boolean).length
  return wordCount <= 5 && t.length <= 50 && !/[?!]/.test(t)
}

export function extractPhone(text: string): string | null {
  const m = text.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  return m ? m[0].trim() : null
}
// Flat pastel fill for the agent/left bubble — a light tint standing in for
// the reference screenshot's pink, adapted to the tenant's own warm palette.
const AGENT_TINT = '#FBE3D2'
const POLL_INTERVAL_MS = 10_000

function BrandMonogram({ className }: { className?: string }) {
  return <span className={`font-bold tracking-tight leading-none select-none ${className || ''}`}>FL</span>
}

/** Animated gradient orb — stands in for a real agent photo until one's provided.
 *  A slow-spinning conic gradient reads as "live" without needing an icon library. */
function LiveOrb({ accentColor, brandColor, size = 'md' }: { accentColor: string; brandColor: string; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14' : 'w-9 h-9'
  return (
    <div className={`relative ${dim} shrink-0 rounded-full`}>
      <div
        className="absolute inset-0 rounded-full animate-[spin_6s_linear_infinite]"
        style={{ background: `conic-gradient(from 0deg, ${accentColor}, ${brandColor}, ${accentColor})` }}
      />
      <div className="absolute inset-[2px] rounded-full bg-white" />
      <div className="absolute inset-[5px] rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${accentColor}, ${brandColor})` }} />
    </div>
  )
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
  } catch {
    // Autoplay blocked or AudioContext unavailable — fail silently, the visual pop-in still happens.
  }
}

function TypingGlow({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: color, animationDelay: `${i * 180}ms` }}
        />
      ))}
    </div>
  )
}

export default function WebChatWidget({
  tenantName,
  accentColor = '#0d9488',
  brandColor = '#0f172a',
  logoUrl,
  tenantLogoUrl,
  greeting = DEFAULT_GREETING,
  initialMessages,
  onSend,
  pollForReplies,
  embedded = false,
  pulse = false,
  agentIntro = DEFAULT_AGENT_INTRO,
  selfIntro = DEFAULT_SELF_INTRO,
  statusLine = DEFAULT_STATUS_LINE,
  composerPlaceholder = DEFAULT_COMPOSER_PLACEHOLDER,
  quickReplies = DEFAULT_QUICK_REPLIES,
  requireIdentity = false,
}: WebChatWidgetProps) {
  const [open, setOpen] = useState(embedded)
  const [messages, setMessages] = useState<WebChatWidgetMessage[]>(initialMessages || [])
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const [introStep, setIntroStep] = useState(embedded ? 0 : 2)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [identityKnown, setIdentityKnown] = useState(!requireIdentity)
  const [identityStep, setIdentityStep] = useState<'name' | 'phone'>('name')
  const identityPrompt = identityStep === 'name' ? NAME_PROMPT : PHONE_PROMPT
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tells a hosting iframe (the SEO satellite microsites' embed script,
  // pointed at /widget) to resize itself between a small launcher footprint
  // and the full panel — a fixed-size iframe would otherwise leave a large
  // invisible click-catching rectangle over the host page even while
  // collapsed. No-op everywhere else: every real tenant site mounts this
  // directly on the page (window.self === window.top), so this never fires
  // there.
  useEffect(() => {
    if (typeof window === 'undefined' || window.self === window.top) return
    window.parent.postMessage({ source: 'fl-webchat', open }, '*')
  }, [open])

  useEffect(() => {
    if (!requireIdentity || typeof window === 'undefined') return
    try {
      const stored = JSON.parse(localStorage.getItem(VISITOR_IDENTITY_KEY) || 'null') as { name?: string; phone?: string } | null
      if (stored?.name) {
        setVisitorName(stored.name)
        setVisitorPhone(stored.phone || '')
        setIdentityKnown(true)
      }
    } catch {
      // Corrupt/blocked localStorage — fall back to asking again.
    }
  }, [requireIdentity])

  // Two sequential questions — name, then phone — asked one reply at a time.
  // A reply that doesn't plausibly answer the current question (a real
  // question instead of a name; no phone number found) leaves identityStep
  // unchanged so the same prompt keeps showing — the message still gets sent
  // through as a normal chat message either way so nothing typed is lost.
  function captureIdentityStep(text: string): { name?: string; phone?: string } {
    if (identityStep === 'name') {
      if (!isPlausibleName(text)) return {}
      const name = text.trim()
      setVisitorName(name)
      setIdentityStep('phone')
      return { name }
    }
    const phone = extractPhone(text)
    if (!phone) return {}
    setVisitorPhone(phone)
    setIdentityKnown(true)
    try {
      localStorage.setItem(VISITOR_IDENTITY_KEY, JSON.stringify({ name: visitorName, phone }))
    } catch {
      // Best-effort persistence — the returned value below still carries
      // this message's identity through to onSend either way.
    }
    return { phone }
  }

  // "Boop boop" — the two intro bubbles pop in one at a time on load, each
  // with a short beep, instead of both appearing instantly. Autoplay policies
  // may block the very first sound until the visitor has interacted with the
  // page at all (clicked/scrolled anywhere) — that's a browser restriction,
  // not a bug here.
  useEffect(() => {
    if (!embedded) return
    const t1 = setTimeout(() => { setIntroStep(1); playBeep() }, 500)
    const t2 = setTimeout(() => { setIntroStep(2); playBeep() }, 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending, open])

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  useEffect(() => {
    if (!pollForReplies) return
    const timer = setInterval(async () => {
      const fresh = await pollForReplies()
      if (!fresh || fresh.length === 0) return
      setMessages(prev => {
        const known = new Set(prev.map(m => m.id))
        const additions = fresh.filter(m => !known.has(m.id))
        if (additions.length === 0) return prev
        if (!open) setUnread(u => u + additions.length)
        return [...prev, ...additions]
      })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollForReplies])

  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setPendingImage({ dataUrl: reader.result as string, name: file.name })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSend(overrideText?: string) {
    const body = (overrideText ?? input).trim()
    if (!body && !pendingImage) return
    if (sending) return

    const outgoing: WebChatWidgetMessage = {
      id: `local-${Date.now()}`,
      author: 'customer',
      body,
      imageUrl: pendingImage?.dataUrl,
      sentAt: new Date().toISOString(),
    }
    setFailedIds(prev => {
      if (!prev.size) return prev
      const next = new Set(prev)
      next.delete(outgoing.id)
      return next
    })
    setMessages(prev => [...prev, outgoing])
    setInput('')
    const imageDataUrl = pendingImage?.dataUrl
    setPendingImage(null)
    setSending(true)

    const isIdentityReply = requireIdentity && !identityKnown && !!body
    const captured = isIdentityReply ? captureIdentityStep(body) : null
    const identity = { name: captured?.name ?? visitorName, phone: captured?.phone ?? visitorPhone }

    try {
      const reply = await onSend?.({ body, imageDataUrl, visitorName: identity.name || undefined, visitorPhone: identity.phone || undefined })
      if (reply) setMessages(prev => [...prev, ...reply])
    } catch {
      setFailedIds(prev => new Set(prev).add(outgoing.id))
    } finally {
      setSending(false)
    }
  }

  async function retrySend(msg: WebChatWidgetMessage) {
    if (sending) return
    setFailedIds(prev => {
      const next = new Set(prev)
      next.delete(msg.id)
      return next
    })
    setSending(true)
    try {
      const reply = await onSend?.({
        body: msg.body,
        imageDataUrl: msg.imageUrl?.startsWith('data:') ? msg.imageUrl : undefined,
        visitorName: visitorName || undefined,
        visitorPhone: visitorPhone || undefined,
      })
      if (reply) setMessages(prev => [...prev, ...reply])
    } catch {
      setFailedIds(prev => new Set(prev).add(msg.id))
    } finally {
      setSending(false)
    }
  }

  // White, rounded-2xl, shadow-lg — same surface language as the price cards
  // it sits beside. A small brand strip up top (no dedicated logo file exists
  // yet, so it's a wordmark in the hero's own display font).
  const panel = (
    <div
      className={`relative flex flex-col overflow-hidden bg-white rounded-2xl shadow-lg ${
        embedded ? 'w-full h-full' : 'w-[min(380px,calc(100vw-2.5rem))] h-[min(580px,calc(100vh-8rem))]'
      }`}
    >
      <div className="shrink-0 flex items-center justify-center py-3 border-b border-black/[0.05]">
        <span className="font-[family-name:var(--font-bebas)] text-lg text-[#CC6222] tracking-wide">FULL LOOP</span>
      </div>

      {/* Header */}
      <div className="relative shrink-0 flex items-center gap-3 px-5 pt-4 pb-4 border-b border-black/[0.06]">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-1 ring-black/5 shrink-0" />
        ) : (
          <LiveOrb accentColor={accentColor} brandColor={brandColor} size="lg" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[15px] text-slate-900 leading-tight truncate">{tenantName}</p>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            {statusLine}
          </p>
        </div>
        {!embedded && (
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="ml-auto w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors shrink-0 text-slate-400"
          >
            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Thread — modern rounded bubbles, warm orange tint on both sides */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-[#FFF8F3]">
        <div className="flex justify-start">
          <div className="max-w-[88%] bg-white border border-[#F3D9C4] shadow-sm text-slate-700 text-[15px] leading-relaxed rounded-[22px] px-4 py-3">
            {requireIdentity && !identityKnown ? identityPrompt : greeting}
          </div>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.author === 'customer' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[88%] text-[15px] leading-relaxed px-4 py-3 rounded-[22px] ${
                msg.author === 'customer' ? 'text-white' : 'bg-white border border-[#F3D9C4] shadow-sm text-slate-700'
              }`}
              style={
                msg.author === 'customer'
                  ? { background: `linear-gradient(135deg, ${accentColor}, ${brandColor})`, boxShadow: `0 8px 24px -8px ${accentColor}66`, opacity: failedIds.has(msg.id) ? 0.5 : 1 }
                  : undefined
              }
            >
              {msg.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.imageUrl}
                  alt="Attachment"
                  className="rounded-2xl mb-2 max-h-48 w-full object-cover"
                />
              )}
              {msg.body && <span>{msg.body}</span>}
            </div>
            {failedIds.has(msg.id) && (
              <button
                type="button"
                onClick={() => retrySend(msg)}
                className="mt-1 text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                Not sent — tap to retry
              </button>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#F3D9C4] shadow-sm rounded-[22px]">
              <TypingGlow color={accentColor} />
            </div>
          </div>
        )}
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="shrink-0 px-5 pt-3">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.dataUrl} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-black/5" />
            <button
              onClick={() => setPendingImage(null)}
              aria-label="Remove image"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Composer — a pill floating directly on the glass, no boxed toolbar */}
      <form
        onSubmit={e => { e.preventDefault(); handleSend() }}
        className="shrink-0 flex items-center gap-2 px-4 py-4"
      >
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach a photo"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors shrink-0"
        >
          <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 6.5a2 2 0 00-2.83 0L6.5 15.67a4 4 0 105.66 5.66l9.17-9.17a1 1 0 00-1.41-1.42l-9.17 9.17a2 2 0 11-2.83-2.83L16.5 8.09a4 4 0 015.66 5.66" />
          </svg>
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={requireIdentity && !identityKnown ? identityPrompt : 'Type a message...'}
          rows={1}
          className="flex-1 resize-none bg-black/[0.04] border border-black/[0.06] rounded-full px-4 py-2.5 text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-black/15 max-h-24"
        />
        <button
          type="submit"
          disabled={sending || (!input.trim() && !pendingImage)}
          aria-label="Send message"
          className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-30 shrink-0"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${brandColor})`, boxShadow: `0 4px 16px -4px ${accentColor}aa` }}
        >
          <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.4 20.4l17.45-8.4a1 1 0 000-1.8L3.4 1.8a1 1 0 00-1.4 1.05L4.2 11 2 18.55a1 1 0 001.4 1.85z" />
          </svg>
        </button>
      </form>
    </div>
  )

  if (embedded) {
    return (
      <div className="w-full flex flex-col gap-7">
        {/* Tenant logo — standalone, not inside a bubble */}
        {tenantLogoUrl && (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tenantLogoUrl} alt={tenantName} className="h-12 w-auto" />
          </div>
        )}

        {/* Hard-pixel height, NOT derived from flex-stretch — that was the bug:
            a flex-1/h-full container can still grow the whole row's height as
            content is added. A fixed px height on the scroll box itself is the
            only way to guarantee this area never changes size; new messages
            scroll inside it instead. */}
        <style>{`
          .fl-webchat-scroll::-webkit-scrollbar { width: 6px; }
          .fl-webchat-scroll::-webkit-scrollbar-track { background: #FBBF24; border-radius: 999px; }
          .fl-webchat-scroll::-webkit-scrollbar-thumb { background: #ffffff; border-radius: 999px; }
          .fl-webchat-scroll { scrollbar-color: #ffffff #FBBF24; scrollbar-width: thin; }
        `}</style>
        <div ref={scrollRef} className="fl-webchat-scroll overflow-y-auto flex flex-col gap-6 pr-6" style={{ height: 380 }}>
          <style>{`
            @keyframes fl-bubble-pop { 0% { opacity: 0; transform: scale(0.5) translateY(8px); } 60% { opacity: 1; transform: scale(1.05) translateY(0); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
            .fl-bubble-pop { animation: fl-bubble-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
          `}</style>

          {/* Left — the other side of the chat: flat pastel bubble, no avatar */}
          {introStep >= 1 && (
            <div className="flex items-end fl-bubble-pop">
              <div className="max-w-[78%] text-base leading-relaxed px-6 py-4 rounded-[26px]" style={{ backgroundColor: AGENT_TINT, color: '#3F1D0B' }}>
                {requireIdentity && !identityKnown ? identityPrompt : agentIntro}
              </div>
            </div>
          )}

          {/* Right — us: flat neutral bubble */}
          {introStep >= 2 && (
            <div className="flex items-end justify-end fl-bubble-pop">
              <div className="max-w-[78%] text-base leading-relaxed px-6 py-4 rounded-[26px] bg-[#F1F1F1] text-slate-800">
                {selfIntro}
              </div>
            </div>
          )}

          {/* Real thread continues in the same flat bubble style */}
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.author === 'customer' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[78%] text-base leading-relaxed px-6 py-4 rounded-[26px] ${
                  msg.author === 'customer' ? 'bg-[#F1F1F1] text-slate-800' : ''
                }`}
                style={{
                  ...(msg.author !== 'customer' ? { backgroundColor: AGENT_TINT, color: '#3F1D0B' } : {}),
                  opacity: failedIds.has(msg.id) ? 0.5 : 1,
                }}
              >
                {msg.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.imageUrl} alt="Attachment" className="rounded-2xl mb-2 max-h-48 w-full object-cover" />
                )}
                {msg.body && <span>{msg.body}</span>}
              </div>
              {failedIds.has(msg.id) && (
                <button
                  type="button"
                  onClick={() => retrySend(msg)}
                  className="mt-1 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  Not sent — tap to retry
                </button>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-[26px]" style={{ backgroundColor: AGENT_TINT }}>
                <TypingGlow color={accentColor} />
              </div>
            </div>
          )}

        </div>

        {/* Free-flowing input — no button. Enter sends; a muted enter-glyph hints at it. */}
        <form onSubmit={e => { e.preventDefault(); handleSend() }} className="shrink-0 relative">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={requireIdentity && !identityKnown ? identityPrompt : composerPlaceholder}
            className="w-full bg-white shadow-md rounded-full pl-5 pr-12 py-3 text-[15px] text-slate-800 placeholder-slate-400 focus:outline-none focus:shadow-lg transition-shadow"
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-lg select-none pointer-events-none"
            style={{ color: input.trim() ? accentColor : '#cbd5e1' }}
          >
            &#9166;
          </span>
        </form>

        <a
          href="https://www.fullloopcrm.com"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center justify-end gap-1.5 text-yellow-400 hover:text-yellow-300 transition-colors pr-1"
        >
          <span className="text-xs">Powered by</span>
          <span style={{ fontFamily: 'var(--display)', fontSize: '19px', fontWeight: 500, letterSpacing: '-0.025em' }}>
            Full Loop CRM
          </span>
        </a>
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col items-end gap-3 font-[family-name:var(--font-inter,inherit)]">
      {open && panel}

      {!open && (
        <span className="rounded-full bg-slate-950 text-white text-[11px] font-semibold tracking-wide px-3 py-1 shadow-lg">
          Human Chat
        </span>
      )}

      {/* Launcher — gradient-ring orb, no flat icon-in-circle */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        className="relative w-16 h-16 rounded-full transition-transform hover:scale-105 active:scale-95"
      >
        {pulse && !open && (
          <span
            className="absolute -inset-1.5 rounded-full animate-ping opacity-60"
            style={{ background: `conic-gradient(from 0deg, ${accentColor}, ${brandColor}, ${accentColor})` }}
          />
        )}
        <div className="absolute inset-0 rounded-full animate-[spin_6s_linear_infinite]" style={{ background: `conic-gradient(from 0deg, ${accentColor}, ${brandColor}, ${accentColor})` }} />
        <div className="absolute inset-[3px] rounded-full bg-slate-950 flex items-center justify-center">
          {open ? (
            <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/full-loop-icon.svg" alt="" className="w-9 h-9" />
          )}
        </div>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-950">
            {unread}
          </span>
        )}
      </button>
    </div>
  )
}
