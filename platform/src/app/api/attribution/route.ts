/**
 * Attribution — match unattributed bookings to the domain that sourced them
 * via CTA clicks / landing pages. Tenant-scoped.
 *
 * POST: run attribution (optional ?reset=true clears + re-runs).
 * GET: stats per domain, or debug info for a single booking (?booking_id=...).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { attributeByAddress } from '@/lib/attribution'
import { extractZip, getNeighborhoodFromZip, getDomainsForNeighborhood } from '@/lib/domains'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface AttributedBooking {
  attributed_domain: string | null
  attribution_confidence: number | null
  price: number | null
  status: string
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const reset = new URL(request.url).searchParams.get('reset') === 'true'

    if (reset) {
      await supabaseAdmin
        .from('bookings')
        .update({ attributed_domain: null, attribution_confidence: null, attributed_at: null })
        .eq('tenant_id', tenantId)
        .not('attributed_domain', 'is', null)
    }

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, client_id, start_time, created_at, clients(address, name)')
      .eq('tenant_id', tenantId)
      .is('attributed_domain', null)
      .order('created_at', { ascending: false })
      .limit(10000)

    if (bookingsError) throw bookingsError
    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'No unattributed bookings', attributed: 0, total: 0 })
    }

    let attributedCount = 0
    const usedClickIds: string[] = []
    const results: Array<{ booking_id: string; domain: string | null; confidence: number; neighborhood?: string }> = []

    for (const booking of bookings) {
      const client = booking.clients as unknown as { address?: string; name?: string } | null
      if (!client?.address) {
        results.push({ booking_id: booking.id as string, domain: null, confidence: 0 })
        continue
      }

      const referenceTime = (booking.created_at as string) || (booking.start_time as string)
      const result = await attributeByAddress(tenantId, client.address, referenceTime, usedClickIds)

      if (result) {
        usedClickIds.push(result.clickId)
        await supabaseAdmin
          .from('bookings')
          .update({
            attributed_domain: result.domain,
            attribution_confidence: result.confidence,
            attributed_at: new Date().toISOString(),
          })
          .eq('id', booking.id as string)
          .eq('tenant_id', tenantId)

        attributedCount++
        results.push({
          booking_id: booking.id as string,
          domain: result.domain,
          confidence: result.confidence,
          neighborhood: result.neighborhood,
        })
      } else {
        results.push({ booking_id: booking.id as string, domain: null, confidence: 0 })
      }
    }

    return NextResponse.json({
      message: `Attributed ${attributedCount} of ${bookings.length} bookings`,
      attributed: attributedCount,
      total: bookings.length,
      results: results.filter(r => r.domain),
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Attribution error:', err)
    return NextResponse.json({ error: 'Attribution failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const bookingId = new URL(request.url).searchParams.get('booking_id')

    if (bookingId) {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, client_id, start_time, created_at, price, clients(address, name)')
        .eq('id', bookingId)
        .eq('tenant_id', tenantId)
        .single()

      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const client = booking.clients as unknown as { address?: string; name?: string } | null
      if (!client?.address) return NextResponse.json({ error: 'No address for client' }, { status: 400 })

      const zip = extractZip(client.address)
      const neighborhood = zip ? await getNeighborhoodFromZip(tenantId, zip) : null
      const possibleDomains = neighborhood ? await getDomainsForNeighborhood(tenantId, neighborhood) : []
      const result = await attributeByAddress(
        tenantId,
        client.address,
        (booking.created_at as string) || (booking.start_time as string)
      )

      return NextResponse.json({
        booking_id: bookingId,
        client_name: client.name,
        address: client.address,
        zip,
        neighborhood,
        possible_domains: possibleDomains,
        match: result,
      })
    }

    // Stats per domain.
    const { data: attributedBookings } = await supabaseAdmin
      .from('bookings')
      .select('attributed_domain, attribution_confidence, price, status')
      .eq('tenant_id', tenantId)
      .not('attributed_domain', 'is', null)
      .limit(10000)

    const stats: Record<string, { bookings: number; revenue: number; avgConfidence: number; completedBookings: number; completedRevenue: number }> = {}

    for (const b of (attributedBookings as AttributedBooking[] | null) || []) {
      const domain = b.attributed_domain as string
      if (!stats[domain]) {
        stats[domain] = { bookings: 0, revenue: 0, avgConfidence: 0, completedBookings: 0, completedRevenue: 0 }
      }
      stats[domain].bookings++
      stats[domain].revenue += b.price || 0
      stats[domain].avgConfidence += b.attribution_confidence || 0
      if (b.status === 'completed') {
        stats[domain].completedBookings++
        stats[domain].completedRevenue += b.price || 0
      }
    }

    for (const domain of Object.keys(stats)) {
      if (stats[domain].bookings > 0) {
        stats[domain].avgConfidence = Math.round(stats[domain].avgConfidence / stats[domain].bookings)
      }
    }

    return NextResponse.json({ stats })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Attribution GET error:', err)
    return NextResponse.json({ error: 'Failed to get attribution stats' }, { status: 500 })
  }
}
