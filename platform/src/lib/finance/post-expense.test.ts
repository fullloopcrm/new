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

// Simulates a real ORIGINAL entry+lines already posted for an expense --
// reverseExpenseFromLedger reads these directly (not through the mocked
// '../ledger' module, which only tracks the idempotency key + call count).
type JournalEntryRow = { id: string; tenant_id: string; source: string; source_id: string }
type JournalLineRow = { coa_id: string; debit_cents?: number; credit_cents?: number; memo?: string }
const JOURNAL_ENTRIES = new Map<string, JournalEntryRow>()
const JOURNAL_LINES = new Map<string, JournalLineRow[]>() // keyed by entry id

function seedOriginalEntry(tenantId: string, expenseId: string, entryId: string, lines: JournalLineRow[]) {
  JOURNAL_ENTRIES.set(entryId, { id: entryId, tenant_id: tenantId, source: 'expense', source_id: expenseId })
  JOURNAL_LINES.set(entryId, lines)
}

// Simulates an expense posted via bank-match instead of at creation: the
// journal entry is keyed source='bank_txn', source_id=<bank txn id> -- not
// source='expense' -- so reverseExpenseFromLedger has to reach it through the
// expense row's own matched_bank_transaction_id.
function seedBankMatchedEntry(tenantId: string, expenseId: string, txnId: string, entryId: string, lines: JournalLineRow[]) {
  const row = EXPENSES.get(expenseId)
  EXPENSES.set(expenseId, { id: expenseId, category: null, amount: 0, date: '2026-07-10', description: null, ...row, matched_bank_transaction_id: txnId } as unknown as { id: string; category: string | null; amount: number; date: string; description: string | null })
  JOURNAL_ENTRIES.set(entryId, { id: entryId, tenant_id: tenantId, source: 'bank_txn', source_id: txnId })
  JOURNAL_LINES.set(entryId, lines)
  BANK_TXNS.set(txnId, { id: txnId, tenant_id: tenantId, status: 'posted', journal_entry_id: entryId })
}

function journalEntriesBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    maybeSingle: async () => {
      const filters = (chain.__filters as Record<string, unknown>) || {}
      const hit = [...JOURNAL_ENTRIES.values()].find(
        (r) => r.tenant_id === filters.tenant_id && r.source === filters.source && r.source_id === filters.source_id
      )
      return { data: hit ? { id: hit.id } : null, error: null }
    },
  }
  return chain
}

function journalLinesBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    then: (resolve: (v: { data: JournalLineRow[]; error: null }) => void) => {
      const filters = (chain.__filters as Record<string, unknown>) || {}
      const rows = JOURNAL_LINES.get(filters.entry_id as string) || []
      resolve({ data: rows, error: null })
    },
  }
  return chain
}

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

// bank_transactions: only what reverseExpenseFromLedger's bank-match path
// needs -- matched_bank_transaction_id lookup on 'expenses' (above) plus the
// post-reversal status/journal_entry_id reset here.
type BankTxnRow = { id: string; tenant_id: string; status: string; journal_entry_id: string | null }
const BANK_TXNS = new Map<string, BankTxnRow>()

function bankTransactionsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      chain.__filters = { ...(chain.__filters as object), [col]: val }
      return chain
    },
    update: (values: Record<string, unknown>) => {
      chain.__update = values
      return chain
    },
    then: (resolve: (v: { data: null; error: null }) => void) => {
      const filters = (chain.__filters as Record<string, unknown>) || {}
      const update = chain.__update as Record<string, unknown> | undefined
      if (update) {
        const row = BANK_TXNS.get(filters.id as string)
        if (row && row.tenant_id === filters.tenant_id) Object.assign(row, update)
      }
      resolve({ data: null, error: null })
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
    from: (table: string) => {
      if (table === 'chart_of_accounts') return coaBuilder()
      if (table === 'journal_entries') return journalEntriesBuilder()
      if (table === 'journal_lines') return journalLinesBuilder()
      if (table === 'bank_transactions') return bankTransactionsBuilder()
      return expensesBuilder()
    },
  },
}))

import { postExpenseToLedger, reverseExpenseFromLedger } from './post-expense'

const TENANT = 'tenant_1'

