'use client'

import { useEffect, useState } from 'react'

type EnrichedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
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
  open: boolean
  onClose: () => void
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

export default function ClientDrawer({ client, open, onClose }: Props) {
  const [notesTab, setNotesTab] = useState<'cleaner' | 'operator' | 'selena'>('cleaner')
  const [notes, setNotes] = useState({ cleaner: '', operator: '', selena: '' })
  const [activity, setActivity] = useState<Activity[]>([])

  useEffect(() => {
    if (!client) return
    setNotesTab('cleaner')
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
          cleaner: (c.cleaner_notes as string) || '',
          operator: (c.notes as string) || '',
          selena: (c.selena_notes as string) || '',
        })
      })
      .catch(() => {})
  }, [client])

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

        <div className="clients-drawer-body">
          {/* Selena Next Action */}
          {client.last_booking?.overdue && (
            <div className="clients-next-action">
              <div className="clients-next-action-head">Selena · Suggested Next Action</div>
              <div className="clients-next-action-suggest">
                Payment is overdue — recommend a soft check-in before sending a formal reminder.
              </div>
              <div className="clients-next-action-message">
                Hey {client.name.split(' ')[0]}! Quick heads up — your invoice is still showing as outstanding. Want me to resend the link?
              </div>
              <div className="clients-next-action-row">
                <button className="clients-next-btn primary">Send via SMS</button>
                <button className="clients-next-btn ghost">Edit</button>
                <button className="clients-next-btn ghost">Try call instead</button>
                <button className="clients-next-btn dismiss">Dismiss</button>
              </div>
            </div>
          )}

          {/* Health Module */}
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

          {/* Recurring Slot */}
          {client.recurring && (
            <div className="clients-section">
              <div className="clients-section-head">
                <span className="clients-section-label">Recurring Slot</span>
                <span className="clients-section-action">Edit / Pause</span>
              </div>
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
            </div>
          )}

          {/* Lifetime Value */}
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

          {/* Property */}
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Property</span>
              <span className="clients-section-action">Edit</span>
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

          {/* Cleaner Affinity */}
          {client.preferred_cleaner && (
            <div className="clients-section">
              <div className="clients-section-head">
                <span className="clients-section-label">Cleaner Affinity</span>
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

          {/* Conversations */}
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

          {/* Notes */}
          <div className="clients-section">
            <div className="clients-section-head">
              <span className="clients-section-label">Notes</span>
            </div>
            <div className="clients-notes-tabs">
              {(['cleaner', 'operator', 'selena'] as const).map((t) => (
                <span
                  key={t}
                  className={`clients-notes-tab ${notesTab === t ? 'active' : ''}`}
                  onClick={() => setNotesTab(t)}
                >
                  {t === 'cleaner' ? '⚒ Cleaner' : t === 'operator' ? '⊡ Operator' : '✦ Selena'}
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
        </div>

        <div className="clients-drawer-foot">
          <button className="clients-delete-btn">{client.dns_status ? 'Restore from DNS' : 'Move to DNS'}</button>
          <div className="clients-drawer-foot-spacer" />
          <button className="clients-btn clients-btn-ghost" onClick={onClose}>Close</button>
          <button className="clients-btn clients-btn-primary">Book Next</button>
        </div>
      </aside>
    </>
  )
}
