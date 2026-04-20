import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('bank_statements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('month', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function POST(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('finance.expenses')
  if (authError) return authError

  const body = await request.json()
  const { month, account_name, file_url, notes } = body

  const { data, error } = await supabaseAdmin
    .from('bank_statements')
    .insert({ tenant_id: tenant.tenantId, month, account_name, file_url, notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('finance.expenses')
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

  const { data: statement } = await supabaseAdmin
    .from('bank_statements')
    .select('file_url')
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)
    .single()

  if (statement?.file_url) {
    const path = statement.file_url.split('/finance/')[1]
    if (path) await supabaseAdmin.storage.from('finance').remove([path])
  }

  const { error } = await supabaseAdmin
    .from('bank_statements')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
