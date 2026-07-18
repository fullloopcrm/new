/**
 * trackError() — DB-backed alert dedup, replacing the in-memory Map.
 *
 * Previously the Telegram cooldown lived in a module-level `alertCooldowns`
 * Map, which does not survive separate serverless invocations/cold starts on
 * Vercel -- in production it could not reliably suppress anything, even
 * though it appeared to work within a single warm test/local process. Fix:
 * two-step atomic claim on error_alert_cooldowns(fingerprint) -- fresh insert
 * first (fingerprint = `${source}:${message.slice(0,50)}`), then (on a 23505
 * conflict) an UPDATE ... WHERE alerted_at is stale reclaims the row. See
 * 2026_07_18_error_alert_cooldowns_durable.sql.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
  alertOwner: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/telegram', () => ({
  alertOwner: (...args: unknown[]) => h.alertOwner(...args),
}))

import { trackError } from './error-tracking'

beforeEach(() => {
  h.alertOwner.mockClear()
  h.fake = createFakeSupabase({ error_logs: [], notifications: [], error_alert_cooldowns: [] })
  h.fake._addUniqueConstraint('error_alert_cooldowns', 'fingerprint')

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('concurrent trackError calls racing the same fingerprint', () => {
  it('DMs the owner exactly once', async () => {
    await Promise.all([
      trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' }),
      trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' }),
    ])

    expect(h.alertOwner).toHaveBeenCalledTimes(1)
    const claims = h.fake!._all('error_alert_cooldowns')
    expect(claims).toHaveLength(1)
    expect(claims[0].fingerprint).toBe('cron/late-check-in:DB unreachable')
  })

  it('does not re-alert for the same fingerprint within the 10-minute window', async () => {
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T12:05:00.000Z')) // +5min, still inside 10min
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })
    expect(h.alertOwner).toHaveBeenCalledTimes(1) // still just the one alert
  })

  it('re-alerts for the same fingerprint once the 10-minute window has passed', async () => {
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T12:10:01.000Z')) // +10min1s, past the window
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })
    expect(h.alertOwner).toHaveBeenCalledTimes(2)

    // Reclaimed the SAME row (fingerprint unchanged, still one PK row), not a
    // second one -- proves the fix isn't a permanent unique-constraint block
    // that would silently swallow every future recurrence.
    const claims = h.fake!._all('error_alert_cooldowns')
    expect(claims).toHaveLength(1)
  })

  it('alerts again immediately when the fingerprint changes (different source or message)', async () => {
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    await trackError(new Error('DB unreachable'), { source: 'api/contact', severity: 'high' })
    expect(h.alertOwner).toHaveBeenCalledTimes(2) // different source, not suppressed

    const claims = h.fake!._all('error_alert_cooldowns')
    expect(claims).toHaveLength(2)
  })

  it('does not alert at all for medium/low severity, and never claims a cooldown row for them', async () => {
    await trackError(new Error('minor hiccup'), { source: 'cron/late-check-in', severity: 'medium' })
    expect(h.alertOwner).not.toHaveBeenCalled()
    expect(h.fake!._all('error_alert_cooldowns')).toHaveLength(0)
  })

  it('still logs to error_logs and notifications even when the alert is suppressed', async () => {
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })
    await trackError(new Error('DB unreachable'), { source: 'cron/late-check-in', severity: 'high' })

    expect(h.fake!._all('error_logs')).toHaveLength(2)
    expect(h.fake!._all('notifications')).toHaveLength(2)
    expect(h.alertOwner).toHaveBeenCalledTimes(1) // but only one real Telegram DM
  })
})
