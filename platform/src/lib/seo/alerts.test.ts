import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * checkCriticalSeoAlerts() diffs open critical seo_issues (site_down,
 * index_cliff) against the last alerted snapshot and pages Jeff via
 * alertOwner() only for fingerprints (type:property) that are NEW —
 * mirrors jefe/heartbeat.ts's dedup pattern so a site that stays down for
 * days doesn't spam a Telegram alert on every cron tick.
 */

type IssueRow = { property: string; type: string; severity: string; target_url: string | null; detail: Record<string, unknown> | null }

let issueRows: IssueRow[]
let lastSnapshot: { active_fingerprints: string[] } | null
let insertedSnapshots: Array<{ active_fingerprints: string[] }>
let inCalls: Array<{ table: string; col: string; vals: unknown[] }>

function builder(table: string) {
  const state: { eq: Record<string, unknown>; inCol?: string; inVals?: unknown[] } = { eq: {} }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      state.eq[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      state.inCol = col
      state.inVals = vals
      inCalls.push({ table, col, vals })
      return chain
    },
    order: () => chain,
    limit: async () => {
      if (table === 'seo_alert_snapshots') {
        return { data: lastSnapshot ? [lastSnapshot] : [], error: null }
      }
      return { data: [], error: null }
    },
    insert: async (row: Record<string, unknown>) => {
      if (table === 'seo_alert_snapshots') {
        insertedSnapshots.push(row as { active_fingerprints: string[] })
      }
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'seo_issues') {
        resolve({ data: issueRows, error: null })
      } else {
        resolve({ data: [], error: null })
      }
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const alertOwner = vi.fn(async (_subject: string, _detail?: string) => ({ ok: true, status: 200, body: '' }))
vi.mock('@/lib/telegram', () => ({
  alertOwner: (subject: string, detail?: string) => alertOwner(subject, detail),
}))

import { checkCriticalSeoAlerts } from './alerts'

describe('checkCriticalSeoAlerts()', () => {
  beforeEach(() => {
    issueRows = []
    lastSnapshot = null
    insertedSnapshots = []
    inCalls = []
    alertOwner.mockClear()
  })

  it('sends nothing when there are no open critical issues', async () => {
    const result = await checkCriticalSeoAlerts()
    expect(result).toEqual({ checked: 0, active: 0, new: 0, sent: false })
    expect(alertOwner).not.toHaveBeenCalled()
    expect(insertedSnapshots).toHaveLength(1)
    expect(insertedSnapshots[0].active_fingerprints).toEqual([])
  })

  it('alerts on a freshly-appeared site_down issue', async () => {
    issueRows = [
      {
        property: 'sc-domain:example.com',
        type: 'site_down',
        severity: 'critical',
        target_url: 'https://www.example.com/',
        detail: { http_status: 0, vercel_error: 'DEPLOYMENT_NOT_FOUND' },
      },
    ]

    const result = await checkCriticalSeoAlerts()

    expect(result.new).toBe(1)
    expect(result.sent).toBe(true)
    expect(result.send_ok).toBe(true)
    expect(alertOwner).toHaveBeenCalledTimes(1)
    const [subject, detail] = alertOwner.mock.calls[0]
    expect(subject).toContain('1 new critical issue')
    expect(detail).toContain('SITE DOWN: sc-domain:example.com')
    expect(detail).toContain('DEPLOYMENT_NOT_FOUND')
    expect(insertedSnapshots[0].active_fingerprints).toEqual(['site_down:sc-domain:example.com'])
  })

  it('does NOT re-alert an issue already in the last snapshot', async () => {
    issueRows = [
      { property: 'sc-domain:example.com', type: 'site_down', severity: 'critical', target_url: null, detail: null },
    ]
    lastSnapshot = { active_fingerprints: ['site_down:sc-domain:example.com'] }

    const result = await checkCriticalSeoAlerts()

    expect(result.active).toBe(1)
    expect(result.new).toBe(0)
    expect(result.sent).toBe(false)
    expect(alertOwner).not.toHaveBeenCalled()
  })

  it('alerts again once a resolved issue reopens (fingerprint absent from latest snapshot)', async () => {
    issueRows = [
      { property: 'sc-domain:example.com', type: 'site_down', severity: 'critical', target_url: null, detail: null },
    ]
    // Previous snapshot had it, but the issue was cleared and reopened before
    // this run — the current open set is what matters, not history beyond
    // the single latest snapshot, so this still only alerts on what wasn't
    // in the immediately-prior snapshot.
    lastSnapshot = { active_fingerprints: [] }

    const result = await checkCriticalSeoAlerts()
    expect(result.new).toBe(1)
    expect(alertOwner).toHaveBeenCalledTimes(1)
  })

  it('formats an index_cliff issue with before/after indexed counts', async () => {
    issueRows = [
      {
        property: 'sc-domain:homeservicesbusinesscrm.com',
        type: 'index_cliff',
        severity: 'critical',
        target_url: null,
        detail: { prev_indexed: 19000, current_indexed: 1005 },
      },
    ]

    await checkCriticalSeoAlerts()
    const detail = alertOwner.mock.calls[0][1]
    expect(detail).toContain('INDEX CLIFF: sc-domain:homeservicesbusinesscrm.com — indexed pages 19000 → 1005')
  })

  it('only queries site_down and index_cliff types on seo_issues', async () => {
    await checkCriticalSeoAlerts()
    const issuesQuery = inCalls.find((c) => c.table === 'seo_issues')
    expect(issuesQuery?.col).toBe('type')
    expect(issuesQuery?.vals).toEqual(['site_down', 'index_cliff'])
  })
})
