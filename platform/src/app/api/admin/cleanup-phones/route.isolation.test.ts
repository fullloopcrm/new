import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/cleanup-phones — tenantDb() conversion wrong-tenant probe
 * (P1/W1 backlog batch). Three tables (clients, team_members,
 * sms_conversations) previously carried their own manual
 * `.eq('tenant_id', tenantId)` on every select/update; that filter now comes
 * solely from the wrapper — this proves a bidi-polluted phone number on
 * another tenant's row is never read or rewritten.
 */

const BIDI = '​'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { POST } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', phone: `555${BIDI}0001` },
      { id: 'client-B1', tenant_id: 'tenant-B', phone: `555${BIDI}0002` },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', phone: `555${BIDI}0003` },
      { id: 'tm-B1', tenant_id: 'tenant-B', phone: `555${BIDI}0004` },
    ],
    sms_conversations: [
      { id: 'convo-A1', tenant_id: 'tenant-A', phone: `555${BIDI}0005` },
      { id: 'convo-B1', tenant_id: 'tenant-B', phone: `555${BIDI}0006` },
    ],
  }
})

describe('POST /api/admin/cleanup-phones — tenant isolation', () => {
  it("tenant A's cleanup strips its own client phone, never tenant B's", async () => {
    const res = await POST(new NextRequest('http://x', { method: 'POST' }))
    expect(res.status).toBe(200)

    const clientA = h.store.clients.find((c) => c.id === 'client-A1')
    const clientB = h.store.clients.find((c) => c.id === 'client-B1')
    expect(clientA?.phone).toBe('5550001')
    expect(clientB?.phone).toBe(`555${BIDI}0002`)
  })

  it("tenant A's cleanup strips its own team member phone, never tenant B's", async () => {
    await POST(new NextRequest('http://x', { method: 'POST' }))

    const tmA = h.store.team_members.find((m) => m.id === 'tm-A1')
    const tmB = h.store.team_members.find((m) => m.id === 'tm-B1')
    expect(tmA?.phone).toBe('5550003')
    expect(tmB?.phone).toBe(`555${BIDI}0004`)
  })

  it("tenant A's cleanup strips its own sms_conversations phone, never tenant B's", async () => {
    const res = await POST(new NextRequest('http://x', { method: 'POST' }))
    const json = await res.json()

    const convoA = h.store.sms_conversations.find((c) => c.id === 'convo-A1')
    const convoB = h.store.sms_conversations.find((c) => c.id === 'convo-B1')
    expect(convoA?.phone).toBe('5550005')
    expect(convoB?.phone).toBe(`555${BIDI}0006`)
    expect(json.fixedCount).toBe(3)
  })
})
