import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('reviews.request')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()

    // Allow-listed scalars only — never accept tenant_id (row donation) or the
    // client_id/booking_id/team_member_id FKs (cross-tenant injection) here.
    const updates: Record<string, unknown> = {}
    for (const k of ['rating', 'comment', 'source', 'google_review_url', 'status', 'requested_at', 'completed_at']) {
      if (k in body) updates[k] = body[k]
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
