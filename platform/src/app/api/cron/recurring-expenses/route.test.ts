import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * cron/recurring-expenses — per-occurrence idempotency vs. migration 061's
 * UNIQUE(tenant_id, source, source_id) index (LIVE on prod as of 2026-07-16
 * 14:35, per deploy log).
 *
 * GAP (closed here): source_id was the recurring_expenses TEMPLATE row's own
 * id (r.id) -- identical on EVERY period it fires, unlike every other ledger
 * source (expense/bank_txn/payroll/refund/...) whose source_id is a real
 * economic event's own id, posted exactly once ever. The 2nd+ period's
 * post_journal_entry() insert collided with the 1st period's row under the
 * unique index (23505); postJournalEntry's own 23505-resolution path (by
 * design, for cross-tenant-safe retries) looked up ANY existing entry for
 * that (tenant,source,source_id) with no entry_date filter and returned the
 * 1ST period's entry id as if the 2nd period's post succeeded. The cron then
 * advanced next_due_date, cleared last_error, and counted it fired — with NO
 * new journal_entries row and no visible error. Net effect: a recurring
 * expense's cost reached the ledger exactly once, ever, no matter how many
 * periods actually fired since — a silent, permanent, compounding P&L
 * understatement.
 *
 * This suite runs the REAL '@/lib/ledger' postJournalEntry (not mocked)
 * against an in-memory rpc('post_journal_entry', ...) fake that enforces the
 * SAME partial unique index migration 061 put on prod (tenant_id, source,
 * source_id) -- so this test would have failed against the pre-fix code
 * (source_id=r.id) exactly the way prod silently did, and proves the fix
 * (per-occurrence hashed source_id) makes every period post its own real row.
 */

const CRON_SECRET = 'test-cron-secret'
process.env.CRON_SECRET = CRON_SECRET

type RecurringRow = {
  id: string; tenant_id: string; entity_id: string | null; label: string; category: string | null
  amount_cents: number; frequency: string; next_due_date: string; failure_count: number
  active: boolean; last_fired_at: string | null; last_error: string | null
}
type JournalRow = { id: string; tenant_id: string; source: string; source_id: string; entry_date: string }

let recurring: RecurringRow[]
let entries: JournalRow[]
let seq: number
const uqKey = (t: string, s: string, sid: string | null) => `${t}|${s}|${sid}`

const rpc = vi.fn(async (name: string, p: Record<string, unknown>) => {
  if (name !== 'post_journal_entry') throw new Error(`unexpected rpc ${name}`)
  const tenant = String(p.p_tenant_id)
  const source = String(p.p_source ?? 'manual')
  const sourceId = (p.p_source_id as string | null) ?? null
  // Mirrors migration 061's REAL partial unique index: (tenant_id, source,
  // source_id) WHERE source_id IS NOT NULL -- entry_date is NOT part of the
  // key, exactly like prod.
  if (sourceId !== null && entries.some((e) => uqKey(e.tenant_id, e.source, e.source_id) === uqKey(tenant, source, sourceId))) {
    return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_journal_entries_tenant_source"' } }
  }
  const id = `entry_${++seq}`
  entries.push({ id, tenant_id: tenant, source, source_id: sourceId as string, entry_date: String(p.p_entry_date) })
  return { data: id, error: null }
})

function recurringExpensesBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    lte: (col: string, val: unknown) => {
      chain.__lte = { col, val }
      return chain
    },
    limit: () => chain,
    update: (values: Partial<RecurringRow>) => {
      chain.__update = values
      return chain
    },
    then: (resolve: (v: { data: unknown; error: null }) => void) => {
      const update = chain.__update as Partial<RecurringRow> | undefined
      if (update) {
        const filters = (chain.__filters as Record<string, unknown>) || {}
        const row = recurring.find((r) => r.id === filters.id)
        if (row) Object.assign(row, update)
        resolve({ data: null, error: null })
        return
      }
      const filters = (chain.__filters as Record<string, unknown>) || {}
      const lte = chain.__lte as { col: string; val: unknown } | undefined
      let rows = recurring.filter((r) =>
        Object.entries(filters).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v)
      )
      if (lte) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)[lte.col] as string <= (lte.val as string))
      resolve({ data: rows, error: null })
    },
  }
  return chain
}

function journalEntriesBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    limit: () => chain,
    maybeSingle: async () => {
      // Only match on filters actually chained -- mirrors real PostgREST/
      // supabase-js: a query with fewer .eq()s is a broader match. ledger.ts's
      // own 23505-resolution lookup (real code, not mocked in this suite)
      // deliberately does NOT filter by entry_date, so this must not require
      // one either or it silently fails to find the real winner row.
      const filters = (chain.__filters as Record<string, unknown>) || {}
      const hit = entries.find((e) => Object.entries(filters).every(([k, v]) => (e as unknown as Record<string, unknown>)[k] === v))
      return { data: hit ? { id: hit.id } : null, error: null }
    },
  }
  return chain
}

const COA_EXPENSE = { id: 'coa-expense-1' }
const COA_BANK = { id: 'coa-bank-1' }
let coaExpenseAvailable = true

function chartOfAccountsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    or: () => chain,
    limit: () => chain,
    maybeSingle: async () => {
      const filters = (chain.__filters as Record<string, unknown>) || {}
      if (filters.is_bank_account) return { data: COA_BANK, error: null }
      if (filters.type === 'expense') return coaExpenseAvailable ? { data: COA_EXPENSE, error: null } : { data: null, error: null }
      return { data: null, error: null }
    },
  }
  return chain
}

