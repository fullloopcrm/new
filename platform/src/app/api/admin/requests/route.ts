import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { LEAD_STAGES, normalizeStage, isLeadStage } from '@/lib/lead-stages'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = (searchParams.get('search') || '').trim().toLowerCase()

  // Fetch all rows, then normalize legacy statuses to pipeline stages and
  // filter/search in memory. The dataset is platform-level (small), and
  // legacy values (pending/approved/rejected) can't be matched by a raw
  // .eq() against canonical stage names.
  const { data, error } = await supabaseAdmin
    .from('partner_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data || []).map((r) => ({ ...r, status: normalizeStage(r.status) }))

  // Counts by canonical stage (computed over the full set, before filtering).
  const counts: Record<string, number> = { total: normalized.length }
  for (const stage of LEAD_STAGES) {
    counts[stage] = normalized.filter((r) => r.status === stage).length
  }

  let requests = normalized
  if (status && status !== 'all') {
    requests = requests.filter((r) => r.status === status)
  }
  if (search) {
    requests = requests.filter((r) =>
      [r.business_name, r.contact_name, r.email, r.city, r.service_category]
        .some((f) => typeof f === 'string' && f.toLowerCase().includes(search))
    )
  }

  return NextResponse.json({ requests, counts })
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, status, admin_notes } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (status === undefined && admin_notes === undefined) {
      return NextResponse.json({ error: 'Provide a status or admin_notes to update' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}

    // Status is optional — notes can be saved on their own. Only stamp the
    // review fields once the lead moves past the initial "new" stage.
    if (status !== undefined) {
      if (!isLeadStage(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${LEAD_STAGES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
      updateData.reviewed_at = status === 'new' ? null : new Date().toISOString()
      updateData.reviewed_by = status === 'new' ? null : 'admin'
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
