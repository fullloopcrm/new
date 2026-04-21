/**
 * Quote templates — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data, error } = await supabaseAdmin
      .from('quote_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ templates: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quote-templates', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('quote_templates')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        industry: body.industry || null,
        title_template: body.title_template || null,
        description: body.description || null,
        line_items: body.line_items || [],
        tiers: body.tiers || null,
        terms: body.terms || null,
        default_valid_days: body.default_valid_days || 30,
        default_tax_rate_bps: body.default_tax_rate_bps || 0,
        sort_order: body.sort_order || 0,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ template: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/quote-templates', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
