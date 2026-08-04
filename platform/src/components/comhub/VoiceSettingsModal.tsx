'use client'

import { useEffect, useState } from 'react'

type RingStrategy = 'browser_only' | 'cell_only' | 'browser_then_cell' | 'simultaneous'
type CallerIdMode = 'show_customer' | 'show_business'

interface VoiceSettings {
  ring_strategy: RingStrategy
  caller_id_mode: CallerIdMode
  auto_record: boolean
  auto_transcribe: boolean
  fallback_cell_phone: string | null
  do_not_disturb_until: string | null
}

const DEFAULT_SETTINGS: VoiceSettings = {
  ring_strategy: 'browser_then_cell',
  caller_id_mode: 'show_customer',
  auto_record: true,
  auto_transcribe: true,
  fallback_cell_phone: null,
  do_not_disturb_until: null,
}

// 'simultaneous' is a real value in the schema/API but isn't offered here --
// the backend doesn't do true concurrent dialing yet (it needs to track
// multiple live admin call legs per customer call, which the current
// single-admin-leg-at-a-time model doesn't support). Don't offer a choice
// that quietly falls back to browser_then_cell instead of doing what it says.
const RING_STRATEGY_LABEL: Record<Exclude<RingStrategy, 'simultaneous'>, string> = {
  browser_only: 'Browser only — only ring the softphone when I’m logged into ComHub',
  cell_only: 'Cell only — always ring my cell, skip the browser softphone',
  browser_then_cell: 'Browser, then cell — try the softphone first, fall back to my cell',
}

// DB stores an ISO timestamp; the <input type="datetime-local"> control needs
// the local-time "YYYY-MM-DDTHH:mm" form with no trailing Z/offset.
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default function VoiceSettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/comhub/voice/settings')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data?.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
      })
      .catch(() => { if (!cancelled) setError('Failed to load settings') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/comhub/voice/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
      } else {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
        setSavedAt(Date.now())
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(28,28,28,0.35)' }} onClick={onClose}>
      <div className="rounded-lg w-[520px] max-w-full p-5 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--color-loop-canvas)', border: '1px solid var(--color-loop-line-soft)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 500 }}>Voice settings</h3>
          <button onClick={onClose} className="hover:text-[var(--color-loop-ink)]" style={{ color: 'var(--color-loop-muted)' }}>✕</button>
        </div>

        {loading ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--color-loop-muted)' }}>Loading…</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Fallback cell phone</label>
              <input
                type="tel"
                value={settings.fallback_cell_phone ?? ''}
                onChange={e => setSettings(s => ({ ...s, fallback_cell_phone: e.target.value || null }))}
                placeholder="+1 555 555 5555"
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--color-loop-muted)' }}>Rings this number when you're not logged into ComHub.</p>
            </div>

            <div>
              <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Ring order</label>
              <select
                value={settings.ring_strategy}
                onChange={e => setSettings(s => ({ ...s, ring_strategy: e.target.value as RingStrategy }))}
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
              >
                {(Object.keys(RING_STRATEGY_LABEL) as Exclude<RingStrategy, 'simultaneous'>[]).map(key => (
                  <option key={key} value={key}>{RING_STRATEGY_LABEL[key]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Caller ID on outbound calls</label>
              <select
                value={settings.caller_id_mode}
                onChange={e => setSettings(s => ({ ...s, caller_id_mode: e.target.value as CallerIdMode }))}
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
              >
                <option value="show_customer">Show the customer's number</option>
                <option value="show_business">Show the business number</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase mb-1 block" style={{ fontFamily: 'var(--mono)', color: 'var(--color-loop-muted)' }}>Do not disturb until</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={toLocalInputValue(settings.do_not_disturb_until)}
                  onChange={e => setSettings(s => ({ ...s, do_not_disturb_until: fromLocalInputValue(e.target.value) }))}
                  className="flex-1 rounded-md px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--color-loop-bg)', border: '1px solid var(--color-loop-line-soft)' }}
                />
                {settings.do_not_disturb_until && (
                  <button
                    onClick={() => setSettings(s => ({ ...s, do_not_disturb_until: null }))}
                    className="px-3 py-1.5 rounded-md text-sm hover:bg-[var(--color-loop-bg)]"
                    style={{ border: '1px solid var(--color-loop-line-soft)', color: 'var(--color-loop-graphite)' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-loop-muted)' }}>While set, calls skip you and go straight to the next ring target.</p>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_record}
                onChange={e => setSettings(s => ({ ...s, auto_record: e.target.checked }))}
              />
              Record calls
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_transcribe}
                onChange={e => setSettings(s => ({ ...s, auto_transcribe: e.target.checked }))}
              />
              Transcribe calls
            </label>

            {error && <div className="text-xs" style={{ color: 'var(--color-loop-warn)' }}>{error}</div>}
            <div className="flex justify-end items-center gap-3 mt-2" style={{ fontFamily: 'var(--mono)' }}>
              {savedAt && !saving && <span className="text-xs" style={{ color: 'var(--color-loop-muted)' }}>Saved</span>}
              <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sm hover:bg-[var(--color-loop-bg)]" style={{ border: '1px solid var(--color-loop-line-soft)', color: 'var(--color-loop-graphite)' }}>Close</button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-1.5 rounded-md text-sm disabled:opacity-50"
                style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-canvas)' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
