import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST /api/test/email-selena/cleanup — same plain !== timing-side-channel
 * class as the sibling route.ts, fixed to the shared safeEqual() convention.
 */

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({}) }) }),
      delete: () => ({ in: () => ({ eq: () => ({}) }) }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/test/email-selena/cleanup', {
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

describe('test/email-selena/cleanup/route.ts — key auth gate', () => {
  it('rejects a wrong key', async () => {
    const res = await POST(req({ key: 'wrong', tenant_id: 't1' }))
    expect(res.status).toBe(401)
  })

  it('rejects when key is missing entirely', async () => {
    const res = await POST(req({ tenant_id: 't1' }))
    expect(res.status).toBe(401)
  })

  it('404s the whole harness when SELENA_TEST_TOKEN is unset', async () => {
    vi.unstubAllEnvs()
    const res = await POST(req({ key: 'the-real-token', tenant_id: 't1' }))
    expect(res.status).toBe(404)
  })
})
