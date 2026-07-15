/**
 * Manual attribution — admin picks a domain for a booking that the automatic
 * attribution couldn't match. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const { data: bookings } = (await tenantDb(tenantId)
      .from('bookings')
      .select('id, start_time, created_at, price, status, attributed_domain, clients(name, address, phone)')
      .order('created_at', { ascending: false })
      .limit(20)) as {
      data: { id: string; start_time: string | null; created_at: string; price: number | null; status: string; attributed_domain: string | null; clients: { name?: string; address?: string; phone?: string } | null }[] | null
    }

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

    const db = tenantDb(tenantId)

    // booking_id is a caller-supplied FK. The update alone is tenant-scoped
    // but silently no-ops (no error) on a foreign id, and a previous separate
    // select — also scoped, but with its error ignored — meant a foreign
    // booking_id still fell through to a false `{success:true}` AND inserted
    // a notification row carrying that foreign booking_id (a cross-tenant FK
    // reference on the notifications table). Chaining .select().single() on
    // the update itself surfaces the "no match" case so a foreign booking_id
    // is rejected before anything is written.
    const { data: booking, error } = await db
      .from('bookings')
      .update({
        attributed_domain: String(domain).replace(/^www\./, ''),
        attribution_confidence: 100,
        attributed_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('id, clients(name)')
      .single()
    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const clientName = (booking.clients as unknown as { name?: string } | null)?.name || 'Unknown'

    await db.from('notifications').insert({
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
