import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/contact's rateLimitDb (3/10min per tenant+ip) bounds request
 * COUNT, not the free-text `message` field's SIZE -- a single call inside
 * that cap could still stuff an arbitrarily large string into
 * team_applications/clients/portal_leads notes and the admin notify()
 * message. Same class as the chat/yinez/feedback message-length caps,
 * ported here via the shared maxLengthError() helper. Exercised via the
 * job-application branch (fewest downstream writes) to keep this test
 * focused on the length guard, not the full lead pipeline.
 */

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme', selena_config: {} })),
  tenantSiteUrl: vi.fn(async () => 'https://acme.example.com'),
}))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })), tenantSender: vi.fn(() => 'Acme <hi@acme.com>') }))
const notify = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))
const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) } }))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/contact', { method: 'POST', body: JSON.stringify(body) })
}

const BASE = { formType: 'job-application', name: 'Jane', phone: '5551234567' }

beforeEach(() => {
  notify.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }) }),
  })
})

describe('POST /api/contact — message length cap', () => {
  it('rejects a message over 5000 characters with 400, before any DB write or notify', async () => {
    const res = await POST(req({ ...BASE, message: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts a message exactly at the 5000 character boundary', async () => {
    const res = await POST(req({ ...BASE, message: 'a'.repeat(5000) }))
    expect(res.status).toBe(200)
  })

  it('accepts a normal short message', async () => {
    const res = await POST(req({ ...BASE, message: 'Excited to apply!' }))
    expect(res.status).toBe(200)
  })
})
