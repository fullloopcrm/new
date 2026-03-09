import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Handle inbound SMS from Telnyx
export async function POST(request: Request) {
  const body = await request.json()
  const event = body?.data

  if (!event) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const eventType = event.event_type

  if (eventType === 'message.received') {
    const payload = event.payload
    const from = payload?.from?.phone_number
    const to = payload?.to?.[0]?.phone_number
    const text = payload?.text

    if (!from || !to || !text) {
      return NextResponse.json({ received: true })
    }

    // Find tenant by their Telnyx phone number
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('telnyx_phone', to)
      .single()

    if (!tenant) {
      // No tenant found for this number — skip processing
      return NextResponse.json({ received: true })
    }

    // Find client by phone
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('phone', from)
      .single()

    // Create notification for inbound SMS
    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenant.id,
      type: 'sms_received',
      title: `SMS from ${client?.name || from}`,
      message: text.slice(0, 500),
      channel: 'in_app',
      metadata: {
        from_phone: from,
        to_phone: to,
        client_id: client?.id || null,
        client_name: client?.name || null,
      },
    })

    return NextResponse.json({ received: true })
  }

  // Handle delivery status updates
  if (eventType === 'message.sent' || eventType === 'message.delivered' || eventType === 'message.failed') {
    // Delivery status update — no action needed
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
