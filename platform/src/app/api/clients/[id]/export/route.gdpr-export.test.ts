import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 — GDPR/CCPA data-subject export endpoint.
 *
 * Covers the two properties that matter for a per-tenant PII export:
 *  1. TENANT ISOLATION: a client belonging to another tenant 404s — no
 *     profile, bookings, invoices, or communications leak across tenants.
 *  2. COMPLETENESS + SCOPING: for the caller's own client, the export
 *     bundles profile/notes/bookings/invoices/communications for THAT
 *     client only — sibling clients' rows in the same tables never appear.
 */

type Row = Record<string, unknown>
const h = vi.hoisted(() => ({ tenantId: 'tenant-A', store: {} as Record<string, Row[]> }))

type State = { table: string; eqs: Row }

function run(state: State, terminal: 'single' | 'many') {
  const rows = h.store[state.table] || []
  const found = rows.filter(r => Object.entries(state.eqs).every(([k, v]) => r[k] === v))
  if (terminal === 'single') return { data: found[0] ?? null, error: found[0] ? null : { message: 'no rows' } }
  return { data: found, error: null }
}

function makeClient() {
  return {
    from(table: string) {
      const state: State = { table, eqs: {} }
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (c: string, v: unknown) => { state.eqs[c] = v; return chain },
        order: () => chain,
        single: () => Promise.resolve(run(state, 'single')),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(run(state, 'many')).then(res, rej),
      }
      return chain
    },
  }
}

const auditCalls: Row[] = []

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeClient() }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))
vi.mock('@/lib/audit', () => ({ audit: async (opts: Row) => { auditCalls.push(opts); return { success: true } } }))

import { GET } from './route'

function req(id: string, format?: string): { request: Request; params: Promise<{ id: string }> } {
  const url = format ? `http://x/api/clients/${id}/export?format=${format}` : `http://x/api/clients/${id}/export`
  return { request: new Request(url), params: Promise.resolve({ id }) }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  auditCalls.length = 0
  h.store = {
    clients: [
      { id: 'client-A', tenant_id: 'tenant-A', name: 'Alice A', email: 'a@x.com', phone: '+1', address: '1 St', unit: null, notes: 'secret note A', special_instructions: null, source: 'web', referral_code: null, email_opt_in: true, sms_opt_in: true, status: 'active', created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'client-B', tenant_id: 'tenant-B', name: 'Bob B', email: 'b@x.com', phone: '+2', address: '2 St', unit: null, notes: 'secret note B', special_instructions: null, source: 'web', referral_code: null, email_opt_in: true, sms_opt_in: true, status: 'active', created_at: '2026-01-01', updated_at: '2026-01-01' },
    ],
    bookings: [
      { id: 'bk-A1', tenant_id: 'tenant-A', client_id: 'client-A', start_time: '2026-02-01', end_time: '2026-02-01', service_type: 'clean', status: 'completed', price: 10000, payment_status: 'paid', payment_method: 'card', payment_date: null, notes: 'booking note A', special_instructions: null, created_at: '2026-02-01' },
      { id: 'bk-B1', tenant_id: 'tenant-B', client_id: 'client-B', start_time: '2026-02-01', end_time: '2026-02-01', service_type: 'clean', status: 'completed', price: 20000, payment_status: 'paid', payment_method: 'card', payment_date: null, notes: 'booking note B', special_instructions: null, created_at: '2026-02-01' },
    ],
    invoices: [
      { id: 'inv-A1', tenant_id: 'tenant-A', client_id: 'client-A', invoice_number: 'INV-A-1', status: 'paid', total_cents: 10000, amount_paid_cents: 10000, due_date: '2026-02-15', issued_at: '2026-02-01', paid_at: '2026-02-05', notes: 'invoice note A', created_at: '2026-02-01' },
      { id: 'inv-B1', tenant_id: 'tenant-B', client_id: 'client-B', invoice_number: 'INV-B-1', status: 'paid', total_cents: 20000, amount_paid_cents: 20000, due_date: '2026-02-15', issued_at: '2026-02-01', paid_at: '2026-02-05', notes: 'invoice note B', created_at: '2026-02-01' },
    ],
    client_sms_messages: [
      { id: 'sms-A1', tenant_id: 'tenant-A', client_id: 'client-A', direction: 'outbound', message: 'hi Alice', created_at: '2026-02-01' },
      { id: 'sms-B1', tenant_id: 'tenant-B', client_id: 'client-B', direction: 'outbound', message: 'hi Bob', created_at: '2026-02-01' },
    ],
  }
})

describe('GDPR export — tenant isolation', () => {
  it('404s when the client belongs to a DIFFERENT tenant than the caller', async () => {
    h.tenantId = 'tenant-A'
    const { request, params } = req('client-B')
    const res = await GET(request, { params })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
  })
})

describe('GDPR export — JSON bundle', () => {
  it('returns profile, notes, bookings, invoices, communications for the caller\'s OWN client only', async () => {
    h.tenantId = 'tenant-A'
    const { request, params } = req('client-A')
    const res = await GET(request, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    const body = await res.json()

    expect(body.profile.id).toBe('client-A')
    expect(body.profile.email).toBe('a@x.com')
    expect(body.notes).toBe('secret note A')

    expect(body.bookings).toHaveLength(1)
    expect(body.bookings[0].id).toBe('bk-A1')

    expect(body.invoices).toHaveLength(1)
    expect(body.invoices[0].id).toBe('inv-A1')

    expect(body.communications).toHaveLength(1)
    expect(body.communications[0].message).toBe('hi Alice')

    // Sibling tenant's data must never appear anywhere in the bundle.
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('client-B')
    expect(serialized).not.toContain('secret note B')
    expect(serialized).not.toContain('bk-B1')
    expect(serialized).not.toContain('inv-B1')
    expect(serialized).not.toContain('hi Bob')
  })

  it('logs an audit entry for the export', async () => {
    h.tenantId = 'tenant-A'
    const { request, params } = req('client-A')
    await GET(request, { params })
    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0]).toMatchObject({ tenantId: 'tenant-A', action: 'client.data_exported', entityType: 'client', entityId: 'client-A' })
  })
})

describe('GDPR export — CSV bundle', () => {
  it('returns a sectioned CSV with this client\'s data and none of the sibling tenant\'s', async () => {
    h.tenantId = 'tenant-A'
    const { request, params } = req('client-A', 'csv')
    const res = await GET(request, { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const csv = await res.text()

    expect(csv).toContain('# PROFILE')
    expect(csv).toContain('# NOTES')
    expect(csv).toContain('# BOOKINGS')
    expect(csv).toContain('# INVOICES')
    expect(csv).toContain('# COMMUNICATIONS')
    expect(csv).toContain('secret note A')
    expect(csv).toContain('hi Alice')

    expect(csv).not.toContain('client-B')
    expect(csv).not.toContain('secret note B')
    expect(csv).not.toContain('hi Bob')
  })
})
