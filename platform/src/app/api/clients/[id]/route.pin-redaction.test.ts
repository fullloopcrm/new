import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET+PUT /api/clients/[id] — clients.pin redaction probe.
 *
 * BUG (fixed here): both handlers did `select('*')` / `.select().single()`
 * on `clients` and returned the row wholesale as `{ client: data }` —
 * including `pin`, the plaintext client-portal login PIN that POST
 * /api/client/login checks directly (`.eq('pin', pin)`). That sibling route
 * deliberately narrows its own SELECT to `id, do_not_service` to avoid ever
 * returning it; this admin-facing pair drifted from that invariant. Neither
 * dashboard/clients/[id]/page.tsx nor client-drawer.tsx reads `.pin` from
 * either response — pure drift, not a deliberate tradeoff (unlike
 * team_members.pin, which admin/broadcast-guidelines deliberately texts to
 * crew on request). Same shape as the tenant_members.pin_hash fix.
 *
 * The harness's select() does not implement column projection (it always
 * returns the full seeded row regardless of the select() argument), which is
 * exactly right here — this fix redacts in application code via omit()
 * *after* the fetch, not by narrowing the query, so the harness returning
 * the full row is what makes this a genuine probe: it goes RED pre-fix
 * (pin present in the response) and GREEN post-fix (pin stripped).
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { GET, PUT } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A Client', status: 'active', pin: '482913', email: 'a@x.com' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('clients/[id] — pin redaction probe', () => {
  it('GET never returns clients.pin', async () => {
    const res = await GET(new Request('http://t/api/clients/cli-a'), params('cli-a'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.client.pin).toBeUndefined()
    expect(JSON.stringify(body.client)).not.toContain('482913')
  })

  it('CONTROL: GET still returns fields the admin UI actually uses', async () => {
    const res = await GET(new Request('http://t/api/clients/cli-a'), params('cli-a'))
    const body = await res.json()
    expect(body.client).toMatchObject({ id: 'cli-a', name: 'A Client', email: 'a@x.com' })
  })

  it('PUT never returns clients.pin', async () => {
    const res = await PUT(
      new Request('http://t/api/clients/cli-a', { method: 'PUT', body: JSON.stringify({ notes: 'updated' }) }),
      params('cli-a'),
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.client.pin).toBeUndefined()
    expect(JSON.stringify(body.client)).not.toContain('482913')
  })
})
