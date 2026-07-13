import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/bookings/batch (converted to tenantDb).
 *
 * Bulk-create path. The isolation guarantee is the STAMP: every row is inserted
 * through tenantDb, which stamps tenant_id last — so a request body that forges a
 * foreign tenant_id on a booking row still lands under the ACTING tenant. The
 * probe forges tenant B on the payload and asserts the captured insert is tenant A.
 *
 * Rows are created with status 'pending' so the (first-row-only) SMS/email notify
 * branch is skipped — this test asserts tenant-safety of the write, not delivery.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

// Notify libs — no-op; the pending-status rows never reach them, mocked defensively.
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: vi.fn(() => 'msg') }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ bookingConfirmation: () => 'msg' })),
}))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [],
    clients: [
      { id: 'c1', tenant_id: A },
      { id: 'c2', tenant_id: A },
      { id: 'c-foreign', tenant_id: B },
    ],
    team_members: [
      { id: 'tm-a', tenant_id: A },
      { id: 'tm-foreign', tenant_id: B },
    ],
  })
  holder.from = h.from
})

function post(bookings: unknown[]) {
  return POST(new Request('http://t/api/bookings/batch', { method: 'POST', body: JSON.stringify({ bookings }) }))
}

describe('bookings/batch POST — tenant isolation', () => {
  it('positive control: bulk-creates rows for the acting tenant', async () => {
    const res = await post([
      { client_id: 'c1', start_time: '2020-01-01T10:00:00Z', end_time: '2020-01-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
      { client_id: 'c2', start_time: '2020-01-02T10:00:00Z', end_time: '2020-01-02T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    expect(res.status).toBe(200)
    expect((await res.json()).created).toBe(2)
  })

  it('stamp: a forged foreign tenant_id on a payload row is overridden to the acting tenant', async () => {
    await post([
      { tenant_id: B, client_id: 'c1', start_time: '2020-01-01T10:00:00Z', end_time: '2020-01-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins).toBeDefined()
    expect(ins!.rows.length).toBeGreaterThan(0)
    expect(ins!.rows.every((r) => r.tenant_id === A)).toBe(true)
  })

  it('cross-tenant client_id probe: rejects the whole batch when any row targets a foreign client', async () => {
    const res = await post([
      { client_id: 'c1', start_time: '2020-01-01T10:00:00Z', end_time: '2020-01-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
      { client_id: 'c-foreign', start_time: '2020-01-02T10:00:00Z', end_time: '2020-01-02T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('cross-tenant team_member_id probe: rejects the whole batch when any row targets a foreign team member', async () => {
    const res = await post([
      { client_id: 'c1', team_member_id: 'tm-foreign', start_time: '2020-01-01T10:00:00Z', end_time: '2020-01-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'bookings')).toBeUndefined()
  })

  it('same-tenant client_id + team_member_id succeed', async () => {
    const res = await post([
      { client_id: 'c1', team_member_id: 'tm-a', start_time: '2020-01-01T10:00:00Z', end_time: '2020-01-01T12:00:00Z', service_type: 'Clean', price: 100, status: 'pending' },
    ])
    expect(res.status).toBe(200)
    const ins = h.capture.inserts.find((i) => i.table === 'bookings')
    expect(ins!.rows[0].team_member_id).toBe('tm-a')
  })
})
