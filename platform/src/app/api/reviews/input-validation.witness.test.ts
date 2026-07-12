/**
 * Input-validation invariant + gap, codified on ONE resource (`reviews`).
 *
 * This file pairs a PASSING regression guard with a PASSING witness so the
 * suite stays green today and the witness FLIPS to red the moment the gap is
 * closed — the signal the fix landed. See:
 *   deploy-prep/input-validation-coverage-audit.md  (body: GAP 3, the 5 `.update(body)` sites)
 *   deploy-prep/input-validation-audit.md            (params/query companion)
 *   deploy-prep/security-test-inventory.md           (this file's row)
 *
 * Why `reviews`: it exposes BOTH shapes on the same table —
 *   POST /api/reviews         → validate(body, schema)  ✅ whitelist + bounds
 *   PUT  /api/reviews/[id]     → .update(body)           ❌ raw, unbounded SET
 * so one file locks the good boundary and witnesses the bad one side by side.
 *
 * No route edits. Both real handlers are driven against a recording Supabase stub.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Records every write the handlers make so we can assert what reaches the DB.
const writes: Array<{ op: 'insert' | 'update'; table: string; payload: Record<string, unknown> }> = []

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: async () => ({ tenantId: 't1' }),
  }
})

vi.mock('@/lib/supabase', () => {
  const chain = (op: 'insert' | 'update', table: string, payload: Record<string, unknown>) => {
    writes.push({ op, table, payload })
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'order']) b[m] = () => b
    // The row the DB "returns" — echo the payload so it looks like a real write.
    b.single = async () => ({ data: { id: 'rev1', ...payload }, error: null })
    b.maybeSingle = b.single
    return b
  }
  return {
    supabaseAdmin: {
      from: (table: string) => ({
        insert: (payload: Record<string, unknown>) => chain('insert', table, payload),
        update: (payload: Record<string, unknown>) => chain('update', table, payload),
      }),
    },
  }
})

import { POST } from './route'
import { PUT } from './[id]/route'

function post(body: unknown): Request {
  return new Request('http://localhost/api/reviews', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function put(body: unknown): Request {
  return new Request('http://localhost/api/reviews/rev1', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const putCtx = { params: Promise.resolve({ id: 'rev1' }) }

beforeEach(() => {
  writes.length = 0
})

// ── GUARD: the validated boundary (POST) rejects malformed input and never writes ──
describe('reviews POST — validated boundary (must reject malformed input)', () => {
  it('rejects an out-of-range rating (6 > max 5) with 400 and writes nothing', async () => {
    const res = await POST(post({ rating: 6 }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'rating must be at most 5' })
    expect(writes).toHaveLength(0)
  })

  it('rejects a non-numeric rating with 400 and writes nothing', async () => {
    const res = await POST(post({ rating: 'five-stars' }))
    expect(res.status).toBe(400)
    expect(writes).toHaveLength(0)
  })

  it('strips unknown/privileged fields (mass-assignment guard) before insert', async () => {
    const res = await POST(
      post({ rating: 5, comment: 'ok', tenant_id: 'attacker', is_verified: true, id: 'forced' })
    )
    expect(res.status).toBe(201)
    expect(writes).toHaveLength(1)
    const payload = writes[0].payload
    // validate() whitelists; only schema fields survive, tenant_id is the server's.
    expect(payload.tenant_id).toBe('t1')
    expect(payload).not.toHaveProperty('is_verified')
    expect(payload).not.toHaveProperty('id')
    expect(payload.rating).toBe(5)
  })
})

// ── WITNESS: the un-validated boundary (PUT) forwards the raw body verbatim ──
// Documents deploy-prep GAP 3. EXPECTED to start FAILING once `reviews/[id]`
// PUT whitelists the body (validate/pick). That flip is the fix signal.
describe('reviews PUT — un-validated boundary (WITNESS: raw mass-assignment today)', () => {
  it('forwards attacker-controlled columns straight into .update() (the gap)', async () => {
    const res = await PUT(
      put({ tenant_id: 'other-tenant', id: 'reassigned', is_verified: true, rating: 999 }),
      putCtx
    )
    expect(res.status).toBe(200)
    expect(writes).toHaveLength(1)
    const { op, table, payload } = writes[0]
    expect(op).toBe('update')
    expect(table).toBe('reviews')
    // THE GAP: none of these were whitelisted — a caller can set tenant_id
    // (row reassignment), id, internal flags, and an unbounded rating.
    expect(payload.tenant_id).toBe('other-tenant')
    expect(payload.id).toBe('reassigned')
    expect(payload.is_verified).toBe(true)
    expect(payload.rating).toBe(999)
  })
})
