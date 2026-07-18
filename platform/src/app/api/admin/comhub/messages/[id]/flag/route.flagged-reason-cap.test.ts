import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/comhub/messages/[id]/flag stored `body.reason`
 * raw into `flagged_reason` with no type/length cap, same class as
 * accounting_periods.notes/reopened_reason (capString, src/lib/validate.ts).
 *
 * FIXED: capString(body.reason, 2000) truncates rather than rejects.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))

import { POST } from './route'

function seed() {
  return {
    comhub_messages: [
      { id: 'msg-a', tenant_id: TENANT_A, flagged_for_review: false, flagged_reason: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = { params: Promise.resolve({ id: 'msg-a' }) }

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/messages/msg-a/flag', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/messages/[id]/flag POST — flagged_reason cap', () => {
  it('LOCK: an oversized reason is truncated to 2000 chars before the write', async () => {
    const oversized = 'y'.repeat(2500)
    const res = await POST(req({ reason: oversized }), params)
    expect(res.status).toBe(200)
    const row = (h.seed.comhub_messages as Array<{ id: string; flagged_reason: string | null }>).find(m => m.id === 'msg-a')
    expect(row?.flagged_reason).toHaveLength(2000)
    expect(row?.flagged_reason).toBe(oversized.slice(0, 2000))
  })

  it('CONTROL: a normal-length reason passes through untouched', async () => {
    const res = await POST(req({ reason: 'needs prompt review' }), params)
    expect(res.status).toBe(200)
    const row = (h.seed.comhub_messages as Array<{ id: string; flagged_reason: string | null }>).find(m => m.id === 'msg-a')
    expect(row?.flagged_reason).toBe('needs prompt review')
  })

  it('CONTROL: a non-string reason coerces to null instead of crashing', async () => {
    const res = await POST(req({ reason: 12345 }), params)
    expect(res.status).toBe(200)
    const row = (h.seed.comhub_messages as Array<{ id: string; flagged_reason: string | null }>).find(m => m.id === 'msg-a')
    expect(row?.flagged_reason).toBeNull()
  })
})
