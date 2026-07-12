/**
 * DRY PROBE — comms-prefs shared config helpers — NOT WIRED, REVERSIBLE.
 *
 * Probe target — the shared communication-preferences read cluster:
 *   - src/lib/comms-prefs.ts :: getCommPrefs(tenantId)   (loader; isCommEnabled / getCommTiming
 *                                                          / getCommTemplate all delegate to it)
 *   - src/lib/comms-prefs.ts :: getCapabilities(tenantId) (second loader — email/SMS send keys)
 *
 * These are a DRY boundary of the same shape as the getSettings and listEntities probes: a
 * shared `src/lib` helper cluster whose one edit would scope many callers at once. But this one
 * lands on the OPPOSITE verdict from both prior DRY probes — and is the CLEAN counterpart to the
 * getSettings MIXED split:
 *
 *   - listEntities  → CONVERT (one-line swap; genuine tenant-scoped read of `entities`).
 *   - getSettings   → MIXED SPLIT (convert the `service_types` half; KEEP the `tenants` half).
 *   - getCommPrefs / getCapabilities  → **NEVER CONVERT. KEEP on supabaseAdmin forever.**
 *
 * WHY NEVER-CONVERT — every read here hits the `tenants` REGISTRY by id, not a tenant table.
 * Both loaders read exactly one table the same way:
 *
 *     getCommPrefs:    tenants.select('notification_preferences').eq('id', tenantId).single()
 *     getCapabilities: tenants.select('resend_api_key, telnyx_api_key, telnyx_phone')
 *                             .eq('id', tenantId).single()
 *
 *   - `tenants` is the platform REGISTRY, keyed by its PRIMARY KEY `id` — it is NOT a
 *     tenant_isolation table and carries no `tenant_id` column. grep of
 *     rls-tier-rollout-order.md for `tenants` = 0 (untiered by design, not by omission).
 *   - The gap-closure policy shape `USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)`
 *     CANNOT apply to a row keyed by `id` — there is no `tenant_id` column to match. Minting a
 *     scoped token and reading `tenants` through `tenantClient` would default-DENY the registry
 *     row (the authenticated role has no policy granting it), breaking every caller.
 *   - So unlike getSettings (which had a `service_types` half genuinely worth converting), this
 *     cluster has NOTHING to convert: it is 100% registry-by-id. The correct "conversion" is a
 *     NO-OP — leave both reads on `supabaseAdmin`.
 *
 * SYSTEMIC SIGNAL: this is now the SECOND shared helper (after getSettings) proven to read the
 * `tenants` registry by id. The registry-by-id read is a recurring shape across the lib layer;
 * any future DRY sweep must treat `tenants.eq('id', …)` as a KEEP marker, never a convert site.
 * A blanket "swap supabaseAdmin → tenantClient in every lib helper" would silently break these.
 *
 * SCOPE OF THIS EXTRACT: like the getSettings probe, this extracts ONLY the data-access (the two
 * registry reads). The ~90 lines of pure derivation — `normalizePrefs()` folding stored JSON
 * into the defaults, and `deriveCapabilities()` mapping keys → {email, sms} booleans — are
 * unchanged and omitted; they are orthogonal to which client issues the read.
 *
 * ERROR HANDLING — faithful: both live loaders destructure ONLY `data` and ignore `error`
 * (`getCommPrefs` normalizes `data?.notification_preferences`, tolerating null; `getCapabilities`
 * derives from `data || {}`). This extract mirrors that — no throw — returning the raw registry
 * rows (nullable) for the omitted derivation to fold.
 *
 * The live module is UNCHANGED. Deleting this directory reverts the probe with zero impact.
 */
import { supabaseAdmin } from '../supabase'

/** The two registry rows the comms-prefs loaders read — both from `tenants`, keyed by `id`. */
export interface CommsPrefsSources {
  /** `getCommPrefs`' read: the tenant's stored notification_preferences JSON (or null). */
  notificationPreferences: unknown
  /** `getCapabilities`' read: the send-key columns used to derive {email, sms} (or null). */
  capabilitiesRow: Record<string, unknown> | null
}

/**
 * Reference data-access for the comms-prefs cluster — the NEVER-CONVERT verdict made concrete.
 * BOTH reads stay on `supabaseAdmin` because `tenants` is the registry keyed by `id`, which the
 * `tenant_id` isolation policy cannot scope. There is intentionally NO `tenantClient` import in
 * this file: introducing one here would be the bug this probe exists to prevent.
 *
 * Mirrors the live loaders' two `tenants.eq('id', tenantId).single()` reads (run in parallel
 * here for the proof; the live loaders are separate call sites). Faithfully ignores read errors,
 * returning the raw nullable rows for the omitted `normalizePrefs` / `deriveCapabilities` folds.
 */
export async function fetchCommsPrefsSources(tenantId: string): Promise<CommsPrefsSources> {
  const [prefsRes, capsRes] = await Promise.all([
    // KEEP on supabaseAdmin: `tenants` registry, keyed by `id` — no tenant_id to scope on.
    supabaseAdmin
      .from('tenants')
      .select('notification_preferences')
      .eq('id', tenantId)
      .single(),
    // KEEP on supabaseAdmin: same registry table, same by-id read.
    supabaseAdmin
      .from('tenants')
      .select('resend_api_key, telnyx_api_key, telnyx_phone')
      .eq('id', tenantId)
      .single(),
  ])

  return {
    notificationPreferences: (prefsRes.data as { notification_preferences?: unknown } | null)
      ?.notification_preferences ?? null,
    capabilitiesRow: (capsRes.data as Record<string, unknown> | null) ?? null,
  }
}
