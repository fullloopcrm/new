/**
 * Admin override for lead_clicks — toggle manual_conversion/manual_sale flags.
 * Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id, type } = await request.json()
    if (!id || !type) return NextResponse.json({ error: 'Missing id or type' }, { status: 400 })
    if (type !== 'conversion' && type !== 'sale') {
      return NextResponse.json({ error: 'type must be conversion or sale' }, { status: 400 })
    }

    const { data } = await supabaseAdmin
      .from('lead_clicks')
      .select('manual_conversion, manual_sale')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    if (type === 'conversion') {
      await supabaseAdmin
        .from('lead_clicks')
        .update({ manual_conversion: !data.manual_conversion })
        .eq('id', id)
        .eq('tenant_id', tenantId)
    } else {
      const newSale = !data.manual_sale
      const update: Record<string, boolean> = { manual_sale: newSale }
      if (newSale && !data.manual_conversion) update.manual_conversion = true
      await supabaseAdmin
        .from('lead_clicks')
        .update(update)
        .eq('id', id)
        .eq('tenant_id', tenantId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('leads/override error:', err)
    return NextResponse.json({ error: 'Override failed' }, { status: 500 })
  }
}
