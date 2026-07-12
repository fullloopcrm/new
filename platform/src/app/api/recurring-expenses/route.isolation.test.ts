import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/recurring-expenses (converted to tenantDb).
 *
 * GET lists `recurring_expenses` for the acting tenant only (active-only filter
 * preserved). POST stamps tenant_id from context — a forged body tenant_id
 * cannot land the row under another tenant.
 */

const A = 'tid-a'
const B = 'tid-b'

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
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { GET, POST } from './route'

function seed() {
  return {
    recurring_expenses: [
      { id: 'exp-a1', tenant_id: A, label: 'Rent', amount_cents: 250000, frequency: 'monthly', active: true, next_due_date: '2026-08-01' },
      { id: 'exp-b1', tenant_id: B, label: 'Foreign Insurance', amount_cents: 999999, frequency: 'monthly', active: true, next_due_date: '2026-07-15' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('recurring-expenses — tenant isolation', () => {
  it("GET excludes a foreign tenant's recurring expense (wrong-tenant probe)", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.recurring_expenses as Array<{ id: string }>).map((e) => e.id)
    expect(ids).toEqual(['exp-a1'])
    expect(ids).not.toContain('exp-b1')
  })

  it('POST stamps the acting tenant, ignoring a forged body tenant_id', async () => {
    const req = new Request('http://t/api/recurring-expenses', {
      method: 'POST',
      body: JSON.stringify({ label: 'New Sub', amount_cents: 5000, frequency: 'monthly', tenant_id: B }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const inserted = h.capture.inserts.find((i) => i.table === 'recurring_expenses')
    expect(inserted).toBeTruthy()
    expect(inserted!.rows[0].tenant_id).toBe(A)
  })
})
