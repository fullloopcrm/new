/**
 * PROOF OF CONVERSION — bookings close-out — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/bookings/closeout/route.ts  (GET: jobs needing close-out + recently closed)
 *
 * What this route adds over prior proofs: TWO INDEPENDENT scoped reads on the SAME table
 * (`bookings`) with DIVERGENT compound filters, both flowing through ONE reused
 * tenantClient. Prior multi-read proofs (deals/at-risk) fanned across DIFFERENT tables;
 * this one hits the same table twice with different predicates:
 *   1. needsCloseout: `.in('status', [...])` + `.or('payment_status.neq.paid,team_paid.is.null,team_paid.eq.false')`
 *   2. recentlyClosed: `.eq('payment_status','paid').eq('team_paid',true).gte('check_out_time', <7d>)`
 * The proof pins that BOTH reads keep `.eq('tenant_id', tenantId)` after the swap, and
 * that the `.in()` / `.or()` compound filters are copied verbatim (the swap changes only
 * WHO fetches, never WHAT is filtered).
 *
 * CROSS-TABLE DEPENDENCY (embeds) + TIER HAZARD — surfaced, not fixed:
 * Both reads embed `clients(...)` AND the named-FK `team_members!bookings_team_member_id_fkey(name)`.
 *   - clients: tier #1 in rls-tier-rollout-order.md, bookings is #2 → clients loads BEFORE
 *     bookings, so the clients embed is load-bearing before this parent cuts over — SAFE
 *     ordering (same class as the reviews proof: child #1 precedes parent).
 *   - team_members: ABSENT from the tier list entirely (grep count 0 — see the cleaners
 *     proof for the same finding). If bookings (#2) is cut over while `team_members` has no
 *     policy, the `team_members!fkey(name)` embed default-denies and the joined name nulls
 *     out. This is the bank-accounts INVERSION class (parent low-tier, embedded child not
 *     yet load-bearing). HOLD close-out cutover until `team_members` has a tier slot + policy,
 *     OR KEEP-scope (leave on supabaseAdmin) the team_members embed until then.
 *
 * DEGRADATION SHAPE: the live route already coalesces each read to `|| []` (it does not
 * `throw` on error — it returns `{ needsCloseout, recentlyClosed }` with empty arrays when a
 * read yields null). This proof preserves that graceful-bucket behavior verbatim: a
 * default-denied read degrades that ONE bucket to `[]`, it does not null a sub-object or
 * crash. (Contrast the throw-shape proofs like catalog/cleaners.) The proof returns the
 * `{ error }` field per read too, so a caller/test can SEE a swallowed default-deny that the
 * live route would silently render as an empty bucket — flagging that RLS misconfig here is
 * invisible at the UI, same class as the sidebar-counts silent-degradation defect.
 *
 * Auth entry is unchanged: the live GET resolves the tenant via `getTenantForRequest()`.
 * This proof takes `tenantId` directly (and a `now` epoch ms for a deterministic 7-day
 * window) so the isolation test exercises both scoped reads without standing up the auth
 * layer or a real clock.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 */
import { tenantClient } from '../tenant-client'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const NEEDS_CLOSEOUT_COLUMNS =
  'id, service_type, start_time, end_time, status, price, hourly_rate, pay_rate, actual_hours, team_pay, payment_status, payment_method, team_paid, discount_enabled, check_in_time, check_out_time, clients(name, phone, address), team_members!bookings_team_member_id_fkey(name)'

const RECENTLY_CLOSED_COLUMNS =
  'id, service_type, start_time, price, payment_method, team_pay, clients(name), team_members!bookings_team_member_id_fkey(name)'

/**
 * Converted read path of GET /api/bookings/closeout. Runs both scoped reads through ONE
 * reused tenantClient(tenantId), keeps every tenant scope + compound filter verbatim, and
 * preserves the live route's graceful `|| []` per-bucket degradation. `now` is injected
 * (defaults to Date.now()) so the 7-day window is deterministic in tests.
 */
export async function getCloseoutConverted(tenantId: string, now: number = Date.now()) {
  const db = tenantClient(tenantId) // was: supabaseAdmin — one client reused across BOTH reads

  // Jobs needing close-out: completed/in_progress/paid but not fully closed.
  const { data: needsCloseout, error: needsError } = await db
    .from('bookings')
    .select(NEEDS_CLOSEOUT_COLUMNS)
    .eq('tenant_id', tenantId)
    .in('status', ['completed', 'in_progress', 'paid'])
    .or('payment_status.neq.paid,team_paid.is.null,team_paid.eq.false')
    .order('start_time', { ascending: false })
    .limit(50)

  // Recently closed (last 7 days) — fully paid + team paid.
  const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS).toISOString()
  const { data: recentlyClosed, error: recentError } = await db
    .from('bookings')
    .select(RECENTLY_CLOSED_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('payment_status', 'paid')
    .eq('team_paid', true)
    .gte('check_out_time', sevenDaysAgo)
    .order('check_out_time', { ascending: false })
    .limit(20)

  // Graceful-bucket degradation, verbatim from the live route: a null read (incl. a
  // swallowed default-deny) becomes an empty bucket, never a crash or null sub-object.
  // `error` is surfaced so a test can SEE the misconfig the UI would render as empty.
  return {
    needsCloseout: needsCloseout || [],
    recentlyClosed: recentlyClosed || [],
    _errors: { needsCloseout: needsError ?? null, recentlyClosed: recentError ?? null },
  }
}
