import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/finance/expenses — first route-level regression test (P1/W1
 * O13 sweep). Zero prior coverage of entity-scoped filtering, the
 * dollars-to-cents conversion on create, or tenant isolation.
 * `validate()`/`entityIdFromUrl()`/`getDefaultEntityId()` run for real
 * (simple/pure or trivially fake-backed); `audit` is mocked.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
  audit: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  audit: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))
vi.mock('@/lib/audit', () => ({ audit: (...a: unknown[]) => h.audit(...a) }))

import { GET, POST } from './route'

const getReq = (qs = '') => new Request(`http://x/api/test${qs}`)
const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  h.audit.mockReset()
  h.audit.mockResolvedValue(undefined)
  h.store = {
    entities: [{ id: 'ent-A-default', tenant_id: 'tenant-A', is_default: true }],
    expenses: [
      { id: 'exp-A1', tenant_id: 'tenant-A', entity_id: 'ent-A-default', category: 'utilities', amount: 5000, date: '2026-07-01' },
      { id: 'exp-A2', tenant_id: 'tenant-A', entity_id: 'ent-A-other', category: 'rent', amount: 200000, date: '2026-07-02' },
      { id: 'exp-B1', tenant_id: 'tenant-B', entity_id: 'ent-B', category: 'utilities', amount: 3000, date: '2026-07-01' },
    ],
  }
})

describe('GET /api/finance/expenses — permission gate + tenant isolation', () => {
  it('returns the permission error unchanged', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await GET(getReq())

    expect(res.status).toBe(403)
  })

  it("only ever returns the caller tenant's own expenses", async () => {
    const res = await GET(getReq())
    const json = await res.json()

    const ids = json.expenses.map((e: { id: string }) => e.id)
    expect(ids).toContain('exp-A1')
    expect(ids).toContain('exp-A2')
    expect(ids).not.toContain('exp-B1')
  })

  it('filters by entity_id when supplied', async () => {
    const res = await GET(getReq('?entity_id=ent-A-default'))
    const json = await res.json()

    expect(json.expenses.map((e: { id: string }) => e.id)).toEqual(['exp-A1'])
  })

  it('treats entity_id=all/consolidated as no filter', async () => {
    const res = await GET(getReq('?entity_id=all'))
    const json = await res.json()

    expect(json.expenses.length).toBe(2)
  })
})

describe('POST /api/finance/expenses — permission gate + validation', () => {
  it('returns the permission error unchanged and never creates an expense', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    })

    const res = await POST(postReq({ category: 'utilities', amount: 50 }))

    expect(res.status).toBe(403)
    expect(h.store.expenses.length).toBe(3)
  })

  it('rejects a missing category with 400', async () => {
    const res = await POST(postReq({ amount: 50 }))

    expect(res.status).toBe(400)
  })

  it('rejects a missing amount with 400', async () => {
    const res = await POST(postReq({ category: 'utilities' }))

    expect(res.status).toBe(400)
  })

  it('rejects a negative amount with 400', async () => {
    const res = await POST(postReq({ category: 'utilities', amount: -5 }))

    expect(res.status).toBe(400)
  })
})

describe('POST /api/finance/expenses — creation', () => {
  it('converts the dollar amount to cents and stamps the tenant_id', async () => {
    const res = await POST(postReq({ category: 'utilities', amount: 42.5 }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.expense.amount).toBe(4250)
    expect(json.expense.tenant_id).toBe('tenant-A')
    expect(json.expense.category).toBe('utilities')
  })

  it("falls back to the tenant's default entity when entity_id is omitted", async () => {
    const res = await POST(postReq({ category: 'supplies', amount: 10 }))
    const json = await res.json()

    expect(json.expense.entity_id).toBe('ent-A-default')
  })

  it('uses the caller-supplied entity_id when provided', async () => {
    const res = await POST(postReq({ category: 'supplies', amount: 10, entity_id: 'ent-A-other' }))
    const json = await res.json()

    expect(json.expense.entity_id).toBe('ent-A-other')
  })

  it("defaults date to today when omitted, and honors an explicit date", async () => {
    const res = await POST(postReq({ category: 'supplies', amount: 10, date: '2026-01-15' }))
    const json = await res.json()

    expect(json.expense.date).toBe('2026-01-15')
  })

  it('logs an expense.created audit event', async () => {
    const res = await POST(postReq({ category: 'supplies', amount: 10 }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-A', action: 'expense.created', entityId: json.expense.id }))
  })
})
