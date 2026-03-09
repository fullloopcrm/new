import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const available = request.nextUrl.searchParams.get('available')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (available === 'true') {
    // Return unassigned jobs for this tenant
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(name, phone, address)')
      .eq('tenant_id', auth.tid)
      .is('team_member_id', null)
      .in('status', ['scheduled', 'confirmed'])
      .gte('start_time', today.toISOString())
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
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}
