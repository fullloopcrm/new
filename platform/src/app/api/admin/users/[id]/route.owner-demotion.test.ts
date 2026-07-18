import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * PUT /api/admin/users/:id — this is the variant the live dashboard/users UI
 * actually calls (see dashboard/users/page.tsx). It already blocked a
 * non-owner GRANTING the 'owner' role, but had no guard on the reverse: any
 * 'admin' (settings.edit by default, per rbac.ts) could PUT {role:'staff'}
 * onto the real owner's member row and strip their always-full-access tier
 * with zero owner-level authorization -- no self-promotion needed at all.
 * DELETE already blocks removing the last owner; PUT had no equivalent.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const store: Record<string, Row[]> = { tenant_members: [] }
let actorRole = 'admin'

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => {
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: null }
      },
      single: async () => {
        if (kind === 'update') {
          store[table] = (store[table] || []).map((r) => (match(r) ? { ...r, ...payload } : r))
          const found = (store[table] || []).find(match)
          return { data: found ?? null, error: found ? null : { message: 'not found' } }
        }
        const found = (store[table] || []).find(match)
        return { data: found ?? null, error: found ? null : { message: 'not found' } }
      },
      then: (res: (v: { data: unknown; error: unknown; count?: number }) => unknown) => {
        const filtered = (store[table] || []).filter(match)
        return res({ data: filtered, error: null, count: filtered.length })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT, role: actorRole }, error: null }),
}))

import { PUT } from '@/app/api/admin/users/[id]/route'

function req(body: unknown): Request {
  return new Request('https://x/api/admin/users/x', { method: 'PUT', body: JSON.stringify(body) })
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/admin/users/[id] — owner demotion is owner-only', () => {
  beforeEach(() => {
    store.tenant_members = [
      { id: 'owner1', tenant_id: TENANT, role: 'owner' },
      { id: 'admin1', tenant_id: TENANT, role: 'admin' },
    ]
    actorRole = 'admin'
  })

  it('rejects an admin demoting the real owner to a lower role', async () => {
    const res = await PUT(req({ role: 'staff' }) as any, ctx('owner1'))
    expect(res.status).toBe(403)
    expect(store.tenant_members.find((m) => m.id === 'owner1')?.role).toBe('owner')
  })

  it('still allows an admin to edit a non-owner member', async () => {
    const res = await PUT(req({ role: 'manager' }) as any, ctx('admin1'))
    expect(res.status).toBe(200)
    expect(store.tenant_members.find((m) => m.id === 'admin1')?.role).toBe('manager')
  })

  it('allows an owner to demote another owner when a second owner remains', async () => {
    store.tenant_members.push({ id: 'owner2', tenant_id: TENANT, role: 'owner' })
    actorRole = 'owner'
    const res = await PUT(req({ role: 'admin' }) as any, ctx('owner1'))
    expect(res.status).toBe(200)
    expect(store.tenant_members.find((m) => m.id === 'owner1')?.role).toBe('admin')
  })

  it('blocks demoting the last remaining owner, even by an owner', async () => {
    actorRole = 'owner'
    const res = await PUT(req({ role: 'admin' }) as any, ctx('owner1'))
    expect(res.status).toBe(400)
    expect(store.tenant_members.find((m) => m.id === 'owner1')?.role).toBe('owner')
  })

  it('still rejects an admin granting the owner role (pre-existing guard, unchanged)', async () => {
    const res = await PUT(req({ role: 'owner' }) as any, ctx('admin1'))
    expect(res.status).toBe(403)
    expect(store.tenant_members.find((m) => m.id === 'admin1')?.role).toBe('admin')
  })
})
