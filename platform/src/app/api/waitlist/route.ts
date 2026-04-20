/**
 * Waitlist — clients whose SMS conversations ended with outcome='waitlisted'.
 * Admin-facing. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data, error } = await supabaseAdmin
      .from('sms_conversations')
      .select('id, name, phone, service_type, booking_checklist, created_at, client_id')
      .eq('tenant_id', tenantId)
      .eq('outcome', 'waitlisted')
      .eq('expired', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const entries = (data || []).map(row => {
      const checklist = (row.booking_checklist as Record<string, unknown> | null) || {}
      return {
        id: row.id,
        name: row.name || (checklist.name as string | undefined) || null,
        phone: row.phone,
        service_type: row.service_type || (checklist.service_type as string | undefined) || null,
        preferred_date: (checklist.waitlist_preferred_date as string | undefined) || (checklist.date as string | undefined) || null,
        preferred_time: (checklist.waitlist_preferred_time as string | undefined) || (checklist.time as string | undefined) || null,
        created_at: row.created_at,
        client_id: row.client_id,
      }
    })

    return NextResponse.json(entries)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/waitlist error:', err)
    return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 })
  }
}
