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

// The financial slice of schedule_issues (same table + API as
// ScheduleIssues.tsx, filtered the other way) — payment_overdue,
// cleaner_unpaid, price_mismatch are money problems, not scheduling ones,
// so they get their own panel instead of hiding inside "Schedule Issues".
const BILLING_TYPES = new Set(['payment_overdue', 'cleaner_unpaid', 'price_mismatch'])
const ISSUE_ACTION: Record<string, string> = {
  payment_overdue: 'Collect', cleaner_unpaid: 'Pay', price_mismatch: 'Review price',
}
const issueHref = (issue: ScheduleIssue): string | null =>
  issue.booking_id ? `/dashboard/bookings?edit=${issue.booking_id}` : null

const V = {
  line: 'var(--color-loop-line)', canvas: 'var(--color-loop-canvas)', ink: 'var(--color-loop-ink)',
  muted: 'var(--color-loop-muted)', warn: 'var(--color-loop-warn)', mono: 'var(--mono)',
}

export default function BillingIssues() {
  const [issues, setIssues] = useState<ScheduleIssue[]>([])
  const [rescanning, setRescanning] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/schedule-issues')
    if (res.ok) {
      const data = (await res.json()) as ScheduleIssue[]
      setIssues(data.filter(i => BILLING_TYPES.has(i.type)))
    }
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
    await fetch(`/api/admin/schedule-issues?id=${id}`, { method: 'DELETE' }).catch(() => {})
    setIssues(prev => prev.filter(i => i.id !== id))
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
        <Bar>{`Billing Issues (${issues.length})`}</Bar>
        <div className="flex gap-2">
          <button onClick={rescan} disabled={rescanning} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '8px 14px', border: `1px solid ${V.line}`, color: V.ink, background: V.canvas }}>{rescanning ? 'Rescanning…' : 'Clear all & rescan'}</button>
          <button onClick={() => setIssues([])} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '8px 14px', background: V.ink, color: '#fff' }}>Mark all read</button>
        </div>
      </div>

      {issues.map(issue => (
        <div key={issue.id} className="flex items-center justify-between gap-3 px-4 py-3 mb-2" style={{ background: V.canvas, border: `1px solid ${V.line}` }}>
          <div className="min-w-0">
            <div style={{ fontFamily: V.mono, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.12em', color: V.muted, marginBottom: 4 }}>{issue.severity} · {issue.type.replace(/_/g, ' ')}</div>
            <div className="truncate" style={{ color: V.ink }}>{issue.message}</div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={() => { const href = issueHref(issue); if (href) window.location.href = href }} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px', background: V.ink, color: '#fff' }}>{ISSUE_ACTION[issue.type] || 'Open'}</button>
            <button onClick={() => resolveIssue(issue.id)} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 12px', border: `1px solid ${V.line}`, color: V.ink }}>Resolve</button>
            <button onClick={() => dismiss(issue.id)} style={{ fontFamily: V.mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: V.muted }}>Dismiss</button>
          </div>
        </div>
      ))}

      <div style={{ fontFamily: V.mono, fontSize: '10.5px', color: V.muted }}>{counts.critical} critical &nbsp; {counts.warning} warning &nbsp; {counts.info} info</div>
    </div>
  )
}
