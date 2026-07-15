import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/campaigns/[id]/send (converted to tenantDb).
 *
 * The campaign is fetched through tenantDb (`.eq('tenant_id', ctx)`), so a
 * campaign owned by another tenant 404s before any recipient is contacted. The
 * audience read is likewise tenant-scoped: the caller's own active clients are
 * the only recipients. Probe: sending a foreign campaign 404s and dispatches
 * nothing; positive control sends the caller's own SMS campaign to its own client.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: {
      tenantId: A,
      tenant: { id: A, name: 'Biz A', telnyx_api_key: 'k', telnyx_phone: 'p', resend_api_key: 'r', email_from: 'a@x.com' },
      role: 'owner',
      userId: 'u1',
    },
    error: null,
  })),
}))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: false, campaign_sender_name: null, campaign_auto_unsubscribe: false })),
}))
const spies = vi.hoisted(() => ({ sendSMS: vi.fn(async () => {}), sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: spies.sendSMS }))
vi.mock('@/lib/email', () => ({ sendEmail: spies.sendEmail }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-a', tenant_id: A, status: 'draft', type: 'sms', name: 'A', subject: 's', body: 'Hi {name}' },
      { id: 'camp-b', tenant_id: B, status: 'draft', type: 'sms', name: 'B', subject: 's', body: 'Hi {name}' },
    ],
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A client', email: 'a@x.com', phone: '5551110000', status: 'active', sms_consent: true },
      { id: 'cli-b', tenant_id: B, name: 'B client', email: 'b@x.com', phone: '5559990000', status: 'active', sms_consent: true },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  spies.sendSMS.mockClear()
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const send = (id: string) => POST(new Request('http://t/x', { method: 'POST' }), params(id))

describe('campaigns/[id]/send POST — tenant isolation', () => {
  it("positive control: own campaign sends only to the caller's own active client", async () => {
    const res = await send('camp-a')
    expect(res.status).toBe(200)
    expect((await res.json()).sent).toBe(1)
    // Exactly one send — tenant B's active client is invisible to the scoped audience read.
    expect(spies.sendSMS).toHaveBeenCalledTimes(1)
  })

  it('wrong-tenant probe: a foreign campaign 404s and dispatches nothing', async () => {
    const res = await send('camp-b')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Not found')
    expect(spies.sendSMS).not.toHaveBeenCalled()
  })
})
