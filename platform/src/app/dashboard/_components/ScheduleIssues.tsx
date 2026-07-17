'use client'
import { useEffect, useState } from 'react'

interface ScheduleIssue {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  booking_id: string | null
  date: string | null
  status: string
  created_at: string
}

type IssueGroup = 'fix' | 'review' | 'verify'
const ISSUE_GROUP: Record<string, IssueGroup> = {
  time_conflict: 'fix', duplicate_client: 'fix', unassigned: 'fix', over_max_jobs: 'fix',
  tight_buffer: 'fix', day_off: 'fix', no_car: 'fix', no_show: 'fix', stuck_pending: 'fix',
  unscheduled_sale: 'fix',
  home_by_risk: 'review',
  price_mismatch: 'verify', payment_overdue: 'verify', cleaner_unpaid: 'verify',
}
const ISSUE_ACTION: Record<string, string> = {
  unassigned: 'Assign', time_conflict: 'Reassign', duplicate_client: 'Reassign', no_car: 'Reassign',
  day_off: 'Reassign', over_max_jobs: 'Rebalance', tight_buffer: 'Adjust', home_by_risk: 'Adjust',
  no_show: 'View job', stuck_pending: 'Schedule', unscheduled_sale: 'Schedule', payment_overdue: 'Collect', cleaner_unpaid: 'Pay',
  price_mismatch: 'Review price',
}
const groupOf = (type: string): IssueGroup => ISSUE_GROUP[type] || 'verify'
const GROUP_META: { key: IssueGroup; label: string }[] = [
  { key: 'fix', label: 'Fix now' }, { key: 'review', label: 'Review' }, { key: 'verify', label: 'Verify' },
]

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', warn: 'var(--color-loop-warn)', mono: 'var(--mono)',
}

export default function ScheduleIssues() {
  const [issues, setIssues] = useState<ScheduleIssue[]>([])
  const [rescanning, setRescanning] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/schedule-issues')
    if (res.ok) setIssues(await res.json())
  }
  useEffect(() => { load() }, [])

  const resolveIssue = async (id: string) => {
    const previewRes = await fetch('/api/admin/schedule-issues/fix', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, apply: false }),
    })
    if (!previewRes.ok) return
    const { preview } = await previewRes.json()
    if (!window.confirm(`Proposed fix:\n\n${preview?.description || 'Mark as resolved.'}\n\nApply?`)) return
    await fetch('/api/admin/schedule-issues/fix', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, apply: true }),
    })
    setIssues(prev => prev.filter(i => i.id !== id))
  }
  const dismiss = async (id: string) => {
    await fetch('/api/admin/schedule-issues', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'dismissed' }),
    }).catch(() => {})
    setIssues(prev => prev.filter(i => i.id !== id))
  }
  const markAllRead = async () => {
    await Promise.all(issues.map(i => fetch('/api/admin/schedule-issues', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: i.id, status: 'acknowledged' }),
    }).catch(() => {})))
    setIssues([])
  }
  const rescan = async () => {
    setRescanning(true)
    await fetch('/api/admin/schedule-issues', { method: 'POST' }).catch(() => {})
    await load()
    setRescanning(false)
  }

  const counts = { critical: issues.filter(i => i.severity === 'critical').length, warning: issues.filter(i => i.severity === 'warning').length, info: issues.filter(i => i.severity === 'info').length }

  const Bar = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-block mb-3" style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: V.ink, fontWeight: 600, paddingBottom: '6px', borderBottom: `1px solid ${V.ink}`, minWidth: '100px' }}>{children}</div>
  )

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <Bar>{`Schedule Issues (${issues.length})`}</Bar>
        <div className="flex gap-2">
          <button onClick={rescan} disabled={rescanning} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '8px 14px', border: `1px solid ${V.line}`, color: V.ink, background: V.canvas }}>{rescanning ? 'Rescanning…' : 'Clear all & rescan'}</button>
          <button onClick={markAllRead} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '8px 14px', background: V.ink, color: '#fff' }}>Mark all read</button>
        </div>
      </div>

      {GROUP_META.map(g => {
        const groupIssues = issues.filter(i => groupOf(i.type) === g.key)
        if (groupIssues.length === 0) return null
        return (
          <div key={g.key} className="mb-3">
            <div style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: V.warn, fontWeight: 600, marginBottom: 8 }}>{g.label} · {groupIssues.length}</div>
            {groupIssues.map(issue => (
              <div key={issue.id} className="flex items-center justify-between gap-3 px-4 py-3 mb-2" style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
                <div className="min-w-0">
                  <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: V.muted, marginBottom: 4 }}>{issue.severity} · {issue.type.replace(/_/g, ' ')}</div>
                  <div className="truncate" style={{ color: V.ink }}>{issue.message}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => issue.booking_id && (window.location.href = `/dashboard/bookings?edit=${issue.booking_id}`)} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px', background: V.ink, color: '#fff' }}>{ISSUE_ACTION[issue.type] || 'Open'}</button>
                  <button onClick={() => resolveIssue(issue.id)} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px', border: `1px solid ${V.line}`, color: V.ink }}>Resolve</button>
                  <button onClick={() => dismiss(issue.id)} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: V.muted }}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted }}>{counts.critical} critical &nbsp; {counts.warning} warning &nbsp; {counts.info} info</div>
    </div>
  )
}
