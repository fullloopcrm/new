import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../../auth/route'

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { booking_id } = await request.json()
  if (!booking_id) return NextResponse.json({ error: 'booking_id required' }, { status: 400 })

  // Verify booking exists, is in the same tenant, and is unassigned
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, team_member_id')
    .eq('id', booking_id)
    .eq('tenant_id', auth.tid)
    .is('team_member_id', null)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Job not available' }, { status: 404 })
  }

  // Get team member's pay rate
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('pay_rate')
    .eq('id', auth.id)
    .single()

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      team_member_id: auth.id,
      pay_rate: member?.pay_rate || null,
      status: 'confirmed',
    })
    .eq('id', booking_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: data })
}
