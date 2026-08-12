import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * campaigns/send POST + PUT — permission gate.
 *
 * BUG (fixed here): both handlers checked requirePermission('campaigns.create')
 * instead of 'campaigns.send'. rbac.ts deliberately grants virtual_assistant
 * campaigns.create but NOT campaigns.send (front-office/VA role can draft a
 * campaign but should not be able to blast it live to every active client).
 * The wrong permission check let a virtual_assistant — or anyone else with
 * create-but-not-send — trigger a real email/SMS send. Proves a
 * virtual_assistant caller is now denied 403 on both POST and PUT, and that
 * denial happens before any DB write (no campaign status flip, no recipient
 * fan-out). Real requirePermission + rbac.ts run against the mocked
 * tenant-query below; only the role varies per test.
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

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
// Approval gate is a separate concern (see route.approval-gate.test.ts) —
// off here so these tests isolate the permission check.
vi.mock('@/lib/settings', () => ({ getSettings: vi.fn(async () => ({ campaign_approval_required: false })) }))

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { POST, PUT } from './route'

function seed() {
  return {
    // No clients seeded for tenant A -> POST takes the "0 recipients" early
    // return path, so a positive control never needs to fake Resend/Telnyx
    // config on the 'tenants' table.
    campaigns: [
      { id: 'camp-a', tenant_id: A, status: 'draft', type: 'email', recipient_filter: 'all', name: 'A', subject: 's', body: 'b' },
    ],
    campaign_recipients: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function sendPost(campaign_id: string) {
  return POST(new Request('http://t/api/campaigns/send', { method: 'POST', body: JSON.stringify({ campaign_id }) }))
}

function sendPut(campaign_id: string) {
  return PUT(new Request('http://t/api/campaigns/send', { method: 'PUT', body: JSON.stringify({ campaign_id }) }))
}

describe('campaigns/send POST — permission gate', () => {
  it('positive control: owner (has campaigns.send) can send', async () => {
    const res = await sendPost('camp-a')
    expect(res.status).toBe(200)
    expect(h.seed.campaigns[0].status).toBe('sent')
  })

  it("permission probe: virtual_assistant (campaigns.create but NOT campaigns.send) is denied 403, campaign untouched", async () => {
    roleHolder.role = 'virtual_assistant'
    const res = await sendPost('camp-a')
    expect(res.status).toBe(403)
    // Never flipped to 'sending' or 'sent' — the permission gate ran before any DB write.
    expect(h.seed.campaigns[0].status).toBe('draft')
    expect(h.capture.updates.some((u) => u.table === 'campaigns')).toBe(false)
  })

  it('manager (has campaigns.view only, no campaigns.send) is denied 403', async () => {
    roleHolder.role = 'manager'
    const res = await sendPost('camp-a')
    expect(res.status).toBe(403)
    expect(h.seed.campaigns[0].status).toBe('draft')
  })
})

describe('campaigns/send PUT — permission gate', () => {
  it('positive control: owner (has campaigns.send) can retry', async () => {
    const res = await sendPut('camp-a')
    expect(res.status).toBe(200)
  })

  it('permission probe: virtual_assistant is denied 403 on retry, no recipient writes', async () => {
    roleHolder.role = 'virtual_assistant'
    const res = await sendPut('camp-a')
    expect(res.status).toBe(403)
    expect(h.capture.updates.some((u) => u.table === 'campaign_recipients')).toBe(false)
  })
})
