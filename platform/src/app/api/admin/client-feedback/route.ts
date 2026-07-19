/**
 * Clients -> Feedback tab — tenant-scoped list/read/delete.
 * Ported from nycmaid `/api/admin/client-feedback` (commit a37e77ba),
 * scoped to the caller's tenant via requirePermission instead of nycmaid's
 * single-tenant protectAdminAPI.
 */
import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { getPendingFeedbackCredit } from '@/lib/client-feedback'

export async function GET(request: NextRequest) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.view')
    if (authError) return authError

    // Booking-create UI (BookingsAdmin.tsx) checks a single client for an
    // unapplied feedback credit before submitting, so it can pre-fill the
    // flat-dollar discount toggle. Narrow lookup, not the full feedback list.
    const clientId = request.nextUrl.searchParams.get('client_id')
    if (clientId) {
      const pendingCredit = await getPendingFeedbackCredit(tenant.tenantId, clientId)
      return NextResponse.json({ pendingCredit })
    }

    const { data, error } = await supabaseAdmin
      .from('client_feedback')
      .select('*, clients(name, phone, email), campaigns(name)')
      .eq('tenant_id', tenant.tenantId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      feedback: data || [],
      totalCount: data?.length || 0,
      unreadCount: data?.filter((d) => !d.read).length || 0,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function PUT(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.edit')
    if (authError) return authError

    const { id, read } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('client_feedback')
      .update({ read: Boolean(read) })
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('clients.edit')
    if (authError) return authError

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('client_feedback')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
