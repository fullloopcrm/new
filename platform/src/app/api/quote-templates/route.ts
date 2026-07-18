/**
 * Quote templates — list + create. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { normalizeLineItems, capQuoteTextField } from '@/lib/quote'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('sales.view')
    if (authError) return authError
    const { tenantId } = tenant
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
    const { tenant, error: authError } = await requirePermission('sales.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('quote_templates')
      .insert({
        tenant_id: tenantId,
        // Unlike quotes/route.ts, this route previously inserted body.line_items
        // raw -- no array-length cap, no per-item field cap, not even the
        // subtotal recompute normalizeLineItems does. Templates get loaded
        // into the quote builder as a starting point, so an oversized/garbage
        // template silently propagates into every quote built from it.
        name: capQuoteTextField('name', body.name),
        industry: capQuoteTextField('industry', body.industry),
        title_template: capQuoteTextField('title_template', body.title_template),
        description: capQuoteTextField('description', body.description),
        line_items: normalizeLineItems(body.line_items || []),
        tiers: body.tiers || null,
        terms: capQuoteTextField('terms', body.terms),
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
