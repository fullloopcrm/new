/**
 * GET /api/cron/health-monitor — concurrent-invocation duplicate-alert race,
 * plus proof the 6h re-alert window still works after the fix.
 *
 * Same check-then-act race just closed in cron/comms-monitor: dedup was a
 * SELECT against `notifications` for an existing cron_health_alert row
 * matching this failing-set's fingerprint within the last 6h, THEN
 * alertOwner() (real Telegram DM) + INSERT unconditionally. Two overlapping
 * invocations can both read zero recent matches and both DM the platform
 * admin.
 *
 * Fix: two-step atomic claim on cron_health_alerts(fingerprint) — fresh
 * insert first, then (on a 23505 conflict) an UPDATE ... WHERE alerted_at is
 * stale reclaims the row. Unlike comms-monitor's fingerprint (built from
 * ephemeral notification ids that age out of their own window), this
 * fingerprint is a stable cron-name set that legitimately re-fires after
 * recovery — so the reclaim path (not just the race fix) needs its own
 * coverage, see 2026_07_18_cron_health_alerts_dedup.sql.
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

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/health-monitor', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.alertOwner.mockClear()

  // Empty notifications + email_logs → every CHECKS entry reads `null` for
  // its last occurrence → every check fails → a fully deterministic
  // fingerprint (the sorted list of every cron name in CHECKS), independent
  // of row ids/ordering.
  h.fake = createFakeSupabase({ notifications: [], email_logs: [], cron_health_alerts: [] })
  h.fake._addUniqueConstraint('cron_health_alerts', 'fingerprint')

  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-18T12:00:00.000Z'))
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
  vi.useRealTimers()
})

describe('concurrent health-monitor invocations racing the same failing-cron set', () => {
  it('alerts the platform admin exactly once', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    const claims = h.fake!._all('cron_health_alerts')
    expect(claims).toHaveLength(1)

    const alertNotifs = h.fake!._all('notifications').filter((r) => r.type === 'cron_health_alert')
    expect(alertNotifs).toHaveLength(1)
  })

  it('does not re-alert for the same failing set within the 6h window', async () => {
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T14:00:00.000Z')) // +2h, still inside 6h
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1) // still just the one alert
  })

  it('re-alerts for the same failing set once the 6h window has passed', async () => {
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-07-18T18:00:01.000Z')) // +6h1s, past the window
    await GET(cronReq())
    expect(h.alertOwner).toHaveBeenCalledTimes(2)

    // Reclaimed the SAME row (fingerprint is unchanged, still one PK row),
    // not a second row — proves the fix isn't a permanent unique-constraint
    // block that would silently swallow every future occurrence.
    const claims = h.fake!._all('cron_health_alerts')
    expect(claims).toHaveLength(1)
  })
})
