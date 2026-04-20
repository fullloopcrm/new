/**
 * Campaign preview — returns the audience count (filtered by contact segment)
 * and a rendered HTML preview. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface BookingRow {
  client_id: string
  status: string
  start_time: string
  recurring_type: string | null
  price: number | null
}

function wrapEmail(bodyHtml: string, tenantName: string, brandColor: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${tenantName}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 40px 16px 40px;border-bottom:1px solid #e5e7eb;">
          <h2 style="margin:0;font-size:18px;color:${brandColor};">${tenantName}</h2>
        </td></tr>
        <tr><td style="padding:32px 40px;">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function POST(request: Request) {
  try {
    const { tenantId, tenant } = await getTenantForRequest()
    const { audience_filter, email_body, channel, contact_filter } = await request.json()

    let clientsQuery = supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, email_marketing_opt_out, sms_marketing_opt_out, status, created_at', { count: 'exact', head: false })
      .eq('tenant_id', tenantId)
      .eq('do_not_service', false)
      .limit(10000)

    if (audience_filter === 'active') {
      clientsQuery = clientsQuery.eq('status', 'active')
    }

    const { data: allClients, count, error: clientsError } = await clientsQuery

    if (clientsError || !allClients) {
      console.error('[campaign preview] clients error:', clientsError)
      return NextResponse.json({ totalClients: 0, emailCount: 0, smsCount: 0, previewHtml: null, clients: [], error: 'Failed to fetch clients' })
    }

    let filtered = allClients

    if (contact_filter && contact_filter !== 'all') {
      const { data: bookings, error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .select('client_id, status, start_time, recurring_type, price')
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'scheduled', 'in_progress'])
        .limit(10000)

      if (bookingsError) {
        console.error('[campaign preview] bookings error:', bookingsError)
        return NextResponse.json({ error: `Bookings query failed: ${bookingsError.message}` }, { status: 500 })
      }

      const byClient = new Map<string, BookingRow[]>()
      for (const b of (bookings as BookingRow[] | null) || []) {
        const arr = byClient.get(b.client_id) || []
        arr.push(b)
        byClient.set(b.client_id, arr)
      }

      const now = Date.now()
      const DAY = 86_400_000

      filtered = allClients.filter(c => {
        const cb = byClient.get(c.id) || []
        switch (contact_filter) {
          case 'on_schedule':
            return cb.some(b => b.recurring_type && ['scheduled', 'in_progress'].includes(b.status))
          case 'not_scheduled':
            return !cb.some(b => b.recurring_type && ['scheduled', 'in_progress'].includes(b.status))
          case 'never_booked':
            return cb.length === 0
          case 'inactive_30d':
          case 'inactive_60d':
          case 'inactive_90d': {
            const days = contact_filter === 'inactive_30d' ? 30 : contact_filter === 'inactive_60d' ? 60 : 90
            if (cb.length === 0) return true
            const completed = cb.filter(b => b.status === 'completed')
            if (completed.length === 0) return false
            const last = Math.max(...completed.map(b => new Date(b.start_time).getTime()))
            return (now - last) > days * DAY
          }
          case 'has_upcoming':
            return cb.some(b => b.status === 'scheduled' && new Date(b.start_time).getTime() > now)
          case 'no_upcoming':
            return !cb.some(b => b.status === 'scheduled' && new Date(b.start_time).getTime() > now)
          case 'vip': {
            const total = cb.filter(b => b.status === 'completed').reduce((s, b) => s + (b.price || 0), 0)
            return total > 100_000
          }
          default:
            return true
        }
      })
    }

    let emailCount = 0
    let smsCount = 0
    for (const c of filtered) {
      if ((channel === 'email' || channel === 'both') && c.email && !c.email_marketing_opt_out) emailCount++
      if ((channel === 'sms' || channel === 'both') && c.phone && !c.sms_marketing_opt_out) smsCount++
    }

    const previewHtml = email_body
      ? wrapEmail(email_body, tenant.name || 'Your Business', tenant.primary_color || '#2563eb')
      : null

    return NextResponse.json({
      totalClients: count || 0,
      emailCount,
      smsCount,
      previewHtml,
      clients: filtered,
      filter: contact_filter || 'all',
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[campaign preview] error:', err)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
