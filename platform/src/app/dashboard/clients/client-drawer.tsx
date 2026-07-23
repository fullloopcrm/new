'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkerLabel } from '../worker-label-context'
import { DnsReasonPicker } from './dns-reason-picker'
import { formatCustomerNumber } from '@/lib/format'
import ClientAddresses from './client-addresses'

type EnrichedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  customer_number: number | null
  status: string
  source: string | null
  created_at: string
  dns_status: boolean
  health: number
  health_band: 'vip' | 'healthy' | 'ok' | 'risk' | 'critical'
  health_factors: {
    frequency: number
    spend: number
    payment: number
    sentiment: number
  }
  stage: 'lead' | 'first' | 'active' | 'vip' | 'risk' | 'lapsed' | 'dns'
  ltv_actual_cents: number
  ltv_projected_cents: number
  bookings_count: number
  last_booking: { date: string; label: string; sub: string; overdue: boolean } | null
  recurring: {
    frequency: string
    discount_pct: number
    day: string
    time: string
    status: string
  } | null
  preferred_cleaner: {
    name: string
    jobs_with: number
    total_jobs: number
  } | null
  cohort: string
}

type Props = {
  client: EnrichedClient | null
  tenantSlug: string
  open: boolean
  onClose: () => void
  onClientUpdated?: () => void
  agentName?: string
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function fmt(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US')
}

function bandColor(band: EnrichedClient['health_band']): string {
  if (band === 'vip') return 'var(--clients-vip)'
  if (band === 'healthy') return 'var(--clients-good)'
  if (band === 'ok') return 'var(--clients-ink)'
  if (band === 'risk') return 'var(--clients-warn)'
  return 'var(--clients-danger)'
}

function bandLabel(band: EnrichedClient['health_band']): string {
  if (band === 'vip') return 'VIP · Highly Healthy'
  if (band === 'healthy') return 'Healthy'
  if (band === 'ok') return 'Stable'
  if (band === 'risk') return 'At Risk'
  return 'Critical'
}

function stageLabel(stage: EnrichedClient['stage']): string {
  if (stage === 'lead') return 'Lead'
  if (stage === 'first') return 'First-Time'
  if (stage === 'active') return 'Active'
  if (stage === 'vip') return 'VIP'
  if (stage === 'risk') return 'At-Risk'
  if (stage === 'lapsed') return 'Lapsed'
  return 'DNS'
}

function dayOfRelationship(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime()
  return Math.max(1, Math.floor(ms / 86_400_000))
}

type Activity = {
  id: string
  channel: 'sms' | 'call' | 'email' | 'system'
  direction: 'in' | 'out' | 'system'
  text: string
  ts: string
  sentiment?: 'pos' | 'neu' | 'neg'
}

type RecurringSchedule = {
  id: string
  recurring_type: string
  day_of_week: number | null
  preferred_time: string | null
  duration_hours: number | null
  hourly_rate: number | null
  status: string
  paused_until: string | null
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type ClientBooking = {
  id: string
  start_time: string
  end_time: string | null
  service_type: string | null
  status: string
  price: number | null
  payment_status: string | null
  team_member_id: string | null
  team_members: { id: string; name: string } | null
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function ClientDrawer({ client, tenantSlug, open, onClose, onClientUpdated, agentName = 'Selena' }: Props) {
  const router = useRouter()
  const worker = useWorkerLabel()
  const [drawerTab, setDrawerTab] = useState<'overview' | 'activity' | 'service' | 'notes'>('overview')
  const [notesTab, setNotesTab] = useState<'cleaner' | 'operator' | 'selena'>('cleaner')
  const [notes, setNotes] = useState({ cleaner: '', operator: '', selena: '' })
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesMsg, setNotesMsg] = useState('')
  const [activity, setActivity] = useState<Activity[]>([])
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [showDnsPicker, setShowDnsPicker] = useState(false)
  const [dnsSaving, setDnsSaving] = useState(false)

  // Bookings list — Activity tab
  const [bookings, setBookings] = useState<ClientBooking[]>([])

  // Recurring schedule edit/pause — Service tab
  const [schedule, setSchedule] = useState<RecurringSchedule | null>(null)
  const [recMode, setRecMode] = useState<'view' | 'edit' | 'pause'>('view')
  const [recForm, setRecForm] = useState({ recurring_type: 'weekly', day_of_week: 1, preferred_time: '09:00' })
  const [pauseDate, setPauseDate] = useState('')
  const [recSaving, setRecSaving] = useState(false)
  const [recMsg, setRecMsg] = useState('')

  // Selena next-action message edit — Activity tab
  const [nextActionEditing, setNextActionEditing] = useState(false)
  const [nextActionMessage, setNextActionMessage] = useState('')
  const [nextActionSending, setNextActionSending] = useState(false)
  const [nextActionMsg, setNextActionMsg] = useState('')

  useEffect(() => {
    if (!client) return
    setDrawerTab('overview')
    setNotesTab('cleaner')
    setNextActionEditing(false)
    setNextActionMsg('')
    setNextActionMessage(`Hey ${client.name.split(' ')[0]}! Quick heads up — your invoice is still showing as outstanding. Want me to resend the link?`)
    setRecMode('view')
    setSchedule(null)
    setRecMsg('')
    setPauseDate('')

    fetch(`/api/bookings?client_id=${client.id}`)
      .then((r) => r.json())
      .then((data) => setBookings((data.bookings || []) as ClientBooking[]))
      .catch(() => setBookings([]))

    fetch(`/api/admin/recurring-schedules?client_id=${client.id}`)
      .then((r) => r.json())
      .then((data) => {
        const list: RecurringSchedule[] = Array.isArray(data) ? data : (data.schedules || [])
        const active = list.find((s) => s.status === 'active') || list[0] || null
        setSchedule(active || null)
        if (active) {
          setRecForm({
            recurring_type: active.recurring_type || 'weekly',
            day_of_week: active.day_of_week ?? 1,
            preferred_time: active.preferred_time || '09:00',
          })
        }
      })
      .catch(() => setSchedule(null))

    fetch(`/api/clients/${client.id}/activity?limit=8`)
      .then((r) => r.json())
      .then((data) => {
        const items = (data.activity || data.items || []) as Array<Record<string, unknown>>
        setActivity(
          items.slice(0, 8).map((row, i) => ({
            id: String(row.id ?? i),
            channel: (row.channel as Activity['channel']) || 'system',
            direction: (row.direction as Activity['direction']) || 'system',
            text: String(row.text || row.body || row.message || '—'),
            ts: String(row.ts || row.created_at || row.timestamp || ''),
            sentiment: row.sentiment as Activity['sentiment'] | undefined,
          })),
        )
      })
      .catch(() => setActivity([]))

    fetch(`/api/clients/${client.id}`)
      .then((r) => r.json())
      .then((data) => {
        const c = (data.client || data) as Record<string, unknown>
        setNotes({
          cleaner: (c.notes_private as string) || '',
          operator: (c.notes as string) || '',
          selena: (c.notes_public as string) || '',
        })
      })
      .catch(() => {})
  }, [client])

  function openEdit() {
    if (!client) return
    setEditForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
    })
    setEditError('')
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!client) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save changes')
      }
      setEditOpen(false)
      onClientUpdated?.()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setEditSaving(false)
    }
  }

  async function confirmMoveToDns(reason: string) {
    if (!client) return
    setDnsSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do_not_service: true, dns_reason: reason }),
      })
      if (!res.ok) throw new Error('Failed to move to DNS')
      setShowDnsPicker(false)
      onClientUpdated?.()
    } catch {
      // surfaced via the picker staying open; button remains actionable to retry
    } finally {
      setDnsSaving(false)
    }
  }

  async function restoreFromDns() {
    if (!client) return
    setDnsSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ do_not_service: false, dns_reason: null }),
      })
      if (!res.ok) throw new Error('Failed to restore client')
      onClientUpdated?.()
    } catch {
      // no-op — button remains actionable to retry
    } finally {
      setDnsSaving(false)
    }
  }

  function bookNext() {
    if (!client) return
    router.push(`/dashboard/bookings?new=1&client_id=${client.id}`)
  }

  async function sendNextActionSms() {
    if (!client?.phone || nextActionSending) return
    setNextActionSending(true)
    setNextActionMsg('')
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: client.phone, message: nextActionMessage }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) {
        setNextActionMsg(data.error || 'Failed to send')
      } else {
        setNextActionMsg('SMS sent')
        setTimeout(() => setNextActionMsg(''), 2000)
      }
    } catch {
      setNextActionMsg('Failed to send')
    } finally {
      setNextActionSending(false)
    }
  }

  async function saveRecurringEdit() {
    if (!schedule) return
    setRecSaving(true)
    setRecMsg('')
    const res = await fetch(`/api/admin/recurring-schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recForm),
    })
    const data = await res.json().catch(() => ({}))
    setRecSaving(false)
    if (!res.ok) {
      setRecMsg(data.error || 'Save failed')
      return
    }
    setSchedule({ ...schedule, ...recForm })
    setRecMode('view')
    setRecMsg('Saved')
    setTimeout(() => setRecMsg(''), 2000)
    onClientUpdated?.()
  }

  async function pauseRecurring() {
    if (!schedule || !pauseDate) return
    setRecSaving(true)
    setRecMsg('')
    const res = await fetch(`/api/admin/recurring-schedules/${schedule.id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused_until: pauseDate }),
    })
    const data = await res.json().catch(() => ({}))
    setRecSaving(false)
    if (!res.ok) {
      setRecMsg(data.error || 'Pause failed')
      return
    }
    setSchedule({ ...schedule, status: 'paused', paused_until: pauseDate })
    setRecMode('view')
    setRecMsg('Paused')
    setTimeout(() => setRecMsg(''), 2000)
    onClientUpdated?.()
  }

  if (!client) return null

  const bColor = bandColor(client.health_band)
  const dayN = dayOfRelationship(client.created_at)
  const acquiredFmt = new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <>
      <div
        className={`clients-scrim ${open ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`clients-drawer ${open ? 'open' : ''}`}>
        <div className="clients-drawer-head">
          <div className="clients-drawer-eyebrow">03.A · Client Profile</div>
          <div className="clients-drawer-head-row">
            <div className="clients-drawer-title-row">
              <span className={`clients-avatar ${client.stage === 'vip' ? 'vip' : ''}`}>{initials(client.name)}</span>
              <div className="clients-drawer-title-meta">
                <div className="clients-drawer-name">
                  {client.name}
                  {client.stage === 'vip' && <span className="clients-drawer-name-vip">VIP</span>}
                </div>
                {client.customer_number != null && tenantSlug && (
                  <div className="clients-drawer-customer-number">Customer #{formatCustomerNumber(tenantSlug, client.customer_number)}</div>
                )}
                <div className="clients-drawer-stage-row">
                  <span className={`clients-stage ${client.stage}`}>{stageLabel(client.stage)}</span>
                  <span>·</span>
                  <span>Acquired {acquiredFmt}</span>
                  <span>·</span>
                  <span>Day {dayN}</span>
                </div>
              </div>
            </div>
            <button className="clients-drawer-close" onClick={onClose} aria-label="Close drawer">✕</button>
          </div>
        </div>

        <div className="clients-drawer-tabs">
          <div className="clients-tabs">
            {([
              ['overview', 'Overview'],
              ['activity', `Activity${bookings.length ? ` · ${bookings.length}` : ''}`],
              ['service', 'Service'],
              ['notes', 'Notes'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`clients-tab ${drawerTab === key ? 'active' : ''}`}
                onClick={() => setDrawerTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="clients-drawer-body">
          {/* Selena Next Action — Activity tab */}
          {drawerTab === 'activity' && client.last_booking?.overdue && (
            <div className="clients-next-action">
              <div className="clients-next-action-head">{agentName} · Suggested Next Action</div>
              <div className="clients-next-action-suggest">
                Payment is overdue — recommend a soft check-in before sending a formal reminder.
              </div>
              {nextActionEditing ? (
                <textarea
                  className="clients-notes-textarea"
                  value={nextActionMessage}
                  onChange={(e) => setNextActionMessage(e.target.value)}
                  rows={3}
                  style={{ marginBottom: 8 }}
                />
              ) : (
                <div className="clients-next-action-message">{nextActionMessage}</div>
              )}
              <div className="clients-next-action-row">
                <span style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%' }}>
                  <button className="clients-next-btn primary" disabled={nextActionSending || !client.phone} onClick={sendNextActionSms}>
                    {nextActionSending ? 'Sending…' : 'Send via SMS'}
                  </button>
                  <button className="clients-next-btn ghost" onClick={() => setNextActionEditing((v) => !v)}>{nextActionEditing ? 'Done' : 'Edit'}</button>
                  <button className="clients-next-btn ghost" onClick={() => { if (client.phone) window.location.href = `tel:${client.phone}` }}>Try call instead</button>
                  <button className="clients-next-btn dismiss" onClick={() => setNextActionMessage('')}>Dismiss</button>
                  {nextActionMsg && <span style={{ fontSize: 12, color: nextActionMsg === 'SMS sent' ? '#059669' : '#dc2626' }}>{nextActionMsg}</span>}
                </span>
              </div>
            </div>
          )}

          {/* Health Module — Overview tab */}
          {drawerTab === 'overview' && (
          <div className="clients-health-module">
            <div className="clients-health-row">
              <div className="clients-health-big" style={{ color: bColor }}>{client.health}</div>
              <div className="clients-health-meta">
                <div className="clients-health-status" style={{ color: bColor }}>{bandLabel(client.health_band)}</div>
                <div className="clients-health-desc">
                  {client.bookings_count} job{client.bookings_count === 1 ? '' : 's'} ·{' '}
                  {client.recurring ? `${client.recurring.frequency} with ${client.preferred_cleaner?.name || 'team'}` : 'one-time relationship'}
                  {' · '}
                  Lifetime spend {fmt(client.ltv_actual_cents)}
                </div>
              </div>
            </div>
            <div className="clients-health-factors">
              {(['frequency', 'spend', 'payment', 'sentiment'] as const).map((f) => {
                const score = client.health_factors[f]
                const fillClass = score >= 75 ? '' : score >= 50 ? 'med' : 'low'
                return (
                  <div key={f} className="clients-health-factor">
                    <div className="clients-factor-label">{f}</div>
                    <div className="clients-factor-bar">
                      <div className={`clients-factor-fill ${fillClass}`} style={{ width: `${score}%` }} />
                    </div>
                    <div className="clients-factor-score">{score}</div>
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {/* Recurring Slot — Service tab */}
          {drawerTab === 'service' && client.recurring && (
            <div className="clients-section">
              <div className="clients-section-head">
                <span className="clients-section-label">Recurring Slot</span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {recMsg && <span style={{ fontSize: 12, color: '#059669' }}>{recMsg}</span>}
                  {recMode !== 'view' ? (
                    <span className="clients-section-action" onClick={() => { setRecMode('view'); setRecMsg('') }}>Cancel</span>
                  ) : (
                    <>
                      <span
                        className="clients-section-action"
                        style={{ cursor: schedule ? 'pointer' : 'not-allowed', opacity: schedule ? 1 : 0.4 }}
                        onClick={() => { if (schedule) setRecMode('edit') }}
                      >Edit</span>
                      <span
                        className="clients-section-action"
                        style={{ cursor: schedule ? 'pointer' : 'not-allowed', opacity: schedule ? 1 : 0.4 }}
                        onClick={() => { if (schedule) setRecMode('pause') }}
                      >Pause</span>
                    </>
                  )}
                </span>
              </div>
              {recMode === 'view' && (
                <div className="clients-slot-hero">
                  <div className="clients-slot-hero-label">↻ Locked Standing Appointment</div>
                  <div className="clients-slot-hero-when">
                    {client.recurring.day ? `${client.recurring.day}s` : 'Recurring'}
                    {client.recurring.time ? ` · ${client.recurring.time}` : ''}
                  </div>
                  <div className="clients-slot-hero-meta">
                    {client.recurring.frequency} cadence
                    {client.preferred_cleaner ? ` · with ${client.preferred_cleaner.name}` : ''}
                    {client.recurring.discount_pct > 0 ? ` · ${client.recurring.discount_pct}% loyalty discount` : ''}
                  </div>
                </div>
              )}
              {recMode === 'edit' && schedule && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--clients-muted)' }}>Cadence</span>
                    <select
                      value={recForm.recurring_type}
                      onChange={(e) => setRecForm({ ...recForm, recurring_type: e.target.value })}
                      style={{ padding: '10px 12px', border: '1px solid var(--clients-line)', borderRadius: 4, fontSize: 14 }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--clients-muted)' }}>Day of Week</span>
                    <select
                      value={recForm.day_of_week}
                      onChange={(e) => setRecForm({ ...recForm, day_of_week: parseInt(e.target.value) })}
                      style={{ padding: '10px 12px', border: '1px solid var(--clients-line)', borderRadius: 4, fontSize: 14 }}
                    >
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--clients-muted)' }}>Time</span>
                    <input
                      type="time"
                      value={recForm.preferred_time}
                      onChange={(e) => setRecForm({ ...recForm, preferred_time: e.target.value })}
                      style={{ padding: '10px 12px', border: '1px solid var(--clients-line)', borderRadius: 4, fontSize: 14 }}
                    />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" disabled={recSaving} className="clients-btn clients-btn-primary" onClick={saveRecurringEdit}>
                      {recSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
              {recMode === 'pause' && schedule && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--clients-muted)' }}>Pause until</span>
                    <input
                      type="date"
                      value={pauseDate}
                      onChange={(e) => setPauseDate(e.target.value)}
                      style={{ padding: '10px 12px', border: '1px solid var(--clients-line)', borderRadius: 4, fontSize: 14 }}
                    />
                  </label>
                  <p style={{ fontSize: 12, color: 'var(--clients-muted)' }}>
                    Cancels scheduled bookings in this series through the pause date. Series resumes automatically after.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" disabled={recSaving || !pauseDate} className="clients-btn clients-btn-primary" onClick={pauseRecurring}>
                      {recSaving ? 'Pausing…' : 'Pause Series'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lifetime Value — Overview tab */}
          {drawerTab === 'overview' && (
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Lifetime Value</span>
            </div>
            <div className="clients-ltv-split">
              <div className="clients-ltv-cell-lg">
                <div className="clients-ltv-cell-label">Actual · to date</div>
                <div className="clients-ltv-cell-value">{fmt(client.ltv_actual_cents)}</div>
                <div className="clients-ltv-cell-sub">
                  {client.bookings_count} job{client.bookings_count === 1 ? '' : 's'}
                  {client.bookings_count > 0 ? ` · avg ${fmt(client.ltv_actual_cents / client.bookings_count)}` : ''}
                </div>
              </div>
              <div className="clients-ltv-cell-lg proj">
                <div className="clients-ltv-cell-label proj">↗ Projected · 12mo</div>
                <div className="clients-ltv-cell-value proj">{fmt(client.ltv_projected_cents)}</div>
                <div className="clients-ltv-cell-sub">
                  {client.recurring ? `${client.recurring.frequency} cadence` : 'based on history'}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Property — Overview tab */}
          {drawerTab === 'overview' && (
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Property</span>
              <span className="clients-section-action" role="button" tabIndex={0} onClick={openEdit} onKeyDown={(e) => e.key === 'Enter' && openEdit()}>Edit</span>
            </div>
            <div className="clients-property-grid">
              <div className="clients-property-cell">
                <div className="clients-property-label">Address</div>
                <div className={`clients-property-value ${client.address ? '' : 'empty'}`}>{client.address || 'Not set'}</div>
              </div>
              <div className="clients-property-cell">
                <div className="clients-property-label">Phone</div>
                <div className={`clients-property-value ${client.phone ? '' : 'empty'}`}>{client.phone || '—'}</div>
              </div>
              <div className="clients-property-cell">
                <div className="clients-property-label">Email</div>
                <div className={`clients-property-value ${client.email ? '' : 'empty'}`}>{client.email || '—'}</div>
              </div>
              <div className="clients-property-cell">
                <div className="clients-property-label">Source</div>
                <div className={`clients-property-value ${client.source ? '' : 'empty'}`}>{client.source || '—'}</div>
              </div>
            </div>
          </div>
          )}

          {/* All addresses (multi-property) + change history — Overview tab */}
          {drawerTab === 'overview' && (
            <ClientAddresses clientId={client.id} showHistory />
          )}

          {/* Worker affinity (trade-labeled) — Service tab */}
          {drawerTab === 'service' && client.preferred_cleaner && (
            <div className="clients-section">
              <div className="clients-section-head">
                <span className="clients-section-label">{worker.singular} Affinity</span>
                <span className="clients-section-action">{client.bookings_count} job{client.bookings_count === 1 ? '' : 's'} total</span>
              </div>
              <div className="clients-affinity-list">
                <div className="clients-affinity-row preferred">
                  <span className="clients-affinity-star">★</span>
                  <span className="clients-affinity-name">{client.preferred_cleaner.name}</span>
                  <div className="clients-affinity-bar">
                    <div
                      className="clients-affinity-fill preferred"
                      style={{
                        width: `${(client.preferred_cleaner.jobs_with / Math.max(1, client.preferred_cleaner.total_jobs)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="clients-affinity-count">
                    {client.preferred_cleaner.jobs_with} / {client.preferred_cleaner.total_jobs} jobs ·{' '}
                    {Math.round((client.preferred_cleaner.jobs_with / Math.max(1, client.preferred_cleaner.total_jobs)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bookings — Activity tab */}
          {drawerTab === 'activity' && (
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Bookings · {bookings.length}</span>
              <span className="clients-section-action" role="button" tabIndex={0} onClick={() => router.push(`/dashboard/bookings?new=1&client_id=${client.id}`)}>+ New</span>
            </div>
            {bookings.length === 0 ? (
              <div className="clients-empty">No bookings yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bookings.map((b) => (
                  <div key={b.id} style={{ border: '1px solid var(--clients-line)', borderRadius: 4, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--clients-ink)', fontWeight: 500 }}>
                          {fmtDateShort(b.start_time)} · {fmtTime(b.start_time)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--clients-muted)', marginTop: 2 }}>
                          {b.service_type || 'Cleaning'}
                          {b.team_members?.name ? ` · ${b.team_members.name}` : ' · Unassigned'}
                          {b.price != null ? ` · $${(b.price / 100).toFixed(0)}` : ''}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, padding: '2px 6px',
                            borderRadius: 3,
                            background: b.status === 'completed' || b.status === 'paid' ? '#dcfce7' :
                                        b.status === 'in_progress' ? '#dbeafe' :
                                        b.status === 'cancelled' || b.status === 'no_show' ? '#fee2e2' :
                                        b.status === 'pending' ? '#fef3c7' : '#f3f4f6',
                            color: b.status === 'completed' || b.status === 'paid' ? '#166534' :
                                   b.status === 'in_progress' ? '#1e40af' :
                                   b.status === 'cancelled' || b.status === 'no_show' ? '#991b1b' :
                                   b.status === 'pending' ? '#92400e' : '#374151',
                          }}>{b.status.replace('_', ' ')}</span>
                          {b.payment_status && b.payment_status !== 'pending' && (
                            <span style={{ fontSize: 10, color: 'var(--clients-muted)' }}>· {b.payment_status}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="clients-btn clients-btn-ghost"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => router.push(`/dashboard/bookings/${b.id}`)}
                      >Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Conversations — Activity tab */}
          {drawerTab === 'activity' && (
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Conversations</span>
              {activity.length > 0 && <span className="clients-section-action">View all</span>}
            </div>
            {activity.length === 0 ? (
              <div className="clients-empty">No conversations yet.</div>
            ) : (
              <div className="clients-convo-timeline">
                {activity.map((a) => (
                  <div key={a.id} className="clients-convo-item">
                    <div className={`clients-convo-channel ${a.channel === 'call' ? 'call' : a.channel === 'email' ? 'email' : 'text'}`}>
                      {a.channel === 'call' ? 'C' : a.channel === 'email' ? 'E' : 'T'}
                    </div>
                    <div className="clients-convo-body">
                      <div className="clients-convo-head">
                        <span className={`clients-convo-direction ${a.direction === 'in' ? 'incoming' : ''}`}>
                          {a.direction === 'in' ? `${client.name.split(' ')[0]} → You` : `You → ${client.name.split(' ')[0]}`}
                        </span>
                        <span>{a.channel.toUpperCase()}</span>
                        <span>·</span>
                        <span>{a.ts ? new Date(a.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}</span>
                        {a.sentiment && <span className={`clients-convo-sentiment ${a.sentiment}`}>{a.sentiment === 'pos' ? 'positive' : a.sentiment === 'neg' ? 'negative' : 'neutral'}</span>}
                      </div>
                      <div className={`clients-convo-text ${a.direction === 'out' ? 'outgoing' : ''}`}>{a.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Notes — Notes tab */}
          {drawerTab === 'notes' && (
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Notes</span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {notesMsg && <span style={{ fontSize: 12, color: notesMsg.startsWith('Saved') ? '#059669' : '#dc2626' }}>{notesMsg}</span>}
                <span
                  className="clients-section-action"
                  style={{ cursor: notesSaving ? 'wait' : 'pointer' }}
                  onClick={async () => {
                    if (!client || notesSaving) return
                    setNotesSaving(true)
                    setNotesMsg('')
                    const res = await fetch(`/api/clients/${client.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        notes: notes.operator || null,
                        notes_private: notes.cleaner || null,
                        notes_public: notes.selena || null,
                      }),
                    })
                    const data = await res.json().catch(() => ({}))
                    setNotesSaving(false)
                    if (!res.ok) {
                      setNotesMsg(data.error || 'Save failed')
                    } else {
                      setNotesMsg('Saved')
                      setTimeout(() => setNotesMsg(''), 2000)
                      onClientUpdated?.()
                    }
                  }}
                >
                  {notesSaving ? 'Saving…' : 'Save'}
                </span>
              </span>
            </div>
            <div className="clients-notes-tabs">
              {(['cleaner', 'operator', 'selena'] as const).map((t) => (
                <span
                  key={t}
                  className={`clients-notes-tab ${notesTab === t ? 'active' : ''}`}
                  onClick={() => setNotesTab(t)}
                >
                  {t === 'cleaner' ? '⚒ Cleaner' : t === 'operator' ? '⊡ Operator' : `✦ ${agentName}`}
                </span>
              ))}
            </div>
            <textarea
              className="clients-notes-textarea"
              value={notes[notesTab]}
              onChange={(e) => setNotes({ ...notes, [notesTab]: e.target.value })}
              placeholder={`${notesTab[0].toUpperCase() + notesTab.slice(1)} notes…`}
            />
          </div>
          )}
        </div>

        <div className="clients-drawer-foot">
          <button
            className="clients-delete-btn"
            disabled={dnsSaving}
            onClick={() => client.dns_status ? restoreFromDns() : setShowDnsPicker(true)}
          >
            {client.dns_status ? 'Restore from DNS' : 'Move to DNS'}
          </button>
          <div className="clients-drawer-foot-spacer" />
          <button className="clients-btn clients-btn-ghost" onClick={onClose}>Close</button>
          <button className="clients-btn clients-btn-primary" onClick={bookNext}>Book Next</button>
        </div>
      </aside>

      {showDnsPicker && (
        <DnsReasonPicker onConfirm={confirmMoveToDns} onCancel={() => setShowDnsPicker(false)} />
      )}

      {editOpen && (
        <div className="clients-edit-scrim" onClick={() => setEditOpen(false)}>
          <div className="clients-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="clients-edit-modal-title">Edit Client</div>
            <div className="clients-edit-field">
              <label className="clients-edit-label" htmlFor="client-edit-name">Name</label>
              <input
                id="client-edit-name"
                className="clients-edit-input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="clients-edit-field">
              <label className="clients-edit-label" htmlFor="client-edit-phone">Phone</label>
              <input
                id="client-edit-phone"
                className="clients-edit-input"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="clients-edit-field">
              <label className="clients-edit-label" htmlFor="client-edit-email">Email</label>
              <input
                id="client-edit-email"
                className="clients-edit-input"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="clients-edit-field">
              <label className="clients-edit-label" htmlFor="client-edit-address">Address</label>
              <input
                id="client-edit-address"
                className="clients-edit-input"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            {editError && <div className="clients-edit-error">{editError}</div>}
            <div className="clients-edit-actions">
              <button className="clients-btn clients-btn-ghost" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</button>
              <button className="clients-btn clients-btn-primary" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
