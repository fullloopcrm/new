import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/apply's rateLimitDb (3/10min per tenant+ip) bounds request
 * COUNT, not the free-text `message` field's SIZE -- a single call inside
 * that cap could still stuff an arbitrarily large string into
 * cleaner_applications.notes and the admin notify() message built from it.
 * Same class as the chat/yinez/feedback message-length caps, ported here
 * via the shared maxLengthError() helper.
 */

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme' })),
}))
const notify = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))
const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) } }))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/apply', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  notify.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }) }),
  })
})

describe('POST /api/apply — message length cap', () => {
  it('rejects a message over 5000 characters with 400, before any DB write or notify', async () => {
    const res = await POST(req({ name: 'Jane', phone: '5551234567', message: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts a message exactly at the 5000 character boundary', async () => {
    const res = await POST(req({ name: 'Jane', phone: '5551234567', message: 'a'.repeat(5000) }))
    expect(res.status).toBe(200)
  })

  it('accepts a normal short message', async () => {
    const res = await POST(req({ name: 'Jane', phone: '5551234567', message: 'Looking forward to it!' }))
    expect(res.status).toBe(200)
  })
})
