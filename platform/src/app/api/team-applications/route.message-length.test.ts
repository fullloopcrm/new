import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/team-applications's in-memory rate limiter (3/10min per IP)
 * bounds request COUNT, not the SIZE of its free-text fields
 * (experience/availability/notes/references) -- a single call inside that
 * cap could still stuff an arbitrarily large string into team_applications
 * and the admin notify() message. Same class as the chat/yinez/feedback
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
    team_applications: [],
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

const BASE = { tenant_slug: 'tenant-a', name: 'Pat', phone: '5551234567' }

describe('POST /api/team-applications — free-text field length cap', () => {
  it('rejects when experience/availability/notes/references exceed 5000 characters', async () => {
    const res = await POST(req({ ...BASE, experience: 'a'.repeat(5001) }, '203.0.113.11'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts fields exactly at the 5000 character boundary', async () => {
    const res = await POST(req({ ...BASE, experience: 'a'.repeat(5000), availability: 'b'.repeat(5000), notes: 'c'.repeat(5000), references: 'd'.repeat(5000) }, '203.0.113.12'))
    expect(res.status).toBe(201)
  })

  it('accepts normal-length text', async () => {
    const res = await POST(req({ ...BASE, experience: '3 years of cleaning experience.' }, '203.0.113.13'))
    expect(res.status).toBe(201)
  })
})
