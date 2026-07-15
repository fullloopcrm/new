/**
 * Double-entry ledger helpers.
 */
import { supabaseAdmin } from './supabase'
import { createHash } from 'crypto'

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export const DEFAULT_CHART: Array<{
  code: string
  name: string
  type: AccountType
  subtype?: string
  is_bank_account?: boolean
}> = [
  // Assets
  { code: '1000', name: 'Cash', type: 'asset', subtype: 'cash' },
  { code: '1010', name: 'Operating Checking', type: 'asset', subtype: 'bank', is_bank_account: true },
  { code: '1020', name: 'Savings', type: 'asset', subtype: 'bank', is_bank_account: true },
  // Clearing account: revenue is recognized here the moment a payment lands, then
  // the bank-deposit match moves it 1050 → 1010 (bank). Keeps revenue from being
  // counted twice (once on payment, once on bank categorization).
  { code: '1050', name: 'Undeposited Funds', type: 'asset', subtype: 'clearing' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'ar' },
  { code: '1500', name: 'Equipment', type: 'asset', subtype: 'fixed' },
  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'ap' },
  { code: '2100', name: 'Credit Card Payable', type: 'liability', subtype: 'credit_card' },
  { code: '2200', name: 'Sales Tax Payable', type: 'liability', subtype: 'tax' },
  { code: '2300', name: 'Payroll Liabilities', type: 'liability', subtype: 'payroll' },
  { code: '2350', name: 'Customer Deposits', type: 'liability', subtype: 'deposits' },
  { code: '2400', name: 'Commissions Payable', type: 'liability', subtype: 'payable' },
  { code: '2450', name: 'Payouts in Transit', type: 'liability', subtype: 'clearing' },
  // Equity
  { code: '3000', name: 'Owner Equity', type: 'equity' },
  { code: '3100', name: "Owner's Draw", type: 'equity' },
  { code: '3900', name: 'Retained Earnings', type: 'equity' },
  // Income
  { code: '4000', name: 'Service Revenue', type: 'income', subtype: 'revenue' },
  { code: '4100', name: 'Tips', type: 'income', subtype: 'revenue' },
  { code: '4900', name: 'Other Income', type: 'income' },
  // Cost of services
  { code: '5000', name: 'Contractor Pay', type: 'expense', subtype: 'cogs' },
  { code: '5010', name: 'Wages (W-2)', type: 'expense', subtype: 'cogs' },
  { code: '5100', name: 'Materials & Supplies', type: 'expense', subtype: 'cogs' },
  // Operating expenses
  { code: '6000', name: 'Rent', type: 'expense', subtype: 'operating' },
  { code: '6010', name: 'Insurance', type: 'expense', subtype: 'operating' },
  { code: '6020', name: 'Utilities', type: 'expense', subtype: 'operating' },
  { code: '6030', name: 'Software & Subscriptions', type: 'expense', subtype: 'operating' },
  { code: '6040', name: 'Marketing & Advertising', type: 'expense', subtype: 'operating' },
  { code: '6045', name: 'Referral Commissions', type: 'expense', subtype: 'operating' },
  { code: '6050', name: 'Vehicle & Fuel', type: 'expense', subtype: 'operating' },
  { code: '6060', name: 'Travel', type: 'expense', subtype: 'operating' },
  { code: '6070', name: 'Meals', type: 'expense', subtype: 'operating' },
  { code: '6080', name: 'Office Supplies', type: 'expense', subtype: 'operating' },
  { code: '6090', name: 'Professional Fees', type: 'expense', subtype: 'operating' },
  { code: '6100', name: 'Bank & Payment Fees', type: 'expense', subtype: 'operating' },
  { code: '6110', name: 'Chargebacks', type: 'expense', subtype: 'operating' },
  { code: '6900', name: 'Other Expenses', type: 'expense' },
]

