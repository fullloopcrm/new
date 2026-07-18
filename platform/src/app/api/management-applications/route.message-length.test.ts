import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/management-applications's rateLimitDb (3/10min per tenant+ip)
 * bounds request COUNT, not the SIZE of its free-text fields
 * (why_this_role/notes/references) -- a single call inside that cap could
 * still stuff an arbitrarily large string into management_applications and
 * the admin notify() message. Same class as the chat/yinez/feedback
 * message-length caps, ported here via the shared maxLengthError() helper.
 */

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme' })),
}))
vi.mock('@/lib/require-permission', () => ({ requirePermission: vi.fn() }))
const notify = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))
vi.mock('@/lib/apply-visitor-key', () => ({ resolveVisitorKey: vi.fn(() => null) }))
const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) } }))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/management-applications', { method: 'POST', body: JSON.stringify(body) })
}

const BASE = {
  name: 'Jane', email: 'jane@example.com', phone: '5551234567', location: 'NYC',
  resume_url: 'https://example.com/r.pdf', photo_url: 'https://example.com/p.jpg', video_url: 'https://example.com/v.mp4',
}

beforeEach(() => {
  notify.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockImplementation((table: string) => {
    if (table === 'management_applications') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }) }) }),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }) }),
      }
    }
    return { delete: () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }) }) }
  })
})

describe('POST /api/management-applications — free-text field length cap', () => {
  it('rejects when why_this_role/notes/references exceed 5000 characters', async () => {
    const res = await POST(req({ ...BASE, notes: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts fields exactly at the 5000 character boundary', async () => {
    const res = await POST(req({ ...BASE, why_this_role: 'a'.repeat(5000), notes: 'b'.repeat(5000), references: 'c'.repeat(5000) }))
    expect(res.status).toBe(200)
  })

  it('accepts normal-length text', async () => {
    const res = await POST(req({ ...BASE, why_this_role: 'I love this brand.' }))
    expect(res.status).toBe(200)
  })
})
