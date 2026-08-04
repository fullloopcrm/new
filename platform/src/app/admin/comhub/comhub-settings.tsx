'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePageSettings, PageSettingsPanel } from '@/components/page-settings'
import { useUserPrefs } from '@/lib/use-user-prefs'
import { useTenantSettings } from '@/lib/use-tenant-settings'

type ViewPrefs = {
  default_filter: 'all' | 'unread' | 'unresponded'
  default_channel: 'all' | 'sms' | 'web' | 'email' | 'voice' | 'admin'
}

type Template = {
  id: string
  name: string
  body: string
  channel: string | null
  hotkey: string | null
}

const selectCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900'
const inputCls = selectCls
const textareaCls = selectCls

type DayHours = { open: boolean; start: string; end: string }
type SupportHours = Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', DayHours>
const DAY_KEYS: Array<keyof SupportHours> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS: Record<keyof SupportHours, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const DEFAULT_SUPPORT_HOURS: SupportHours = {
  mon: { open: true, start: '09:00', end: '17:00' },
  tue: { open: true, start: '09:00', end: '17:00' },
  wed: { open: true, start: '09:00', end: '17:00' },
  thu: { open: true, start: '09:00', end: '17:00' },
  fri: { open: true, start: '09:00', end: '17:00' },
  sat: { open: false, start: '09:00', end: '17:00' },
  sun: { open: false, start: '09:00', end: '17:00' },
}

