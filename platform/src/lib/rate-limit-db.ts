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
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(Date.now() - windowMs).toISOString()

  // Count recent events in window.
  const { count, error: countErr } = await supabaseAdmin
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket_key', bucketKey)
    .gte('happened_at', since)

  if (countErr) {
    // On DB failure, fail-open so we don't lock users out — but log it.
    console.error('[rate-limit-db] count failed:', countErr.message)
    return { allowed: true, remaining: maxRequests }
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
