/**
 * Mass-assignment WITNESS on `expenses/[id]` PUT — the #1-ranked (money-table)
 * site from `deploy-prep/mass-assignment-guard-spec.md`.
 *
 * Auth + tenant-scoped WHERE are both correct here; the gap is the unbounded
 * `SET` — `.update(body)` forwards every key the caller sends, including
 * `tenant_id` (row reassignment) and any internal column. This test drives
 * the real handler and asserts that gap is present TODAY. Expected to flip
 * red the moment the route whitelists the body (see spec §3/§4) — that flip
 * is the fix signal, not a bug in this test. Mirrors the shape of
 * `src/app/api/reviews/input-validation.witness.test.ts`.
 *
 * No route edits. Real handler driven against a recording Supabase stub.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const writes: Array<{ op: 'update'; table: string; payload: Record<string, unknown> }> = []

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 't1' }, error: null }),
}))

vi.mock('@/lib/audit', () => ({
  audit: async () => {},
}))

vi.mock('@/lib/supabase', () => {
  const chain = (payload: Record<string, unknown>) => {
    writes.push({ op: 'update', table: 'expenses', payload })
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq']) b[m] = () => b
    b.single = async () => ({ data: { id: 'exp1', ...payload }, error: null })
    return b
  }
  return {
    supabaseAdmin: {
      from: (_table: string) => ({
        update: (payload: Record<string, unknown>) => chain(payload),
      }),
    },
  }
})

import { PUT } from './[id]/route'

function put(body: unknown): Request {
  return new Request('http://localhost/api/finance/expenses/exp1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const ctx = { params: Promise.resolve({ id: 'exp1' }) }

beforeEach(() => {
  writes.length = 0
})

describe('expenses PUT — un-validated boundary (WITNESS: raw mass-assignment today)', () => {
  it('forwards attacker-controlled columns straight into .update() (the gap)', async () => {
    const res = await PUT(
      put({ description: 'legit note', tenant_id: 'other-tenant', id: 'reassigned', approved: true }),
      ctx
    )
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    const { op, table, payload } = writes[0]
    expect(op).toBe('update')
    expect(table).toBe('expenses')
    // THE GAP: none of these were whitelisted — a caller can reassign the row
    // to another tenant, collide/overwrite `id`, or flip an internal flag.
    expect(payload.tenant_id).toBe('other-tenant')
    expect(payload.id).toBe('reassigned')
    expect(payload.approved).toBe(true)
    expect(payload.description).toBe('legit note')
  })

  it('still coerces `amount` to cents before the unfiltered write (existing behavior, unchanged)', async () => {
    const res = await PUT(put({ amount: 12.5, tenant_id: 'other-tenant' }), ctx)
    expect(res.status).toBe(200)
    expect(writes[0].payload.amount).toBe(1250)
    expect(writes[0].payload.tenant_id).toBe('other-tenant')
  })
})
