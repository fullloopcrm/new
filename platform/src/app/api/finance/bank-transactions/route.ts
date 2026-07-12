/**
 * Bank transactions list — for review/categorization UI.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-injects .eq('tenant_id', tenantId) on the read below.
    const db = tenantDb(tenantId)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const bankAccountId = url.searchParams.get('bank_account_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const entityId = entityIdFromUrl(url)
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 200)

    let q = db
      .from('bank_transactions')
      .select('*, bank_accounts(id, name, mask, entity_id), chart_of_accounts!bank_transactions_coa_id_fkey(id, code, name)')
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
