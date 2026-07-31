import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * trackError() dedup: a repeating (route, message, tenant) within 24h bumps
 * occurrence_count + created_at on the existing open row instead of
 * inserting a new one. Real production gap this closes: cron/system-check's
 * "Notifications (24h)" alert fired identically every run for two weeks
 * straight, piling up 2,500+ rows and burying real signal.
 */

vi.mock('@/lib/telegram', () => ({
  alertOwner: vi.fn(async () => null),
  alertOwnerCritical: vi.fn(async () => undefined),
}))

type Row = Record<string, unknown>
const rows: Row[] = []
let idSeq = 0

function matches(r: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => (r[k] ?? null) === (v ?? null))
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'error_logs') return { insert: async () => ({ data: null, error: null }) }
      const eqs: Record<string, unknown> = {}
      let gteCreatedAt: string | null = null
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
        is: (col: string, val: unknown) => { eqs[col] = val; return chain },
        gte: (col: string, val: string) => { if (col === 'created_at') gteCreatedAt = val; return chain },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          const found = rows
            .filter((r) => matches(r, eqs) && (!gteCreatedAt || (r.created_at as string) >= gteCreatedAt))
            .sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string))[0]
          return { data: found || null, error: null }
        },
        insert: async (row: Row) => {
          const created = { id: `row-${++idSeq}`, resolved: false, dismissed_at: null, created_at: new Date().toISOString(), ...row }
          rows.push(created)
          return { data: created, error: null }
        },
        update: (values: Row) => ({
          eq: async (col: string, val: unknown) => {
            const row = rows.find((r) => r[col] === val)
            if (row) Object.assign(row, values)
            return { data: row || null, error: null }
          },
        }),
      }
      return chain
    },
  },
}))

import { trackError } from './error-tracking'
import { alertOwner, alertOwnerCritical } from '@/lib/telegram'

const alertOwnerMock = vi.mocked(alertOwner)
const alertOwnerCriticalMock = vi.mocked(alertOwnerCritical)

beforeEach(() => {
  rows.length = 0
  idSeq = 0
  alertOwnerMock.mockReset()
  alertOwnerCriticalMock.mockReset()
  alertOwnerCriticalMock.mockResolvedValue(undefined)
})

describe('trackError — error_logs dedup', () => {
  it('inserts a fresh row for the first occurrence', async () => {
    await trackError(new Error('System check failed: Notifications'), { source: 'cron/system-check', severity: 'high' })
    expect(rows).toHaveLength(1)
    expect((rows[0].metadata as { occurrence_count: number }).occurrence_count).toBe(1)
  })

  it('bumps occurrence_count on a repeat instead of inserting a new row', async () => {
    await trackError(new Error('System check failed: Notifications'), { source: 'cron/system-check', severity: 'high' })
    await trackError(new Error('System check failed: Notifications'), { source: 'cron/system-check', severity: 'high' })
    await trackError(new Error('System check failed: Notifications'), { source: 'cron/system-check', severity: 'high' })
    expect(rows).toHaveLength(1)
    expect((rows[0].metadata as { occurrence_count: number }).occurrence_count).toBe(3)
  })

  it('does not dedup across different tenants', async () => {
    await trackError(new Error('Booking failed'), { source: 'api/client/book', tenantId: 'tenant-a', severity: 'high' })
    await trackError(new Error('Booking failed'), { source: 'api/client/book', tenantId: 'tenant-b', severity: 'high' })
    expect(rows).toHaveLength(2)
  })

  it('does not dedup against an already-resolved row -- a fixed issue recurring gets its own new row', async () => {
    await trackError(new Error('System check failed'), { source: 'cron/system-check', severity: 'high' })
    rows[0].resolved = true
    await trackError(new Error('System check failed'), { source: 'cron/system-check', severity: 'high' })
    expect(rows).toHaveLength(2)
  })

  it('does not dedup against a dismissed row', async () => {
    await trackError(new Error('System check failed'), { source: 'cron/system-check', severity: 'high' })
    rows[0].dismissed_at = new Date().toISOString()
    await trackError(new Error('System check failed'), { source: 'cron/system-check', severity: 'high' })
    expect(rows).toHaveLength(2)
  })

  it('different error messages on the same route do not dedup against each other', async () => {
    await trackError(new Error('Notifications check failed'), { source: 'cron/system-check', severity: 'high' })
    await trackError(new Error('Email check failed'), { source: 'cron/system-check', severity: 'high' })
    expect(rows).toHaveLength(2)
  })
})

/**
 * Escalation to SMS (alertOwnerCritical) when Telegram itself fails to
 * deliver. Real gap found + fixed 2026-07-31 (ai-03 re-check,
 * docs/readiness/ledger.json): sendTelegram()/alertOwner() never throw on a
 * bad/revoked bot token or wrong chat_id -- they resolve with
 * { ok: false, ... } instead. Before this fix, only severity==='critical'
 * ever triggered the SMS fallback, so a broken Telegram channel left every
 * 'high'-severity alert (error-tracking.ts's own primary escalation path,
 * used far more often than 'critical') with zero real delivery guarantee.
 * Each test below uses a distinct error message so it gets its own
 * alertCooldowns entry and isn't suppressed by an earlier test's cooldown.
 */
describe('trackError — SMS escalation when Telegram delivery fails', () => {
  it('does NOT escalate to SMS for a high-severity error when Telegram delivers successfully (unchanged behavior)', async () => {
    alertOwnerMock.mockResolvedValueOnce({ ok: true, status: 200, body: '{"ok":true}' })
    await trackError(new Error('Escalation test: telegram ok'), { source: 'test/escalation', severity: 'high' })
    expect(alertOwnerMock).toHaveBeenCalledTimes(1)
    expect(alertOwnerCriticalMock).not.toHaveBeenCalled()
  })

  it('DOES escalate to SMS for a high-severity error when Telegram responds with ok:false (the fixed gap)', async () => {
    alertOwnerMock.mockResolvedValueOnce({ ok: false, status: 401, body: '{"ok":false,"description":"Unauthorized"}' })
    await trackError(new Error('Escalation test: telegram unauthorized'), { source: 'test/escalation', severity: 'high' })
    expect(alertOwnerMock).toHaveBeenCalledTimes(1)
    expect(alertOwnerCriticalMock).toHaveBeenCalledTimes(1)
  })

  it('DOES escalate to SMS for a high-severity error when Telegram is not configured at all (alertOwner resolves null)', async () => {
    alertOwnerMock.mockResolvedValueOnce(null)
    await trackError(new Error('Escalation test: telegram not configured'), { source: 'test/escalation', severity: 'high' })
    expect(alertOwnerCriticalMock).toHaveBeenCalledTimes(1)
  })

  it('DOES escalate to SMS for a high-severity error when alertOwner itself rejects (network error)', async () => {
    alertOwnerMock.mockRejectedValueOnce(new Error('network error'))
    await trackError(new Error('Escalation test: telegram network error'), { source: 'test/escalation', severity: 'high' })
    expect(alertOwnerCriticalMock).toHaveBeenCalledTimes(1)
  })

  it('still always escalates to SMS for critical severity regardless of Telegram delivery (unchanged behavior)', async () => {
    alertOwnerMock.mockResolvedValueOnce({ ok: true, status: 200, body: '{"ok":true}' })
    await trackError(new Error('Escalation test: critical always escalates'), { source: 'test/escalation', severity: 'critical' })
    expect(alertOwnerCriticalMock).toHaveBeenCalledTimes(1)
  })
})
