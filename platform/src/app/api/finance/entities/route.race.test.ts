/**
 * POST /api/finance/entities — make_default collision on a legitimate race.
 *
 * The old create path demoted any existing default in one UPDATE, then
 * inserted the new entity with is_default:true as a SEPARATE statement.
 * entities.is_default already carries a real DB backstop
 * (idx_entities_tenant_default, unique partial index, migration 034) unlike
 * the is_primary tables fixed earlier this session, so this race couldn't
 * silently create two defaults -- but two concurrent make_default creates
 * (e.g. a double-submitted "add entity, make default" form) could still
 * throw a raw unhandled 23505 as a generic 500 instead of deterministically
 * landing one winner. Fixed by always inserting is_default:false and
 * promoting through the atomic set_default_entity RPC afterward (same
 * single-UPDATE idiom as set_primary_client_contact /
 * set_primary_client_property). See
 * 2026_07_18_entity_default_must_be_active.sql.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

/** Faithful fake of set_default_entity: one synchronous pass, same checks
 *  (exists, belongs to tenant, active) as the real function. */
function setDefaultEntity(store: FakeStoreHandle, args: Record<string, unknown>) {
  const rows = store.store.entities ?? []
  const target = rows.find((r) => r.id === args.p_entity_id && r.tenant_id === args.p_tenant_id)
  if (!target) return { data: null, error: { message: `set_default_entity: entity ${args.p_entity_id} not found for tenant ${args.p_tenant_id}` } }
  if (!target.active) return { data: null, error: { message: `set_default_entity: entity ${args.p_entity_id} is archived, cannot be made default` } }
  for (const row of rows) {
    if (row.tenant_id === args.p_tenant_id) row.is_default = row.id === args.p_entity_id
  }
  return { data: null, error: null }
}

vi.mock('@/lib/supabase', () => {
  // `active: true` mirrors the real schema's NOT NULL DEFAULT TRUE
  // (migration 034) — the route's insert payload relies on that DB default
  // and doesn't set `active` explicitly, same as production.
  const fake = makeSupabaseFake(h, {
    detachReads: true,
    insertDefaults: { active: true },
    rpc: { set_default_entity: setDefaultEntity },
  })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    entities: [{ id: 'ent-existing', tenant_id: TENANT_ID, name: 'Existing Co', is_default: true, active: true }],
  }
})

describe('POST /api/finance/entities — make_default', () => {
  it('creates a non-default entity untouched (no regression)', async () => {
    const res = await POST(postReq({ name: 'New Co' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.entity.is_default).toBe(false)
    expect(h.store.entities.find((e) => e.id === 'ent-existing')?.is_default).toBe(true)
  })

  it('make_default:true demotes the existing default and promotes the new entity, exactly one default remains', async () => {
    const res = await POST(postReq({ name: 'New Co', make_default: true }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.entity.is_default).toBe(true)

    const defaults = h.store.entities.filter((e) => e.is_default === true)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(json.entity.id)
  })

  it('two concurrent make_default creates land exactly one default, not a collision 500', async () => {
    const [resA, resB] = await Promise.all([
      POST(postReq({ name: 'Co A', make_default: true })),
      POST(postReq({ name: 'Co B', make_default: true })),
    ])
    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)

    const defaults = h.store.entities.filter((e) => e.is_default === true)
    expect(defaults).toHaveLength(1)
  })
})
