import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

// Tenant-aware port from nycmaid.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError
  const { tenantId } = await getTenantForRequest()

  const { data, error } = await supabaseAdmin
    .from('client_feedback')
    .select('*, clients(name, phone, email), campaigns(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    feedback: data,
    totalCount: data?.length || 0,
    unreadCount: data?.filter(d => !d.read).length || 0,
  })
}

export async function PUT(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { tenantId } = await getTenantForRequest()

  const { id, read } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_feedback')
    .update({ read })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const { tenantId } = await getTenantForRequest()

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_feedback')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
