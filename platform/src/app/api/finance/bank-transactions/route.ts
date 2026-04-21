/**
 * Bank transactions list — for review/categorization UI.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { entityIdFromUrl } from '@/lib/entity'

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const bankAccountId = url.searchParams.get('bank_account_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const entityId = entityIdFromUrl(url)
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 200)

    let q = supabaseAdmin
      .from('bank_transactions')
      .select('*, bank_accounts(id, name, mask, entity_id), chart_of_accounts!bank_transactions_coa_id_fkey(id, code, name)')
      .eq('tenant_id', tenantId)
      .order('txn_date', { ascending: false })
      .limit(limit)

    if (status) q = q.eq('status', status)
    if (bankAccountId) q = q.eq('bank_account_id', bankAccountId)
    if (entityId) q = q.eq('entity_id', entityId)
    if (from) q = q.gte('txn_date', from)
    if (to) q = q.lte('txn_date', to)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ transactions: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/bank-transactions', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
