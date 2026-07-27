import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * logCommsFail() dedup: a repeat of the same (tenant_id, dedupKey) within
 * the window bumps metadata.occurrence_count on the existing unread row
 * instead of inserting a new one — same shape as trackError()'s error_logs
 * dedup, applied to `comms_fail` notification rows so a real, persistent
 * outage alerts once instead of flooding notifications/Telegram/SMS every
 * cycle. Added 2026-07-27 alongside removing the false-positive comms_fail
 * trace in the Telnyx webhook.
 */

type Row = Record<string, unknown>
const rows: Row[] = []
let idSeq = 0

function matches(r: Row, eqs: Record<string, unknown>) {
  return Object.entries(eqs).every(([k, v]) => (r[k] ?? null) === (v ?? null))
}

vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'notifications') return { insert: async () => ({ data: null, error: null }) }
      const eqs: Record<string, unknown> = {}
      let gteCreatedAt: string | null = null
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          if (col === 'metadata->>dedup_key') {
            eqs.__dedup_key = val
          } else {
            eqs[col] = val
          }
          return chain
        },
        gte: (col: string, val: string) => { if (col === 'created_at') gteCreatedAt = val; return chain },
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => {
          const found = rows
            .filter((r) => {
              const metaMatch = eqs.__dedup_key === undefined
                || (r.metadata as Row | undefined)?.dedup_key === eqs.__dedup_key
              const { __dedup_key: _dedupKey, ...rest } = eqs
              return metaMatch && matches(r, rest) && (!gteCreatedAt || (r.created_at as string) >= gteCreatedAt)
            })
            .sort((a, b) => (b.created_at as string).localeCompare(a.created_at as string))[0]
          return { data: found || null, error: null }
        },
        insert: async (row: Row) => {
          if (row.tenant_id === 'THROW') throw new Error('db unavailable')
          const created = { id: `row-${++idSeq}`, read: false, created_at: new Date().toISOString(), ...row }
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

import { logCommsFail } from './comms-fail'

beforeEach(() => {
  rows.length = 0
  idSeq = 0
})

describe('logCommsFail — comms_fail dedup', () => {
  it('inserts a fresh row for the first occurrence', async () => {
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom' })
    expect(rows).toHaveLength(1)
    expect((rows[0].metadata as Row).occurrence_count).toBe(1)
  })

  it('bumps occurrence_count on a repeat instead of inserting a new row', async () => {
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom 1' })
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom 2' })
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom 3' })
    expect(rows).toHaveLength(1)
    expect((rows[0].metadata as Row).occurrence_count).toBe(3)
    expect(rows[0].message).toBe('boom 3')
  })

  it('does not dedup across different tenants', async () => {
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom' })
    await logCommsFail({ tenantId: 't2', title: 'SMS send failed', message: 'boom' })
    expect(rows).toHaveLength(2)
  })

  it('does not dedup across different dedupKeys under the same title', async () => {
    await logCommsFail({ tenantId: 't1', title: 'Zero sms contacts for client', dedupKey: 'zero-contacts:sms:client-a', message: 'a' })
    await logCommsFail({ tenantId: 't1', title: 'Zero sms contacts for client', dedupKey: 'zero-contacts:sms:client-b', message: 'b' })
    expect(rows).toHaveLength(2)
  })

  it('does not dedup against an already-read row', async () => {
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom' })
    rows[0].read = true
    await logCommsFail({ tenantId: 't1', title: 'SMS send failed', message: 'boom' })
    expect(rows).toHaveLength(2)
  })

  it('never throws even if the underlying insert fails', async () => {
    await expect(logCommsFail({ tenantId: 'THROW', title: 't', message: 'm' })).resolves.toBeUndefined()
    expect(rows).toHaveLength(0)
  })
})
