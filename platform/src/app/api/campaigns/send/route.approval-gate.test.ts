import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * campaigns/send POST — campaign_approval_required gate.
 *
 * BUG (fixed here): this route sent live email/SMS to a tenant's audience
 * without ever consulting the tenant's campaign_approval_required setting,
 * unlike its correctly-built sibling /api/campaigns/[id]/send. Ported the
 * same gate: when the tenant requires approval, a campaign must be in
 * 'approved' status (set via PUT /api/campaigns/[id], itself gated on
 * campaigns.create) before this route will send it.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

const settingsHolder = vi.hoisted(() => ({ approvalRequired: false }))
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ campaign_approval_required: settingsHolder.approvalRequired })),
}))

import { POST } from './route'

function seed() {
  return {
    // No clients seeded -> once past the approval gate, POST takes the
    // "0 recipients" early-return path (isolates the gate from send mechanics).
    campaigns: [
      { id: 'camp-draft', tenant_id: A, status: 'draft', type: 'email', recipient_filter: 'all', name: 'Draft', subject: 's', body: 'b' },
      { id: 'camp-approved', tenant_id: A, status: 'approved', type: 'email', recipient_filter: 'all', name: 'Approved', subject: 's', body: 'b' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  settingsHolder.approvalRequired = false
})

function send(campaign_id: string) {
  return POST(new Request('http://t/api/campaigns/send', { method: 'POST', body: JSON.stringify({ campaign_id }) }))
}

describe('campaigns/send POST — campaign_approval_required gate', () => {
  it('approval OFF: a draft campaign sends normally (unchanged default behavior)', async () => {
    const res = await send('camp-draft')
    expect(res.status).toBe(200)
    expect(h.seed.campaigns.find((c) => c.id === 'camp-draft')?.status).toBe('sent')
  })

  it('approval ON: a draft (not-yet-approved) campaign is blocked 403, never marked sending/sent', async () => {
    settingsHolder.approvalRequired = true
    const res = await send('camp-draft')
    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/approval/i)
    expect(h.seed.campaigns.find((c) => c.id === 'camp-draft')?.status).toBe('draft')
    expect(h.capture.updates.some((u) => u.table === 'campaigns')).toBe(false)
  })

  it('approval ON: an already-approved campaign passes the gate and sends', async () => {
    settingsHolder.approvalRequired = true
    const res = await send('camp-approved')
    expect(res.status).toBe(200)
    expect(h.seed.campaigns.find((c) => c.id === 'camp-approved')?.status).toBe('sent')
  })
})
