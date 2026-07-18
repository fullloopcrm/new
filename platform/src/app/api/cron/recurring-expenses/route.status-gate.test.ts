import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * recurring-expenses cron — tenantServesSite() status gate.
 *
 * Same bug class as every other cross-tenant fan-out fixed this session
 * (Telegram/Telnyx webhooks, comhub-email cron, generate-recurring):
 * recurring_expenses carries no tenant status of its own, and this loop
 * never checked tenantServesSite() before posting a brand-new journal_entries
 * row — a suspended/cancelled/deleted tenant's recurring expense kept
 * posting real ledger entries to its own P&L, indefinitely, every period it
 * fired.
 */

const postJournalEntry = vi.fn(async (_arg: unknown) => ({}))
vi.mock('@/lib/ledger', () => ({
  postJournalEntry: (arg: unknown) => postJournalEntry(arg),
  toSourceUuid: (id: string) => id,
}))

const SUSPENDED_TENANT_ID = 't-suspended'
const ACTIVE_TENANT_ID = 't-active'

let dueRows: Record<string, unknown>[]
let tenantStatusMap: Record<string, string | null>
const recurringExpenseUpdates: Array<{ id: string; patch: Record<string, unknown> }> = []

function recurringExpensesBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    lte: () => obj,
    limit: () => obj,
    update: (patch: Record<string, unknown>) => ({
      eq: (col: string, val: unknown) => {
        if (col === 'id') recurringExpenseUpdates.push({ id: val as string, patch })
        return Promise.resolve({ data: null, error: null })
      },
    }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: dueRows, error: null }).then(resolve),
  }
  return obj
}

function tenantsBuilder() {
  const state: { ids: string[] } = { ids: [] }
  const obj: Record<string, unknown> = {
    select: () => obj,
    in: (_col: string, vals: string[]) => {
      state.ids = vals
      return obj
    },
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve({
        data: state.ids.map((id) => ({ id, status: tenantStatusMap[id] ?? null })),
        error: null,
      }).then(resolve),
  }
  return obj
}

function journalEntriesBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    limit: () => obj,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  }
  return obj
}

function chartOfAccountsBuilder() {
  const obj: Record<string, unknown> = {
    select: () => obj,
    eq: () => obj,
    or: () => obj,
    limit: () => obj,
    maybeSingle: () => Promise.resolve({ data: { id: 'coa-1' }, error: null }),
  }
  return obj
}

function notificationsBuilder() {
  return {
    insert: (_row: unknown) => ({
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    }),
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'recurring_expenses') return recurringExpensesBuilder()
      if (table === 'tenants') return tenantsBuilder()
      if (table === 'journal_entries') return journalEntriesBuilder()
      if (table === 'chart_of_accounts') return chartOfAccountsBuilder()
      if (table === 'notifications') return notificationsBuilder()
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { POST } = await import('./route')

function req() {
  return new Request('http://t/api/cron/recurring-expenses', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  postJournalEntry.mockClear()
  recurringExpenseUpdates.length = 0
})

describe('recurring-expenses cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'does not post a journal entry or advance next_due_date for a %s tenant, but still fires for an active tenant',
    async (status) => {
      tenantStatusMap = { [SUSPENDED_TENANT_ID]: status, [ACTIVE_TENANT_ID]: 'active' }
      dueRows = [
        { id: 'r1', tenant_id: SUSPENDED_TENANT_ID, entity_id: null, label: 'Rent', category: 'rent', amount_cents: 10000, frequency: 'monthly', next_due_date: '2026-07-01', failure_count: 0 },
        { id: 'r2', tenant_id: ACTIVE_TENANT_ID, entity_id: null, label: 'Rent', category: 'rent', amount_cents: 20000, frequency: 'monthly', next_due_date: '2026-07-01', failure_count: 0 },
      ]

      const res = await POST(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.fired).toBe(1)
      expect(body.failed).toBe(0)
      expect(postJournalEntry).toHaveBeenCalledTimes(1)
      expect(postJournalEntry).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: ACTIVE_TENANT_ID }))
      expect(recurringExpenseUpdates.map((u) => u.id)).toEqual(['r2'])
    },
  )

  it.each(['active', 'setup', 'pending'])('still fires for a %s tenant', async (status) => {
    tenantStatusMap = { [ACTIVE_TENANT_ID]: status }
    dueRows = [
      { id: 'r1', tenant_id: ACTIVE_TENANT_ID, entity_id: null, label: 'Rent', category: 'rent', amount_cents: 10000, frequency: 'monthly', next_due_date: '2026-07-01', failure_count: 0 },
    ]

    const res = await POST(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.fired).toBe(1)
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
    expect(recurringExpenseUpdates.map((u) => u.id)).toEqual(['r1'])
  })
})
