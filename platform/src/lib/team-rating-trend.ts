// Smart-scheduling upgrade spec, Part 4 item 3: rating trend, not just
// lifetime average. team_members.avg_rating/rating_count (migrations/
// 2026_05_19_ratings_team_bookings.sql) are maintained by a DB trigger over
// ALL of a member's ratings ever — a long-tenured member's one bad recent
// stretch is invisible in that number. This reads the real `ratings` table
// directly (cleaner_rating, 1-5, one row per rated booking) and averages
// just the most recent N, so a decline shows up before the lifetime number
// moves enough to notice.
import { supabaseAdmin } from '@/lib/supabase'

export interface RatingTrend {
  trend_rating_count: number
  // null (not 0) when the member has no ratings yet — no history isn't a bad trend.
  trend_avg_rating: number | null
}

export async function getTeamMemberRatingTrend(
  tenantId: string,
  teamMemberId: string,
  lastN = 10,
): Promise<RatingTrend> {
  // Sort/slice/null-filter done here in JS rather than trusted to the DB
  // query builder — deliberate, not a workaround: this tenant+member scope
  // is a handful of rows at most, and doing the final selection in app code
  // makes the "most recent N, cleaner_rating not null" behavior something a
  // unit test can actually pin, independent of query-builder chaining order.
  const { data } = await supabaseAdmin
    .from('ratings')
    .select('cleaner_rating, created_at')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)

  const ratings = (data || [])
    .filter((r) => r.cleaner_rating != null)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, lastN)
    .map((r) => Number(r.cleaner_rating))

  if (ratings.length === 0) {
    return { trend_rating_count: 0, trend_avg_rating: null }
  }
  const sum = ratings.reduce((a, b) => a + b, 0)
  return {
    trend_rating_count: ratings.length,
    trend_avg_rating: Math.round((sum / ratings.length) * 100) / 100,
  }
}
