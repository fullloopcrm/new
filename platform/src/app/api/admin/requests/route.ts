import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { LEAD_STAGES, normalizeStage, isLeadStage } from '@/lib/lead-stages'
import { computeFit } from '@/lib/lead-fit'
import { upsertSalesContact } from '@/lib/sales-contacts'

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
    const { id, status, admin_notes, qualifying_answers } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    if (status === undefined && admin_notes === undefined && qualifying_answers === undefined) {
      return NextResponse.json({ error: 'Provide a status, admin_notes, or qualifying_answers to update' }, { status: 400 })
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

    if (qualifying_answers !== undefined) {
      updateData.qualifying_answers = qualifying_answers
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

// Manual lead entry from the admin Leads panel. Mirrors the public /qualify
// form field-for-field and produces an identical partner_requests row
// (same fit scoring), so admin-created leads look the same in the pipeline.
export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const orNull = (v: unknown) => str(v) || null
  const business_name = str(body.business_name)
  const contact_name = str(body.owner_name)
  const email = str(body.owner_email).toLowerCase()

  if (!business_name || !contact_name || !email) {
    return NextResponse.json(
      { error: 'Business name, contact name, and email are required' },
      { status: 400 }
    )
  }

  const fit = computeFit({
    automation_comfort: str(body.automation_comfort) || null,
    growth_goal: str(body.growth_goal) || null,
    revenue_trajectory: str(body.revenue_trajectory) || null,
    timeline: str(body.timeline) || null,
    current_system: str(body.current_system) || null,
    lead_gen_spend: str(body.lead_gen_spend) || null,
    wants_automation: body.wants_automation === true,
    wants_growth: body.wants_growth === true,
    comparing_prices: body.comparing_prices === true,
  })

  // Canonical contact (dedupe by email) — lead attaches to it.
  const contactId = await upsertSalesContact({
    business_name,
    contact_name,
    email,
    phone: str(body.owner_phone),
    service_category: str(body.trade),
    city: str(body.primary_city),
    state: str(body.primary_state),
    source: 'Admin (manual)',
  })

  const { data, error } = await supabaseAdmin
    .from('partner_requests')
    .insert({
      business_name,
      contact_name,
      email,
      phone: str(body.owner_phone),
      service_category: str(body.trade) || 'Other',
      contact_id: contactId,
      category_id: orNull(body.category_id),
      territory_id: orNull(body.territory_id),
      city: str(body.primary_city) || 'N/A',
      state: str(body.primary_state) || 'NA',
      billing_address: orNull(body.billing_address),
      billing_city: orNull(body.billing_city),
      billing_state: orNull(body.billing_state),
      billing_zip: orNull(body.billing_zip),
      monthly_revenue: orNull(body.annual_revenue),
      current_system: orNull(body.current_system),
      revenue_trajectory: orNull(body.revenue_trajectory),
      growth_goal: orNull(body.growth_goal),
      automation_comfort: orNull(body.automation_comfort),
      lead_gen_spend: orNull(body.lead_gen_spend),
      pain_point: orNull(body.pain_point),
      timeline: orNull(body.timeline),
      wants_automation: body.wants_automation ?? null,
      wants_growth: body.wants_growth ?? null,
      comparing_prices: body.comparing_prices ?? null,
      fit_score: fit.score,
      fit_bucket: fit.bucket,
      referral_source: 'Admin (manual)',
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id })
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('partner_requests')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
