import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 independent isolation regression for the Resend inbound webhook (fix 42b5a39).
 *
 * The sibling unit test (src/lib/inbound-email-tenant.test.ts) proves the tenant
 * RESOLVER derives the right tenant from a recipient address. This file proves
 * the property the leader order names literally — "insert carries tenant_id,
 * cross-tenant not global" — at the WEBHOOK ROUTE boundary, which the resolver
 * unit test does not exercise:
 *
 *   - a resolvable inbound email is inserted into inbound_emails WITH the
 *     resolved tenant_id (scoped, never a global/unscoped row), and
 *   - an UNresolvable recipient causes NO insert at all (fail-closed drop),
 *     so no unscoped globally-visible row is ever written.
 */

// Capture inbound_emails inserts + resolver control, hoisted for vi.mock.
const h = vi.hoisted(() => {
  const captured = { inboundInsert: null as Record<string, unknown> | null, insertCount: 0 }
  let tenantResult: string | null = null

  const supabaseAdmin = {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        if (table === 'inbound_emails') {
          captured.inboundInsert = payload
          captured.insertCount += 1
        }
        return Promise.resolve({ data: null, error: null })
      },
    }),
  }

  return {
    captured,
    supabaseAdmin,
    setTenant: (v: string | null) => {
      tenantResult = v
    },
    resolveTenantIdForInboundEmail: vi.fn(async () => tenantResult),
  }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.supabaseAdmin }))
vi.mock('@/lib/webhook-verify', () => ({ verifySvix: () => ({ valid: true }) }))
vi.mock('@/lib/inbound-email-tenant', () => ({
  resolveTenantIdForInboundEmail: h.resolveTenantIdForInboundEmail,
}))

// Import the route AFTER the mocks are registered.
import { POST } from './route'

function inboundEvent(to: string) {
  return new Request('https://app.fullloop.example/api/webhooks/resend', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'email.received',
      data: {
        email_id: 'evt-123',
        from: 'customer@example.com',
        to,
        subject: 'Re: your booking',
        text: 'thanks!',
      },
    }),
  })
}

beforeEach(() => {
  h.captured.inboundInsert = null
  h.captured.insertCount = 0
  h.resolveTenantIdForInboundEmail.mockClear()
})

describe('POST /api/webhooks/resend — inbound email is scoped to a tenant, never global', () => {
  it('inserts the inbound row WITH the resolved tenant_id (tenant B, not global)', async () => {
    h.setTenant('tenant-B')

    const res = await POST(inboundEvent('inbox@tenant-b.com'))
    const json = await res.json()

    expect(json).toEqual({ ok: true })
    expect(h.captured.insertCount).toBe(1)
    // The row is scoped: tenant_id present and equal to the resolved tenant.
    expect(h.captured.inboundInsert?.tenant_id).toBe('tenant-B')
    // Recipient is preserved on the scoped row.
    expect(h.captured.inboundInsert?.to_address).toBe('inbox@tenant-b.com')
  })

  it('a DIFFERENT recipient resolves to a DIFFERENT tenant (A), proving no cross-tenant bleed', async () => {
    h.setTenant('tenant-A')

    await POST(inboundEvent('inbox@tenant-a.com'))

    expect(h.captured.insertCount).toBe(1)
    expect(h.captured.inboundInsert?.tenant_id).toBe('tenant-A')
  })

  it('fails closed: an unresolvable recipient writes NO row (no unscoped global insert)', async () => {
    h.setTenant(null)

    const res = await POST(inboundEvent('stranger@unknown-domain.com'))
    const json = await res.json()

    // Message is dropped, not written.
    expect(json).toEqual({ ok: true, dropped: 'no_tenant' })
    expect(h.captured.insertCount).toBe(0)
    expect(h.captured.inboundInsert).toBeNull()
  })
})
