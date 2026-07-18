/**
 * PATCH/DELETE /api/finance/entities/[id] — default-entity archive race.
 *
 * DELETE used to block archiving the default entity with a check-then-act
 * SELECT-then-UPDATE. A concurrent PATCH {make_default:true} on the SAME
 * entity landing between the SELECT and the UPDATE could flip is_default to
 * true right before the archive fires, leaving the tenant's default entity
 * archived -- every fallback that resolves "the default entity" when no
 * entity_id is given (getDefaultEntityId, post_journal_entry's own SQL-side
 * fallback) would then silently keep resolving new financial writes to a
 * dead entity forever. Fixed: the is_default check now lives in the archive
 * UPDATE's own WHERE clause (atomic, not a preceding SELECT), and
 * make_default goes through the atomic set_default_entity RPC (which also
 * refuses to promote an inactive entity). See
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
  const fake = makeSupabaseFake(h, { detachReads: true, rpc: { set_default_entity: setDefaultEntity } })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { PATCH, DELETE } from './route'

const req = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_ID }, error: null }))
  h.store = {
    entities: [
      { id: 'ent-default', tenant_id: TENANT_ID, name: 'Default Co', is_default: true, active: true },
      { id: 'ent-other', tenant_id: TENANT_ID, name: 'Other Co', is_default: false, active: true },
    ],
  }
})

describe('DELETE /api/finance/entities/[id] — archive guard', () => {
  it('blocks archiving the current default entity', async () => {
    const res = await DELETE(new Request('http://x'), params('ent-default'))
    expect(res.status).toBe(400)
    expect(h.store.entities.find((e) => e.id === 'ent-default')?.active).toBe(true)
  })

  it('archives a non-default entity normally', async () => {
    const res = await DELETE(new Request('http://x'), params('ent-other'))
    expect(res.status).toBe(200)
    expect(h.store.entities.find((e) => e.id === 'ent-other')?.active).toBe(false)
  })

  it('404s for an entity that does not exist under this tenant', async () => {
    const res = await DELETE(new Request('http://x'), params('nope'))
    expect(res.status).toBe(404)
  })

  it('never leaves the store with an archived entity that is still is_default:true (race simulation)', async () => {
    // ent-other is about to be promoted to default (PATCH) at the same time
    // ent-default is being archived (DELETE) -- both target the CURRENT
    // default's sibling relationship, exercising the exact window the old
    // check-then-act guard missed. Depending on interleave order either
    // request can legitimately win (DELETE 400s if it's still the default
    // at that instant, or PATCH's promote loses to an already-archived
    // target) -- the one thing that must NEVER happen is landing in a state
    // where a row is both is_default:true and active:false.
    await Promise.all([
      PATCH(req({ make_default: true }), params('ent-other')),
      DELETE(new Request('http://x'), params('ent-default')),
    ])

    const brokenRows = h.store.entities.filter((e) => e.is_default === true && e.active === false)
    expect(brokenRows).toHaveLength(0)
  })
})

describe('PATCH /api/finance/entities/[id] — make_default', () => {
  it('promotes a new default and demotes the old one', async () => {
    const res = await PATCH(req({ make_default: true }), params('ent-other'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.entity.is_default).toBe(true)
    expect(h.store.entities.find((e) => e.id === 'ent-default')?.is_default).toBe(false)
  })

  it('refuses to promote an archived entity', async () => {
    h.store.entities.push({ id: 'ent-archived', tenant_id: TENANT_ID, name: 'Gone Co', is_default: false, active: false })
    const res = await PATCH(req({ make_default: true }), params('ent-archived'))
    expect(res.status).toBe(500)
    // Default is untouched -- the failed promote must not have demoted it.
    expect(h.store.entities.find((e) => e.id === 'ent-default')?.is_default).toBe(true)
  })

  it('updates other fields without touching is_default when make_default is absent', async () => {
    const res = await PATCH(req({ name: 'Renamed Co' }), params('ent-other'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.entity.name).toBe('Renamed Co')
    expect(json.entity.is_default).toBe(false)
    expect(h.store.entities.find((e) => e.id === 'ent-default')?.is_default).toBe(true)
  })

  it('two concurrent make_default calls for two different entities land exactly one default', async () => {
    h.store.entities.push({ id: 'ent-third', tenant_id: TENANT_ID, name: 'Third Co', is_default: false, active: true })
    const [resA, resB] = await Promise.all([
      PATCH(req({ make_default: true }), params('ent-other')),
      PATCH(req({ make_default: true }), params('ent-third')),
    ])
    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    const defaults = h.store.entities.filter((e) => e.is_default === true)
    expect(defaults).toHaveLength(1)
  })
})
