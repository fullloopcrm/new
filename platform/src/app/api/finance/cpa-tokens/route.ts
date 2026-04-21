import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { randomBytes } from 'crypto'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('cpa_access_tokens')
      .select('*, entities(name)')
      .eq('tenant_id', tenantId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ tokens: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({}))
    const token = randomBytes(24).toString('base64url')
    const expiresAt = body.expires_in_days
      ? new Date(Date.now() + Number(body.expires_in_days) * 86400000).toISOString()
      : null
    const { data, error } = await supabaseAdmin
      .from('cpa_access_tokens')
      .insert({
        tenant_id: tenantId,
        entity_id: body.entity_id || null,
        cpa_name: body.cpa_name || null,
        cpa_email: body.cpa_email || null,
        token,
        expires_at: expiresAt,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ token: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    await supabaseAdmin
      .from('cpa_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', body.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
