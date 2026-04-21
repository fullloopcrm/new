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
  { code: '1100', name: 'Accounts Receivable', type: 'asset', subtype: 'ar' },
  { code: '1500', name: 'Equipment', type: 'asset', subtype: 'fixed' },
  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: 'liability', subtype: 'ap' },
  { code: '2100', name: 'Credit Card Payable', type: 'liability', subtype: 'credit_card' },
  { code: '2200', name: 'Sales Tax Payable', type: 'liability', subtype: 'tax' },
  { code: '2300', name: 'Payroll Liabilities', type: 'liability', subtype: 'payroll' },
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
  { code: '5100', name: 'Materials & Supplies', type: 'expense', subtype: 'cogs' },
  // Operating expenses
  { code: '6000', name: 'Rent', type: 'expense', subtype: 'operating' },
  { code: '6010', name: 'Insurance', type: 'expense', subtype: 'operating' },
  { code: '6020', name: 'Utilities', type: 'expense', subtype: 'operating' },
  { code: '6030', name: 'Software & Subscriptions', type: 'expense', subtype: 'operating' },
  { code: '6040', name: 'Marketing & Advertising', type: 'expense', subtype: 'operating' },
  { code: '6050', name: 'Vehicle & Fuel', type: 'expense', subtype: 'operating' },
  { code: '6060', name: 'Travel', type: 'expense', subtype: 'operating' },
  { code: '6070', name: 'Meals', type: 'expense', subtype: 'operating' },
  { code: '6080', name: 'Office Supplies', type: 'expense', subtype: 'operating' },
  { code: '6090', name: 'Professional Fees', type: 'expense', subtype: 'operating' },
  { code: '6100', name: 'Bank & Payment Fees', type: 'expense', subtype: 'operating' },
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
  const { error } = await supabaseAdmin.from('chart_of_accounts').insert(rows)
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
}): Promise<string> {
  const totalDebits = opts.lines.reduce((a, l) => a + (l.debit_cents || 0), 0)
  const totalCredits = opts.lines.reduce((a, l) => a + (l.credit_cents || 0), 0)
  if (totalDebits !== totalCredits) {
    throw new Error(`Unbalanced journal entry: debits ${totalDebits}, credits ${totalCredits}`)
  }
  if (totalDebits === 0) throw new Error('Empty journal entry')

  // Single-transaction insert via RPC. The entry + all lines land together;
  // there's never a transient window where an entry exists with zero lines.
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
