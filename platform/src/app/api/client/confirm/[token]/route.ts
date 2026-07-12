import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/nycmaid/sms'
import { smsAdmins } from '@/lib/admin-contacts'
import { notify } from '@/lib/nycmaid/notify'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, status, client_terms_accepted_at, clients(name, phone)')
    .eq('client_confirm_token', token)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id: booking.id,
    start_time: booking.start_time,
    status: booking.status,
    accepted: !!booking.client_terms_accepted_at,
    client_name: (booking.clients as unknown as { name?: string })?.name || null,
  })
}

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, tenant_id, start_time, status, client_terms_accepted_at, client_id, clients(name, phone)')
    .eq('client_confirm_token', token)
    .maybeSingle()

  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (booking.status === 'cancelled') {
    return NextResponse.json({ error: 'This booking has been cancelled. Please book again.' }, { status: 410 })
  }
  if (booking.client_terms_accepted_at) {
    return NextResponse.json({ ok: true, alreadyAccepted: true, start_time: booking.start_time })
  }

  await supabaseAdmin
    .from('bookings')
    .update({ client_terms_accepted_at: new Date().toISOString() })
    .eq('id', booking.id)

  const { data: cur } = await supabaseAdmin.from('bookings').select('notes').eq('id', booking.id).single()
  const newNotes = (cur?.notes || '') + '\n[Client accepted terms ' + new Date().toISOString() + ']'
  await supabaseAdmin.from('bookings').update({ notes: newNotes }).eq('id', booking.id)

  const startTime = new Date(booking.start_time).toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  const client = booking.clients as unknown as { name?: string; phone?: string } | null

  if (client?.phone) {
    await sendSMS(client.phone, `Got it — terms accepted for ${startTime}. We're assigning your service pro now and will send your full booking confirmation with team details once locked in.`, {
      skipConsent: true, smsType: 'terms_accepted', bookingId: booking.id,
    }).catch(() => {})
  }
  await smsAdmins(booking.tenant_id, `✓ ${client?.name || 'Client'} accepted terms (one-tap link) — booking ${startTime} ready to assign a team member.`).catch(() => {})
  await notify({
    type: 'booking_confirmed_by_client',
    title: `${client?.name || 'Client'} accepted terms`,
    message: `${client?.name || 'Client'} tapped the confirm link — terms accepted, ready to assign a team member for ${startTime}.`,
    booking_id: booking.id,
    url: '/admin/bookings',
  }).catch(() => {})

  return NextResponse.json({ ok: true, start_time: booking.start_time })
}
