/**
 * Characterization tests for finance/periods GET + validation on POST — the
 * gaps left by route.witness.test.ts, which only covers the cross-tenant
 * entity_id injection witness on POST. GET (list, entity filter) and POST's
 * required-field validation were entirely untested (0% on GET).
 *
 * Pins:
 *   - GET is tenant-scoped, embeds entities(name), and an entity_id query
 *     param narrows the list to that entity
 *   - POST 400s when year or month is missing
 *   - POST upsert defaults: status='open', checklist={} when omitted
 *   - both short-circuit on an auth failure
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<
      | { tenant: { userId: string; tenantId: string; tenant: { id: string }; role: string }; error: null }
      | { tenant: null; error: Response }
    > => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null }),
  ),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { GET, POST } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  h = createTenantDbHarness({ accounting_periods: [], entities: [] })
  holder.from = h.from
})

function getReq(qs = ''): Request {
  return new Request(`http://t/api/finance/periods${qs}`)
}

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET /api/finance/periods', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('lists only the caller tenant\'s periods, with the embedded entity name', async () => {
    h.seed.accounting_periods.push(
      { id: 'p-mine', tenant_id: CTX_TENANT, year: 2026, month: 7, entities: { name: 'Main LLC' } },
      { id: 'p-foreign', tenant_id: OTHER_TENANT, year: 2026, month: 7 },
    )
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.periods.map((p: { id: string }) => p.id)).toEqual(['p-mine'])
    expect(body.periods[0].entities).toEqual({ name: 'Main LLC' })
  })

  it('an entity_id query param narrows the list to that entity', async () => {
    h.seed.accounting_periods.push(
      { id: 'p-a', tenant_id: CTX_TENANT, entity_id: 'ent-a', year: 2026, month: 7 },
      { id: 'p-b', tenant_id: CTX_TENANT, entity_id: 'ent-b', year: 2026, month: 7 },
    )
    const res = await GET(getReq('?entity_id=ent-a'))
    const body = await res.json()
    expect(body.periods.map((p: { id: string }) => p.id)).toEqual(['p-a'])
  })

  it('returns an empty list, not an error, when there are no periods', async () => {
    const res = await GET(getReq())
    expect(await res.json()).toEqual({ periods: [] })
  })
})

describe('POST /api/finance/periods', () => {
  it('400s when year is missing', async () => {
    const res = await POST(postReq({ month: 7 }))
    expect(res.status).toBe(400)
  })

  it('400s when month is missing', async () => {
    const res = await POST(postReq({ year: 2026 }))
    expect(res.status).toBe(400)
  })

  it('creates a period defaulting status=open and checklist={} when omitted', async () => {
    const res = await POST(postReq({ year: 2026, month: 7 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.period).toMatchObject({ tenant_id: CTX_TENANT, year: 2026, month: 7, status: 'open', checklist: {}, notes: null })
  })

  it('honors an explicit status and checklist/notes when provided', async () => {
    const res = await POST(postReq({ year: 2026, month: 8, status: 'locked', checklist: { bank: true }, notes: 'closed early' }))
    const body = await res.json()
    expect(body.period).toMatchObject({ status: 'locked', checklist: { bank: true }, notes: 'closed early' })
  })

  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await POST(postReq({ year: 2026, month: 7 }))
    expect(res.status).toBe(403)
  })
})
