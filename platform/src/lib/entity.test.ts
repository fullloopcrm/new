/**
 * getDefaultEntityId() must never resolve to an archived entity.
 *
 * DELETE /api/finance/entities/[id] blocks archiving the tenant's default
 * entity, but that guard used to be a check-then-act race (see
 * 2026_07_18_entity_default_must_be_active.sql). If a default entity was
 * ever archived through that window, this function is the fallback every
 * finance write path (invoices, expenses, bank-accounts, the monthly-invoice
 * cron) uses when no entity_id is given — it must skip a
 * is_default:true/active:false row instead of silently resolving to it.
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

import { getDefaultEntityId } from './entity'

beforeEach(() => {
  h.seq = 0
  h.store = { entities: [] }
})

describe('getDefaultEntityId', () => {
  it('resolves the active default entity', async () => {
    h.store.entities = [
      { id: 'ent-1', tenant_id: TENANT_ID, is_default: true, active: true },
    ]
    expect(await getDefaultEntityId(TENANT_ID)).toBe('ent-1')
  })

  it('returns null when the only is_default:true row has been archived (active:false)', async () => {
    h.store.entities = [
      { id: 'ent-1', tenant_id: TENANT_ID, is_default: true, active: false },
    ]
    expect(await getDefaultEntityId(TENANT_ID)).toBeNull()
  })

  it('does not fall back to a non-default active entity when the default is archived', async () => {
    h.store.entities = [
      { id: 'ent-1', tenant_id: TENANT_ID, is_default: true, active: false },
      { id: 'ent-2', tenant_id: TENANT_ID, is_default: false, active: true },
    ]
    expect(await getDefaultEntityId(TENANT_ID)).toBeNull()
  })

  it('returns null for a tenant with no entities at all', async () => {
    expect(await getDefaultEntityId(TENANT_ID)).toBeNull()
  })
})
