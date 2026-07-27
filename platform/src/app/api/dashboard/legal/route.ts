/**
 * Legal Overlook API — read-only tip feed + dismiss + one-time disclaimer
 * acknowledgment. No free-text input is ever accepted here: this is a
 * surface-and-dismiss interface, never a chat or Q&A endpoint.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

type Json = Record<string, unknown>

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('compliance')
      .eq('id', tenantId)
      .single()
    const compliance = (tenant?.compliance as Json) || {}

    const { data: notifications } = await supabaseAdmin
      .from('legal_tip_notifications')
      .select('id, tip_id, trigger_type, surfaced_at, dismissed_at, legal_tips(title, body, source_citation, effective_date)')
      .eq('tenant_id', tenantId)
      .is('dismissed_at', null)
      .order('surfaced_at', { ascending: false })

    return NextResponse.json({
      disclaimerAcknowledgedAt: (compliance.legal_overlook_ack_at as string) || null,
      tips: notifications || [],
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/dashboard/legal', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = (await request.json().catch(() => ({}))) as { action?: string; notificationId?: string }

    if (body.action === 'acknowledge_disclaimer') {
      const { data: current } = await supabaseAdmin.from('tenants').select('compliance').eq('id', tenantId).single()
      const compliance = (current?.compliance as Json) || {}
      await supabaseAdmin
        .from('tenants')
        .update({ compliance: { ...compliance, legal_overlook_ack_at: new Date().toISOString() } })
        .eq('id', tenantId)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'dismiss' && body.notificationId) {
      const { error } = await supabaseAdmin
        .from('legal_tip_notifications')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', body.notificationId)
        .eq('tenant_id', tenantId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/dashboard/legal', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
