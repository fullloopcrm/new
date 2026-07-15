/**
 * Chart of Accounts — list + create + seed defaults.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { seedChartOfAccounts } from '@/lib/ledger'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { data, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
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

    // parent_id is a caller-supplied self-referencing FK — chart_of_accounts
    // carries its own tenant_id with no cross-tenant constraint, same class as
    // the coa_id/entity_id checks on bank-accounts/expenses/periods. Verify
    // ownership before insert.
    if (body.parent_id) {
      const { data: owned } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id')
        .eq('id', body.parent_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Invalid parent_id' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('chart_of_accounts')
      .insert({
        tenant_id: tenantId,
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
