import { describe, it, expect } from 'vitest'

/**
 * W4 divergence lock (gap C-2 from deploy-prep/fortress-health-coverage-audit.md).
 *
 * INTENTIONALLY RED. This test codifies the invariant that SHOULD hold and does
 * NOT today: the set of tenant statuses the Fortress cron MONITORS must be a
 * SUPERSET of the set of statuses the edge middleware SERVES. If middleware puts
 * a tenant's public site live, Fortress must be watching it. Right now it isn't:
 * a tenant in a served-but-not-{active,live,setup} status (e.g. `pending`,
 * `trial`, `paused`, `past_due`, `grace`, `onboarding`) is served to the public
 * yet dropped from the cron's Source-1 coverage query — a live, unmonitored site.
 *
 * WHY THE CONSTANTS ARE MIRRORED, NOT IMPORTED
 * --------------------------------------------
 * Both sides of the divergence are inline, non-exported literals, so there is
 * nothing to import without editing production code (out of scope for this lane):
 *   - CRON side:  src/app/api/cron/tenant-health/route.ts:68
 *                 `.in('status', ['active', 'live', 'setup'])`  (inline in GET)
 *   - EDGE side:  src/middleware.ts:29
 *                 `const NON_SERVING_STATUSES = new Set(['suspended','cancelled','deleted'])`
 *                 consumed by `tenantServesSite()` at src/middleware.ts:30.
 * These are copied here verbatim. That is a real limitation: if either source
 * literal changes, this mirror can drift silently. THE FIX for the divergence
 * should export both sets (or derive the cron coverage set from the same serve
 * predicate) so a follow-up test can import them and this mirror can be deleted.
 *
 * WHY THE DIVERGENCE IS REACHABLE (not theoretical)
 * -------------------------------------------------
 * `tenants.status` is an UNCONSTRAINED TEXT column — there is no CHECK constraint
 * pinning it to an enum (verified against migrations/*.sql; only `billing_status`
 * carries a default). So any string can be persisted. Confirmed live producers:
 *   - `'setup'`  on tenant creation  (src/app/api/admin/businesses/route.ts:74,81)
 *   - `'active'` on sales activation (src/app/api/admin/sales/route.ts:102)
 * Nothing prevents a tenant from being moved to `pending` / `paused` / `trial` /
 * `past_due` / etc. — at which point middleware keeps serving it and the cron
 * stops watching it.
 *
 * EXPECTED LIFECYCLE OF THIS FILE
 * -------------------------------
 *   - TODAY:      the superset test FAILS (this is the proof C-2 is real).
 *   - AFTER FIX:  align the cron coverage set with the serve predicate; the
 *                 superset test goes GREEN and the characterization test below
 *                 (which asserts the leak set is non-empty) flips RED — a
 *                 tripwire reminding whoever fixes it to delete/curate this file.
 */

// ── MIRRORED from src/app/api/cron/tenant-health/route.ts:68 ──────────────────
// Fortress Source-1 coverage: only tenants whose status is one of these are
// pulled for health-checking (barring an incidental active tenant_domains row).
const CRON_MONITORED_STATUSES = ['active', 'live', 'setup'] as const

// ── MIRRORED from src/middleware.ts:29 ───────────────────────────────────────
// Middleware serves a tenant's public site for EVERY status EXCEPT these three.
const MIDDLEWARE_NON_SERVING_STATUSES = ['suspended', 'cancelled', 'deleted'] as const

/** Mirror of src/middleware.ts:30 `tenantServesSite()`. */
function middlewareServesSite(status: string): boolean {
  return !(MIDDLEWARE_NON_SERVING_STATUSES as readonly string[]).includes(status)
}

/** Mirror of the route.ts:68 `.in('status', [...])` coverage filter. */
function cronMonitors(status: string): boolean {
  return (CRON_MONITORED_STATUSES as readonly string[]).includes(status)
}

/**
 * A realistic vocabulary for `tenants.status`. Because the column has no CHECK
 * constraint, every one of these is a value the row can actually hold. The first
 * two groups are the statuses whose provenance is confirmed in code; the third
 * group is the set of plausible lifecycle states a served tenant can occupy that
 * are NOT in the cron allow-list — these are the leak.
 */
const TENANT_STATUS_VOCABULARY = [
  // monitored AND served (the happy overlap)
  'active',
  'live',
  'setup',
  // NOT served → correctly NOT monitored (no leak)
  'suspended',
  'cancelled',
  'deleted',
  // served BUT outside {active,live,setup} → THE LEAK (served, unmonitored)
  'pending',
  'trial',
  'paused',
  'past_due',
  'grace',
  'onboarding',
  'new',
  'prospect',
  'inactive',
  'churned',
] as const

/** Statuses the edge serves to the public but the cron never health-checks. */
const servedButUnmonitored = TENANT_STATUS_VOCABULARY.filter(
  (status) => middlewareServesSite(status) && !cronMonitors(status),
)

describe('Fortress coverage vs middleware serve set (C-2 divergence)', () => {
  it('INVARIANT (RED until fixed): every SERVED status is also MONITORED — cron set ⊇ served set', () => {
    // The moment middleware serves a tenant's public site, Fortress must be
    // watching it. This fails today: the statuses below are served-but-unmonitored.
    expect(servedButUnmonitored).toEqual([])
  })

  it('CHARACTERIZATION (GREEN today): the leak set is non-empty and includes known served-but-unmonitored statuses', () => {
    // Documents the current reality the invariant above is meant to eliminate.
    // Flips RED when the divergence is fixed — intentional tripwire.
    expect(servedButUnmonitored.length).toBeGreaterThan(0)
    for (const leaked of ['pending', 'trial', 'paused', 'past_due', 'grace', 'onboarding']) {
      expect(servedButUnmonitored).toContain(leaked)
    }
  })

  it('sanity: the non-serving statuses are excluded from the leak (they are correctly unmonitored)', () => {
    for (const dark of MIDDLEWARE_NON_SERVING_STATUSES) {
      expect(middlewareServesSite(dark)).toBe(false)
      expect(servedButUnmonitored).not.toContain(dark)
    }
  })
})
