import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePortalPermission } from '@/lib/team-portal-auth'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  const { auth, error: permError } = await requirePortalPermission(request, 'jobs.claim')
  if (permError) return permError

  const { booking_id } = await request.json().catch(() => ({}))
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)

  // Atomic claim: the daily-cap count check and the claiming UPDATE run inside
  // one DB function that locks the member row first (migrations/2026_07_13_
  // job_claim_atomic.sql), so a concurrent claim can no longer read a stale
  // count and slip past the cap. The booking UPDATE itself still filters on
  // `team_member_id IS NULL`, so claiming one booking stays first-writer-wins.
  const { data, error } = await supabaseAdmin.rpc('claim_job_atomic', {
    p_tenant_id: auth.tid,
    p_member_id: auth.id,
    p_booking_id: booking_id,
    p_day_start: dayStart.toISOString(),
    p_day_end: dayEnd.toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.claimed) {
    if (data?.reason === 'cap_reached') {
      return NextResponse.json({ error: `Daily job limit reached (${data.cap})` }, { status: 409 })
    }
    return NextResponse.json({ error: 'Job already taken' }, { status: 409 })
  }

  await audit({
    tenantId: auth.tid,
    action: 'booking.updated',
    entityType: 'booking',
    entityId: booking_id,
    details: { event: 'claimed', by: auth.id },
  })

  return NextResponse.json({ booking: data.booking })
}
