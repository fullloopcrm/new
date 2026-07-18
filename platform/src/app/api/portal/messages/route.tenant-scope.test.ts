import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/portal/messages — tenant-scoping regression lock.
 *
 * This route used to gate on `protectClientAPI()` (no args) imported from the
 * legacy `lib/nycmaid/auth`, which (a) checks a 3-part `clientId.timestamp.sig`
 * cookie signed with ADMIN_PASSWORD and has no tenant binding at all, and
 * (b) is never actually minted by any live login route — the real client
 * portal (`/api/client/login`, `/api/client/verify-code`) sets a 4-part
 * `clientId.tenantId.timestamp.sig` cookie signed with PORTAL_SECRET via
 * `lib/client-auth`. The format mismatch meant this route 401'd for every
 * real customer (dead feature), while still carrying the same non-tenant-
 * bound-auth shape as the client/properties IDOR fixed earlier this session.
 *
 * Fixed to resolve tenant from the request context (getTenantFromHeaders)
 * and gate on lib/client-auth's protectClientAPI(tenant.id), same pattern as
 * every other /api/client/* route. This suite runs protectClientAPI +
 * createClientSession for REAL (not mocked) against a minted cookie to prove:
 *   1. A cookie minted for TENANT_A is accepted when the request resolves to
 *      TENANT_A (the feature actually works now).
 *   2. The same cookie replayed against TENANT_B's request context is
 *      rejected with 401, not silently scoped to the wrong tenant's data.
 */

process.env.PORTAL_SECRET = 'unit-test-portal-secret'

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const CLIENT_A = '11111111-0000-0000-0000-000000000001'

const mockCookie = { value: undefined as string | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (_n: string) => (mockCookie.value ? { value: mockCookie.value } : undefined) }),
}))

const tenantCtx: { value: { id: string } | null } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => c,
      update: () => c,
      eq: () => c,
      order: () => c,
      limit: async () => ({ data: [], error: null }),
      single: async () => {
        if (table === 'clients') {
          return { data: { phone: '+15551234567', email: 'c@x.com', name: 'C', tenant_id: TENANT_A, do_not_service: false }, error: null }
        }
        if (table === 'comhub_messages') return { data: { id: 'msg-1', sent_at: 't' }, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return {
    supabaseAdmin: {
      from: (t: string) => chain(t),
      rpc: async (fn: string) => {
        if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
        if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
        return { data: null, error: null }
      },
    },
  }
})

import { createClientSession } from '@/lib/client-auth'
import { GET } from './route'

beforeEach(() => {
  mockCookie.value = undefined
  tenantCtx.value = { id: TENANT_A }
})

describe('GET /api/portal/messages — real tenant-scoped session', () => {
  it('accepts a cookie minted for this tenant', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('rejects the same cookie when the request resolves to a different tenant', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    tenantCtx.value = { id: TENANT_B }
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('rejects a request with no cookie at all', async () => {
    mockCookie.value = undefined
    const res = await GET()
    expect(res.status).toBe(401)
  })
})
