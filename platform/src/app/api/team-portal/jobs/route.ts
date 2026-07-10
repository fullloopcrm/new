import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/token'
import { requirePortalPermission } from '@/lib/team-portal-auth'

// Coarsen a free-text address to a rough area for the open pool — enough to
// decide if a job is worth claiming, not enough to identify/contact the client.
// Prefers a 5-digit ZIP, else the locality segment after the street line.
function maskArea(address: string | null | undefined): string {
  if (!address) return 'Area hidden'
  const zip = address.match(/\b\d{5}\b/)
  if (zip) return zip[0]
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts[1] : 'Area hidden'
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const available = request.nextUrl.searchParams.get('available')
  const upcoming = request.nextUrl.searchParams.get('upcoming')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (available === 'true') {
    // Seeing the open (unassigned) pool is a field-staff tier permission — a
    // tenant can restrict this to leads/managers via the portal permission matrix.
    const { error: permError } = await requirePortalPermission(request, 'jobs.view_unassigned')
    if (permError) return permError

    // Unassigned jobs — MASKED. Client name/phone/full address are withheld until
    // a job is claimed (prevents the pool from leaking the whole client list to
    // every field worker). Only coarse area + service/time/pay is exposed.
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, service_type, price, status, clients(address)')
      .eq('tenant_id', auth.tid)
      .is('team_member_id', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', today.toISOString())
      .order('start_time')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const masked = (data || []).map((b) => {
      const client = Array.isArray(b.clients) ? b.clients[0] : b.clients
      return {
        id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        service_type: b.service_type,
        price: b.price,
        status: b.status,
        area: maskArea(client?.address),
      }
    })
    return NextResponse.json({ jobs: masked })
  }

  if (upcoming === 'true') {
    // Return next 14 days of jobs (excluding today)
    const futureEnd = new Date(today)
    futureEnd.setDate(futureEnd.getDate() + 14)

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address, special_instructions)')
      .eq('tenant_id', auth.tid)
      .eq('team_member_id', auth.id)
      .gte('start_time', tomorrow.toISOString())
      .lt('start_time', futureEnd.toISOString())
      .not('status', 'eq', 'cancelled')
      .order('start_time')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ jobs: data })
  }

  // Default: return today's jobs for the authenticated team member
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*, clients(name, phone, address, special_instructions)')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())
    .not('status', 'eq', 'cancelled')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
