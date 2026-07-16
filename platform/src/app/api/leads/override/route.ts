/**
 * Admin override for lead_clicks — toggle manual_conversion/manual_sale flags.
 * Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('leads.view')
    if (authError) return authError
    const { tenantId } = tenant
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

    // Both branches read manual_conversion/manual_sale once then compute a
    // toggle from that stale snapshot -- a double-tap or a second admin
    // toggling the same lead concurrently used to land in the gap and
    // silently revert the other click's write (e.g. two "mark as sale"
    // clicks reading the same false both flip to true, losing one intended
    // toggle; or the sale branch's manual_conversion=true side effect gets
    // stomped back to false by a concurrent conversion-toggle click that read
    // conversion before the sale click set it). Re-assert the exact read
    // values in the write's own WHERE and 409 on a lost race, same CAS
    // pattern as every other blind-overwrite fix in this sweep.
    if (type === 'conversion') {
      const { data: claimed, error } = await supabaseAdmin
        .from('lead_clicks')
        .update({ manual_conversion: !data.manual_conversion })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('manual_conversion', data.manual_conversion)
        .select('id')
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!claimed) return NextResponse.json({ error: 'Lead was changed concurrently, try again' }, { status: 409 })
    } else {
      const newSale = !data.manual_sale
      const update: Record<string, boolean> = { manual_sale: newSale }
      if (newSale && !data.manual_conversion) update.manual_conversion = true
      const { data: claimed, error } = await supabaseAdmin
        .from('lead_clicks')
        .update(update)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('manual_sale', data.manual_sale)
        .eq('manual_conversion', data.manual_conversion)
        .select('id')
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!claimed) return NextResponse.json({ error: 'Lead was changed concurrently, try again' }, { status: 409 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('leads/override error:', err)
    return NextResponse.json({ error: 'Override failed' }, { status: 500 })
  }
}
