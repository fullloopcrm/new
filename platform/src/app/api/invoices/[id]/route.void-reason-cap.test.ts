import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — DELETE /api/invoices/[id] (void) stored `?reason=` query-param
 * free text raw into `void_reason` with no type/length cap, same class as
 * accounting_periods.notes/reopened_reason (capString, src/lib/validate.ts).
 * Unlike its sibling documents/[id]/void (already capped at 500 chars), this
 * route had zero cap on the invoice's own void reason.
 *
 * FIXED: capString(url.searchParams.get('reason'), 2000) truncates rather
 * than rejects, matching the established reason-field convention.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { DELETE } from './route'

function seed() {
  return {
    invoices: [
      { id: 'inv-a', tenant_id: CTX_TENANT, status: 'draft', amount_paid_cents: 0 },
    ],
    invoice_activity: [],
  }
}

function delReq(reason: string): Request {
  return new Request(`http://t/api/invoices/inv-a?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' })
}
function ctx() {
  return { params: Promise.resolve({ id: 'inv-a' }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('invoices/[id] DELETE (void) — void_reason cap', () => {
  it('LOCK: an oversized reason is truncated to 2000 chars before the write', async () => {
    const oversized = 'x'.repeat(3000)
    const res = await DELETE(delReq(oversized), ctx())
    expect(res.status).toBe(200)

    const upd = h.capture.updates.find((u) => u.table === 'invoices')!
    expect(upd.matched[0].void_reason).toHaveLength(2000)
    expect(upd.matched[0].void_reason).toBe(oversized.slice(0, 2000))
  })

  it('CONTROL: a normal-length reason passes through untouched', async () => {
    const res = await DELETE(delReq('Customer requested cancellation'), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'invoices')!
    expect(upd.matched[0].void_reason).toBe('Customer requested cancellation')
  })

  it('CONTROL: no reason at all still voids cleanly with a null void_reason', async () => {
    const res = await DELETE(new Request('http://t/api/invoices/inv-a', { method: 'DELETE' }), ctx())
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'invoices')!
    expect(upd.matched[0].void_reason).toBeNull()
  })
})
