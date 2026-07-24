'use client'

/**
 * Communications control center — one global tab, per-tenant data. Renders from
 * the canonical registry (lib/comms-registry.ts) so adding a comm there makes it
 * appear here automatically. Persists to tenants.notification_preferences via
 * /api/settings/notifications.
 *
 * Phase 1: full control surface (channel on/off, timing, per-trigger copy,
 * request-an-automation). The toggles don't gate live sends until Phase 2 wires
 * isCommEnabled() into the send paths.
 */
import { useEffect, useRef, useState } from 'react'
import {
  COMMS,
  COMM_TIMING,
  AUDIENCE_ORDER,
  AUDIENCE_LABEL,
  type CommChannel,
  type CommTimingKey,
} from '@/lib/comms-registry'
import type { CommPreferences, CommCapabilities, CommPolicy } from '@/lib/comms-prefs'

const CHANNELS: CommChannel[] = ['email', 'sms', 'in_app']
const CHANNEL_LABEL: Record<CommChannel, string> = { email: 'Email', sms: 'SMS', in_app: 'App' }

export default function CommunicationsTab() {
  const [prefs, setPrefs] = useState<CommPreferences | null>(null)
  const [caps, setCaps] = useState<CommCapabilities>({ email: true, sms: true })
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [openCopy, setOpenCopy] = useState<string | null>(null)
  const [reqOpen, setReqOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data) => {
        setPrefs(data.preferences)
        if (data.capabilities) setCaps(data.capabilities)
      })
      .catch(() => {})
  }, [])

  function persist(next: CommPreferences, debounce = false) {
    setPrefs(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const doSave = () => {
      fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: next }),
      })
        .then((r) => (r.ok ? setSavedAt(Date.now()) : null))
        .catch(() => {})
    }
    if (debounce) saveTimer.current = setTimeout(doSave, 600)
    else doSave()
  }

  function toggle(key: string, channel: CommChannel, value: boolean) {
    if (!prefs) return
    persist({
      ...prefs,
      comms: { ...prefs.comms, [key]: { ...prefs.comms[key], [channel]: value } },
    })
  }

  function setTemplate(key: string, field: 'subject' | 'body', value: string) {
    if (!prefs) return
    const cur = prefs.comms[key]?.template || {}
    persist(
      { ...prefs, comms: { ...prefs.comms, [key]: { ...prefs.comms[key], template: { ...cur, [field]: value } } } },
      true,
    )
  }

  function setTimingNumber(tk: CommTimingKey, value: number) {
    if (!prefs) return
    persist({ ...prefs, timing: { ...prefs.timing, [tk]: value } }, true)
  }

  function setTimingList(tk: CommTimingKey, values: number[]) {
    if (!prefs) return
    persist({ ...prefs, timing: { ...prefs.timing, [tk]: values } })
  }

  function setPolicyField<K extends keyof CommPolicy>(field: K, value: CommPolicy[K]) {
    if (!prefs) return
    persist({ ...prefs, policy: { ...prefs.policy, [field]: value } }, true)
  }

  if (!prefs) return <div className="text-sm text-slate-400">Loading communications…</div>

  const capFor = (c: CommChannel): boolean => (c === 'email' ? caps.email : c === 'sms' ? caps.sms : true)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Communications</h3>
          <p className="text-xs text-slate-400 mt-1">
            Control every automated message your business sends — turn each on or off per channel,
            set timing, and customize the wording.
          </p>
        </div>
        <span className="text-xs text-teal-600 min-w-[52px] text-right">
          {savedAt ? 'Saved' : ''}
        </span>
      </div>

      {(!caps.email || !caps.sms) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {!caps.sms && <div>SMS is off — connect Telnyx under <strong>Integrations</strong> to send texts.</div>}
          {!caps.email && <div>Email is off — connect Resend under <strong>Integrations</strong> to send email.</div>}
        </div>
      )}

      {AUDIENCE_ORDER.map((audience) => {
        const rows = COMMS.filter((c) => c.audience === audience)
        return (
          <div key={audience} className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {AUDIENCE_LABEL[audience]}
              </h4>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((def) => {
                const pref = prefs.comms[def.key] || {}
                const hasCopy = !!def.editableCopy
                const isOpen = openCopy === def.key
                return (
                  <div key={def.key} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-slate-900">{def.label}</p>
                          {def.locked && (
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                              Always on
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{def.desc}</p>
                      </div>
                      <div className="flex gap-3 shrink-0 pt-0.5">
                        {CHANNELS.filter((c) => def.channels.includes(c)).map((channel) => {
                          const available = capFor(channel)
                          const checked = def.locked
                            ? true
                            : (pref[channel] ?? def.defaults[channel] ?? false)
                          const disabled = def.locked || !available
                          return (
                            <label
                              key={channel}
                              title={!available ? `${CHANNEL_LABEL[channel]} not connected` : ''}
                              className={`flex items-center gap-1.5 text-xs ${disabled ? 'text-slate-300' : 'text-slate-500'}`}
                            >
                              <input
                                type="checkbox"
                                checked={!!checked}
                                disabled={disabled}
                                onChange={(e) => toggle(def.key, channel, e.target.checked)}
                                className="rounded border-slate-300"
                              />
                              {CHANNEL_LABEL[channel]}
                            </label>
                          )
                        })}
                      </div>
                    </div>

                    {def.timing && def.timing.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-4">
                        {def.timing.map((tk) => (
                          <TimingControl
                            key={tk}
                            tk={tk}
                            value={prefs.timing[tk]}
                            onNumber={(v) => setTimingNumber(tk, v)}
                            onList={(v) => setTimingList(tk, v)}
                          />
                        ))}
                      </div>
                    )}

                    {hasCopy && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setOpenCopy(isOpen ? null : def.key)}
                          className="text-xs text-teal-600 hover:underline"
                        >
                          {isOpen ? 'Hide message' : pref.template?.subject || pref.template?.body ? 'Edit message (customized)' : 'Customize message'}
                        </button>
                        {isOpen && (
                          <div className="mt-2 space-y-2 rounded-lg bg-slate-50 border border-slate-200 p-3">
                            {def.channels.includes('email') && (
                              <input
                                value={pref.template?.subject || ''}
                                onChange={(e) => setTemplate(def.key, 'subject', e.target.value)}
                                placeholder="Email subject (leave blank for default)"
                                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
                              />
                            )}
                            <textarea
                              value={pref.template?.body || ''}
                              onChange={(e) => setTemplate(def.key, 'body', e.target.value)}
                              rows={3}
                              placeholder="Message body (leave blank for default). Use {name}, {date}, {business} as placeholders."
                              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content & Policy</h4>
          <p className="text-xs text-slate-400 mt-1">
            Every automated message pulls these values in automatically — set them once here.
          </p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs text-slate-500">
              <span className="block mb-1">Support phone (shown in messages)</span>
              <input
                value={prefs.policy.supportPhone || ''}
                onChange={(e) => setPolicyField('supportPhone', e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              <span className="block mb-1">Portal / booking URL</span>
              <input
                value={prefs.policy.bookingUrl || ''}
                onChange={(e) => setPolicyField('bookingUrl', e.target.value)}
                placeholder="https://yourbusiness.com/book"
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              <span className="block mb-1">Public review link</span>
              <input
                value={prefs.policy.reviewUrl || ''}
                onChange={(e) => setPolicyField('reviewUrl', e.target.value)}
                placeholder="Google review link"
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-slate-500">
              <span className="block mb-1">Loyalty discount (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={prefs.policy.loyaltyDiscountPercent ?? ''}
                onChange={(e) => setPolicyField('loyaltyDiscountPercent', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="10"
                className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-500">
            <span className="block mb-1">One-time booking cancellation policy</span>
            <textarea
              value={prefs.policy.cancellationPolicyOneTime || ''}
              onChange={(e) => setPolicyField('cancellationPolicyOneTime', e.target.value)}
              rows={2}
              placeholder="Shown on confirmation/reminder emails for one-time bookings. Leave blank to omit."
              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-500">
            <span className="block mb-1">Recurring booking cancellation policy</span>
            <textarea
              value={prefs.policy.cancellationPolicyRecurring || ''}
              onChange={(e) => setPolicyField('cancellationPolicyRecurring', e.target.value)}
              rows={2}
              placeholder="Shown on confirmation/reminder emails for recurring bookings. Leave blank to omit."
              className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-5 py-4">
        <p className="text-xs text-slate-400">
          Need a message that isn&apos;t listed? Request a new automated trigger.
        </p>
        <button
          type="button"
          onClick={() => setReqOpen(true)}
          className="text-xs font-semibold text-teal-600 hover:underline"
        >
          Request an automation
        </button>
      </div>

      {reqOpen && <RequestModal onClose={() => setReqOpen(false)} />}
    </div>
  )
}

function TimingControl({
  tk,
  value,
  onNumber,
  onList,
}: {
  tk: CommTimingKey
  value: number | number[]
  onNumber: (v: number) => void
  onList: (v: number[]) => void
}) {
  const def = COMM_TIMING[tk]
  const [input, setInput] = useState('')

  if (def.kind === 'number') {
    return (
      <label className="text-xs text-slate-500">
        <span className="block mb-1">{def.label}</span>
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            value={Number(value) || 0}
            onChange={(e) => onNumber(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
          />
          <span className="text-slate-400">{def.unit}</span>
        </span>
      </label>
    )
  }

  const list = Array.isArray(value) ? value : []
  return (
    <div className="text-xs text-slate-500">
      <span className="block mb-1">{def.label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {list.map((n) => (
          <span key={n} className="inline-flex items-center gap-1 bg-slate-100 rounded px-2 py-0.5">
            {n}
            <button type="button" onClick={() => onList(list.filter((x) => x !== n))} className="text-slate-400 hover:text-slate-700">
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input) {
              const n = parseInt(input)
              if (n > 0 && !list.includes(n)) onList([...list, n].sort((a, b) => b - a))
              setInput('')
            }
          }}
          placeholder={`+ ${def.unit}`}
          className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm"
        />
      </div>
    </div>
  )
}

function RequestModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!title.trim()) return
    setSending(true)
    setErr(null)
    try {
      const res = await fetch('/api/settings/request-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      if (res.ok) setDone(true)
      else setErr((await res.json()).error || 'Something went wrong.')
    } catch {
      setErr('Something went wrong.')
    }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-900 font-semibold">Request sent</p>
            <p className="text-xs text-slate-400 mt-1">We&apos;ll follow up and add it to your Communications tab.</p>
            <button onClick={onClose} className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Close</button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-slate-900">Request an automation</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Describe the message and when it should fire. New triggers need to be built in, so we add these for you.
            </p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short title (e.g. 3-day post-job check-in)"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What should it say, who receives it, and when should it send?"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
            {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-500">Cancel</button>
              <button
                onClick={submit}
                disabled={sending || !title.trim()}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
