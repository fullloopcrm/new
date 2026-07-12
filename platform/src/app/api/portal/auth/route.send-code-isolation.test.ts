import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Portal auth send_code — cross-tenant OTP cleanup regression test.
 *
 * BUG (fixed here): the `send_code` cleanup delete
 * (`portal_auth_codes.delete().eq('phone', phone).eq('used', false)`) had no
 * `tenant_id` filter. If the same phone belongs to clients of two different
 * tenants, requesting a code for tenant A deleted tenant B's still-valid
 * pending code — cross-tenant interference on their login flow.
 *
 * FIX: the delete now also filters `.eq('tenant_id', tenant.id)`.
 *
 * This uses the stateful tenant-isolation harness (real filtered delete
 * against seeded rows) so the test proves the OTHER tenant's row survives,
 * not just that a filter object was constructed.
 */

const A = 'tid-a'
const B = 'tid-b'
const PHONE = '+15551234567'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [
      { id: A, slug: 'tenant-a', status: 'active', name: 'Tenant A', telnyx_api_key: 'k', telnyx_phone: '+15550000000' },
      { id: B, slug: 'tenant-b', status: 'active', name: 'Tenant B', telnyx_api_key: 'k', telnyx_phone: '+15550000001' },
    ],
    clients: [
      { id: 'client-a', tenant_id: A, name: 'Alice', phone: PHONE, email: 'alice@example.com' },
      { id: 'client-b', tenant_id: B, name: 'Bob', phone: PHONE, email: 'bob@example.com' },
    ],
    portal_auth_codes: [
      { id: 'code-a', tenant_id: A, client_id: 'client-a', phone: PHONE, code: '111111', used: false },
      { id: 'code-b', tenant_id: B, client_id: 'client-b', phone: PHONE, code: '222222', used: false },
    ],
  })
  holder.from = h.from
})

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

describe('portal auth send_code — tenant-scoped OTP cleanup', () => {
  it('wrong-tenant probe: requesting a code for tenant A never deletes tenant B\'s pending code for the same phone', async () => {
    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-a' }))
    expect(res.status).toBe(200)

    const remaining = h.seed.portal_auth_codes
    // Tenant A's old pending code was cleaned up...
    expect(remaining.find((r) => r.id === 'code-a')).toBeUndefined()
    // ...but tenant B's still-valid pending code must survive untouched.
    const tenantBCode = remaining.find((r) => r.id === 'code-b')
    expect(tenantBCode).toBeDefined()
    expect(tenantBCode!.used).toBe(false)
  })

  it('positive control: sending a code for tenant B only cleans up tenant B\'s own pending code', async () => {
    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-b' }))
    expect(res.status).toBe(200)

    const remaining = h.seed.portal_auth_codes
    expect(remaining.find((r) => r.id === 'code-b')).toBeUndefined()
    const tenantACode = remaining.find((r) => r.id === 'code-a')
    expect(tenantACode).toBeDefined()
    expect(tenantACode!.used).toBe(false)
  })
})
