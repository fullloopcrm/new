import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 lead → CRM → attribution HAPPY-PATH lock (independent double-cover of #4).
 *
 * Independent second angle to the lead-capture route coverage: this exercises
 * the ATTRIBUTION engine — the step that ties a captured lead (a CRM client /
 * booking) back to the website touch that produced it. The arc under test:
 *
 *   lead → CRM:   a client row (captured lead) exists with an address, and a
 *                 booking is created for that client.
 *   → attribution: autoAttributeBooking() reads the client's address, matches
 *                 it to the tenant's OWN recent website CTA click (call/text)
 *                 via attributeByAddress(), stamps the booking with the winning
 *                 domain + confidence, and drops a tenant-scoped "Website → Sale"
 *                 notification.
 *
 * Two properties are locked:
 *   1. HAPPY PATH — a fresh CTA click on the tenant's neighborhood domain
 *      attributes at 100% confidence (real calculateConfidence math), writes
 *      attributed_domain / attribution_confidence / attributed_at onto the
 *      booking, and inserts a hot_lead notification carrying the booking id.
 *   2. TENANT ISOLATION (W4 lane) — when the ONLY matching click belongs to a
 *      DIFFERENT tenant, attribution returns null and writes NOTHING: the
 *      client's booking is never credited to another tenant's traffic. The only
 *      thing standing between the two is the `.eq('tenant_id', …)` filter on
 *      lead_clicks, and this proves it holds even when the domains are identical.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: attributeByAddress + autoAttributeBooking + calculateConfidence (the
 * whole @/lib/attribution engine and its confidence decay). MOCKED: the DB (a
 * stateful supabase store holding clients / lead_clicks / bookings /
 * notifications) and @/lib/domains (fixed neighborhood + domain resolution, kept
 * tenant-agnostic ON PURPOSE so the tenant_id filter is the sole isolation gate).
 */

const TENANT_A = 'aaaaaaaa-1111-2222-3333-444444444444'
const TENANT_B = 'bbbbbbbb-9999-8888-7777-666666666666'
const CLIENT_A = 'client-a'
const BOOKING_A = 'booking-a'
const DOMAIN = 'acme-cleaning.com'
// Canonical ISO instants so confidence math is deterministic (click == booking
// time ⇒ 0 minutes ago ⇒ 100% confidence). Round-trips through new Date() exactly.
const AT = '2026-07-01T12:00:00.000Z'

const h = vi.hoisted(() => {
  type Row = Record<string, any>
  const store: Record<string, Row[]> = { clients: [], lead_clicks: [], bookings: [], notifications: [] }
  let idSeq = 0
  const genId = (table: string) => `${table}-${++idSeq}`
  return {
    store,
    reset: () => {
      store.clients = []
      store.lead_clicks = []
      store.bookings = []
      store.notifications = []
      idSeq = 0
    },
    seed: (table: string, rows: Row[]) => { store[table] = [...(store[table] || []), ...rows] },
    chain: (table: string) => {
      const preds: Array<(r: Row) => boolean> = []
      let kind: 'read' | 'insert' | 'update' = 'read'
      let payload: Row | Row[] = {}
      let cap: number | null = null
      let sortCol: string | null = null
      let sortAsc = true
      const match = (r: Row) => preds.every((p) => p(r))
      function finalize(): Row[] {
        let rows = (store[table] || []).filter(match)
        if (sortCol) {
          const col = sortCol
          rows = [...rows].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (sortAsc ? 1 : -1))
        }
        if (cap != null) rows = rows.slice(0, cap)
        return rows
      }
      function doInsert(): Row[] {
        const rows = Array.isArray(payload) ? payload : [payload]
        const inserted = rows.map((r) => ({ id: r.id ?? genId(table), ...r }))
        store[table] = [...(store[table] || []), ...inserted]
        return inserted
      }
      function doUpdate() {
        store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...(payload as Row) } : r))
      }
      const c: Record<string, unknown> = {
        select: () => c,
        insert: (p: Row | Row[]) => { kind = 'insert'; payload = p; return c },
        update: (p: Row) => { kind = 'update'; payload = p; return c },
        eq: (col: string, val: unknown) => { preds.push((r) => r[col] === val); return c },
        in: (col: string, vals: unknown[]) => { preds.push((r) => vals.includes(r[col])); return c },
        gte: (col: string, val: unknown) => { preds.push((r) => r[col] >= (val as any)); return c },
        lte: (col: string, val: unknown) => { preds.push((r) => r[col] <= (val as any)); return c },
        not: () => c,
        order: (col: string, opts?: { ascending?: boolean }) => { sortCol = col; sortAsc = opts?.ascending !== false; return c },
        limit: (n: number) => { cap = n; return c },
        single: async () => {
          if (kind === 'insert') { const [row] = doInsert(); return { data: row, error: null } }
          const [row] = finalize()
          return { data: row ?? null, error: row ? null : { message: 'not found' } }
        },
        maybeSingle: async () => ({ data: finalize()[0] ?? null, error: null }),
        then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
          if (kind === 'insert') { doInsert(); return res({ data: null, error: null }) }
          if (kind === 'update') { doUpdate(); return res({ data: null, error: null }) }
          return res({ data: finalize(), error: null })
        },
      }
      return c
    },
  }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => h.chain(t) } }))

