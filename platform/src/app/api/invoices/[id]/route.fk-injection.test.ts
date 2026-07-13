/**
 * PATCH /api/invoices/[id] — cross-tenant FK injection on client_id (P9
 * register, same class W2 found on p1-w2/p1-w3). client_id passed through an
 * allowlist with only `.eq('tenant_id', tenantId)` on the WHERE clause --
 * nothing verified the FK VALUE itself belonged to the caller's tenant, so a
 * caller could reassign their own invoice to another tenant's client and
 * exfiltrate that client's name/email/phone/address via the clients() join
 * on this route's GET.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/invoice', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  logInvoiceEvent: vi.fn(async () => {}),
}))

import { PATCH } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    invoices: [{ id: 'inv-1', tenant_id: TENANT_A, status: 'sent', client_id: 'client-A1' }],
    clients: [{ id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' }, { id: 'client-B1', tenant_id: TENANT_B, name: 'Pat B (secret)' }],
  }
})

describe('PATCH /api/invoices/[id] — cross-tenant FK injection', () => {
  it("rejects a client_id belonging to another tenant instead of writing it", async () => {
    const res = await PATCH(patchReq({ client_id: 'client-B1' }), params('inv-1'))

    expect(res.status).toBe(400)
    expect(h.store.invoices[0].client_id).toBe('client-A1')
  })

  it('still updates the invoice when client_id genuinely belongs to the caller tenant', async () => {
    const res = await PATCH(patchReq({ client_id: 'client-A1', notes: 'updated' }), params('inv-1'))

    expect(res.status).toBe(200)
    expect(h.store.invoices[0].notes).toBe('updated')
  })
})