export async function seedChartOfAccounts(tenantId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('chart_of_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
  if ((count || 0) > 0) return 0

  const rows = DEFAULT_CHART.map(a => ({
    tenant_id: tenantId,
    code: a.code,
    name: a.name,
    type: a.type,
    subtype: a.subtype || null,
    is_bank_account: !!a.is_bank_account,
  }))
  const { error } = await supabaseAdmin.from('chart_of_accounts').insert(rows)  // tenant-scope-ok: insert rows carry tenant_id (built above)
  if (error) throw error
  return rows.length
}

export interface JournalLineInput {
  coa_id: string
  debit_cents?: number
  credit_cents?: number
  memo?: string
}

/**
 * Create a balanced journal entry in one transaction.
 * Throws if debits ≠ credits (DB trigger also enforces this).
 */
export async function postJournalEntry(opts: {
  tenant_id: string
  entity_id?: string | null
  entry_date: string  // ISO date
  memo?: string
  source?: string
  source_id?: string
  lines: JournalLineInput[]
  created_by?: string
}): Promise<string | null> {
  const totalDebits = opts.lines.reduce((a, l) => a + (l.debit_cents || 0), 0)
  const totalCredits = opts.lines.reduce((a, l) => a + (l.credit_cents || 0), 0)
  if (totalDebits !== totalCredits) {
    throw new Error(`Unbalanced journal entry: debits ${totalDebits}, credits ${totalCredits}`)
  }
  if (totalDebits === 0) throw new Error('Empty journal entry')

  // Single-transaction insert via RPC. The entry + all lines land together;
  // there's never a transient window where an entry exists with zero lines.
  // The RPC (migration 064) enforces (tenant_id, source, source_id) uniqueness
  // at the DB level and returns NULL on a duplicate post instead of throwing —
  // that NULL is the real idempotency gate, not the caller's pre-check SELECT.
  const { data, error } = await supabaseAdmin.rpc('post_journal_entry', {
    p_tenant_id: opts.tenant_id,
    p_entity_id: opts.entity_id || null,
    p_entry_date: opts.entry_date,
    p_memo: opts.memo || null,
    p_source: opts.source || 'manual',
    p_source_id: opts.source_id || null,
    p_created_by: opts.created_by || null,
    p_lines: opts.lines.map(l => ({
      coa_id: l.coa_id,
      debit_cents: l.debit_cents || 0,
      credit_cents: l.credit_cents || 0,
      memo: l.memo || null,
    })),
  })
  if (error) throw error
  // NULL = the RPC's atomic dedup claim (unique index on tenant_id, source,
  // source_id) lost the race to another concurrent caller posting the same
  // event. Not an error -- callers treat it exactly like their own
  // journalEntryExists() pre-check finding an existing entry.
  if (data === null) return null
  if (typeof data !== 'string') throw new Error('post_journal_entry: no entry id returned')
  return data
}

/** Normalize a bank-txn description for fingerprinting + pattern matching. */
export function normalizeDescription(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b\d{4,}\b/g, '#')         // collapse long numbers
    .replace(/[^a-z0-9# ]/g, '')
    .trim()
}

export function transactionFingerprint(date: string, amountCents: number, description: string): string {
  const key = `${date}|${amountCents}|${normalizeDescription(description)}`
  return createHash('sha256').update(key).digest('hex').slice(0, 32)
}

export function sha256File(bytes: Buffer | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Ensure every account in DEFAULT_CHART exists for a tenant, inserting only the
 * missing ones. Idempotent (unique index on tenant_id+code). This lets new chart
 * codes (e.g. 1050 Undeposited Funds) propagate to tenants seeded before the code
 * existed, lazily on first use — no backfill migration needed.
 */
export async function ensureChartAccounts(tenantId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('chart_of_accounts')
    .select('code')
    .eq('tenant_id', tenantId)
  const have = new Set((existing || []).map((r) => r.code as string))
  const missing = DEFAULT_CHART.filter((a) => !have.has(a.code))
  if (missing.length === 0) return
  const rows = missing.map((a) => ({
    tenant_id: tenantId,
    code: a.code,
    name: a.name,
    type: a.type,
    subtype: a.subtype || null,
    is_bank_account: !!a.is_bank_account,
  }))
  // ignoreDuplicates guards a race where a concurrent request seeds the same code.
  await supabaseAdmin.from('chart_of_accounts').upsert(rows, { onConflict: 'tenant_id,code', ignoreDuplicates: true })
}

/** Resolve a tenant's chart-of-accounts row id by its code (e.g. '4000'). */
export async function getAccountIdByCode(tenantId: string, code: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('chart_of_accounts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', code)
    .maybeSingle()
  return (data?.id as string) || null
}

/**
 * True if `err` is a Postgres unique-violation (23505). `postJournalEntry`
 * throws the raw Postgrest error object from the RPC call, so callers can
 * narrow it this way to treat a concurrent duplicate post as idempotent
 * instead of a real failure — the atomic backstop for the
 * `idx_journal_entries_source_unique` index (2026_07_13_journal_entries_source_unique.sql).
 */
export function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === '23505'
}

/** Has a journal entry already been posted for this (source, source_id)? */
export async function journalEntryExists(tenantId: string, source: string, sourceId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('journal_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source', source)
    .eq('source_id', sourceId)
    .limit(1)
    .maybeSingle()
  return !!data
}
