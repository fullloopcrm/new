/**
 * PROOF OF CONVERSION — deals/at-risk — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/deals/at-risk/route.ts  (GET: workable-client buckets for outreach)
 *
 * What this route adds over prior proofs: a THREE-TABLE FAN-OUT of INDEPENDENT reads that
 * are stitched together in JS — NOT a cross-table embed. Prior multi-table proofs were either
 * embed joins (bank-accounts / reviews / quotes, where a child table is read THROUGH the
 * parent's row and default-denies to null if its policy is missing) or parallel COUNTs
 * (sidebar-counts). This route reads `clients`, `bookings`, and `deals` as three separate
 * top-level `.select().eq('tenant_id', ...)` queries, then does pure set-math in JS
 * (onSalesBoard Set, per-client booking filter, upcoming/last-completed derivation) to bucket
 * clients into workable / withUpcoming / onBoard. The client swap converts identically: all
 * three reads go through the SAME `tenantClient(tenantId)` instance, and every explicit
 * `.eq('tenant_id', tenantId)` is KEPT verbatim.
 *
 * CROSS-TABLE RLS DEPENDENCY — MILDER than the embed hazard, but present. Because the three
 * reads are INDEPENDENT (no read passes through another's row), a missing policy does NOT null
 * a sub-object — it default-denies the WHOLE table to `[]`, which degrades the buckets
 * gracefully (e.g. no `deals` policy => onSalesBoard empty => everyone lands in `workable`).
 * So all three of `clients`, `bookings`, `deals` must have policies before cutover for the
 * buckets to be correct, but there is no tier-ordering INVERSION hazard (nothing is
 * load-bearing "through" another). This is the sidebar-counts class, not the bank-accounts
 * class. Flag for the cutover: hold until clients + bookings + deals are all load-bearing.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`. This
 * proof takes `tenantId` directly, plus an injectable `now` so the upcoming/last-completed
 * date math is deterministic in the isolation test. Auth + wall-clock are orthogonal to the swap.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

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

const DAY_MS = 24 * 60 * 60 * 1000

/** Converted read path of GET /api/deals/at-risk (three independent scoped reads + JS buckets). */
export async function listAtRiskConverted(tenantId: string, now: Date = new Date()) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — all three reads now scoped

  const { data: allClients } = await db
    .from('clients')
    .select(
      'id, name, email, phone, address, status, created_at, do_not_service, last_outreach_at, outreach_count, outreach_status'
    )
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .neq('do_not_service', true)
    .order('created_at', { ascending: false })
    .limit(10000)

  const { data: bookings } = await db
    .from('bookings')
    .select('client_id, start_time, status, price')
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'scheduled', 'in_progress'])
    .limit(10000)

  const { data: activeDeals } = await db
    .from('deals')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  const onSalesBoard = new Set(((activeDeals as Array<{ client_id: string }> | null) || []).map((d) => d.client_id))

  const clients = ((allClients as ClientRow[] | null) || []).map((client) => {
    const cb = ((bookings as BookingRow[] | null) || []).filter((b) => b.client_id === client.id)
    const completed = cb.filter((b) => b.status === 'completed')
    const totalSpent = completed.reduce((sum, b) => sum + (b.price || 0), 0)
    const totalBookings = completed.length

    const futureBookings = cb.filter(
      (b) => b.start_time && new Date(b.start_time).getTime() > now.getTime() && b.status !== 'completed'
    )
    const hasUpcoming = futureBookings.length > 0

    const lastCompleted = completed
      .filter((b) => b.start_time)
      .map((b) => new Date(b.start_time as string))
      .sort((a, b) => b.getTime() - a.getTime())[0]

    const daysSinceLastBooking = lastCompleted
      ? Math.floor((now.getTime() - lastCompleted.getTime()) / DAY_MS)
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

  return {
    workable: clients.filter((c) => !c.hasUpcoming && !c.onSalesBoard),
    withUpcoming: clients.filter((c) => c.hasUpcoming),
    onBoard: clients.filter((c) => c.onSalesBoard),
    totalClients: clients.length,
  }
}
