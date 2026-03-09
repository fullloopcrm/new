import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { payment_status, payment_method, tip_amount } = await request.json()

    const update: Record<string, unknown> = {}
    if (payment_status) update.payment_status = payment_status
    if (payment_method) update.payment_method = payment_method
    if (tip_amount !== undefined) update.tip_amount = tip_amount
    if (payment_status === 'paid') {
      update.payment_date = new Date().toISOString()
      update.status = 'paid'
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update(update)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ booking: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
