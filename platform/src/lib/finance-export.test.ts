import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * buildGeneralLedger — row-count regression + wrong-tenant probe + truncation flag.
 *
 * FIXED: buildGeneralLedger queried journal_lines with a flat `.limit(50000)`
 * — any tenant with more than 50k qualifying journal lines in the requested
 * date range got a SILENTLY truncated general ledger inside year-end-zip and
 * cpa/[token]/year-end-zip (no error, missing lines), the exact silent-
 * truncation class this branch already fixed once for bookings/expenses/
 * invoices/payouts via `paginateAll`, just not ported to this function. It
 * now pages like buildTrialBalance already does, with a 200k safety cap that
 * sets `.truncated` instead of failing silently.
 *
 * This mock tracks whichever of `.limit()` / `.range()` was actually called,
 * so it honors the real pre-fix behavior (hard 50k cap) and would fail
 * against the pre-fix code, then passes against the post-fix `.range()`
 * paging.
 */

const A = 'tid-a'
const B = 'tid-b'
const OLD_HARD_LIMIT = 50000

type Row = Record<string, unknown>

function getPath(row: Row, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc as Row | undefined)?.[key], row)
}

const holder = vi.hoisted(() => {
  const state: Record<string, Row[]> = { journal_lines: [] }

  function table(rows: Row[]) {
    let filtered = rows
    let ranged: [number, number] | null = null
    let limited: number | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filtered = filtered.filter(r => getPath(r, col) === val); return chain },
      gte: (col: string, val: unknown) => { filtered = filtered.filter(r => (getPath(r, col) as string) >= (val as string)); return chain },
      lte: (col: string, val: unknown) => { filtered = filtered.filter(r => (getPath(r, col) as string) <= (val as string)); return chain },
      limit: (n: number) => { limited = n; return chain },
      range: (from: number, to: number) => { ranged = [from, to]; return chain },
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) => {
        const page = ranged ? filtered.slice(ranged[0], ranged[1] + 1)
          : limited != null ? filtered.slice(0, limited)
          : filtered
        return Promise.resolve({ data: page, error: null }).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  function from(name: string) {
    return table(state[name] || [])
  }

  return { state, from }
})

vi.mock('./supabase', () => ({ supabaseAdmin: { from: holder.from } }))

import { buildGeneralLedger } from './finance-export'

function makeLines(tenantId: string, count: number, prefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    tenant_id: tenantId,
    debit_cents: 100,
    credit_cents: 0,
    memo: `${prefix}-${i}`,
    chart_of_accounts: { code: '1000', name: 'Cash', type: 'asset' },
    journal_entries: { entry_date: '2026-03-01', memo: null, source: 'manual' },
  }))
}

beforeEach(() => {
  holder.state.journal_lines = []
})

describe('buildGeneralLedger — pagination + tenant isolation', () => {
  it(`does not truncate past the old hard ${OLD_HARD_LIMIT}-row .limit()`, async () => {
    holder.state.journal_lines = [
      ...makeLines(A, OLD_HARD_LIMIT + 50, 'a'),
      ...makeLines(B, 5, 'b'),
    ]
    const rows = await buildGeneralLedger(A, null, '2026-01-01', '2026-12-31')
    expect(rows).toHaveLength(OLD_HARD_LIMIT + 50)
    expect(rows.truncated).toBeUndefined()
  })

  it("excludes the other tenant's journal lines", async () => {
    holder.state.journal_lines = [...makeLines(A, 5, 'a'), ...makeLines(B, 5, 'b')]
    const rows = await buildGeneralLedger(A, null, '2026-01-01', '2026-12-31')
    expect(rows.every(r => (r.memo as string).startsWith('a-'))).toBe(true)
  })

  it('sets .truncated instead of silently dropping rows past the 200k safety cap', async () => {
    holder.state.journal_lines = makeLines(A, 200_050, 'a')
    const rows = await buildGeneralLedger(A, null, '2026-01-01', '2026-12-31')
    expect(rows).toHaveLength(200_000)
    expect(rows.truncated).toBe(true)
  })
})
