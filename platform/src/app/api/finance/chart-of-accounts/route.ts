/**
 * Chart of Accounts — list + create + seed defaults.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { seedChartOfAccounts } from '@/lib/ledger'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    // tenantDb auto-injects .eq('tenant_id', tenantId) on the read below.
    const { data, error } = await tenantDb(tenantId)
      .from('chart_of_accounts')
      .select('*')
      .order('code', { ascending: true })
    if (error) throw error
    return NextResponse.json({ accounts: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/chart-of-accounts', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const body = await request.json().catch(() => ({}))

    if (body.seed_defaults) {
      const inserted = await seedChartOfAccounts(tenantId)
      return NextResponse.json({ ok: true, seeded: inserted })
    }

    if (!body.code || !body.name || !body.type) {
      return NextResponse.json({ error: 'code, name, type required' }, { status: 400 })
    }

    // tenantDb.insert stamps tenant_id last, so a forged body value can't win.
    const { data, error } = await tenantDb(tenantId)
      .from('chart_of_accounts')
      .insert({
        code: body.code,
        name: body.name,
        type: body.type,
        subtype: body.subtype || null,
        parent_id: body.parent_id || null,
        is_bank_account: !!body.is_bank_account,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ account: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/chart-of-accounts', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
