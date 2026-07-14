import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST/DELETE /api/admin/comhub/messages/[id]/flag — first route-level
 * regression test (P1/W1 O13 sweep). `id` is a caller-supplied URL param —
 * the real risk is tenant A flagging/clearing a flag on tenant B's message
 * via a guessed/reused id.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))

import { POST, DELETE } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const postReq = (body?: unknown) =>
  new NextRequest('http://x', { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const deleteReq = () => new NextRequest('http://x', { method: 'DELETE' })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = {
    comhub_messages: [
      { id: 'msg-A1', tenant_id: 'tenant-A', flagged_for_review: false, flagged_reason: null, flagged_at: null, flagged_by: null },
      { id: 'msg-B1', tenant_id: 'tenant-B', flagged_for_review: false, flagged_reason: null, flagged_at: null, flagged_by: null },
    ],
  }
})

describe('POST /api/admin/comhub/messages/[id]/flag — permission gate', () => {
  it('returns the admin-gate error unchanged and never touches the DB', async () => {
    h.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const res = await POST(postReq({ reason: 'bad tone' }), params('msg-A1'))

    expect(res.status).toBe(403)
    expect(h.store.comhub_messages.find((m) => m.id === 'msg-A1')?.flagged_for_review).toBe(false)
  })
})

describe('POST /api/admin/comhub/messages/[id]/flag — flagging', () => {
  it('flags the message with the given reason and a timestamp', async () => {
    const res = await POST(postReq({ reason: 'hallucinated price' }), params('msg-A1'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    const row = h.store.comhub_messages.find((m) => m.id === 'msg-A1')
    expect(row?.flagged_for_review).toBe(true)
    expect(row?.flagged_reason).toBe('hallucinated price')
    expect(row?.flagged_at).toBeTruthy()
  })

  it('defaults flagged_reason to null when no body/reason is sent', async () => {
    const res = await POST(postReq(undefined), params('msg-A1'))

    expect(res.status).toBe(200)
    const row = h.store.comhub_messages.find((m) => m.id === 'msg-A1')
    expect(row?.flagged_for_review).toBe(true)
    expect(row?.flagged_reason).toBeNull()
  })

  it("tenant A flagging msg-B1 never touches tenant B's message", async () => {
    const res = await POST(postReq({ reason: 'x' }), params('msg-B1'))

    expect(res.status).toBe(200)
    const row = h.store.comhub_messages.find((m) => m.id === 'msg-B1')
    expect(row?.flagged_for_review).toBe(false)
    expect(row?.flagged_reason).toBeNull()
  })
})

describe('DELETE /api/admin/comhub/messages/[id]/flag — clearing', () => {
  it('clears the flag fields on the caller tenant’s own message', async () => {
    const row = h.store.comhub_messages.find((m) => m.id === 'msg-A1')!
    row.flagged_for_review = true
    row.flagged_reason = 'stale'
    row.flagged_at = '2026-07-01T00:00:00.000Z'
    row.flagged_by = 'admin-1'

    const res = await DELETE(deleteReq(), params('msg-A1'))

    expect(res.status).toBe(200)
    expect(row.flagged_for_review).toBe(false)
    expect(row.flagged_reason).toBeNull()
    expect(row.flagged_at).toBeNull()
    expect(row.flagged_by).toBeNull()
  })

  it("tenant A clearing msg-B1's flag never touches tenant B's message", async () => {
    const rowB = h.store.comhub_messages.find((m) => m.id === 'msg-B1')!
    rowB.flagged_for_review = true
    rowB.flagged_reason = 'stale'
    rowB.flagged_at = '2026-07-01T00:00:00.000Z'

    const res = await DELETE(deleteReq(), params('msg-B1'))

    expect(res.status).toBe(200)
    expect(rowB.flagged_for_review).toBe(true)
    expect(rowB.flagged_reason).toBe('stale')
  })

  it('returns the admin-gate error unchanged and never clears the flag', async () => {
    h.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    const row = h.store.comhub_messages.find((m) => m.id === 'msg-A1')!
    row.flagged_for_review = true

    const res = await DELETE(deleteReq(), params('msg-A1'))

    expect(res.status).toBe(403)
    expect(row.flagged_for_review).toBe(true)
  })
})
