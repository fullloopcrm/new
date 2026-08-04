import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { isValidCategoryForType, type FinanceType } from '@/lib/company-finance'

// POST /api/admin/company/finance/bank-transactions/[id]/match
//   { action: 'match', transaction_id }              — link to an existing ledger entry
//   { action: 'create', category, description? }     — create a new ledger entry from this bank row (type inferred from sign)
//   { action: 'ignore' }                              — not a real revenue/expense (e.g. internal transfer)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await ctx.params
  const { data: bankTxn } = await supabaseAdmin.from('platform_bank_transactions').select('*').eq('id', id).single()
  if (!bankTxn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (bankTxn.status !== 'pending') return NextResponse.json({ error: 'Already resolved' }, { status: 409 })

  const payload = await req.json().catch(() => null) as {
    action?: 'match' | 'create' | 'ignore'
    transaction_id?: string
    category?: string
    description?: string
  } | null

  if (payload?.action === 'ignore') {
    const { data, error } = await supabaseAdmin
      .from('platform_bank_transactions')
      .update({ status: 'ignored', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bank_transaction: data })
  }

  if (payload?.action === 'match') {
    if (!payload.transaction_id) return NextResponse.json({ error: 'transaction_id required' }, { status: 400 })
    const { data: bankUpdate, error } = await supabaseAdmin
      .from('platform_bank_transactions')
      .update({ status: 'matched', matched_transaction_id: payload.transaction_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bank_transaction: bankUpdate })
  }

  if (payload?.action === 'create') {
    const type: FinanceType = bankTxn.amount_cents >= 0 ? 'revenue' : 'expense'
    if (!payload.category || !isValidCategoryForType(type, payload.category)) {
      return NextResponse.json({ error: 'invalid category for this transaction direction' }, { status: 400 })
    }
    const { data: ledgerEntry, error: insertError } = await supabaseAdmin
      .from('platform_finance_transactions')
      .insert({
        type,
        category: payload.category,
        amount_cents: Math.abs(bankTxn.amount_cents),
        occurred_on: bankTxn.txn_date,
        description: payload.description?.trim() || bankTxn.description,
        source: 'bank_import',
      })
      .select()
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    const { data: bankUpdate, error: updateError } = await supabaseAdmin
      .from('platform_bank_transactions')
      .update({ status: 'matched', matched_transaction_id: ledgerEntry.id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ bank_transaction: bankUpdate, ledger_entry: ledgerEntry })
  }

  return NextResponse.json({ error: 'action must be match, create, or ignore' }, { status: 400 })
}