beforeEach(() => {
  posted.clear()
  postJournalEntry.mockClear()
  EXPENSES.clear()
  JOURNAL_ENTRIES.clear()
  JOURNAL_LINES.clear()
  BANK_TXNS.clear()
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

describe('reverseExpenseFromLedger', () => {
  it('posts the exact opposite of every line on the original entry -- net effect zero', async () => {
    seedOriginalEntry(TENANT, 'exp-10', 'je-10', [
      { coa_id: 'acct_5100', debit_cents: 22000, memo: 'Rotted decking replacement' },
      { coa_id: 'acct_2450', credit_cents: 22000, memo: 'Rotted decking replacement' },
    ])
    const res = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-10' })
    expect(res.posted).toBe(true)
    const call = postJournalEntry.mock.calls[0][0]
    expect(call.source).toBe('expense_reversal')
    expect(call.source_id).toBe('exp-10')
    // Original DR 5100/CR 2450 flips to CR 5100/DR 2450 -- undoes the cost.
    expect(call.lines.find((l: { coa_id: string }) => l.coa_id === 'acct_5100')).toMatchObject({ credit_cents: 22000, debit_cents: 0 })
    expect(call.lines.find((l: { coa_id: string }) => l.coa_id === 'acct_2450')).toMatchObject({ debit_cents: 22000, credit_cents: 0 })
  })

  it('is idempotent -- reversing the same expense twice only posts once', async () => {
    seedOriginalEntry(TENANT, 'exp-11', 'je-11', [
      { coa_id: 'acct_6900', debit_cents: 5000, memo: 'x' },
      { coa_id: 'acct_2450', credit_cents: 5000, memo: 'x' },
    ])
    const first = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-11' })
    const second = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-11' })
    expect(first.posted).toBe(true)
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_reversed')
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('is a safe no-op when the expense was never posted to the ledger (e.g. zero-amount)', async () => {
    const res = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'never-posted' })
    expect(res.posted).toBe(false)
    expect(res.reason).toBe('no_original_entry')
    expect(postJournalEntry).not.toHaveBeenCalled()
  })

  it('does not reverse another tenant\'s entry for the same expense id', async () => {
    seedOriginalEntry('tenant_2', 'exp-12', 'je-12', [
      { coa_id: 'acct_5100', debit_cents: 900, memo: 'x' },
      { coa_id: 'acct_2450', credit_cents: 900, memo: 'x' },
    ])
    const res = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-12' })
    expect(res.posted).toBe(false)
    expect(res.reason).toBe('no_original_entry')
    expect(postJournalEntry).not.toHaveBeenCalled()
  })

  // GAP (closed here): an expense that was NEVER posted at creation (e.g. it
  // predates postExpenseToLedger, or creation-time posting failed) but was
  // later linked to a bank line via finance/bank-transactions/[id]/match
  // posts its cost under source='bank_txn', source_id=<bank txn id> -- not
  // source='expense'. Deleting that expense used to look ONLY for the
  // 'expense' key, find nothing, and let the delete proceed with the real
  // bank-matched cost left permanently un-reversed on the P&L, while the
  // bank_transactions row stayed stuck 'matched'/'posted' forever, unable to
  // be rematched to anything else.
  it('reverses a bank-match-sourced entry (no source=expense entry exists) via matched_bank_transaction_id', async () => {
    seedBankMatchedEntry(TENANT, 'exp-20', 'txn-20', 'je-20', [
      { coa_id: 'acct_6050', debit_cents: 8000, memo: 'Home Depot' },
      { coa_id: 'acct_2450', credit_cents: 8000, memo: 'Home Depot' },
    ])
    const res = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-20' })
    expect(res.posted).toBe(true)
    const call = postJournalEntry.mock.calls[0][0]
    expect(call.source).toBe('expense_reversal')
    expect(call.source_id).toBe('exp-20')
    expect(call.lines.find((l: { coa_id: string }) => l.coa_id === 'acct_6050')).toMatchObject({ credit_cents: 8000, debit_cents: 0 })
    expect(call.lines.find((l: { coa_id: string }) => l.coa_id === 'acct_2450')).toMatchObject({ debit_cents: 8000, credit_cents: 0 })
  })

  it('releases the matched bank transaction back to a matchable status after reversing its entry', async () => {
    seedBankMatchedEntry(TENANT, 'exp-21', 'txn-21', 'je-21', [
      { coa_id: 'acct_6050', debit_cents: 3000, memo: 'x' },
      { coa_id: 'acct_2450', credit_cents: 3000, memo: 'x' },
    ])
    await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-21' })
    const txn = BANK_TXNS.get('txn-21')!
    expect(txn.status).toBe('categorized')
    expect(txn.journal_entry_id).toBeNull()
  })

  it('prefers the source=expense entry over a bank match when (in theory) both are present', async () => {
    seedBankMatchedEntry(TENANT, 'exp-22', 'txn-22', 'je-22-bank', [
      { coa_id: 'acct_6050', debit_cents: 1, memo: 'should not be used' },
      { coa_id: 'acct_2450', credit_cents: 1, memo: 'should not be used' },
    ])
    seedOriginalEntry(TENANT, 'exp-22', 'je-22-expense', [
      { coa_id: 'acct_5100', debit_cents: 4000, memo: 'real one' },
      { coa_id: 'acct_2450', credit_cents: 4000, memo: 'real one' },
    ])
    const res = await reverseExpenseFromLedger({ tenantId: TENANT, expenseId: 'exp-22' })
    expect(res.posted).toBe(true)
    const call = postJournalEntry.mock.calls[0][0]
    expect(call.lines.find((l: { coa_id: string }) => l.coa_id === 'acct_5100')).toMatchObject({ credit_cents: 4000 })
    // The bank_transactions row is untouched -- reversal used the 'expense' key.
    const txn = BANK_TXNS.get('txn-22')!
    expect(txn.status).toBe('posted')
  })
})
