import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/sales-applications's in-memory rate limiter (3/10min per IP)
 * bounds request COUNT, not the SIZE of its free-text fields
 * (sales_background/warm_intros/why/notes) -- a single call inside that cap
 * could still stuff an arbitrarily large string into sales_applications and
 * the admin notify() message. Same class as the chat/yinez/feedback
 * message-length caps, ported here via the shared maxLengthError() helper.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
const notify = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [{ id: A, slug: 'tenant-a', status: 'active', name: 'Tenant A' }],
    sales_applications: [],
  })
  holder.from = h.from
  notify.mockClear()
})

function req(body: Record<string, unknown>, ip: string): Request {
  return {
    headers: { get: (k: string) => (k === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

const BASE = {
  tenant_slug: 'tenant-a', name: 'Pat', email: 'pat@example.com', phone: '5551234567',
  location: 'NYC', video_url: 'https://example.com/v.mp4',
}

describe('POST /api/sales-applications — free-text field length cap', () => {
  it('rejects when sales_background/warm_intros/why/notes exceed 5000 characters', async () => {
    const res = await POST(req({ ...BASE, why: 'a'.repeat(5001) }, '203.0.113.1'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts fields exactly at the 5000 character boundary', async () => {
    const res = await POST(req({ ...BASE, sales_background: 'a'.repeat(5000), warm_intros: 'b'.repeat(5000), why: 'c'.repeat(5000), notes: 'd'.repeat(5000) }, '203.0.113.2'))
    expect(res.status).toBe(201)
  })

  it('accepts normal-length text', async () => {
    const res = await POST(req({ ...BASE, why: 'I know this market well.' }, '203.0.113.3'))
    expect(res.status).toBe(201)
  })

  // Prior round only capped sales_background/warm_intros/why/notes; `lane`
  // and the other identity/context fields were left unbounded.
  it('rejects when lane (a previously-uncapped field) exceeds 5000 characters', async () => {
    const res = await POST(req({ ...BASE, lane: 'a'.repeat(5001) }, '203.0.113.4'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(notify).not.toHaveBeenCalled()
  })
})

describe('POST /api/sales-applications — target_segments array cap', () => {
  // target_segments is a caller-supplied array with no prior cap on array
  // length or item shape -- same "unbounded array on a public write" class
  // as the documents/public/[token]/sign field_values fix.
  it('rejects target_segments with more than 50 entries', async () => {
    const res = await POST(req({ ...BASE, target_segments: Array.from({ length: 51 }, (_, i) => `seg-${i}`) }, '203.0.113.5'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too many/i)
    expect(notify).not.toHaveBeenCalled()
  })

  it('rejects a target_segments entry over 200 characters', async () => {
    const res = await POST(req({ ...BASE, target_segments: ['a'.repeat(201)] }, '203.0.113.6'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid target segment/i)
  })

  it('rejects a target_segments entry that is not a string', async () => {
    const res = await POST(req({ ...BASE, target_segments: [{ evil: 'object' }] }, '203.0.113.7'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid target segment/i)
  })

  it('rejects an oversized non-array target_segments value', async () => {
    const res = await POST(req({ ...BASE, target_segments: 'a'.repeat(201) }, '203.0.113.8'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/invalid target segment/i)
  })

  it('accepts a normal target_segments array', async () => {
    const res = await POST(req({ ...BASE, target_segments: ['residential', 'commercial'] }, '203.0.113.9'))
    expect(res.status).toBe(201)
  })
})
