import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/quotes/[id]/send — permission gate.
 *
 * BUG (fixed here): sending a quote (draft → sent, notifies the recipient by
 * email/SMS) only called getTenantForRequest() with zero permission check.
 * rbac.ts grants 'sales.edit' to owner/admin/manager only — before this fix
 * a 'staff' session could send any quote directly via the API.
 *
 * FIX: requirePermission('sales.edit'), matching quotes/route.ts + quotes/[id].
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ ok: true })), tenantSender: vi.fn() }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: vi.fn(() => 'decrypted-key') }))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    quotes: [
      {
        id: 'quote-1', tenant_id: A, status: 'draft', deal_id: null,
        contact_email: 'client@example.com', contact_phone: '+15551234567',
        contact_name: 'Jane Client', quote_number: 'Q-202607-0001',
        total_cents: 10000, deposit_cents: 0, public_token: 'tok123',
      },
    ],
    tenants: [
      {
        id: A, name: 'Test Co', slug: 'test-co', domain: 'test.example.com',
        phone: '+15550000000', email: 'owner@test.example.com', address: null,
        logo_url: null, primary_color: null,
        telnyx_api_key: 'enc:telnyx', telnyx_phone: '+15559999999',
        resend_api_key: 'enc:resend', email_from: null, selena_config: null,
      },
    ],
    quote_activity: [],
    deal_activities: [],
    deals: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

const params = () => ({ params: Promise.resolve({ id: 'quote-1' }) })
function req() {
  return new Request('http://t', { method: 'POST', body: JSON.stringify({ via: 'both' }) })
}

describe('POST /api/quotes/[id]/send — permission probe', () => {
  it('owner (has sales.edit) can send a quote', async () => {
    const res = await POST(req(), params())
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'quotes')).toBe(true)
  })

  it("PERMISSION PROBE: 'staff' (no sales.edit) is forbidden and the quote is not sent", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req(), params())
    expect(res.status).toBe(403)
    expect(h.capture.updates.some((u) => u.table === 'quotes')).toBe(false)
  })
})
