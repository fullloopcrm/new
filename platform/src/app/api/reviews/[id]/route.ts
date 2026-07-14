import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()
    // Allow-listed scalars only — never accept tenant_id (row donation) or the
    // client_id/booking_id FKs (cross-tenant injection: GET /api/reviews joins
    // clients(name) unscoped by tenant off client_id).
    const safeBody = pick(body, [
      'rating', 'text', 'response', 'status', 'source', 'service_type', 'neighborhood',
      'team_member_name', 'images', 'video_url', 'verified', 'published_at', 'requested_at',
    ])

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update(safeBody)
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
