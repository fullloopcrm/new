/**
 * Admin reviews list/update/delete — tenant-scoped.
 * Ported from nycmaid. Auth: reviews.view/reviews.request.
 */
import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('reviews.view')
  if (authError) return authError

  const tenantId = tenant.tenantId
  const { data, error } = await tenantDb(tenantId)
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = {
    pending: (data || []).filter(r => r.status === 'pending').length,
    approved: (data || []).filter(r => r.status === 'approved').length,
    rejected: (data || []).filter(r => r.status === 'rejected').length,
    total: data?.length || 0,
  }

  return NextResponse.json({ reviews: data || [], counts })
}

export async function PUT(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('reviews.request')
  if (authError) return authError

  const { id, status, featured } = await request.json()
  const update: Record<string, unknown> = {}
  if (status) {
    update.status = status
    if (status === 'approved') update.published_at = new Date().toISOString()
    if (status === 'rejected') update.published_at = null
  }
  if (typeof featured === 'boolean') update.featured = featured

  const { error } = await tenantDb(tenant.tenantId)
    .from('reviews')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const { tenant, error: authError } = await requirePermission('reviews.request')
  if (authError) return authError

  const { id } = await request.json()
  const { error } = await tenantDb(tenant.tenantId)
    .from('reviews')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
