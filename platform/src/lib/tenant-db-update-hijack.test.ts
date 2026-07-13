/**
 * tenantDb().update() reassignment fix.
 *
 * Docstring on tenant-db.ts claims update() is "auto-filtered to this tenant",
 * and insert() explicitly stamps (overrides) tenant_id in the values it
 * writes. update() did the WHERE-clause half (.eq('tenant_id', tenantId))
 * but never did the equivalent for the SET clause: a caller who passed a raw
 * request body straight to tenantDb(tenantId).from(table).update(body) could
 * include tenant_id in that body and reassign one of their OWN rows to a
 * DIFFERENT tenant's namespace. The WHERE filter still only lets you touch a
 * row you already own, but nothing stopped the SET clause from moving that
 * row into someone else's tenant_id afterward — a live route doing this was
 * found at src/app/api/referrals/[id]/route.ts (PUT with `.update(body)`).
 *
 * Fixed by stripping tenant_id out of the values object before it reaches
 * PostgREST, mirroring insert()'s existing stamp-and-override behavior.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from './tenant-db'

const A_ID = '11111111-1111-1111-1111-111111111111'
const B_ID = '22222222-2222-2222-2222-222222222222'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('referrals', [
    { id: 'ref-a', tenant_id: A_ID, status: 'pending', reward_amount: 1000 },
  ])
})

describe('tenantDb().update() — tenant_id reassignment', () => {
  it('ignores a tenant_id in the update payload — the row stays on the caller\'s own tenant', async () => {
    const db = tenantDb(A_ID)
    const { data, error } = await db
      .from('referrals')
      .update({ status: 'paid', tenant_id: B_ID })
      .eq('id', 'ref-a')
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.tenant_id).toBe(A_ID)
    expect(data?.status).toBe('paid')

    // Confirm directly against the store too, not just the returned row.
    const row = fake._store.get('referrals')?.find((r) => r.id === 'ref-a')
    expect(row?.tenant_id).toBe(A_ID)
  })

  it('still only touches rows already owned by the caller\'s tenant', async () => {
    fake._seed('referrals', [
      { id: 'ref-a', tenant_id: A_ID, status: 'pending', reward_amount: 1000 },
      { id: 'ref-b', tenant_id: B_ID, status: 'pending', reward_amount: 500 },
    ])
    const db = tenantDb(A_ID)
    const { data, error } = await db
      .from('referrals')
      .update({ status: 'paid' })
      .eq('id', 'ref-b')
      .select()
      .single()

    // No row matches (id=ref-b AND tenant_id=A_ID) — B's row is untouched.
    expect(error).not.toBeNull()
    const bRow = fake._store.get('referrals')?.find((r) => r.id === 'ref-b')
    expect(bRow?.status).toBe('pending')
    void data
  })
})
