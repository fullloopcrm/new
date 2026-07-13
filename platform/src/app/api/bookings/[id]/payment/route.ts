import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { payment_status, payment_method, tip_amount, team_paid, team_pay, actual_hours } = await request.json()

    const update: Record<string, unknown> = {}
    if (payment_status) update.payment_status = payment_status
    if (payment_method) update.payment_method = payment_method
    if (tip_amount !== undefined) update.tip_amount = tip_amount
    if (actual_hours !== undefined) update.actual_hours = actual_hours
    if (team_pay !== undefined) update.team_pay = team_pay
    if (team_paid !== undefined) {
      update.team_paid = team_paid
      if (team_paid) update.team_paid_at = new Date().toISOString()
    }
    if (payment_status === 'paid') {
      update.payment_date = new Date().toISOString()
      update.status = 'paid'
    }

    const { data, error } = await tenantDb(tenantId)
      .from('bookings')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (payment_status === 'paid') {
      await audit({ tenantId, action: 'payment.marked_paid', entityType: 'payment', entityId: id, details: { payment_method: payment_method || null, tip_amount: tip_amount ?? null } })
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
