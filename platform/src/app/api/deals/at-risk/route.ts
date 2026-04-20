/**
 * Workable client list for outreach — splits active clients into:
 *  - withUpcoming: has future scheduled bookings (excluded from outreach)
 *  - workable: no upcoming, not on sales board
 *  - onBoard: already on the sales pipeline
 * Tenant-scoped. Ported from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface ClientRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  status: string | null
  created_at: string
  do_not_service: boolean | null
  last_outreach_at: string | null
  outreach_count: number | null
  outreach_status: string | null
}

interface BookingRow {
  client_id: string
  start_time: string | null
  status: string
  price: number | null
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: allClients } = await supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, address, status, created_at, do_not_service, last_outreach_at, outreach_count, outreach_status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .neq('do_not_service', true)
      .order('created_at', { ascending: false })
      .limit(10000)

    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('client_id, start_time, status, price')
      .eq('tenant_id', tenantId)
      .in('status', ['completed', 'scheduled', 'in_progress'])
      .limit(10000)

    const { data: activeDeals } = await supabaseAdmin
      .from('deals')
      .select('client_id')
      .eq('tenant_id', tenantId)
      .eq('stage', 'active')

    const onSalesBoard = new Set(((activeDeals as Array<{ client_id: string }> | null) || []).map(d => d.client_id))
    const now = new Date()

    const clients = ((allClients as ClientRow[] | null) || []).map(client => {
      const cb = ((bookings as BookingRow[] | null) || []).filter(b => b.client_id === client.id)
      const completed = cb.filter(b => b.status === 'completed')
      const totalSpent = completed.reduce((sum, b) => sum + (b.price || 0), 0)
      const totalBookings = completed.length

      const futureBookings = cb.filter(b =>
        b.start_time && new Date(b.start_time).getTime() > now.getTime() && b.status !== 'completed'
      )
      const hasUpcoming = futureBookings.length > 0

      const lastCompleted = completed
        .filter(b => b.start_time)
        .map(b => new Date(b.start_time as string))
        .sort((a, b) => b.getTime() - a.getTime())[0]

      const daysSinceLastBooking = lastCompleted
        ? Math.floor((now.getTime() - lastCompleted.getTime()) / (24 * 60 * 60 * 1000))
        : null

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        status: client.status,
        created_at: client.created_at,
        totalBookings,
        totalSpent,
        daysSinceLastBooking,
        lastBookingDate: lastCompleted?.toISOString() || null,
        hasUpcoming,
        onSalesBoard: onSalesBoard.has(client.id),
        lastOutreachAt: client.last_outreach_at,
        outreachCount: client.outreach_count || 0,
        outreachStatus: client.outreach_status || 'none',
      }
    })

    return NextResponse.json({
      workable: clients.filter(c => !c.hasUpcoming && !c.onSalesBoard),
      withUpcoming: clients.filter(c => c.hasUpcoming),
      onBoard: clients.filter(c => c.onSalesBoard),
      totalClients: clients.length,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/deals/at-risk error:', err)
    return NextResponse.json({ error: 'Failed to fetch client list' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { client_id, action, current_count } = await request.json()
    if (!client_id) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })

    if (action === 'touch') {
      await supabaseAdmin
        .from('clients')
        .update({
          last_outreach_at: new Date().toISOString(),
          outreach_count: (current_count || 0) + 1,
          outreach_status: 'active',
        })
        .eq('id', client_id)
        .eq('tenant_id', tenantId)
    } else if (action === 'not_interested') {
      await supabaseAdmin
        .from('clients')
        .update({ outreach_status: 'not_interested' })
        .eq('id', client_id)
        .eq('tenant_id', tenantId)
    } else if (action === 'pause') {
      await supabaseAdmin
        .from('clients')
        .update({ outreach_status: 'paused' })
        .eq('id', client_id)
        .eq('tenant_id', tenantId)
    } else if (action === 'reset') {
      await supabaseAdmin
        .from('clients')
        .update({ outreach_status: 'none', outreach_count: 0, last_outreach_at: null })
        .eq('id', client_id)
        .eq('tenant_id', tenantId)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/at-risk error:', err)
    return NextResponse.json({ error: 'Failed to update outreach' }, { status: 500 })
  }
}
