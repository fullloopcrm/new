/**
 * Persistent rate limiter backed by the `rate_limit_events` table.
 * Survives serverless cold starts (unlike the in-memory Map in rate-limit.ts).
 *
 * Usage:
 *   const ok = await rateLimitDb('portal:+15551234567', 5, 15 * 60 * 1000)
 *   if (!ok) return 429
 *
 * Schema: see migration 014_security_hardening.sql
 *
 * Concurrency: the primary path calls the `rate_limit_check_and_record` RPC
 * (see migrations/2026_07_17_rate_limit_check_and_record_atomic_PROPOSED.sql),
 * which takes a per-bucket_key advisory lock so the count-then-insert check
 * is atomic — concurrent calls to the SAME bucket_key can no longer all read
 * the same pre-race count and all get allowed past maxRequests (this is the
 * shared throttle behind every login/OTP/PIN endpoint, so that race is a real
 * brute-force amplification vector, not theoretical). If the RPC hasn't been
 * migrated in yet (PGRST202 / "Could not find the function"), this falls
 * back to the legacy two-step count+insert below — same behavior as before
 * this change, so shipping this file is safe ahead of the migration landing.
 * Remove the fallback once the migration is confirmed applied in prod.
 */
import { supabaseAdmin } from './supabase'

function isMissingFunctionError(message: string | undefined): boolean {
  if (!message) return false
  return message.includes('PGRST202') || /could not find the function/i.test(message)
}

export async function rateLimitDb(
  bucketKey: string,
  maxRequests: number,
  windowMs: number,
  opts: { failClosed?: boolean } = {}
): Promise<{ allowed: boolean; remaining: number }> {
  // failClosed: auth-critical callers (login/OTP/PIN/admin) pass true so a DB
  // outage denies instead of allowing unlimited brute force while the limiter
  // is blind. Public forms/telemetry keep the default fail-open so a transient
  // DB blip doesn't 429 legitimate traffic. Either path logs loudly.
  const { failClosed = false } = opts

  // Guard + try/catch: some test doubles for supabaseAdmin only stub `.from`,
  // not `.rpc` (thrown synchronously as "not a function" if called directly,
  // not something a plain `await` + `error` check would catch). Treat both
  // "no rpc method at all" and any unexpected throw the same as "RPC not
  // available yet" and fall back, rather than letting it bubble up as a hard
  // 500 for every rate-limited caller.
  if (typeof supabaseAdmin.rpc === 'function') {
    try {
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('rate_limit_check_and_record', {
        p_bucket_key: bucketKey,
        p_max_requests: maxRequests,
        p_window_ms: windowMs,
      })

      if (!rpcErr) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
        if (row && typeof row.allowed === 'boolean') {
          return { allowed: row.allowed, remaining: row.remaining ?? 0 }
        }
        // Unexpected shape — treat like an error rather than trust a malformed result.
      } else if (!isMissingFunctionError(rpcErr.message)) {
        console.error(`[rate-limit-db] atomic RPC failed (failClosed=${failClosed}):`, rpcErr.message)
        return failClosed
          ? { allowed: false, remaining: 0 }
          : { allowed: true, remaining: maxRequests }
      }
      // else: RPC not migrated yet — fall through to the legacy path below.
    } catch (e) {
      console.error(`[rate-limit-db] atomic RPC threw, falling back:`, e instanceof Error ? e.message : e)
    }
  }

  return legacyCheckAndRecord(bucketKey, maxRequests, windowMs, failClosed)
}

/**
 * Pre-migration fallback. Racy under true concurrency (see file header) —
 * kept only so this file works before the atomic RPC migration is applied.
 */
async function legacyCheckAndRecord(
  bucketKey: string,
  maxRequests: number,
  windowMs: number,
  failClosed: boolean
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(Date.now() - windowMs).toISOString()

  const { count, error: countErr } = await supabaseAdmin
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket_key', bucketKey)
    .gte('happened_at', since)

  if (countErr) {
    console.error(`[rate-limit-db] count failed (failClosed=${failClosed}):`, countErr.message)
    return failClosed
      ? { allowed: false, remaining: 0 }
      : { allowed: true, remaining: maxRequests }
  }

  const current = count ?? 0
  if (current >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  // Record this attempt.
  const { error: insertErr } = await supabaseAdmin
    .from('rate_limit_events')
    .insert({ bucket_key: bucketKey })

  if (insertErr) {
    console.error(`[rate-limit-db] insert failed (failClosed=${failClosed}):`, insertErr.message)
    // Same bypass class as the count error: a failed write means this attempt
    // is unrecorded, so failClosed callers must deny rather than let an
    // unthrottled request through. Public callers stay fail-open for availability.
    if (failClosed) {
      return { allowed: false, remaining: 0 }
    }
  }

  return { allowed: true, remaining: maxRequests - current - 1 }
}
