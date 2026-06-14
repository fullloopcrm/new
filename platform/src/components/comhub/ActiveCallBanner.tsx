'use client'

import React, { useCallback, useEffect, useState } from 'react'

type ActiveCall = {
  id: string
  customer_call_id: string
  admin_call_id: string | null
  thread_id: string
  contact_id: string
  customer_phone: string
  admin_phone: string | null
  direction: 'inbound' | 'outbound'
  status: 'ringing' | 'bridged' | 'voicemail'
  hold: boolean
  muted: boolean
  started_at: string
  answered_at: string | null
  duration_secs: number | null
}

const POLL_MS = 2000

function fmtPretty(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    const d = cleaned.slice(2)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return input
}

function fmtDuration(call: ActiveCall): string {
  const start = call.answered_at ? new Date(call.answered_at).getTime() : new Date(call.started_at).getTime()
  const secs = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ActiveCallBanner() {
  const [calls, setCalls] = useState<ActiveCall[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchActive() {
      try {
        const res = await fetch('/api/admin/comhub/voice/active', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { active_calls?: ActiveCall[] }
        if (!cancelled) setCalls(data.active_calls ?? [])
      } catch {
        // best-effort polling
      }
    }
    void fetchActive()
    const t = setInterval(fetchActive, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const drive = useCallback(
    async (call: ActiveCall, action: string, payload?: Record<string, unknown>) => {
      setWorking(`${call.id}:${action}`)
      setError(null)
      try {
        const res = await fetch('/api/admin/comhub/voice/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            active_call_id: call.id,
            action,
            payload: payload ?? {},
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || `${action} failed (${res.status})`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown error')
      } finally {
        setWorking(null)
      }
    },
    [],
  )

  if (calls.length === 0) return null

  return (
    <div className="sticky top-0 z-40 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 backdrop-blur-xl">
      {error && (
        <div className="px-4 py-1.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-200 text-xs">
          {error}
        </div>
      )}
      <div className="divide-y divide-white/5">
        {calls.map(call => (
          <CallRow
            key={call.id}
            call={call}
            working={working}
            onAction={drive}
          />
        ))}
      </div>
    </div>
  )
}

function CallRow({
  call,
  working,
  onAction,
}: {
  call: ActiveCall
  working: string | null
  onAction: (call: ActiveCall, action: string, payload?: Record<string, unknown>) => Promise<void>
}) {
  const isWorking = Boolean(working?.startsWith(`${call.id}:`))
  const live = call.status === 'bridged'

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
          {call.status === 'ringing' && (
            <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          )}
          <svg viewBox="0 0 24 24" fill="currentColor" className="relative h-3.5 w-3.5 text-emerald-300">
            {call.direction === 'inbound' ? (
              <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            ) : (
              <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            )}
          </svg>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono tabular-nums text-sm font-medium text-white truncate">
              {fmtPretty(call.customer_phone) || call.customer_phone}
            </span>
            <Pill>
              {call.direction === 'inbound' ? 'Inbound' : 'Outbound'}
            </Pill>
            {call.hold && <Pill tone="blue">On hold</Pill>}
            {call.muted && <Pill tone="amber">Muted</Pill>}
          </div>
          <div className="text-[11px] text-emerald-200/80 mt-0.5">
            {call.status === 'ringing' && <span>Ringing…</span>}
            {call.status === 'voicemail' && <span>Voicemail in progress</span>}
            {live && (
              <span className="font-mono tabular-nums">{fmtDuration(call)}</span>
            )}
            {call.admin_phone && live && (
              <span className="ml-2 text-emerald-200/50">via {call.admin_phone}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {live && (
          <>
            <ActionBtn
              onClick={() => onAction(call, call.hold ? 'unhold' : 'hold')}
              disabled={isWorking}
              active={call.hold}
              label={call.hold ? 'Resume' : 'Hold'}
            />
            <ActionBtn
              onClick={() => onAction(call, call.muted ? 'unmute' : 'mute')}
              disabled={isWorking}
              active={call.muted}
              label={call.muted ? 'Unmute' : 'Mute'}
            />
            <ActionBtn
              onClick={() => {
                const target = window.prompt('Transfer to (E.164 phone, e.g. +12125551234):')
                if (!target) return
                const blind = window.confirm('Blind transfer? OK = blind, Cancel = warm')
                void onAction(call, blind ? 'transfer_blind' : 'transfer_warm', { target })
              }}
              disabled={isWorking}
              active={false}
              label="Transfer"
            />
          </>
        )}
        <button
          type="button"
          onClick={() => onAction(call, 'hangup')}
          disabled={isWorking}
          className="h-7 px-3 rounded-md bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white text-[11px] font-medium tracking-wide transition-colors shadow-[0_2px_10px_rgba(244,63,94,0.3)]"
        >
          End
        </button>
      </div>
    </div>
  )
}

function ActionBtn({
  onClick,
  disabled,
  active,
  label,
}: {
  onClick: () => void
  disabled: boolean
  active: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 px-3 rounded-md text-[11px] font-medium tracking-wide transition-colors disabled:opacity-50 ${
        active
          ? 'bg-blue-500/20 border border-blue-400/40 text-blue-100'
          : 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/90'
      }`}
    >
      {label}
    </button>
  )
}

function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'blue' | 'amber'
}) {
  const cls = {
    neutral: 'bg-white/[0.08] text-white/70 border-white/10',
    blue: 'bg-blue-500/20 text-blue-100 border-blue-400/30',
    amber: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
  }[tone]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-[0.1em] border ${cls}`}>
      {children}
    </span>
  )
}
