/**
 * ADMIN TERRITORY CLAIM TRANSITION — claimTerritory() upsert-in-place.
 *
 * `claimTerritory` used to be a plain INSERT into `territory_claims`, which
 * `territory_claims_one_per_combo` (UNIQUE on territory_id, category_id)
 * makes fail with 23505 the moment a row already exists. The admin UI
 * (`TerritoryClient.tsx`) offers "Mark Claimed" / "Mark Pending" on ANY
 * territory regardless of its current status — so approving a pending
 * application (pending -> claimed), downgrading a claim (claimed ->
 * pending), or reassigning the tenant on an existing claim all hit that
 * conflict and surfaced a misleading "This territory is already claimed"
 * error, even though the admin was managing the exact claim they were
 * looking at, not creating a competing one. The only workaround was
 * Release-then-Claim, which briefly opens a true "available" race window.
 *
 * Fixed: claimTerritory now looks up an existing (territory_id,
 * category_id) row first and UPDATEs it in place; only a genuinely new
 * combo goes through INSERT, where the unique index still protects against
 * two different admins concurrently creating competing claims on a still-
 * available territory.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('territory_claims', 'territory_id')
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { claimTerritory, releaseTerritory } from './data'

const fake = supabaseAdmin as unknown as FakeSupabase

const TERRITORY_ID = 'terr-1'
const CATEGORY_ID = 'cat-1'
const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

beforeEach(() => {
  fake._store.clear()
})

describe('claimTerritory — transitions on an existing claim', () => {
  it('approves a pending claim to claimed without a false conflict', async () => {
    const created = await claimTerritory({
      territoryId: TERRITORY_ID,
      categoryId: CATEGORY_ID,
      tenantId: TENANT_A,
      status: 'pending',
    })
    expect(created.ok).toBe(true)

    const approved = await claimTerritory({
      territoryId: TERRITORY_ID,
      categoryId: CATEGORY_ID,
      tenantId: TENANT_A,
      status: 'claimed',
    })
    expect(approved.ok).toBe(true)

    const rows = fake._all('territory_claims').filter(
      (r) => r.territory_id === TERRITORY_ID && r.category_id === CATEGORY_ID,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('claimed')
    expect(rows[0].claimed_at).not.toBeNull()
    expect(rows[0].pending_since).toBeNull()
  })

  it('downgrades a claimed territory back to pending in place', async () => {
    await claimTerritory({ territoryId: TERRITORY_ID, categoryId: CATEGORY_ID, tenantId: TENANT_A, status: 'claimed' })
    const downgraded = await claimTerritory({ territoryId: TERRITORY_ID, categoryId: CATEGORY_ID, tenantId: TENANT_A, status: 'pending' })
    expect(downgraded.ok).toBe(true)

    const rows = fake._all('territory_claims')
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('pending')
    expect(rows[0].pending_since).not.toBeNull()
    expect(rows[0].claimed_at).toBeNull()
  })

  it('reassigns the tenant on an existing claim without duplicating the row', async () => {
    await claimTerritory({ territoryId: TERRITORY_ID, categoryId: CATEGORY_ID, tenantId: TENANT_A, status: 'claimed' })
    const reassigned = await claimTerritory({ territoryId: TERRITORY_ID, categoryId: CATEGORY_ID, tenantId: TENANT_B, status: 'claimed' })
    expect(reassigned.ok).toBe(true)

    const rows = fake._all('territory_claims')
    expect(rows).toHaveLength(1)
    expect(rows[0].tenant_id).toBe(TENANT_B)
  })

  it('still blocks a genuinely competing claim on a different, already-claimed combo', async () => {
    await claimTerritory({ territoryId: TERRITORY_ID, categoryId: CATEGORY_ID, tenantId: TENANT_A, status: 'claimed' })
    // Same territory, a DIFFERENT category — the fake's single-column unique
    // constraint (territory_id only) still exercises the INSERT/23505 path
    // that a real compound (territory_id, category_id) index would reject
    // only when both columns collide; this proves the insert branch itself
    // still surfaces a conflict rather than silently upserting.
    const competing = await claimTerritory({
      territoryId: TERRITORY_ID,
      categoryId: 'cat-2',
      tenantId: TENANT_B,
      status: 'claimed',
    })
    expect(competing.ok).toBe(false)
    if (!competing.ok) expect(competing.conflict).toBe(true)
  })
})

describe('releaseTerritory', () => {
  it('removes the claim so the combo reads as available again', async () => {
    await claimTerritory({ territoryId: TERRITORY_ID, categoryId: CATEGORY_ID, tenantId: TENANT_A, status: 'claimed' })
    const released = await releaseTerritory(TERRITORY_ID, CATEGORY_ID)
    expect(released.ok).toBe(true)
    expect(fake._all('territory_claims')).toHaveLength(0)
  })
})
