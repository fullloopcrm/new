import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // Member's pay rate + daily cap.
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate, max_jobs_per_day')
    .eq('id', auth.id)
    .eq('tenant_id', auth.tid)
    .single()

  // Enforce the daily claim cap (hoarding guard) — jobs already assigned to this
  // member that start today.
  const cap = member?.max_jobs_per_day
  if (cap && cap > 0) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tid)
      .eq('team_member_id', auth.id)
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .not('status', 'eq', 'cancelled')
    if ((count ?? 0) >= cap) {
      return NextResponse.json({ error: `Daily job limit reached (${cap})` }, { status: 409 })
    }
  }

  // Atomic claim: the `team_member_id IS NULL` filter on the UPDATE makes this
  // first-writer-wins — a concurrent claim updates zero rows → "already taken".
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      team_member_id: auth.id,
      pay_rate: member?.pay_rate || null,
      status: 'confirmed',
    })
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .is('team_member_id', null)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  return NextResponse.json({ booking: data })
}
