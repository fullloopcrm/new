import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST/PUT /api/admin/users only checked requirePermission('settings.edit'),
 * which 'admin' holds by default (rbac.ts) — but neither route checked
 * whether the ACTOR already held 'owner' before letting them grant the
 * 'owner' role to a tenant_member (including themselves). 'owner' is
 * documented in rbac.ts as the one un-customizable, always-full-access tier;
 * letting a mere 'admin' mint themselves an owner account defeats that,
 * and DELETE only blocks removing the LAST owner — so self-promote then
 * delete the real owner is a full tenant takeover starting from 'admin'.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { tenant_members: [] }
let actorRole = 'admin'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => {
        if (kind === 'read') {
          const found = (store[table] || []).find(match)
          return { data: found ?? null, error: null }
        }
        return { data: null, error: null }
      },
      single: async () => {
        if (kind === 'insert') {
          const row = { id: `${table}-new`, ...payload }
          store[table] = [...(store[table] || []), row]
          return { data: row, error: null }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
          return res({ data: null, error: null })
        }
        return res({ data: (store[table] || []).filter(match), error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT, role: actorRole }, error: null }),
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash-${pin}`,
  generateAdminPin: () => '123456',
}))

import { POST, PUT } from '@/app/api/admin/users/route'

function req(body: unknown): Request {
  return new Request('https://x/api/admin/users', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/admin/users — owner grant is owner-only', () => {
  beforeEach(() => { store.tenant_members = []; actorRole = 'admin' })

  it('rejects an admin creating a new member with role=owner', async () => {
    const res = await POST(req({ name: 'Eve', role: 'owner' }) as any)
    expect(res.status).toBe(403)
    expect(store.tenant_members.length).toBe(0)
  })

  it('allows an owner to create a new member with role=owner', async () => {
    actorRole = 'owner'
    const res = await POST(req({ name: 'Eve', role: 'owner' }) as any)
    expect(res.status).toBe(200)
    expect(store.tenant_members[0].role).toBe('owner')
  })

  it('still allows an admin to create a non-owner member', async () => {
    const res = await POST(req({ name: 'Staffer', role: 'staff' }) as any)
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/admin/users — owner grant is owner-only', () => {
  beforeEach(() => {
    store.tenant_members = [{ id: 'm1', tenant_id: TENANT, role: 'admin' }]
    actorRole = 'admin'
  })

  it('rejects an admin promoting themselves (or anyone) to owner', async () => {
    const res = await PUT(req({ id: 'm1', role: 'owner' }) as any)
    expect(res.status).toBe(403)
    expect(store.tenant_members[0].role).toBe('admin')
  })

  it('allows an owner to promote a member to owner', async () => {
    actorRole = 'owner'
    const res = await PUT(req({ id: 'm1', role: 'owner' }) as any)
    expect(res.status).toBe(200)
    expect(store.tenant_members[0].role).toBe('owner')
  })
})
