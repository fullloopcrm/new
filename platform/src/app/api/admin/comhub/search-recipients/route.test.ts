import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/admin/comhub/search-recipients — first dedicated route-level test
 * (P1/W1 O13 sweep). The only prior coverage was the shared
 * postgrest-injection-routes.test.ts sweep (proves `.or()` is
 * sanitize-sourced) — this file covers the route's own logic: the
 * admin gate, the q-length short-circuit, limit clamping, result shaping
 * (client vs cleaner role + do_not_service flag), and tenant isolation.
 *
 * `.or()` is stubbed as a pass-through no-op here (tenant-db-fake has no
 * PostgREST text-search operator support) — search-term matching itself is
 * already covered by the injection sweep, so this file only needs the fake to
 * hand back tenant-scoped rows regardless of the filter text.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requireAdmin: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requireAdmin: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      chain.or = () => chain
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-admin', () => ({ requireAdmin: (...a: unknown[]) => h.requireAdmin(...a) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => h.tenantId }))

import { GET } from './route'

const req = (qs: string) => new NextRequest(`http://x/api/test?${qs}`)

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requireAdmin.mockReset()
  h.requireAdmin.mockResolvedValue(null)
  h.store = {
    clients: [
      { id: 'client-A1', tenant_id: 'tenant-A', name: 'Alice', phone: '555-0001', email: 'a@x.com', do_not_service: true },
      { id: 'client-B1', tenant_id: 'tenant-B', name: 'Bob', phone: '555-0002', email: 'b@x.com', do_not_service: false },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Cleaner Carl', phone: '555-0003', email: 'c@x.com' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Cleaner Dana', phone: '555-0004', email: 'd@x.com' },
    ],
  }
})

describe('GET /api/admin/comhub/search-recipients — permission gate', () => {
  it('returns the admin-gate error unchanged', async () => {
    h.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const res = await GET(req('q=al'))

    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/comhub/search-recipients — query gate', () => {
  it('returns an empty result set for a query shorter than 2 characters, without querying the DB', async () => {
    const res = await GET(req('q=a'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ results: [] })
  })

  it('returns an empty result set for a missing q', async () => {
    const res = await GET(req(''))

    await expect(res.json()).resolves.toEqual({ results: [] })
  })
})

describe('GET /api/admin/comhub/search-recipients — tenant isolation', () => {
  it("never returns another tenant's clients or team members", async () => {
    const res = await GET(req('q=al'))
    const json = await res.json()

    const ids = json.results.map((r: { id: string }) => r.id)
    expect(ids).toContain('client-A1')
    expect(ids).toContain('tm-A1')
    expect(ids).not.toContain('client-B1')
    expect(ids).not.toContain('tm-B1')
  })
})

describe('GET /api/admin/comhub/search-recipients — result shaping', () => {
  it('tags clients with role "client" and carries the do_not_service flag', async () => {
    const res = await GET(req('q=al'))
    const json = await res.json()

    const client = json.results.find((r: { id: string }) => r.id === 'client-A1')
    expect(client).toMatchObject({ role: 'client', name: 'Alice', phone: '555-0001', email: 'a@x.com', dns: true })
  })

  it('tags team members with role "cleaner" and no dns field', async () => {
    const res = await GET(req('q=al'))
    const json = await res.json()

    const member = json.results.find((r: { id: string }) => r.id === 'tm-A1')
    expect(member).toMatchObject({ role: 'cleaner', name: 'Cleaner Carl' })
    expect(member.dns).toBeUndefined()
  })

  it('defaults dns to false for a client with do_not_service unset/false', async () => {
    h.store.clients.push({ id: 'client-A2', tenant_id: 'tenant-A', name: 'Andy', phone: null, email: null, do_not_service: false })

    const res = await GET(req('q=al'))
    const json = await res.json()

    expect(json.results.find((r: { id: string }) => r.id === 'client-A2')).toMatchObject({ dns: false })
  })
})

describe('GET /api/admin/comhub/search-recipients — limit', () => {
  it('defaults to a limit of 10 and clamps a larger requested limit to 25', async () => {
    for (let i = 0; i < 30; i++) {
      h.store.clients.push({ id: `client-A-${i}`, tenant_id: 'tenant-A', name: `Extra ${i}`, phone: null, email: null, do_not_service: false })
    }

    const resDefault = await GET(req('q=al'))
    const jsonDefault = await resDefault.json()
    expect(jsonDefault.results.length).toBeLessThanOrEqual(10)

    const resHigh = await GET(req('q=al&limit=999'))
    const jsonHigh = await resHigh.json()
    expect(jsonHigh.results.length).toBeLessThanOrEqual(25)
  })

  it('falls back to 10 for a non-numeric limit', async () => {
    for (let i = 0; i < 15; i++) {
      h.store.clients.push({ id: `client-A-${i}`, tenant_id: 'tenant-A', name: `Extra ${i}`, phone: null, email: null, do_not_service: false })
    }

    const res = await GET(req('q=al&limit=notanumber'))
    const json = await res.json()

    expect(json.results.length).toBeLessThanOrEqual(10)
  })
})