// Domain resolution stubbed tenant-agnostically ON PURPOSE: every tenant maps to
// the SAME neighborhood + domain, so the lead_clicks tenant_id filter is the only
// thing that can keep attribution from leaking across tenants.
vi.mock('@/lib/domains', () => ({
  extractZip: () => '10001',
  getNeighborhoodFromZip: async () => 'chelsea',
  getDomainsForNeighborhood: async () => [DOMAIN],
  getTenantDomains: async () => [{ domain: DOMAIN, type: 'neighborhood' }],
}))

import { attributeByAddress, autoAttributeBooking, calculateConfidence } from './attribution'

beforeEach(() => h.reset())

describe('calculateConfidence — time-decay math (real)', () => {
  it('is 100% same-day, decays 10%/day, and floors at 0 past day 10', () => {
    expect(calculateConfidence(0)).toBe(100)
    expect(calculateConfidence(1439)).toBe(100) // still day 0
    expect(calculateConfidence(1440)).toBe(90) // exactly 1 day
    expect(calculateConfidence(5 * 1440)).toBe(50)
    expect(calculateConfidence(11 * 1440)).toBe(0)
  })
})

describe('attributeByAddress — captured lead matches the tenant’s own website CTA', () => {
  it('returns the tenant’s domain at 100% for a same-instant call click', async () => {
    h.seed('lead_clicks', [
      { id: 'clk-A', tenant_id: TENANT_A, domain: DOMAIN, action: 'call', created_at: AT },
    ])

    const result = await attributeByAddress(TENANT_A, '123 W 20th St, New York, NY 10001', AT)

    expect(result).not.toBeNull()
    expect(result).toMatchObject({ domain: DOMAIN, action: 'call', confidence: 100, minutesAgo: 0, clickId: 'clk-A' })
  })

  it('does NOT match another tenant’s click — a click owned by tenant-B never attributes tenant-A', async () => {
    h.seed('lead_clicks', [
      { id: 'clk-B', tenant_id: TENANT_B, domain: DOMAIN, action: 'call', created_at: AT },
    ])

    const result = await attributeByAddress(TENANT_A, '123 W 20th St, New York, NY 10001', AT)
    expect(result).toBeNull()
  })
})

describe('autoAttributeBooking — lead → CRM booking → attribution write', () => {
  beforeEach(() => {
    h.seed('clients', [{ id: CLIENT_A, tenant_id: TENANT_A, name: 'Dana Rivera', address: '123 W 20th St, New York, NY 10001' }])
    h.seed('bookings', [{ id: BOOKING_A, tenant_id: TENANT_A, client_id: CLIENT_A }])
  })

  it('stamps the booking with domain + confidence and drops a tenant-scoped hot_lead notification', async () => {
    h.seed('lead_clicks', [{ id: 'clk-A', tenant_id: TENANT_A, domain: DOMAIN, action: 'call', created_at: AT }])

    const result = await autoAttributeBooking(TENANT_A, BOOKING_A, CLIENT_A, AT)

    expect(result).toEqual({ domain: DOMAIN, confidence: 100 })

    const booking = h.store.bookings.find((b) => b.id === BOOKING_A)!
    expect(booking).toMatchObject({ attributed_domain: DOMAIN, attribution_confidence: 100 })
    expect(booking.attributed_at).toBeTruthy()

    expect(h.store.notifications).toHaveLength(1)
    expect(h.store.notifications[0]).toMatchObject({
      tenant_id: TENANT_A,
      type: 'hot_lead',
      booking_id: BOOKING_A,
      recipient_type: 'admin',
    })
  })

  it('ISOLATION: a booking is never credited to another tenant’s click — writes nothing', async () => {
    // Identical domain, but the click belongs to tenant-B.
    h.seed('lead_clicks', [{ id: 'clk-B', tenant_id: TENANT_B, domain: DOMAIN, action: 'call', created_at: AT }])

    const result = await autoAttributeBooking(TENANT_A, BOOKING_A, CLIENT_A, AT)

    expect(result).toBeNull()
    const booking = h.store.bookings.find((b) => b.id === BOOKING_A)!
    expect(booking.attributed_domain).toBeUndefined()
    expect(booking.attribution_confidence).toBeUndefined()
    expect(h.store.notifications).toHaveLength(0)
  })
})
