/**
 * Manual attribution — admin picks a domain for a booking that the automatic
 * attribution couldn't match. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, created_at, price, status, attributed_domain, clients(name, address, phone)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      bookings: (bookings || []).map(b => {
        const client = b.clients as unknown as { name?: string; address?: string; phone?: string } | null
        return {
          id: b.id,
          clientName: client?.name || 'Unknown',
          address: client?.address || '',
          phone: client?.phone || '',
          date: b.start_time || b.created_at,
          price: b.price,
          status: b.status,
          attributed: b.attributed_domain || null,
        }
      }),
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Manual attribution GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { booking_id, domain } = await request.json()
    if (!booking_id || !domain) {
      return NextResponse.json({ error: 'Missing booking_id or domain' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('bookings')
      .update({
        attributed_domain: String(domain).replace(/^www\./, ''),
        attribution_confidence: 100,
        attributed_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
    if (error) throw error

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('clients(name)')
      .eq('id', booking_id)
      .eq('tenant_id', tenantId)
      .single()

    const clientName = (booking?.clients as unknown as { name?: string } | null)?.name || 'Unknown'

    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'new_lead',
      title: 'Manual Attribution',
      message: `${clientName} manually attributed to ${domain}`,
      booking_id,
      channel: 'in_app',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Manual attribution POST error:', err)
    return NextResponse.json({ error: 'Attribution failed' }, { status: 500 })
  }
}
