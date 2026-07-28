import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * /api/clients/merge — reassigns every real client_id reference from the
 * merge-away client onto the surviving client, across the full live-schema
 * table list (confirmed via a read-only schema query against prod, not
 * guessed), then soft-deactivates the merged-away client. Never a hard
 * delete — same "no destructive action without a way back" pattern as
 * block_client's do_not_service flag.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

const auditMock = vi.fn(async (_args: unknown) => ({ success: true }))
vi.mock('@/lib/audit', () => ({ audit: (args: unknown) => auditMock(args) }))

import { POST } from './route'

function seed() {
  return {
    clients: [
      { id: 'keep-1', tenant_id: A, name: 'Keep Client', notes: null, active: true },
      { id: 'dupe-1', tenant_id: A, name: 'Dupe Client', notes: null, active: true },
      { id: 'other-tenant-client', tenant_id: B, name: 'Other Tenant', notes: null, active: true },
    ],
    bookings: [
      { id: 'bk-1', tenant_id: A, client_id: 'dupe-1', status: 'completed' },
      { id: 'bk-2', tenant_id: A, client_id: 'keep-1', status: 'scheduled' },
    ],
    deals: [
      { id: 'deal-1', tenant_id: A, client_id: 'dupe-1', stage: 'open' },
    ],
  }
}

function req(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

let h: Harness
beforeEach(() => {
  auditMock.mockClear()
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('POST /api/clients/merge', () => {
  it('reassigns bookings and deals from the merged-away client onto the surviving client', async () => {
    const res = await POST(req({ keep_id: 'keep-1', merge_id: 'dupe-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.reassigned.bookings).toBe(1)
    expect(json.reassigned.deals).toBe(1)

    const booking = h.seed.bookings.find((b) => b.id === 'bk-1')!
    expect(booking.client_id).toBe('keep-1')
    const deal = h.seed.deals.find((d) => d.id === 'deal-1')!
    expect(deal.client_id).toBe('keep-1')

    // The OTHER booking, already keep-1's own, is untouched (not double-counted).
    expect(h.seed.bookings.find((b) => b.id === 'bk-2')!.client_id).toBe('keep-1')
  })

  it('soft-deactivates the merged-away client — never a hard delete', async () => {
    await POST(req({ keep_id: 'keep-1', merge_id: 'dupe-1' }))
    const dupe = h.seed.clients.find((c) => c.id === 'dupe-1')!
    expect(dupe.active).toBe(false)
    expect(dupe.do_not_service).toBe(true)
    expect(String(dupe.notes)).toContain('MERGED into keep-1')
    // Row still exists — a hard delete would remove it from the seed array entirely.
    expect(dupe).toBeDefined()
  })

  it('logs a client.merged audit entry', async () => {
    await POST(req({ keep_id: 'keep-1', merge_id: 'dupe-1' }))
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: A, action: 'client.merged', entityId: 'keep-1' }),
    )
  })

  it("REJECTS a merge_id belonging to another tenant — no reassignment, no leak", async () => {
    const res = await POST(req({ keep_id: 'keep-1', merge_id: 'other-tenant-client' }))
    expect(res.status).toBe(404)
    expect(h.seed.bookings.find((b) => b.id === 'bk-1')!.client_id).toBe('dupe-1')
  })

  it('REJECTS keep_id === merge_id', async () => {
    const res = await POST(req({ keep_id: 'keep-1', merge_id: 'keep-1' }))
    expect(res.status).toBe(400)
  })

  it('REJECTS a missing merge_id', async () => {
    const res = await POST(req({ keep_id: 'keep-1' }))
    expect(res.status).toBe(400)
  })
})
