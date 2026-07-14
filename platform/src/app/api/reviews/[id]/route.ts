import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { requirePermission } from '@/lib/require-permission'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenant, error: authError } = await requirePermission('reviews.request')
    if (authError) return authError
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['status', 'rating', 'comment', 'google_review_url', 'requested_at', 'completed_at'])

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenant.tenantId)
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
