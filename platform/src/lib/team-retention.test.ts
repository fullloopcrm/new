/**
 * getTeamMemberRetentionStats — smart-scheduling upgrade spec Part 4 item 1.
 * Pinned:
 *   - active + paused schedules count as still-retained, not lapsed
 *   - cancelled schedules attribute to cancelled_team_member_id when set
 *   - cancelled schedules with no snapshot (pre-migration rows) fall back to
 *     the live team_member_id
 *   - a schedule reassigned to someone else, then cancelled, attributes to
 *     the snapshot (new member), not the old member who no longer holds it
 *   - zero history returns retention_rate: null, not 0 or NaN
 *   - tenant isolation: another tenant's rows never bleed into the count
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> })) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h) }))

import { getTeamMemberRetentionStats } from './team-retention'

beforeEach(() => {
  h.seq = 0
  h.store = {
    recurring_schedules: [
      { id: 's1', tenant_id: 'tenant-A', team_member_id: 'member-1', status: 'active' },
      { id: 's2', tenant_id: 'tenant-A', team_member_id: 'member-1', status: 'paused' },
      { id: 's3', tenant_id: 'tenant-A', team_member_id: 'member-1', status: 'cancelled', cancelled_team_member_id: 'member-1' },
      // pre-migration cancelled row: no snapshot, falls back to live team_member_id
      { id: 's4', tenant_id: 'tenant-A', team_member_id: 'member-1', status: 'cancelled', cancelled_team_member_id: null },
      // reassigned then cancelled: snapshot says member-2 held it at cancellation,
      // NOT member-1 (who the live column would wrongly still show if snapshot were absent)
      { id: 's5', tenant_id: 'tenant-A', team_member_id: 'member-2', status: 'cancelled', cancelled_team_member_id: 'member-2' },
      // another tenant's member-1 row — must never bleed into tenant-A's count
      { id: 's6', tenant_id: 'tenant-B', team_member_id: 'member-1', status: 'active' },
    ],
  }
})

describe('getTeamMemberRetentionStats', () => {
  it('counts active + paused as still_active, cancelled (snapshot or fallback) as lapsed', async () => {
    const stats = await getTeamMemberRetentionStats('tenant-A', 'member-1')

    expect(stats.still_active).toBe(2) // s1 (active) + s2 (paused)
    expect(stats.lapsed).toBe(2) // s3 (snapshot) + s4 (fallback)
    expect(stats.ever_assigned).toBe(4)
    expect(stats.retention_rate).toBe(50)
  })

  it('attributes a reassigned-then-cancelled schedule to the snapshot member, not the original', async () => {
    const member2 = await getTeamMemberRetentionStats('tenant-A', 'member-2')
    expect(member2.lapsed).toBe(1) // s5
    expect(member2.still_active).toBe(0)

    const member1 = await getTeamMemberRetentionStats('tenant-A', 'member-1')
    // s5's cancelled_team_member_id is member-2, so member-1 must NOT get this lapse
    // even though member-1 is not involved in s5 at all by this point.
    expect(member1.lapsed).toBe(2)
  })

  it('returns retention_rate: null (not 0) when the member has no history at all', async () => {
    const stats = await getTeamMemberRetentionStats('tenant-A', 'member-never-assigned')
    expect(stats.ever_assigned).toBe(0)
    expect(stats.retention_rate).toBeNull()
  })

  it("never counts another tenant's schedules", async () => {
    const stats = await getTeamMemberRetentionStats('tenant-A', 'member-1')
    // if tenant-B's s6 leaked in, still_active would be 3, not 2
    expect(stats.still_active).toBe(2)
  })
})
