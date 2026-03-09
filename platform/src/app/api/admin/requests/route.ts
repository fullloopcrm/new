import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'

const SUPER_ADMIN_IDS = [process.env.SUPER_ADMIN_CLERK_ID || '']

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  let query = supabaseAdmin
    .from('partner_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,city.ilike.%${search}%,service_category.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Compute counts
  const all = data || []
  const counts = {
    total: all.length,
    pending: 0,
    approved: 0,
    rejected: 0,
  }

  // If we filtered by status, we need separate count queries
  if (status && status !== 'all') {
    const { data: allData } = await supabaseAdmin
      .from('partner_requests')
      .select('status')

    if (allData) {
      counts.total = allData.length
      counts.pending = allData.filter((r) => r.status === 'pending').length
      counts.approved = allData.filter((r) => r.status === 'approved').length
      counts.rejected = allData.filter((r) => r.status === 'rejected').length
    }
  } else {
    counts.pending = all.filter((r) => r.status === 'pending').length
    counts.approved = all.filter((r) => r.status === 'approved').length
    counts.rejected = all.filter((r) => r.status === 'rejected').length
  }

  return NextResponse.json({ requests: data, counts })
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId || !SUPER_ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, status, admin_notes } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data, error } = await supabaseAdmin
      .from('partner_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ request: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
