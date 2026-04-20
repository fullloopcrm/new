import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, price, cleaner_pay, actual_hours, payment_status, cleaner_paid, clients(name), team_members(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .or('payment_status.neq.paid,cleaner_paid.is.null,cleaner_paid.eq.false')
      .order('start_time', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const pending = (data || []).map(b => {
      const client = b.clients as unknown as { name: string } | null
      const cleaner = b.team_members as unknown as { name: string } | null
      return {
        id: b.id,
        date: b.start_time,
        client_name: client?.name || 'Unknown',
        cleaner_name: cleaner?.name || 'Unassigned',
        amount: b.price || 0,
        cleaner_pay: b.cleaner_pay || 0,
        actual_hours: b.actual_hours || 0,
        payment_status: b.payment_status,
        cleaner_paid: b.cleaner_paid,
      }
    })

    return NextResponse.json(pending)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
