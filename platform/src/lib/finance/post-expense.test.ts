import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * post-expense.ts — manual expense → ledger posting.
 *
 * GAP (closed here): a manually-entered expense (materials, a subcontractor
 * bill, supplies, rent...) only ever reached ledgerProfitAndLoss -- the
 * app's own "source of truth" P&L, which every current UI/dashboard caller
 * reads by default -- if someone later ran bank reconciliation and matched
 * it to the specific bank line. Every other money-cost event in this
 * codebase (payroll, payouts, referral commissions, recurring expenses)
 * posts immediately at creation; manual expenses were the one exception,
 * silently overstating net profit by every untracked/unmatched dollar of
 * real cost. This posts a manual expense to the ledger the moment it's
 * created, same as postPayrollToLedger.
 */

const posted = new Set<string>()
const key = (t: string, s: string, id: string) => `${t}|${s}|${id}`

type PostedLine = { coa_id: string; debit_cents?: number; credit_cents?: number; memo?: string }
type PostJournalEntryOpts = { tenant_id: string; source?: string; source_id?: string; lines: PostedLine[] }

const postJournalEntry = vi.fn(async (opts: PostJournalEntryOpts) => {
  posted.add(key(opts.tenant_id, opts.source || 'manual', opts.source_id || ''))
  return `entry_${posted.size}`
})

vi.mock('../ledger', () => ({
  postJournalEntry: (opts: PostJournalEntryOpts) => postJournalEntry(opts),
  journalEntryExists: async (tenantId: string, source: string, sourceId: string) => posted.has(key(tenantId, source, sourceId)),
  ensureChartAccounts: async () => {},
  getAccountIdByCode: async (_tenantId: string, code: string) => `acct_${code}`,
}))

const EXPENSES = new Map<string, { id: string; category: string | null; amount: number; date: string; description: string | null }>()
const COA = [
  { id: 'acct_5100', tenant_id: 'tenant_1', type: 'expense', subtype: 'cogs', name: 'Materials & Supplies' },
  { id: 'acct_6050', tenant_id: 'tenant_1', type: 'expense', subtype: 'operating', name: 'Vehicle & Fuel' },
]

function expensesBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    maybeSingle: async () => {
      const filters = (chain.__filters as Record<string, unknown>) || {}
      const row = EXPENSES.get(filters.id as string)
      return { data: row && row.id === filters.id ? row : null, error: null }
    },
  }
  return chain
}

function coaBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    or: (clause: string) => {
      chain.__or = clause
      return chain
    },
    limit: () => chain,
    maybeSingle: async () => {
      const clause = (chain.__or as string) || ''
      // Mirrors the real subtype.eq / name.ilike matching well enough for tests.
      const hit = COA.find(c => clause.includes(`subtype.eq.${c.subtype}`) || clause.toLowerCase().includes(c.name.toLowerCase()))
      return { data: hit ? { id: hit.id } : null, error: null }
    },
  }
  return chain
}

vi.mock('../supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => (table === 'chart_of_accounts' ? coaBuilder() : expensesBuilder()),
  },
}))

import { postExpenseToLedger } from './post-expense'

const TENANT = 'tenant_1'

beforeEach(() => {
  posted.clear()
  postJournalEntry.mockClear()
  EXPENSES.clear()
})

describe('postExpenseToLedger', () => {
  it('posts a category-matched expense: DR the matched CoA, CR the clearing account', async () => {
    EXPENSES.set('exp-1', { id: 'exp-1', category: 'cogs', amount: 22000, date: '2026-07-10', description: 'Rotted decking replacement' })
    const res = await postExpenseToLedger({ tenantId: TENANT, expenseId: 'exp-1' })
    expect(res.posted).toBe(true)
    const call = postJournalEntry.mock.calls[0][0]
    expect(call.lines.find(l => l.debit_cents === 22000)?.coa_id).toBe('acct_5100')
    expect(call.lines.find(l => l.credit_cents === 22000)?.coa_id).toBe('acct_2450')
  })

  it('falls back to 6900 Other Expenses when the category matches no CoA', async () => {
    EXPENSES.set('exp-2', { id: 'exp-2', category: 'random-unmapped-category', amount: 5000, date: '2026-07-10', description: null })
    const res = await postExpenseToLedger({ tenantId: TENANT, expenseId: 'exp-2' })
    expect(res.posted).toBe(true)
    const call = postJournalEntry.mock.calls[0][0]
    expect(call.lines.find(l => l.debit_cents === 5000)?.coa_id).toBe('acct_6900')
  })

  it('is idempotent -- a second post for the same expense id is a no-op', async () => {
    EXPENSES.set('exp-3', { id: 'exp-3', category: 'cogs', amount: 1000, date: '2026-07-10', description: null })
    const first = await postExpenseToLedger({ tenantId: TENANT, expenseId: 'exp-3' })
    const second = await postExpenseToLedger({ tenantId: TENANT, expenseId: 'exp-3' })
    expect(first.posted).toBe(true)
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('does not post a zero-amount expense', async () => {
    EXPENSES.set('exp-4', { id: 'exp-4', category: 'cogs', amount: 0, date: '2026-07-10', description: null })
    const res = await postExpenseToLedger({ tenantId: TENANT, expenseId: 'exp-4' })
    expect(res.posted).toBe(false)
    expect(res.reason).toBe('zero_amount')
    expect(postJournalEntry).not.toHaveBeenCalled()
  })

  it('reports not_found for a missing expense id instead of throwing', async () => {
    const res = await postExpenseToLedger({ tenantId: TENANT, expenseId: 'does-not-exist' })
    expect(res.posted).toBe(false)
    expect(res.reason).toBe('not_found')
  })
})
