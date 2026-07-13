/**
 * Persistent rate limiter backed by the `rate_limit_events` table.
 * Survives serverless cold starts (unlike the in-memory Map in rate-limit.ts).
 *
 * Usage:
 *   const ok = await rateLimitDb('portal:+15551234567', 5, 15 * 60 * 1000)
 *   if (!ok) return 429
 *
 * Schema: see migration 014_security_hardening.sql
 */
import { supabaseAdmin } from './supabase'

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
  const since = new Date(Date.now() - windowMs).toISOString()

  // Count recent events in window.
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
    console.error('[rate-limit-db] insert failed:', insertErr.message)
  }

  return { allowed: true, remaining: maxRequests - current - 1 }
}
