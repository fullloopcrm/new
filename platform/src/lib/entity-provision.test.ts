/**
 * ensureDefaultEntity() is the documented self-healing guarantee for "every
 * tenant must own exactly one default entity". Its existence check used to
 * read is_default alone, so an archived default entity (see
 * 2026_07_18_entity_default_must_be_active.sql — DELETE's TOCTOU race could
 * leave one) read back as "already exists" forever, permanently defeating
 * the one thing this function exists to guarantee: no new active default
 * ever gets created, and every writer that falls back to it keeps resolving
 * to a dead entity.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const TENANT_ID = 'tenant-A'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as FakeStoreHandle

vi.mock('./supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})

import { ensureDefaultEntity } from './entity-provision'

beforeEach(() => {
  h.seq = 0
  h.store = { entities: [] }
})

describe('ensureDefaultEntity', () => {
  it('no-ops when an active default already exists', async () => {
    h.store.entities = [{ id: 'ent-1', tenant_id: TENANT_ID, is_default: true, active: true, name: 'Acme' }]
    const created = await ensureDefaultEntity(TENANT_ID, 'Acme')
    expect(created).toBe(false)
    expect(h.store.entities).toHaveLength(1)
  })

  it('creates a default entity when none exists', async () => {
    const created = await ensureDefaultEntity(TENANT_ID, 'Acme')
    expect(created).toBe(true)
    expect(h.store.entities).toHaveLength(1)
    expect(h.store.entities[0].is_default).toBe(true)
    expect(h.store.entities[0].active).toBe(true)
  })

  it('heals instead of no-op-ing when the only is_default row has been archived', async () => {
    // NOTE: this fake doesn't model idx_entities_tenant_default (the real
    // unique partial index on is_default=TRUE). In a live DB this scenario
    // only reaches a clean INSERT after the paired backfill
    // (UPDATE entities SET is_default=FALSE WHERE is_default AND NOT active,
    // 2026_07_18_entity_default_must_be_active.sql) has cleared the stale
    // flag on the archived row -- otherwise the insert below would 23505.
    // The two ship in the same migration file, applied together.
    h.store.entities = [{ id: 'ent-1', tenant_id: TENANT_ID, is_default: true, active: false, name: 'Acme (archived)' }]
    const created = await ensureDefaultEntity(TENANT_ID, 'Acme')
    expect(created).toBe(true)
    expect(h.store.entities).toHaveLength(2)
    const activeDefaults = h.store.entities.filter((e) => e.is_default === true && e.active === true)
    expect(activeDefaults).toHaveLength(1)
  })
})
