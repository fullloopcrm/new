import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/admin/businesses/[id] — pin_hash redaction probe.
 *
 * Same bug and same fix as route.pin-hash-redaction.test.ts in the sibling
 * admin/tenants/[id] route (identical `select('*')` on tenant_members,
 * returned verbatim as `members`) — see that file's comment for the full
 * writeup. This route's own frontend (admin/businesses/[id]/page.tsx) never
 * reads `data.members` at all, so excluding pin_hash here is strictly safer
 * than the sibling case, not just equivalent.
 *
 * Uses the same dedicated column-projecting stub as the sibling test — the
 * shared tenant-isolation-harness's select() ignores its column argument
 * and would pass this probe whether or not the fix was applied.
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
  tenants: [{ id: T, name: 'Acme', status: 'active', setup_progress: {} }],
  tenant_members: [
    { id: 'm1', tenant_id: T, clerk_user_id: 'clerk-1', role: 'owner', name: 'Owner Person', email: 'owner@acme.com', phone: '+15551234567', created_at: '2026-01-01', pin_hash: 'SECRET-HASH-abc123', pin_set_at: '2026-01-02', pin_last_login: '2026-01-03' },
  ],
  tenant_invites: [],
  clients: [],
  bookings: [],
  team_members: [],
  service_types: [],
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

describe('GET /api/admin/businesses/[id] — pin_hash redaction probe', () => {
  it('PIN-HASH-REDACTION PROBE: the returned members array never includes pin_hash', async () => {
    const res = await GET(new Request(`http://t/api/admin/businesses/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.members).toHaveLength(1)
    expect(body.members[0].pin_hash).toBeUndefined()
    expect(JSON.stringify(body.members)).not.toContain('SECRET-HASH-abc123')
  })

  it('CONTROL: id/role fields survive the fix (no behavior loss for this route\'s own — currently absent — members usage)', async () => {
    const res = await GET(new Request(`http://t/api/admin/businesses/${T}`), { params: Promise.resolve({ id: T }) })
    const body = await res.json()
    expect(body.members[0]).toMatchObject({ id: 'm1', clerk_user_id: 'clerk-1', role: 'owner', name: 'Owner Person', email: 'owner@acme.com' })
  })
})
