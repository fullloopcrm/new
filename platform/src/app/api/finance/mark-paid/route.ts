import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('finance.payroll')
  if (authError) return authError

  const body = await request.json()
  const { booking_id, type } = body
  if (!booking_id || !type) {
    return NextResponse.json({ error: 'Missing booking_id or type' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (type === 'client') {
    updates.payment_status = 'paid'
  } else if (type === 'cleaner') {
    updates.cleaner_paid = true
    updates.cleaner_paid_at = new Date().toISOString()
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  // Tenant-scoped update — RLS belt-and-suspenders
  const { error } = await supabaseAdmin
    .from('bookings')
    .update(updates)
    .eq('id', booking_id)
    .eq('tenant_id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
