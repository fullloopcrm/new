/**
 * CLIENT VERIFY-CODE ROUTE RACE — duplicate-client-row gap.
 *
 * TOCTOU audit finding (2026-07-13, deploy-prep/toctou-audit-p1-w3.md):
 * the create-new-client block looks up an existing client by
 * (tenant_id, email) and only INSERTs when the lookup finds nothing — no
 * unique constraint backs that decision. A double-tap on "verify" (or any
 * concurrent retry) can race two requests past the lookup before either
 * INSERT lands, creating two client rows for one signup.
 *
 * Fix: idx_clients_tenant_email_unique
 * (2026_07_13_clients_tenant_email_unique.sql, file-only — not applied to
 * prod yet) plus a 23505 catch here that treats the loser's create attempt
 * as success and returns the winner's row instead of a raw 500 -- defense in
 * depth for any path that reaches the create-client block twice concurrently.
 *
 * NOTE (updated alongside the sibling code-reuse-race fix,
 * route.code-reuse-race.test.ts): the audit's OTHER flagged bug in this same
 * route -- the verification-code check-then-delete race -- is now closed via
 * an atomic DELETE...RETURNING claim. A literal double-tap resubmitting the
 * SAME code (what this test originally simulated) is rejected at that claim
 * step before either request reaches client creation at all, so only one of
 * the two concurrent requests below still gets a session; the other now
 * correctly gets 401 instead of also succeeding. The "exactly one client row"
 * invariant this test exists to prove still holds -- it's just enforced one
 * layer earlier. The 23505/unique-index guard stays in place regardless, as
 * a backstop for any other path that might reach the create block twice.
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

const EMAIL = 'racer@test.co'
const CODE = '123456'

function verifyRequest() {
  return new Request('http://x/api/client/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, code: CODE }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-secret'
  fake._store.clear()
  fake._addUniqueConstraint('clients', 'email')
  fake._seed('verification_codes', [
    {
      id: 'vc-1',
      tenant_id: TENANT_ID,
      identifier: EMAIL,
      code: CODE,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    } as Row,
  ])
})

describe('POST /api/client/verify-code — concurrent create-client race', () => {
  it('two concurrent verifies for the same new email produce exactly one client, not two', async () => {
    const results = await Promise.allSettled([POST(verifyRequest()), POST(verifyRequest())])

    const clients = fake._all('clients')
    expect(clients.length).toBe(1)

    const responses = results.filter((r) => r.status === 'fulfilled').map((r) => (r as PromiseFulfilledResult<Response>).value)
    expect(responses.length).toBe(2)

    // The code-reuse-race fix now rejects the loser at the atomic claim step
    // (before it ever reaches client creation) rather than letting both
    // through to race the insert — so exactly one request succeeds, not two.
    const statuses = responses.map((r) => r.status).sort()
    expect(statuses).toEqual([200, 401])

    const bodies = await Promise.all(responses.map((r) => r.json()))
    const winner = bodies.find((b, i) => responses[i].status === 200)
    expect(winner.client.id).toBe(clients[0].id)
  })

  it('a sequential retry after the winner lands reuses the existing client (no second row)', async () => {
    const first = await (await POST(verifyRequest())).json()
    expect(first.client).toBeTruthy()

    // Re-seed the code (the first request burned it) to drive a second,
    // sequential login for the same email.
    fake._seed('verification_codes', [
      {
        id: 'vc-2',
        tenant_id: TENANT_ID,
        identifier: EMAIL,
        code: CODE,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      } as Row,
    ])

    const second = await (await POST(verifyRequest())).json()
    expect(second.client.id).toBe(first.client.id)
    expect(fake._all('clients').length).toBe(1)
  })
})
