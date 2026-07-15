import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * CROSS-TENANT/IDENTITY HIJACK — POST /api/push/subscribe used to trust
 * caller-supplied team_member_id/client_id verbatim, with getCurrentTenant()
 * resolving via the public signed tenant-domain header (no real caller
 * identity required at all). Any caller — including an anonymous visitor on
 * a tenant's public site — could register their own browser as a push
 * subscriber for ANY team_member_id or client_id, including another
 * tenant's, and silently intercept that identity's real push notifications
 * (sendPushToTeamMember/sendPushToClient in lib/push.ts key off
 * team_member_id/client_id alone, no tenant_id filter). Fixed: team_member_id
 * and client_id are now derived ONLY from a server-verified portal/team-portal
 * Bearer token, never trusted from the request body.
 */

const rows: { id: string; endpoint: string; subscription: unknown; role: string; tenant_id: string; team_member_id: string | null; client_id: string | null }[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'push_subscriptions') throw new Error(`unexpected table ${table}`)
      return {
        select: () => ({
          eq: (_col: string, val: string) => ({
            limit: async () => ({ data: rows.filter((r) => r.endpoint === val).map((r) => ({ id: r.id })) }),
          }),
        }),
        insert: async (row: Omit<typeof rows[number], 'id'>) => {
          rows.push({ id: `row-${rows.length + 1}`, ...row })
          return { data: null, error: null }
        },
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, id: string) => {
            const r = rows.find((x) => x.id === id)
            if (r) Object.assign(r, patch)
            return { data: null, error: null }
          },
        }),
      }
    },
  },
}))

vi.mock('../../portal/auth/token', () => ({
  verifyPortalToken: (token: string) => (token === 'good-client' ? { id: 'client-real', tid: 'tid-a' } : null),
}))
vi.mock('../../team-portal/auth/token', () => ({
  verifyToken: (token: string) => (token === 'good-member' ? { id: 'member-real', tid: 'tid-a' } : null),
}))
// role='admin' resolves identity via getTenantForRequest() (an authenticated
// dashboard session), not the public host-resolved tenant.
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => { throw new Error('no session') }),
}))
// role='client' falls back to a cookie session when no bearer token is
// present — mock that path closed (no cookie store / no valid session) so
// the no-token case resolves to 401 instead of throwing through cookies().
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))
vi.mock('@/lib/client-auth', () => ({
  verifyClientSessionToken: vi.fn(() => null),
  clientSessionCookieOptions: () => ({ name: 'client_session' }),
}))

import { POST } from './route'
import { getTenantForRequest } from '@/lib/tenant-query'

function post(role: string, token: string | null, extra: Record<string, unknown> = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  return POST(new Request('http://t/api/push/subscribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({ subscription: { endpoint: `ep-${role}-${Math.random()}` }, role, ...extra }),
  }))
}

beforeEach(() => {
  rows.length = 0
  vi.mocked(getTenantForRequest).mockReset()
  // Default: a real authenticated dashboard session for tenant tid-a.
  // Individual tests override this where they need to exercise the "no
  // session at all" path.
  vi.mocked(getTenantForRequest).mockResolvedValue({ tenantId: 'tid-a' } as never)
})

describe('push/subscribe POST — identity is server-verified, never caller-supplied', () => {
  it('role=team_member with a forged team_member_id in the body is ignored — the token identity wins', async () => {
    const res = await post('team_member', 'good-member', { team_member_id: 'victim-tenant-b-member' })
    expect(res.status).toBe(200)
    expect(rows).toHaveLength(1)
    expect(rows[0].team_member_id).toBe('member-real')
    expect(rows[0].tenant_id).toBe('tid-a')
  })

  it('role=client with a forged client_id in the body is ignored — the token identity wins', async () => {
    const res = await post('client', 'good-client', { client_id: 'victim-tenant-b-client' })
    expect(res.status).toBe(200)
    expect(rows).toHaveLength(1)
    expect(rows[0].client_id).toBe('client-real')
    expect(rows[0].tenant_id).toBe('tid-a')
  })

  it('role=team_member with no token → 401, no row written', async () => {
    const res = await post('team_member', null, { team_member_id: 'anything' })
    expect(res.status).toBe(401)
    expect(rows).toHaveLength(0)
  })

  it('role=team_member with an invalid/forged token → 401, no row written', async () => {
    const res = await post('team_member', 'forged-token', { team_member_id: 'anything' })
    expect(res.status).toBe(401)
    expect(rows).toHaveLength(0)
  })

  it('role=client with no token → 401, no row written', async () => {
    const res = await post('client', null, { client_id: 'anything' })
    expect(res.status).toBe(401)
    expect(rows).toHaveLength(0)
  })

  it('positive control: role=admin still uses the existing operator-dashboard session', async () => {
    vi.mocked(getTenantForRequest).mockResolvedValueOnce({ tenantId: 'tid-a' } as never)
    const res = await post('admin', null)
    expect(res.status).toBe(200)
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe('tid-a')
    expect(rows[0].team_member_id).toBeNull()
    expect(rows[0].client_id).toBeNull()
  })

  it('role=admin with no operator session → 401, no row written', async () => {
    vi.mocked(getTenantForRequest).mockRejectedValueOnce(new Error('no session'))
    const res = await post('admin', null)
    expect(res.status).toBe(401)
    expect(rows).toHaveLength(0)
  })
})