function notificationsBuilder() {
  const chain: Record<string, unknown> = {
    insert: () => chain,
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'recurring_expenses') return recurringExpensesBuilder()
      if (table === 'journal_entries') return journalEntriesBuilder()
      if (table === 'chart_of_accounts') return chartOfAccountsBuilder()
      if (table === 'notifications') return notificationsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
    rpc: (name: string, params: Record<string, unknown>) => rpc(name, params),
  },
}))

import { POST } from './route'

const TENANT = 'tenant_1'

function seedRecurring(overrides: Partial<RecurringRow> = {}): RecurringRow {
  return {
    id: 'rec-1', tenant_id: TENANT, entity_id: null, label: 'Office Rent', category: 'operating',
    amount_cents: 150000, frequency: 'monthly', next_due_date: '2026-07-01', failure_count: 0,
    active: true, last_fired_at: null, last_error: null,
    ...overrides,
  }
}

function req(): Request {
  return new Request('http://x/api/cron/recurring-expenses', {
    method: 'POST',
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  })
}

beforeEach(() => {
  recurring = []
  entries = []
  seq = 0
  rpc.mockClear()
  coaExpenseAvailable = true
  // Deterministic "today" comfortably past every due-date this suite advances
  // through (multiple monthly periods) — the route computes today via
  // `new Date().toISOString()`, which vitest's system-time fake controls.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-12-31T00:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/recurring-expenses — per-occurrence posting', () => {
  it('posts a real journal entry on the first firing', async () => {
    recurring.push(seedRecurring())
    const res = await POST(req())
    const body = await res.json()
    expect(body.fired).toBe(1)
    expect(body.failed).toBe(0)
    expect(entries.length).toBe(1)
    expect(entries[0].entry_date).toBe('2026-07-01')
  })

  it('advances next_due_date to the next month after firing', async () => {
    recurring.push(seedRecurring())
    await POST(req())
    expect(recurring[0].next_due_date).toBe('2026-08-01')
    expect(recurring[0].last_error).toBeNull()
    expect(recurring[0].failure_count).toBe(0)
  })

  // THE REGRESSION TEST: a 2nd, later period for the SAME recurring template
  // must post its OWN real journal entry, not silently resolve to the 1st
  // period's entry via the unique-index 23505 path. Simulates two cron ticks
  // a month apart by re-running POST after next_due_date has advanced.
  it('a SECOND period for the same recurring row posts a SECOND, distinct journal entry', async () => {
    recurring.push(seedRecurring())
    const first = await POST(req())
    expect((await first.json()).fired).toBe(1)
    expect(entries.length).toBe(1)

    // Second cron tick: next_due_date is now 2026-08-01, still <= "today" in
    // this test (no date filtering beyond the harness's own lte, which we
    // don't restrict here — mirrors a due row still being due).
    const second = await POST(req())
    const secondBody = await second.json()
    expect(secondBody.fired).toBe(1)
    expect(secondBody.failed).toBe(0)

    // The critical assertion: TWO real rows exist, not one.
    expect(entries.length).toBe(2)
    expect(entries[0].source_id).not.toBe(entries[1].source_id)
    expect(entries[0].entry_date).toBe('2026-07-01')
    expect(entries[1].entry_date).toBe('2026-08-01')
    expect(recurring[0].next_due_date).toBe('2026-09-01')
  })

  it('a THIRD period continues to post its own distinct entry (not just a 2nd-time fluke)', async () => {
    recurring.push(seedRecurring())
    await POST(req())
    await POST(req())
    await POST(req())
    expect(entries.length).toBe(3)
    const ids = new Set(entries.map((e) => e.source_id))
    expect(ids.size).toBe(3)
  })

  it('a genuine retry of the SAME period (journal entry already exists for that exact date) does not double-post', async () => {
    recurring.push(seedRecurring())
    // Post period 1 for real.
    await POST(req())
    expect(entries.length).toBe(1)
    // Simulate a crash-before-advance retry: roll next_due_date back to the
    // SAME period that already has a journal_entries row (recurring_expenses
    // update didn't happen, or the cron re-ran before it landed).
    recurring[0].next_due_date = '2026-07-01'
    rpc.mockClear()
    const retry = await POST(req())
    const body = await retry.json()
    expect(body.fired).toBe(1)
    expect(entries.length).toBe(1) // still just the one real row
    expect(rpc).not.toHaveBeenCalled() // dedupe guard short-circuited before the RPC
  })

  it('two DIFFERENT recurring templates never collide with each other', async () => {
    recurring.push(seedRecurring({ id: 'rec-1', next_due_date: '2026-07-01' }))
    recurring.push(seedRecurring({ id: 'rec-2', next_due_date: '2026-07-01' }))
    const res = await POST(req())
    const body = await res.json()
    expect(body.fired).toBe(2)
    expect(entries.length).toBe(2)
  })

  it('records failure_count + last_error without advancing next_due_date when no matching CoA exists', async () => {
    recurring.push(seedRecurring({ category: null }))
    coaExpenseAvailable = false
    const res = await POST(req())
    const body = await res.json()
    expect(body.failed).toBe(1)
    expect(recurring[0].next_due_date).toBe('2026-07-01') // unchanged
    expect(recurring[0].last_error).toBeTruthy()
  })

  it('rejects a request without the correct CRON_SECRET bearer token', async () => {
    const res = await POST(new Request('http://x/api/cron/recurring-expenses', { method: 'POST' }))
    expect(res.status).toBe(401)
  })
})
