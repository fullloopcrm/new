import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/campaigns/send (converted to tenantDb).
 *
 * The campaign is fetched through tenantDb (`.eq('tenant_id', ctx)`), so a
 * campaign owned by another tenant is invisible → 404 "Campaign not found"
 * BEFORE the route flips its status to 'sending' or fans out any recipient
 * message. Probe: sending a foreign campaign 404s AND leaves tenant B's campaign
 * untouched (no status write leaks across the boundary).
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-a', tenant_id: A, status: 'draft', type: 'email', recipient_filter: 'all', name: 'A', subject: 's', body: 'b' },
      { id: 'camp-b', tenant_id: B, status: 'draft', type: 'email', recipient_filter: 'all', name: 'B', subject: 's', body: 'b' },
    ],
    // Audience clients exist ONLY for tenant B — a tenant-scoped read must not see them.
    clients: [
      { id: 'cli-b', tenant_id: B, name: 'B client', email: 'b@x.com', phone: '5550000000', status: 'active' },
    ],
    campaign_recipients: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function send(campaign_id: string) {
  return POST(new Request('http://t/api/campaigns/send', { method: 'POST', body: JSON.stringify({ campaign_id }) }))
}

describe('campaigns/send POST — tenant isolation', () => {
  it("positive control: own campaign is found; a foreign tenant's clients are NOT its audience", async () => {
    const res = await send('camp-a')
    expect(res.status).toBe(200)
    const body = await res.json()
    // camp-a is found and sent, but tenant B's client is invisible → 0 recipients.
    expect(body.ok).toBe(true)
    expect(body.total).toBe(0)
  })

  it("wrong-tenant probe: a foreign campaign 404s and is never marked 'sending'", async () => {
    const res = await send('camp-b')
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Campaign not found')
    const campB = h.seed.campaigns.find((c) => c.id === 'camp-b')
    expect(campB!.status).toBe('draft')
    expect(h.capture.updates.some((u) => u.table === 'campaigns')).toBe(false)
  })
})
