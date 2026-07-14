import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/team-portal/messages — IDOR regression.
 *
 * The route took team_member_id from the query (GET) / body (POST) with NO
 * auth, so anyone could read or post another team member's — or another
 * tenant's — 1:1 office thread by guessing a UUID. Fixed to gate on the
 * portal bearer token (requirePortalPermission) and derive team_member_id
 * from the verified token, never from caller input.
 */

const h = vi.hoisted(() => ({
  members: [] as Array<Record<string, unknown>>,
  tenants: [] as Array<Record<string, unknown>>,
  contacts: [] as Array<Record<string, unknown>>,
  threads: [] as Array<Record<string, unknown>>,
  messages: [] as Array<Record<string, unknown>>,
  threadUpdates: [] as Array<Record<string, unknown>>,
}))

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: (col: string, val: unknown) => {
            (chain as { _filters: Record<string, unknown> })._filters = {
              ...((chain as { _filters?: Record<string, unknown> })._filters || {}),
              [col]: val,
            }
            return chain
          },
          single: async () => {
            const filters = (chain as { _filters?: Record<string, unknown> })._filters || {}
            const match = h.members.find((m) => Object.entries(filters).every(([k, v]) => m[k] === v))
            return { data: match ?? null, error: null }
          },
        }
        return chain
      }
      if (table === 'tenants') {
        const chain = {
          select: () => chain,
          eq: () => chain,
          single: async () => ({ data: h.tenants[0] ?? { selena_config: null }, error: null }),
        }
        return chain
      }
      if (table === 'comhub_contacts') {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          limit: async () => ({ data: h.contacts, error: null }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }
        return chain
      }
      if (table === 'comhub_messages') {
        const chain: Record<string, unknown> = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: h.messages, error: null }),
          insert: (row: Record<string, unknown>) => {
            const inserted = { id: 'msg-new', sent_at: new Date(0).toISOString(), ...row }
            h.messages.push(inserted)
            return {
              select: () => ({ single: async () => ({ data: inserted, error: null }) }),
            }
          },
        }
        return chain
      }
      if (table === 'comhub_threads') {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              h.threadUpdates.push(payload)
              return { data: null, error: null }
            },
          }),
        }
      }
      const generic = { select: () => generic, eq: () => generic, single: async () => ({ data: null, error: null }) }
      return generic
    },
    rpc: async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    },
  },
}))

import { GET, POST } from './route'
import { createToken } from '../auth/token'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const MEMBER_A = 'member-A'
const MEMBER_B = 'member-B'

function getReq(token?: string): Request {
  return new Request('http://localhost/api/team-portal/messages', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}
function postReq(body: unknown, token?: string): Request {
  return new Request('http://localhost/api/team-portal/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.members = [
    { id: MEMBER_A, tenant_id: TENANT_A, name: 'A Worker', phone: '+15550001', email: 'a@example.com', status: 'active' },
    { id: MEMBER_B, tenant_id: TENANT_B, name: 'B Worker', phone: '+15550002', email: 'b@example.com', status: 'active' },
  ]
  h.tenants = []
  h.contacts = []
  h.threads = []
  h.messages = [{ id: 'msg-old', direction: 'in', author: 'cleaner', body: 'hi', sent_at: '2026-07-01', channel: 'web' }]
  h.threadUpdates = []
})

describe('GET /api/team-portal/messages — auth gate', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await GET(getReq() as never)
    expect(res.status).toBe(401)
  })

  it('rejects a forged/invalid token with 401', async () => {
    const res = await GET(getReq('garbage.token') as never)
    expect(res.status).toBe(401)
  })

  it("returns the caller's OWN thread when a valid token is presented", async () => {
    const token = createToken(MEMBER_A, TENANT_A, 25, 'worker')
    const res = await GET(getReq(token) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.thread_id).toBe('thread-1')
  })
})

describe('POST /api/team-portal/messages — auth gate + IDOR', () => {
  it('rejects an unauthenticated request with 401, no insert', async () => {
    const res = await POST(postReq({ team_member_id: MEMBER_A, body: 'hey' }) as never)
    expect(res.status).toBe(401)
    expect(h.messages).toHaveLength(1) // still just the seeded row
  })

  it("ignores a caller-supplied team_member_id and posts as the TOKEN's own member (IDOR control)", async () => {
    // Attacker holds a valid token for MEMBER_A but tries to post as MEMBER_B in the body.
    const token = createToken(MEMBER_A, TENANT_A, 25, 'worker')
    const res = await POST(postReq({ team_member_id: MEMBER_B, body: 'spoofed' }, token) as never)
    expect(res.status).toBe(200)
    const inserted = h.messages.find((m) => m.body === 'spoofed')
    expect(inserted?.tenant_id).toBe(TENANT_A) // resolved from the TOKEN's tenant, not any body field
  })

  it('rejects a valid token from a DIFFERENT tenant than the one in the body-supplied id (still scoped to the token)', async () => {
    const token = createToken(MEMBER_B, TENANT_B, 25, 'worker')
    const res = await POST(postReq({ team_member_id: MEMBER_A, body: 'cross-tenant attempt' }, token) as never)
    expect(res.status).toBe(200)
    const inserted = h.messages.find((m) => m.body === 'cross-tenant attempt')
    expect(inserted?.tenant_id).toBe(TENANT_B) // never TENANT_A, despite the spoofed body id
  })
})
