import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .select('*, chart_of_accounts(code, name, type)')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ bank_accounts: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        institution: body.institution || null,
        type: body.type || 'checking',
        mask: body.mask || null,
        currency: body.currency || 'USD',
        coa_id: body.coa_id || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ bank_account: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
