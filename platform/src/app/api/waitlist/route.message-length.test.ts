import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/waitlist's in-memory rate limiter (5/10min per tenant+ip)
 * bounds request COUNT, not the free-text `notes` field's SIZE -- a single
 * call inside that cap could still stuff an arbitrarily large string into
 * the waitlist row and the admin notify()/SMS built from it. Same class as
 * the chat/yinez/feedback message-length caps, ported here via the shared
 * maxLengthError() helper.
 */

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', phone: '+15550001111' })),
}))
const notify = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))
const smsAdmins = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: (...args: unknown[]) => smsAdmins(...args) }))
const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) } }))
vi.mock('@/lib/tenant-query', () => ({ getTenantForRequest: vi.fn(), AuthError: class AuthError extends Error {} }))

import { POST } from './route'

function req(body: Record<string, unknown>, ip: string) {
  return {
    headers: { get: (k: string) => (k === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

const BASE = { name: 'Jane', phone: '5551234567' }

beforeEach(() => {
  notify.mockClear()
  smsAdmins.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({ insert: () => Promise.resolve({ error: null }) })
})

describe('POST /api/waitlist — notes field length cap', () => {
  it('rejects notes over 5000 characters with 400, before any DB write or notify', async () => {
    const res = await POST(req({ ...BASE, notes: 'a'.repeat(5001) }, '198.51.100.21'))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts notes exactly at the 5000 character boundary', async () => {
    const res = await POST(req({ ...BASE, notes: 'a'.repeat(5000) }, '198.51.100.22'))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('accepts normal-length notes', async () => {
    const res = await POST(req({ ...BASE, notes: 'Prefer weekday mornings.' }, '198.51.100.23'))
    expect(res.status).toBe(200)
  })
})