function WorkHours() {
  const tenantSettings = useTenantSettings()
  // selena_config is an existing jsonb column — storing support_hours inside
  // it avoids needing a real migration for a brand-new tenants column.
  const selena = (tenantSettings.tenant?.selena_config as Record<string, unknown> | null) || {}
  const stored = selena.support_hours as Partial<SupportHours> | null | undefined
  const hours: SupportHours = { ...DEFAULT_SUPPORT_HOURS, ...stored }

  function updateDay(day: keyof SupportHours, patch: Partial<DayHours>) {
    const next: SupportHours = { ...hours, [day]: { ...hours[day], ...patch } }
    tenantSettings.updateSelenaConfig({ support_hours: next })
  }

  return (
    <div className="space-y-3 border-t border-gray-800 pt-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Work hours</p>
      <p className="text-xs text-white/60">When your team is actually answering ComHub — used to know when to reach for an away message.</p>
      <div className="space-y-1.5">
        {DAY_KEYS.map((day) => {
          const d = hours[day]
          return (
            <div key={day} className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={d.open}
                onClick={() => updateDay(day, { open: !d.open })}
                className={`w-14 shrink-0 text-xs font-medium rounded-md py-1.5 transition-colors ${d.open ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                {DAY_LABELS[day]}
              </button>
              {d.open ? (
                <>
                  <input
                    type="time"
                    value={d.start}
                    onChange={(e) => updateDay(day, { start: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                  />
                  <span className="text-xs text-white/50">to</span>
                  <input
                    type="time"
                    value={d.end}
                    onChange={(e) => updateDay(day, { end: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-900"
                  />
                </>
              ) : (
                <span className="flex-1 text-xs text-white/40">Closed</span>
              )}
            </div>
          )
        })}
      </div>
      {tenantSettings.saveMsg && <p className="text-xs text-emerald-400">{tenantSettings.saveMsg}</p>}
    </div>
  )
}

function TemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [channel, setChannel] = useState<'all' | 'sms' | 'email'>('all')
  const [isAway, setIsAway] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/comhub/templates?channel=all')
    const data = await res.json().catch(() => ({ templates: [] }))
    setTemplates(data.templates || [])
    setLoaded(true)
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  async function createTemplate() {
    if (!name.trim() || !body.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/comhub/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          body: body.trim(),
          channel: channel === 'all' ? null : channel,
          hotkey: isAway ? 'away' : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }
      setName('')
      setBody('')
      setChannel('all')
      setIsAway(false)
      setShowForm(false)
      await fetchTemplates()
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(id: string) {
    if (!window.confirm('Delete this preset reply?')) return
    await fetch(`/api/admin/comhub/templates/${id}`, { method: 'DELETE' })
    await fetchTemplates()
  }

  return (
    <div className="space-y-3 border-t border-gray-800 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Preset replies</p>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
        >
          {showForm ? 'Cancel' : '+ Add preset'}
        </button>
      </div>
      <p className="text-xs text-white/60">
        Show up as &ldquo;Templates&rdquo; in the reply box on SMS/email threads — pick one to drop it into the message before sending.
      </p>

      {showForm && (
        <div className="space-y-2 rounded-lg border border-gray-800 p-3">
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cleaner running late" className={inputCls} />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Message</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="The actual reply text" className={textareaCls} />
          </label>
          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Channel</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value as 'all' | 'sms' | 'email')} className={selectCls}>
              <option value="all">SMS + Email</option>
              <option value="sms">SMS only</option>
              <option value="email">Email only</option>
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isAway} onChange={(e) => setIsAway(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm text-white">Away message (off-hours)</span>
          </label>
          {isAway && (
            <p className="text-xs text-white/60">Shows up under the separate &ldquo;Away&rdquo; picker in the reply box instead of Templates.</p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={createTemplate}
            disabled={!name.trim() || !body.trim() || saving}
            className="w-full rounded-lg bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium py-2"
          >
            {saving ? 'Saving…' : 'Save preset'}
          </button>
        </div>
      )}

      {!loaded && <p className="text-xs text-gray-400">Loading…</p>}
      {loaded && templates.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">No preset replies yet — add your first intro or common answer above.</p>
      )}
      <div className="space-y-1.5">
        {templates.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-800 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white">{t.name}</span>
                {t.channel && <span className="text-[10px] uppercase text-gray-500">{t.channel}</span>}
                {t.hotkey === 'away' && <span className="text-[10px] uppercase text-amber-400">· away</span>}
              </div>
              <p className="text-xs text-white/60 truncate">{t.body}</p>
            </div>
            <button
              type="button"
              onClick={() => deleteTemplate(t.id)}
              className="shrink-0 text-xs text-red-400 hover:text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

type RingStrategy = 'browser_only' | 'cell_only' | 'browser_then_cell' | 'simultaneous'
type CallerIdMode = 'show_customer' | 'show_business'

type VoiceSettingsData = {
  ring_strategy: RingStrategy
  caller_id_mode: CallerIdMode
  auto_record: boolean
  auto_transcribe: boolean
  fallback_cell_phone: string | null
  do_not_disturb_until: string | null
}

const DEFAULT_VOICE_SETTINGS: VoiceSettingsData = {
  ring_strategy: 'browser_then_cell',
  caller_id_mode: 'show_customer',
  auto_record: true,
  auto_transcribe: true,
  fallback_cell_phone: null,
  do_not_disturb_until: null,
}

// 'simultaneous' is a real value in the schema/API but not offered here --
// the webhook doesn't do true concurrent dialing yet, it would silently fall
// back to browser_then_cell. Don't offer a choice that doesn't do what it says.
const RING_STRATEGY_LABEL: Record<Exclude<RingStrategy, 'simultaneous'>, string> = {
  browser_only: 'Browser only — only ring the softphone when logged into ComHub',
  cell_only: 'Cell only — always ring the fallback cell, skip the browser softphone',
  browser_then_cell: 'Browser, then cell — try the softphone first, fall back to the cell',
}

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

function VoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettingsData>(DEFAULT_VOICE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/comhub/voice/settings')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data?.settings) setSettings({ ...DEFAULT_VOICE_SETTINGS, ...data.settings })
      })
      .catch(() => { if (!cancelled) setError('Failed to load voice settings') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const save = useCallback(async (next: VoiceSettingsData) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/comhub/voice/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
      } else {
        setSettings({ ...DEFAULT_VOICE_SETTINGS, ...data.settings })
        setSavedAt(Date.now())
      }
    } finally {
      setSaving(false)
    }
  }, [])

  const update = (patch: Partial<VoiceSettingsData>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    save(next)
  }

  if (loading) {
    return (
      <div className="space-y-3 border-t border-gray-800 pt-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Voice</p>
        <p className="text-xs text-white/60">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t border-gray-800 pt-4">
      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Voice</p>
      <p className="text-xs text-white/60">How inbound calls ring, and what happens to recordings.</p>

      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Fallback cell phone</span>
        <input
          type="tel"
          className={inputCls}
          value={settings.fallback_cell_phone ?? ''}
          onChange={(e) => setSettings(s => ({ ...s, fallback_cell_phone: e.target.value || null }))}
          onBlur={() => save(settings)}
          placeholder="+1 555 555 5555"
        />
        <span className="block text-xs text-white/60 mt-1">Rings this number when nobody's logged into ComHub.</span>
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Ring order</span>
        <select
          className={selectCls}
          value={settings.ring_strategy}
          onChange={(e) => update({ ring_strategy: e.target.value as RingStrategy })}
        >
          {(Object.keys(RING_STRATEGY_LABEL) as Exclude<RingStrategy, 'simultaneous'>[]).map(key => (
            <option key={key} value={key}>{RING_STRATEGY_LABEL[key]}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Caller ID on outbound calls</span>
        <select
          className={selectCls}
          value={settings.caller_id_mode}
          onChange={(e) => update({ caller_id_mode: e.target.value as CallerIdMode })}
        >
          <option value="show_customer">Show the customer's number</option>
          <option value="show_business">Show the business number</option>
        </select>
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Do not disturb until</span>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            className={inputCls + ' flex-1'}
            value={toLocalInputValue(settings.do_not_disturb_until)}
            onChange={(e) => update({ do_not_disturb_until: fromLocalInputValue(e.target.value) })}
          />
          {settings.do_not_disturb_until && (
            <button
              onClick={() => update({ do_not_disturb_until: null })}
              className="shrink-0 text-xs text-white/70 hover:text-white px-3 py-2 rounded-lg border border-slate-700"
            >
              Clear
            </button>
          )}
        </div>
        <span className="block text-xs text-white/60 mt-1">While set, calls skip straight to the next ring target.</span>
      </label>

      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.auto_record}
          onChange={(e) => update({ auto_record: e.target.checked })}
        />
        Record calls
      </label>
      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.auto_transcribe}
          onChange={(e) => update({ auto_transcribe: e.target.checked })}
        />
        Transcribe calls
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {saving && <p className="text-xs text-white/50">Saving…</p>}
      {savedAt && !saving && !error && <p className="text-xs text-white/50">Saved</p>}
    </div>
  )
}

export default function ComhubSettings() {
  const settings = usePageSettings('comhub')
  const viewPrefs = useUserPrefs<ViewPrefs>('comhub', { default_filter: 'all', default_channel: 'all' })

  return (
    <PageSettingsPanel
      {...settings}
      title="ComHub"
      tips={[
        'Default inbox filter and channel control which threads show when ComHub first opens.',
        'Work hours are informational for now — they don’t auto-send anything yet.',
        'Preset replies show up as "Templates" in the reply box on SMS/email threads; ones marked "Away message" show up under a separate "Away" picker instead.',
        'Voice settings are per-admin — the fallback cell phone and ring order apply to whoever is logged in when they save them.',
      ]}
    >
      {() => (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">View</p>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default filter</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_filter}
                onChange={(e) => viewPrefs.updatePref('default_filter', e.target.value as ViewPrefs['default_filter'])}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="unresponded">Unresponded</option>
              </select>
              <span className="block text-xs text-white/60 mt-1">Which threads show by default.</span>
            </label>
            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/70 mb-1">Default channel</span>
              <select
                className={selectCls}
                value={viewPrefs.prefs.default_channel}
                onChange={(e) => viewPrefs.updatePref('default_channel', e.target.value as ViewPrefs['default_channel'])}
              >
                <option value="all">All</option>
                <option value="sms">SMS</option>
                <option value="web">Web</option>
                <option value="email">Email</option>
                <option value="voice">Voice</option>
                <option value="admin">Admin</option>
              </select>
              <span className="block text-xs text-white/60 mt-1">Which channel the inbox opens filtered to.</span>
            </label>
          </div>

          <WorkHours />
          <TemplatesManager />
          <VoiceSettings />
        </div>
      )}
    </PageSettingsPanel>
  )
}
