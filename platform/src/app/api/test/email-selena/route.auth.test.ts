import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/test/email-selena — the `key` compare was a plain `!==`, same
 * timing-side-channel class already fixed for CRON_SECRET/ADMIN_PIN across
 * cron/admin routes. This test harness is gated by SELENA_TEST_TOKEN alone,
 * so a leaked token grants access to create/mutate real client + conversation
 * rows for any tenant_id the caller supplies — worth the same constant-time
 * compare convention as every other secret-token gate in this codebase.
 */

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    }),
  },
}))
vi.mock('@/lib/selena-legacy', () => ({
  EMPTY_CHECKLIST: {},
  askSelena: vi.fn(async () => ({ text: 'reply' })),
}))
vi.mock('@/lib/sms-messages', () => ({
  insertConversationMessage: vi.fn(async () => ({})),
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/test/email-selena', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv('SELENA_TEST_TOKEN', 'the-real-token')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('test/email-selena/route.ts — key auth gate', () => {
  it('rejects a wrong key', async () => {
    const res = await POST(req({ key: 'wrong', tenant_id: 't1', email: 'a@b.com', message: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('rejects when key is missing entirely', async () => {
    const res = await POST(req({ tenant_id: 't1', email: 'a@b.com', message: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('404s the whole harness when SELENA_TEST_TOKEN is unset', async () => {
    vi.unstubAllEnvs()
    const res = await POST(req({ key: 'the-real-token', tenant_id: 't1', email: 'a@b.com', message: 'hi' }))
    expect(res.status).toBe(404)
  })
})
