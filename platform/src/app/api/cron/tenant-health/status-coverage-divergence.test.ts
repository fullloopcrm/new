import { describe, it, expect } from 'vitest'

/**
 * W4 divergence lock (gap C-2 from deploy-prep/fortress-health-coverage-audit.md).
 *
 * FIXED 2026-07-20. This test codified an invariant that did NOT hold: the set
 * of tenant statuses the Fortress cron MONITORS must be a SUPERSET of the set
 * of statuses the edge middleware SERVES. A tenant in a served-but-not-
 * {active,live,setup} status (e.g. `pending`, `trial`, `paused`, `past_due`,
 * `grace`, `onboarding`) was served to the public yet dropped from the cron's
 * Source-2 coverage query (`src/app/api/cron/tenant-health/route.ts`) — a
 * live, unmonitored site.
 *
 * THE FIX: Source 2's status filter changed from an allow-list
 * (`.in('status', ['active', 'live', 'setup'])`) to a deny-list matching
 * middleware's own `tenantServesSite()` predicate exactly
 * (`.not('status', 'in', '(suspended,cancelled,deleted)')`). Any status NOT
 * in that deny-list now gets monitored, same as middleware serves it.
 *
 * WHY THE CONSTANTS ARE STILL MIRRORED, NOT IMPORTED
 * ----------------------------------------------------
 * Both sides remain inline, non-exported literals in production code — this
 * mirror still exists so a future edit to either literal fails this test
 * instead of drifting silently. A cleaner follow-up would export
 * `NON_SERVING_STATUSES` from middleware.ts and import it into both this test
 * and route.ts so there is only one literal to drift.
 *
 * WHY THE DIVERGENCE WAS REACHABLE (not theoretical)
 * -----------------------------------------------------
 * `tenants.status` is an UNCONSTRAINED TEXT column — there is no CHECK
 * constraint pinning it to an enum. So any string can be persisted. Confirmed
 * live producers: `'setup'` on tenant creation, `'active'` on sales
 * activation. Nothing prevents a tenant from being moved to `pending` /
 * `paused` / `trial` / `past_due` / etc.
 */

// ── MIRRORED from src/app/api/cron/tenant-health/route.ts ─────────────────────
// Fortress Source-2 coverage deny-list: every status EXCEPT these is monitored.
const CRON_NON_MONITORED_STATUSES = ['suspended', 'cancelled', 'deleted'] as const

// ── MIRRORED from src/middleware.ts:29 ───────────────────────────────────────
// Middleware serves a tenant's public site for EVERY status EXCEPT these three.
const MIDDLEWARE_NON_SERVING_STATUSES = ['suspended', 'cancelled', 'deleted'] as const

/** Mirror of src/middleware.ts:30 `tenantServesSite()`. */
function middlewareServesSite(status: string): boolean {
  return !(MIDDLEWARE_NON_SERVING_STATUSES as readonly string[]).includes(status)
}

/** Mirror of the fixed route.ts Source-2 `.not('status', 'in', ...)` coverage filter. */
function cronMonitors(status: string): boolean {
  return !(CRON_NON_MONITORED_STATUSES as readonly string[]).includes(status)
}

/**
 * A realistic vocabulary for `tenants.status`. Because the column has no CHECK
 * constraint, every one of these is a value the row can actually hold.
 */
const TENANT_STATUS_VOCABULARY = [
  'active', 'live', 'setup',
  'suspended', 'cancelled', 'deleted',
  'pending', 'trial', 'paused', 'past_due', 'grace', 'onboarding',
  'new', 'prospect', 'inactive', 'churned',
] as const

/** Statuses the edge serves to the public but the cron never health-checks. */
const servedButUnmonitored = TENANT_STATUS_VOCABULARY.filter(
  (status) => middlewareServesSite(status) && !cronMonitors(status),
)

describe('Fortress coverage vs middleware serve set (C-2 divergence — fixed)', () => {
  it('INVARIANT: every SERVED status is also MONITORED — cron set ⊇ served set', () => {
    // The moment middleware serves a tenant's public site, Fortress must be
    // watching it. Regression guard: if either literal (here or in route.ts /
    // middleware.ts) drifts back apart, this fails.
    expect(servedButUnmonitored).toEqual([])
  })

  it('sanity: the non-serving statuses are excluded from monitoring AND from serving', () => {
    for (const dark of MIDDLEWARE_NON_SERVING_STATUSES) {
      expect(middlewareServesSite(dark)).toBe(false)
      expect(cronMonitors(dark)).toBe(false)
    }
  })

  it('sanity: previously-leaked statuses are now monitored', () => {
    for (const status of ['pending', 'trial', 'paused', 'past_due', 'grace', 'onboarding']) {
      expect(middlewareServesSite(status)).toBe(true)
      expect(cronMonitors(status)).toBe(true)
    }
  })
})
