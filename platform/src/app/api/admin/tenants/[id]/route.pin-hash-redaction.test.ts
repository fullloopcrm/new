import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/admin/tenants/[id] — pin_hash redaction probe.
 *
 * BUG (fixed here): the `tenant_members` fetch used `select('*')`, and the
 * full row array is returned to the browser verbatim as `members` below —
 * including `pin_hash`, the deterministic HMAC-SHA256 of the tenant admin's
 * live login PIN (see admin-pin.ts). Sibling routes that also need PIN state
 * (`admin/businesses/[id]/users`, `admin/users`) deliberately select pin_hash
 * internally but only ever return derived `has_pin`/`pin_set_at`/
 * `last_login` — never the raw hash. This route drifted from that
 * invariant. No frontend consumer reads `members[].pin_hash` from this
 * route (admin/tenants/[id]/page.tsx's Member type is id/clerk_user_id/
 * role/name/email only), so excluding it is a pure hardening, not a
 * behavior change.
 *
 * The shared tenant-isolation-harness does not implement column
 * projection (its `select(cols)` ignores `cols` and always returns the
 * full seeded row), so it cannot distinguish `select('*')` from an
 * explicit column list — a false-positive pass either way. This test uses
 * a small dedicated stub that DOES project columns, so it genuinely goes
 * RED against the pre-fix `select('*')` and GREEN against the fixed
 * explicit column list.
 */

const T = 'tid-a'

function project(row: Record<string, unknown>, cols: string): Record<string, unknown> {
  if (cols.trim() === '*') return { ...row }
  const out: Record<string, unknown> = {}
  for (const key of cols.split(',').map((s) => s.trim())) out[key] = row[key]
  return out
}

function makeChain(rows: Record<string, unknown>[], cols: string, countHead: boolean) {
  const filters: Array<{ col: string; val: unknown }> = []
  let wantSingle = false
  const chain = {
    eq(col: string, val: unknown) {
      filters.push({ col, val })
      return chain
    },
    in(col: string, vals: unknown[]) {
      filters.push({ col, val: vals })
      return chain
    },
    order() {
      return chain
    },
    single() {
      wantSingle = true
      return chain
    },
    then(resolve: (v: unknown) => void) {
      const hit = rows.filter((r) =>
        filters.every((f) => (Array.isArray(f.val) ? f.val.includes(r[f.col]) : r[f.col] === f.val)),
      )
      if (countHead) {
        resolve({ data: null, error: null, count: hit.length })
        return
      }
      const projected = hit.map((r) => project(r, cols))
      resolve(wantSingle ? { data: projected[0] ?? null, error: null } : { data: projected, error: null })
    },
  }
  return chain
}

const seedData: Record<string, Record<string, unknown>[]> = {
  tenants: [{ id: T, name: 'Acme', status: 'active' }],
  tenant_members: [
    { id: 'm1', tenant_id: T, clerk_user_id: 'clerk-1', role: 'owner', name: 'Owner Person', email: 'owner@acme.com', phone: '+15551234567', created_at: '2026-01-01', pin_hash: 'SECRET-HASH-abc123', pin_set_at: '2026-01-02', pin_last_login: '2026-01-03' },
  ],
  clients: [],
  bookings: [],
  team_members: [],
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from(table: string) {
      return {
        select(cols: string, opts?: { count?: string; head?: boolean }) {
          return makeChain(seedData[table] || [], cols, !!opts?.head)
        },
      }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { GET } from './route'

describe('GET /api/admin/tenants/[id] — pin_hash redaction probe', () => {
  it('PIN-HASH-REDACTION PROBE: the returned members array never includes pin_hash', async () => {
    const res = await GET(new Request(`http://t/api/admin/tenants/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.members).toHaveLength(1)
    expect(body.members[0].pin_hash).toBeUndefined()
    expect(JSON.stringify(body.members)).not.toContain('SECRET-HASH-abc123')
  })

  it('CONTROL: fields the frontend actually renders (name/email/role/clerk_user_id) still come through', async () => {
    const res = await GET(new Request(`http://t/api/admin/tenants/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.members[0]).toMatchObject({ id: 'm1', clerk_user_id: 'clerk-1', role: 'owner', name: 'Owner Person', email: 'owner@acme.com' })
  })
})
