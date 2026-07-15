/**
 * CLIENT VERIFY-CODE — phone-suffix account-confusion regression.
 *
 * BUG (fixed here, sibling-branch drift port of p1-w2 commit 8fc5f304):
 * client resolution matched on `cDigits.endsWith(phoneDigits) ||
 * phoneDigits.endsWith(cDigits)`, so a code verified for one phone could
 * resolve a DIFFERENT client whose stored number was a suffix/superset of
 * it -- e.g. a caller-verified "8005551234" matching a client whose phone
 * was stored truncated as "5551234" -- handing the caller that other
 * client's session and PII within the same tenant.
 *
 * FIX: compare the full national number exactly (last 10 digits, dropping
 * a leading US "1"), so 10- vs 11-digit stored formats still match but a
 * short/truncated stored number never matches a longer verified number.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const VERIFIED_PHONE = '8005551234'
const CODE = '123456'

function verifyRequest() {
  return new Request('http://x/api/client/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phone: VERIFIED_PHONE, code: CODE }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-secret'
  fake._store.clear()
  fake._seed('verification_codes', [
    {
      id: 'vc-1',
      tenant_id: TENANT_ID,
      identifier: `sms:${VERIFIED_PHONE}`,
      code: CODE,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    } as Row,
  ])
})

describe('POST /api/client/verify-code — phone-suffix confusion', () => {
  it('does NOT bind the session to a different client whose stored number is a truncated suffix', async () => {
    fake._seed('clients', [
      {
        id: 'wrong-client',
        tenant_id: TENANT_ID,
        // Truncated/malformed stored number that happens to be a suffix of
        // the caller's real, verified number.
        phone: '5551234',
        email: null,
      } as unknown as Row,
    ])

    const res = await POST(verifyRequest())
    const body = await res.json()

    expect(body.client?.id).not.toBe('wrong-client')
  })

  it('still matches the correct client on an exact national-number match (11-digit stored, leading 1 dropped)', async () => {
    fake._seed('clients', [
      {
        id: 'right-client',
        tenant_id: TENANT_ID,
        phone: `1${VERIFIED_PHONE}`,
        email: null,
      } as unknown as Row,
    ])

    const res = await POST(verifyRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.client?.id).toBe('right-client')
  })
})
