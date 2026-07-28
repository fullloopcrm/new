/**
 * getTeamMemberRatingTrend — smart-scheduling upgrade spec Part 4 item 3.
 * Pinned:
 *   - averages only the most recent N ratings, not lifetime
 *   - a decline in the last N is visible even when older/better ratings exist
 *   - null (not 0) trend_avg_rating when the member has no ratings yet
 *   - tenant isolation: another tenant's ratings never bleed into the average
 *   - null cleaner_rating rows (service_rating-only feedback) are excluded
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake, type FakeStoreHandle } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> })) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeSupabaseFake(h) }))

import { getTeamMemberRatingTrend } from './team-rating-trend'

const rating = (id: string, tenantId: string, teamMemberId: string, stars: number | null, createdAt: string) => ({
  id, tenant_id: tenantId, team_member_id: teamMemberId, cleaner_rating: stars, created_at: createdAt,
})

beforeEach(() => {
  h.seq = 0
  h.store = { ratings: [] }
})

describe('getTeamMemberRatingTrend', () => {
  it('averages only the most recent N ratings, ignoring older ones', async () => {
    h.store.ratings = [
      rating('r1', 'tenant-A', 'member-1', 5, '2026-01-01'),
      rating('r2', 'tenant-A', 'member-1', 5, '2026-02-01'),
      // last 2 (most recent) are both 1-star — a real recent decline
      rating('r3', 'tenant-A', 'member-1', 1, '2026-07-01'),
      rating('r4', 'tenant-A', 'member-1', 1, '2026-07-15'),
    ]

    const trend = await getTeamMemberRatingTrend('tenant-A', 'member-1', 2)

    expect(trend.trend_rating_count).toBe(2)
    expect(trend.trend_avg_rating).toBe(1)
  })

  it('returns trend_avg_rating: null (not 0) when the member has no ratings', async () => {
    const trend = await getTeamMemberRatingTrend('tenant-A', 'member-never-rated', 10)
    expect(trend.trend_rating_count).toBe(0)
    expect(trend.trend_avg_rating).toBeNull()
  })

  it("never counts another tenant's ratings", async () => {
    h.store.ratings = [
      rating('r1', 'tenant-A', 'member-1', 5, '2026-01-01'),
      rating('r2', 'tenant-B', 'member-1', 1, '2026-01-02'), // same member id, different tenant
    ]

    const trend = await getTeamMemberRatingTrend('tenant-A', 'member-1', 10)

    expect(trend.trend_rating_count).toBe(1)
    expect(trend.trend_avg_rating).toBe(5)
  })

  it('excludes rows with no cleaner_rating (service-only feedback)', async () => {
    h.store.ratings = [
      rating('r1', 'tenant-A', 'member-1', null, '2026-01-01'),
      rating('r2', 'tenant-A', 'member-1', 4, '2026-01-02'),
    ]

    const trend = await getTeamMemberRatingTrend('tenant-A', 'member-1', 10)

    expect(trend.trend_rating_count).toBe(1)
    expect(trend.trend_avg_rating).toBe(4)
  })
})
