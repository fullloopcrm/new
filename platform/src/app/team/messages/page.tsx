'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTeamAuth } from '../layout'

// 1:1 thread between a team member and the office. Messages route through Comhub
// (see /api/team-portal/messages), so anything sent here lands in the office's
// Comhub inbox and staff can reply by SMS or web. Distinct from /team/connect,
// which is the tenant-wide group channel.

type OfficeMessage = {
  id: string
  direction: 'in' | 'out' | 'auto' | 'system'
  author: 'customer' | 'yinez' | 'admin' | 'system' | 'cleaner' | 'office'
  body: string | null
  sent_at: string
}

export default function TeamMessagesPage() {
  const { auth, t } = useTeamAuth()
  const [messages, setMessages] = useState<OfficeMessage[]>([])
  const [composer, setComposer] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  const token = auth?.token ?? null

  const fetchMessages = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/team-portal/messages', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      /* keep last good state */
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchMessages()
    const interval = setInterval(() => fetchMessages(), 5000)
    return () => clearInterval(interval)
  }, [token, fetchMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const send = async () => {
    if (!token || !composer.trim() || sending) return
    setSending(true)
    const body = composer.trim()
    setComposer('')
    try {
      const res = await fetch('/api/team-portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        setComposer(body)
      } else {
        fetchMessages()
      }
    } catch {
      setComposer(body)
    } finally {
      setSending(false)
    }
  }

  if (!auth) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        {t('Please log in to message the office.', 'Inicia sesión para enviar mensajes a la oficina.')}
      </div>
    )
  }

  const fmtTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) +
        ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return iso
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      <div className="mb-3">
        <h1 className="text-lg font-bold text-slate-800">{t('Messages with Office', 'Mensajes con la Oficina')}</h1>
        <p className="text-xs text-slate-400">
          {t('Anything you send here goes to the office team.', 'Lo que envíes aquí llega al equipo de la oficina.')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200 px-3 py-3 space-y-3">
        {loading && <div className="text-sm text-slate-400">{t('Loading…', 'Cargando…')}</div>}
        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-slate-400 text-center">
            {t('No messages yet. Say something to the office.', 'No hay mensajes aún. Escribe a la oficina.')}
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.author === 'cleaner'
          const isAuto = m.author === 'yinez' || m.direction === 'auto'
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] min-w-0">
                <div
                  className={`rounded-2xl px-4 py-2 break-words ${
                    isMine
                      ? 'bg-green-600 text-white'
                      : isAuto
                      ? 'bg-violet-100 text-violet-900'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body || ''}</div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 px-1">
                  {isMine ? t('You', 'Tú') : isAuto ? t('Auto', 'Auto') : t('Office', 'Oficina')} · {fmtTime(m.sent_at)}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="mt-3 pb-16 flex gap-2">
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          placeholder={t('Message the office…', 'Escribe a la oficina…')}
          rows={2}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-green-500"
        />
        <button
          onClick={send}
          disabled={!composer.trim() || sending}
          className="px-4 bg-green-600 hover:bg-green-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-sm font-medium"
        >
          {sending ? t('Sending…', 'Enviando…') : t('Send', 'Enviar')}
        </button>
      </div>
    </div>
  )
}
