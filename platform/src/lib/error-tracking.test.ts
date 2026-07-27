import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * trackError() dedup: a repeating (route, message, tenant) within 24h bumps
 * occurrence_count + created_at on the existing open row instead of
 * inserting a new one. Real production gap this closes: cron/system-check's
 * "Notifications (24h)" alert fired identically every run for two weeks
 * straight, piling up 2,500+ rows and burying real signal.
 */

vi.mock('@/lib/telegram', () => ({ alertOwner: vi.fn(async () => null) }))

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

beforeEach(() => {
  rows.length = 0
  idSeq = 0
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
