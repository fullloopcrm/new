import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { notify } from '@/lib/notify'
import { isCrossSiteRequest } from '@/lib/csrf-guard'

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const body = await request.json()
    const { type, booking_id, message } = body

    if (type === '15min_warning') {
      // Insert in-app notification for admin (tenant_id stamped by tenantDb)
      await db.from('notifications').insert({
        type: '15min_warning',
        title: '15-Min Heads Up',
        message: message || '15-minute warning sent',
        booking_id: booking_id || null,
        channel: 'in_app',
        recipient_type: 'admin',
        status: 'sent',
      })

      // Also send SMS to client if booking has a client with phone
      if (booking_id) {
        const { data: booking } = await db
          .from('bookings')
          .select('client_id, check_in_time, hourly_rate, clients(name, phone)')
          .eq('id', booking_id)
          .single()

        if (booking?.client_id) {
          const client = booking.clients as unknown as { name: string; phone: string | null } | null
          const clientName = client?.name?.split(' ')[0] || 'there'

          // Calculate estimated amount for the SMS
          let amountStr = ''
          if (booking.check_in_time && booking.hourly_rate) {
            const hours = (Date.now() - new Date(booking.check_in_time).getTime()) / 3600000
            amountStr = ` (~$${Math.round(hours * booking.hourly_rate)})`
          }

          await notify({
            tenantId,
            type: 'check_out' as const,
            title: '15-Min Heads Up',
            message: `Hi ${clientName}! Your team will be wrapping up in about 15 minutes${amountStr}. Thank you!`,
            channel: 'sms',
            recipientType: 'client',
            recipientId: booking.client_id,
            bookingId: booking_id,
          })
        }
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)
    const markRead = request.nextUrl.searchParams.get('mark_read')

    const { data, error } = await db
      .from('notifications')
      .select('*')
      .eq('recipient_type', 'admin')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count unread
    const { count: unread } = await db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_type', 'admin')
      .is('metadata->read', null)

    // A SameSite=Lax cookie is still attached on a cross-site top-level GET
    // navigation, so skip the mark-read WRITE (not the read) when Sec-Fetch-Site
    // says this GET was forged from another site — see csrf-guard.ts.
    if (markRead === 'true' && !isCrossSiteRequest(request.headers)) {
      // Mark all as read by updating metadata. tenantDb adds .eq(tenant_id) so a
      // stray id from another tenant can never be flipped here.
      const ids = (data || []).map((n) => n.id)
      if (ids.length > 0) {
        await db
          .from('notifications')
          .update({ metadata: { read: true } })
          .in('id', ids)
      }
    }

    return NextResponse.json({ notifications: data, unread: unread || 0 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
